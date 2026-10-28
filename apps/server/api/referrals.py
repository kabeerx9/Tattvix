"""Owner-account referral codes and private, registration-based attribution."""

import re
import secrets
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.http import Http404
from rest_framework.exceptions import APIException
from .models import HotelReferralCode, Membership, MembershipRole
from .exceptions import PayloadAPIException

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_PATTERN = re.compile(r"^[A-HJ-NP-Z2-9]{12}$")
PAGE_SIZE = 25


class InvalidReferral(PayloadAPIException):
    status_code = 400

    def __init__(
        self,
        message="The referral code is invalid or unavailable. Check it or remove it.",
    ):
        super().__init__({"error": message, "code": "invalid_referral"})


def is_owner(user_id):
    return Membership.objects.filter(
        user_id=user_id,
        role=MembershipRole.OWNER,
        is_active=True,
        organization__is_active=True,
    ).exists()


def require_owner_account(user):
    if not is_owner(user.id):
        raise Http404


def create_referral_code(user):
    require_owner_account(user)
    # get_or_create handles same-account races using the one-to-one constraint.
    # Separate savepoints also let a rare random-code collision retry safely.
    for _ in range(5):
        candidate = "".join(secrets.choice(ALPHABET) for _ in range(12))
        try:
            with transaction.atomic():
                return HotelReferralCode.objects.get_or_create(
                    owner=user, defaults={"code": candidate}
                )
        except IntegrityError:
            if not HotelReferralCode.objects.filter(code=candidate).exists():
                raise
    raise APIException("A referral code could not be created. Try again.")


def referral_for_registration(*, applicant, code):
    if not code:
        return None
    normalized = code.strip().upper()
    if not CODE_PATTERN.fullmatch(normalized):
        raise InvalidReferral()
    referral = HotelReferralCode.objects.filter(code=normalized).first()
    if referral is None or not is_owner(referral.owner_id):
        raise InvalidReferral()
    if referral.owner_id == applicant.id:
        raise InvalidReferral("You cannot use your own referral code.")
    return referral


def referral_dashboard(user, *, before=None):
    require_owner_account(user)
    referral = HotelReferralCode.objects.filter(owner=user).first()
    if referral is None:
        return {
            "code": None,
            "summary": {"total": 0, "pending": 0, "approved": 0, "rejected": 0},
            "registrations": [],
            "nextCursor": None,
        }
    registrations = referral.registrations.all()
    summary = registrations.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status="PENDING")),
        approved=Count("id", filter=Q(status="APPROVED")),
        rejected=Count("id", filter=Q(status="REJECTED")),
    )
    window = (
        registrations.filter(id__lt=before) if before is not None else registrations
    )
    rows = list(
        window.order_by("-id").values(
            "id", "hotel_name", "status", "submitted_at", "reviewed_at"
        )[: PAGE_SIZE + 1]
    )
    has_more = len(rows) > PAGE_SIZE
    rows = rows[:PAGE_SIZE]
    return {
        "code": referral.code,
        "summary": summary,
        "nextCursor": rows[-1]["id"] if has_more else None,
        "registrations": [
            {
                "id": row["id"],
                "hotelName": row["hotel_name"],
                "status": row["status"],
                "submittedAt": row["submitted_at"].isoformat(),
                "reviewedAt": row["reviewed_at"].isoformat()
                if row["reviewed_at"]
                else None,
            }
            for row in rows
        ],
    }
