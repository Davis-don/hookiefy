from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Payment


@csrf_exempt
def pesapal_callback(request):

    try:
        order_tracking_id = request.GET.get("OrderTrackingId")

        if not order_tracking_id:
            return JsonResponse({"error": "Missing OrderTrackingId"}, status=400)

        payment = Payment.objects.get(order_tracking_id=order_tracking_id)

        payment.mark_completed()

        return JsonResponse({
            "message": "Payment successful",
            "status": "completed"
        })

    except Payment.DoesNotExist:
        return JsonResponse({"error": "Payment not found"}, status=404)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)