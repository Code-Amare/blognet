from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [
    path("token/", views.EmailLoginView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.EmailLoginView.as_view(), name="login"),
    path("token/check/", views.TokenCheck.as_view()),
    path("profile/", views.ProfileView.as_view()),
    path("google/login/", views.GoogleLoginView.as_view()),
    path("google/register/", views.GoogleRegisterView.as_view()),
    path("profile/edit/", views.ProfileEditView.as_view(), name="profile-edit"),
    path('profile/<str:username>/', views.UserProfileView.as_view(), name='user-profile'),
    path("health/", views.health_check),
]
