import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, officePassword, signSession, tokensMatch } from "@/lib/auth";

async function allowed(request: NextRequest, password: string) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (!token) return false;
  const expected = await signSession(password);
  return tokensMatch(token, expected);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const password = officePassword();
  const open = password ? await allowed(request, password) : false;

  if (pathname === "/login" || pathname.startsWith("/api/login")) {
    if (open && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (open) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
