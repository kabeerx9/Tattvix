import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hotelRegistrationSearchFromRedirect,
  postLoginDestination,
} from "./post-login-redirect";
test("referral registration destinations survive login and SSO, without open redirects", () => {
  assert.deepEqual(
    hotelRegistrationSearchFromRedirect("/register-hotel?ref=abcd2345efgh"),
    { ref: "abcd2345efgh" },
  );
  assert.equal(
    postLoginDestination("/register-hotel?ref=ABCD2345EFGH"),
    "/register-hotel?ref=ABCD2345EFGH",
  );
  assert.equal(postLoginDestination("/register-hotel"), "/register-hotel");
  assert.equal(
    postLoginDestination("/check-in/token123"),
    "/check-in/token123",
  );
  for (const path of [
    "//evil.test/register-hotel?ref=ABCD2345EFGH",
    "https://evil.test/register-hotel",
    "/register-hotel/other",
    "/\\evil.test/register-hotel",
    "/admin",
    "/register-hotel-evil",
  ])
    assert.equal(postLoginDestination(path), "/guest");
});
