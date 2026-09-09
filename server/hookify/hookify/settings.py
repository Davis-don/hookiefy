
"""
Django settings for hookify project.
"""

from pathlib import Path
from datetime import timedelta
import os

from decouple import config
import dj_database_url


BASE_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# CORE SECURITY SETTINGS
# ============================================================

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-!mq$h7%9*#$=q8kr6$#+n5u&m5h&@0#tk++3keh%s+l12l6ac_",
)

DEBUG = os.environ.get("DEBUG", "True") == "True"


# ============================================================
# DOMAIN CONFIGURATION
# ============================================================

# React frontend
FRONTEND_URL = os.environ.get(
    "FRONTEND_URL",
    "https://youpata.kinstryx.co.ke",
).rstrip("/")


# Django API / backend
API_BASE_URL = os.environ.get(
    "API_BASE_URL",
    "https://hookiefy-server-7d6d.onrender.com",  
).rstrip("/")


# ============================================================
# ALLOWED HOSTS
# ============================================================

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        "ALLOWED_HOSTS",
        "localhost,"
        "127.0.0.1,"
        "hookiefy-server-7d6d.onrender.com,"
        "api.hookiefy.kinstryx.co.ke",
    ).split(",")
    if host.strip()
]


# ============================================================
# CSRF TRUSTED ORIGINS
# ============================================================

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CSRF_TRUSTED_ORIGINS",
        "https://youpata.kinstryx.co.ke,"
        "https://api.hookiefy.kinstryx.co.ke,"
        "https://hookiefy-server-7d6d.onrender.com",
    ).split(",")
    if origin.strip()
]


# ============================================================
# APPLICATIONS
# ============================================================

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
    "commisions",
    "paystack",
    "system_config",
    "withdrawals",
    "adverts",

    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
]


# ============================================================
# MIDDLEWARE
# ============================================================

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


# ============================================================
# URL CONFIGURATION
# ============================================================

ROOT_URLCONF = "hookify.urls"


# ============================================================
# TEMPLATES
# ============================================================

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


# ============================================================
# WSGI
# ============================================================

WSGI_APPLICATION = "hookify.wsgi.application"


# ============================================================
# DATABASE
# ============================================================

DATABASES = {
    "default": dj_database_url.config(
        default=config("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=True,
    )
}


# ============================================================
# AUTH USER MODEL
# ============================================================

AUTH_USER_MODEL = "account.Accounts"


# ============================================================
# DJANGO REST FRAMEWORK
# ============================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}


# ============================================================
# JWT CONFIGURATION
# ============================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),

    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),

    "ROTATE_REFRESH_TOKENS": True,

    "BLACKLIST_AFTER_ROTATION": True,
}


# ============================================================
# CORS CONFIGURATION
# ============================================================

default_origins = [
    # Local development
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    # Frontend
    FRONTEND_URL,

    # Backend
    API_BASE_URL,

    # Render backend
    "https://hookiefy-server-7d6d.onrender.com",
]


cors_env = os.environ.get(
    "CORS_ALLOWED_ORIGINS",
    "",
)


if cors_env:

    cors_origins = [
        origin.strip()
        for origin in cors_env.split(",")
        if origin.strip()
    ]

else:

    cors_origins = default_origins.copy()


# ============================================================
# ENSURE REQUIRED CORS ORIGINS
# ============================================================

required_cors_origins = [
    FRONTEND_URL,
    API_BASE_URL,
]


for origin in required_cors_origins:

    if origin not in cors_origins:
        cors_origins.append(origin)


CORS_ALLOWED_ORIGINS = cors_origins


# ============================================================
# CORS DEVELOPMENT MODE
# ============================================================

if DEBUG:

    CORS_ALLOW_ALL_ORIGINS = True

else:

    CORS_ALLOW_ALL_ORIGINS = False


CORS_ALLOW_CREDENTIALS = True


CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]


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
    "x-custom-header",
]


CORS_PREFLIGHT_MAX_AGE = 86400


# ============================================================
# CSRF CONFIGURATION
# ============================================================

csrf_env = os.environ.get(
    "CSRF_TRUSTED_ORIGINS",
    "",
)


if csrf_env:

    csrf_origins = [
        origin.strip()
        for origin in csrf_env.split(",")
        if origin.strip()
    ]

else:

    csrf_origins = [
        FRONTEND_URL,
        API_BASE_URL,
        "https://hookiefy-server-7d6d.onrender.com",
    ]


