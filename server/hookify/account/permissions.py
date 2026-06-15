from rest_framework.response import Response
from rest_framework import status


def is_superadmin(user):
    return user.is_authenticated and user.role == "superadmin"


def is_admin(user):
    return user.is_authenticated and user.role == "admin"


def is_user(user):
    return user.is_authenticated and user.role == "user"


# 🔥 MAIN RULE: who can create what
def can_create_user(requesting_user, target_role):

    if not requesting_user.is_authenticated:
        return False

    # superadmin can create ANY role
    if is_superadmin(requesting_user):
        return True

    # admin can ONLY create normal users
    if is_admin(requesting_user) and target_role == "user":
        return True

    return False


# 🔥 rule for creating ADMIN (STRICT)
def can_create_admin(requesting_user):

    # only superadmin can create admins
    return is_superadmin(requesting_user)