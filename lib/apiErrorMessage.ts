/**
 * Turns a backend error response into one readable line for a toast.
 *
 * Django answers in several shapes: {"detail": "..."}, {"field": ["msg"]},
 * and nested ones such as {"error": {...}} or {"field": {"nested": ["msg"]}}.
 * Stringifying a nested object printed "error: [object Object]" and hid the
 * real reason, so this walks the body and returns the first actual message,
 * prefixed with the field it belongs to (wrapper keys like "error" and
 * "details" are left out of the label).
 */
const WRAPPER_KEYS = new Set(["error", "errors", "detail", "details", "message", "non_field_errors"]);

function firstMessage(value: unknown, path: string[], depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    const field = path.filter((k) => !WRAPPER_KEYS.has(k) && !/^\d+$/.test(k)).join(".");
    return field ? `${field}: ${text}` : text;
  }
  if (typeof value === "number" || typeof value === "boolean") return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = firstMessage(value[i], [...path, String(i)], depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Field errors first: a generic "Invalid input." next to them says less.
    for (const [key, child] of Object.entries(obj)) {
      if (["detail", "message"].includes(key)) continue;
      // Metadata only when scalar; a field named "code" (e.g. the OTP) holds messages.
      if (["code", "status", "status_code"].includes(key) && (typeof child === "string" || typeof child === "number")) continue;
      const found = firstMessage(child, [...path, key], depth + 1);
      if (found) return found;
    }
    for (const key of ["detail", "message"]) {
      const found = firstMessage(obj[key], path, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: unknown; status?: number }; message?: string };
  const data = e?.response?.data;
  if (typeof data === "string") {
    // An HTML error page from the server is not worth showing verbatim.
    return /<html|<!doctype/i.test(data) ? `${fallback} (server error ${e.response?.status ?? ""})`.trim() : data.trim() || fallback;
  }
  return firstMessage(data, []) ?? e?.message ?? fallback;
}
