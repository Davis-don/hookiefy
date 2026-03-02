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

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    groups = models.ManyToManyField(
        Group,
        related_name='custom_user_set',
        blank=True,
    )

    user_permissions = models.ManyToManyField(
        Permission,
        related_name='custom_user_permissions_set',
        blank=True,
    )

    def __str__(self):
        return self.email


class SuperAdminProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="superadmin_profile"
    )

    national_id = models.CharField(max_length=20)

    def __str__(self):
        return f"SuperAdmin Profile - {self.user.email}"


class AdminProfile(models.Model):
    GENDER_CHOICES = [
        ("male","Male"),
        ("female","Female"),
        ("other","Other"),
        ("nonbinary","Non-binary"),
        ("prefer_not_say","Prefer not to say"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="admin_profile"
    )
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, null=True, blank=True)

    def __str__(self):
        return f"Admin Profile - {self.user.email}"

class ClientProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="client_profile"
    )

    def __str__(self):
        return f"Client Profile - {self.user.email}"