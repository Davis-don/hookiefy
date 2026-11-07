# product_payment/serializers.py

from decimal import Decimal

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
            "town",

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


# ============================================================
# INPUT — MANUAL PAYMENT (superadmin only)
# ============================================================

class ManualProductPaymentSerializer(serializers.Serializer):
    """
    Input for POST /product_payments/manual/

    Records a payment that did NOT go through a gateway —
    e.g. a cheque, a bank transfer confirmed by finance, or
    cash handed over at an office. Superadmin only.

    The row is created directly in `completed` status (the
    money has already been received — that's the whole point
    of recording it manually), which means the same
    post-payment side effects that run on a gateway
    completion (stock decrement, delivery creation) should
    run here too. Those live in
    `controllers.services.sync_product_payment_from_pesapal`
    for the gateway path; for the manual path we call
    `complete_manual_payment` (shown in the view section)
    which reuses the same shared completion helper.

    Fields:

      - product_id:   which product (required)
      - user_email:   who paid. Optional — a walk-in buyer
                      with no account is valid. If supplied
                      and a matching account exists, the row
                      is linked to it; otherwise the row is
                      still created with the email snapshot.
      - quantity:     how many units. Defaults to 1 but a
                      manual payment CAN be for >1 (unlike
                      the client flow, where quantity is
                      hardcoded — this is an admin tool, so
                      bulk is allowed).
      - amount:       total received. Required — the admin
                      must state it, because there's no
                      gateway to compute it and the product
                      price may have changed since the sale.
      - currency:     defaults to KES.
      - town:         delivery destination (required, same
                      as the client flow — a delivery still
                      gets created).
      - gateway:      defaults to "manual_bank". Kept as a
                      choice so a manual row can honestly
                      say "cheque" / "cash" / "bank".
      - phone_number: optional contact snapshot.
      - note:         free-text note (e.g. cheque number,
                      received-by). Stored in
                      `payment_account` so it appears in
                      the serializer output the frontend
                      already renders, and also into
                      `submit_response` as structured JSON
                      for audit.
    """

    product_id = serializers.IntegerField(min_value=1)

    user_email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    quantity = serializers.IntegerField(
        min_value=1,
        default=1,
    )

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    currency = serializers.CharField(
        max_length=8,
        default="KES",
    )

    town = serializers.CharField(
        max_length=200,
        required=True,
        allow_blank=False,
    )

    # --------------------------------------------------------
    # GATEWAY — manual variants
    # --------------------------------------------------------
    #
    # The model's GATEWAY_CHOICES only has pesapal / paystack /
    # mpesa. Rather than migrate the model to add "manual"
    # variants just for this view, we accept them here and
    # store the raw string in the `gateway` column. The model
    # field is a CharField(max_length=20) with choices, and
    # Django does not enforce choices at the DB level — only
    # at form/serializer level. So a value like "manual_cheque"
    # will persist fine.
    #
    # If you'd rather keep the model's choices authoritative,
    # add the manual variants to ProductPayment.GATEWAY_CHOICES
    # instead and run a no-op migration (choices changes don't
    # touch the schema). That's the cleaner long-term option.

    GATEWAY_MANUAL_CASH = "manual_cash"
    GATEWAY_MANUAL_CHEQUE = "manual_cheque"
    GATEWAY_MANUAL_BANK = "manual_bank"
    GATEWAY_MANUAL_OTHER = "manual_other"

    GATEWAY_CHOICES = (
        (GATEWAY_MANUAL_CASH, "Manual — Cash"),
        (GATEWAY_MANUAL_CHEQUE, "Manual — Cheque"),
        (GATEWAY_MANUAL_BANK, "Manual — Bank Transfer"),
        (GATEWAY_MANUAL_OTHER, "Manual — Other"),
    )

    gateway = serializers.ChoiceField(
        choices=GATEWAY_CHOICES,
        default=GATEWAY_MANUAL_BANK,
    )

    phone_number = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
    )

    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
    )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    def validate_product_id(self, value):
        try:
            product = Products.objects.select_related(
                "business", "business__owner"
            ).get(id=value)
        except Products.DoesNotExist:
            raise serializers.ValidationError("Product not found.")
        self._product = product
        return value

    def validate_town(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError(
                "Delivery town is required."
            )
        return value

    def validate(self, attrs):
        product = getattr(self, "_product", None)
        if product is None:
            raise serializers.ValidationError(
                {"product_id": ["Product not found."]}
            )

        # Manual payments may exceed current stock only up to
        # what's actually there — stock is still real inventory.
        # (Unlike the client flow, we don't pre-check stock here
        # because an admin recording a historical sale may be
        # entering a payment for a product whose stock has since
        # been depleted. We warn via the view instead — see
        # `stock_warning` in the response.)
        if attrs["quantity"] > max(product.quantity, 0):
            # Not an error — the completion helper clamps to 0.
            # We just let the admin know.
            self._stock_warning = (
                f"Requested quantity {attrs['quantity']} exceeds "
                f"available stock {product.quantity}. "
                f"Stock will be clamped to 0."
            )
        else:
            self._stock_warning = None

        # Resolve the optional email → user link.
        email = (attrs.get("user_email") or "").strip()
        user = None
        if email:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.filter(email__iexact=email).first()
            # Not found is fine — we keep the email as a
            # snapshot-only row.
        self._user = user
        self._resolved_email = email or None

        return attrs

    @property
    def product(self):
        return getattr(self, "_product", None)

    @property
    def resolved_user(self):
        return getattr(self, "_user", None)

    @property
    def resolved_email(self):
        return getattr(self, "_resolved_email", None)

    @property
    def stock_warning(self):
        return getattr(self, "_stock_warning", None)