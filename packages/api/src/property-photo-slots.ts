// The hotel's photo grid, shared by web and native: one cover slot, then one slot
// per room type, each with its saved photo; and the line that counts them.
import type { PropertyPhotoSlot, PropertyPhotosResponse } from "@tattvix/contracts";

export type PhotoSlotView = {
  /** Stable id for the slot, to match an upload in flight to its tile. */
  key: string;
  label: string;
  slot: PropertyPhotoSlot;
  /** The saved photo's signed URL, or null when none is saved. */
  url: string | null;
};

export function photoSlotKey(slot: PropertyPhotoSlot) {
  return slot.kind === "COVER" ? "COVER" : `ROOM_TYPE:${slot.roomType}`;
}

/** Cover first, then each room type in name order. Room types come from the rooms; blanks become one "Unnamed" slot. */
export function propertyPhotoSlots(photos: PropertyPhotosResponse | undefined, roomTypes: (string | null | undefined)[]): PhotoSlotView[] {
  const cover: PropertyPhotoSlot = { kind: "COVER" };
  const types = [...new Set(roomTypes.map((roomType) => roomType ?? ""))].sort();
  return [
    { key: photoSlotKey(cover), label: "Cover photo", slot: cover, url: photos?.cover?.url ?? null },
    ...types.map((roomType) => {
      const slot: PropertyPhotoSlot = { kind: "ROOM_TYPE", roomType };
      return {
        key: photoSlotKey(slot),
        label: roomType || "Unnamed room type",
        slot,
        url: photos?.roomTypes.find((photo) => photo.roomType === roomType)?.url ?? null,
      };
    }),
  ];
}

/** "3 of 4 added", or "All 4 added". */
export function photoSlotsSummary(slots: PhotoSlotView[]) {
  const added = slots.filter((slot) => slot.url).length;
  return added === slots.length ? `All ${slots.length} added` : `${added} of ${slots.length} added`;
}

/** What a finished upload says: "Cover photo saved", "Deluxe photo saved". */
export function photoSavedMessage(label: string) {
  return label === "Cover photo" ? "Cover photo saved" : `${label} photo saved`;
}
