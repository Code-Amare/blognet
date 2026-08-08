from rest_framework import serializers
from .models import User, EmailUpdateRequest, Profile
from django.contrib.auth import password_validation
from datetime import date
from django.core.exceptions import ValidationError as DjangoValidationError

class UserSerializer(serializers.ModelSerializer):

    full_name = serializers.SerializerMethodField(read_only=True)
    profile_picture = serializers.SerializerMethodField(read_only=True)
    role = serializers.SerializerMethodField(read_only=True)
    id = serializers.SerializerMethodField(read_only=True)
    
 
    class Meta:
        model = User

        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "date_of_birth",
            "gender",
            "email",
            "phone_number",
            "profile_picture",
            "profile_picture_updated_at",
            "date_joined",
            "email_verified",
            "two_factor_enabled",
            "role",
        ]

        read_only_fields = [
            "id",
            "full_name",
            "profile_picture_updated_at",
            "date_joined",
            "email_verified",
            "two_factor_enabled",
        ]

    def get_id(self, obj):
        return obj.uuid

    def get_role(self, obj):
        return "admin" if obj.is_staff else "user"

    def get_full_name(self, obj):
        return obj.get_full_name()


    def get_profile_picture(self, obj):

        if obj.profile_picture:

            try:
                url = obj.profile_picture.url

                if url.startswith("http://"):
                    url = url.replace(
                        "http://",
                        "https://",
                        1
                    )

                return url

            except AttributeError:
                url = str(obj.profile_picture)

                if url.startswith("http://"):
                    url = url.replace(
                        "http://",
                        "https://",
                        1
                    )

                return url

        return None


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={
            "input_type": "password"
        }
    )

    password_confirm = serializers.CharField(
        write_only=True,
        style={
            "input_type": "password"
        }
    )


    class Meta:
        model = User

        fields = [
            # Account
            "email",
            "password",
            "password_confirm",

            # Personal Information
            "first_name",
            "last_name",
            "date_of_birth",
            "gender",

            # Contact
            "phone_number",
        ]

    def create(self, validated_data):

        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            is_active=False,
            email_verified=False,
            **validated_data
        )

        return user

    
    def validate_date_of_birth(self, value):
        today = date.today()

        if not value:
            return None

        if value > today:
            raise serializers.ValidationError(
                "Date of birth cannot be in the future."
            )

        age = (
            today.year
            - value.year
            - (
                (today.month, today.day)
                < (value.month, value.day)
            )
        )

        if age < 13:
            raise serializers.ValidationError(
                "You must be at least 13 years old to register."
            )

        if age > 120:
            raise serializers.ValidationError(
                "Please enter a valid date of birth."
            )

        return value


    def validate_email(self, value):

        email = value.strip().lower()

        if User.objects.filter(
            email__iexact=email
        ).exists():

            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email


    def validate_phone_number(self, value):

        if not value:
            return value

        value = value.strip()

        if User.objects.filter(
            phone_number=value
        ).exists():

            raise serializers.ValidationError(
                "An account with this phone number already exists."
            )

        return value


    def validate_password(self, value):

        try:

            password_validation.validate_password(
                value
            )

        except DjangoValidationError.ValidationError as error:

            raise serializers.ValidationError(
                error.messages
            )

        return value


    def validate(self, attrs):

        password = attrs.get(
            "password"
        )

        password_confirm = attrs.pop(
            "password_confirm",
            None
        )


        if password != password_confirm:

            raise serializers.ValidationError(
                {
                    "password_confirm": (
                        "Passwords do not match."
                    )
                }
            )


        return attrs


    def create(self, validated_data):

        password = validated_data.pop(
            "password"
        )

        user = User.objects.create_user(
            password=password,
            **validated_data
        )

        return user


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile

        fields = (
            "bio",
            "country",
            "city",
            "address",
            "receive_email_notifications",
            "receive_marketing_emails",
        )


class UpdateProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "date_of_birth",
            "gender",
            "phone_number",
            "profile_picture",
        ]
        extra_kwargs = {
            "phone_number": {
                "required": False,
                "allow_null": True,
                "allow_blank": True,
            },
            "date_of_birth": {
                "required": False,
                "allow_null": True,
            },
            "gender": {
                "required": False,
                "allow_null": True,
            },
        }
    def validate(self, attrs):
        
        user = self.instance
        has_changes = False
        for field, value in attrs.items():
            
            current_value = getattr(
                user,
                field,
            )
            if current_value != value:
                has_changes = True
                break
        if not has_changes:
            raise serializers.ValidationError(
                {
                    "no_change": True,
                    "detail": "No changes were made."
                }
            )
        return attrs

    def validate_phone_number(self, value):

        if value and not value.isdigit():
            raise serializers.ValidationError(
                "Phone number must contain only numbers."
            )

        return value


    def update(self, instance, validated_data):


        for attr, value in validated_data.items():
            setattr(
                instance,
                attr,
                value
            )

        instance.save()

        return instance


class EmailUpdateRequestSerializer(serializers.Serializer):

    new_email = serializers.EmailField()

    def validate_new_email(self, value):

        user = self.context["request"].user

        value = value.strip().lower()

        if user.email.lower() == value:

            raise serializers.ValidationError(
                "This is already your current email address."
            )

        if User.objects.filter(
            email__iexact=value,
        ).exists():

            raise serializers.ValidationError(
                "This email address is already in use."
            )

        if EmailUpdateRequest.objects.filter(
            new_email__iexact=value,
        ).exclude(
            user=user,
        ).exists():

            raise serializers.ValidationError(
                "This email address is already pending verification."
            )

        return value