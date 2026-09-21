"""Phone utilities: normalization, validation and masking."""
from __future__ import annotations

import phonenumbers
from phonenumbers import PhoneNumberFormat

#: ISO codes of the only allowed countries when RU_PHONE_ONLY is enabled.
ALLOWED_COUNTRY_CODES = {"RU"}


def normalize_phone(value: str, region: str = "RU") -> str | None:
    """Normalize a free-form phone number to E.164, or return None if invalid."""
    if not value:
        return None
    try:
        parsed = phonenumbers.parse(value, region)
    except phonenumbers.NumberParseException:
        return None
    if not phonenumbers.is_valid_number(parsed):
        return None
    return phonenumbers.format_number(parsed, PhoneNumberFormat.E164)


def is_allowed_phone(phone: str, ru_only: bool = True) -> bool:
    """Return True when the phone belongs to an allowed country."""
    try:
        parsed = phonenumbers.parse(phone, None)
    except phonenumbers.NumberParseException:
        return False
    if not phonenumbers.is_valid_number(parsed):
        return False
    if not ru_only:
        return True
    region = phonenumbers.region_code_for_number(parsed)
    return region in ALLOWED_COUNTRY_CODES


def mask_phone(phone: str) -> str:
    """Mask the middle of an E.164 phone number, e.g. +7 *** *** 12 34."""
    if not phone:
        return ""
    digits = phone
    if len(digits) <= 5:
        return digits
    return f"{digits[:3]} ••• {digits[-4:]}"


def mask_email(email: str) -> str:
    """Mask an email address: u***r@example.com."""
    if not email or "@" not in email:
        return email or ""
    local, _, domain = email.partition("@")
    if len(local) <= 1:
        masked = local
    elif len(local) == 2:
        masked = local[0] + "*"
    else:
        masked = local[0] + "***" + local[-1]
    return f"{masked}@{domain}"
