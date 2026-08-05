from rest_framework import serializers

from .models import VerificationChallenge, SiteSettings


class VerificationChallengeSerializer(serializers.ModelSerializer):

    is_verified = serializers.BooleanField(
        read_only=True,
    )

    is_expired = serializers.BooleanField(
        read_only=True,
    )

    is_valid = serializers.BooleanField(
        read_only=True,
    )

    class Meta:

        model = VerificationChallenge

        fields = [
            "challenge_id",
            "action",
            "method",
            "attempts",
            "max_attempts",
            "expired",
            "created_at",
            "expires_at",
            "verified_at",
            "consumed_at",
            "is_verified",
            "is_expired",
            "is_valid",
        ]

        read_only_fields = [    
            "challenge_id",
            "attempts",
            "max_attempts",
            "expired",
            "created_at",
            "expires_at",
            "verified_at",
            "consumed_at",
            "is_verified",
            "is_expired",
            "is_valid",
        ]


class SiteSettingsSerializer(serializers.ModelSerializer):
    site_logo = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = SiteSettings
        fields = "__all__"


    def get_site_logo(self, obj):
        if not obj.site_logo:
            return None
        
        try:
            url = obj.site_logo.url

            if url.startswith("http://"):
                url = url.replace(
                    "http://",
                    "https://",
                    1
                )

            return url

        except AttributeError:
            url = str(obj.site_logo)

            if url.startswith("http://"):
                url = url.replace(
                    "http://",
                    "https://",
                    1
                )

            return url

        return obj.site_logo.url