from axes.utils import reset

def get_username_from_request(request, credentials=None):
    """
    Extract username from DRF request.data (JSON) or fallback to POST/GET.
    The 'credentials' parameter is required by axes but can be ignored.
    """
    if hasattr(request, 'data') and request.data:
        return request.data.get('email', '')
    return request.POST.get('email', '') or request.GET.get('email', '')

