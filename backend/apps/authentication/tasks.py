"""Celery tasks for the authentication app."""
from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)

# Подписи и темы писем для разных сценариев подтверждения по email.
EMAIL_TEMPLATES = {
    "register": {
        "subject": "Подтверждение почты — Семейные списки",
        "html": "authentication/email/registration_code.html",
        "plain": "authentication/email/registration_code.txt",
    },
    "change_phone": {
        "subject": "Подтверждение смены номера — Семейные списки",
        "html": "authentication/email/change_phone_code.html",
        "plain": "authentication/email/change_phone_code.txt",
    },
}


@shared_task(name="apps.authentication.tasks.send_email_code")
def send_email_code(email: str, code: str, purpose: str) -> None:
    """Send a beautiful HTML verification-code email with a plain-text fallback.

    In development the backend uses the console email backend, so the code is
    printed to the logs. In production wire EMAIL_BACKEND_URL to a real SMTP
    (e.g. Mail.ru).
    """
    template = EMAIL_TEMPLATES.get(purpose)
    if template is None:
        logger.warning("Unknown email purpose %s, skipping email to %s", purpose, email)
        return

    ttl_minutes = settings.EMAIL_CODE_TTL_SECONDS // 60
    context = {
        "code": code,
        "digit_count": len(code),
        "ttl_minutes": ttl_minutes,
        "app_name": "Семейные списки",
        "support_email": settings.DEFAULT_FROM_EMAIL,
    }

    subject = template["subject"]
    html_message = render_to_string(template["html"], context)
    plain_message = render_to_string(template["plain"], context)

    message = EmailMultiAlternatives(
        subject=subject,
        body=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    message.attach_alternative(html_message, "text/html")
    message.send(fail_silently=False)
    logger.info("Sent %s email code to %s", purpose, email)


@shared_task(name="apps.authentication.tasks.cleanup_expired_email_codes")
def cleanup_expired_email_codes() -> int:
    from .models import EmailCode

    deleted, _ = EmailCode.objects.filter(expires_at__lt=timezone.now()).delete()
    return deleted


@shared_task(name="apps.authentication.tasks.cleanup_expired_registration_sessions")
def cleanup_expired_registration_sessions() -> int:
    from .models import RegistrationSession

    deleted, _ = RegistrationSession.objects.filter(expires_at__lt=timezone.now()).delete()
    return deleted


@shared_task(name="apps.authentication.tasks.cleanup_expired_refresh_tokens")
def cleanup_expired_refresh_tokens() -> int:
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

    deleted, _ = OutstandingToken.objects.filter(expires_at__lt=timezone.now()).delete()
    return deleted
