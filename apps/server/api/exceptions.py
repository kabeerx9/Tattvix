from rest_framework import exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class PayloadAPIException(Exception):
    """An API error whose JSON body is sent exactly as given.

    DRF's APIException rewrites every value in a dict detail into an
    ErrorDetail string (so `None` becomes "None"); errors that carry typed
    fields such as dates use this instead.
    """

    status_code = 500

    def __init__(self, payload: dict):
        super().__init__(payload.get("error", ""))
        self.payload = payload


def exception_handler(exc, context):
    if isinstance(exc, PayloadAPIException):
        return Response(exc.payload, status=exc.status_code)
    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(exc, exceptions.ValidationError):
        response.data = validation_payload(exc.detail)
    return response


def validation_payload(detail) -> dict:
    """Every error body has the same shape: `error` is the message people see.

    DRF's own shape ({"field": ["message"]}) reached the apps as a bare
    "Bad Request", so a refused save never said why. `error` is the first
    message; `fields` maps each field to its first message, for the form to
    show under that field.
    """
    fields: dict[str, str] = {}
    general: list[str] = []
    if isinstance(detail, dict):
        for key, value in detail.items():
            message = _first_message(value)
            if not message:
                continue
            if key in ("non_field_errors", "detail"):
                general.append(message)
            else:
                fields[str(key)] = message
    else:
        message = _first_message(detail)
        if message:
            general.append(message)
    error = (general or list(fields.values()) or ["Check the details and try again."])[0]
    payload: dict = {"error": error, "code": "invalid"}
    if fields:
        payload["fields"] = fields
    return payload


def _first_message(value) -> str:
    if isinstance(value, (list, tuple)):
        return next((m for m in (_first_message(item) for item in value) if m), "")
    if isinstance(value, dict):
        return next((m for m in (_first_message(item) for item in value.values()) if m), "")
    return str(value) if value else ""
