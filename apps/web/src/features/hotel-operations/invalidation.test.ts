import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { hotelOverviewKeys } from "../hotel-overview/keys";
import { hotelStayKeys } from "../hotel-stays/keys";
import { invalidateOperations, invalidateStayBill } from "./invalidation";

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


test("operations invalidate every summary window for this property only", async () => {
  const client = new QueryClient();
  const seven = hotelOverviewKeys.summary("hotel", "one", 7);
  const thirty = hotelOverviewKeys.summary("hotel", "one", 30);
  const other = hotelOverviewKeys.summary("hotel", "two", 7);
  for (const key of [seven, thirty, other]) client.setQueryData(key, { activeRooms: 2 });
  await invalidateOperations(client, { organizationSlug: "hotel", propertySlug: "one" }, "stay-id");
  assert.equal(client.getQueryState(seven)?.isInvalidated, true);
  assert.equal(client.getQueryState(thirty)?.isInvalidated, true);
  assert.equal(client.getQueryState(other)?.isInvalidated, false);
  client.clear();
});


test("bill changes invalidate the bill and revenue summary for this property only", async () => {
  const client = new QueryClient();
  const bill = hotelStayKeys.bill("hotel", "one", "stay-id");
  const summary = hotelOverviewKeys.summary("hotel", "one", 7);
  const other = hotelOverviewKeys.summary("hotel", "two", 7);
  for (const key of [bill, summary, other]) client.setQueryData(key, { totalMinor: 350000 });
  await invalidateStayBill(client, { organizationSlug: "hotel", propertySlug: "one", stayId: "stay-id" });
  assert.equal(client.getQueryState(bill)?.isInvalidated, true);
  assert.equal(client.getQueryState(summary)?.isInvalidated, true);
  assert.equal(client.getQueryState(other)?.isInvalidated, false);
  client.clear();
});
