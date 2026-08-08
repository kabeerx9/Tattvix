import csv

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .hotel_access import get_accessible_property
from .hotel_reports import (
    build_in_house_entries,
    build_occupancy_report,
    build_register_entries,
    build_status_counts,
)
from .rbac import Permission
from .serializers import HotelReportDateRangeQuerySerializer


def _resolve_date_range(request):
    """Validate dateFrom/dateTo query params and default to today.

    Defaulting happens here (not in the serializer) so the serializer only
    validates what the client actually sent, while every report that takes
    a range agrees on the same "today" fallback.
    """
    query_serializer = HotelReportDateRangeQuerySerializer(
        data=request.query_params
    )
    query_serializer.is_valid(raise_exception=True)
    filters = query_serializer.validated_data
    today = timezone.localdate()
    date_from = filters.get("date_from") or today
    date_to = filters.get("date_to") or today
    return date_from, date_to


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotel_report_register(request, organization_slug: str, property_slug: str):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.REPORTS_VIEW,
    )
    date_from, date_to = _resolve_date_range(request)
    entries = build_register_entries(
        property_=property_, date_from=date_from, date_to=date_to
    )

    # ?export=csv is a sibling representation of the same data, not a
    # different report — same permission gate, same date range, same
    # fields. Kept as a query param (rather than a separate /csv/ route)
    # so the JSON and CSV views of the register can never drift apart.
    # (Named "export", not "format" — DRF reserves ?format= for its own
    # content-negotiation and 404s on an unregistered renderer.)
    if request.query_params.get("export") == "csv":
        return _register_csv_response(property_.slug, date_from, date_to, entries)

    return Response(
        {
            "dateFrom": date_from.isoformat(),
            "dateTo": date_to.isoformat(),
            "entries": entries,
        }
    )


def _register_csv_response(property_slug, date_from, date_to, entries):
    response = HttpResponse(content_type="text/csv")
    filename = (
        f"register-{property_slug}-{date_from.isoformat()}_{date_to.isoformat()}.csv"
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    # Names, dates, room, status ONLY — never document numbers or other
    # identity data. See build_register_entry in hotel_reports.py, which
    # never reads document fields in the first place.
    writer = csv.writer(response)
    writer.writerow(
        [
            "Guest name",
            "Companions",
            "Room",
            "Checked in at",
            "Checked out at",
            "Status",
        ]
    )
    for entry in entries:
        writer.writerow(
            [
                entry["guestName"],
                entry["companionCount"],
                entry["roomNumber"] or "",
                entry["checkedInAt"] or "",
                entry["checkedOutAt"] or "",
                entry["operationalStatus"],
            ]
        )
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotel_report_in_house(request, organization_slug: str, property_slug: str):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.REPORTS_VIEW,
    )
    return Response({"entries": build_in_house_entries(property_=property_)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotel_report_occupancy(request, organization_slug: str, property_slug: str):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.REPORTS_VIEW,
    )
    return Response(build_occupancy_report(property_=property_))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotel_report_status_counts(request, organization_slug: str, property_slug: str):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.REPORTS_VIEW,
    )
    date_from, date_to = _resolve_date_range(request)
    counts = build_status_counts(
        property_=property_, date_from=date_from, date_to=date_to
    )
    return Response(
        {
            "dateFrom": date_from.isoformat(),
            "dateTo": date_to.isoformat(),
            "counts": counts,
        }
    )
