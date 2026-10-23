import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { ENTRANCE_SETTLE_MS, settleEntranceMotionAfterFirstUse } from "./entrance-motion";

function fakeDocument() {
  const listeners = new Set<(event: { animationName: string }) => void>();
  const attributes = new Map<string, string>();
  return {
    attributes,
    listenerCount: () => listeners.size,
    fire: (animationName: string) => [...listeners].forEach((listener) => listener({ animationName })),
    doc: {
      addEventListener: (_: string, listener: (event: { animationName: string }) => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: (event: { animationName: string }) => void) => listeners.delete(listener),
      documentElement: { setAttribute: (name: string, value: string) => attributes.set(name, value) },
    } as unknown as Document,
  };
}

describe("entrance motion", () => {
  it("settles the document once the first entrance batch has played", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    (globalThis as { window?: unknown }).window = globalThis;
    try {
      const fake = fakeDocument();
      settleEntranceMotionAfterFirstUse(fake.doc);
      fake.fire("bs-rise");
      assert.equal(fake.listenerCount(), 1, "the boot splash animation does not count");
      fake.fire("enter-up");
      assert.equal(fake.listenerCount(), 0);
      mock.timers.tick(ENTRANCE_SETTLE_MS - 1);
      assert.equal(fake.attributes.has("data-motion-settled"), false);
      mock.timers.tick(1);
      assert.equal(fake.attributes.has("data-motion-settled"), true);
    } finally {
      mock.timers.reset();
    }
  });
});
