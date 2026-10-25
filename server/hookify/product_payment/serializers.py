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

    - product_id: which product is being purchased
    - quantity:   how many units (default 1)
    - phone:      optional, for the PesaPal billing block
    """

    product_id = serializers.IntegerField(min_value=1)

    quantity = serializers.IntegerField(
        min_value=1,
        max_value=100,
        required=False,
        default=1,
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
    """

    message = serializers.CharField()
    payment = ProductPaymentSerializer()
    redirect_url = serializers.URLField()