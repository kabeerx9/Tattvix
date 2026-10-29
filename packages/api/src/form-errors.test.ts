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

import { ApiError } from "@tattvix/contracts";

import { camelKey, saveRefusalSummary, serverFieldErrors } from "./form-errors";

const refused = (fieldsFromServer: Record<string, string>, message = "Check the details and try again.") =>
  new ApiError(400, message, "invalid", fieldsFromServer);

test("camelKey converts each dotted segment from snake_case", () => {
  assert.equal(camelKey("front_image"), "frontImage");
  assert.equal(camelKey("companions.0.first_name"), "companions.0.firstName");
  assert.equal(camelKey("alreadyCamel"), "alreadyCamel");
});

test("converts server keys to the form's keys and keeps unmatched ones with a summary", () => {
  const result = serverFieldErrors(
    refused({ document_number: "Enter 12 digits.", front_image: "Upload the front.", issuing_country: "Pick a country." }),
    ["documentNumber", "nameOnDocument", "frontImage"],
  );
  assert.deepEqual(result.fieldErrors, { documentNumber: "Enter 12 digits.", frontImage: "Upload the front." });
  assert.deepEqual(result.unmatched, { issuing_country: "Pick a country." });
  assert.equal(result.summary, "Issuing country: Pick a country.");
});

test("an explicit map entry wins over case conversion and nested keys stay nested", () => {
  const result = serverFieldErrors(
    refused({ "companions.0.first_name": "Enter a name.", nightly_rate: "Too low.", legal_name: "Required." }),
    ["companions.0.firstName", "rate", "legalName"],
    { nightly_rate: "rate" },
  );
  assert.deepEqual(result.fieldErrors, { "companions.0.firstName": "Enter a name.", rate: "Too low.", legalName: "Required." });
  assert.deepEqual(result.unmatched, {});
  assert.equal(result.summary, null);
});

test("counts several unmatched fields and accepts [key, label] field lists", () => {
  const result = serverFieldErrors(refused({ room_number: "Taken.", floor: "Pick a floor." }), fields);
  assert.equal(result.summary, "2 fields need fixing. Room number: Taken.");
  assert.deepEqual(result.fieldErrors, {});
});

test("is empty for non-API errors and refusals without fields", () => {
  assert.deepEqual(serverFieldErrors(new Error("boom"), fields).fieldErrors, {});
  assert.deepEqual(serverFieldErrors(undefined, fields).fieldErrors, {});
  assert.deepEqual(serverFieldErrors(new ApiError(500, "Down"), fields), { fieldErrors: {}, unmatched: {}, summary: null });
});

test("saveRefusalSummary prefers unmatched fields, then field errors, then the server message", () => {
  assert.equal(saveRefusalSummary(refused({ floor: "Pick a floor." }), {}, fields, "Could not save."), "Floor: Pick a floor.");
  assert.equal(
    saveRefusalSummary(refused({ document_number: "Enter 12 digits." }), { documentNumber: "Enter 12 digits." }, fields, "Could not save."),
    "Document number: Enter 12 digits.",
  );
  assert.equal(saveRefusalSummary(new ApiError(409, "Already exists."), {}, fields, "Could not save."), "Already exists.");
  assert.equal(saveRefusalSummary(new Error("network"), {}, fields, "Could not save."), "Could not save.");
  assert.equal(saveRefusalSummary(null, { nameOnDocument: "Enter the name." }, fields, "Could not save."), "Name on document: Enter the name.");
  assert.equal(saveRefusalSummary(null, {}, fields, "Could not save."), null);
});
