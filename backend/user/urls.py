from django.urls import path
from .views import (
    LoginView, 
    SendVerificationCodeView,
    EmailVerifyView,
    GoogleLoginView, 
    GoogleRegisterView, 
    RegisterView,
    GetLoginLinkViaEmailView,
    LoginViaEmailView,
    LogoutView, 
    UserDeleteView,
    ChangePasswordView,
    GetUserView,
    RefreshTokenView,
    ChangePasswordViaEmailOTPView,
    UpdateProfileView,
    EmailUpdateRequestView,
    EmailUpdateResponseView,
    ForgotPasswordRequestView,
    ResetPasswordView,
    CheckResetPasswordRequestView,
    GetUserObjectView,
    IsTwoFaEnabledView,
    ToggleTwoFaView,
    GetProfileView,
)



urlpatterns = [
    # user
    path("me/", GetUserView.as_view(), name="get_current_user"),
    path("me/delete/", UserDeleteView.as_view(), name="delete_user"),
    path("profile/update/", UpdateProfileView.as_view(), name="update_profile"),
    path("profile/", GetProfileView.as_view(), name="get_profile"),
    # refresh
    path("token/refresh/", RefreshTokenView.as_view(), name="refresh_token"),
    # auth
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("send-otp/", SendVerificationCodeView.as_view(), name="send_verification_otp"),
    path("email/verify/", EmailVerifyView.as_view(), name="verify_email"),
    path("login/google/", GoogleLoginView.as_view(), name="google_login"),
    path("login/email/request/", GetLoginLinkViaEmailView.as_view(), name="request_email_login"),
    path("login/email/verify/<str:code>/", LoginViaEmailView.as_view(), name="verify_email_login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("register/google/", GoogleRegisterView.as_view(), name="google_register"),
    # email and password management
    path("email/change-password/", ChangePasswordViaEmailOTPView.as_view(), name="change_password_via_email"),
    path("email/update/request/", EmailUpdateRequestView.as_view(), name="request_email_update"),
    path("email/update/verify/<str:code>/", EmailUpdateResponseView.as_view(), name="verify_email_update"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("forgot-password/", ForgotPasswordRequestView.as_view(), name="forgot_password_request"),
    path("password/reset/check/", CheckResetPasswordRequestView.as_view(), name="check_password_reset"),
    path("password/reset/<str:code>/", ResetPasswordView.as_view(), name="reset_password"),
    # 2fa
    path("2fa/status/", IsTwoFaEnabledView.as_view(), name="twofa-status"),
    path("2fa/toggle/", ToggleTwoFaView.as_view(), name="twofa-toggle"),
    path("<str:id>/", GetUserObjectView.as_view(), name="get_user"),
]