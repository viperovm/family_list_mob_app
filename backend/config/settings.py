"""Django settings for the Lists app backend."""
import sys
from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["*"]),
    PHONE_LOGIN_ENABLED=(bool, True),
    REQUIRE_EMAIL_CODE_FOR_NEW_DEVICE=(bool, False),
    RU_PHONE_ONLY=(bool, True),
    EMAIL_CODE_TTL_SECONDS=(int, 600),
    EMAIL_CODE_LENGTH=(int, 6),
    EMAIL_CODE_MAX_ATTEMPTS=(int, 5),
    EMAIL_CODE_RESEND_COOLDOWN_SECONDS=(int, 60),
    PHONE_CHANGE_MAX_ATTEMPTS_PER_DAY=(int, 3),
    CELERY_TASK_ALWAYS_EAGER=(bool, False),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env("SECRET_KEY", default="dev-only-secret-key")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "common",
    "apps.users",
    "apps.authentication",
    "apps.groups",
    "apps.lists",
    "apps.notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

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

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
}

AUTH_USER_MODEL = "users.User"

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
    ),
    "EXCEPTION_HANDLER": "common.exceptions.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    # Долгоживущий refresh-токен: пользователь остаётся «авторизован навсегда».
    # Достаточно одного входа при регистрации/логине — refresh живёт 10 лет и
    # автоматически ротируется приложением, поэтому повторная авторизация
    # не требуется даже после долгого простоя.
    "REFRESH_TOKEN_LIFETIME": timedelta(days=3650),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in env("CORS_ALLOWED_ORIGINS", default="").split(",")
    if origin.strip()
]

SPECTACULAR_SETTINGS = {
    "TITLE": "Family Shopping Lists API",
    "DESCRIPTION": "Backend API for family shopping lists.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://localhost:6379/1")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_BEAT_SCHEDULE = {
    "cleanup-expired-email-codes": {
        "task": "apps.authentication.tasks.cleanup_expired_email_codes",
        "schedule": 600.0,
    },
    "cleanup-expired-registration-sessions": {
        "task": "apps.authentication.tasks.cleanup_expired_registration_sessions",
        "schedule": 600.0,
    },
    "cleanup-expired-refresh-tokens": {
        "task": "apps.authentication.tasks.cleanup_expired_refresh_tokens",
        "schedule": 600.0,
    },
}

if "test" in sys.argv:
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
else:
    CELERY_TASK_ALWAYS_EAGER = env("CELERY_TASK_ALWAYS_EAGER")
    CELERY_TASK_EAGER_PROPAGATES = CELERY_TASK_ALWAYS_EAGER

EMAIL_BACKEND_URL = env("EMAIL_BACKEND_URL", default="console")
if EMAIL_BACKEND_URL == "console":
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    email_config = env.email_url("EMAIL_BACKEND_URL", default="console://")
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = email_config.get("EMAIL_HOST", "")
    EMAIL_PORT = email_config.get("EMAIL_PORT", 587)
    EMAIL_HOST_USER = email_config.get("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = email_config.get("EMAIL_HOST_PASSWORD", "")
    # `?ssl=true` → SMTP_SSL (порт 465, например Mail.ru); `?tls=true` → STARTTLS (порт 587).
    # django-environ кладёт эти флаги в OPTIONS (с ключами в верхнем регистре), а не в
    # EMAIL_USE_SSL/TLS, поэтому преобразуем их явно.
    _email_options = {str(k).upper(): str(v).lower() for k, v in email_config.get("OPTIONS", {}).items()}
    EMAIL_USE_SSL = bool(email_config.get("EMAIL_USE_SSL", False)) or _email_options.get("SSL") in {"1", "true", "yes"}
    EMAIL_USE_TLS = bool(email_config.get("EMAIL_USE_TLS", False)) or _email_options.get("TLS") in {"1", "true", "yes"}

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Lists App <no-reply@lists.app>")

# Push-уведомления через Expo Push API. Пустой токен = dev-режим (доставка логируется).
EXPO_ACCESS_TOKEN = env("EXPO_ACCESS_TOKEN", default="")
EXPO_PUSH_URL = env("EXPO_PUSH_URL", default="https://exp.host/--/api/v2/push/send")

PHONE_LOGIN_ENABLED = env("PHONE_LOGIN_ENABLED")
REQUIRE_EMAIL_CODE_FOR_NEW_DEVICE = env("REQUIRE_EMAIL_CODE_FOR_NEW_DEVICE")
RU_PHONE_ONLY = env("RU_PHONE_ONLY")

EMAIL_CODE_TTL_SECONDS = env("EMAIL_CODE_TTL_SECONDS")
EMAIL_CODE_LENGTH = env("EMAIL_CODE_LENGTH")
EMAIL_CODE_MAX_ATTEMPTS = env("EMAIL_CODE_MAX_ATTEMPTS")
EMAIL_CODE_RESEND_COOLDOWN_SECONDS = env("EMAIL_CODE_RESEND_COOLDOWN_SECONDS")
PHONE_CHANGE_MAX_ATTEMPTS_PER_DAY = env("PHONE_CHANGE_MAX_ATTEMPTS_PER_DAY")

REGISTRATION_SESSION_TTL_SECONDS = 900


