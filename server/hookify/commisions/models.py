# commissions/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from account.models import Accounts


class Commission(models.Model):
    """
    Commission configuration for admin users.
    Each admin has their own commission percentage for earnings.
    The remaining percentage goes to the platform (superadmin).
    """
    
    admin = models.OneToOneField(
        Accounts,
        on_delete=models.CASCADE,
        related_name="commission_config",
        limit_choices_to={"role__in": ["admin", "superadmin"]},
        help_text="Admin user this commission configuration belongs to"
    )
    
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=20.00,
        validators=[
            MinValueValidator(0.00),
            MaxValueValidator(100.00)
        ],
        help_text="Commission percentage for the admin (0-100%). Example: 20 means admin gets 20%, platform gets 80%"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "commissions"
        verbose_name = "Commission"
        verbose_name_plural = "Commissions"
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"{self.admin.full_name} - {self.percentage}%"
    
    @property
    def platform_percentage(self):
        """Calculate the platform's (superadmin) percentage."""
        return 100 - self.percentage
    
    @property
    def platform_amount(self, total_amount):
        """Calculate the platform's share of a total amount."""
        return (total_amount * self.platform_percentage) / 100
    
    @property
    def admin_amount(self, total_amount):
        """Calculate the admin's share of a total amount."""
        return (total_amount * self.percentage) / 100
    
    def get_split(self, total_amount):
        """
        Get the split amounts for admin and platform.
        
        Args:
            total_amount: The total amount to split
            
        Returns:
            dict: {
                'admin_amount': Decimal,
                'platform_amount': Decimal,
                'admin_percentage': Decimal,
                'platform_percentage': Decimal
            }
        """
        admin_share = (total_amount * self.percentage) / 100
        platform_share = total_amount - admin_share
        
        return {
            'admin_amount': admin_share,
            'platform_amount': platform_share,
            'admin_percentage': self.percentage,
            'platform_percentage': self.platform_percentage
        }
    
    @classmethod
    def get_admin_commission(cls, admin):
        """
        Get the commission configuration for a specific admin.
        Creates one with default if it doesn't exist.
        
        Args:
            admin: Accounts instance with role admin or superadmin
            
        Returns:
            Commission instance
        """
        commission, created = cls.objects.get_or_create(
            admin=admin,
            defaults={
                'percentage': 20.00
            }
        )
        return commission
    
    @classmethod
    def get_admin_percentage(cls, admin):
        """
        Get the commission percentage for a specific admin.
        
        Args:
            admin: Accounts instance with role admin or superadmin
            
        Returns:
            Decimal: Commission percentage
        """
        commission = cls.get_admin_commission(admin)
        return commission.percentage
    
    @classmethod
    def get_platform_percentage(cls, admin):
        """
        Get the platform percentage for a specific admin.
        
        Args:
            admin: Accounts instance with role admin or superadmin
            
        Returns:
            Decimal: Platform percentage
        """
        commission = cls.get_admin_commission(admin)
        return commission.platform_percentage