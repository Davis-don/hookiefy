# withdrawals/services.py - Updated with correct Paystack recipient format
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
        if not self.secret_key or self.secret_key == 'sk_test_...' or self.secret_key == '':
            logger.error("❌ Paystack secret key is not configured properly!")
            raise ValueError("Paystack secret key is not configured. Please set PAYSTACK_SECRET_KEY in environment.")
        
        self.headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
        }
        
        logger.info(f"✅ Paystack service initialized with base URL: {self.BASE_URL}")
    
    def format_phone_number(self, phone_number):
        """
        Format phone number for Paystack M-Pesa transfers.
        Handles various Kenyan phone number formats.
        """
        # Remove any whitespace, dashes, or parentheses
        phone = re.sub(r'[\s\-\(\)]', '', phone_number)
        
        # Remove leading + if present
        phone = phone.replace('+', '')
        
        # Check if it's a valid Kenyan phone number
        if phone.startswith('0'):
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
        """
        Create a transfer recipient for M-Pesa.
        For Paystack mobile money transfers, we need to use the correct format.
        """
        url = f'{self.BASE_URL}/transferrecipient'
        
        # Format phone number
        formatted_phone = self.format_phone_number(phone_number)
        
        if not formatted_phone:
            logger.error(f"❌ Failed to format phone number: {phone_number}")
            return None
        
        # Paystack requires mobile money recipients to use 'mobile_money' type
        # and the phone number must be in international format without +
        payload = {
            'type': 'mobile_money',
            'name': name[:100],
            'phone_number': formatted_phone,
            'currency': 'KES',
            'metadata': {
                'provider': 'MPESA'
            }
        }
        
        logger.info(f"📤 Creating recipient with payload: {payload}")
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response body: {response.text}")
            
            if response.status_code == 401:
                logger.error("❌ Paystack authentication failed. Check your secret key.")
                return None
            
            if response.status_code == 422:
                logger.error(f"❌ Unprocessable entity: {response.text}")
                error_data = response.json()
                logger.error(f"Error details: {error_data}")
                return None
            
            if response.status_code == 400:
                logger.error(f"❌ Bad request: {response.text}")
                error_data = response.json()
                logger.error(f"Error details: {error_data}")
                return None
            
            response.raise_for_status()
            data = response.json()
            
            if data.get('status'):
                recipient_code = data['data'].get('recipient_code')
                logger.info(f"✅ Created recipient: {recipient_code}")
                return recipient_code
            else:
                logger.error(f"❌ Failed to create recipient: {data.get('message')}")
                return None
                
        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ HTTP Error creating recipient: {str(e)}")
            if hasattr(e, 'response') and e.response:
                try:
                    error_data = e.response.json()
                    logger.error(f"Error details: {error_data}")
                except:
                    logger.error(f"Response text: {e.response.text}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request Error creating recipient: {str(e)}")
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
            'reason': reason[:200],
            'reference': reference,
            'currency': 'KES',
        }
        
        logger.info(f"📤 Initiating transfer: {reference} - Amount: {amount} KES ({amount_in_kobo} kobo)")
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            
            logger.info(f"Transfer response status: {response.status_code}")
            logger.info(f"Transfer response body: {response.text}")
            
            if response.status_code == 401:
                logger.error("❌ Paystack authentication failed. Check your secret key.")
                return None
            
            if response.status_code == 422:
                logger.error(f"❌ Unprocessable entity: {response.text}")
                error_data = response.json()
                logger.error(f"Error details: {error_data}")
                return None
            
            response.raise_for_status()
            data = response.json()
            
            if data.get('status'):
                logger.info(f"✅ Transfer initiated: {data['data']['transfer_code']}")
                return data['data']
            else:
                logger.error(f"❌ Failed to initiate transfer: {data.get('message')}")
                return None
                
        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ HTTP Error initiating transfer: {str(e)}")
            if hasattr(e, 'response') and e.response:
                try:
                    error_data = e.response.json()
                    logger.error(f"Error details: {error_data}")
                except:
                    logger.error(f"Response text: {e.response.text}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request Error initiating transfer: {str(e)}")
            return None
    
    def verify_transfer(self, transfer_code):
        """Verify transfer status"""
        url = f'{self.BASE_URL}/transfer/{transfer_code}'
        
        try:
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 401:
                logger.error("❌ Paystack authentication failed. Check your secret key.")
                return None
            
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
            
            if response.status_code == 401:
                logger.error("❌ Paystack authentication failed. Check your secret key.")
                return None
            
            response.raise_for_status()
            data = response.json()
            
            if data.get('status'):
                return data['data']
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error getting balance: {str(e)}")
            return None