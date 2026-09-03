# withdrawals/views.py - Complete updated file with recipient storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from decimal import Decimal
import uuid
import logging
import re
from django.utils import timezone

from account.models import Accounts
from UserBalance.models import UserBalance
from .models import Withdrawal
from .services import PaystackTransferService

logger = logging.getLogger(__name__)


# ============================================================
# PHONE NUMBER HELPER
# ============================================================

def format_phone_for_paystack(phone_number):
    """
    Format phone number for Paystack M-Pesa transfers.
    Handles various Kenyan phone number formats.
    """
    if not phone_number:
        return None
    
    # Remove any whitespace, dashes, parentheses, or plus signs
    phone = re.sub(r'[\s\-\(\)\+]', '', phone_number)
    
    # If it's a 10-digit number starting with 0 (e.g., 0758420860)
    if phone.startswith('0') and len(phone) == 10:
        phone = '254' + phone[1:]
    # If it's a 10-digit number starting with 7 or 1 (missing 0)
    elif len(phone) == 10 and (phone.startswith('7') or phone.startswith('1')):
        phone = '254' + phone
    # If it's a 9-digit number (missing leading 0 and first digit)
    elif len(phone) == 9:
        # Try to determine if it's Safaricom (7) or Airtel (1)
        if phone.startswith('7') or phone.startswith('1'):
            phone = '254' + phone
        else:
            return None
    # If it already has 254 prefix
    elif phone.startswith('254') and len(phone) == 12:
        pass  # Keep as is
    else:
        return None
    
    # Final validation: should start with 254 and be 12 digits total
    if not phone.startswith('254') or len(phone) != 12:
        return None
    
    # Ensure it only contains digits
    if not phone.isdigit():
        return None
    
    return phone


# ============================================================
# DEBUG PAYSTACK VIEW - To test API connection
# ============================================================

