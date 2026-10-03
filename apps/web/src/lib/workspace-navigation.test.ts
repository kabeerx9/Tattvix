import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MeResponse } from "@tattvix/contracts";
import {
  getActiveHotelContext,
  getHotelNavItems,
  getActiveWorkspace,
  getHotelDestination,
} from "./workspace-navigation";

const user: MeResponse = {
  id: 1,
  clerkId: "user_owner",
  email: "owner@example.com",
  firstName: "Hotel",
  lastName: "Owner",
  username: "",
  imageUrl: "",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  lastSyncedAt: null,
  platformRole: null,
  platformPermissions: [],
  memberships: [
    {
      id: 1,
      role: "OWNER",
      hasAllProperties: true,
      permissions: ["hotel:view"],
      organization: { id: 1, name: "First", slug: "first" },
      properties: [{ id: 1, name: "Main", slug: "main" }],
    },
    {
      id: 2,
      role: "OWNER",
      hasAllProperties: true,
      permissions: ["hotel:view"],
      organization: { id: 2, name: "Second", slug: "second" },
      properties: [{ id: 2, name: "Branch", slug: "branch" }],
    },
  ],
};

describe("workspace navigation", () => {
  it("keeps personal, hotel and platform URLs in separate workspaces", () => {
    assert.equal(getActiveWorkspace("/profile"), "personal");
    assert.equal(getActiveWorkspace("/register-hotel"), "personal");
    assert.equal(getActiveWorkspace("/hotel/first/main/stays/5"), "hotel");
    assert.equal(getActiveWorkspace("/dashboard"), "hotel");
    assert.equal(getActiveWorkspace("/admin/requests"), "platform");
    assert.equal(getActiveWorkspace("/hotel-other"), "personal");
  });
  it("opens a single hotel directly and preserves the active authorized property", () => {
    assert.deepEqual(getHotelDestination(user, "/profile"), {
      to: "/hotel/$organizationSlug/$propertySlug/dashboard",
      params: { organizationSlug: "first", propertySlug: "main" },
    });
    assert.deepEqual(getHotelDestination(user, "/hotel/second/branch/rooms"), {
      to: "/hotel/$organizationSlug/$propertySlug/dashboard",
      params: { organizationSlug: "second", propertySlug: "branch" },
    });
  });
  it("does not use an inaccessible hotel or property from the URL", () => {
    assert.equal(
      getHotelDestination(user, "/hotel/secret/private/rooms").params
        ?.organizationSlug,
      "first",
    );
    assert.equal(
      getHotelDestination(user, "/hotel/second/secret/rooms").params
        ?.propertySlug,
      "branch",
    );
    const denied: MeResponse = {
      ...user,
      memberships: [{ ...user.memberships[0]!, permissions: [] }],
    };
    assert.deepEqual(getHotelDestination(denied, "/hotel/first/main"), {
      to: "/hotel",
    });
    assert.deepEqual(getHotelDestination(null, "/profile"), { to: "/hotel" });
  });
  it("allows owners with no properties to open their hotel setup", () => {
    const empty: MeResponse = {
      ...user,
      memberships: [{ ...user.memberships[0]!, properties: [] }],
    };
    assert.deepEqual(getHotelDestination(empty, "/profile"), {
      to: "/hotel/$organizationSlug",
      params: { organizationSlug: "first" },
    });
  });
});

describe("active hotel context", () => {
  it("returns no context outside a hotel URL", () => {
    assert.equal(getActiveHotelContext(user, "/hotel"), null);
    assert.equal(getActiveHotelContext(user, "/profile"), null);
    assert.equal(getActiveHotelContext(null, "/hotel/first/main"), null);
  });
  it("resolves the organization and property named in the URL", () => {
    const context = getActiveHotelContext(user, "/hotel/second/branch/rooms");
    assert.equal(context?.membership.organization.slug, "second");
    assert.equal(context?.property?.slug, "branch");
  });
  it("returns the organization without a property", () => {
    const context = getActiveHotelContext(user, "/hotel/first");
    assert.equal(context?.membership.organization.slug, "first");
    assert.equal(context?.property, null);
  });
  it("ignores organizations the user cannot view", () => {
    assert.equal(getActiveHotelContext(user, "/hotel/someone-else/main"), null);
    const noView: MeResponse = {
      ...user,
      memberships: [{ ...user.memberships[0], permissions: [] }],
    };
    assert.equal(getActiveHotelContext(noView, "/hotel/first/main"), null);
  });
});

describe("hotel navigation items", () => {
  const context = getActiveHotelContext(user, "/hotel/first/main/stays/abc")!;
  it("lists property pages in order and marks the active one", () => {
    const items = getHotelNavItems(context, "/hotel/first/main/stays/abc");
    assert.deepEqual(
      items.map((item) => item.key),
      ["overview", "stays", "rooms", "guests", "settings"],
    );
    assert.deepEqual(
      items.filter((item) => item.isActive).map((item) => item.key),
      ["stays"],
    );
  });
  it("maps the details route to property settings", () => {
    const items = getHotelNavItems(context, "/hotel/first/main/details");
    assert.equal(items.find((item) => item.isActive)?.label, "Property settings");
  });
  it("hides reports without permission", () => {
    const keys = getHotelNavItems(context, "/hotel/first/main").map((i) => i.key);
    assert.equal(keys.includes("reports"), false);
  });
  it("shows reports with permission", () => {
    const withReports = {
      ...context,
      membership: {
        ...context.membership,
        permissions: [...context.membership.permissions, "reports:view" as const],
      },
    };
    const keys = getHotelNavItems(withReports, "/hotel/first/main").map((i) => i.key);
    assert.deepEqual(keys, ["overview", "stays", "rooms", "guests", "reports", "settings"]);
  });
  it("returns no nav items without a property", () => {
    const orgOnly = getActiveHotelContext(user, "/hotel/first")!;
    assert.deepEqual(getHotelNavItems(orgOnly, "/hotel/first"), []);
  });
});
