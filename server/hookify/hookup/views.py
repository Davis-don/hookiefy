from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Hookup
from .serializers import CreateHookupSerializer, HookupResponseSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_hookup(request):
    sender = request.user.client_profile

    serializer = CreateHookupSerializer(
        data=request.data,
        context={"sender": sender}
    )

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    receiver = serializer.validated_data["receiver_id"]

    hookup = Hookup.objects.create(
        sender=sender,
        receiver=receiver,
        message=serializer.validated_data.get("message"),
        location=serializer.validated_data.get("location"),
        scheduled_time=serializer.validated_data.get("scheduled_time"),

        payment_status="not_paid",
        approval_status="pending",

        is_read_by_sender=True,
        is_read_by_receiver=False,

        is_deleted_by_sender=False,
        is_deleted_by_receiver=False,
    )

    return Response({
        "message": "Hookup request sent",
        "data": HookupResponseSerializer(hookup, context={"request": request}).data
    }, status=201)