class DebugPaystackView(APIView):
    """Debug endpoint to test Paystack API connection"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        debug_info = {
            'status': 'testing',
            'steps': []
        }
        
        # Step 1: Check environment variables
        try:
            from django.conf import settings
            debug_info['steps'].append({
                'step': 1,
                'name': 'Check Paystack Configuration',
                'secret_key_set': bool(settings.PAYSTACK_SECRET_KEY),
                'secret_key_preview': settings.PAYSTACK_SECRET_KEY[:10] + '...' if settings.PAYSTACK_SECRET_KEY else 'Not set',
                'public_key_set': bool(settings.PAYSTACK_PUBLIC_KEY),
                'base_url': settings.PAYSTACK_BASE_URL
            })
        except Exception as e:
            debug_info['steps'].append({
                'step': 1,
                'name': 'Check Paystack Configuration',
                'error': str(e)
            })
            return Response(debug_info)
        
        # Step 2: Check user phone number
        try:
            raw_phone = request.user.phone_number
            formatted_phone = format_phone_for_paystack(raw_phone) if raw_phone else None
            
            debug_info['steps'].append({
                'step': 2,
                'name': 'User Phone Number',
                'raw_phone': raw_phone,
                'formatted_phone': formatted_phone,
                'has_phone': bool(raw_phone),
                'is_valid': bool(formatted_phone)
            })
        except Exception as e:
            debug_info['steps'].append({
                'step': 2,
                'name': 'User Phone Number',
                'error': str(e)
            })
        
        # Step 3: Test Paystack API directly
        try:
            paystack_service = PaystackTransferService()
            
            # Test 1: Get balance (simple API call)
            balance = paystack_service.get_balance()
            
            debug_info['steps'].append({
                'step': 3,
                'name': 'Paystack API Test - Get Balance',
                'success': balance is not None,
                'balance': balance
            })
        except Exception as e:
            debug_info['steps'].append({
                'step': 3,
                'name': 'Paystack API Test - Get Balance',
                'success': False,
                'error': str(e)
            })
        
        # Step 4: Test creating a recipient (if phone is valid)
        if formatted_phone:
            try:
                paystack_service = PaystackTransferService()
                user_name = request.user.get_full_name() or request.user.username
                
                # Create recipient
                recipient_code = paystack_service.create_recipient(user_name, formatted_phone)
                
                debug_info['steps'].append({
                    'step': 4,
                    'name': 'Create Recipient Test',
                    'success': recipient_code is not None,
                    'recipient_code': recipient_code,
                    'phone_used': formatted_phone,
                    'name_used': user_name
                })
            except Exception as e:
                debug_info['steps'].append({
                    'step': 4,
                    'name': 'Create Recipient Test',
                    'success': False,
                    'error': str(e)
                })
        
        debug_info['status'] = 'complete'
        return Response(debug_info)


# ============================================================
# WITHDRAW VIEW - UPDATED with recipient storage
# ============================================================

class WithdrawView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        amount = request.data.get('amount')
        
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
        if amount <= 0:
            return Response(
                {'error': 'Amount must be greater than 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Maximum amount check
        if amount > 150000:
            return Response(
                {'error': 'Maximum withdrawal amount is KES 150,000'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's phone number from the authenticated user's account
        raw_phone_number = request.user.phone_number
        
        # Validate phone number exists
        if not raw_phone_number:
            return Response(
                {'error': 'No phone number registered. Please update your profile to add a phone number.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Format phone number for Paystack
        formatted_phone = format_phone_for_paystack(raw_phone_number)
        
        if not formatted_phone:
            logger.error(f"❌ Invalid phone number format: {raw_phone_number}")
            return Response(
                {'error': f'Invalid phone number format: {raw_phone_number}. Please update your profile with a valid Kenyan phone number (e.g., 0712345678).'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"📱 Phone number formatted: {raw_phone_number} -> {formatted_phone}")
        
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
            # ============================================================
            # STEP 1: CHECK IF USER ALREADY HAS A RECIPIENT CODE
            # ============================================================
            recipient_code = request.user.paystack_recipient_code
            
            if recipient_code:
                logger.info(f"✅ Using existing recipient code for user {request.user.email}: {recipient_code}")
            else:
                # Create new recipient
                logger.info(f"📤 Creating new recipient for user: {request.user.email}")
                
                recipient_code = paystack_service.create_recipient(
                    name=user_name,
                    phone_number=formatted_phone
                )
                
                if not recipient_code:
                    return Response(
                        {'error': 'Failed to create recipient. Please ensure your phone number is correct and try again.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # ============================================================
                # STEP 2: SAVE RECIPIENT CODE TO USER MODEL (PERMANENT STORAGE)
                # ============================================================
                request.user.paystack_recipient_code = recipient_code
                request.user.paystack_recipient_phone = formatted_phone
                request.user.paystack_recipient_created_at = timezone.now()
                request.user.save()
                
                logger.info(f"✅ Recipient saved to user {request.user.email}: {recipient_code}")
            
            # ============================================================
            # STEP 3: INITIATE TRANSFER USING RECIPIENT CODE
            # ============================================================
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
            
            # ============================================================
            # STEP 4: CREATE WITHDRAWAL RECORD
            # ============================================================
            withdrawal = Withdrawal.objects.create(
                user=request.user,
                amount=amount,
                currency='KES',
                phone_number=formatted_phone,
                reference=reference,
                paystack_transfer_code=transfer_result.get('transfer_code'),
                paystack_recipient_code=recipient_code,
                status='processing'
            )
            
            # ============================================================
            # STEP 5: DEDUCT FROM USER'S BALANCE
            # ============================================================
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
                phone_number=formatted_phone,
                reference=reference,
                status='failed',
                error_message=str(e)
            )
            
            return Response(
                {'error': f'Withdrawal failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================
# WITHDRAWAL HISTORY VIEW
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
# WITHDRAWAL STATUS VIEW
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
# UPDATE PHONE NUMBER VIEW
# ============================================================

class UpdatePhoneNumberView(APIView):
    """Allow users to update their phone number"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        phone_number = request.data.get('phone_number')
        
        if not phone_number:
            return Response(
                {'error': 'Phone number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Format and validate phone number
        formatted_phone = format_phone_for_paystack(phone_number)
        
        if not formatted_phone:
            return Response(
                {'error': 'Invalid phone number format. Please use a valid Kenyan phone number (e.g., 0712345678).'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update user's phone number
        user = request.user
        user.phone_number = phone_number
        user.save()
        
        logger.info(f"✅ Phone number updated for user {user.email}: {phone_number}")
        
        return Response({
            'success': True,
            'message': 'Phone number updated successfully',
            'phone_number': phone_number,
            'formatted': formatted_phone
        })