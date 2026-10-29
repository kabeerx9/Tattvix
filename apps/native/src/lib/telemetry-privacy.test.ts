import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UploadStepError } from "@tattvix/api";
import { ApiError } from "@tattvix/contracts";

import { redactSecrets, scrubBreadcrumb, scrubEvent, scrubUrl, shouldReportError, uploadFailureTags } from "./telemetry-privacy";

const API = "https://api.tattwix.in";
const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdefg"; // 43 URL-safe chars

describe("redactSecrets", () => {
  it("replaces check-in path tokens, bare tokens, bearer tokens and emails", () => {
    assert.equal(redactSecrets(`https://tattwix.in/check-in/${TOKEN}?x=1`), "https://tattwix.in/check-in/[token]?x=1");
    assert.equal(redactSecrets(`token ${TOKEN} here`), "token [token] here");
    assert.equal(redactSecrets("Authorization: Bearer eyJhbGciOi.payload.sig"), "Authorization: Bearer [token]");
    assert.equal(redactSecrets("guest asha.joshi+stay@example.co.in signed in"), "guest [email] signed in");
  });

  it("leaves ordinary text alone", () => {
    assert.equal(redactSecrets("Room 204 could not load (error 503)"), "Room 204 could not load (error 503)");
  });
});

describe("scrubUrl", () => {
  it("drops the query string and fragment and keeps the API path", () => {
    assert.equal(scrubUrl(`${API}/api/hotel/stays?page=2#top`, API), `${API}/api/hotel/stays`);
  });

  it("replaces a check-in token in the path", () => {
    assert.equal(scrubUrl(`${API}/api/check-in/${TOKEN}/`, API), `${API}/api/check-in/[token]/`);
  });

  it("keeps only the origin of a storage URL, hiding the object key and signature", () => {
    const signed = "https://tattwix-identity-documents.s3.ap-south-1.amazonaws.com/documents/42/front.jpg?X-Amz-Signature=abc";
    assert.equal(scrubUrl(signed, API), "https://tattwix-identity-documents.s3.ap-south-1.amazonaws.com/[path]");
  });

  it("falls back to redaction for a relative URL", () => {
    assert.equal(scrubUrl(`/check-in/${TOKEN}?a=1`), "/check-in/[token]");
    assert.equal(scrubUrl(""), "");
  });
});

describe("scrubBreadcrumb", () => {
  it("drops console breadcrumbs", () => {
    assert.equal(scrubBreadcrumb({ category: "console", message: "me { email: 'a@b.co' }" }), null);
  });

  it("keeps only method, scrubbed url and status on network breadcrumbs", () => {
    const crumb = scrubBreadcrumb(
      {
        type: "http",
        category: "fetch",
        message: "POST https://x",
        data: { method: "PUT", url: "https://bucket.s3.amazonaws.com/documents/1/front.jpg?X-Amz-Signature=s", status_code: 403, request_body_size: 10, response_body: "<xml/>" },
      },
      API,
    );
    assert.deepEqual(crumb?.data, { method: "PUT", url: "https://bucket.s3.amazonaws.com/[path]", status_code: 403 });
    assert.equal(crumb?.message, undefined);
  });

  it("redacts secrets and sensitive keys on other breadcrumbs", () => {
    const crumb = scrubBreadcrumb({ category: "navigation", data: { to: `/check-in/${TOKEN}`, params: { token: TOKEN }, note: "a@b.co" } });
    assert.deepEqual(crumb?.data, { to: "/check-in/[token]", params: { token: "[redacted]" }, note: "[email]" });
  });
});

