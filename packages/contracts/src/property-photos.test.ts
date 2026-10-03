import assert from "node:assert/strict";
import test from "node:test";
import {
  propertyPhotoKindSchema, propertyPhotosResponseSchema,
  propertyPhotoUploadRequestSchema, propertyPhotoUploadResponseSchema,
  propertyPhotoSlotSchema,
} from "./hotel-operations";

test("photo payload accepts empty slots and URLs, rejects invalid URLs", () => {
  assert.deepEqual(propertyPhotosResponseSchema.parse({ cover: null, roomTypes: [] }), { cover: null, roomTypes: [] });
  assert.equal(propertyPhotosResponseSchema.safeParse({ cover: { url: "invalid" }, roomTypes: [] }).success, false);
  assert.equal(propertyPhotosResponseSchema.parse({ cover: { url: "https://storage.example/cover" }, roomTypes: [{ roomType: "Deluxe", url: "https://storage.example/room" }] }).roomTypes[0].roomType, "Deluxe");
});

test("photo upload validates kind, slot and positive size", () => {
  assert.equal(propertyPhotoKindSchema.safeParse("OTHER").success, false);
  assert.equal(propertyPhotoSlotSchema.safeParse({ kind: "COVER", roomType: "Deluxe" }).success, false);
  assert.equal(propertyPhotoUploadRequestSchema.safeParse({ kind: "COVER", contentType: "image/jpeg", contentLength: 0 }).success, false);
  assert.equal(propertyPhotoUploadRequestSchema.parse({ kind: "ROOM_TYPE", roomType: "Deluxe", contentType: "image/jpeg", contentLength: 100 }).contentLength, 100);
  assert.equal(propertyPhotoUploadResponseSchema.parse({ upload: { url: "https://storage.example/upload", method: "PUT", headers: {}, expiresInSeconds: 120 } }).upload.method, "PUT");
});
