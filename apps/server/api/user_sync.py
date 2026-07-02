from __future__ import annotations

import logging
from typing import Any, Mapping

from django.utils import timezone

from .clerk import get_clerk_client, primary_email_from_clerk_user
from .models import ClerkUser

logger = logging.getLogger(__name__)


def get_or_create_clerk_user(
    *, clerk_id: str, claims: Mapping[str, Any]
) -> ClerkUser:
    defaults = _defaults_from_claims(claims)
    user, created = ClerkUser.objects.get_or_create(
        clerk_id=clerk_id,
        defaults=defaults,
    )

    if created or _needs_profile_refresh(user):
        _refresh_from_clerk(user, claims)

    return user


def _needs_profile_refresh(user: ClerkUser) -> bool:
    return not user.email or user.last_synced_at is None


def _refresh_from_clerk(user: ClerkUser, claims: Mapping[str, Any]) -> None:
    data = _fetch_clerk_user(user.clerk_id)
    defaults = _defaults_from_clerk_user(data) if data else _defaults_from_claims(claims)

    for field, value in defaults.items():
        setattr(user, field, value)
    user.save(update_fields=[*defaults.keys(), "updated_at"])


def _fetch_clerk_user(clerk_id: str) -> dict[str, Any] | None:
    try:
        user = get_clerk_client().users.get(user_id=clerk_id, timeout_ms=3000)
    except Exception:
        logger.exception("Failed to fetch Clerk user %s.", clerk_id)
        return None

    return user.model_dump(mode="json", exclude_unset=True)


def _defaults_from_clerk_user(data: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "email": primary_email_from_clerk_user(data),
        "first_name": _string(data.get("first_name")),
        "last_name": _string(data.get("last_name")),
        "username": _string(data.get("username")),
        "image_url": _string(data.get("image_url") or data.get("profile_image_url")),
        "public_metadata": _dict(data.get("public_metadata")),
        "private_metadata": _dict(data.get("private_metadata")),
        "unsafe_metadata": _dict(data.get("unsafe_metadata")),
        "raw_data": dict(data),
        "last_synced_at": timezone.now(),
    }


def _defaults_from_claims(claims: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "email": _string(claims.get("email") or claims.get("email_address")),
        "first_name": _string(claims.get("first_name") or claims.get("given_name")),
        "last_name": _string(claims.get("last_name") or claims.get("family_name")),
        "username": _string(claims.get("username")),
        "image_url": _string(claims.get("image_url") or claims.get("picture")),
        "public_metadata": _dict(claims.get("public_metadata")),
        "private_metadata": {},
        "unsafe_metadata": {},
        "raw_data": {"claims": dict(claims)},
        "last_synced_at": timezone.now(),
    }


def _string(value: Any) -> str:
    return value if isinstance(value, str) else ""


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}
