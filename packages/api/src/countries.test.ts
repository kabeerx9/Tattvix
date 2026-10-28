import assert from "node:assert/strict";
import { test } from "node:test";

import { countries, countryName, searchCountries } from "./countries";

test("every country has a unique two-letter code", () => {
  const codes = countries.map((country) => country.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of codes) assert.match(code, /^[A-Z]{2}$/);
  assert.ok(codes.length >= 249);
});

test("countries are sorted by name", () => {
  assert.equal(countries[0]?.name, "Afghanistan");
  assert.equal(countries.at(-1)?.name, "Zimbabwe");
});

test("countryName maps codes and falls back to the code", () => {
  assert.equal(countryName("IN"), "India");
  assert.equal(countryName("np"), "Nepal");
  assert.equal(countryName("ZZ"), "ZZ");
  assert.equal(countryName(""), "");
});

test("searchCountries matches by name, word start, accents and exact code", () => {
  assert.equal(searchCountries("ind")[0]?.code, "IN");
  assert.ok(searchCountries("korea").some((country) => country.code === "KR"));
  assert.ok(searchCountries("cote").some((country) => country.code === "CI"));
  assert.equal(searchCountries("np")[0]?.code, "NP");
  assert.equal(searchCountries("  ").length, countries.length);
  assert.deepEqual(searchCountries("qqq"), []);
});
