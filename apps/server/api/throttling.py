from rest_framework.throttling import ScopedRateThrottle


class ClerkPrincipalScopedThrottle(ScopedRateThrottle):
    """Scoped throttle that works with Clerk authentication.

    ScopedRateThrottle's default get_cache_key keys authenticated requests
    off `request.user.pk`, but our authenticated principal is the
    ClerkPrincipal dataclass (see api.authentication.ClerkAuthentication),
    which has no `.pk`. Key off the underlying ClerkUser row's id instead;
    anonymous requests keep DRF's default IP-based key.
    """

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.db_user.id
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
