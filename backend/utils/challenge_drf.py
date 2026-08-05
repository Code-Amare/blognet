from rest_framework.response import Response
from rest_framework import status
from api.models import VerificationChallenge
from django.utils import timezone
from utils.challenge import (
    create_challenge,
    verify_challenge,
    get_active_challenge,
)
 

def handle_verification_challenge(request, action, method, expires_in_minutes=5):
    user = request.user
    active = get_active_challenge(user=user, action=action)

    # ---- Clean up a time-expired challenge silently ----
    if active and active.is_expired():
        active = None

    # ---- No active challenge: create a fresh one ----
    if not active:
        result = create_challenge(
            user=user, action=action, method=method,
            expires_in_minutes=expires_in_minutes,
        )
        if not result.ok:
            return Response(
                {"error": result.error_message, "retry_after_seconds": result.retry_after_seconds},
                status=result.http_status_code,
            )
        return Response(
            {"status": "challenge_created", "challenge": result.challenge.to_dict()},
            status=status.HTTP_201_CREATED,
        )

    # ---- Active challenge exists ----
    challenge_id = request.data.get("challenge_id", "").strip()

    # If the frontend didn't send a challenge_id, treat it as a status poll
    if not challenge_id:
        # Refresh from DB to get latest attempts
        active.refresh_from_db()
        retry_seconds = None
        if active.has_exceeded_attempts():
            retry_seconds = max(0, int((active.expires_at - timezone.now()).total_seconds()))
        return Response(
            {
                "status": "challenge_active",
                "challenge": active.to_dict(),
                "retry_after_seconds": retry_seconds,
            },
            status=status.HTTP_200_OK,
        )

    # ---- Challenge ID provided: attempt verification ----
    code = request.data.get("code", "").strip()
    password = request.data.get("password", "").strip()

    result = verify_challenge(
        user=user,
        challenge_id=challenge_id,
        code=code,
        password=password,
    )

    if not result.ok:
        resp_data = {"status": result.status, "error": result.error_message}
        if result.remaining_attempts is not None:
            resp_data["remaining_attempts"] = result.remaining_attempts
        if result.retry_after_seconds is not None:
            resp_data["retry_after_seconds"] = result.retry_after_seconds
        return Response(resp_data, status=result.http_status_code)

    # Verification succeeded – return the verified (unconsumed) challenge
    return result.challenge