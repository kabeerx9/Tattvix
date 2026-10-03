import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fitWithin, pickSmallerFile } from "./compress-image";

describe("fitWithin", () => {
  it("scales a landscape image so the long edge matches the limit", () => {
    assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 });
  });

  it("scales a portrait image by its height", () => {
    assert.deepEqual(fitWithin(3000, 4000, 2000), { width: 1500, height: 2000 });
  });

  it("never upscales an image already inside the limit", () => {
    assert.deepEqual(fitWithin(1200, 800, 2000), { width: 1200, height: 800 });
  });

  it("rounds to whole pixels and keeps at least one pixel", () => {
    assert.deepEqual(fitWithin(4001, 3, 2000), { width: 2000, height: 1 });
  });
});

describe("pickSmallerFile", () => {
  const original = new File([new Uint8Array(500)], "card.png", {
    type: "image/png",
  });

  it("uses the compressed file when it is smaller", () => {
    const compressed = new File([new Uint8Array(200)], "card.jpg", {
      type: "image/jpeg",
    });
    assert.equal(pickSmallerFile(original, compressed), compressed);
  });

  it("keeps the original when compression did not help", () => {
    const compressed = new File([new Uint8Array(800)], "card.jpg", {
      type: "image/jpeg",
    });
    assert.equal(pickSmallerFile(original, compressed), original);
  });

  it("uses the compressed file when the original type cannot be uploaded", () => {
    const heic = new File([new Uint8Array(100)], "card.heic", {
      type: "image/heic",
    });
    const compressed = new File([new Uint8Array(800)], "card.jpg", {
      type: "image/jpeg",
    });
    assert.equal(pickSmallerFile(heic, compressed), compressed);
  });
});

describe("property photo compression", () => {
  it("uses the 1600px bound even when the oversized original is smaller", async (t) => {
    const { compressImage } = await import("./compress-image");
    const bitmap = { width: 4000, height: 3000, close() {} };
    const canvas = {
      width: 0, height: 0,
      getContext: () => ({ fillStyle: "", fillRect() {}, drawImage() {} }),
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob([new Uint8Array(800)], { type: "image/jpeg" })),
    };
    const originalBitmap = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: async () => bitmap });
    Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => canvas } });
    t.after(() => {
      if (originalBitmap) Object.defineProperty(globalThis, "createImageBitmap", originalBitmap);
      else Reflect.deleteProperty(globalThis, "createImageBitmap");
      if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
      else Reflect.deleteProperty(globalThis, "document");
    });
    const original = new File([new Uint8Array(100)], "hotel.png", { type: "image/png" });
    const compressed = await compressImage(original, 1600);
    assert.equal(canvas.width, 1600);
    assert.equal(canvas.height, 1200);
    assert.equal(compressed.type, "image/jpeg");
    assert.notEqual(compressed, original);
    assert.equal(await compressImage(original), original);
  });
});

describe("required photo resizing failure", () => {
  for (const mode of ["context", "encoding"] as const) {
    it(`does not upload the oversized original when ${mode} is unavailable`, async (t) => {
      const { compressImage } = await import("./compress-image");
      const bitmap = { width: 4000, height: 3000, close() {} };
      const canvas = {
        width: 0, height: 0,
        getContext: () => mode === "context" ? null : { fillStyle: "", fillRect() {}, drawImage() {} },
        toBlob: (callback: (blob: Blob | null) => void) => callback(null),
      };
      const originalBitmap = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
      const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
      Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: async () => bitmap });
      Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => canvas } });
      t.after(() => {
        if (originalBitmap) Object.defineProperty(globalThis, "createImageBitmap", originalBitmap);
        else Reflect.deleteProperty(globalThis, "createImageBitmap");
        if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
        else Reflect.deleteProperty(globalThis, "document");
      });
      const original = new File([new Uint8Array(100)], "hotel.png", { type: "image/png" });
      await assert.rejects(compressImage(original, 1600), /could not be resized/);
      assert.equal(await compressImage(original), original);
    });
  }
});
