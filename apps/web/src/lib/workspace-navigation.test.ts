import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MeResponse } from "@tattvix/contracts";
import {
  getActiveHotelContext,
  getHotelNavItems,
  getActiveWorkspace,
  getPersonalNavItems,
  getPlatformNavItems,
  isAccountPath,
  splitHotelNavForTabBar,
  splitNavForTabBar,
  splitPersonalNavForTabBar,
  splitPlatformNavForTabBar,
} from "./workspace-navigation";

const TRIAL_SUBSCRIPTION = {
  status: "TRIALING",
  entitled: true,
  trialEndsAt: "2026-12-08T00:00:00Z",
  paidUntil: null,
  entitledUntil: "2026-12-08T00:00:00Z",
  daysLeft: 45,
} as const;

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
      subscription: TRIAL_SUBSCRIPTION,
      permissions: ["hotel:view"],
      organization: { id: 1, name: "First", slug: "first" },
      properties: [{ id: 1, name: "Main", slug: "main" }],
    },
    {
      id: 2,
      role: "OWNER",
      hasAllProperties: true,
      subscription: TRIAL_SUBSCRIPTION,
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

describe("mobile tab bar", () => {
  const context = getActiveHotelContext(user, "/hotel/first/main")!;
  const withReports = {
    ...context,
    membership: {
      ...context.membership,
      permissions: [...context.membership.permissions, "reports:view" as const],
    },
  };
  it("gives the four everyday pages a tab and the rest to Menu", () => {
    const { tabs, overflow } = splitHotelNavForTabBar(
      getHotelNavItems(withReports, "/hotel/first/main/dashboard"),
    );
    assert.deepEqual(tabs.map((item) => item.key), ["overview", "stays", "rooms", "guests"]);
    assert.deepEqual(overflow.map((item) => item.key), ["reports", "settings"]);
  });
  it("keeps reports out of the Menu without permission", () => {
    const { overflow } = splitHotelNavForTabBar(
      getHotelNavItems(context, "/hotel/first/main/dashboard"),
    );
    assert.deepEqual(overflow.map((item) => item.key), ["settings"]);
  });
  it("lights Menu only when a menu page is open", () => {
    const onDetails = splitHotelNavForTabBar(getHotelNavItems(context, "/hotel/first/main/details"));
    assert.equal(onDetails.menuActive, true);
    assert.equal(onDetails.tabs.some((item) => item.isActive), false);
    const onRooms = splitHotelNavForTabBar(getHotelNavItems(context, "/hotel/first/main/rooms"));
    assert.equal(onRooms.menuActive, false);
  });
  it("uses short labels where space is tight", () => {
    const settings = getHotelNavItems(context, "/hotel/first/main").find((item) => item.key === "settings");
    assert.equal(settings?.label, "Property settings");
    assert.equal(settings?.shortLabel, "Settings");
  });
});

describe("personal navigation", () => {
  it("lists the guest pages and marks nested stay pages under My stays", () => {
    const items = getPersonalNavItems("/stays/abc-123");
    assert.deepEqual(items.map((item) => item.to), [
      "/guest",
      "/stays",
      "/profile",
      "/companions",
      "/privacy",
      "/register-hotel",
    ]);
    assert.deepEqual(items.filter((item) => item.isActive).map((item) => item.key), ["stays"]);
  });
  it("does not light a page for a lookalike URL", () => {
    assert.equal(getPersonalNavItems("/stays-archive").some((item) => item.isActive), false);
  });
  it("gives four everyday pages a tab and the rest to Menu", () => {
    const { tabs, overflow, menuActive } = splitPersonalNavForTabBar(getPersonalNavItems("/privacy"));
    assert.deepEqual(tabs.map((item) => item.shortLabel), ["Overview", "Stays", "Profile", "Companions"]);
    assert.deepEqual(overflow.map((item) => item.key), ["privacy", "register"]);
    assert.equal(menuActive, true);
  });
  it("treats account settings as a Menu page", () => {
    assert.equal(isAccountPath("/settings"), true);
    assert.equal(isAccountPath("/settings/extra"), false);
    assert.equal(getPersonalNavItems("/settings").some((item) => item.isActive), false);
  });
});

describe("platform navigation", () => {
  it("keeps Hotels lit on pages reached from the portfolio", () => {
    for (const pathname of ["/admin", "/admin/first", "/admin/oversight", "/admin/onboard"]) {
      const active = getPlatformNavItems(pathname).filter((item) => item.isActive);
      assert.deepEqual(active.map((item) => item.key), ["hotels"], pathname);
    }
  });
  it("lights only Requests on the requests page", () => {
    const active = getPlatformNavItems("/admin/requests").filter((item) => item.isActive);
    assert.deepEqual(active.map((item) => item.key), ["requests"]);
  });
  it("gives both pages a tab, leaving Menu for workspaces and account", () => {
    const { tabs, overflow, menuActive } = splitPlatformNavForTabBar(getPlatformNavItems("/admin"));
    assert.deepEqual(tabs.map((item) => item.shortLabel), ["Hotels", "Requests"]);
    assert.equal(overflow.length, 0);
    assert.equal(menuActive, false);
  });
});

describe("tab bar split", () => {
  it("keeps the nav order and ignores tab keys that are not present", () => {
    const items = [
      { key: "a", isActive: false },
      { key: "b", isActive: true },
      { key: "c", isActive: false },
    ];
    const { tabs, overflow, menuActive } = splitNavForTabBar(items, ["c", "a", "missing"]);
    assert.deepEqual(tabs.map((item) => item.key), ["a", "c"]);
    assert.deepEqual(overflow.map((item) => item.key), ["b"]);
    assert.equal(menuActive, true);
  });
});
