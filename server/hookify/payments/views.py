from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .pesapal import get_token, register_ipn, get_ipn_list


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def Make_payment(request):
    # 1. Get token
    token = get_token()

    if not token:
        return JsonResponse({
            "error": "Failed to retrieve Pesapal token"
        }, status=400)

    # 2. Register IPN (this is IMPORTANT, not optional)
    ipn_data = None
    try:
        ipn_data = register_ipn(token)
    except Exception as e:
        return JsonResponse({
            "error": f"IPN registration failed: {str(e)}"
        }, status=500)

    if not ipn_data or "ipn_id" not in ipn_data:
        return JsonResponse({
            "error": "IPN registration failed or missing ipn_id",
            "raw": ipn_data
        }, status=400)

    ipn_id = ipn_data["ipn_id"]

    # 3. Optional: fetch IPN list (debug only)
    try:
        ipn_list = get_ipn_list(token)
    except Exception as e:
        ipn_list = {"error": str(e)}

    return JsonResponse({
        "message": "Pesapal setup successful 🚀",
        "token": token,
        "ipn": ipn_data,
        "ipn_id": ipn_id,
        "ipn_list": ipn_list
    })