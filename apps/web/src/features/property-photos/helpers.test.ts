import assert from "node:assert/strict";
import test from "node:test";
import { getRoomTypePhotoUrl } from "./helpers";

test("room photo lookup is exact and omits absent imagery", () => {
  const photos = { cover: null, roomTypes: [{ roomType: "Deluxe", url: "https://storage.example/deluxe" }] };
  assert.equal(getRoomTypePhotoUrl(photos, "Deluxe"), "https://storage.example/deluxe");
  assert.equal(getRoomTypePhotoUrl(photos, "deluxe"), undefined);
  assert.equal(getRoomTypePhotoUrl(undefined, "Deluxe"), undefined);
  assert.equal(getRoomTypePhotoUrl(photos, null), undefined);
});
