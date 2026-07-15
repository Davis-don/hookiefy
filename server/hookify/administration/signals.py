from django.db.models.signals import post_save
from django.dispatch import receiver

from account.models import Accounts
from .models import PlatformConfig


@receiver(post_save, sender=Accounts)
def create_platform_config(sender, instance, created, **kwargs):
    if created and instance.role in ["admin", "superadmin"]:
        PlatformConfig.objects.get_or_create(owner=instance)