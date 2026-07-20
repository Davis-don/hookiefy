"""
Django settings for hookify project.
"""


from pathlib import Path
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent
from decouple import config
import dj_database_url

# ---------------------------------------------------
# CORE SECURITY SETTINGS
# ---------------------------------------------------

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-!mq$h7%9*#$=q8kr6$#+n5u&m5h&@0#tk++3keh%s+l12l6ac_",
)

DEBUG = os.environ.get("DEBUG", "True") == "True"

ALLOWED_HOSTS = os.environ.get(
    "ALLOWED_HOSTS",
    "localhost,127.0.0.1,hookiefy-server.onrender.com",
).split(",")

CSRF_TRUSTED_ORIGINS = os.environ.get(
    "CSRF_TRUSTED_ORIGINS",
    "https://hookiefy-server.onrender.com",
).split(",")

# ---------------------------------------------------
# APPLICATIONS
# ---------------------------------------------------

INSTALLED_APPS = [
    "corsheaders",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "account",
    "assignments",
    "userprofile",
    "userpreference",
    "feed",
    "connections",
    "notification",
    "administration",
    "payments",
    "paymentconfigurations",
    "UserBalance",
    "stats",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
]

# ---------------------------------------------------
# MIDDLEWARE (ORDER IS IMPORTANT)
# ---------------------------------------------------

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "hookify.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "hookify.wsgi.application"

# ---------------------------------------------------
# DATABASE
# ---------------------------------------------------

# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": os.environ.get("DB_NAME", "hookifydb"),
#         "USER": os.environ.get("DB_USER", "hooker"),
#         "PASSWORD": os.environ.get("DB_PASSWORD", "0000000000"),
#         "HOST": os.environ.get("DB_HOST", "localhost"),
#         "PORT": os.environ.get("DB_PORT", "5432"),
#     }
# }
DATABASES = {
    "default": dj_database_url.config(
        default=config("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=True,
    )
}

# ---------------------------------------------------
# AUTH USER MODEL
# ---------------------------------------------------

AUTH_USER_MODEL = "account.Accounts"

# ---------------------------------------------------
# DRF + JWT AUTH
# ---------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# ---------------------------------------------------
# CORS
# ---------------------------------------------------

CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# ---------------------------------------------------
# INTERNATIONALIZATION
# ---------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------
# STATIC FILES
# ---------------------------------------------------

STATIC_URL = "static/"

# ---------------------------------------------------
# PRODUCTION SETTINGS
# ---------------------------------------------------

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# ============================================================
# PESAPAL CONFIGURATION
# ============================================================

# Required PesaPal credentials
PESAPAL_CONSUMER_KEY = config("PESAPAL_CONSUMER_KEY")
PESAPAL_CONSUMER_SECRET = config("PESAPAL_CONSUMER_SECRET")

# PesaPal Base URL - Sandbox or Production
# Sandbox: https://cybqa.pesapal.com/pesapalv3
# Production: https://pay.pesapal.com/v3
PESAPAL_BASE_URL = config("PESAPAL_BASE_URL", default="https://cybqa.pesapal.com/pesapalv3")

# ============================================================
# PESAPAL CALLBACK URLs - Updated with /payments/ prefix
# ============================================================

# Base domain for your server
BASE_DOMAIN = os.environ.get(
    "BASE_DOMAIN",
    "https://hookiefy-server.onrender.com"
)

# Callback URLs - Note the /payments/ prefix to match your URL structure
PESAPAL_CALLBACK_URL = os.environ.get(
    "PESAPAL_CALLBACK_URL",
    f"{BASE_DOMAIN}/payments/payment-success/"
)

PESAPAL_CANCELLATION_URL = os.environ.get(
    "PESAPAL_CANCELLATION_URL",
    f"{BASE_DOMAIN}/payments/payment-failure/"
)

# IPN URL - Where PesaPal sends server-to-server notifications
PESAPAL_IPN_URL = os.environ.get(
    "PESAPAL_IPN_URL",
    f"{BASE_DOMAIN}/payments/ipn/"
)

# ============================================================
# LOGGING CONFIGURATION (for debugging PesaPal)
# ============================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'pesapal.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'payments': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'ERROR',
            'propagate': True,
        },
    },
}

# ============================================================
# DEBUG LOGGING FOR PESAPAL (only in development)
# ============================================================

if DEBUG:
    print("=" * 60)
    print("PESAPAL CONFIGURATION")
    print(f"Consumer Key: {'Set' if PESAPAL_CONSUMER_KEY else 'NOT SET'}")
    print(f"Consumer Secret: {'Set' if PESAPAL_CONSUMER_SECRET else 'NOT SET'}")
    print(f"Base URL: {PESAPAL_BASE_URL}")
    print(f"BASE_DOMAIN: {BASE_DOMAIN}")
    print(f"Callback URL: {PESAPAL_CALLBACK_URL}")
    print(f"Cancellation URL: {PESAPAL_CANCELLATION_URL}")
    print(f"IPN URL: {PESAPAL_IPN_URL}")
    print("=" * 60)