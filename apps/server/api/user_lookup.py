from .models import ClerkUser


class ExistingUserNotFound(Exception):
    pass


class AmbiguousExistingUser(Exception):
    pass


def get_unique_existing_user_by_email(email: str) -> ClerkUser:
    normalized_email = email.strip().lower()
    users = list(
        ClerkUser.objects.filter(email__iexact=normalized_email).order_by("id")[:2]
    )

    if not users:
        raise ExistingUserNotFound
    if len(users) > 1:
        raise AmbiguousExistingUser

    return users[0]
