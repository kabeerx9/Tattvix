// What this staff member may do at the desk, from their membership and the
// hotel's entitlement. A lapsed subscription (402) pauses every write except
// checkout, so no guest is ever stranded in a room. The server enforces all
// of this too; the UI only hides what would fail.
import type { HotelPlace } from "./workspace";
import { isReadOnly } from "./workspace";

export type DeskScope = {
  organizationSlug: string;
  propertySlug: string;
  readOnly: boolean;
  canAssign: boolean;
  canCheckout: boolean;
  canManageRooms: boolean;
};

export function getDeskScope(place: HotelPlace): DeskScope {
  const readOnly = isReadOnly(place);
  const has = (permission: string) => place.permissions.includes(permission as HotelPlace["permissions"][number]);
  return {
    organizationSlug: place.organizationSlug,
    propertySlug: place.propertySlug,
    readOnly,
    canAssign: has("rooms:assign") && !readOnly,
    canCheckout: has("stays:update"),
    canManageRooms: has("rooms:manage") && !readOnly,
  };
}
