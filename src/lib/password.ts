// Lightweight client-side password hashing for this small educational app.
//
// Threat model: no real "security" requirement (no payments, no PII beyond a
// first name), just "don't store plaintext passwords". bcryptjs would add a
// new dependency purely for a work-factor property (slow hashing) that
// barely matters here — there's no server, so there's nothing to brute-force
// remotely; the only realistic exposure is the `profiles` table itself. The
// Web Crypto API (`crypto.subtle.digest`), already available in every target
// browser (this is a PWA), does a perfectly reasonable job: a random
// per-user salt + SHA-256 stored as `salt:hash`, so no two users' identical
// passwords look the same in the table and rainbow tables don't apply.
const ENCODER = new TextEncoder();

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomSaltHex(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bytesToHex(salt.buffer);
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', ENCODER.encode(input));
  return bytesToHex(digest);
}

/** Hash a new password, generating a fresh salt. Returns "salt:hash". */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomSaltHex();
  const hash = await sha256Hex(`${salt}:${password}`);
  return `${salt}:${hash}`;
}

/** Verify a candidate password against a stored "salt:hash" string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = await sha256Hex(`${salt}:${password}`);
  return candidate === hash;
}
