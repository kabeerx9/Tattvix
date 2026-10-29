import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "@tattvix/contracts";

import { applicantName, isAlreadyReviewed } from "./hotel-registration";

describe("admin review helpers", () => {
  it("names the applicant or says unnamed", () => {
    assert.equal(applicantName({ applicant: { id: 1, email: "a@x", firstName: "", lastName: "" } }), "Unnamed applicant");
    assert.equal(applicantName({ applicant: { id: 1, email: "a@x", firstName: "Asha", lastName: "" } }), "Asha");
  });

  it("treats only a 409 as already reviewed", () => {
    assert.equal(isAlreadyReviewed(new ApiError(409, "taken")), true);
    assert.equal(isAlreadyReviewed(new ApiError(400, "bad")), false);
    assert.equal(isAlreadyReviewed(new Error("x")), false);
  });
});
