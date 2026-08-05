from cloudinary.models import CloudinaryField
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.contrib.auth.hashers import check_password, make_password
from datetime import timedelta
import secrets
from django.contrib.auth.models import (
    AbstractUser,
    BaseUserManager,
)
import secrets
import uuid


class UserManager(BaseUserManager):

    def create_user(
        self,
        email,
        password=None,
        **extra_fields
    ):

        if not email:
            raise ValueError(
                "The email field is required."
            )

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields
        )

        if password:
            user.set_password(password)

        user.save(
            using=self._db
        )

        return user


    def create_superuser(
        self,
        email,
        password=None,
        **extra_fields
    ):

        extra_fields.setdefault(
            "is_staff",
            True
        )

        extra_fields.setdefault(
            "is_superuser",
            True
        )

        extra_fields.setdefault(
            "is_active",
            True
        )


        if extra_fields.get("is_staff") is not True:
            raise ValueError(
                "Superuser must have is_staff=True."
            )


        if extra_fields.get("is_superuser") is not True:
            raise ValueError(
                "Superuser must have is_superuser=True."
            )


        return self.create_user(
            email=email,
            password=password,
            **extra_fields
        )


class User(AbstractUser):

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"
        PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY", "Prefer not to say"



    # Remove Django username
    username = None


    # Personal Information
    first_name = models.CharField(
        max_length=100
    )

    last_name = models.CharField(
        max_length=100
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True
    )

    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        null=True,
        blank=True
    )


    # Contact Information
    phone_number = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True
    )

    email = models.EmailField(
        unique=True
    )


    # Profile Picture
    profile_picture = CloudinaryField(
        "profile_pictures",
        null=True,
        blank=True
    )

    profile_picture_updated_at = models.DateTimeField(
        null=True,
        blank=True
    )


    # Authentication
    email_verified = models.BooleanField(
        default=False
    )

    two_factor_enabled = models.BooleanField(
        default=False
    )


    # OAuth
    google_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )


    # Public Id
    uuid = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
    )


    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = [
        "first_name",
        "last_name",
    ]

    objects = UserManager()


    def __str__(self):
        return self.get_full_name()


    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    

class Profile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    # About
    bio = models.TextField(blank=True)

    # Location
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    address = models.CharField(max_length=255, blank=True)


    # Preferences
    receive_email_notifications = models.BooleanField(default=True)
    receive_marketing_emails = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.get_full_name()} Profile"
    

class EmailOTP(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="email_otp",
    )

    code_hash = models.CharField(max_length=128)

    attempts = models.PositiveSmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    expires_at = models.DateTimeField()

    class Meta:
        verbose_name = "Email OTP"
        verbose_name_plural = "Email OTPs"

    def save(self, *args, **kwargs):
        if not self.pk:
            code = f"{secrets.randbelow(900000) + 100000:06d}"
            self.code_hash = make_password(code)
            self.expires_at = timezone.now() + timedelta(minutes=3)

            # Store temporarily so it can be emailed after save()
            self._plain_code = code

        super().save(*args, **kwargs)

    @property
    def code(self):
        """
        Returns the generated OTP only immediately after creation.
        Returns None for existing objects.
        """
        return getattr(self, "_plain_code", None)

    def verify(self, code):
        """
        Verify the provided OTP.
        """
        return (
            not self.is_expired()
            and check_password(str(code), self.code_hash)
        )

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"Email OTP for {self.user.email}"
    

class EmailLoginCode(models.Model):
    user = models.OneToOneField(User, related_name="email_login_code", on_delete=models.CASCADE)
    code = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()


    def is_expired(self):
        return timezone.now() >= self.expires_at
    

    def save(self, *args, **kwargs):
        if not self.pk:
            self.code = secrets.token_urlsafe(32)
            self.expires_at = timezone.now() + timedelta(minutes=5)


        super().save(*args, **kwargs)

    def verify(self, code):
        return (
            not self.is_expired()
            and (code == self.code)
        )


class EmailUpdateRequest(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="email_update_request")
    new_email = models.EmailField()
    expires_at = models.DateTimeField()
    requested_at = models.DateTimeField(auto_now_add=True)
    code = models.CharField(max_length=100)

    def save(self, *args, **kwargs):
        if not self.pk:
            self.code = secrets.token_urlsafe(32)
            self.expires_at = timezone.now() + timedelta(days=1)

        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() >= self.expires_at
    
    def verify(self, code):
        return (
            not self.is_expired()
            and (code == self.code)
        )
    


class ForgotPasswordRequest(models.Model):
    user = models.OneToOneField(User, related_name="forgot_password_request", on_delete=models.CASCADE)
    expires_at = models.DateTimeField()
    requested_at = models.DateTimeField(auto_now_add=True)
    code = models.CharField(max_length=100)

    def save(self, *args, **kwargs):
        if not self.pk:
            self.code = secrets.token_urlsafe(32)
            self.expires_at = timezone.now() + timedelta(minutes=10)

        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() >= self.expires_at
    
    def verify(self, code):
        return (
            not self.is_expired()
            and (code == self.code)
        )
    
    def __str__(self):
        return f"{self.user.email} Password Reset Request"