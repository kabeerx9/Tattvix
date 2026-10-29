import assert from "node:assert/strict";
import { test } from "node:test";

import { formErrorSummary } from "./form-errors";

const fields = [["documentNumber", "Document number"], ["nameOnDocument", "Name on document"]] as const;

test("names the first failing field in screen order", () => {
  assert.equal(formErrorSummary({ nameOnDocument: "Enter the name." }, fields), "Name on document: Enter the name.");
  assert.equal(
    formErrorSummary({ nameOnDocument: "Enter the name.", documentNumber: "Enter 12 digits." }, fields),
    "2 fields need fixing. Document number: Enter 12 digits.",
  );
});

test("is null when nothing is wrong, ignoring cleared and unlisted keys", () => {
  assert.equal(formErrorSummary({}, fields), null);
  assert.equal(formErrorSummary({ documentNumber: undefined, other: "x" }, fields), null);
});
