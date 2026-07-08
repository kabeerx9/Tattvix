from functools import lru_cache
from typing import Mapping, Any

from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions, RequestState
from django.conf import settings


@lru_cache(maxsize=1)
def get_clerk_client() -> Clerk:
    return Clerk(bearer_auth=settings.CLERK_SECRET_KEY or None)


def get_authenticate_request_options(
    *, verify_authorized_parties: bool = True
) -> AuthenticateRequestOptions:
    return AuthenticateRequestOptions(
        secret_key=settings.CLERK_SECRET_KEY or None,
        authorized_parties=(
            settings.CLERK_AUTHORIZED_PARTIES or None
            if verify_authorized_parties
            else None
        ),
    )


class ClerkRequest:
    def __init__(self, headers: Mapping[str, str]) -> None:
        self._headers = headers

    @property
    def headers(self) -> Mapping[str, str]:
        return self._headers


def authenticate_headers(
    headers: Mapping[str, str], *, verify_authorized_parties: bool = True
) -> RequestState:
    return get_clerk_client().authenticate_request(
        ClerkRequest(headers),
        get_authenticate_request_options(
            verify_authorized_parties=verify_authorized_parties
        ),
    )


def primary_email_from_clerk_user(data: Mapping[str, Any]) -> str:
    primary_id = data.get("primary_email_address_id")
    email_addresses = data.get("email_addresses") or []

    for email in email_addresses:
        if email.get("id") == primary_id:
            return email.get("email_address") or ""

    if email_addresses:
        return email_addresses[0].get("email_address") or ""

    return data.get("email") or ""
