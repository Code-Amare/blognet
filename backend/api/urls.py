from django.urls import path, include
from .views import TestAPI, SiteSettingsView, ChallengeStatusView, HealthCheckView

urlpatterns = [
    path('', TestAPI.as_view()),
    path('site/', SiteSettingsView.as_view()),
    path("challenge/status/", ChallengeStatusView.as_view()),  
    path("user/", include("user.urls")),
    path("blog/", include("blog.urls")),
    path("health/", HealthCheckView.as_view()),
]
