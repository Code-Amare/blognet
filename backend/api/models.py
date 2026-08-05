from django.db import models
from django.contrib.auth import get_user_model
import secrets
import hashlib
from django.utils import timezone
from cloudinary.models import CloudinaryField
from django.core.exceptions import ValidationError


User = get_user_model()

class VerificationChallenge(models.Model):

    class Action(models.TextChoices):

        DELETE_ACCOUNT = (
            "DELETE_ACCOUNT",
            "Delete Account",
        )

        CHANGE_PASSWORD = (
            "CHANGE_PASSWORD",
            "Change Password",
        )

        CHANGE_EMAIL = (
            "CHANGE_EMAIL",
            "Change Email",
        )

        CHANGE_PHONE = (
            "CHANGE_PHONE",
            "Change Phone",
        )

        SENSITIVE_ACTION = (
            "SENSITIVE_ACTION",
            "Sensitive Action",
        )

    class Method(models.TextChoices):

        EMAIL_OTP = (
            "EMAIL_OTP",
            "Email OTP",
        )

        PASSWORD = (
            "PASSWORD",
            "Password",
        )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="verification_challenges",
    )

    action = models.CharField(
        max_length=50,
        choices=Action.choices,
    )

    method = models.CharField(
        max_length=30,
        choices=Method.choices,
    )

    challenge_id = models.CharField(
        max_length=64,
        unique=True,
        default=secrets.token_urlsafe,
        editable=False,
    )

    code_hash = models.CharField(
        max_length=128,
    )

    attempts = models.PositiveIntegerField(
        default=0,
    )

    max_attempts = models.PositiveIntegerField(
        default=5,
    )

    expired = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    expires_at = models.DateTimeField()


    verified_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    consumed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:

        ordering = [
            "-created_at",
        ]

        constraints = [

            models.UniqueConstraint(
                fields=[
                    "user",
                    "action",
                ],
                condition=models.Q(
                    expired=False,
                    verified_at__isnull=True,
                    consumed_at__isnull=True,
                ),
                name=(
                    "unique_active_challenge_per_user_action"
                ),
            ),

        ]

    def is_verified(self):

        return self.verified_at is not None

    def is_expired(self):

        if self.expired:

            return True

        if timezone.now() >= self.expires_at:

            self.expired = True

            self.save(
                update_fields=[
                    "expired",
                ]
            )

            return True

        return False

    def has_exceeded_attempts(self):

        return self.attempts >= self.max_attempts

    def is_valid(self):

        return (
            not self.is_expired()
            and self.verified_at is None
            and self.consumed_at is None
            and not self.has_exceeded_attempts()
        )

    @staticmethod
    def hash_code(code):

        return hashlib.sha256(
            code.encode("utf-8")
        ).hexdigest()

    def verify_code(self, code):

        if not self.is_valid():

            return False

        code_hash = self.hash_code(code)

        if not secrets.compare_digest(
            code_hash,
            self.code_hash,
        ):

            return False

        self.verified_at = timezone.now()

        self.save(
            update_fields=[
                "verified_at",
            ]
        )

        return True

    def consume(self):

        self.consumed_at = timezone.now()

        self.save(
            update_fields=[
                "consumed_at",
            ]
        )

    def to_dict(self):
        """Frontend-friendly representation (no DRF dependency)."""
        return {
            "challenge_id": self.challenge_id,
            "method": self.method,
            "action": self.action,
            "expires_at": self.expires_at.isoformat(),
            "remaining_attempts": max(self.max_attempts - self.attempts, 0),
            "is_verified": self.is_verified(),
        }



class SiteSettings(models.Model):
    site_name = models.CharField(max_length=100)
    site_logo = CloudinaryField("logos", null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.pk and SiteSettings.objects.exists():
            raise ValidationError(
                "Only one SiteSettings instance is allowed."
            )

        return super().save(*args, **kwargs)