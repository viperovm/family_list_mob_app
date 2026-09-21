"""Abstract push delivery layer.

The interface is intentionally abstract: a production deployment plugs in
``firebase-admin`` (or another provider) here without touching the callers.
"""
import logging

logger = logging.getLogger(__name__)


def send_push(device, title: str, body: str, data: dict) -> None:
    """Deliver a single push to a device token.

    Stub implementation for development: logs the payload. Replace with the
    concrete provider (e.g. Firebase Cloud Messaging) for production.
    """
    logger.info("PUSH to=%s (%s) title=%r body=%r data=%r", device.token, device.platform, title, body, data)


def send_push_to_user(user, title: str, body: str, data: dict) -> int:
    """Send a push to every active device of a user."""
    devices = list(user.devices.filter(is_active=True))
    for device in devices:
        send_push(device, title, body, data)
    return len(devices)
