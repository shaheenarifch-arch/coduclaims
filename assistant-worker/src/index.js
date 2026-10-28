/**
 * GetServices.ai Site Assistant — Cloudflare Worker
 *
 * One backend, many sites ("tenants"). Each tenant has its own allowed
 * origins, assistant name and knowledge. The browser widget posts the
 * conversation here; this Worker screens it for patient data, adds the
 * tenant's instructions and asks Claude for a reply.
 *
 * Secrets (set in Cloudflare, never in code):
 *   ANTHROPIC_API_KEY
 * Optional vars:
 *   MODEL  (default below)
 */

import { TENANTS } from "./tenants.js";

const DEFAULT_MODEL = "claude-haiku-5-5";
const MAX_TURNS = 16;          // messages kept per request
const MAX_CHARS_PER_MSG = 800;
const MAX_TOTAL_CHARS = 8000;
const MAX_REPLY_TOKENS = 450;
const RATE_LIMIT_PER_MIN = 12; // best-effort, per isolate, per IP

const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT_PER_MIN;
}

// Patterns that suggest someone is sharing patient-identifying details.
const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,                                            // SSN
  /\b(ssn|social security)\b/i,
  /\b(dob|d\.o\.b\.?|date of birth|born on)\b[^a-z]{0,6}\d/i,         // DOB + digits
  /\b(mrn|medical record( number)?|member id|subscriber id|policy (number|no))\b\s*[:#]?\s*[a-z0-9-]{4,}/i,
  /\bpatient\b.{0,40}\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/i,         // patient + a date
];

export function containsPHI(text) {
  return PHI_PATTERNS.some((re) => re.test(text));
}

function cors(origin, tenant) {
  const allowed = tenant && tenant.origins.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const msgs = raw
    .slice(-MAX_TURNS)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MSG).trim() }))
    .filter((m) => m.content);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return null;
  const total = msgs.reduce((n, m) => n + m.content.length, 0);
  if (total > MAX_TOTAL_CHARS) return null;
  return msgs;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const tenantId = url.searchParams.get("tenant") || "";
    const tenant = TENANTS[tenantId];
    const headers = cors(origin, tenant);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (url.pathname === "/health") return json({ ok: true }, 200, headers);
    if (url.pathname !== "/chat" || request.method !== "POST") return json({ error: "Not found" }, 404, headers);
    if (!tenant) return json({ error: "Unknown site" }, 400, headers);
    if (!tenant.origins.includes(origin)) return json({ error: "Origin not allowed" }, 403, headers);

    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    if (rateLimited(ip)) {
      return json({ reply: "You're sending messages quickly — please wait a minute and try again." }, 429, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Bad request" }, 400, headers);
    }
    const messages = cleanMessages(body && body.messages);
    if (!messages) return json({ error: "Bad request" }, 400, headers);

    // Never forward anything that looks like patient data to the model.
    if (containsPHI(messages[messages.length - 1].content)) {
      return json({ reply: tenant.phiReply, flagged: true }, 200, headers);
    }
    // Drop earlier turns that were flagged so they never reach the model.
    const safe = messages.filter((m) => m.role === "assistant" || !containsPHI(m.content));

    if (!env.ANTHROPIC_API_KEY) return json({ reply: tenant.fallbackReply, fallback: true }, 200, headers);

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: env.MODEL || DEFAULT_MODEL,
          max_tokens: MAX_REPLY_TOKENS,
          // Cached so the long site knowledge is billed at a fraction of the cost on repeat turns.
          system: [{ type: "text", text: tenant.system, cache_control: { type: "ephemeral" } }],
          messages: safe,
        }),
      });
      if (!r.ok) throw new Error(`upstream ${r.status}`);
      const data = await r.json();
      const reply = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return json({ reply: reply || tenant.fallbackReply }, 200, headers);
    } catch (e) {
      console.error("assistant error", e && e.message);
      return json({ reply: tenant.fallbackReply, fallback: true }, 200, headers);
    }
  },
};
