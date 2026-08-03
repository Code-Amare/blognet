from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer, UserSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import ProfileSerializer
from rest_framework.permissions import IsAuthenticated
from user.models import Profile
from django.core.files.base import ContentFile
from django.db import transaction
import requests
from django.contrib.auth import get_user_model

from blog.models import BlogPost, LikePost
from user.models import Profile
from django.shortcuts import get_object_or_404
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser




User = get_user_model()


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        return Response({"success": True}, status=status.HTTP_201_CREATED)


class EmailLoginView(APIView):
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"success": False, "errors": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
            )
        user = authenticate(username=user.username, password=password)

        if user:
            refresh = RefreshToken.for_user(user)
            return Response(
                {"success": True, "access": str(refresh.access_token), "refresh": str(refresh)},
                status=status.HTTP_202_ACCEPTED,
            )
        return Response(
            {
                "success": False,
                "errors": "Invalid credentials",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )


class TokenCheck(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            serializer = UserSerializer(request.user)
            return Response({"isValid": True, "detail": "Access token is valid.", "user": serializer.data})
        except Exception as e:
            return Response({"isValid": False, "detail": str(e)}, status=500)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = Profile.objects.get(user=request.user)
        serializer = ProfileSerializer(instance=profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "user profile updated successfully"})
        return Response(serializer.errors, status=400)

    def get(self, request):
        user = request.user
        try:
            profile = Profile.objects.get(user=user)
        except Profile.DoesNotExist:
            profile = Profile(user=user, avatar="avatars/default.webp")
            profile.save()
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

class GoogleLoginView(APIView):

  def post(self, request):
    token = request.data.get("token")

    if not token:
      return Response(
          {"errors": "Google token is required."},
          status=status.HTTP_400_BAD_REQUEST,
      )

    # Validate Google Token via Google's OAuth2 API
    try:
      google_response = requests.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          headers={"Authorization": f"Bearer {token}"},
          timeout=10,
      )

      if google_response.status_code != 200:
        return Response(
            {"errors": "Invalid Google token."},
            status=status.HTTP_400_BAD_REQUEST,
        )

      google_user = google_response.json()
    except requests.RequestException:
      return Response(
          {"errors": "Unable to verify token with Google."},
          status=status.HTTP_400_BAD_REQUEST,
      )

    email = google_user.get("email")
    email_verified = google_user.get("email_verified", False)

    if not email_verified or not email:
      return Response(
          {"errors": "Google email is not verified."},
          status=status.HTTP_400_BAD_REQUEST,
      )

    # Check if user exists in the standard User model
    user = User.objects.filter(email=email).first()

    if not user:
      return Response(
          {"errors": "User not found. Please register first."},
          status=status.HTTP_404_NOT_FOUND,
      )

    if not user.is_active:
      return Response(
          {"errors": "Your account has been disabled."},
          status=status.HTTP_403_FORBIDDEN,
      )

    # Generate JWT Tokens
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "success": True,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        },
        status=status.HTTP_200_OK,
    )


