#!/usr/bin/env node
/**
 * Update article bodies on the NIAT Insider backend from files, without the
 * admin UI and without Replit. Uses the same admin API and admin login (phone
 * + OTP) as the admin portal, so every change goes through the backend's
 * normal save path (validation, page revalidation).
 *
 * Settings (environment variables):
 *   NIAT_API_BASE            Backend origin the production admin uses, e.g. https://api.example.com
 *   NIAT_ADMIN_REFRESH_TOKEN Admin session refresh token (secret). Used once per session to
 *                            sign in; the backend rotates it, so take a fresh one each time.
 *   NIAT_ADMIN_PHONE         Admin phone number, only for the OTP login below
 *
 * Commands:
 *   login                       Send an OTP to NIAT_ADMIN_PHONE
 *   login --code 123456         Finish login; the session is kept in ~/.niat-admin/session.json
 *   pull <slug>...              Save each article's current body to article-content/<slug>.html
 *   push <file>... [--apply]    Check files and show what would change; with --apply, back up and save
 *   restore <backup.json> [--apply]  Put a backed-up body back
 *
 * The slug comes from the file name (article-content/<slug>.html|.md|.txt).
 * .html is sent as is; .md/.txt are converted (## headings, - lists, **bold**,
 * *italic*, [links](url), blank line = new paragraph; "#" becomes h2 because
 * the page template already renders the only h1).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CONTENT_DIR = path.join(ROOT, "article-content");
const BACKUP_DIR = path.join(CONTENT_DIR, "backups");
const SESSION_FILE = process.env.NIAT_SESSION_FILE || path.join(os.homedir(), ".niat-admin", "session.json");
const ADMIN_ARTICLES = "/api/articles/admin/articles";

// ── helpers ──────────────────────────────────────────────────────────────

function die(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function apiBase() {
  const base = (process.env.NIAT_API_BASE || "").trim().replace(/\/$/, "");
  if (!base) die("NIAT_API_BASE is not set (the backend origin the production admin uses).");
  return base;
}

function readSession() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeSession(session) {
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session), { mode: 0o600 });
}

function cookieValue(res, name) {
  const all = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of all) {
    const m = c.match(new RegExp(`(?:^|\\s)${name}=([^;]+)`));
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

async function readBody(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** First readable message from a Django error body (same idea as lib/apiErrorMessage.ts). */
function errorText(data, status) {
  const walk = (v, keys) => {
    if (v == null) return null;
    if (typeof v === "string") {
      const field = keys.filter((k) => !["error", "errors", "detail", "details", "message", "non_field_errors"].includes(k) && !/^\d+$/.test(k)).join(".");
      return field ? `${field}: ${v}` : v;
    }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i += 1) {
        const f = walk(v[i], [...keys, String(i)]);
        if (f) return f;
      }
      return null;
    }
    if (typeof v === "object") {
      for (const [k, c] of Object.entries(v)) {
        // "code"/"status" are metadata only when they hold a string or number;
        // a field named "code" (the OTP) holds a list of messages.
        if (["detail", "message"].includes(k)) continue;
        if (["code", "status", "status_code"].includes(k) && (typeof c === "string" || typeof c === "number")) continue;
        const f = walk(c, [...keys, k]);
        if (f) return f;
      }
      return walk(v.detail, keys) || walk(v.message, keys);
    }
    return null;
  };
  if (typeof data === "string") return /<html|<!doctype/i.test(data) ? `server error ${status}` : data.slice(0, 300);
  return walk(data, []) || `HTTP ${status}`;
}

