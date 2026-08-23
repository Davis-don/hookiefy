# paystack/services.py
# ============================================================
# Paystack Services - Handle Paystack API calls
# ============================================================

import requests
import hashlib
import hmac
import json
import logging
from decimal import Decimal
from django.conf import settings
from django.utils import timezone

from paymentconfigurations.models import PaymentConfiguration

logger = logging.getLogger(__name__)


class PaystackService:
    """Service class for Paystack API integration"""
    
    def __init__(self):
        # Try to get config from database first
        try:
            config = PaymentConfiguration.objects.get(gateway_name="paystack", is_active=True)
            self.secret_key = config.secret_key
            self.public_key = config.public_key
            self.callback_url = config.callback_url
            logger.info("✅ Using Paystack config from database")
        except PaymentConfiguration.DoesNotExist:
            # Fallback to settings
            self.secret_key = settings.PAYSTACK_SECRET_KEY
            self.public_key = settings.PAYSTACK_PUBLIC_KEY
            self.callback_url = settings.PAYSTACK_CALLBACK_URL
            logger.warning("⚠️ Using Paystack config from settings (fallback)")
        
        self.base_url = settings.PAYSTACK_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }
        
        if self.secret_key:
            logger.info("✅ PaystackService initialized with secret key")
        else:
            logger.warning("⚠️ PaystackService initialized WITHOUT secret key")
    
    def initialize_transaction(self, email: str, amount: Decimal, reference: str, 
                               callback_url: str = None, metadata: dict = None):
        """
        Initialize a Paystack transaction.
        
        Args:
            email: Customer email
            amount: Amount in KES (will be converted to smallest unit)
            reference: Unique transaction reference
            callback_url: URL to redirect after payment
            metadata: Additional metadata for the transaction
            
        Returns:
            dict: Response from Paystack
        """
        # Convert amount to smallest unit (KES * 100 for cents)
        amount_in_cents = int(amount * 100)
        
        payload = {
            "email": email,
            "amount": amount_in_cents,
            "reference": reference,
            "currency": "KES",
            "callback_url": callback_url or settings.PAYSTACK_CALLBACK_URL,
            "metadata": metadata or {},
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/transaction/initialize",
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Paystack transaction initialized: {reference}")
                return {
                    "success": True,
                    "data": result.get("data", {}),
                    "status": result.get("status"),
                    "message": result.get("message"),
                }
            else:
                logger.error(f"❌ Paystack initialization error: {response.text}")
                return {
                    "success": False,
                    "message": "Failed to initialize payment",
                    "status": "error",
                }
                
        except requests.RequestException as e:
            logger.error(f"❌ Paystack request error: {str(e)}")
            return {
                "success": False,
                "message": "Payment service unavailable",
                "status": "error",
            }
    
    def verify_transaction(self, reference: str):
        """
        Verify a Paystack transaction.
        
        Args:
            reference: Transaction reference
            
        Returns:
            dict: Transaction details from Paystack
        """
        try:
            response = requests.get(
                f"{self.base_url}/transaction/verify/{reference}",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Paystack transaction verified: {reference}")
                return {
                    "success": True,
                    "data": result.get("data", {}),
                    "status": result.get("status"),
                    "message": result.get("message"),
                }
            else:
                logger.error(f"❌ Paystack verification error: {response.text}")
                return {
                    "success": False,
                    "message": "Failed to verify transaction",
                    "status": "error",
                }
                
        except requests.RequestException as e:
            logger.error(f"❌ Paystack verification request error: {str(e)}")
            return {
                "success": False,
                "message": "Verification service unavailable",
                "status": "error",
            }
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify Paystack webhook signature.
        
        Args:
            payload: Raw request body
            signature: Paystack signature header
            
        Returns:
            bool: True if signature is valid
        """
        try:
            computed = hmac.new(
                self.secret_key.encode('utf-8'),
                payload,
                hashlib.sha512
            ).hexdigest()
            
            return hmac.compare_digest(computed, signature)
        except Exception as e:
            logger.error(f"❌ Webhook signature verification error: {str(e)}")
            return False
    
    def create_refund(self, reference: str, amount: Decimal = None):
        """
        Create a refund for a Paystack transaction.
        
        Args:
            reference: Transaction reference
            amount: Amount to refund (optional, full amount if not provided)
            
        Returns:
            dict: Refund response
        """
        payload = {
            "transaction": reference,
        }
        if amount:
            payload["amount"] = int(amount * 100)
        
        try:
            response = requests.post(
                f"{self.base_url}/refund",
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Paystack refund created: {reference}")
                return {
                    "success": True,
                    "data": result.get("data", {}),
                    "message": result.get("message"),
                }
            else:
                logger.error(f"❌ Paystack refund error: {response.text}")
                return {
                    "success": False,
                    "message": "Failed to create refund",
                }
                
        except requests.RequestException as e:
            logger.error(f"❌ Paystack refund request error: {str(e)}")
            return {
                "success": False,
                "message": "Refund service unavailable",
            }