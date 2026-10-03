from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import APIException

from .models import (
    HotelRegistrationRequest,
    Membership,
    MembershipRole,
    Organization,
    PlatformAuditAction,
    PlatformAuditLog,
    Property,
)


class HotelRegistrationConflict(APIException):
    status_code = 409
    default_detail = "This hotel request conflicts with the current state."
    default_code = "hotel_request_conflict"


def request_payload(item, *, include_applicant=False):
    payload = {
        "id": item.id,
        "hotelName": item.hotel_name,
        "address": item.address,
        "contactPhone": item.contact_phone,
        "status": item.status,
        "rejectionReason": item.rejection_reason,
        "submittedAt": item.submitted_at.isoformat(),
        "reviewedAt": item.reviewed_at.isoformat() if item.reviewed_at else None,
        "organization": {"name": item.organization.name, "slug": item.organization.slug}
        if item.organization_id
        else None,
        "property": {"name": item.property.name, "slug": item.property.slug}
        if item.property_id
        else None,
    }
    if include_applicant:
        payload["applicant"] = {
            "id": item.applicant_id,
            "email": item.applicant.email,
            "firstName": item.applicant.first_name,
            "lastName": item.applicant.last_name,
        }
    return payload


def submit_request(*, applicant, **fields):
    try:
        with transaction.atomic():
            return HotelRegistrationRequest.objects.create(
                applicant=applicant, **fields
            )
    except IntegrityError as exc:
        raise HotelRegistrationConflict(
            "You already have a pending hotel request."
        ) from exc


def review_request(*, request_id, reviewer, decision, rejection_reason=""):
    try:
        with transaction.atomic():
            # Lock only this row: nullable joined organization/property rows cannot be
            # locked with PostgreSQL's FOR UPDATE on the outer join.
            item = get_object_or_404(
                HotelRegistrationRequest.objects.select_for_update(), pk=request_id
            )
            target = "APPROVED" if decision == "APPROVE" else "REJECTED"
            if item.status == target:
                return item
            if item.status != "PENDING":
                raise HotelRegistrationConflict(
                    "This request has already received a different decision."
                )
            if decision == "APPROVE":
                # Clean, readable slug from the hotel name; "-2", "-3"… only when
                # the name is already taken (manual onboarding or a namesake). A
                # nested savepoint handles a concurrent creation as well.
                candidate = (slugify(item.hotel_name) or "hotel")[:250].rstrip("-")
                attempt = 1
                while True:
                    extra = f"-{attempt}" if attempt > 1 else ""
                    slug = f"{candidate}{extra}"
                    try:
                        with transaction.atomic():
                            item.organization = Organization.objects.create(
                                name=item.hotel_name, slug=slug
                            )
                        break
                    except IntegrityError:
                        if not Organization.objects.filter(slug=slug).exists():
                            raise
                        attempt += 1
                item.property = Property.objects.create(
                    organization=item.organization, name=item.hotel_name, slug="main",
                    address=item.address, contact_phone=item.contact_phone
                )
                Membership.objects.create(
                    user_id=item.applicant_id,
                    organization=item.organization,
                    role=MembershipRole.OWNER,
                    has_all_properties=True,
                    is_active=True,
                )
                PlatformAuditLog.objects.create(
                    actor=reviewer,
                    organization=item.organization,
                    action=PlatformAuditAction.PROPERTY_CREATED,
                    target=item.property.slug,
                )
                PlatformAuditLog.objects.create(
                    actor=reviewer,
                    organization=item.organization,
                    action=PlatformAuditAction.MEMBER_ADDED,
                    target=item.applicant.email,
                )
            item.status = target
            item.reviewer = reviewer
            item.reviewed_at = timezone.now()
            item.rejection_reason = rejection_reason if decision == "REJECT" else ""
            item.save(
                update_fields=[
                    "status",
                    "reviewer",
                    "reviewed_at",
                    "rejection_reason",
                    "organization",
                    "property",
                ]
            )
            return item
    except IntegrityError as exc:
        raise HotelRegistrationConflict(
            "The hotel could not be created because its data conflicts. Retry the review."
        ) from exc