describe("scrubEvent", () => {
  it("strips request bodies, headers, cookies and query strings and keeps a scrubbed url", () => {
    const event = scrubEvent(
      {
        request: { url: `${API}/api/check-in/${TOKEN}/?t=1`, headers: { Authorization: "Bearer x" }, cookies: "a=b", data: { legalFirstName: "Asha" }, query_string: "t=1", method: "POST" },
      },
      API,
    );
    assert.deepEqual(event.request, { method: "POST", url: `${API}/api/check-in/[token]/` });
  });

  it("reduces the user to an id and drops frame locals", () => {
    const event = scrubEvent({
      user: { id: "42", email: "a@b.co", username: "Asha" },
      exception: { values: [{ stacktrace: { frames: [{ filename: "app.js", vars: { email: "a@b.co" } }] }, value: `token ${TOKEN}` }] },
    });
    assert.deepEqual(event.user, { id: "42" });
    assert.deepEqual(event.exception.values[0]?.stacktrace?.frames?.[0], { filename: "app.js" });
    assert.equal(event.exception.values[0]?.value, "token [token]");
  });

  it("scrubs breadcrumbs inside the event", () => {
    const event = scrubEvent({ breadcrumbs: [{ category: "console", message: "x" }, { category: "ui.click", message: "Save asha@example.com" }] });
    assert.deepEqual(event.breadcrumbs, [{ category: "ui.click", message: "Save [email]" }]);
  });

  it("redacts sensitive keys anywhere in the event", () => {
    const event = scrubEvent({ extra: { authorization: "Bearer x", nested: { checkInToken: TOKEN, ok: "fine" } } });
    assert.deepEqual(event.extra, { authorization: "[redacted]", nested: { checkInToken: "[redacted]", ok: "fine" } });
  });
});

describe("shouldReportError", () => {
  it("skips expected 4xx API answers and reports 5xx", () => {
    for (const status of [400, 401, 402, 403, 404, 409]) assert.equal(shouldReportError(new ApiError(status, "no")), false, `status ${status}`);
    assert.equal(shouldReportError(new ApiError(500, "boom")), true);
    assert.equal(shouldReportError(new ApiError(503, "down")), true);
  });

  it("skips connectivity loss and reports unexpected exceptions", () => {
    assert.equal(shouldReportError(new TypeError("Network request failed")), false);
    assert.equal(shouldReportError(new Error("Cannot read property 'x' of undefined")), true);
    assert.equal(shouldReportError("string thrown"), true);
  });

  it("reports upload failures except our API's own 4xx, timeouts and no connection", () => {
    assert.equal(shouldReportError(new UploadStepError("authorize", new ApiError(400, "Photo too large"), { status: 400 })), false);
    assert.equal(shouldReportError(new UploadStepError("confirm", new ApiError(403, "Forbidden"), { status: 403 })), false);
    assert.equal(shouldReportError(new UploadStepError("send", null, { timedOut: true })), false);
    assert.equal(shouldReportError(new UploadStepError("authorize", new TypeError("Network request failed"))), false);
    assert.equal(shouldReportError(new UploadStepError("send", new ApiError(403, "", "SignatureDoesNotMatch"), { status: 403 })), true);
    assert.equal(shouldReportError(new UploadStepError("authorize", new ApiError(500, "boom"), { status: 500 })), true);
    assert.equal(shouldReportError(new UploadStepError("prepare", new Error("decode failed"))), true);
  });

  it("judges a wrapping error by the failure it wraps", () => {
    const benign = new UploadStepError("authorize", new ApiError(400, "Photo too large"), { status: 400 });
    assert.equal(shouldReportError(new Error("Photo too large", { cause: benign })), false);
    assert.equal(shouldReportError(new Error("boom", { cause: new ApiError(500, "boom") })), true);
  });
});

describe("uploadFailureTags", () => {
  it("names the step, status and storage code only", () => {
    const error = new UploadStepError("send", new ApiError(403, "", "SignatureDoesNotMatch"), { status: 403 });
    assert.deepEqual(uploadFailureTags(error), { upload_step: "send", upload_timed_out: "false", upload_status: "403", upload_code: "SignatureDoesNotMatch" });
    assert.deepEqual(uploadFailureTags(new UploadStepError("prepare", new Error("x"))), { upload_step: "prepare", upload_timed_out: "false" });
  });
});
