export const SESSION_COOKIE = "sphere_session";

const MESSAGE = "sphere-office-session-v1";

/** The password the sign-in page checks. Production must set SPHERE_PASSWORD. */
export function officePassword(): string {
  const set = process.env.SPHERE_PASSWORD?.trim() ?? "";
  if (set) return set;
  if (process.env.NODE_ENV !== "production") return "preview";
  return "";
}

export async function signSession(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(MESSAGE));
  return Array.from(new Uint8Array(buf), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function tokensMatch(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
