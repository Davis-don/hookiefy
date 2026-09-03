# withdrawals/services.py - Updated with better phone number formatting
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
        # Patterns: 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX
        if phone.startswith('0'):
            # 07XXXXXXXX or 01XXXXXXXX -> 2547XXXXXXXX or 2541XXXXXXXX
            phone = '254' + phone[1:]
        elif not phone.startswith('254') and len(phone) == 10:
            # If it's 10 digits and doesn't start with 254, it might be missing leading 0
            # Example: 712345678 -> 254712345678
            if phone.startswith('7') or phone.startswith('1'):
                phone = '254' + phone
        elif not phone.startswith('254') and len(phone) == 9:
            # If it's 9 digits, add 2547 or 2541
            # Example: 12345678 -> 254712345678? This is ambiguous, better to fail
            logger.warning(f"⚠️ Ambiguous phone number format: {phone_number}")
            return None
        
        # Final validation: should start with 254 and be 12 digits total
        if not phone.startswith('254') or len(phone) != 12:
            logger.warning(f"⚠️ Invalid phone number format after formatting: {phone}")
            return None
        
        # Ensure it only contains digits
        if not phone.isdigit():
            logger.warning(f"⚠️ Phone number contains non-digit characters: {phone}")
            return None
        
        logger.info(f"✅ Formatted phone number: {phone}")
        return phone
    
    def create_recipient(self, name, phone_number):
        """Create a transfer recipient for M-Pesa"""
        url = f'{self.BASE_URL}/transferrecipient'
        
        # Format phone number
        formatted_phone = self.format_phone_number(phone_number)
        
        if not formatted_phone:
            logger.error(f"❌ Failed to format phone number: {phone_number}")
            return None
        
        payload = {
            'type': 'mobile_money',
            'name': name[:100],  # Ensure it's not too long
            'phone_number': formatted_phone,
            'currency': 'KES',
            'metadata': {
                'provider': 'MPESA'
            }
        }
        
        logger.info(f"📤 Creating recipient for: {formatted_phone}")
        logger.info(f"📤 Payload: {payload}")
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            
            # Log response status for debugging
            logger.info(f"Response status: {response.status_code}")
            
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
                logger.info(f"✅ Created recipient: {data['data']['recipient_code']}")
                return data['data']['recipient_code']
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
        
        logger.info(f"📤 Initiating transfer: {reference} - Amount: {amount} KES ({amount_in_kobo} kobo)")
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            
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
            logger.error(f"❌ Error initiating transfer: {str(e)}")
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