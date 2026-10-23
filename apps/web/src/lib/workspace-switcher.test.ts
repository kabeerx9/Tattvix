import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MeResponse, Permission } from "@tattvix/contracts";

import {
  buildSwitcherSections,
  filterRecentPlaces,
  getCurrentPlace,
  getSwitchPlaces,
  hasPlaceSwitcher,
  makeRoomForPlaceTab,
  matchesPlaceQuery,
  needsPlaceSearch,
  pushRecentPlace,
  SWITCHER_SEARCH_THRESHOLD,
} from "./workspace-switcher";

const view: Permission[] = ["hotel:view"];
let nextId = 100;
function membership(
  org: { id: number; name: string; slug: string },
  properties: { id: number; name: string; slug: string }[],
  permissions: Permission[] = view,
  role: "OWNER" | "MANAGER" | "RECEPTION" = "OWNER",
): MeResponse["memberships"][number] {
  return { id: nextId++, role, hasAllProperties: role === "OWNER", permissions, organization: org, properties };
}
function me(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    id: 7,
    clerkId: "user_7",
    email: "neha@example.com",
    firstName: "Neha",
    lastName: "Sharma",
    username: "",
    imageUrl: "",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    lastSyncedAt: null,
    platformRole: null,
    platformPermissions: [],
    memberships: [],
    ...overrides,
  };
}

const rajwada = { id: 1, name: "Rajwada Hospitality", slug: "rajwada" };
const himalayan = { id: 2, name: "Himalayan Inns", slug: "himalayan" };
const twoOrgs = me({
  memberships: [
    membership(rajwada, [
      { id: 11, name: "Umaid Niwas Haveli", slug: "umaid" },
      { id: 12, name: "Lakeview Residency", slug: "lakeview" },
    ]),
    membership(himalayan, [{ id: 21, name: "The Ridge", slug: "ridge" }], ["hotel:view", "stays:view"], "RECEPTION"),
  ],
});
const keys = (places: { key: string }[]) => places.map((place) => place.key);

describe("getSwitchPlaces", () => {
  it("gives a guest-only account the switcher: Personal, then List your hotel", () => {
    const places = getSwitchPlaces(me());
    assert.deepEqual(keys(places), ["personal", "register"]);
    assert.equal(hasPlaceSwitcher(places), true);
    assert.deepEqual(places[1]!.home, { to: "/register-hotel" });
    assert.equal(places[1]!.label, "List your hotel");
    assert.deepEqual(
      buildSwitcherSections(places, { currentKey: "personal" }).map((section) => [section.key, keys(section.places)]),
      [
        ["you", ["personal"]],
        ["register", ["register"]],
      ],
    );
    assert.equal(getCurrentPlace(places, me(), "/register-hotel")?.key, "personal");
  });

  it("shows a pending hotel request instead of List your hotel", () => {
    const [, entry] = getSwitchPlaces(me(), { hotelRequestPending: true });
    assert.equal(entry!.label, "Hotel request pending");
    assert.deepEqual(entry!.home, { to: "/register-hotel" });
  });

  it("offers List your hotel only to accounts with no hotel and no platform access", () => {
    assert.equal(getSwitchPlaces(twoOrgs).some((place) => place.kind === "register"), false);
    assert.equal(getSwitchPlaces(me({ platformPermissions: ["platform:admin"] })).some((place) => place.kind === "register"), false);
    const viewless = me({
      memberships: [membership({ id: 3, name: "Hidden", slug: "hidden" }, [{ id: 31, name: "Hidden Inn", slug: "hidden-inn" }], ["stays:view"])],
    });
    assert.deepEqual(keys(getSwitchPlaces(viewless)), ["personal", "register"]);
  });

  it("has no switcher while signed out", () => {
    assert.deepEqual(getSwitchPlaces(null), []);
    assert.equal(hasPlaceSwitcher([]), false);
  });

  it("orders Personal, Platform, then hotels in membership order", () => {
    const admin = me({ ...twoOrgs, platformRole: "SUPER_ADMIN", platformPermissions: ["platform:admin"] });
    assert.deepEqual(keys(getSwitchPlaces(admin)), ["personal", "platform", "property:11", "property:12", "property:21"]);
  });

  it("lists only memberships with hotel:view and never Platform without platform:admin", () => {
    const user = me({
      memberships: [
        membership({ id: 3, name: "Hidden", slug: "hidden" }, [{ id: 31, name: "Hidden Inn", slug: "hidden-inn" }], ["stays:view"]),
        membership(rajwada, [{ id: 11, name: "Umaid Niwas Haveli", slug: "umaid" }]),
      ],
    });
    assert.deepEqual(keys(getSwitchPlaces(user)), ["personal", "property:11"]);
  });

  it("maps each place to its home: My stays, Hotels, a property's Today, an empty org's setup", () => {
    const user = me({
      platformPermissions: ["platform:admin"],
      memberships: [
        membership(rajwada, [{ id: 11, name: "Umaid Niwas Haveli", slug: "umaid" }]),
        membership({ id: 4, name: "New Group", slug: "new-group" }, []),
      ],
    });
    const homes = Object.fromEntries(getSwitchPlaces(user).map((place) => [place.key, [place.home, place.homeLabel]]));
    assert.deepEqual(homes, {
      personal: [{ to: "/stays" }, "My stays"],
      platform: [{ to: "/admin" }, "Hotels"],
      "property:11": [
        { to: "/hotel/$organizationSlug/$propertySlug/dashboard", params: { organizationSlug: "rajwada", propertySlug: "umaid" } },
        "Today",
      ],
      "organization:4": [{ to: "/hotel/$organizationSlug", params: { organizationSlug: "new-group" } }, "Setup"],
    });
  });

  it("describes a property by organization and role, without repeating a same-named organization", () => {
    const solo = me({ memberships: [membership({ id: 5, name: "Solo Inn", slug: "solo" }, [{ id: 51, name: "Solo Inn", slug: "solo" }])] });
    assert.equal(getSwitchPlaces(solo)[1]!.detail, "Owner");
    assert.equal(getSwitchPlaces(twoOrgs)[3]!.detail, "Himalayan Inns · Reception");
  });
});

