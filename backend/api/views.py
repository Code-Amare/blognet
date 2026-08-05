from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view


from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import SiteSettingsSerializer
from rest_framework import status
from .models import SiteSettings, VerificationChallenge
from rest_framework.permissions import AllowAny
from utils.challenge import get_challenge_status


class TestAPI(APIView):

    def get(self, request):

        return Response({
            "message": "API is working"
        })




class ChallengeStatusView(APIView):

    def get(self, request):
        action = request.query_params.get("action")

        if not action:
            return Response(
                {"error": "action parameter required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action not in VerificationChallenge.Action.values:
            return Response(
                {"error": "invalid action"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        challenge_status = get_challenge_status(
            user=request.user,
            action=action,
        )

        return Response(
            {
                "active": challenge_status.active,
                "locked": challenge_status.locked,
                "challenge_id": challenge_status.challenge_id,
                "remaining_attempts": challenge_status.remaining_attempts,
                "retry_after_seconds": challenge_status.retry_after_seconds,
                "expires_at": challenge_status.expires_at,
                "method": challenge_status.method,
                "action": challenge_status.action,
            },
            status=status.HTTP_200_OK,
        ) 

class SiteSettingsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        site = SiteSettings.objects.filter(id=1).first()

        if not site:
            return Response({"error": "Site setting not set yet."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"site": SiteSettingsSerializer(site).data}, status=status.HTTP_200_OK)

class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)
