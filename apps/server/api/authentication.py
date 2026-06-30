from dataclasses import dataclass
from typing import Any

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .clerk import authenticate_headers


@dataclass(frozen=True)
class ClerkPrincipal:
    id: str
    session_id: str | None
    organization_id: str | None
    organization_role: str | None
    claims: dict[str, Any]

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False

    def get_username(self) -> str:
        return self.id


class ClerkAuthentication(BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        django_request = request._request
        has_bearer_token = request.headers.get("authorization", "").startswith(
            f"{self.keyword} "
        )
        has_session_cookie = "__session" in django_request.COOKIES

        if not has_bearer_token and not has_session_cookie:
            return None

        state = authenticate_headers(request.headers)
        if not state.is_signed_in:
            raise AuthenticationFailed(state.message or "Invalid Clerk authentication.")

        payload = state.payload or {}
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise AuthenticationFailed("Clerk token is missing a subject claim.")

        principal = ClerkPrincipal(
            id=clerk_user_id,
            session_id=payload.get("sid"),
            organization_id=payload.get("org_id"),
            organization_role=payload.get("org_role"),
            claims=payload,
        )
        return principal, state
