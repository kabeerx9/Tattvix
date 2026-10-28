from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .hotel_registration_serializers import StrictSerializer
from .referrals import create_referral_code, referral_dashboard


class ReferralQuerySerializer(StrictSerializer):
    before = serializers.IntegerField(
        required=False, min_value=1, max_value=9007199254740991
    )


class ReferralCreateSerializer(StrictSerializer):
    pass


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def account_referrals(request):
    if request.method == "GET":
        query = ReferralQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        return Response(
            referral_dashboard(
                request.user.db_user, before=query.validated_data.get("before")
            ),
            headers={"Cache-Control": "no-store"},
        )
    serializer = ReferralCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    code, created = create_referral_code(request.user.db_user)
    return Response(
        {"code": code.code},
        status=201 if created else 200,
        headers={"Cache-Control": "no-store"},
    )
