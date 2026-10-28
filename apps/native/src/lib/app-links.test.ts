import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAppLinkPath } from "./app-links";

describe("resolveAppLinkPath", () => {
  it("leaves custom-scheme links to the router", () => {
    assert.equal(resolveAppLinkPath("tattwix://check-in/abc"), null);
    assert.equal(resolveAppLinkPath("exp+tattwix://hotel/acme/main/stays"), null);
  });

  it("returns null for unparsable input", () => {
    assert.equal(resolveAppLinkPath("not a url"), null);
    assert.equal(resolveAppLinkPath(""), null);
  });

  it("sends http(s) links to other hosts to the landing", () => {
    assert.equal(resolveAppLinkPath("https://example.com/check-in/abc"), "/");
    assert.equal(resolveAppLinkPath("https://tattwix.in.evil.com/hotel/a/b"), "/");
  });

  it("maps a guest check-in link to its route, ignoring trailing slash, query and hash", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/check-in/tok123"), "/check-in/tok123");
    assert.equal(resolveAppLinkPath("https://tattwix.in/check-in/tok123/"), "/check-in/tok123");
    assert.equal(resolveAppLinkPath("https://www.tattwix.in/check-in/tok123?x=1#top"), "/check-in/tok123");
  });

  it("sends a bare or multi-segment check-in link to the landing", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/check-in"), "/");
    assert.equal(resolveAppLinkPath("https://tattwix.in/check-in/"), "/");
    assert.equal(resolveAppLinkPath("https://tattwix.in/check-in/a/b"), "/");
  });

  it("sends hotel landing links to the landing", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel"), "/");
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme"), "/");
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/"), "/");
  });

  it("maps a property dashboard link to the hotel group", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main"), "/(hotel)/acme/main");
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/dashboard"), "/(hotel)/acme/main");
  });

  it("maps stays and stay detail links", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/stays"), "/(hotel)/acme/main/stays");
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/stays/s42"), "/(hotel)/acme/main/stays/s42");
  });

  it("sends the retired guests page to stays", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/guests"), "/(hotel)/acme/main/stays");
  });

  it("maps rooms, reports, reviews and details", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/reviews"), "/(hotel)/acme/main/reviews");
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/rooms"), "/(hotel)/acme/main/rooms");
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/reports"), "/(hotel)/acme/main/reports");
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/details"), "/(hotel)/acme/main/details");
  });

  it("maps personal and property getting-started links", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/getting-started"), "/(guest)/getting-started");
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/getting-started"), "/(hotel)/acme/main/getting-started");
  });

  it("falls back to the property dashboard for pages without a native screen", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/reservations"), "/(hotel)/acme/main");
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/stays/s42/extra"), "/(hotel)/acme/main");
    assert.equal(resolveAppLinkPath("https://tattwix.in/hotel/acme/main/guests/g1"), "/(hotel)/acme/main");
  });

  it("sends other tattwix.in paths to the landing", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/"), "/");
    assert.equal(resolveAppLinkPath("https://tattwix.in/pricing"), "/");
  });

  it("keeps segments as written, without decoding", () => {
    assert.equal(resolveAppLinkPath("https://tattwix.in/check-in/a%20b"), "/check-in/a%20b");
  });
});
