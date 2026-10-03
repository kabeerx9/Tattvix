import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { hotelStayKeys } from "../hotel-stays/keys";
import { invalidateOperations } from "./invalidation";

test("stay lifecycle changes invalidate its bill without invalidating another property's bill", async () => {
  const client = new QueryClient();
  const scope = { organizationSlug: "hotel", propertySlug: "one" };
  const current = hotelStayKeys.bill("hotel", "one", "stay-id");
  const other = hotelStayKeys.bill("hotel", "two", "stay-id");
  client.setQueryData(current, { isFinal: false, items: [] });
  client.setQueryData(other, { isFinal: false, items: [] });
  await invalidateOperations(client, scope, "stay-id");
  assert.equal(client.getQueryState(current)?.isInvalidated, true);
  assert.equal(client.getQueryState(other)?.isInvalidated, false);
  client.clear();
});
