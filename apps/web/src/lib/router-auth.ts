import type { MeResponse, Permission } from "@tattvix/contracts";

export type RouterAuthContext = {
  isAuthenticated: boolean;
  currentUser: MeResponse | null;
};

export function hasPlatformPermission(
  auth: RouterAuthContext,
  permission: Permission,
) {
  return auth.currentUser?.platformPermissions.includes(permission) ?? false;
}

export function hasAnyHotelPermission(
  auth: RouterAuthContext,
  permission: Permission,
) {
  return (
    auth.currentUser?.memberships.some((membership) =>
      membership.permissions.includes(permission),
    ) ?? false
  );
}
