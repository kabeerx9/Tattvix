from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .hotel_registration_serializers import StrictSerializer
from .hotel_access import get_accessible_property
from .rbac import Permission
from .models import Stay, StayStatus
from .reviews import ReviewConflict, guest_review_state, property_reviews, review_payload, submit_review

class ReviewInputSerializer(StrictSerializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(min_length=1, max_length=2000, trim_whitespace=True)

class ReviewPageSerializer(StrictSerializer):
    before = serializers.IntegerField(min_value=1, max_value=9007199254740991, required=False)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def guest_stay_review(request, stay_id):
    guest = request.user.db_user
    stay = get_object_or_404(Stay.objects.exclude(status=StayStatus.DRAFT), public_id=stay_id, guest=guest)
    if request.method == "GET":
        return Response(guest_review_state(stay))
    serializer = ReviewInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        review, created = submit_review(stay_id=stay_id, guest=guest, **serializer.validated_data)
    except ReviewConflict as exc:
        return Response({"error": exc.message, "code": exc.code}, status=409)
    return Response({"review": review_payload(review), "canReview": False}, status=201 if created else 200)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotel_reviews(request, organization_slug, property_slug):
    property_ = get_accessible_property(
        user=request.user.db_user, organization_slug=organization_slug,
        property_slug=property_slug, permission=Permission.HOTEL_MANAGE, allow_expired=True,
    )
    query = ReviewPageSerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    return Response(property_reviews(property_=property_, before=query.validated_data.get("before")))
