import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { IdentityDocument } from "@tattvix/contracts";

import {
  documentNumberFieldProps,
  documentTypeHint,
  getExpiryStatus,
  maskDocumentNumber,
  photoSlots,
  showsExpiry,
  summarizeDocument,
  validateUploadFile,
} from "./document-model";

describe("validateUploadFile", () => {
  it("accepts JPEG, PNG and WebP up to 8 MB", () => {
    assert.equal(validateUploadFile({ type: "image/jpeg", size: 8 * 1024 * 1024 }), null);
    assert.equal(validateUploadFile({ type: "image/webp", size: 1 }), null);
  });

  it("rejects other formats and oversized files", () => {
    assert.equal(validateUploadFile({ type: "image/heic", size: 1 }), "Use a JPEG, PNG, or WebP image.");
    assert.equal(
      validateUploadFile({ type: "image/png", size: 8 * 1024 * 1024 + 1 }),
      "Image must be 8 MB or smaller.",
    );
  });
});

const today = "2026-10-22";

describe("photoSlots", () => {
  it("asks for front and back on Aadhaar, driving licence and voter ID", () => {
    assert.deepEqual(photoSlots("AADHAAR"), ["FRONT", "BACK"]);
    assert.deepEqual(photoSlots("DRIVING_LICENCE"), ["FRONT", "BACK"]);
    assert.deepEqual(photoSlots("VOTER_ID"), ["FRONT", "BACK"]);
  });

  it("asks for the photo page only on a passport", () => {
    assert.deepEqual(photoSlots("PASSPORT"), ["FRONT"]);
  });

  it("keeps a back photo visible when one was already uploaded", () => {
    assert.deepEqual(photoSlots("PASSPORT", true), ["FRONT", "BACK"]);
  });

  it("asks for the front only before a type is chosen", () => {
    assert.deepEqual(photoSlots(""), ["FRONT"]);
  });
});

describe("showsExpiry", () => {
  it("shows expiry for passport and driving licence", () => {
    assert.equal(showsExpiry("PASSPORT", null), true);
    assert.equal(showsExpiry("DRIVING_LICENCE", null), true);
  });

  it("hides expiry for Aadhaar unless a date is already saved", () => {
    assert.equal(showsExpiry("AADHAAR", null), false);
    assert.equal(showsExpiry("AADHAAR", "2030-01-01"), true);
  });
});

describe("documentTypeHint", () => {
  it("describes what each type needs", () => {
    assert.equal(documentTypeHint("AADHAAR"), "Front and back photos");
    assert.equal(documentTypeHint("PASSPORT"), "Photo page · expiry date");
    assert.equal(documentTypeHint("DRIVING_LICENCE"), "Front and back photos · expiry date");
  });
});

describe("documentNumberFieldProps", () => {
  it("opens the number pad for Aadhaar", () => {
    assert.equal(documentNumberFieldProps("AADHAAR").inputMode, "numeric");
  });

  it("capitalises alphanumeric numbers", () => {
    assert.equal(documentNumberFieldProps("PASSPORT").autoCapitalize, "characters");
    assert.equal(documentNumberFieldProps("PASSPORT").inputMode, "text");
  });
});

describe("maskDocumentNumber", () => {
  it("never shows more than the last four characters of an Aadhaar number", () => {
    const masked = maskDocumentNumber("4821 7730 1956");
    assert.equal(masked, "•••• 1956");
    assert.ok(!masked.includes("4821"));
    assert.ok(!masked.includes("7730"));
  });

  it("masks short numbers too", () => {
    assert.equal(maskDocumentNumber("AB1"), "•••• AB1");
  });

  it("says when no number was added", () => {
    assert.equal(maskDocumentNumber(""), "Number not added");
  });
});

describe("getExpiryStatus", () => {
  it("is none without a date", () => {
    assert.deepEqual(getExpiryStatus(null, today), { kind: "none" });
  });

  it("treats a document expiring today as expired, like the server", () => {
    assert.equal(getExpiryStatus("2026-10-22", today).kind, "expired");
    assert.equal(getExpiryStatus("2025-01-01", today).kind, "expired");
  });

  it("flags documents expiring within 30 days", () => {
    const tomorrow = getExpiryStatus("2026-10-23", today);
    assert.equal(tomorrow.kind, "expiring");
    assert.equal(tomorrow.kind === "expiring" && tomorrow.label, "Expires tomorrow");
    const edge = getExpiryStatus("2026-11-21", today);
    assert.equal(edge.kind === "expiring" && edge.days, 30);
  });

  it("is valid beyond 30 days", () => {
    const status = getExpiryStatus("2026-11-22", today);
    assert.equal(status.kind, "valid");
  });

  it("counts calendar days across a month boundary", () => {
    const status = getExpiryStatus("2026-03-01", "2026-02-27");
    assert.equal(status.kind === "expiring" && status.days, 2);
  });
});

function doc(overrides: Partial<IdentityDocument>): IdentityDocument {
  return {
    id: 1,
    documentType: "PASSPORT",
    documentNumber: "Z1234567",
    nameOnDocument: "Asha Rao",
    issuingCountry: "IN",
    expiryDate: "2031-01-01",
    requirements: { expiryDateRequired: true, backImageRequired: false },
    images: {
      front: { isUploaded: true, contentType: "image/jpeg", contentLength: 1 },
      back: { isUploaded: false, contentType: "", contentLength: null },
    },
    readiness: { isReady: true, missingFields: [] },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("summarizeDocument", () => {
  it("is ready when the server says so and expiry is far off", () => {
    assert.deepEqual(summarizeDocument(doc({}), today), { tone: "success", label: "Ready" });
  });

  it("leads with expired over missing items", () => {
    const summary = summarizeDocument(
      doc({ expiryDate: "2026-01-01", readiness: { isReady: false, missingFields: ["expiryDate"] } }),
      today,
    );
    assert.deepEqual(summary, { tone: "danger", label: "Expired" });
  });

  it("counts missing items on an incomplete document", () => {
    const summary = summarizeDocument(
      doc({ readiness: { isReady: false, missingFields: ["frontImage", "documentNumber"] } }),
      today,
    );
    assert.deepEqual(summary, { tone: "neutral", label: "2 items needed" });
  });

  it("warns when a ready document expires soon", () => {
    const summary = summarizeDocument(doc({ expiryDate: "2026-11-01" }), today);
    assert.equal(summary.tone, "warning");
    assert.equal(summary.label, "Expires in 10 days");
  });
});
