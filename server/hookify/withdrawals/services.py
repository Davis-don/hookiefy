# withdrawals/services.py - Updated with better error logging
import requests
import uuid
import logging
import re
from decimal import Decimal
from django.conf import settings

logger = logging.getLogger(__name__)

class PaystackTransferService:
    BASE_URL = settings.PAYSTACK_BASE_URL
    
    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY
        
        # Validate secret key
        if not self.secret_key or self.secret_key == '':
            logger.error("❌ Paystack secret key is not configured properly!")
            raise ValueError("Paystack secret key is not configured. Please set PAYSTACK_SECRET_KEY in environment.")
        
        # Check if using test key
        self.is_test = self.secret_key.startswith('sk_test_')
        if self.is_test:
            logger.info("🔬 Using Paystack TEST mode")
        else:
            logger.info("🔒 Using Paystack LIVE mode")
        
        self.headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
        }
        
        logger.info(f"✅ Paystack service initialized with base URL: {self.BASE_URL}")
    
    def format_phone_number(self, phone_number):
        """Format phone number for Paystack M-Pesa transfers."""
        if not phone_number:
            return None
        
        # Remove any whitespace, dashes, or parentheses
        phone = re.sub(r'[\s\-\(\)]', '', phone_number)
        phone = phone.replace('+', '')
        
        # Format for Kenya
        if phone.startswith('0') and len(phone) == 10:
            phone = '254' + phone[1:]
        elif not phone.startswith('254') and len(phone) == 10:
            if phone.startswith('7') or phone.startswith('1'):
                phone = '254' + phone
        elif not phone.startswith('254') and len(phone) == 9:
            if phone.startswith('7') or phone.startswith('1'):
                phone = '254' + phone
            else:
                return None
        
        # Final validation
        if not phone.startswith('254') or len(phone) != 12:
            return None
        
        if not phone.isdigit():
            return None
        
        return phone
    
    def create_recipient(self, name, phone_number):
        """Create a transfer recipient for M-Pesa."""
        url = f'{self.BASE_URL}/transferrecipient'
        
        formatted_phone = self.format_phone_number(phone_number)
        if not formatted_phone:
            logger.error(f"❌ Failed to format phone number: {phone_number}")
            return None
        
        payload = {
            'type': 'mobile_money',
            'name': name[:100],
            'phone_number': formatted_phone,
            'currency': 'KES',
            'metadata': {
                'provider': 'MPESA'
            }
        }
        
        logger.info(f"📤 Creating recipient with phone: {formatted_phone}")
        logger.info(f"📤 Full payload: {payload}")
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            
            # Log full response for debugging
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response text: {response.text}")
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                if data.get('status'):
                    recipient_code = data['data']['recipient_code']
                    logger.info(f"✅ Created recipient: {recipient_code}")
                    return recipient_code
                else:
                    logger.error(f"❌ API returned error: {data.get('message')}")
                    return None
            elif response.status_code == 401:
                logger.error("❌ Unauthorized - Check your secret key")
                return None
            elif response.status_code == 402:
                logger.error("❌ Payment Required - Insufficient balance in Paystack account")
                return None
            elif response.status_code == 422:
                error_data = response.json()
                logger.error(f"❌ Validation error: {error_data}")
                return None
            else:
                logger.error(f"❌ HTTP {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request error: {str(e)}")
            return None
    
    def initiate_transfer(self, recipient_code, amount, reference, reason='M-Pesa Withdrawal'):
        """Initiate a transfer to M-Pesa."""
        url = f'{self.BASE_URL}/transfer'
        
        amount_in_kobo = int(float(amount) * 100)
        
        payload = {
            'source': 'balance',
            'amount': amount_in_kobo,
            'recipient': recipient_code,
            'reason': reason[:200],
            'reference': reference,
            'currency': 'KES',
        }
        
        logger.info(f"📤 Initiating transfer: {reference}")
        logger.info(f"📤 Amount: {amount} KES ({amount_in_kobo} kobo)")
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            
            logger.info(f"Transfer response status: {response.status_code}")
            logger.info(f"Transfer response text: {response.text}")
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                if data.get('status'):
                    logger.info(f"✅ Transfer initiated: {data['data']['transfer_code']}")
                    return data['data']
                else:
                    logger.error(f"❌ Transfer error: {data.get('message')}")
                    return None
            elif response.status_code == 402:
                logger.error("❌ Insufficient Paystack balance")
                return None
            else:
                logger.error(f"❌ HTTP {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request error: {str(e)}")
            return None
    
    def get_balance(self):
        """Get Paystack balance."""
        url = f'{self.BASE_URL}/balance'
        
        try:
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status'):
                    return data['data']
                else:
                    logger.error(f"❌ Balance error: {data.get('message')}")
                    return None
            elif response.status_code == 401:
                logger.error("❌ Unauthorized - Check your secret key")
                return None
            else:
                logger.error(f"❌ HTTP {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request error: {str(e)}")
            return None
    
    def verify_transfer(self, transfer_code):
        """Verify transfer status."""
        url = f'{self.BASE_URL}/transfer/{transfer_code}'
        
        try:
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status'):
                    return data['data']
                return None
            else:
                logger.error(f"❌ HTTP {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request error: {str(e)}")
            return None