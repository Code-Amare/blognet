from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import BasePermission


class JWTCookieAuthentication(JWTAuthentication):

    cookie_name = "access_token"

    def authenticate(self, request):

        access_token = request.COOKIES.get(self.cookie_name)

        if not access_token:

            # refresh_token = request.COOKIES.get("refresh_token")

            # if refresh_token:
            #     try:
            #         # Validate refresh token
            #         RefreshToken(refresh_token)

            #         raise AuthenticationFailed(
            #             {
            #                 "code": "REFRESH_TOKEN_VALID",
            #                 "message": "Access token missing. Refresh token is valid."
            #             }
            #         )

            #     except TokenError:
            #         pass

            return None

        try:
            validated_token = self.get_validated_token(access_token)
            user = self.get_user(validated_token)

            return user, validated_token

        except (InvalidToken, TokenError):

            raise AuthenticationFailed(
                "Invalid or expired token."
            )




class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_staff is False
            and request.user.is_superuser is False
        )