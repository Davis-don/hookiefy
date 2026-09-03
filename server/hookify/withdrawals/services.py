import requests
import uuid
import logging
from decimal import Decimal
from django.conf import settings

logger = logging.getLogger(__name__)

class PaystackTransferService:
    BASE_URL = settings.PAYSTACK_BASE_URL
    
    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY
        self.headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
        }
    
    def create_recipient(self, name, phone_number):
        """Create a transfer recipient for M-Pesa"""
        url = f'{self.BASE_URL}/transferrecipient'
        
        # Format phone number (remove leading 0, add country code if needed)
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]
        elif not phone_number.startswith('254') and not phone_number.startswith('+'):
            phone_number = '254' + phone_number
        
        payload = {
            'type': 'mobile_money',
            'name': name[:100],  # Ensure it's not too long
            'phone_number': phone_number,
            'currency': 'KES',
            'metadata': {
                'provider': 'MPESA'
            }
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status'):
                logger.info(f"✅ Created recipient: {data['data']['recipient_code']}")
                return data['data']['recipient_code']
            else:
                logger.error(f"❌ Failed to create recipient: {data.get('message')}")
                return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error creating recipient: {str(e)}")
            return None
    
    def initiate_transfer(self, recipient_code, amount, reference, reason='M-Pesa Withdrawal'):
        """Initiate a transfer to M-Pesa"""
        url = f'{self.BASE_URL}/transfer'
        
        # Amount in kobo (Paystack uses smallest currency unit)
        amount_in_kobo = int(amount * 100)
        
        payload = {
            'source': 'balance',
            'amount': amount_in_kobo,
            'recipient': recipient_code,
            'reason': reason[:200],  # Ensure it's not too long
            'reference': reference,
            'currency': 'KES',
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status'):
                logger.info(f"✅ Transfer initiated: {data['data']['transfer_code']}")
                return data['data']
            else:
                logger.error(f"❌ Failed to initiate transfer: {data.get('message')}")
                return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error initiating transfer: {str(e)}")
            return None
    
    def verify_transfer(self, transfer_code):
        """Verify transfer status"""
        url = f'{self.BASE_URL}/transfer/{transfer_code}'
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status'):
                return data['data']
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error verifying transfer: {str(e)}")
            return None
    
    def get_balance(self):
        """Get Paystack balance"""
        url = f'{self.BASE_URL}/balance'
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status'):
                return data['data']
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error getting balance: {str(e)}")
            return None