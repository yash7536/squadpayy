// Phone number handling for the WhatsApp payment reminder (Final MVP
// pass). Pure functions, no browser/Next.js APIs — usable from Add
// People's client-side validation and from the server-rendered Payment
// Reminder screen alike.
//
// wa.me deep links need the number as plain digits with a country code
// and no "+", spaces, or punctuation (e.g. "919876543210", not
// "+91 98765 43210"). Senders will mostly type a local 10-digit number
// without a country code, so this normalizer assumes India (+91) for a
// bare 10-digit number or an 11-digit number with a leading trunk "0" —
// matching the rest of the app's Rs./India-first assumptions (there's no
// separate country selector anywhere else in SquadPay). Anything else is
// assumed to already include its own country code and is passed through
// digit-only. This is a deliberate MVP simplification, not full
// international phone parsing.

const DEFAULT_COUNTRY_CODE = "91";

/**
 * Strips everything but digits down to a WhatsApp-ready phone number
 * (country code + local number, no "+"), or returns null if what's left
 * doesn't look like a plausible phone number at all.
 */
export function normalizePhoneForWhatsApp(rawPhone) {
  if (typeof rawPhone !== "string") return null;

  let digits = rawPhone.replace(/\D/g, "");
  // A "00" international prefix (an alternative to "+") isn't part of the
  // number itself.
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.length === 10) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  }
  // Otherwise: assume it already includes a country code (Indian or
  // otherwise) and use it as-is.

  // E.164 numbers are at most 15 digits; anything shorter than 8 isn't a
  // real phone number (this also catches empty/near-empty input).
  if (digits.length < 8 || digits.length > 15) return null;

  return digits;
}

/** Whether `rawPhone` normalizes to something plausible — for form validation. */
export function isPlausiblePhoneNumber(rawPhone) {
  return normalizePhoneForWhatsApp(rawPhone) !== null;
}

/**
 * Builds a `wa.me` deep link that opens a chat with `rawPhone` pre-filled
 * with `message` — no WhatsApp Business API involved, just the public
 * click-to-chat URL format. Returns null if the phone number isn't
 * usable, so callers can show a fallback instead of a dead link.
 */
export function buildWhatsAppLink(rawPhone, message) {
  const digits = normalizePhoneForWhatsApp(rawPhone);
  if (!digits) return null;

  const params = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${params}`;
}
