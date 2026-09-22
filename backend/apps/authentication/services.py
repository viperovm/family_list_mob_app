"""Authentication business logic: registration, login, phone change."""
from __future__ import annotations

import hmac
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from common.exceptions import APIError
from common.phone import is_allowed_phone, mask_email, normalize_phone
from common.utils import generate_numeric_code, generate_token, hash_value

from .models import EmailCode, RegistrationSession
from .tasks import send_email_code

User = get_user_model()


def _validate_phone(phone: str) -> str:
    normalized = normalize_phone(phone)
    if not normalized:
        raise APIError("PHONE_INVALID", "Введите корректный номер телефона.")
    if not is_allowed_phone(normalized, ru_only=settings.RU_PHONE_ONLY):
        raise APIError("PHONE_INVALID", "Доступны только российские номера.")
    return normalized


def tokens_for_user(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def _get_session(token: str) -> RegistrationSession:
    try:
        return RegistrationSession.objects.get(token_hash=hash_value(token))
    except RegistrationSession.DoesNotExist:
        raise APIError("CODE_INVALID", "Регистрационная сессия недействительна.", status_code=400)


def _constant_time_equal(a: str, b: str) -> bool:
    return hmac.compare_digest(a, b)


def _consume_code(email_code: EmailCode, code: str) -> None:
    if email_code.is_consumed:
        raise APIError("CODE_INVALID", "Код уже использован.")
    if email_code.is_expired:
        raise APIError("CODE_EXPIRED", "Срок действия кода истёк.")
    if email_code.attempts_exhausted:
        raise APIError("CODE_TOO_MANY_ATTEMPTS", "Превышено число попыток. Запросите новый код.")

    if not _constant_time_equal(email_code.code_hash, hash_value(code)):
        email_code.attempts += 1
        email_code.save(update_fields=["attempts"])
        raise APIError("CODE_INVALID", "Неверный код.")

    email_code.consumed_at = timezone.now()
    email_code.save(update_fields=["consumed_at"])


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
def start_registration(phone: str) -> dict:
    normalized = _validate_phone(phone)

    if User.objects.filter(phone=normalized).exists():
        return {"exists": True, "phone": normalized, "login_required": True}

    token = generate_token()
    RegistrationSession.objects.create(
        token_hash=hash_value(token),
        phone=normalized,
        expires_at=timezone.now() + timedelta(seconds=settings.REGISTRATION_SESSION_TTL_SECONDS),
    )
    return {"registration_token": token, "phone": normalized, "exists": False}


def send_registration_email(registration_token: str, email: str) -> dict:
    session = _get_session(registration_token)
    if session.is_expired or session.completed_at:
        raise APIError("CODE_EXPIRED", "Регистрационная сессия истекла.", status_code=400)

    normalized_email = (email or "").strip().lower()
    if not normalized_email or "@" not in normalized_email:
        raise APIError("EMAIL_INVALID", "Введите корректный email.")
    if User.objects.filter(email=normalized_email).exists():
        raise APIError("EMAIL_INVALID", "Этот email уже используется.")

    cooldown = timezone.now() - timedelta(seconds=settings.EMAIL_CODE_RESEND_COOLDOWN_SECONDS)
    if EmailCode.objects.filter(
        purpose=EmailCode.Purpose.REGISTER,
        email=normalized_email,
        phone=session.phone,
        created_at__gt=cooldown,
    ).exists():
        raise APIError("RATE_LIMITED", "Код уже отправлен. Попробуйте через минуту.", status_code=429)

    code = generate_numeric_code()
    EmailCode.objects.create(
        purpose=EmailCode.Purpose.REGISTER,
        email=normalized_email,
        phone=session.phone,
        code_hash=hash_value(code),
        expires_at=timezone.now() + timedelta(seconds=settings.EMAIL_CODE_TTL_SECONDS),
    )
    session.email = normalized_email
    session.save(update_fields=["email"])

    send_email_code.delay(email=normalized_email, code=code, purpose="register")

    return {
        "masked_email": mask_email(normalized_email),
        "code_ttl_seconds": settings.EMAIL_CODE_TTL_SECONDS,
    }


def verify_registration(registration_token: str, code: str) -> dict:
    session = _get_session(registration_token)
    if session.is_expired or session.completed_at:
        raise APIError("CODE_EXPIRED", "Регистрационная сессия истекла.", status_code=400)
    if not session.email:
        raise APIError("CODE_INVALID", "Сначала укажите email.")

    email_code = (
        EmailCode.objects.filter(
            purpose=EmailCode.Purpose.REGISTER,
            email=session.email,
            phone=session.phone,
        )
        .order_by("-created_at")
        .first()
    )
    if email_code is None:
        raise APIError("CODE_INVALID", "Код не найден. Запросите код повторно.")

    _consume_code(email_code, code)

    user = User.objects.create_user(
        phone=session.phone,
        email=session.email,
        email_verified_at=timezone.now(),
    )
    session.completed_at = timezone.now()
    session.save(update_fields=["completed_at"])

    tokens = tokens_for_user(user)
    return {
        "user": {"id": str(user.id), "phone": user.phone, "email": user.email},
        **tokens,
    }


# ---------------------------------------------------------------------------
# Login / refresh / logout
# ---------------------------------------------------------------------------
def login(phone: str, device_id: str | None = None) -> dict:
    normalized = _validate_phone(phone)
    try:
        user = User.objects.get(phone=normalized, is_active=True)
    except User.DoesNotExist:
        raise APIError("NOT_FOUND", "Пользователь с таким номером не найден.", status_code=404)

    tokens = tokens_for_user(user)
    return {
        "user": {"id": str(user.id), "phone": user.phone, "email": mask_email(user.email)},
        **tokens,
    }


def refresh_tokens(refresh: str) -> dict:
    try:
        token = RefreshToken(refresh)
    except Exception:
        raise APIError("UNAUTHORIZED", "Недействительный refresh-токен.", status_code=401)

    # Ротация refresh-токена. Сначала помечаем старый токен как отозванный,
    # затем меняем jti/exp/iat — иначе клиент получит обратно тот же (уже
    # отозванный) токен и при следующем обновлении будет разлогинен.
    token.blacklist()
    token.set_jti()
    token.set_exp()
    token.set_iat()
    return {"access": str(token.access_token), "refresh": str(token)}


def logout(refresh: str) -> None:
    try:
        token = RefreshToken(refresh)
        token.blacklist()
    except Exception:
        return


# ---------------------------------------------------------------------------
# Change phone
# ---------------------------------------------------------------------------
def start_change_phone(user, new_phone: str) -> dict:
    normalized = _validate_phone(new_phone)
    if User.objects.filter(phone=normalized).exclude(pk=user.pk).exists():
        raise APIError("PHONE_ALREADY_USED", "Этот номер уже используется другим аккаунтом.")

    day_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    attempts_today = EmailCode.objects.filter(
        purpose=EmailCode.Purpose.CHANGE_PHONE,
        user=user,
        created_at__gte=day_start,
    ).count()
    if attempts_today >= settings.PHONE_CHANGE_MAX_ATTEMPTS_PER_DAY:
        raise APIError(
            "TOO_MANY_PHONE_CHANGE_ATTEMPTS",
            "Превышен лимит попыток смены номера. Попробуйте завтра.",
            status_code=429,
        )

    code = generate_numeric_code()
    email_code = EmailCode.objects.create(
        purpose=EmailCode.Purpose.CHANGE_PHONE,
        user=user,
        email=user.email,
        new_phone=normalized,
        code_hash=hash_value(code),
        expires_at=timezone.now() + timedelta(seconds=settings.EMAIL_CODE_TTL_SECONDS),
    )
    send_email_code.delay(email=user.email, code=code, purpose="change_phone")

    return {
        "challenge_id": str(email_code.id),
        "masked_email": mask_email(user.email),
        "code_ttl_seconds": settings.EMAIL_CODE_TTL_SECONDS,
    }


def confirm_change_phone(user, challenge_id: str, code: str) -> dict:
    try:
        email_code = EmailCode.objects.get(
            id=challenge_id,
            purpose=EmailCode.Purpose.CHANGE_PHONE,
            user=user,
        )
    except EmailCode.DoesNotExist:
        raise APIError("CODE_INVALID", "Запрос на смену номера не найден.", status_code=404)

    _consume_code(email_code, code)

    user.phone = email_code.new_phone
    user.save(update_fields=["phone", "updated_at"])

    return {"phone": user.phone, "message": "Номер телефона успешно изменён."}


