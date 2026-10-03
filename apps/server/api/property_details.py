from django.db.models import Min, Max


def build_property_details(property_):
    rates = property_.rooms.filter(
        is_active=True, nightly_rate_minor__isnull=False
    ).aggregate(low=Min("nightly_rate_minor"), high=Max("nightly_rate_minor"))
    return {
        "address": property_.address,
        "contactPhone": property_.contact_phone,
        "description": property_.description,
        "amenities": property_.amenities,
        "checkInTime": property_.check_in_time,
        "checkOutTime": property_.check_out_time,
        "currency": "INR",
        "nightlyRateFromMinor": rates["low"],
        "nightlyRateToMinor": rates["high"],
    }
