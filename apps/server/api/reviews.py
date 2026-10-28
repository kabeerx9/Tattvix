"""Visit-owned immutable reviews. Owner reads never expose reusable guest data."""
from django.db import transaction
from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from .models import Stay, StayReview, StayStatus, OperationalStayStatus

PAGE_SIZE = 25


def can_review(stay):
    return (
        stay.status != StayStatus.DRAFT
        and stay.operational_status == OperationalStayStatus.CHECKED_OUT
        and stay.checked_in_at is not None
        and stay.checked_out_at is not None
        and stay.checked_out_at >= stay.checked_in_at
    )


def review_payload(review):
    return {"id": review.id, "rating": review.rating, "comment": review.comment, "createdAt": review.created_at.isoformat()}


def guest_review_state(stay):
    review = StayReview.objects.filter(stay=stay).first()
    return {"review": review_payload(review) if review else None, "canReview": review is None and can_review(stay)}


class ReviewConflict(Exception):
    def __init__(self, code, message):
        self.code, self.message = code, message


def submit_review(*, stay_id, guest, rating, comment):
    with transaction.atomic():
        stay = get_object_or_404(
            Stay.objects.select_for_update().exclude(status=StayStatus.DRAFT),
            public_id=stay_id, guest=guest,
        )
        existing = StayReview.objects.filter(stay=stay).first()
        if existing:
            if existing.rating == rating and existing.comment == comment:
                return existing, False
            raise ReviewConflict("review_already_submitted", "This stay already has a review. Submitted reviews cannot be edited.")
        if not can_review(stay):
            raise ReviewConflict("stay_not_checked_out", "You can review this visit after the hotel checks you out.")
        return StayReview.objects.create(stay=stay, rating=rating, comment=comment), True


def property_reviews(*, property_, before=None):
    reviews = StayReview.objects.filter(stay__property=property_)
    totals = reviews.aggregate(total=Count("id"), average=Avg("rating"))
    window = reviews.filter(id__lt=before) if before is not None else reviews
    # Fetch the existing register name, not document metadata, reusable profile
    # details or private image keys. The stay link retains its own ID access gate.
    rows = list(window.order_by("-id").values("id", "rating", "comment", "created_at", "stay__public_id", "stay__checked_out_at", "stay__identity_snapshot__guest_data")[:PAGE_SIZE + 1])
    has_more = len(rows) > PAGE_SIZE
    rows = rows[:PAGE_SIZE]
    entries = []
    for row in rows:
        guest = row["stay__identity_snapshot__guest_data"] or {}
        name = " ".join(filter(None, [guest.get("legalFirstName"), guest.get("legalLastName")]))
        entries.append({
            "id": row["id"], "rating": row["rating"], "comment": row["comment"],
            "createdAt": row["created_at"].isoformat(),
            "stayId": str(row["stay__public_id"]), "guestName": name or "Guest",
            "checkedOutAt": row["stay__checked_out_at"].isoformat() if row["stay__checked_out_at"] else None,
        })
    return {
        "reviews": entries, "pageSize": PAGE_SIZE, "hasMore": has_more,
        "nextCursor": rows[-1]["id"] if has_more else None,
        "summary": {"totalReviews": totals["total"], "averageRating": round(totals["average"], 1) if totals["average"] is not None else None},
    }
