from dataclasses import dataclass

from django.db import IntegrityError, transaction
from django.http import Http404

from .models import ClerkUser, Membership, MembershipPropertyAccess, MembershipRole, Organization, PlatformAuditAction, PlatformAuditLog, Property, Subscription
from .rbac import Permission, permissions_for_membership_role
from .subscriptions import SubscriptionExpired, build_subscription_payload, is_entitled


@dataclass(frozen=True)
class TeamError(Exception):
    code: str
    message: str
    status_code: int = 400


def _locked_organization(
    organization: Organization, *, require_active: bool = True
) -> Organization:
    query = Organization.objects.select_for_update().filter(pk=organization.pk)
    if require_active:
        query = query.filter(is_active=True)
    return query.get()


def _actor_membership(*, organization: Organization, actor: ClerkUser) -> Membership:
    membership = Membership.objects.select_for_update().filter(
        organization=organization, user=actor, is_active=True
    ).first()
    if membership is None or Permission.MEMBERS_MANAGE not in permissions_for_membership_role(membership.role):
        raise Http404
    return membership


def require_owner(*, organization_slug: str, actor: ClerkUser) -> Organization:
    organization = Organization.objects.filter(slug=organization_slug, is_active=True).first()
    if organization is None:
        raise Http404
    membership = Membership.objects.filter(organization=organization, user=actor, is_active=True).first()
    if membership is None or Permission.MEMBERS_MANAGE not in permissions_for_membership_role(membership.role):
        raise Http404
    return organization


def _require_entitled(organization: Organization) -> None:
    subscription = Subscription.objects.select_for_update().filter(organization=organization).first()
    if not is_entitled(subscription):
        raise SubscriptionExpired(subscription)


def _properties_for_scope(*, organization: Organization, actor_membership: Membership, property_ids: list[int]) -> list[Property]:
    properties = list(Property.objects.filter(organization=organization, is_active=True, id__in=property_ids))
    if len(properties) != len(property_ids):
        raise Http404
    if not actor_membership.has_all_properties:
        allowed = set(MembershipPropertyAccess.objects.filter(
            membership=actor_membership, property_id__in=property_ids
        ).values_list("property_id", flat=True))
        if allowed != set(property_ids):
            raise Http404
    return properties


def _assert_existing_scope_within_actor(*, actor_membership: Membership, membership: Membership) -> None:
    """A reactivation must not restore access the actor could not grant today."""
    if actor_membership.has_all_properties:
        return
    if membership.has_all_properties:
        raise Http404
    target_ids = set(MembershipPropertyAccess.objects.filter(membership=membership).values_list("property_id", flat=True))
    actor_ids = set(MembershipPropertyAccess.objects.filter(membership=actor_membership).values_list("property_id", flat=True))
    if not target_ids.issubset(actor_ids):
        raise Http404


def _write_scope(*, membership: Membership, role: str, properties: list[Property] | None) -> bool:
    changed = False
    if role == MembershipRole.OWNER:
        if not membership.has_all_properties:
            membership.has_all_properties = True
            changed = True
        MembershipPropertyAccess.objects.filter(membership=membership).delete()
    elif properties is not None:
        if membership.has_all_properties:
            membership.has_all_properties = False
            changed = True
        MembershipPropertyAccess.objects.filter(membership=membership).delete()
        MembershipPropertyAccess.objects.bulk_create([
            MembershipPropertyAccess(membership=membership, property=property_) for property_ in properties
        ])
        changed = True
    return changed


def _assert_owner_survives(*, organization: Organization, membership: Membership, role: str | None, is_active: bool | None) -> None:
    removes = membership.role == MembershipRole.OWNER and membership.is_active and (
        (role is not None and role != MembershipRole.OWNER) or is_active is False
    )
    if removes and not Membership.objects.select_for_update().filter(
        organization=organization, role=MembershipRole.OWNER, is_active=True
    ).exclude(pk=membership.pk).exists():
        raise TeamError("last_owner", "An organization must keep at least one active owner.", 409)


