import { NextResponse } from "next/server";

// Django's phone login returns only `access` in the body; the refresh token is
// sent as an HttpOnly `refresh_token` cookie on the Django domain, which the
// browser-side admin can't read. This route runs on the server, reads the
// refresh token from Django's Set-Cookie header and returns both tokens.

function getBackendBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) {
    throw new Error("NEXT_PUBLIC_API_URL is required");
  }
  return raw.replace(/\/$/, "");
}

function readCookieValue(setCookie: string, cookieName: string): string | null {
  const match = setCookie.match(new RegExp(`(?:^|\\s)${cookieName}=([^;]+)`));
  return match?.[1] ?? null;
}

function getSetCookieValues(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie();
  }
  const combined = headers.get("set-cookie");
  if (!combined) return [];
  return combined.split(/,(?=\s*[A-Za-z0-9_\-]+=)/);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const djangoRes = await fetch(`${getBackendBaseUrl()}/api/auth/login/phone/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await djangoRes.json().catch(() => ({}));
    if (!djangoRes.ok) {
      return NextResponse.json(data, { status: djangoRes.status });
    }

    const setCookieValues = getSetCookieValues(djangoRes.headers);
    const access =
      typeof data?.access === "string"
        ? data.access
        : setCookieValues.map((c) => readCookieValue(c, "access_token")).find(Boolean) ?? null;
    const refresh =
      typeof data?.refresh === "string"
        ? data.refresh
        : setCookieValues.map((c) => readCookieValue(c, "refresh_token")).find(Boolean) ?? null;

    if (!access || !refresh) {
      return NextResponse.json(
        { detail: "Login succeeded but the server did not return a session. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ access, refresh }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ detail: "Unable to process phone OTP login." }, { status: 500 });
  }
}
