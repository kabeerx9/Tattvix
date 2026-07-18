import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  identityDocumentInputSchema,
  identityDocumentSchema,
  identityDocumentUploadResponseSchema,
} from "./identity-document";

describe("identity document contracts", () => {
  it("normalizes issuing country while allowing an incomplete draft", () => {
    const parsed = identityDocumentInputSchema.parse({
      documentType: "",
      documentNumber: "",
      nameOnDocument: "",
      issuingCountry: "in",
      expiryDate: null,
    });

    assert.equal(parsed.issuingCountry, "IN");
    assert.equal(parsed.documentType, "");
  });

  it("accepts server-computed image requirements and readiness", () => {
    const parsed = identityDocumentSchema.parse({
      id: 1,
      documentType: "PASSPORT",
      documentNumber: "P1234567",
      nameOnDocument: "Kabeer Joshi",
      issuingCountry: "IN",
      expiryDate: "2030-04-12",
      requirements: {
        expiryDateRequired: true,
        backImageRequired: false,
      },
      images: {
        front: {
          isUploaded: true,
          contentType: "image/jpeg",
          contentLength: 2048,
        },
        back: {
          isUploaded: false,
          contentType: "",
          contentLength: null,
        },
      },
      readiness: {
        isReady: true,
        missingFields: [],
      },
      createdAt: "2026-07-18T10:00:00Z",
      updatedAt: "2026-07-18T10:00:00Z",
    });

    assert.equal(parsed.readiness.isReady, true);
    assert.equal(parsed.images.front.isUploaded, true);
  });

  it("requires a private upload response to be short lived", () => {
    const parsed = identityDocumentUploadResponseSchema.safeParse({
      objectKey: "users/1/identity-documents/1/front/upload.jpg",
      url: "http://127.0.0.1:9000/private/signed",
      method: "PUT",
      headers: {
        "Content-Type": "image/jpeg",
      },
      expiresInSeconds: 901,
    });

    assert.equal(parsed.success, false);
  });

  it("rejects unsupported document and file types", () => {
    assert.equal(
      identityDocumentInputSchema.safeParse({
        documentType: "PAN_CARD",
        documentNumber: "ABCDE1234F",
        nameOnDocument: "Kabeer Joshi",
        issuingCountry: "IN",
        expiryDate: null,
      }).success,
      false,
    );
  });
});
