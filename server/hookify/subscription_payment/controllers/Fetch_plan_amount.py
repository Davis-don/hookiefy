# Fetch plan amount by plan id
from plans.models import Plan


def Plan_Amount(plan_id):
    """
    Return the price of a Plan by its id.
    Returns 0 if the plan does not exist.
    """
    plan = Plan.objects.filter(id=plan_id).only("price").first()
    if not plan:
        return 0
    return plan.price