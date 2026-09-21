"""Custom error model and exception handler.

The API uses a single, consistent error shape:

    {"error": {"code": "...", "message": "...", "fields": {...}}}
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    MethodNotAllowed,
    NotAuthenticated,
    NotFound,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class APIError(Exception):
    """An application-level error carrying a machine-readable code."""

    default_status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, code, message, fields=None, status_code=None, http_status=None):
        self.code = code
        self.message = message
        self.fields = fields
        self.status_code = status_code or http_status or self.default_status_code
        super().__init__(message)


def custom_exception_handler(exc, context):
    """Convert DRF and API errors into the unified error shape."""
    if isinstance(exc, APIError):
        return _error_response(
            exc.code,
            exc.message,
            exc.fields,
            exc.status_code,
        )

    if isinstance(exc, ValidationError):
        fields = exc.detail if isinstance(exc.detail, (dict, list)) else None
        return _error_response(
            "VALIDATION_ERROR",
            "Проверьте правильность заполненных полей.",
            fields,
            status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, Throttled):
        return _error_response(
            "RATE_LIMITED",
            str(exc.detail) if isinstance(exc.detail, str) else "Слишком много запросов.",
            None,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
        return _error_response(
            "UNAUTHORIZED",
            "Требуется авторизация.",
            None,
            status.HTTP_401_UNAUTHORIZED,
        )

    if isinstance(exc, PermissionDenied):
        return _error_response(
            "FORBIDDEN",
            "Доступ запрещён.",
            None,
            status.HTTP_403_FORBIDDEN,
        )

    if isinstance(exc, NotFound):
        return _error_response(
            "NOT_FOUND",
            "Ресурс не найден.",
            None,
            status.HTTP_404_NOT_FOUND,
        )

    if isinstance(exc, MethodNotAllowed):
        return _error_response(
            "METHOD_NOT_ALLOWED",
            "Метод не поддерживается.",
            None,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    response = drf_exception_handler(exc, context)
    if response is not None:
        return _error_response(
            "ERROR",
            _extract_message(exc),
            None,
            response.status_code,
        )

    return _error_response(
        "INTERNAL_ERROR",
        "Внутренняя ошибка сервера.",
        None,
        status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _extract_message(exc) -> str:
    detail = getattr(exc, "detail", None)
    if isinstance(detail, str):
        return detail
    if isinstance(detail, dict):
        for value in detail.values():
            if isinstance(value, list) and value:
                return str(value[0])
            return str(value)
    return str(exc)


def _error_response(code, message, fields, http_status):
    payload = {"code": code, "message": message}
    if fields:
        payload["fields"] = fields
    return Response({"error": payload}, status=http_status)
