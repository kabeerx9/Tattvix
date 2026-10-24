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
    return drf_exception_handler(exc, context)
