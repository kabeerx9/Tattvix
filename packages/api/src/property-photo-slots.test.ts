import assert from "node:assert/strict";
import { test } from "node:test";

import { photoSavedMessage, photoSlotsSummary, propertyPhotoSlots } from "./property-photo-slots";

const photos = { cover: { url: "https://cdn/cover.jpg" }, roomTypes: [{ roomType: "Suite", url: "https://cdn/suite.jpg" }] };

test("cover comes first, then each room type once, in name order", () => {
  const slots = propertyPhotoSlots(photos as never, ["Suite", "Deluxe", "Suite", null]);
  assert.deepEqual(slots.map((slot) => slot.label), ["Cover photo", "Unnamed room type", "Deluxe", "Suite"]);
  assert.deepEqual(slots.map((slot) => slot.url), ["https://cdn/cover.jpg", null, null, "https://cdn/suite.jpg"]);
  assert.equal(slots[3]!.key, "ROOM_TYPE:Suite");
});

test("the summary counts saved photos", () => {
  assert.equal(photoSlotsSummary(propertyPhotoSlots(photos as never, ["Suite", "Deluxe"])), "2 of 3 added");
  assert.equal(photoSlotsSummary(propertyPhotoSlots(photos as never, ["Suite"])), "All 2 added");
});

test("the saved message names the slot", () => {
  assert.equal(photoSavedMessage("Cover photo"), "Cover photo saved");
  assert.equal(photoSavedMessage("Deluxe"), "Deluxe photo saved");
});
