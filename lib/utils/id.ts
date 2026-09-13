export function generateId(prefix = "id"): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

/**
 * A bare RFC4122 UUID — distinct from `generateId()`, whose prefixed output
 * ("split-abc123...") isn't valid input for a Postgres `uuid` column. Used
 * for `Split.clientId`, the idempotency key the local-first sync flow sends
 * to Supabase (see supabase/schema.sql).
 */
export function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 for environments without crypto.randomUUID — not
  // cryptographically strong, but this is an idempotency key, not a secret.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
