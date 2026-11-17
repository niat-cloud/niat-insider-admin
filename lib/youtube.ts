/**
 * YouTube links for the article body's embedded videos. The body stores
 * `<div data-youtube-video><iframe src="https://www.youtube-nocookie.com/embed/<id>">…`
 * (privacy-enhanced host), built from whatever link the editor pastes.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type YouTubeRef = { id: string; start: number };

function parseStart(raw: string | null): number {
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/**
 * Video id (and optional start second) from a watch, youtu.be, shorts, live
 * or embed link, or a bare 11-character id. Null when it is not a YouTube video.
 */
export function parseYouTubeUrl(input: string): YouTubeRef | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  if (VIDEO_ID.test(raw)) return { id: raw, start: 0 };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./i, "").toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0])) id = parts[1] ?? null;
  }
  if (!id || !VIDEO_ID.test(id)) return null;
  const start = parseStart(url.searchParams.get("start") ?? url.searchParams.get("t"));
  return { id, start };
}

export function youTubeEmbedUrl({ id, start }: YouTubeRef): string {
  return `https://www.youtube-nocookie.com/embed/${id}${start > 0 ? `?start=${start}` : ""}`;
}

/** Same parse for an iframe src already stored in a body. */
export function isYouTubeEmbedSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  try {
    const { protocol, hostname, pathname } = new URL(src.trim());
    return (
      protocol === "https:" &&
      ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"].includes(hostname) &&
      /^\/embed\/[A-Za-z0-9_-]{11}\/?$/.test(pathname)
    );
  } catch {
    return false;
  }
}
