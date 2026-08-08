from django.contrib.auth import authenticate
from django.contrib.auth import signals as auth_signals
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from axes.handlers.proxy import AxesProxyHandler
from axes.models import AccessAttempt
from .serializers import UserSerializer, RegisterSerializer, UpdateProfileSerializer, EmailUpdateRequestSerializer, ProfileSerializer
from utils.send_mail import send_email
from utils.emails import send_verification_code_email, send_login_link_email, send_email_update_request_email, send_forgot_password_email
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from .models import EmailOTP, EmailLoginCode, EmailUpdateRequest, ForgotPasswordRequest, Profile
from django.db import transaction
from rest_framework_simplejwt.exceptions import TokenError
from axes.utils import reset
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from api.models import VerificationChallenge
from utils.challenge_drf import handle_verification_challenge
import cloudinary.uploader
import requests

User = get_user_model()

def send_cookies(request, user):
    refresh = RefreshToken.for_user(user)

    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    response = Response(
        {
            "access_length": len(access_token),
            "refresh_length": len(refresh_token),
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="Lax",
        max_age=60 * 15,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="Lax",
        max_age=60 * 60 * 24 * 7,
    )

    csrf_token = get_token(request)
    response.set_cookie(
        "csrftoken",
        csrf_token,
        httponly=False,
        secure=True,
        samesite="Lax",
    )

    return response


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "").strip()

        if not email or not password:
            return Response(
                {"error": "Email and Password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unverified_user = User.objects.filter(email=email, email_verified=False).first()

        if unverified_user:
            return Response({
                "error": "You are not Verified yet.",
                "verification_required": True,
                "email": unverified_user.email,
                }, status=status.HTTP_200_OK)
        
        if AxesProxyHandler.is_locked(request, credentials={"username": email}):
            return Response(
                {"error": "Account locked: too many login attempts. Please try again later."},
                status=status.HTTP_403_FORBIDDEN,
            )


        # 2. Attempt authentication
        user = authenticate(request, username=email, password=password)

        # 3. If authentication fails, record the failure and return 401
        if user is None:
            # auth_signals.user_login_failed.send(
            #     sender=request.user.__class__,   # or use 'User' if you prefer
            #     request=request,
            #     credentials={"username": email},
            # )
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user.two_factor_enabled:
            email = user.email
                
            login_link = EmailLoginCode.objects.filter(user=user).first()
            
            if login_link and not login_link.is_expired():
                return Response({"error": "Login link already sent, please try later to request a new one."}, status=status.HTTP_400_BAD_REQUEST)
            if login_link:
                login_link.delete()
            new_login_link = EmailLoginCode.objects.create(user=user)
    
            try:
    
                send_login_link_email(
                    user=user,
                    code=new_login_link.code,
                )
    
            except Exception:
    
                new_login_link.delete()
    
                return Response(
                    {
                        "error": (
                            "Unable to send the login link. "
                            "Please try again later."
                        )
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
    
            return Response(
                {
                    "detail": "A login link has been sent to your email address.",
                    "twofa_required": True
                },
                status=status.HTTP_200_OK,
            )
            

        # 4. Authentication succeeded – clear failure records
        auth_signals.user_logged_in.send(
            sender=user.__class__,
            request=request,
            user=user,
        )

        send_email(
            to_email=user.email,
            subject="You are logged in now",
            html_content="<h1>Welcome back!</h1>",
        )

        return send_cookies(request, user)

 
class SendVerificationCodeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):

        email = request.data.get("email", "").strip()

        if not email:
            return Response(
                {"error": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()

        email_verify = EmailOTP.objects.filter(user=user).first()

        if not user:
            return Response(
                {"error": "Invalid Email."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if email_verify:
            if not email_verify.is_expired():
                return Response(
                    {"error": "Verificaiton email already sent. Please try again later."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        with transaction.atomic():
            if email_verify:
                email_verify.delete()


            email_otp = EmailOTP.objects.create(
                user=user,
            )

        try:
            send_verification_code_email(
                user=user,
                code=email_otp.code,
            )

        except Exception:
            email_otp.delete()

            return Response(
                {
                    "detail": "Unable to send the verification code."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "detail": "Verification code sent successfully."
            },
            status=status.HTTP_200_OK,
        )


class EmailVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    MAX_ATTEMPTS = 5

    def post(self, request):

        email = request.data.get("email", "").strip()
        code = str(request.data.get("code", "")).strip()

        if not email or not code:
            return Response(
                {
                    "error": "Email and verification code are required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not code.isdigit() or len(code) != 6:
            return Response(
                {
                    "error": "Invalid verification code."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {
                    "error": "Invalid verification code."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            otp = EmailOTP.objects.get(user=user)

        except EmailOTP.DoesNotExist:
            return Response(
                {
                    "error": "Invalid or expired verification code."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp.is_expired():
            otp.delete()

            return Response(
                {
                    "error": "Verification code has expired."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp.attempts >= self.MAX_ATTEMPTS:
            otp.delete()

            return Response(
                {
                    "error": (
                        "Too many failed attempts. "
                        "Please request a new verification code."
                    )
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if not otp.verify(code):

            otp.attempts += 1
            otp.save(update_fields=["attempts"])

            remaining_attempts = (
                self.MAX_ATTEMPTS - otp.attempts
            )

            if remaining_attempts <= 0:
                otp.delete()

                return Response(
                    {
                        "error": (
                            "Too many failed attempts. "
                            "Please request a new verification code."
                        )
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            return Response(
                {
                    "error": "Invalid verification code.",
                    "remaining_attempts": remaining_attempts,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():

            user.email_verified = True
            user.save(update_fields=["email_verified"])

            otp.delete()

        return Response(
            {
                "detail": "Email verified successfully."
            },
            status=status.HTTP_200_OK,
        )

    
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        token = request.data.get("token")

        if not token:
            return Response(
                {"error": "Google token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            import requests as http_requests

            google_response = http_requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={
                    "Authorization": f"Bearer {token}"
                }
            )

            if google_response.status_code != 200:
                return Response(
                    {"error": "Invalid Google token."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            google_user = google_response.json()

        except ValueError:
            return Response(
                {"error": "Invalid Google token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


        email = google_user.get("email")
        google_id = google_user.get("sub")
        email_verified = google_user.get("email_verified", False)


        if not email_verified:
            return Response(
                {"error": "Google email is not verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )


        user = User.objects.filter(email=email).first()


        if not user:
            return Response(
                {"error": "User not found. Please register first."},
                status=status.HTTP_404_NOT_FOUND,
            )


        if not user.is_active:
            return Response(
                {"error": "Your account has been disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )


        if getattr(user, "is_deleted", False):
            return Response(
                {"error": "Account not found."},
                status=status.HTTP_404_NOT_FOUND,
            )


        if not user.google_id:
            user.google_id = google_id

        with transaction.atomic():
            user.email_verified = True

            user.save(
                update_fields=[
                    "google_id",
                    "email_verified"
                ]
            )
            reset(username=user.email)


        return send_cookies(request, user)


class GoogleRegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response(
                {"error": "Google token is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            google_response = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"}
            )
            google_response.raise_for_status()
            google_user = google_response.json()
        except Exception:
            return Response(
                {"error": "Invalid Google token."},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = google_user.get("email")
        first_name = google_user.get("given_name", "")
        last_name = google_user.get("family_name", "")
        picture_url = google_user.get("picture")
        google_id = google_user.get("sub")
        email_verified = google_user.get("email_verified", False)

        if not email_verified:
            return Response(
                {"error": "Google email is not verified."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check existing user
        user = User.objects.filter(google_id=google_id).first()
        if not user:
            user = User.objects.filter(email=email).first()

        if user:
            return Response(
                {"error": "User already exists. Please log in."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create new user
        user = User.objects.create_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            email_verified=True,
            google_id=google_id,
        )
        user.set_unusable_password()

        # ---- Handle profile picture ----
        if picture_url:
            try:
                # Download the image
                img_response = requests.get(picture_url)
                img_response.raise_for_status()

                # Upload to Cloudinary (no folder, so public_id is just the filename)
                upload_result = cloudinary.uploader.upload(
                    img_response.content,
                    overwrite=True,
                )
                # Store the public ID (e.g., "abc123.png") – this is what the database holds
                user.profile_picture = upload_result["public_id"]
                # The version and URL prefix are added automatically when accessing .url
            except Exception:
                # Log the error if needed; proceed without picture
                pass

        user.save()

        if not user.is_active:
            return Response(
                {"error": "Your account has been disabled."},
                status=status.HTTP_403_FORBIDDEN
            )

        return send_cookies(request, user)   # your existing helper

    
class LoginViaEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request, code):
        if not code:
            return Response({
                "error":"Invalid login link."}, 
                status=status.HTTP_400_BAD_REQUEST)
        

        login_link = EmailLoginCode.objects.filter(code=code).first()

        if not login_link or login_link.is_expired():
            return Response(
                {
                "error": "This login link is invalid or has expired."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            
            with transaction.atomic():
                user = login_link.user
                user.email_verified = True
                user.save(
                    update_fields=[
                        "email_verified"
                    ]
                    )

                reset(username=user.email)

                login_link.delete()

                return send_cookies(request, user)

                
        except Exception as e:
            return Response(
                {
                "error": "Unable to log you in.",
                "message": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GetLoginLinkViaEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()

        if not email:
            return Response({
                "error": "Invalid email address."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email=email).first()

        if not user:
            return Response({
                "error": "Invalid email address."
            }, status=status.HTTP_400_BAD_REQUEST)

            
        login_link = EmailLoginCode.objects.filter(user=user).first()
        
        if login_link and not login_link.is_expired():
            return Response({"error": "Login link already sent, please try later to request a new one."}, status=status.HTTP_400_BAD_REQUEST)
        if login_link:
            login_link.delete()
        new_login_link = EmailLoginCode.objects.create(user=user)

        try:

            send_login_link_email(
                user=user,
                code=new_login_link.code,
            )

        except Exception:

            new_login_link.delete()

            return Response(
                {
                    "error": (
                        "Unable to send the login link. "
                        "Please try again later."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "detail": (
                    "A login link has been sent to your email address."
                )
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):

    def post(self, request):
        response = Response(
            {"message": "Logged out successfully."}, status=status.HTTP_200_OK
        )

        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        response.delete_cookie("csrftoken")
        return response


@method_decorator(csrf_protect, name="dispatch")
class UserDeleteView(APIView):
    def delete(self, request):

        user = request.user
        user.delete()

        response = Response(
            {"detail": "Your account has been deleted successfully."},
            status=status.HTTP_200_OK,
        )

        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        response.delete_cookie("csrftoken")

        return response          

@method_decorator(csrf_protect, name="dispatch")
class ChangePasswordView(APIView):
    def post(self, request):
        user = request.user
        
        current_password = request.data.get("current_password", "").strip()
        new_password = request.data.get("new_password", "").strip()

        if not current_password or not new_password:
            return Response({
                "error": "Current password and New password are required."
            }, status=status.HTTP_400_BAD_REQUEST) 

        if not user.check_password(current_password):
            return Response({
                "error": "Invalid current password. Please try again."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if current_password == new_password:
            return Response({
                "error":  "Your new password must be different from your current password."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        return Response({
            "detail": "Password changed successfully."
        }, status=status.HTTP_200_OK)


class GetUserView(APIView):

    def get(self, request):
        user = request.user

        return Response(
            {"user": UserSerializer(user).data}, status=status.HTTP_200_OK
        )


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token missing"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)

            response = Response({"success": True}, status=status.HTTP_200_OK)
            response.set_cookie(
                "access_token",
                str(token.access_token),
                httponly=True,
                secure=True,
                samesite="Lax",
                max_age=60 * 15,
                path="/",
            )

            response.set_cookie(
                "refresh_token",
                str(token),
                httponly=True,
                secure=True,
                samesite="Lax",
                max_age=60 * 60 * 24 * 7,
                path="/",
            )
            return response
        except TokenError as e:
            print("TokenError:", type(e).__name__)
            print("Message:", str(e))
            return Response(
                {"detail": "Invalid or expired refresh token", "refresh": True},
                status=status.HTTP_401_UNAUTHORIZED,
            )       


@method_decorator(csrf_protect, name="dispatch")
class ChangePasswordViaEmailOTPView(APIView):
    def post(self, request):
        action = VerificationChallenge.Action.CHANGE_PASSWORD
        method = VerificationChallenge.Method.EMAIL_OTP

        new_password = request.data.get("new_password", "").strip()
        print(new_password)
        if request.user.check_password(new_password):
            return Response(
                {"error": "New password must differ from current."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = handle_verification_challenge(request, action, method)
        if isinstance(result, Response):
            return result

        # result is the verified challenge
        challenge = result


        request.user.set_password(new_password)
        request.user.save()

        # Consume the challenge AFTER the action succeeds.
        challenge.consume()

        return Response({"detail": "Password changed."}, status=status.HTTP_200_OK)


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = RegisterSerializer(
            data=request.data
        )

        if not serializer.is_valid():

            return Response(
                {
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            with transaction.atomic():

                user = serializer.save()

                email_otp = EmailOTP.objects.create(
                    user=user
                )

                send_verification_code_email(
                    user=user,
                    code=email_otp.code,
                )

        except Exception as e:

            if "user" in locals():

                user.delete()

            return Response(
                {
                    "error": (
                        "Unable to create account or "
                        "send verification code."
                    )
                    ,
                    "exception": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "detail": (
                    "Account created successfully. "
                    "Please verify your email."
                ),
                "email": user.email,
                "email_verification_required": True,
            },
            status=status.HTTP_201_CREATED,
        )

    
@method_decorator(csrf_protect, name="dispatch")
class UpdateProfileView(APIView):

    def patch(self, request):

        serializer = UpdateProfileSerializer(
            instance=request.user,
            data=request.data,
            partial=True,
        )


        if not serializer.is_valid():
            try:
                is_no_change = serializer.errors.get("no_change", False)[0]
            except Exception:
                is_no_change = False

            return Response(
                {
                    "is_no_change": is_no_change,
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            serializer.save()
            

        return Response(
            {
                "detail": (
                    "Profile updated successfully."
                ),
                "user": UserSerializer(request.user).data,
            },
            status=status.HTTP_200_OK,
        )


class GetProfileView(APIView):
    def get(self, request):
        profile, created = Profile.objects.get_or_create(user=request.user)

        serializer = ProfileSerializer(profile)
        return Response({"profile": serializer.data}, status=status.HTTP_200_OK)

@method_decorator(csrf_protect, name="dispatch")
class EmailUpdateRequestView(APIView):
    def post(self, request):
        # Validate the new email first – required even on the initial request
        serializer = EmailUpdateRequestSerializer(
            data=request.data,
            context={"request": request},
        )
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Handle the verification challenge flow
        result = handle_verification_challenge(
            request=request,
            action=VerificationChallenge.Action.CHANGE_EMAIL,
            method=VerificationChallenge.Method.EMAIL_OTP,
        )

        if isinstance(result, Response):
            # Challenge not yet complete – return the helper’s response
            return result

        # Challenge verified – now perform the email update process
        challenge = result
        user = request.user
        new_email = serializer.validated_data["new_email"]

        # Remove any previous pending requests for this user
        EmailUpdateRequest.objects.filter(user=user).delete()

        update_request = EmailUpdateRequest.objects.create(
            user=user,
            new_email=new_email,
        )

        send_email_update_request_email(update_request=update_request)

        # Consume the challenge AFTER the action is successfully set up
        challenge.consume()

        return Response(
            {"detail": "Email update link sent to the new inbox."},
            status=status.HTTP_200_OK,
        )

    
class EmailUpdateResponseView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, code):
        email_update_request = EmailUpdateRequest.objects.filter(code=code).first()
        if not email_update_request:
            return Response({"error": "Invalid verify link."}, status=status.HTTP_400_BAD_REQUEST)
        

        if not email_update_request.code == code:
            return Response({"error": "Invalid verify link."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            user = email_update_request.user
            user.email = email_update_request.new_email
            user.save()

            email_update_request.delete()

            return Response({"detail": "New email updated successfully"}, status=status.HTTP_200_OK)


class ForgotPasswordRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()

        user = User.objects.filter(email=email).first()

        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not user:
            return Response({"error": "Invalid Email address."}, status=status.HTTP_400_BAD_REQUEST)
            
        forgot_password_request = ForgotPasswordRequest.objects.filter(user=user).first()

        if forgot_password_request and not forgot_password_request.is_expired():
            return Response({"error": "Request has already been sent. Please try later."}, status=status.HTTP_400_BAD_REQUEST)


        with transaction.atomic():
            if forgot_password_request:
                forgot_password_request.delete()
            new_fpr = ForgotPasswordRequest.objects.create(user=user)

            send_forgot_password_email(user, new_fpr.code)
            return Response({"detail": "A password reset link has been sent to your email address."}, status=status.HTTP_200_OK)
        
        return Response({"error": "Something went wrong."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckResetPasswordRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get("code", "").strip()

        if not code:
            return Response({"error": "Code is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        reset_password_request = ForgotPasswordRequest.objects.filter(code=code).first()
        print(reset_password_request)
        if not reset_password_request or reset_password_request.is_expired():
            return Response({"error": "Invalid or expired code"}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({"detail": "This code is valid."}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, code): 
        reset_request = ForgotPasswordRequest.objects.filter(code=code).first()
        if not reset_request or reset_request.is_expired():
            return Response({"error": "Invalid or expired password reset link."}, status=status.HTTP_400_BAD_REQUEST)
        
        
        password = request.data.get("password", "").strip()

        if not password:
            return Response({"error": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_request.user

        if user.check_password(password):
            return Response({
                "error": "Your new password must be different from your current password. Please request a new verification code."
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user.set_password(password)
            user.save()
            reset_request.delete()
            reset(username=user.email)

        return Response({"detail": "Your password has been reset successfully."}, status=status.HTTP_200_OK)

        
class GetUserObjectView(APIView):
    def get(self, request, id):
        try:
            user = User.objects.get(uuid=id)
        except Exception:
            return Response({"error": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"user": UserSerializer(user).data}, status=status.HTTP_200_OK)


class IsTwoFaEnabledView(APIView):
    def get(self, request):
        user = request.user

        return Response({"is_twofa_enabled": user.two_factor_enabled}, status=status.HTTP_200_OK)

@method_decorator(csrf_protect, name="dispatch")
class ToggleTwoFaView(APIView):
    def post(self, request):
        user = request.user
        is_two_factor_enabled = user.two_factor_enabled

        user.two_factor_enabled = not is_two_factor_enabled
        user.save(update_fields=["two_factor_enabled"])
        return Response({"is_twofa_enabled": not is_two_factor_enabled}, status=status.HTTP_200_OK)




