import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  const secure = forwarded
    ? forwarded.split(",")[0].trim() === "https"
    : new URL(request.url).protocol === "https:";
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
  return response;
}