# Ensure frontend is trusted
if FRONTEND_URL not in csrf_origins:

    csrf_origins.append(FRONTEND_URL)


# Ensure backend is trusted
if API_BASE_URL not in csrf_origins:

    csrf_origins.append(API_BASE_URL)


CSRF_TRUSTED_ORIGINS = csrf_origins


# ============================================================
# SESSION AND CSRF COOKIE SETTINGS
# ============================================================

SESSION_COOKIE_SECURE = (
    os.environ.get(
        "SESSION_COOKIE_SECURE",
        "False",
    ) == "True"
)


CSRF_COOKIE_SECURE = (
    os.environ.get(
        "CSRF_COOKIE_SECURE",
        "False",
    ) == "True"
)


SESSION_COOKIE_HTTPONLY = True

CSRF_COOKIE_HTTPONLY = True

SESSION_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_SAMESITE = "Lax"


# ============================================================
# INTERNATIONALIZATION
# ============================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# ============================================================
# STATIC FILES
# ============================================================

STATIC_URL = "static/"


# ============================================================
# PRODUCTION SECURITY SETTINGS
# ============================================================

if not DEBUG:

    SECURE_SSL_REDIRECT = True

    SECURE_PROXY_SSL_HEADER = (
        "HTTP_X_FORWARDED_PROTO",
        "https",
    )

    SECURE_HSTS_SECONDS = 31536000

    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

    SECURE_HSTS_PRELOAD = True


# ============================================================
# PESAPAL CONFIGURATION
# ============================================================

PESAPAL_CONSUMER_KEY = config(
    "PESAPAL_CONSUMER_KEY",
)


PESAPAL_CONSUMER_SECRET = config(
    "PESAPAL_CONSUMER_SECRET",
)


# ============================================================
# PESAPAL BASE URL
# ============================================================

PESAPAL_BASE_URL = config(
    "PESAPAL_BASE_URL",
    default="https://cybqa.pesapal.com/pesapalv3",
)


# ============================================================
# PESAPAL CALLBACK URL
# ============================================================
#
# Pesapal redirects the customer to Django.
#
# Django:
#   1. Receives OrderTrackingId
#   2. Receives OrderMerchantReference
#   3. Verifies the transaction
#   4. Updates the Payment
#   5. Updates the Connection
#   6. Handles commissions/balances
#   7. Redirects the browser to Youpata
#
# ============================================================

PESAPAL_CALLBACK_URL = os.environ.get(
    "PESAPAL_CALLBACK_URL",
    f"{API_BASE_URL}/payments/payment-success/",
)


# ============================================================
# PESAPAL CANCELLATION URL
# ============================================================

PESAPAL_CANCELLATION_URL = os.environ.get(
    "PESAPAL_CANCELLATION_URL",
    f"{API_BASE_URL}/payments/payment-failure/",
)


# ============================================================
# PESAPAL IPN URL
# ============================================================
#
# IPN is server-to-server.
#
# It MUST point to Django.
#
# ============================================================

PESAPAL_IPN_URL = os.environ.get(
    "PESAPAL_IPN_URL",
    f"{API_BASE_URL}/payments/ipn/",
)


# ============================================================
# PAYSTACK CONFIGURATION
# ============================================================

PAYSTACK_SECRET_KEY = os.environ.get(
    "PAYSTACK_SECRET_KEY",
    "",
)


PAYSTACK_PUBLIC_KEY = os.environ.get(
    "PAYSTACK_PUBLIC_KEY",
    "",
)


# ============================================================
# PAYSTACK BASE URL
# ============================================================

PAYSTACK_BASE_URL = os.environ.get(
    "PAYSTACK_BASE_URL",
    "https://api.paystack.co",
)


# ============================================================
# PAYSTACK CALLBACK URL
# ============================================================

PAYSTACK_CALLBACK_URL = os.environ.get(
    "PAYSTACK_CALLBACK_URL",
    f"{API_BASE_URL}/paystack/success/",
)


# ============================================================
# PAYSTACK FAILURE URL
# ============================================================

PAYSTACK_FAILURE_URL = os.environ.get(
    "PAYSTACK_FAILURE_URL",
    f"{API_BASE_URL}/paystack/failure/",
)


# ============================================================
# LOGGING CONFIGURATION
# ============================================================

