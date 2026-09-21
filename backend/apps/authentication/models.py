import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class RegistrationSession(models.Model):
    """A temporary session created during registration (before a user exists)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    phone = models.CharField(max_length=20, db_index=True)
    email = models.EmailField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "auth_registration_session"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


class EmailCode(models.Model):
    """A hashed verification code sent to an email address."""

    class Purpose(models.TextChoices):
        REGISTER = "register", "Registration"
        CHANGE_PHONE = "change_phone", "Change phone"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="email_codes",
    )
    email = models.EmailField(max_length=255)
    phone = models.CharField(max_length=20, null=True, blank=True)
    new_phone = models.CharField(max_length=20, null=True, blank=True)
    code_hash = models.CharField(max_length=64)
    attempts = models.IntegerField(default=0)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "auth_email_code"
        indexes = [
            models.Index(fields=["purpose", "email", "created_at"]),
        ]

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_consumed(self):
        return self.consumed_at is not None

    @property
    def attempts_exhausted(self):
        return self.attempts >= getattr(settings, "EMAIL_CODE_MAX_ATTEMPTS", 5)
