from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .services.get_pesapal_token import get_pesapal_token
from .services.register_ipn import register_ipn_url 


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    """
    Accepts a phone number and amount.
    Returns the submitted data along with the Pesapal token.
    """

    phone_number = request.data.get("phone_number")
    amount = request.data.get("amount")

    if not phone_number:
        return Response(
            {
                "success": False,
                "message": "Phone number is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not amount:
        return Response(
            {
                "success": False,
                "message": "Amount is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # Get the token from Pesapal
    token_response = get_pesapal_token()
    
    # Check if token was retrieved successfully
    if token_response.get("status") != "200":
        return Response(
            {
                "success": False,
                "message": "Failed to get token from Pesapal.",
                "error": token_response
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "success": True,
            "message": "Payment request received successfully.",
            "data": {
                "phone_number": phone_number,
                "amount": amount,
            },
            "pesapal_token": {
                "token": token_response.get("token"),
                "expiry_date": token_response.get("expiryDate"),
                "status": token_response.get("status"),
                "message": token_response.get("message")
            }
        },
        status=status.HTTP_200_OK,
    )

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import json


@api_view(["POST", "GET"])
def ipn_callback(request):
    """
    Endpoint that Pesapal will call when payment status changes
    """
    # For GET requests
    if request.method == "GET":
        data = request.query_params
    else:
        # For POST requests
        data = request.data
    
    # Log the notification
    print(f"📨 IPN Received: {data}")
    
    # Important: Verify the IPN is from Pesapal
    # You should validate the request (check signature)
    
    # Extract payment status
    status = data.get("status")
    order_tracking_id = data.get("order_tracking_id")
    
    if status == "COMPLETED":
        # Payment was successful
        # Update your database, fulfill order, etc.
        print(f"✅ Payment {order_tracking_id} completed!")
    elif status == "FAILED":
        # Payment failed
        print(f"❌ Payment {order_tracking_id} failed!")
    elif status == "PENDING":
        # Payment is pending
        print(f"⏳ Payment {order_tracking_id} pending!")
    
    # Respond with a 200 OK to acknowledge receipt
    return Response({"status": "success"}, status=status.HTTP_200_OK)