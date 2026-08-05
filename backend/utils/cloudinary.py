import requests as http_requests
from django.core.files.base import ContentFile


def upload_google_profile_picture(picture_url):

    if not picture_url:
        return None

    try:

        response = http_requests.get(
            picture_url,
            timeout=10,
        )

        if response.status_code != 200:
            return None

        return ContentFile(
            response.content,
            name="google_profile.jpg"
        )

    except Exception:
        return None
