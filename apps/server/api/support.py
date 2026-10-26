import re

from django.conf import settings


def _contact_number(value):
    number = re.sub(r"[\s-]", "", value)
    if not re.fullmatch(r"\+[1-9][0-9]{7,14}", number):
        return None
    # A display placeholder must never become a real call or WhatsApp target.
    return None if number == "+910000000000" else number


def build_support_contacts():
    return {
        "callPhone": _contact_number(settings.SUPPORT_CALL_PHONE),
        "whatsappPhone": _contact_number(settings.SUPPORT_WHATSAPP_PHONE),
    }
