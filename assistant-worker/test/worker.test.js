import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { containsPHI } from "../src/index.js";
import { TENANTS } from "../src/tenants.js";

const ORIGIN = "https://massmedicalcoding.com";
const call = (body, { origin = ORIGIN, tenant = "mmc", env = { ANTHROPIC_API_KEY: "test" }, ip } = {}) =>
  worker.fetch(
    new Request(`https://w.example/chat?tenant=${tenant}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin, "CF-Connecting-IP": ip || String(Math.random()) },
      body: JSON.stringify(body),
    }),
    env,
  );

test("PHI patterns are detected", () => {
  assert.ok(containsPHI("my SSN is 123-45-6789"));
  assert.ok(containsPHI("patient DOB 04/12/1980"));
  assert.ok(containsPHI("member id: ABC12345"));
  assert.ok(containsPHI("the patient was seen 3/4/2026"));
  assert.ok(!containsPHI("How do you reduce denials for modifier 25?"));
  assert.ok(!containsPHI("We have 5 providers and use athena"));
});

test("PHI message is refused and never sent to the model", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("should not call"); };
  const r = await call({ messages: [{ role: "user", content: "Patient John, DOB 01/02/1970, member id XJ99812" }] });
  const d = await r.json();
  assert.equal(d.flagged, true);
  assert.equal(d.reply, TENANTS.mmc.phiReply);
  assert.equal(called, false);
});

test("unknown origin is rejected", async () => {
  const r = await call({ messages: [{ role: "user", content: "hi" }] }, { origin: "https://evil.example" });
  assert.equal(r.status, 403);
});

test("unknown tenant is rejected", async () => {
  const r = await call({ messages: [{ role: "user", content: "hi" }] }, { tenant: "nope" });
  assert.equal(r.status, 400);
});

test("CORS preflight allows the site origin", async () => {
  const r = await worker.fetch(new Request("https://w.example/chat?tenant=mmc", { method: "OPTIONS", headers: { Origin: ORIGIN } }), {});
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), ORIGIN);
});

test("calls Claude with cached system prompt and returns reply", async () => {
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = { url, init, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ content: [{ type: "text", text: "We review E/M levels." }] }), { status: 200 });
  };
  const r = await call({ messages: [{ role: "user", content: "Do you review E/M levels?" }] });
  const d = await r.json();
  assert.equal(d.reply, "We review E/M levels.");
  assert.equal(sent.url, "https://api.anthropic.com/v1/messages");
  assert.equal(sent.init.headers["x-api-key"], "test");
  assert.equal(sent.body.model, "claude-haiku-5-5");
  assert.equal(sent.body.system[0].cache_control.type, "ephemeral");
  assert.match(sent.body.system[0].text, /PAGE: \/denial-prevention\.html/);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), ORIGIN);
});

test("upstream failure returns friendly fallback", async () => {
  globalThis.fetch = async () => new Response("err", { status: 500 });
  const d = await (await call({ messages: [{ role: "user", content: "hello" }] })).json();
  assert.equal(d.fallback, true);
  assert.equal(d.reply, TENANTS.mmc.fallbackReply);
});

test("missing API key returns fallback without calling upstream", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; };
  const d = await (await call({ messages: [{ role: "user", content: "hello" }] }, { env: {} })).json();
  assert.equal(d.fallback, true);
  assert.equal(called, false);
});

test("oversized or malformed input is rejected", async () => {
  assert.equal((await call({ messages: "x" })).status, 400);
  assert.equal((await call({ messages: [{ role: "assistant", content: "hi" }] })).status, 400);
});

test("rate limit kicks in for one IP", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }));
  let last;
  for (let i = 0; i < 14; i++) last = await call({ messages: [{ role: "user", content: "hi" }] }, { ip: "9.9.9.9" });
  assert.equal(last.status, 429);
});
