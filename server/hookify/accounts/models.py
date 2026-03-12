from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.utils import timezone
from django.db.models import Q


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
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("nonbinary", "Non-binary"),
        ("prefer_not_say", "Prefer not to say"),
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
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("nonbinary", "Non-binary"),
        ("prefer_not_say", "Prefer not to say"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="client_profile"
    )

    gender = models.CharField(
        max_length=20,
        choices=GENDER_CHOICES,
        null=True,
        blank=True
    )

    # Who created this client
    created_by_admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clients_created",
        limit_choices_to=Q(role="admin"),  # Only admins
    )

    # The superuser who currently manages this client
    managed_by_superuser = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clients_managed",
        limit_choices_to=Q(role="superadmin"),  # Only superadmins
    )

    # Soft delete tracking
    is_deleted = models.BooleanField(default=False)
    deleted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clients_deleted"
    )
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Client Profile - {self.user.email}"

    def soft_delete(self, deleted_by_user):
        """
        Soft delete the client - breaks link to admin but keeps client in database
        and links to superuser for management
        """
        self.is_deleted = True
        self.deleted_by = deleted_by_user
        self.deleted_at = timezone.now()

        # Break the link to the admin who created this client
        self.created_by_admin = None

        # Assign superadmin as manager
        if deleted_by_user.role == 'superadmin':
            self.managed_by_superuser = deleted_by_user
        elif deleted_by_user.role == 'admin':
            superuser = User.objects.filter(role='superadmin').first()
            if superuser:
                self.managed_by_superuser = superuser

        self.save()

    def restore(self):
        """Restore a soft-deleted client"""
        self.is_deleted = False
        self.deleted_by = None
        self.deleted_at = None
        self.save()

    @classmethod
    def active_clients(cls):
        """Return only non-deleted clients"""
        return cls.objects.filter(is_deleted=False)

    @classmethod
    def deleted_clients(cls):
        """Return only soft-deleted clients"""
        return cls.objects.filter(is_deleted=True)


class ClientHistory(models.Model):
    ACTION_TYPES = (
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('restored', 'Restored'),
        ('transferred', 'Transferred'),
    )

    client = models.ForeignKey(
        ClientProfile,
        on_delete=models.CASCADE,
        related_name='history'
    )
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='client_actions'
    )
    previous_admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )
    new_admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.client} - {self.action} at {self.timestamp}"