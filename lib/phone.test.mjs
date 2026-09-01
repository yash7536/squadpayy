import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhoneForWhatsApp,
  isPlausiblePhoneNumber,
  buildWhatsAppLink,
} from "./phone.js";

describe("normalizePhoneForWhatsApp", () => {
  test("bare 10-digit number gets the default (India) country code", () => {
    assert.equal(normalizePhoneForWhatsApp("9876543210"), "919876543210");
  });

  test("formatted 10-digit number (spaces/dashes/parens) still normalizes", () => {
    assert.equal(normalizePhoneForWhatsApp("98765-43210"), "919876543210");
    assert.equal(normalizePhoneForWhatsApp("(987) 654 3210"), "919876543210");
  });

  test("leading trunk 0 is stripped before adding the country code", () => {
    assert.equal(normalizePhoneForWhatsApp("09876543210"), "919876543210");
  });

  test("a number that already has a country code is passed through", () => {
    assert.equal(normalizePhoneForWhatsApp("+91 98765 43210"), "919876543210");
    assert.equal(normalizePhoneForWhatsApp("919876543210"), "919876543210");
  });

  test("a non-Indian international number is passed through digits-only", () => {
    assert.equal(normalizePhoneForWhatsApp("+1 415 555 2671"), "14155552671");
  });

  test("a leading 00 international prefix is treated like a +", () => {
    assert.equal(normalizePhoneForWhatsApp("0091 98765 43210"), "919876543210");
  });

  test("empty, garbage, or too-short input is not a phone number", () => {
    assert.equal(normalizePhoneForWhatsApp(""), null);
    assert.equal(normalizePhoneForWhatsApp("   "), null);
    assert.equal(normalizePhoneForWhatsApp("abc"), null);
    assert.equal(normalizePhoneForWhatsApp("12345"), null);
  });

  test("absurdly long input is rejected rather than silently truncated", () => {
    assert.equal(normalizePhoneForWhatsApp("1".repeat(20)), null);
  });

  test("non-string input is rejected, not thrown on", () => {
    assert.equal(normalizePhoneForWhatsApp(null), null);
    assert.equal(normalizePhoneForWhatsApp(undefined), null);
    assert.equal(normalizePhoneForWhatsApp(9876543210), null);
  });
});

describe("isPlausiblePhoneNumber", () => {
  test("mirrors normalizePhoneForWhatsApp's accept/reject", () => {
    assert.equal(isPlausiblePhoneNumber("9876543210"), true);
    assert.equal(isPlausiblePhoneNumber(""), false);
    assert.equal(isPlausiblePhoneNumber("not a phone"), false);
  });
});

describe("buildWhatsAppLink", () => {
  test("builds a wa.me link with the message URL-encoded", () => {
    const link = buildWhatsAppLink("9876543210", "Hey! You owe Rs.500.");
    assert.equal(
      link,
      "https://wa.me/919876543210?text=Hey!%20You%20owe%20Rs.500."
    );
  });

  test("omits the text param when there's no message", () => {
    assert.equal(buildWhatsAppLink("9876543210", null), "https://wa.me/919876543210");
    assert.equal(buildWhatsAppLink("9876543210", ""), "https://wa.me/919876543210");
  });

  test("returns null instead of a broken link for an invalid phone", () => {
    assert.equal(buildWhatsAppLink("not a phone", "hi"), null);
    assert.equal(buildWhatsAppLink(null, "hi"), null);
  });
});
