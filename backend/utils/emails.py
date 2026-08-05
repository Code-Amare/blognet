from django.template.loader import render_to_string
from django.conf import settings
from utils.send_mail import send_email
from api.models import VerificationChallenge


def send_verification_code_email(user, code):
    html_content = render_to_string(
        "user/emails/verify_email.html",
        {
            "user": user,
            "code": code,
        },
    )

    send_email(
        to_email=user.email,
        subject="Verify your email address",
        html_content=html_content,
    )


def send_login_link_email(user, code):

    html_content = render_to_string(
        "user/emails/login_link.html",
        {
            "user": user,
            "url": f"{settings.FRONTEND_URL}/login/email/verify/{code}/",
        },
    )

    send_email(
        to_email=user.email,
        subject="Your secure login link",
        html_content=html_content,
    )


def send_verification_challenge_email(
    user,
    code,
    action,
    expires_in_minutes=5,
):
    """
    Send a verification email based on the challenge action.
    """

    action_messages = {

        VerificationChallenge.Action.DELETE_ACCOUNT: {
            "subject": "Confirm account deletion",
            "title": "Confirm Account Deletion",
            "message": (
                "You requested to permanently delete your account. "
                "Use the verification code below to confirm this action."
            ),
        },

        VerificationChallenge.Action.CHANGE_PASSWORD: {
            "subject": "Confirm password change",
            "title": "Confirm Password Change",
            "message": (
                "You requested to change your account password. "
                "Use the verification code below to confirm this action."
            ),
        },

        VerificationChallenge.Action.CHANGE_EMAIL: {
            "subject": "Confirm email address change",
            "title": "Confirm Email Change",
            "message": (
                "You requested to change the email address associated "
                "with your account. Use the verification code below "
                "to confirm this action."
            ),
        },

        VerificationChallenge.Action.CHANGE_PHONE: {
            "subject": "Confirm phone number change",
            "title": "Confirm Phone Number Change",
            "message": (
                "You requested to change the phone number associated "
                "with your account. Use the verification code below "
                "to confirm this action."
            ),
        },

        VerificationChallenge.Action.SENSITIVE_ACTION: {
            "subject": "Confirm sensitive action",
            "title": "Confirm Sensitive Action",
            "message": (
                "A sensitive action was requested on your account. "
                "Use the verification code below to confirm this action."
            ),
        },
    }


    action_data = action_messages.get(action)

    if not action_data:

        raise ValueError(
            f"Unsupported verification action: {action}"
        )

    html_content = render_to_string(
        "user/emails/verification_challenge.html",
        {
            "user": user,
            "code": code,
            "full_name": user.get_full_name(),
            "action_data": action_data,
            "expires_in_minutes": expires_in_minutes,
        },
    )

    send_email(
        to_email=user.email,
        subject=action_data["subject"],
        html_content=html_content,
    )


def send_email_update_request_email(update_request):

    user = update_request.user

    confirmation_url = (
        f"{settings.FRONTEND_URL}/user/email/update/{update_request.code}/"
    )

    html_content = render_to_string(
        "user/emails/email_update_request.html",
        {
            "user": user,
            "new_email": update_request.new_email,
            "confirmation_url": confirmation_url,
            "expires_at": update_request.expires_at,
        },
    )

    send_email(
        to_email=update_request.new_email,
        subject="Confirm your new email address",
        html_content=html_content,
    )



def send_forgot_password_email(user, code):
    reset_url = (
        f"{settings.FRONTEND_URL}/password/reset/{code}/"
    )

    html_content = render_to_string(
        "user/emails/forgot_password.html",
        {
            "user": user,
            "reset_url": reset_url,
            "code": code,
        },
    )

    send_email(
        to_email=user.email,
        subject="Reset your password",
        html_content=html_content,
    )