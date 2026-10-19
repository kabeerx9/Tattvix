import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "@tattvix/contracts";

import {
  redactTokens,
  sanitizeUrl,
  scrubSentryEvent,
  shouldReportError,
} from "./telemetry-privacy";

// token_urlsafe(32): always 43 URL-safe characters.
const TOKEN = "Abc_-123def456GHI789jkl012MNO345pqr678STU90";

describe("sanitizeUrl", () => {
  it("replaces the check-in token and drops query and hash", () => {
    assert.equal(
      sanitizeUrl(`https://tattwix.in/check-in/${TOKEN}?utm=x#frag`),
      "https://tattwix.in/check-in/:token",
    );
  });

  it("drops a login redirect that carries the token in the query", () => {
    assert.equal(
      sanitizeUrl(`https://tattwix.in/login?redirect=/check-in/${TOKEN}`),
      "https://tattwix.in/login",
    );
  });

  it("keeps ordinary hotel paths readable", () => {
    assert.equal(
      sanitizeUrl("https://tattwix.in/stays/acme/beach-house"),
      "https://tattwix.in/stays/acme/beach-house",
    );
  });

  it("returns empty for an empty referrer", () => {
    assert.equal(sanitizeUrl(""), "");
  });
});

describe("redactTokens", () => {
  it("redacts a token outside of any URL", () => {
    assert.equal(redactTokens(`bad token ${TOKEN}`), "bad token [token]");
  });
});

describe("scrubSentryEvent", () => {
  it("removes the token everywhere and drops request extras", () => {
    const event = scrubSentryEvent({
      request: {
        url: `https://tattwix.in/check-in/${TOKEN}`,
        query_string: `redirect=/check-in/${TOKEN}`,
        headers: { Referer: `https://tattwix.in/check-in/${TOKEN}` },
        cookies: { __session: "x" },
      },
      breadcrumbs: [
        { category: "navigation", data: { to: `/check-in/${TOKEN}` } },
      ],
      exception: { values: [{ value: `Failed ${TOKEN}` }] },
    });

    assert.ok(!JSON.stringify(event).includes(TOKEN));
    assert.equal(event.request?.query_string, undefined);
    assert.equal(event.request?.headers, undefined);
    assert.equal(event.request?.cookies, undefined);
  });
});

describe("shouldReportError", () => {
  it("skips expected client errors such as an invalid QR", () => {
    assert.equal(shouldReportError(new ApiError(404, "invalid")), false);
    assert.equal(shouldReportError(new ApiError(403, "nope")), false);
  });

  it("reports server errors and unknown failures", () => {
    assert.equal(shouldReportError(new ApiError(500, "boom")), true);
    assert.equal(shouldReportError(new TypeError("x is undefined")), true);
  });
});