class GoogleRegisterView(APIView):

  def post(self, request):
    token = request.data.get("token")

    if not token:
      return Response(
          {"errors": "Google token is required."},
          status=status.HTTP_400_BAD_REQUEST,
      )

    # Validate Google Token
    try:
      google_response = requests.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          headers={"Authorization": f"Bearer {token}"},
          timeout=10,
      )
      google_response.raise_for_status()
      google_user = google_response.json()
    except Exception:
      return Response(
          {"errors": "Invalid Google token."},
          status=status.HTTP_400_BAD_REQUEST,
      )

    email = google_user.get("email")
    first_name = google_user.get("given_name", "")
    last_name = google_user.get("family_name", "")
    picture_url = google_user.get("picture")
    email_verified = google_user.get("email_verified", False)

    if not email_verified or not email:
      return Response(
          {"errors": "Google email is not verified."},
          status=status.HTTP_400_BAD_REQUEST,
      )

    # Check existing user by email
    if User.objects.filter(email=email).exists():
      return Response(
          {"errors": "User already exists. Please log in."},
          status=status.HTTP_400_BAD_REQUEST,
      )

    # Generate unique username (fallback to email prefix if needed)
    username = email.split("@")[0]
    base_username = username
    counter = 1
    while User.objects.filter(username=username).exists():
      username = f"{base_username}{counter}"
      counter += 1

    # Create new standard user inside a transaction block
    with transaction.atomic():
      user = User.objects.create_user(
          username=username,
          email=email,
          first_name=first_name,
          last_name=last_name,
      )
      user.set_unusable_password()
      user.save()

      # Get or create associated user Profile
      profile, _ = Profile.objects.get_or_create(
          user=user, defaults={"avatar": "avatars/default.webp"}
      )

      # Handle profile picture saving directly to the Profile instance
      if picture_url:
        try:
          img_response = requests.get(picture_url, timeout=10)
          if img_response.status_code == 200:
            file_name = f"google_avatar_{user.id}.jpg"
            profile.avatar.save(
                file_name, ContentFile(img_response.content), save=True
            )
        except Exception:
          pass  # Fallback to default avatar if picture fetching fails

    # Return JWT Tokens for immediate session start
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "success": True,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        },
        status=status.HTTP_201_CREATED,
    )


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        # Fetch target user profile by username
        user_obj = get_object_or_404(User, username=username)
        profile = get_object_or_404(Profile, user=user_obj)

        # Get all posts by this profile
        posts = BlogPost.objects.filter(profile=profile)

        # Check authenticated user's likes for optimistic UI
        liked_post_ids = set()
        if request.user.is_authenticated:
            liked_post_ids = set(
                LikePost.objects.filter(
                    profile__user=request.user, 
                    is_liked=True
                ).values_list("post_id", flat=True)
            )

        posts_data = [
            {
                "id": post.id,
                "post_title": post.post_title,
                "post_body": post.post_body,
                "post_title_color": post.post_title_color,
                "post_img": post.post_img.url if post.post_img else None,
                "post_category": post.post_category,
                "like": post.like,
                "is_liked_by_me": post.id in liked_post_ids,
                "timestamp": post.timestamp.isoformat(),
                "comments_count": post.comments.count(),
            }
            for post in posts
        ]

        # Calculate totals
        total_likes = sum(p.like for p in posts)

        profile_data = {
            "username": user_obj.username,
            "display_name": profile.display_name or user_obj.username,
            "avatar": profile.avatar.url if profile.avatar else None,
            "stats": {
                "total_posts": posts.count(),
                "total_likes": total_likes,
            },
            "posts": posts_data,
        }

        return Response(profile_data, status=status.HTTP_200_OK)


    
class ProfileEditView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        print("touch")
        user = request.user
        profile, _ = Profile.objects.get_or_create(user=user)

        return Response({
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "display_name": profile.display_name or user.username,
            "avatar": profile.avatar.url if profile.avatar else None,
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        profile, _ = Profile.objects.get_or_create(user=user)

        # 1. Update User model fields
        if "first_name" in request.data:
            user.first_name = request.data.get("first_name")
        if "last_name" in request.data:
            user.last_name = request.data.get("last_name")
        if "email" in request.data:
            user.email = request.data.get("email")
        user.save()

        # 2. Update Profile model fields
        if "display_name" in request.data:
            profile.display_name = request.data.get("display_name")
        
        # Handle avatar file upload
        if "avatar" in request.FILES:
            profile.avatar = request.FILES["avatar"]
        elif request.data.get("remove_avatar") == "true":
            profile.avatar.delete(save=False)
            profile.avatar = None

        profile.save()

        return Response({
            "message": "Profile updated successfully!",
            "profile": {
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "display_name": profile.display_name,
                "avatar": profile.avatar.url if profile.avatar else None,
            }
        }, status=status.HTTP_200_OK)

@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"}, status=status.HTTP_200_OK)