LOGGING = {
    "version": 1,

    "disable_existing_loggers": False,

    "formatters": {
        "verbose": {
            "format": (
                "{levelname} {asctime} "
                "{module} {process:d} "
                "{thread:d} {message}"
            ),
            "style": "{",
        },

        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },

    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },

        "file": {
            "class": "logging.FileHandler",
            "filename": "payments.log",
            "formatter": "verbose",
        },
    },

    "loggers": {
        "payments": {
            "handlers": [
                "console",
                "file",
            ],
            "level": (
                "DEBUG"
                if DEBUG
                else "INFO"
            ),
            "propagate": True,
        },

        "paystack": {
            "handlers": [
                "console",
                "file",
            ],
            "level": (
                "DEBUG"
                if DEBUG
                else "INFO"
            ),
            "propagate": True,
        },

        "django.request": {
            "handlers": [
                "console",
            ],
            "level": (
                "DEBUG"
                if DEBUG
                else "ERROR"
            ),
            "propagate": True,
        },

        "django.security.csrf": {
            "handlers": [
                "console",
            ],
            "level": (
                "DEBUG"
                if DEBUG
                else "INFO"
            ),
            "propagate": True,
        },
    },
}


# ============================================================
# DEBUG CONFIGURATION LOG
# ============================================================

if DEBUG:

    print("\n" + "=" * 70)

    print("🚀 DJANGO CONFIGURATION LOG")

    print("=" * 70)

    print("\n🔒 SECURITY SETTINGS:")

    print(f"  DEBUG: {DEBUG}")

    print(
        f"  ALLOWED_HOSTS: "
        f"{ALLOWED_HOSTS}"
    )

    print(
        f"  CSRF_TRUSTED_ORIGINS: "
        f"{CSRF_TRUSTED_ORIGINS}"
    )


    print("\n🌐 DOMAIN SETTINGS:")

    print(
        f"  FRONTEND_URL: "
        f"{FRONTEND_URL}"
    )

    print(
        f"  API_BASE_URL: "
        f"{API_BASE_URL}"
    )


    print("\n🌐 CORS SETTINGS:")

    print(
        f"  CORS_ALLOW_ALL_ORIGINS: "
        f"{CORS_ALLOW_ALL_ORIGINS}"
    )

    print(
        f"  CORS_ALLOWED_ORIGINS: "
        f"{CORS_ALLOWED_ORIGINS}"
    )

    print(
        f"  CORS_ALLOW_CREDENTIALS: "
        f"{CORS_ALLOW_CREDENTIALS}"
    )

    print(
        f"  CORS_ALLOW_METHODS: "
        f"{CORS_ALLOW_METHODS}"
    )

    print(
        f"  CORS_ALLOW_HEADERS: "
        f"{CORS_ALLOW_HEADERS}"
    )


    print("\n💳 PESAPAL CONFIGURATION:")

    print(
        f"  Consumer Key: "
        f"{'✅ Set' if PESAPAL_CONSUMER_KEY else '❌ NOT SET'}"
    )

    print(
        f"  Consumer Secret: "
        f"{'✅ Set' if PESAPAL_CONSUMER_SECRET else '❌ NOT SET'}"
    )

    print(
        f"  Base URL: "
        f"{PESAPAL_BASE_URL}"
    )

    print(
        f"  API Base URL: "
        f"{API_BASE_URL}"
    )

    print(
        f"  Callback URL: "
        f"{PESAPAL_CALLBACK_URL}"
    )

    print(
        f"  Cancellation URL: "
        f"{PESAPAL_CANCELLATION_URL}"
    )

    print(
        f"  IPN URL: "
        f"{PESAPAL_IPN_URL}"
    )


    print("\n💳 PAYSTACK CONFIGURATION:")

    print(
        f"  Secret Key: "
        f"{'✅ Set' if PAYSTACK_SECRET_KEY else '❌ NOT SET'}"
    )

    print(
        f"  Public Key: "
        f"{'✅ Set' if PAYSTACK_PUBLIC_KEY else '❌ NOT SET'}"
    )

    print(
        f"  Base URL: "
        f"{PAYSTACK_BASE_URL}"
    )

    print(
        f"  Callback URL: "
        f"{PAYSTACK_CALLBACK_URL}"
    )

    print(
        f"  Failure URL: "
        f"{PAYSTACK_FAILURE_URL}"
    )


    print("\n🗄️ DATABASE:")

    print(
        f"  DATABASE_URL: "
        f"{'✅ Configured' if config('DATABASE_URL', default='') else '❌ NOT SET'}"
    )

    print("=" * 70 + "\n")

