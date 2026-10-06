import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const ARTICLES_PATH = "/articles";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("admin_access_token")?.value;
  const { pathname } = request.nextUrl;

  // The login API route is called before any session cookie exists.
  if (pathname === "/api/login") {
    return NextResponse.next();
  }

  if (pathname === LOGIN_PATH) {
    if (token) {
      return NextResponse.redirect(new URL(ARTICLES_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
