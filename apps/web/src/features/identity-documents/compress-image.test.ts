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
