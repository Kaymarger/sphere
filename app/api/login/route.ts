import { NextResponse } from "next/server";
import { SESSION_COOKIE, officePassword, signSession, tokensMatch } from "@/lib/auth";

export async function POST(request: Request) {
  const password = officePassword();
  if (!password) {
    return NextResponse.json(
      { error: "This desk has no password yet. Set SPHERE_PASSWORD on the server, then try again." },
      { status: 503 },
    );
  }

  let input = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") input = body.password;
  } catch {
    input = "";
  }

  const given = await signSession(input);
  const expected = await signSession(password);
  if (!tokensMatch(given, expected)) {
    return NextResponse.json({ error: "That password doesn’t match." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: requestIsHttps(request),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

function requestIsHttps(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}
