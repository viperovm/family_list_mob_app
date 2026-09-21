"""Push delivery layer backed by the Expo Push API.

The backend stores device push tokens (Expo push tokens) via ``DeviceViewSet``
and delivers notifications by POSTing to Expo's push endpoint. Set
``EXPO_ACCESS_TOKEN`` to enable real delivery; when it is empty (development)
delivery falls back to logging only.
"""
import json
import logging
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = getattr(settings, "EXPO_PUSH_URL", "https://exp.host/--/api/v2/push/send")


def _access_token() -> str:
    return getattr(settings, "EXPO_ACCESS_TOKEN", "") or ""


def _build_message(device, title: str, body: str, data: dict) -> dict:
    return {
        "to": device.token,
        "title": title,
        "body": body,
        "data": data or {},
        "sound": "default",
        "priority": "high",
    }


def _post(messages: list[dict]) -> list[dict]:
    """POST a batch of messages to Expo and return the per-message receipts."""
    payload = json.dumps(messages).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
    }
    token = _access_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(EXPO_PUSH_URL, data=payload, method="POST", headers=headers)
    with urllib.request.urlopen(request, timeout=10) as response:
        body = response.read()

    try:
        parsed = json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return []
    return parsed.get("data", [])


def _deactivate_unregistered(devices: list, receipts: list[dict]) -> None:
    for device, receipt in zip(devices, receipts):
        if not isinstance(receipt, dict) or receipt.get("status") != "error":
            continue
        details = receipt.get("details") or {}
        if details.get("error") == "DeviceNotRegistered":
            device.is_active = False
            device.save(update_fields=["is_active", "updated_at"])
            logger.info("Deactivated unregistered device token %s", device.token)


def send_push(device, title: str, body: str, data: dict) -> None:
    """Deliver a single push to a device token."""
    if not _access_token():
        logger.info(
            "PUSH (stub, no EXPO_ACCESS_TOKEN) to=%s (%s) title=%r body=%r data=%r",
            device.token,
            device.platform,
            title,
            body,
            data,
        )
        return

    try:
        receipts = _post([_build_message(device, title, body, data)])
        _deactivate_unregistered([device], receipts)
    except Exception:
        logger.exception("Failed to send Expo push to %s", device.token)


def send_push_to_user(user, title: str, body: str, data: dict) -> int:
    """Send a push to every active device of a user."""
    devices = list(user.devices.filter(is_active=True))
    if not devices:
        return 0

    if not _access_token():
        for device in devices:
            logger.info(
                "PUSH (stub, no EXPO_ACCESS_TOKEN) to=%s (%s) title=%r body=%r data=%r",
                device.token,
                device.platform,
                title,
                body,
                data,
            )
        return len(devices)

    messages = [_build_message(device, title, body, data) for device in devices]
    try:
        receipts = _post(messages)
        _deactivate_unregistered(devices, receipts)
    except Exception:
        logger.exception("Failed to send Expo push batch for %d devices", len(devices))
    return len(devices)
