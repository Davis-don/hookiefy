from django.db import models
from django.contrib.auth.models import AbstractUser


from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission

class User(AbstractUser):
    ROLE_TYPE = (
        ('superadmin', 'Super Admin'),
        ('admin', 'Admin'),
        ('client', 'Client'),
    )
    role = models.CharField(max_length=20, choices=ROLE_TYPE)
    email = models.EmailField(unique=True)

    # login using email
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    # override related_name to avoid clashes
    groups = models.ManyToManyField(
        Group,
        related_name='custom_user_set',  # change this to a unique name
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name='custom_user_permissions_set',  # unique name
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    def __str__(self):
        return self.email

class SuperAdminProfile(models.Model):
    """
    Role-specific extra fields for SuperAdmin.
    Only include fields that only SuperAdmins have.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="superadmin_profile"
    )

    national_id = models.CharField(max_length=20)

    def __str__(self):
        return f"SuperAdmin Profile - {self.user.email}"


class AdminProfile(models.Model):
    """
    Optional profile for Admin users.
    Only include admin-specific fields if needed.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="admin_profile"
    )

    def __str__(self):
        return f"Admin Profile - {self.user.email}"


class ClientProfile(models.Model):
    """
    Optional profile for Client users.
    Only include client-specific fields if needed.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="client_profile"
    )

    def __str__(self):
        return f"Client Profile - {self.user.email}"