from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .pesapal import get_token

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def Make_payment(request):
    token = get_token()
    if token:
        return JsonResponse({"message": "Payment processing endpoint is under construction.", "token": token})
    return JsonResponse({"error": "Failed to retrieve token."}, status=400)