def add_team_member(*, organization: Organization, actor: ClerkUser, user_id: int, role: str, property_ids: list[int]) -> Membership:
    with transaction.atomic():
        organization = _locked_organization(organization)
        actor_membership = _actor_membership(organization=organization, actor=actor)
        _require_entitled(organization)
        user = ClerkUser.objects.filter(pk=user_id).first()
        if user is None:
            raise TeamError("user_not_found", "That Tattwix account no longer exists.")
        if role == MembershipRole.OWNER:
            # A legacy restricted owner may manage members, but cannot turn a
            # user into an all-properties owner beyond their own scope.
            if not actor_membership.has_all_properties:
                raise Http404
            properties = []
        else:
            if not property_ids:
                raise TeamError("property_scope_required", "Select at least one property.")
            properties = _properties_for_scope(organization=organization, actor_membership=actor_membership, property_ids=property_ids)
        try:
            membership = Membership.objects.create(user=user, organization=organization, role=role, has_all_properties=role == MembershipRole.OWNER)
        except IntegrityError as exc:
            raise TeamError("member_exists", "This user already has a membership in the organization.", 409) from exc
        if role != MembershipRole.OWNER:
            _write_scope(membership=membership, role=role, properties=properties)
        PlatformAuditLog.objects.create(actor=actor, organization=organization, action=PlatformAuditAction.MEMBER_ADDED, target=user.email)
        return membership


def update_team_member(*, organization: Organization, actor: ClerkUser, membership_id: int, role: str | None = None, property_ids: list[int] | None = None, is_active: bool | None = None) -> Membership:
    with transaction.atomic():
        organization = _locked_organization(organization)
        actor_membership = _actor_membership(organization=organization, actor=actor)
        _require_entitled(organization)
        membership = Membership.objects.select_for_update().select_related("user").filter(pk=membership_id, organization=organization).first()
        if membership is None:
            raise Http404
        new_role = role if role is not None else membership.role
        if membership.role == MembershipRole.OWNER and new_role != MembershipRole.OWNER and property_ids is None:
            raise TeamError("property_scope_required", "Select properties when changing an owner to staff.")
        if new_role == MembershipRole.OWNER:
            if not actor_membership.has_all_properties:
                raise Http404
            if property_ids:
                raise TeamError("invalid_property_scope", "Owners have access to all properties.")
            properties = []
        elif property_ids is not None:
            if not property_ids:
                raise TeamError("property_scope_required", "Select at least one property.")
            properties = _properties_for_scope(organization=organization, actor_membership=actor_membership, property_ids=property_ids)
        else:
            properties = None
        if is_active is True and not membership.is_active and property_ids is None:
            _assert_existing_scope_within_actor(
                actor_membership=actor_membership, membership=membership
            )
        _assert_owner_survives(organization=organization, membership=membership, role=role, is_active=is_active)
        role_changed = role is not None and role != membership.role
        fields = ["updated_at"]
        if role_changed:
            PlatformAuditLog.objects.create(actor=actor, organization=organization, action=PlatformAuditAction.MEMBER_ROLE_CHANGED, target=f"{membership.user.email}:{membership.role}->{role}")
            membership.role = role
            fields.append("role")
        if is_active is not None and is_active != membership.is_active:
            PlatformAuditLog.objects.create(actor=actor, organization=organization, action=PlatformAuditAction.MEMBER_REACTIVATED if is_active else PlatformAuditAction.MEMBER_DEACTIVATED, target=membership.user.email)
            membership.is_active = is_active
            fields.append("is_active")
        scope_was_edited = property_ids is not None or (
            role_changed
        )
        if scope_was_edited and _write_scope(membership=membership, role=new_role, properties=properties):
            fields.append("has_all_properties")
            PlatformAuditLog.objects.create(actor=actor, organization=organization, action=PlatformAuditAction.MEMBER_PROPERTY_SCOPE_CHANGED, target=membership.user.email)
        if len(fields) > 1:
            membership.save(update_fields=fields)
        return membership


def team_member_payload(membership: Membership) -> dict:
    return {"id": membership.id, "role": membership.role, "isActive": membership.is_active, "hasAllProperties": membership.has_all_properties, "propertyIds": list(membership.property_accesses.values_list("property_id", flat=True)), "user": {"id": membership.user_id, "email": membership.user.email, "firstName": membership.user.first_name, "lastName": membership.user.last_name}}


def build_team_payload(*, organization: Organization, actor: ClerkUser) -> dict:
    actor_membership = Membership.objects.filter(
        organization=organization, user=actor, is_active=True
    ).first()
    properties = organization.properties.filter(is_active=True)
    if actor_membership is not None and not actor_membership.has_all_properties:
        properties = properties.filter(membership_accesses__membership=actor_membership)
    properties = list(properties.order_by("name", "id"))
    members = organization.memberships.select_related("user").prefetch_related("property_accesses").order_by("user__email", "id")
    return {"organization": {"id": organization.id, "name": organization.name, "slug": organization.slug}, "properties": [{"id": p.id, "name": p.name, "slug": p.slug} for p in properties], "subscription": build_subscription_payload(getattr(organization, "subscription", None)), "members": [team_member_payload(m) for m in members]}