async function refreshSession(session) {
  const res = await fetch(`${apiBase()}/api/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: session.refresh }),
  });
  const data = await readBody(res);
  if (!res.ok || !data?.access) return null;
  // The backend rotates refresh tokens and blacklists the old one.
  const next = { ...session, access: data.access, refresh: data.refresh || session.refresh };
  writeSession(next);
  return next;
}

/** Authenticated admin API call; refreshes the access token once on 401. */
async function api(method, url, body) {
  let session = readSession();
  const envRefresh = (process.env.NIAT_ADMIN_REFRESH_TOKEN || "").trim();
  if (!session?.access && envRefresh) {
    session = await refreshSession({ refresh: envRefresh });
    if (!session) die("NIAT_ADMIN_REFRESH_TOKEN was rejected (expired or already used). Store a fresh one.");
  }
  if (!session?.access) die("Not logged in. Set NIAT_ADMIN_REFRESH_TOKEN or run: node scripts/article-body.mjs login");
  const send = (s) =>
    fetch(`${apiBase()}${url}`, {
      method,
      headers: { Authorization: `Bearer ${s.access}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  let res = await send(session);
  if (res.status === 401 && session.refresh) {
    session = await refreshSession(session);
    if (!session) die("Session expired. Run login again.");
    res = await send(session);
  }
  const data = await readBody(res);
  if (!res.ok) throw new Error(`${method} ${url} failed: ${errorText(data, res.status)}`);
  return data;
}

function textOf(html) {
  return String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const wordCount = (html) => (textOf(html) ? textOf(html).split(" ").length : 0);

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}

/** Small Markdown subset → HTML. No h1: the article page renders the only one. */
export function markdownToHtml(md) {
  const out = [];
  let para = [];
  let list = null; // { tag, items }
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`);
    list = null;
  };
  for (const raw of String(md).replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (!line) {
      flushPara();
      flushList();
    } else if (h) {
      flushPara();
      flushList();
      const level = Math.min(Math.max(h[1].length, 2), 4);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
    } else if (ul || ol) {
      flushPara();
      const tag = ul ? "ul" : "ol";
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [] };
      list.items.push((ul || ol)[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out.join("\n");
}

function loadFile(file) {
  const ext = path.extname(file).toLowerCase();
  const slug = path.basename(file, ext);
  const raw = fs.readFileSync(file, "utf8");
  if (![".html", ".htm", ".md", ".txt"].includes(ext)) die(`${file}: use .html, .md or .txt`);
  const body = ext === ".html" || ext === ".htm" ? raw.trim() : markdownToHtml(raw);
  return { slug, body };
}

/** Problems that would break the page or SEO. Errors block --apply; warnings don't. */
export function checkBody(body) {
  const errors = [];
  const warnings = [];
  if (!textOf(body)) errors.push("body is empty");
  if (/<h1[\s>]/i.test(body)) errors.push("contains an <h1>; the page already has one (use ## / <h2>)");
  if (/<script[\s>]|<style[\s>]|\son\w+=/i.test(body)) errors.push("contains <script>, <style> or an inline event handler");
  if (/<img[^>]+src="(data:|blob:|file:|https?:\/\/[^"/]*(googleusercontent\.com|docs\.google\.com))/i.test(body))
    errors.push("contains a pasted Google Docs / data: image that will break; upload images in the admin instead");
  const faqHeadings = (body.match(/<h[2-4][^>]*>[^<]*(faq|frequently asked)[^<]*<\/h[2-4]>/gi) || []).length;
  if (faqHeadings > 1) warnings.push(`${faqHeadings} FAQ headings; the page should show one FAQ`);
  const words = wordCount(body);
  if (words < 600) warnings.push(`${words} words, under the 600-word minimum`);
  if (words > 1500) warnings.push(`${words} words, over the ~1,500-word soft maximum`);
  return { errors, warnings, words };
}

async function findArticle(slug) {
  // Admin search matches titles, not slugs, so after the slug itself try its
  // longest words (skipping a trailing hex id) and match the slug exactly.
  const words = slug
    .split("-")
    .filter((w, i, all) => !(i === all.length - 1 && /^[0-9a-f]{8}$/.test(w)))
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
  let searched = 0;
  for (const term of [slug, ...words]) {
    const data = await api("GET", `${ADMIN_ARTICLES}/?search=${encodeURIComponent(term)}&page_size=100`);
    const list = Array.isArray(data) ? data : data?.results ?? [];
    searched += list.length;
    const hit = list.find((a) => a.slug === slug);
    if (hit) return api("GET", `${ADMIN_ARTICLES}/${hit.id}/`);
  }
  throw new Error(`no article with slug "${slug}" (searched ${searched} results)`);
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
}

// ── commands ─────────────────────────────────────────────────────────────

async function login(args) {
  const phone = (process.env.NIAT_ADMIN_PHONE || "").trim();
  if (!phone) die("NIAT_ADMIN_PHONE is not set.");
  const i = args.indexOf("--code");
  if (i === -1) {
    const res = await fetch(`${apiBase()}/api/verification/otp/request/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: phone, for: "login" }),
    });
    if (!res.ok) die(`could not send OTP: ${errorText(await readBody(res), res.status)}`);
    console.log("OTP sent to the admin phone. Finish with: login --code <code>");
    return;
  }
  const code = String(args[i + 1] || "").trim();
  if (!code) die("give the code: login --code 123456");
  const res = await fetch(`${apiBase()}/api/auth/login/phone/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone_number: phone, code }),
  });
  const data = await readBody(res);
  if (!res.ok) die(`login failed: ${errorText(data, res.status)}`);
  const access = (typeof data === "object" && data?.access) || cookieValue(res, "access_token");
  const refresh = (typeof data === "object" && data?.refresh) || cookieValue(res, "refresh_token");
  if (!access) die("login succeeded but no access token came back");
  const me = await fetch(`${apiBase()}/api/auth/me/`, { headers: { Authorization: `Bearer ${access}` } });
  const role = String((await readBody(me))?.role || "").toLowerCase();
  if (role !== "admin") die("this account is not an admin");
  writeSession({ access, refresh });
  console.log(`Logged in. Session saved to ${SESSION_FILE}`);
}

async function pull(slugs) {
  if (!slugs.length) die("give at least one slug");
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  for (const slug of slugs) {
    try {
      const a = await findArticle(slug);
      const file = path.join(CONTENT_DIR, `${slug}.html`);
      fs.writeFileSync(file, `${a.body || ""}\n`);
      console.log(`${slug}: ${wordCount(a.body)} words, status ${a.status} -> ${path.relative(ROOT, file)}`);
    } catch (e) {
      console.error(`${slug}: ${e.message}`);
      process.exitCode = 1;
    }
  }
}

async function push(args) {
  const apply = args.includes("--apply");
  const files = args.filter((a) => a !== "--apply");
  if (!files.length) die("give at least one file");
  const runDir = path.join(BACKUP_DIR, stamp());
  let blocked = 0;
  for (const file of files) {
    const { slug, body } = loadFile(file);
    const check = checkBody(body);
    console.log(`\n${slug}  (${check.words} words in file)`);
    check.errors.forEach((m) => console.log(`  ERROR   ${m}`));
    check.warnings.forEach((m) => console.log(`  warning ${m}`));
    if (check.errors.length) {
      blocked += 1;
      continue;
    }
    try {
      const a = await findArticle(slug);
      const same = (a.body || "").trim() === body.trim();
      console.log(`  live    [${a.status}] ${wordCount(a.body)} -> ${check.words} words${same ? " (no change)" : ""}`);
      if (!apply || same) continue;
      fs.mkdirSync(runDir, { recursive: true });
      const backup = path.join(runDir, `${slug}.json`);
      fs.writeFileSync(backup, JSON.stringify({ id: a.id, slug, saved_at: new Date().toISOString(), body: a.body }, null, 2));
      await api("PATCH", `${ADMIN_ARTICLES}/${a.id}/`, { body });
      const after = await api("GET", `${ADMIN_ARTICLES}/${a.id}/`);
      const stored = (after.body || "").trim() === body.trim();
      console.log(`  SAVED   backup: ${path.relative(ROOT, backup)}${stored ? "" : "  (the backend adjusted the HTML on save; check the page)"}`);
    } catch (e) {
      console.error(`  FAILED  ${e.message}`);
      process.exitCode = 1;
    }
  }
  if (!apply) console.log("\nDry run: nothing saved. Add --apply to save.");
  if (blocked) {
    console.log(`${blocked} file(s) blocked by errors.`);
    process.exitCode = 1;
  }
}

async function restore(args) {
  const apply = args.includes("--apply");
  const file = args.find((a) => a !== "--apply");
  if (!file) die("give a backup .json file");
  const b = JSON.parse(fs.readFileSync(file, "utf8"));
  const current = await api("GET", `${ADMIN_ARTICLES}/${b.id}/`);
  console.log(`${b.slug}: ${wordCount(current.body)} -> ${wordCount(b.body)} words (backup from ${b.saved_at})`);
  if (!apply) return console.log("Dry run: add --apply to restore.");
  await api("PATCH", `${ADMIN_ARTICLES}/${b.id}/`, { body: b.body });
  console.log("Restored.");
}

const [cmd, ...rest] = process.argv.slice(2);
const commands = { login, pull, push, restore };
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!commands[cmd]) {
    console.log(fs.readFileSync(new URL(import.meta.url), "utf8").match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ""));
    process.exit(cmd ? 1 : 0);
  }
  commands[cmd](rest).catch((e) => die(e.message));
}
