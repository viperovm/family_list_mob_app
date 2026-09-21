"""Small shared helpers: codes, tokens, hashing."""
from __future__ import annotations

import hashlib
import secrets

from django.conf import settings


def generate_numeric_code(length: int | None = None) -> str:
    """Generate a numeric verification code."""
    length = length or getattr(settings, "EMAIL_CODE_LENGTH", 6)
    return "".join(secrets.choice("0123456789") for _ in range(length))


def generate_token() -> str:
    """Generate a URL-safe opaque token (registration sessions)."""
    return secrets.token_urlsafe(32)


def hash_value(value: str) -> str:
    """SHA-256 hex digest used to store codes/tokens instead of raw values."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
