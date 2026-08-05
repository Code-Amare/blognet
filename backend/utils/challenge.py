# services/verification.py
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Optional
from django.db import transaction
from django.utils import timezone
from api.models import VerificationChallenge
from .emails import send_verification_challenge_email
import secrets

@dataclass
class ChallengeResult:
    ok: bool
    status: str                # "created", "pending", "verified", "error"
    challenge: Optional[VerificationChallenge] = None
    error_message: str = ""
    remaining_attempts: Optional[int] = None
    retry_after_seconds: Optional[int] = None
    http_status_code: int = 200

def create_challenge(*, user, action, method, expires_in_minutes=5) -> ChallengeResult:
    """
    Create a new verification challenge, or refuse if an active one already exists
    (including one that has exceeded attempts but hasn't expired).
    """
    with transaction.atomic():
        # Lock and fetch any active (non-expired, non-consumed) challenge for user+action
        active = (
            VerificationChallenge.objects
            .select_for_update()
            .filter(
                user=user,
                action=action,
                expired=False,
                verified_at__isnull=True,
                consumed_at__isnull=True,
            )
            .first()
        )

        if active:
            # If the challenge is still valid (time not passed), refuse new creation.
            if not active.is_expired():  # time-based, will auto-save expired if needed
                remaining = int((active.expires_at - timezone.now()).total_seconds())
                return ChallengeResult(
                    ok=False,
                    status="challenge_already_active",
                    error_message="An active verification challenge already exists. Please wait.",
                    retry_after_seconds=max(remaining, 0),
                    http_status_code=400,
                )
            # If it's expired by time, we fall through to create a new one (unique constraint will allow it
            # because the old one now has expired=True after is_expired() call).
            # No explicit saving needed here because is_expired() already saved it.

        # No active challenge – create a new one.
        code = None
        code_hash = ""
        if method == VerificationChallenge.Method.EMAIL_OTP:
            code = str(secrets.randbelow(900000) + 100000)
            code_hash = VerificationChallenge.hash_code(code)

        challenge = VerificationChallenge.objects.create(
            user=user,
            action=action,
            method=method,
            code_hash=code_hash,
            expires_at=timezone.now() + timedelta(minutes=expires_in_minutes),
        )

        # Send email after transaction commits (prevents DB connection hogging, avoids rollback on email failure)
        if method == VerificationChallenge.Method.EMAIL_OTP:
            transaction.on_commit(
                lambda: send_verification_challenge_email(
                    user=user, code=code, action=action, expires_in_minutes=expires_in_minutes
                )
            )

        return ChallengeResult(
            ok=True,
            status="created",
            challenge=challenge,
            http_status_code=201,
        )


def get_active_challenge(*, user, action) -> Optional[VerificationChallenge]:
    """Return the current active challenge if any (for polling)."""
    return (
        VerificationChallenge.objects
        .filter(
            user=user,
            action=action,
            expired=False,
            verified_at__isnull=True,
            consumed_at__isnull=True,
        )
        .order_by("-created_at")
        .first()
    )


def verify_challenge(*, user, challenge_id, code=None, password=None) -> ChallengeResult:
    """
    Verify the supplied credential against the challenge.
    Returns verified challenge on success; errors with retry hints otherwise.
    """
    # Basic validation
    if not challenge_id:
        return ChallengeResult(
            ok=False, status="error", error_message="Challenge ID is required.", http_status_code=400
        )

    with transaction.atomic():
        challenge = (
            VerificationChallenge.objects
            .select_for_update()
            .filter(challenge_id=challenge_id, user=user)
            .first()
        )

        if not challenge:
            return ChallengeResult(
                ok=False, status="error", error_message="Invalid verification challenge.", http_status_code=400
            )

        # Check lifecycle
        if challenge.is_expired():
            return ChallengeResult(
                ok=False,
                status="error",
                error_message="This verification challenge has expired.",
                http_status_code=400,
            )

        if challenge.verified_at is not None:
            return ChallengeResult(
                ok=False,
                status="error",
                error_message="This challenge has already been verified.",
                http_status_code=400,
            )

        # Method‑specific credential check
        if challenge.method == VerificationChallenge.Method.PASSWORD:
            if not password:
                return ChallengeResult(
                    ok=False, status="error", error_message="Password is required.", http_status_code=400
                )
            is_valid = user.check_password(password)
        else:
            if not code:
                return ChallengeResult(
                    ok=False, status="error", error_message="Verification code is required.", http_status_code=400
                )
            is_valid = challenge.verify_code(code)

        # Handle incorrect attempt
        if not is_valid:
            challenge.attempts += 1
            remaining = max(challenge.max_attempts - challenge.attempts, 0)

            if challenge.has_exceeded_attempts():
                # Do NOT expire; keep it alive but locked until time runs out.
                # The frontend must wait until expires_at.
                challenge.save(update_fields=["attempts"])
                retry_seconds = int((challenge.expires_at - timezone.now()).total_seconds())
                return ChallengeResult(
                    ok=False,
                    status="too_many_attempts",
                    error_message="Too many incorrect attempts. Please wait until the challenge expires.",
                    remaining_attempts=0,
                    retry_after_seconds=max(retry_seconds, 0),
                    http_status_code=429,
                )

            challenge.save(update_fields=["attempts"])
            return ChallengeResult(
                ok=False,
                status="incorrect_credential",
                error_message="Invalid verification credential.",
                remaining_attempts=remaining,
                http_status_code=400,
            )

        # Success – mark verified (but do NOT consume here)
        challenge.verified_at = timezone.now()
        challenge.save(update_fields=["verified_at"])

        return ChallengeResult(
            ok=True,
            status="verified",
            challenge=challenge,
            http_status_code=200,
        )

@dataclass
class ChallengeStatus:
    active: bool
    locked: bool = False
    challenge_id: str = None
    remaining_attempts: int = None
    retry_after_seconds: int = None
    expires_at: str = None       # ISO format
    method: str = None
    action: str = None


def get_challenge_status(*, user, action) -> ChallengeStatus:
    active = get_active_challenge(user=user, action=action)
    if not active:
        return ChallengeStatus(active=False)

    # If expired by time, treat as no active challenge
    if active.is_expired():
        return ChallengeStatus(active=False)

    now = timezone.now()
    remaining = max(0, int((active.expires_at - now).total_seconds()))

    if active.has_exceeded_attempts():
        return ChallengeStatus(
            active=True,
            locked=True,
            challenge_id=active.challenge_id,
            remaining_attempts=0,
            retry_after_seconds=remaining,
            expires_at=active.expires_at.isoformat(),
            method=active.method,
            action=active.action,
        )

    # Active and not locked
    return ChallengeStatus(
        active=True,
        locked=False,
        challenge_id=active.challenge_id,
        remaining_attempts=max(active.max_attempts - active.attempts, 0),
        retry_after_seconds=None,
        expires_at=active.expires_at.isoformat(),
        method=active.method,
        action=active.action,
    )