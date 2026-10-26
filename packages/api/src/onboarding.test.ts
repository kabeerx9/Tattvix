import assert from "node:assert/strict";
import { test } from "node:test";
import type { GuestProfileResponse, HotelRoom, PropertyDetails } from "@tattvix/contracts";
import { getGuestOnboarding, getHotelOnboarding, onboardingStorageKey } from "./onboarding";

const profile = (missingFields: GuestProfileResponse["readiness"]["missingFields"]): GuestProfileResponse => ({
  profile: { legalFirstName: "", legalLastName: "", phoneNumber: "", dateOfBirth: null,
    nationality: "", addressLine1: "", addressLine2: "", city: "", stateRegion: "",
    postalCode: "", country: "", emergencyContactName: "", emergencyContactPhone: "" },
  readiness: { isReady: missingFields.length === 0, missingFields }, updatedAt: null,
});
const details: PropertyDetails = { address: "1 Station Road", contactPhone: "+919876543210",
  checkInTime: "14:00", checkOutTime: "11:00", description: "", amenities: [],
  currency: "INR", nightlyRateFromMinor: null, nightlyRateToMinor: null };
const room = (overrides: Partial<HotelRoom> = {}): HotelRoom => ({
  id: 1, number: "101", floor: "1", roomType: "Double", status: "VACANT", isActive: true,
  nightlyRateMinor: 250000, ...overrides,
});
const hotel = (rooms: HotelRoom[], overrides: Partial<Parameters<typeof getHotelOnboarding>[0]> = {}) =>
  getHotelOnboarding({ details, rooms, canManageHotel: true, canManageRooms: true, ...overrides });

test("guest progress distinguishes saved profile from complete identity", () => {
  const blank = getGuestOnboarding(profile(["legalFirstName", "identityDocuments"]));
  assert.equal(blank.completedCount, 0);
  assert.equal(blank.nextStepId, "profile");
  assert.equal(blank.isComplete, false);
  const awaitingId = getGuestOnboarding(profile(["identityDocuments"]));
  assert.equal(awaitingId.completedCount, 1);
  assert.equal(awaitingId.nextStepId, "identity");
  const idFirst = getGuestOnboarding(profile(["addressLine1"]));
  assert.deepEqual(idFirst.steps.map((s) => s.isComplete), [false, true]);
  assert.equal(idFirst.nextStepId, "profile");
  const ready = getGuestOnboarding(profile([]));
  assert.equal(ready.isComplete, true);
  assert.equal(ready.completedCount, ready.totalCount);
  assert.equal(ready.nextStepId, null);
});

test("progress follows saved readiness again when details are removed", () => {
  assert.equal(getGuestOnboarding(profile([])).isComplete, true);
  assert.equal(getGuestOnboarding(profile(["identityDocuments"])).isComplete, false);
  assert.equal(hotel([room()])?.isComplete, true);
  assert.equal(hotel([room({ nightlyRateMinor: null })])?.isComplete, false);
});

test("hotel needs active rooms and every active room rate; zero is a saved rate", () => {
  for (const rooms of [[], [room({ isActive: false })]]) {
    const guide = hotel(rooms)!;
    assert.deepEqual(guide.steps.map((s) => s.isComplete), [true, false, false]);
    assert.equal(guide.nextStepId, "rooms");
  }
  const unset = hotel([room(), room({ id: 2, nightlyRateMinor: null })])!;
  assert.equal(unset.nextStepId, "rates");
  assert.equal(unset.isComplete, false);
  assert.equal(hotel([room({ nightlyRateMinor: 0 })])?.isComplete, true);
  assert.equal(hotel([room(), room({ isActive: false, nightlyRateMinor: null })])?.isComplete, true);
});

test("property setup requires each practical contact and arrival field, not decoration", () => {
  for (const field of ["address", "contactPhone", "checkInTime", "checkOutTime"] as const) {
    const guide = hotel([room()], { details: { ...details, [field]: "  " } })!;
    assert.equal(guide.isComplete, false, field);
    assert.equal(guide.nextStepId, "property", field);
  }
  assert.equal(hotel([room()])?.isComplete, true);
});

test("hotel tasks follow permissions and omit work that a staff member cannot manage", () => {
  assert.equal(hotel([], { canManageHotel: false, canManageRooms: false }), null);
  const propertyOnly = hotel([], { canManageRooms: false })!;
  assert.deepEqual(propertyOnly.steps.map((s) => s.id), ["property"]);
  assert.equal(propertyOnly.isComplete, true);
  const roomsOnly = hotel([], { canManageHotel: false })!;
  assert.deepEqual(roomsOnly.steps.map((s) => s.id), ["rooms", "rates"]);
  assert.equal(roomsOnly.isComplete, false);
});

test("dismissal keys isolate account, personal scope and properties without unsafe storage characters", () => {
  const keys = [onboardingStorageKey("user_1", "guest"), onboardingStorageKey("user_2", "guest"),
    onboardingStorageKey("user_1", "property:1"), onboardingStorageKey("user_1", "property:2"),
    onboardingStorageKey("user/a", "guest"), onboardingStorageKey("user_a", "guest")];
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(onboardingStorageKey("user_1", "guest"), keys[0]);
  for (const key of keys) assert.match(key, /^[A-Za-z0-9._-]+$/);
});
