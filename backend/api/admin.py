from django.contrib import admin
from .models import VerificationChallenge, SiteSettings

admin.site.register(SiteSettings)

@admin.register(VerificationChallenge)
class VerificationChallengeAdmin(admin.ModelAdmin):

    list_display = (
            "challenge_id",
            "user",
            "action",
            "method",
            "expired",
            "verified_at",
            "consumed_at",
            "created_at",
        )
