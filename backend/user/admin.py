from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    User,
    EmailLoginCode,
    EmailOTP,
    EmailUpdateRequest,
    ForgotPasswordRequest,
)


admin.site.register(EmailLoginCode)
admin.site.register(EmailOTP)
admin.site.register(EmailUpdateRequest)
admin.site.register(ForgotPasswordRequest)


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    model = User

    list_display = (
        "email",
        "uuid",
        "first_name",
        "last_name",
        "phone_number",
        "email_verified",
        "two_factor_enabled",
        "is_staff",
        "is_active",
    )

    list_filter = (
        "gender",
        "email_verified",
        "two_factor_enabled",
        "is_staff",
        "is_superuser",
        "is_active",
    )

    search_fields = (
        "email",
        "uuid",
        "first_name",
        "last_name",
        "phone_number",
    )

    ordering = (
        "email",
    )

    fieldsets = (
                (
            "Login Information",
            {
                "fields": (
                    "email",
                    "uuid",
                    "password",
                )
            },
        ),

        (
            "Personal Information",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "date_of_birth",
                    "gender",
                    "profile_picture",
                    "profile_picture_updated_at",
                )
            },
        ),

        (
            "Contact Information",
            {
                "fields": (
                    "phone_number",
                )
            },
        ),

        (
            "Security",
            {
                "fields": (
                    "email_verified",
                    "two_factor_enabled",
                )
            },
        ),

        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),

        (
            "Important Dates",
            {
                "fields": (
                    "date_joined",
                    "last_login",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            "Create User",
            {
                "classes": (
                    "wide",
                ),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "first_name",
                    "last_name",
                    "date_of_birth",
                    "gender",
                    "phone_number",
                    "email_verified",
                    "two_factor_enabled",
                ),
            },
        ),
    )

    readonly_fields = (
        "uuid",
        "date_joined",
        "last_login",
    )