describe("getCurrentPlace", () => {
  const places = getSwitchPlaces(me({ ...twoOrgs, platformPermissions: ["platform:admin"] }));
  const user = me({ ...twoOrgs, platformPermissions: ["platform:admin"] });
  it("reads the place from the URL", () => {
    assert.equal(getCurrentPlace(places, user, "/stays")?.key, "personal");
    assert.equal(getCurrentPlace(places, user, "/admin/requests")?.key, "platform");
    assert.equal(getCurrentPlace(places, user, "/hotel/himalayan/ridge/rooms")?.key, "property:21");
  });
  it("is null where no single accessible place applies", () => {
    assert.equal(getCurrentPlace(places, user, "/hotel"), null);
    assert.equal(getCurrentPlace(places, user, "/hotel/secret/inn/dashboard"), null);
    assert.equal(getCurrentPlace(getSwitchPlaces(twoOrgs), twoOrgs, "/admin"), null);
  });
});

describe("matchesPlaceQuery", () => {
  const [personal, umaid, , ridge] = getSwitchPlaces(twoOrgs);
  it("matches the name, organization and role, case-insensitively, every word", () => {
    assert.equal(matchesPlaceQuery(umaid!, "UMAID"), true);
    assert.equal(matchesPlaceQuery(umaid!, "rajwada haveli"), true);
    assert.equal(matchesPlaceQuery(umaid!, "rajwada ridge"), false);
    assert.equal(matchesPlaceQuery(ridge!, "himalayan reception"), true);
    assert.equal(matchesPlaceQuery(personal!, "stays"), true);
    assert.equal(matchesPlaceQuery(ridge!, "   "), true);
  });
});

describe("recent places", () => {
  const places = getSwitchPlaces(twoOrgs);
  it("drops ids the user can no longer open, duplicates, non-strings and Personal/Platform", () => {
    const recent = filterRecentPlaces(["property:99", "property:21", 21, "personal", "platform", "property:21", "property:11"], places);
    assert.deepEqual(keys(recent), ["property:21", "property:11"]);
  });
  it("moves a reopened place to the front and caps the list", () => {
    assert.deepEqual(pushRecentPlace(["a", "b", "c", "d"], "c"), ["c", "a", "b", "d"]);
    assert.deepEqual(pushRecentPlace(["a", "b", "c", "d"], "e"), ["e", "a", "b", "c"]);
  });
});

describe("buildSwitcherSections", () => {
  const many = me({
    platformPermissions: ["platform:admin"],
    memberships: [
      membership(rajwada, Array.from({ length: 5 }, (_, i) => ({ id: 60 + i, name: `Rajwada ${i}`, slug: `r${i}` }))),
      membership(himalayan, Array.from({ length: 3 }, (_, i) => ({ id: 70 + i, name: `Hill ${i}`, slug: `h${i}` }))),
    ],
  });
  const manyPlaces = getSwitchPlaces(many);

  it("puts you first, then hotels grouped by organization", () => {
    const sections = buildSwitcherSections(getSwitchPlaces(twoOrgs), { recentKeys: ["property:21"] });
    assert.deepEqual(
      sections.map((section) => [section.title, keys(section.places)]),
      [
        [null, ["personal"]],
        ["Rajwada Hospitality", ["property:11", "property:12"]],
        ["Himalayan Inns", ["property:21"]],
      ],
    );
    assert.equal(needsPlaceSearch(getSwitchPlaces(twoOrgs)), false);
  });

  it(`adds search and Recent once there are ${SWITCHER_SEARCH_THRESHOLD}+ hotels, without the current place`, () => {
    assert.equal(needsPlaceSearch(manyPlaces), true);
    const sections = buildSwitcherSections(manyPlaces, {
      recentKeys: ["property:70", "property:61", "property:999", "property:62", "property:63"],
      currentKey: "property:61",
    });
    assert.deepEqual(sections.map((section) => section.title), [null, "Recent", "Rajwada Hospitality", "Himalayan Inns"]);
    assert.deepEqual(keys(sections[0]!.places), ["personal", "platform"]);
    assert.deepEqual(keys(sections[1]!.places), ["property:70", "property:62", "property:63"]);
  });

  it("hides Recent and empty groups while searching", () => {
    const sections = buildSwitcherSections(manyPlaces, { query: "hill 2", recentKeys: ["property:60"] });
    assert.deepEqual(sections.map((section) => [section.title, keys(section.places)]), [["Himalayan Inns", ["property:72"]]]);
    assert.deepEqual(buildSwitcherSections(manyPlaces, { query: "nowhere" }), []);
  });
});

describe("makeRoomForPlaceTab", () => {
  it("keeps three section tabs and moves the rest behind Menu", () => {
    const item = (key: string, isActive = false) => ({ key, isActive });
    const result = makeRoomForPlaceTab({ tabs: [item("a"), item("b"), item("c"), item("d", true)], overflow: [item("e")] });
    assert.deepEqual(result.tabs.map((tab) => tab.key), ["a", "b", "c"]);
    assert.deepEqual(result.overflow.map((tab) => tab.key), ["d", "e"]);
    assert.equal(result.menuActive, true);
  });
});
