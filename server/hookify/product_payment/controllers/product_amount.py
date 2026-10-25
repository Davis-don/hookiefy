# product_payment/controllers/product_amount.py

from products.models import Products


def Product_Unit_Amount(product_id):
    """
    Return the price of a single unit of the given product.

    Returns 0 if the product does not exist, has been deleted,
    or has no price set (a product with no price is not
    purchasable, matching how Products.price is nullable in
    the model).

    This mirrors `subscription_payment.controllers.plan_amount.Plan_Amount`
    — the "0" is the signal that "this can't be sold", and the
    caller is expected to bail out with an error before ever
    reaching the gateway.
    """
    product = (
        Products.objects
        .filter(id=product_id)
        .only("price")
        .first()
    )

    if product is None:
        return 0

    if product.price is None:
        return 0

    return product.price


def Product_Amount(product_id, quantity=1):
    """
    Return the total amount to charge for `quantity` units of
    the given product.

    Returns 0 when:
        • the product does not exist
        • the product has no price
        • quantity is not a positive integer

    The caller is expected to check `> 0` before submitting an
    order to PesaPal — a zero amount will be rejected by the
    gateway.
    """
    if not isinstance(quantity, int) or quantity <= 0:
        return 0

    unit = Product_Unit_Amount(product_id)
    if unit == 0:
        return 0

    return unit * quantity