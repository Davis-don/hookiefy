# product_payment/serializers.py

from rest_framework import serializers

from products.models import Products
from .models import ProductPayment


# ============================================================
# INPUT — INITIATE PAYMENT
# ============================================================

class InitiateProductPaymentSerializer(serializers.Serializer):
    """
    Input for POST /product_payments/initiate/

    The client supplies only two pieces of information:

      - product_id: reference to the product they tapped.
                    Sent in the request body, but the value
                    itself was selected in-app — not typed.
      - town:       delivery destination. The only field the
                    client literally types into a form.

    Everything else (user, quantity, amount, seller, email,
    phone) is derived by the view from `request.user` and
    `product_id`.

    `quantity` is deliberately NOT a serializer field —
    every product in the catalogue is treated as one heavy
    item, delivered one at a time, so the quantity is
    hardcoded to 1 in the view. If a future product type
    needs bulk purchases, that's a new flow, not a field
    on this serializer.
    """

    product_id = serializers.IntegerField(min_value=1)

    town = serializers.CharField(
        max_length=200,
        required=True,
        allow_blank=False,
    )

    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
    )

    def validate_product_id(self, value):
        try:
            product = Products.objects.select_related(
                "business", "business__owner"
            ).get(id=value)
        except Products.DoesNotExist:
            raise serializers.ValidationError(
                "Product not found."
            )
        self._product = product
        return value

    def validate_town(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError(
                "Delivery town is required."
            )
        if len(value) > 200:
            raise serializers.ValidationError(
                "Delivery town cannot exceed 200 characters."
            )
        return value

    def validate(self, attrs):
        product = getattr(self, "_product", None)

        if product is None:
            raise serializers.ValidationError(
                {"product_id": ["Product not found."]}
            )

        # A product with no price can't be purchased.
        if product.price is None:
            raise serializers.ValidationError(
                {
                    "product_id": [
                        "This product has no price set and cannot "
                        "be purchased."
                    ]
                }
            )

        # Out-of-stock products can't be purchased. The view
        # also checks this with the same message; the
        # serializer check exists so a direct serializer
        # validation (tests, admin) doesn't have to reach
        # through a view for the answer.
        if product.quantity < 1:
            raise serializers.ValidationError(
                {
                    "product_id": [
                        "This product is currently out of stock."
                    ]
                }
            )

        return attrs

    @property
    def product(self):
        return getattr(self, "_product", None)


# ============================================================
# OUTPUT — PAYMENT ROW
# ============================================================

class ProductPaymentSerializer(serializers.ModelSerializer):
    """
    Read serializer for a product-payment row.
    """

    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
        allow_null=True,
    )

    business_name = serializers.CharField(
        source="business.business_name",
        read_only=True,
        allow_null=True,
    )

    amount_display = serializers.CharField(read_only=True)

    class Meta:
        model = ProductPayment
        fields = (
            "id",
            "merchant_reference",
            "order_tracking_id",
            "gateway",
            "status",

            "amount",
            "amount_display",
            "currency",

            "quantity",
            "town",                     # ← added

            "product",
            "product_name",

            "business",
            "business_name",

            "phone_number",
            "email",

            "confirmation_code",
            "payment_method",
            "payment_account",

            "error_message",
            "paid_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ============================================================
# OUTPUT — INITIATE RESPONSE
# ============================================================

class InitiateProductPaymentResponseSerializer(serializers.Serializer):
    """
    Response returned by the initiate endpoint.

    Documents the full response shape the view builds —
    kept as a serializer for consistency with the rest of
    the codebase, even though the view constructs the dict
    inline. If you ever switch the view to use
    `InitiateProductPaymentResponseSerializer(data).data`
    instead of a hand-rolled dict, this is the shape it
    will produce.
    """

    message = serializers.CharField()
    payment = ProductPaymentSerializer()
    redirect_url = serializers.URLField()