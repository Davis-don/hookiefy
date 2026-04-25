from pathlib import Path
from datetime import timedelta
from decouple import config
import os

# -------------------------------
# Base directory
# -------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# -------------------------------
# Security - PRODUCTION
# -------------------------------
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1"
).split(",")

# -------------------------------
# Security Headers - PRODUCTION
# -------------------------------
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# -------------------------------
# Installed apps
# -------------------------------
INSTALLED_APPS = [
    "corsheaders",
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'accounts',
    'superconfig',
    'clientbio',
    'profiles',
    'notifications',
    'hookup',
    'adminconfig',
    'payments',
]

# -------------------------------
# Middleware - PRODUCTION
# -------------------------------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'hookify.middleware.ContentSecurityPolicyMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'hookify.urls'

# -------------------------------
# Templates
# -------------------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'hookify.wsgi.application'

# -------------------------------
# Database - PRODUCTION
# -------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT'),
        'OPTIONS': {
            'sslmode': config('DB_SSLMODE', default='require'),
        },
    }
}

# -------------------------------
# Password validation
# -------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# -------------------------------
# Internationalization
# -------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# -------------------------------
# Static and Media Files
# -------------------------------
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# -------------------------------
# Custom User Model
# -------------------------------
AUTH_USER_MODEL = 'accounts.User'

# -------------------------------
# JWT Settings
# -------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": config("SECRET_KEY"),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# -------------------------------
# CORS - PRODUCTION
# -------------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="https://yourdomain.com"
).split(",")

CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']
CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']

# -------------------------------
# REST Framework
# -------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
}

# -------------------------------
# Cookie Settings - PRODUCTION
# -------------------------------
ACCESS_TOKEN_COOKIE_NAME = 'access_token'
REFRESH_TOKEN_COOKIE_NAME = 'refresh_token'

ACCESS_TOKEN_COOKIE_MAX_AGE = 60 * 60 * 12
REFRESH_TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

COOKIE_SECURE = config("COOKIE_SECURE", default=True, cast=bool)
COOKIE_HTTPONLY = True
COOKIE_SAMESITE = 'Lax'
COOKIE_PATH = '/'

# -------------------------------
# Cloudinary
# -------------------------------
CLOUDINARY_CLOUD_NAME = config("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = config("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = config("CLOUDINARY_API_SECRET")

# -------------------------------
# PESAPAL PRODUCTION CONFIG
# -------------------------------
PESAPAL_BASE_URL = config("PESAPAL_BASE_URL")
PESAPAL_CONSUMER_KEY = config("PESAPAL_CONSUMER_KEY")
PESAPAL_CONSUMER_SECRET = config("PESAPAL_CONSUMER_SECRET")
PESAPAL_CALLBACK_URL = config("PESAPAL_CALLBACK_URL")

# -------------------------------
# CONTENT SECURITY POLICY (CSP) - PRODUCTION
# -------------------------------
CSP_POLICY = (
    "default-src 'self'; "
    "font-src 'self' https://fonts.gstatic.com data:; "
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.pesapal.com https://*.googleapis.com; "
    "frame-src 'self' https://*.pesapal.com https://pay.pesapal.com; "
    "connect-src 'self' https:; "
    "img-src 'self' data: https:; "
    "form-action 'self' https://*.pesapal.com; "
)

# -------------------------------
# LOGGING - PRODUCTION (FIXED)
# -------------------------------
# Create logs directory safely
LOGS_DIR = BASE_DIR / 'logs'
try:
    os.makedirs(LOGS_DIR, exist_ok=True)
except OSError:
    # If can't create directory, use console only
    LOGS_DIR = None

# Configure logging based on whether we can write files
if LOGS_DIR and os.access(LOGS_DIR, os.W_OK):
    # Can write to file system
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': 'INFO',
                'formatter': 'verbose',
            },
            'payment_file': {
                'class': 'logging.FileHandler',
                'filename': str(LOGS_DIR / 'payments.log'),
                'level': 'DEBUG',
                'formatter': 'verbose',
            },
        },
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {message}',
                'style': '{',
            },
        },
        'loggers': {
            'payments': {
                'handlers': ['payment_file', 'console'],
                'level': 'DEBUG',
                'propagate': False,
            },
        },
    }
else:
    # Fall back to console-only logging
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': 'INFO',
            },
        },
        'loggers': {
            'payments': {
                'handlers': ['console'],
                'level': 'DEBUG',
                'propagate': False,
            },
        },
    }



# Add this to your settings.py after the PESAPAL config section
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173")