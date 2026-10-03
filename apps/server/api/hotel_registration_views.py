from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .hotel_registration import request_payload, review_request, submit_request
from .hotel_registration_serializers import (
    HotelRegistrationQuerySerializer,
    HotelRegistrationReviewSerializer,
    HotelRegistrationSubmitSerializer,
)
from .models import HotelRegistrationRequest
from .permissions import IsPlatformAdmin


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def guest_hotel_requests(request):
    if request.method == "GET":
        items = HotelRegistrationRequest.objects.filter(
            applicant=request.user.db_user
        ).select_related("organization", "property")
        return Response({"requests": [request_payload(item) for item in items]})
    serializer = HotelRegistrationSubmitSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    item = submit_request(applicant=request.user.db_user, **serializer.validated_data)
    return Response(request_payload(item), status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsPlatformAdmin])
def platform_hotel_requests(request):
    serializer = HotelRegistrationQuerySerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    items = (
        HotelRegistrationRequest.objects.filter(
            status=serializer.validated_data["status"]
        )
        .select_related("applicant", "organization", "property")
        .order_by("submitted_at", "id")[:100]
    )
    return Response(
        {"requests": [request_payload(item, include_applicant=True) for item in items]}
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsPlatformAdmin])
def platform_hotel_request_review(request, request_id):
    serializer = HotelRegistrationReviewSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    item = review_request(
        request_id=request_id,
        reviewer=request.user.db_user,
        **serializer.validated_data,
    )
    return Response(request_payload(item, include_applicant=True))
