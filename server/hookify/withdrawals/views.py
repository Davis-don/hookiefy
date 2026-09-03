# withdrawals/views.py - Complete updated file with phone number from authenticated user
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from decimal import Decimal
import uuid
import logging

from account.models import Accounts
from UserBalance.models import UserBalance
from .models import Withdrawal
from .services import PaystackTransferService

logger = logging.getLogger(__name__)

# ============================================================
# WITHDRAW VIEW - Updated to use phone from authenticated user
# ============================================================

class WithdrawView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        amount = request.data.get('amount')
        # phone_number no longer required from request - fetched from user
        
        # Validate input
        if not amount:
            return Response(
                {'error': 'Amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = Decimal(str(amount))
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate amount - MINIMUM RESTRICTION REMOVED
        # Users can withdraw any positive amount
        if amount <= 0:
            return Response(
                {'error': 'Amount must be greater than 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Maximum amount check (kept for safety)
        if amount > 150000:
            return Response(
                {'error': 'Maximum withdrawal amount is KES 150,000'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's phone number from the authenticated user's account
        phone_number = request.user.phone_number
        
        # Validate phone number exists
        if not phone_number:
            return Response(
                {'error': 'No phone number registered. Please update your profile to add a phone number.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate phone number format
        if len(phone_number) < 10:
            return Response(
                {'error': 'Invalid phone number format. Please update your profile.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's balance from UserBalance model
        try:
            user_balance = UserBalance.objects.get(user=request.user)
        except UserBalance.DoesNotExist:
            return Response(
                {'error': 'Balance not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user has sufficient balance
        if user_balance.balance < amount:
            return Response(
                {'error': f'Insufficient balance. Available: KES {user_balance.balance}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate reference
        reference = f"WD-{uuid.uuid4().hex[:12].upper()}"
        
        # Get user's full name for recipient
        user_name = request.user.get_full_name() or request.user.username
        
        # Initialize Paystack service
        try:
            paystack_service = PaystackTransferService()
        except ValueError as e:
            logger.error(f"❌ Paystack service initialization error: {str(e)}")
            return Response(
                {'error': 'Payment service is not properly configured. Please contact support.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            # Step 1: Create recipient
            recipient_code = paystack_service.create_recipient(user_name, phone_number)
            
            if not recipient_code:
                return Response(
                    {'error': 'Failed to create recipient. Please ensure your phone number is correct.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Step 2: Initiate transfer
            transfer_result = paystack_service.initiate_transfer(
                recipient_code=recipient_code,
                amount=float(amount),
                reference=reference,
                reason=f'M-Pesa withdrawal by {request.user.username}'
            )
            
            if not transfer_result:
                return Response(
                    {'error': 'Failed to initiate withdrawal. Please try again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Step 3: Create withdrawal record
            withdrawal = Withdrawal.objects.create(
                user=request.user,
                amount=amount,
                currency='KES',
                phone_number=phone_number,  # Using the user's phone number
                reference=reference,
                paystack_transfer_code=transfer_result.get('transfer_code'),
                paystack_recipient_code=recipient_code,
                status='processing'
            )
            
            # Step 4: Deduct from user's balance
            user_balance.balance -= amount
            user_balance.save()
            
            # Update total withdrawn
            user_balance.total_withdrawn += amount
            user_balance.save()
            
            logger.info(f"✅ Withdrawal initiated: {reference} for user {request.user.email}")
            
            return Response({
                'success': True,
                'message': 'Withdrawal initiated successfully',
                'withdrawal': {
                    'id': withdrawal.id,
                    'reference': withdrawal.reference,
                    'amount': withdrawal.amount,
                    'phone_number': withdrawal.phone_number,
                    'status': withdrawal.status,
                    'created_at': withdrawal.created_at
                },
                'new_balance': user_balance.balance,
                'transfer_code': transfer_result.get('transfer_code')
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Withdrawal error: {str(e)}")
            
            # Revert balance if error occurred during transfer
            user_balance.balance += amount
            user_balance.save()
            
            # Create failed withdrawal record
            Withdrawal.objects.create(
                user=request.user,
                amount=amount,
                currency='KES',
                phone_number=phone_number,
                reference=reference,
                status='failed',
                error_message=str(e)
            )
            
            return Response(
                {'error': f'Withdrawal failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================
# WITHDRAWAL HISTORY VIEW - Unchanged
# ============================================================

class WithdrawalHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        withdrawals = Withdrawal.objects.filter(user=request.user)
        
        data = [{
            'id': w.id,
            'amount': w.amount,
            'currency': w.currency,
            'phone_number': w.phone_number,
            'status': w.status,
            'reference': w.reference,
            'created_at': w.created_at,
            'completed_at': w.completed_at,
        } for w in withdrawals]
        
        return Response({
            'success': True,
            'count': len(data),
            'withdrawals': data
        })


# ============================================================
# WITHDRAWAL STATUS VIEW - Unchanged
# ============================================================

class WithdrawalStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, reference):
        try:
            withdrawal = Withdrawal.objects.get(reference=reference, user=request.user)
        except Withdrawal.DoesNotExist:
            return Response(
                {'error': 'Withdrawal not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify status with Paystack
        try:
            paystack_service = PaystackTransferService()
            transfer_data = paystack_service.verify_transfer(withdrawal.paystack_transfer_code)
            
            if transfer_data:
                paystack_status = transfer_data.get('status')
                
                # Update status based on Paystack response
                if paystack_status == 'success':
                    withdrawal.status = 'completed'
                    withdrawal.completed_at = transfer_data.get('completed_at')
                elif paystack_status in ['failed', 'reversed']:
                    withdrawal.status = 'failed'
                    withdrawal.error_message = transfer_data.get('failure_reason', 'Transfer failed')
                elif paystack_status == 'pending':
                    withdrawal.status = 'pending'
                
                withdrawal.save()
        except Exception as e:
            logger.error(f"❌ Error verifying withdrawal status: {str(e)}")
        
        return Response({
            'success': True,
            'withdrawal': {
                'id': withdrawal.id,
                'amount': withdrawal.amount,
                'currency': withdrawal.currency,
                'phone_number': withdrawal.phone_number,
                'status': withdrawal.status,
                'reference': withdrawal.reference,
                'created_at': withdrawal.created_at,
                'completed_at': withdrawal.completed_at,
                'error_message': withdrawal.error_message,
            }
        })


# ============================================================
# TEST PAYSTACK VIEW - For debugging (Optional)
# ============================================================

class TestPaystackView(APIView):
    """Test endpoint to verify Paystack configuration"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Try to initialize the service
            paystack_service = PaystackTransferService()
            
            # Test: Get balance
            balance = paystack_service.get_balance()
            
            return Response({
                'success': True,
                'message': 'Paystack is configured',
                'secret_key_preview': paystack_service.secret_key[:10] + '...' if paystack_service.secret_key else 'Not set',
                'base_url': paystack_service.BASE_URL,
                'balance': balance,
                'status': 'connected'
            })
        except ValueError as e:
            return Response({
                'success': False,
                'error': str(e),
                'status': 'configuration_error'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"❌ Paystack test error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)