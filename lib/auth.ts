import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.SERVER_SECRET ?? "";
const TOKEN_BYTES = 16;
const ALGORITHM = "sha256";

export function isAuthEnabled(): boolean {
  return SECRET.length > 0;
}

export function signSession(id: string): string {
  return createHmac(ALGORITHM, SECRET)
    .update(id)
    .digest("hex")
    .substring(0, TOKEN_BYTES * 2);
}

export function verifySession(id: string, token: string | null): boolean {
  if (!token || !SECRET) return false;
  const expected = signSession(id);
  const bufA = Buffer.from(token);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length) return false;
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
