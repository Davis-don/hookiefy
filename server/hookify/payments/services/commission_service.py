# payments/services/commission_service.py
from decimal import Decimal
import logging
from django.db import transaction
from django.utils import timezone

from account.models import Accounts
from assignments.models import ClientAssignment
from payments.models import Payment
from notification.models import Notification

# Import UserBalance from the correct app
from UserBalance.models import UserBalance

# Import Commission from the correct app
try:
    from commissions.models import Commission
except ImportError:
    try:
        from commisions.models import Commission
    except ImportError:
        Commission = None
        logging.warning("⚠️ Commission model not found")

logger = logging.getLogger(__name__)


class CommissionDistributionError(Exception):
    """Custom exception for commission distribution errors."""
    pass


class CommissionService:
    """
    Service to handle commission distribution for successful payments.
    """
    
    @classmethod
    def distribute_commission_for_payment(cls, payment: Payment) -> dict:
        """
        Main method to distribute commission for a successful payment.
        """
        logger.info(f"💰 Starting commission distribution for payment {payment.merchant_reference}")
        logger.info(f"   Payment ID: {payment.id}")
        logger.info(f"   Payment Amount: {payment.amount}")
        logger.info(f"   User: {payment.user.email}")
        
        try:
            # Validate payment
            cls._validate_payment(payment)
            
            # Get the user and their assignment
            user = payment.user
            logger.info(f"   User: {user.email}")
            
            assignment = cls._get_client_assignment(user)
            admin = assignment.assigned_admin
            logger.info(f"   Assigned Admin: {admin.email}")
            
            # Get superadmin
            superadmin = cls._get_superadmin()
            logger.info(f"   Superadmin: {superadmin.email}")
            
            # Get commission percentage
            total_amount = payment.amount
            commission_percentage = cls._get_commission_percentage(admin)
            logger.info(f"   Commission Percentage: {commission_percentage}%")
            
            # Calculate amounts
            if commission_percentage > 0:
                admin_amount = (commission_percentage / Decimal('100')) * total_amount
                superadmin_amount = total_amount - admin_amount
                logger.info(f"   Admin gets: {admin_amount} ({commission_percentage}%)")
                logger.info(f"   Superadmin gets: {superadmin_amount} ({100 - commission_percentage}%)")
            else:
                admin_amount = Decimal('0.00')
                superadmin_amount = total_amount
                logger.info(f"   No commission configured - Superadmin gets 100%: {superadmin_amount}")
            
            # Distribute funds with transaction
            with transaction.atomic():
                # Update admin balance if they get anything
                if admin_amount > 0:
                    cls._update_user_balance(
                        admin, 
                        admin_amount, 
                        f"Commission ({commission_percentage}%) from {payment.merchant_reference}"
                    )
                    logger.info(f"✅ Admin {admin.email} balance updated: +{admin_amount}")
                else:
                    logger.info(f"ℹ️ Admin {admin.email} received 0 (no commission)")
                
                # Update superadmin balance
                if superadmin_amount > 0:
                    platform_percentage = 100 - commission_percentage
                    cls._update_user_balance(
                        superadmin, 
                        superadmin_amount, 
                        f"Platform share ({platform_percentage}%) from {payment.merchant_reference}"
                    )
                    logger.info(f"✅ Superadmin {superadmin.email} balance updated: +{superadmin_amount}")
                else:
                    logger.warning(f"⚠️ Superadmin received 0 - this should not happen")
                
                # Create notifications
                cls._create_distribution_notifications(
                    payment=payment,
                    admin=admin,
                    superadmin=superadmin,
                    admin_amount=admin_amount,
                    superadmin_amount=superadmin_amount,
                    commission_percentage=commission_percentage
                )
                
                logger.info(f"✅ Commission distributed for payment {payment.merchant_reference}")
                
                return {
                    "success": True,
                    "payment_id": payment.id,
                    "merchant_reference": payment.merchant_reference,
                    "total_amount": float(total_amount),
                    "commission_percentage": float(commission_percentage),
                    "admin_amount": float(admin_amount),
                    "superadmin_amount": float(superadmin_amount),
                    "admin_id": admin.id,
                    "admin_email": admin.email,
                    "superadmin_id": superadmin.id,
                    "superadmin_email": superadmin.email,
                    "has_commission": commission_percentage > 0
                }
                
        except Exception as e:
            logger.error(f"❌ Commission distribution failed: {str(e)}", exc_info=True)
            raise CommissionDistributionError(f"Commission distribution failed: {str(e)}")
    
    @classmethod
    def _validate_payment(cls, payment: Payment):
        """Validate that the payment is eligible for commission distribution."""
        if payment.status != "completed":
            raise CommissionDistributionError(
                f"Payment {payment.merchant_reference} is not completed. Status: {payment.status}"
            )
        
        if payment.paid_at is None:
            raise CommissionDistributionError(
                f"Payment {payment.merchant_reference} has no paid_at timestamp"
            )
        
        if payment.amount <= 0:
            raise CommissionDistributionError(
                f"Payment {payment.merchant_reference} has invalid amount: {payment.amount}"
            )
        
        logger.info(f"✅ Payment validation passed for {payment.merchant_reference}")
    
    @classmethod
    def _get_client_assignment(cls, user: Accounts) -> ClientAssignment:
        """Get the client assignment for a user."""
        try:
            assignment = ClientAssignment.objects.get(user=user)
            logger.info(f"✅ Found assignment for user {user.email}: Admin {assignment.assigned_admin.email}")
            return assignment
        except ClientAssignment.DoesNotExist:
            raise CommissionDistributionError(
                f"User {user.email} is not assigned to any admin"
            )
    
    @classmethod
    def _get_commission_percentage(cls, admin: Accounts) -> Decimal:
        """
        Get the commission percentage for an admin.
        If no commission exists, returns 0 (meaning superadmin gets 100%).
        """
        try:
            if Commission is None:
                logger.warning("⚠️ Commission model not available")
                return Decimal('0.00')
            
            commission = Commission.objects.get(admin=admin)
            percentage = commission.percentage
            logger.info(f"✅ Found commission for admin {admin.email}: {percentage}%")
            return Decimal(str(percentage))
            
        except Commission.DoesNotExist:
            logger.warning(
                f"⚠️ No commission configured for admin {admin.email}. "
                f"Superadmin will receive 100% of the payment."
            )
            return Decimal('0.00')
        
        except Exception as e:
            logger.error(f"❌ Error getting commission for admin {admin.email}: {str(e)}")
            return Decimal('0.00')
    
    @classmethod
    def _get_superadmin(cls) -> Accounts:
        """Get the single superadmin in the system."""
        superadmins = Accounts.objects.filter(
            role='superadmin',
            is_active=True
        )
        
        count = superadmins.count()
        logger.info(f"📊 Found {count} superadmin(s)")
        
        if count == 0:
            raise CommissionDistributionError(
                "No superadmin found in the system. Please create a superadmin."
            )
        
        if count > 1:
            raise CommissionDistributionError(
                f"Multiple superadmins found ({count}). Only one superadmin is allowed."
            )
        
        superadmin = superadmins.first()
        logger.info(f"✅ Found superadmin: {superadmin.email}")
        return superadmin
    
    @classmethod
    def _update_user_balance(cls, user: Accounts, amount: Decimal, description: str):
        """
        Update a user's balance in the wallet.
        """
        # Ensure amount is positive
        if amount <= 0:
            logger.warning(f"Amount {amount} is not positive for user {user.email}")
            return
        
        try:
            with transaction.atomic():
                # Get or create wallet
                wallet, created = UserBalance.objects.get_or_create(
                    user=user,
                    defaults={
                        'balance': Decimal('0.00'),
                        'pending_balance': Decimal('0.00'),
                        'total_earned': Decimal('0.00'),
                        'total_withdrawn': Decimal('0.00'),
                        'currency': 'KES'
                    }
                )
                
                # Log before update
                old_balance = wallet.balance
                
                # Update balances
                wallet.balance += amount
                wallet.total_earned += amount
                wallet.updated_at = timezone.now()
                wallet.save()
                
                logger.info(
                    f"✅ Wallet updated for {user.email}: "
                    f"Old: {old_balance}, "
                    f"Added: +{amount}, "
                    f"New: {wallet.balance}, "
                    f"Total earned: {wallet.total_earned}"
                )
                
        except Exception as e:
            logger.error(f"❌ Failed to update wallet for {user.email}: {str(e)}", exc_info=True)
            raise CommissionDistributionError(f"Wallet update failed: {str(e)}")
    
    @classmethod
    def _create_distribution_notifications(
        cls,
        payment: Payment,
        admin: Accounts,
        superadmin: Accounts,
        admin_amount: Decimal,
        superadmin_amount: Decimal,
        commission_percentage: Decimal
    ):
        """
        Create notifications for commission distribution.
        """
        try:
            # Notification for Admin (if they received something)
            if admin_amount > 0:
                Notification.objects.create(
                    user=admin,
                    connection=payment.connection,
                    title="💰 Commission Received!",
                    message=(
                        f"You have received KES {admin_amount:.2f} "
                        f"from payment for connection with {payment.user.full_name}. "
                        f"(Your commission: {commission_percentage}%)"
                    ),
                    notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
                    is_read=False,
                )
                logger.info(f"✅ Commission notification created for admin {admin.email}")
            else:
                Notification.objects.create(
                    user=admin,
                    connection=payment.connection,
                    title="ℹ️ No Commission Configured",
                    message=(
                        f"A payment of KES {payment.amount:.2f} was made for "
                        f"connection with {payment.user.full_name}. "
                        f"No commission is configured for you, so the full amount "
                        f"went to the platform."
                    ),
                    notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
                    is_read=False,
                )
                logger.info(f"ℹ️ No-commission notification created for admin {admin.email}")
            
            # Notification for Superadmin (always receives something)
            platform_percentage = 100 - commission_percentage
            if superadmin_amount > 0:
                Notification.objects.create(
                    user=superadmin,
                    connection=payment.connection,
                    title="💰 Platform Commission Received!",
                    message=(
                        f"Platform received KES {superadmin_amount:.2f} "
                        f"({platform_percentage}%) from "
                        f"{payment.user.full_name}'s payment for connection with {admin.full_name}."
                    ),
                    notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
                    is_read=False,
                )
                logger.info(f"✅ Platform commission notification created for superadmin {superadmin.email}")
            
        except Exception as e:
            logger.error(f"❌ Failed to create commission notifications: {str(e)}", exc_info=True)
            # Don't raise - notifications are non-critical
    
    @classmethod
    def check_superadmin_exists(cls) -> bool:
        """
        Check if exactly one superadmin exists in the system.
        """
        count = Accounts.objects.filter(role='superadmin', is_active=True).count()
        logger.info(f"📊 Superadmin count: {count}")
        return count == 1
    
    @classmethod
    def get_commission_breakdown(
        cls,
        payment_amount: Decimal,
        admin: Accounts = None
    ) -> dict:
        """
        Calculate the commission breakdown for a given payment amount.
        """
        if payment_amount <= 0:
            raise ValueError("Payment amount must be positive")
        
        if admin:
            commission_percentage = cls._get_commission_percentage(admin)
        else:
            commission_percentage = Decimal('0.00')
        
        if commission_percentage > 0:
            admin_amount = (commission_percentage / Decimal('100')) * payment_amount
            superadmin_amount = payment_amount - admin_amount
            platform_percentage = 100 - commission_percentage
        else:
            admin_amount = Decimal('0.00')
            superadmin_amount = payment_amount
            platform_percentage = 100
            commission_percentage = 0
        
        # Check superadmin status
        has_superadmin = cls.check_superadmin_exists()
        
        return {
            "total_amount": float(payment_amount),
            "commission_percentage": float(commission_percentage),
            "platform_percentage": float(platform_percentage),
            "admin_amount": float(admin_amount),
            "superadmin_amount": float(superadmin_amount),
            "has_superadmin": has_superadmin,
            "can_process_payment": has_superadmin and superadmin_amount > 0
        }