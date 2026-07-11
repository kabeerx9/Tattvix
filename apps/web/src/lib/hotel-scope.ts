import type { Membership, MeResponse } from "@tattvix/contracts";

export function findAccessibleMembership(
  currentUser: MeResponse | null,
  organizationSlug: string,
) {
  return currentUser?.memberships.find(
    (membership) =>
      membership.organization.slug === organizationSlug &&
      membership.permissions.includes("hotel:view"),
  );
}

export function findAccessibleProperty(
  membership: Membership,
  propertySlug: string,
) {
  return membership.properties.find((property) => property.slug === propertySlug);
}

export function getFirstAccessibleHotelScope(currentUser: MeResponse | null) {
  const membership = currentUser?.memberships.find((item) =>
    item.permissions.includes("hotel:view"),
  );
  const property = membership?.properties[0];

  return membership && property ? { membership, property } : null;
}
