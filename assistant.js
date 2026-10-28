/*!
 * GetServices.ai Site Assistant widget
 * Usage:
 * <script src="assistant.js" defer
 *   data-endpoint="https://gs-site-assistant.python-tester.workers.dev/chat"
 *   data-tenant="mmc"
 *   data-name="Mass Medical Coding Assistant"
 *   data-lead-email="agents@getservices.ai"></script>
 */
(function () {
  "use strict";
  if (window.__gsAssistant) return;
  window.__gsAssistant = true;

  var script = document.currentScript || document.querySelector('script[src*="assistant.js"]');
  var cfg = {
    endpoint: (script && script.dataset.endpoint) || "",
    tenant: (script && script.dataset.tenant) || "",
    name: (script && script.dataset.name) || "Site Assistant",
    leadEmail: (script && script.dataset.leadEmail) || "",
    poweredUrl: "https://getservices.ai",
    formUrl: "index.html#contact",
  };
  var STORE = "gs-assistant-" + cfg.tenant;

  // ---------- page-aware prompts and callouts ----------
  var page = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
  var PAGE_PROMPTS = {
    "medical-coding": ["What does a coding review include?", "Do you review E/M levels?", "How many charts do you review?"],
    "documentation-audits": ["What do you look for in an audit?", "Chart audit vs documentation review?", "How often should we audit?"],
    "denial-prevention": ["How do you reduce denials?", "What data do you need?", "Common denial causes?"],
    "revenue-cycle-consulting": ["Which KPIs should we track?", "Do you replace our billing company?", "How does an engagement work?"],
    "compliance-audits": ["What does a compliance audit cover?", "We got a records request — can you help?", "Can you audit one provider?"],
    "provider-education": ["What training topics do you cover?", "Is training virtual?", "How long are sessions?"],
    "documentation-tips": ["How do I support an E/M level?", "Does a longer note mean a higher level?", "Tips for chronic conditions?"],
    "coding-guidance": ["When should I use modifier 25?", "What are NCCI edits?", "When do code sets update?"],
    "revenue-insights": ["What is a good clean claim rate?", "How do I lower days in A/R?", "What are timely-filing limits?"],
    "boston-massachusetts": ["Do you know MassHealth rules?", "Do you work with BCBS Massachusetts?", "Can you come on site in Boston?"],
    index: ["What services do you offer?", "How does the free assessment work?", "Which specialties do you support?"],
  };
  var CALLOUTS = {
    "denial-prevention": "Losing revenue to denials? Ask me how to fix the root cause.",
    "medical-coding": "Wondering if your E/M levels are right? Ask me.",
    "documentation-audits": "Want to know what an audit would find? Ask me.",
    "compliance-audits": "Worried about a payer audit? I can explain how we help.",
    "boston-massachusetts": "Questions about MassHealth or BCBS MA? Ask me.",
    "revenue-insights": "Want to benchmark your clean claim rate? Ask me.",
    index: "Hi! Questions about coding, audits or denials? Ask me — or just talk.",
  };
  var prompts = PAGE_PROMPTS[page] || PAGE_PROMPTS.index;
  var callout = CALLOUTS[page] || "Questions about medical coding? Ask me — I can talk too.";

  // ---------- state ----------
  var state = { messages: [], open: false, speak: false, busy: false };
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
    if (saved && Array.isArray(saved.messages)) state.messages = saved.messages.slice(-30);
    if (saved && saved.speak) state.speak = true;
  } catch (e) {}
  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify({ messages: state.messages, speak: state.speak })); } catch (e) {}
  }

  // ---------- UI ----------
  var host = document.createElement("div");
  host.id = "gs-assistant";
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var css = [
    ":host{all:initial}",
    "*{box-sizing:border-box;font-family:'Inter',system-ui,-apple-system,Segoe UI,sans-serif}",
    ".launch{position:fixed;right:20px;bottom:20px;width:62px;height:62px;border-radius:50%;border:none;cursor:pointer;z-index:2147483000;",
    "background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;box-shadow:0 12px 30px rgba(13,148,136,.35);display:flex;align-items:center;justify-content:center;transition:transform .2s}",
    ".launch:hover{transform:scale(1.06)}",
    ".launch svg{width:28px;height:28px}",
    ".pulse{position:absolute;inset:0;border-radius:50%;border:2px solid #2dd4bf;animation:p 2.4s ease-out infinite}",
    "@keyframes p{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.5);opacity:0}}",
    ".callout{position:fixed;right:92px;bottom:30px;max-width:260px;background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-left:4px solid #2dd4bf;",
    "border-radius:14px;padding:12px 34px 12px 14px;font-size:14px;line-height:1.45;box-shadow:0 14px 40px rgba(15,23,42,.14);z-index:2147483000;cursor:pointer;animation:in .35s ease-out}",
    ".callout .x{position:absolute;top:6px;right:8px;border:none;background:none;font-size:16px;color:#64748b;cursor:pointer}",
    "@keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    ".panel{position:fixed;right:20px;bottom:94px;width:380px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 120px);background:#fff;",
    "border-radius:20px;box-shadow:0 24px 70px rgba(15,23,42,.22);display:none;flex-direction:column;overflow:hidden;z-index:2147483000;border:1px solid #e2e8f0}",
    ".panel.open{display:flex;animation:in .25s ease-out}",
    ".head{background:linear-gradient(135deg,#042f2e,#0f766e);color:#fff;padding:14px 14px 12px 16px;display:flex;align-items:center;gap:10px}",
    ".avatar{width:36px;height:36px;border-radius:50%;background:#2dd4bf;color:#042f2e;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:11px;letter-spacing:-.3px;flex:none}",
    ".title{flex:1;min-width:0}.title b{display:block;font-size:15px}.title a{color:#99f6e4;font-size:11.5px;text-decoration:none}",
    ".icon{background:rgba(255,255,255,.12);border:none;color:#fff;width:34px;height:34px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center}",
    ".icon svg{width:18px;height:18px}.icon.on{background:#2dd4bf;color:#042f2e}",
    ".notice{background:#f0fdfa;color:#0f766e;font-size:12px;padding:8px 14px;border-bottom:1px solid #ccfbf1}",
    ".msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f8fafc}",
    ".m{max-width:86%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.5;color:#0f172a;word-wrap:break-word}",
    ".m.bot{background:#fff;border:1px solid #e2e8f0;align-self:flex-start;border-top-left-radius:4px}",
    ".m.user{background:#0f766e;color:#fff;align-self:flex-end;border-top-right-radius:4px}",
    ".m a{color:#0f766e;font-weight:600}.m.user a{color:#fff}",
    ".m ul{margin:6px 0 0 18px;padding:0}.m p{margin:0 0 6px}.m p:last-child{margin:0}",
    ".typing span{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:#14b8a6;animation:b 1s infinite}",
    ".typing span:nth-child(2){animation-delay:.15s}.typing span:nth-child(3){animation-delay:.3s}",
    "@keyframes b{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}",
    ".chips{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 0;background:#fff}",
    ".chip{border:1px solid #99f6e4;background:#f0fdfa;color:#0f766e;border-radius:999px;padding:7px 11px;font-size:12.5px;cursor:pointer;font-weight:600}",
    ".chip.cta{background:#0f766e;color:#fff;border-color:#0f766e}",
    ".bar{display:flex;gap:8px;padding:10px 12px 12px;background:#fff;align-items:flex-end}",
    "textarea{flex:1;resize:none;border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;font-size:14px;max-height:110px;min-height:42px;outline:none;color:#0f172a}",
    "textarea:focus{border-color:#14b8a6;box-shadow:0 0 0 3px rgba(45,212,191,.2)}",
    ".btn{width:42px;height:42px;border-radius:12px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}",
    ".btn svg{width:20px;height:20px}",
    ".send{background:#0f766e;color:#fff}.send:disabled{opacity:.5;cursor:default}",
    ".mic{background:#f0fdfa;color:#0f766e;border:1px solid #99f6e4}.mic.rec{background:#dc2626;color:#fff;border-color:#dc2626;animation:p2 1.2s infinite}",
    "@keyframes p2{50%{box-shadow:0 0 0 6px rgba(220,38,38,.2)}}",
    ".lead{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;align-self:stretch}",
    ".lead b{display:block;margin-bottom:8px;font-size:14px;color:#0f172a}",
    ".lead input{width:100%;margin-bottom:8px;border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;font-size:13.5px;color:#0f172a}",
    ".lead button{width:100%;background:#0f766e;color:#fff;border:none;border-radius:10px;padding:10px;font-weight:700;cursor:pointer}",
    ".lead small{display:block;color:#64748b;font-size:11.5px;margin-top:6px}",
    "@media(max-width:480px){.panel{right:8px;left:8px;width:auto;bottom:86px;height:calc(100vh - 110px)}.callout{right:86px;left:12px;max-width:none}}",
    "@media(prefers-reduced-motion:reduce){.pulse,.mic.rec{animation:none}}",
  ].join("");

  var ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  };

  root.innerHTML =
    "<style>" + css + "</style>" +
    '<button class="launch" aria-label="Open chat with ' + esc(cfg.name) + '"><span class="pulse"></span>' + ICON.chat + "</button>" +
    '<div class="panel" role="dialog" aria-label="' + esc(cfg.name) + '">' +
      '<div class="head"><div class="avatar">MMC</div><div class="title"><b>' + esc(cfg.name) + '</b>' +
      '<a href="' + cfg.poweredUrl + '" target="_blank" rel="noopener">Powered by GetServices.ai</a></div>' +
      '<button class="icon spk" aria-label="Read replies aloud" title="Read replies aloud">' + ICON.speaker + "</button>" +
      '<button class="icon cls" aria-label="Close chat">' + ICON.close + "</button></div>" +
      '<div class="notice">Please don’t share patient information. Chats are handled by GetServices.ai, our technology partner.</div>' +
      '<div class="msgs" aria-live="polite"></div>' +
      '<div class="chips"></div>' +
      '<div class="bar"><textarea rows="1" placeholder="Ask a question…" aria-label="Your message"></textarea>' +
      '<button class="btn mic" aria-label="Speak your question" title="Speak">' + ICON.mic + "</button>" +
      '<button class="btn send" aria-label="Send">' + ICON.send + "</button></div>" +
    "</div>";

  var $ = function (s) { return root.querySelector(s); };
  var launch = $(".launch"), panel = $(".panel"), msgsEl = $(".msgs"), chipsEl = $(".chips");
  var input = $("textarea"), sendBtn = $(".send"), micBtn = $(".mic"), spkBtn = $(".spk");

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeHref(u) {
    if (/^\/[^\/]|^[a-z0-9-]+\.html(#[\w-]+)?$|^#/i.test(u)) return u.replace(/^\//, "");
    try { var x = new URL(u); if (x.host === location.host) return x.href; } catch (e) {}
    return null;
  }
  function md(text) {
    var lines = esc(text).split(/\n/);
    var out = "", inList = false;
    lines.forEach(function (l) {
      l = l.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
           .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, u) {
             var h = safeHref(u.replace(/&amp;/g, "&"));
             return h ? '<a href="' + esc(h) + '">' + t + "</a>" : t;
           })
           .replace(/(^|\s)(\/[a-z0-9-]+\.html(#[\w-]+)?)/gi, function (_, s, u) {
             return s + '<a href="' + u.slice(1) + '">' + u + "</a>";
           });
      var li = l.match(/^\s*[-•*]\s+(.*)/);
      if (li) { if (!inList) { out += "<ul>"; inList = true; } out += "<li>" + li[1] + "</li>"; return; }
      if (inList) { out += "</ul>"; inList = false; }
      if (l.trim()) out += "<p>" + l + "</p>";
    });
    if (inList) out += "</ul>";
    return out;
  }
  function plain(text) {
    return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*#_`]/g, "").replace(/\/[a-z0-9-]+\.html(#[\w-]+)?/gi, "");
  }

  function bubble(role, text) {
    var d = document.createElement("div");
    d.className = "m " + (role === "user" ? "user" : "bot");
    d.innerHTML = role === "user" ? esc(text) : md(text);
    msgsEl.appendChild(d);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return d;
  }

  function renderChips() {
    chipsEl.innerHTML = "";
    prompts.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "chip"; b.textContent = p;
      b.onclick = function () { send(p); };
      chipsEl.appendChild(b);
    });
    var cb = document.createElement("button");
    cb.className = "chip cta"; cb.textContent = "Request a callback";
    cb.onclick = showLead;
    chipsEl.appendChild(cb);
  }

  function greet() {
    msgsEl.innerHTML = "";
    if (!state.messages.length) {
      bubble("bot", "Hi! I'm the " + cfg.name + ". Ask me anything about medical coding reviews, documentation audits, denials or our free revenue assessment. You can type or tap the mic to talk.");
    } else {
      state.messages.forEach(function (m) { bubble(m.role, m.content); });
    }
  }

  // ---------- voice ----------
  var synth = window.speechSynthesis;
  function speak(text) {
    if (!state.speak || !synth) return;
    try {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(plain(text));
      u.rate = 1.02; u.lang = "en-US";
      var v = synth.getVoices().filter(function (x) { return /en-US/.test(x.lang) && /female|samantha|aria|jenny|google us/i.test(x.name); })[0];
      if (v) u.voice = v;
      synth.speak(u);
    } catch (e) {}
  }
  function setSpeak(on) {
    state.speak = on; save();
    spkBtn.classList.toggle("on", on);
    spkBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (!on && synth) synth.cancel();
  }
  if (!synth) spkBtn.style.display = "none";
  spkBtn.onclick = function () { setSpeak(!state.speak); };

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, listening = false;
  if (!SR) {
    micBtn.style.display = "none";
  } else {
    micBtn.onclick = function () {
      if (listening) { rec && rec.stop(); return; }
      try {
        rec = new SR();
        rec.lang = "en-US"; rec.interimResults = true; rec.maxAlternatives = 1;
        var finalText = "";
        rec.onresult = function (e) {
          var t = "";
          for (var i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
            else t += e.results[i][0].transcript;
          }
          input.value = (finalText + t).trim();
        };
        rec.onend = function () {
          listening = false; micBtn.classList.remove("rec");
          if (input.value.trim()) { if (!state.speak) setSpeak(true); send(input.value); }
        };
        rec.onerror = function () { listening = false; micBtn.classList.remove("rec"); };
        rec.start(); listening = true; micBtn.classList.add("rec");
        if (synth) synth.cancel();
      } catch (e) { listening = false; }
    };
  }

  // ---------- chat ----------
  var PHI = [/\b\d{3}-\d{2}-\d{4}\b/, /\b(ssn|social security)\b/i, /\b(dob|date of birth|born on)\b[^a-z]{0,6}\d/i,
    /\b(mrn|medical record( number)?|member id|subscriber id|policy (number|no))\b\s*[:#]?\s*[a-z0-9-]{4,}/i,
    /\bpatient\b.{0,40}\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/i];
  function looksLikePHI(t) { return PHI.some(function (r) { return r.test(t); }); }
  var PHI_REPLY = "For your privacy, please don't share patient details like names, dates of birth, member IDs or record numbers here. Tap \"Request a callback\" and our team will follow up securely.";
  var FALLBACK = "Sorry, I can't answer right now. You can request a free revenue assessment [here](" + cfg.formUrl + ") or tap \"Request a callback\".";

  function send(text) {
    text = String(text || "").trim();
    if (!text || state.busy) return;
    input.value = ""; autosize();
    bubble("user", text);
    if (looksLikePHI(text)) { bubble("bot", PHI_REPLY); speak(PHI_REPLY); return; }
    state.messages.push({ role: "user", content: text.slice(0, 800) });
    save();
    state.busy = true; sendBtn.disabled = true;
    var t = document.createElement("div");
    t.className = "m bot typing"; t.innerHTML = "<span></span><span></span><span></span>";
    msgsEl.appendChild(t); msgsEl.scrollTop = msgsEl.scrollHeight;

    var done = function (reply) {
      t.remove();
      state.messages.push({ role: "assistant", content: reply });
      save();
      bubble("bot", reply); speak(reply);
      state.busy = false; sendBtn.disabled = false;
    };
    if (!cfg.endpoint) return done(FALLBACK);
    var url = cfg.endpoint + (cfg.endpoint.indexOf("?") < 0 ? "?" : "&") + "tenant=" + encodeURIComponent(cfg.tenant);
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { ctrl && ctrl.abort(); }, 25000);
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: state.messages.slice(-16) }),
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { clearTimeout(timer); done((d && d.reply) || FALLBACK); })
      .catch(function () { clearTimeout(timer); done(FALLBACK); });
  }

  // ---------- callback / lead form ----------
  function showLead() {
    if ($(".lead")) { $(".lead").scrollIntoView({ block: "nearest" }); return; }
    var f = document.createElement("form");
    f.className = "lead";
    f.innerHTML =
      "<b>Request a callback</b>" +
      '<input name="name" placeholder="Your name" required autocomplete="name">' +
      '<input name="practice_name" placeholder="Practice name" required autocomplete="organization">' +
      '<input name="email" type="email" placeholder="Business email" required autocomplete="email">' +
      '<input name="phone" type="tel" placeholder="Phone (optional)" autocomplete="tel">' +
      '<input name="specialty" placeholder="Specialty and number of providers">' +
      '<button type="submit">Send</button>' +
      "<small>No patient information, please. We usually reply within one business day.</small>";
    f.onsubmit = function (e) {
      e.preventDefault();
      var btn = f.querySelector("button"); btn.disabled = true; btn.textContent = "Sending…";
      var data = {};
      Array.prototype.forEach.call(f.elements, function (el) { if (el.name) data[el.name] = el.value.trim(); });
      data._subject = "New chat callback request – " + cfg.name;
      data._template = "table";
      data.page = location.pathname;
      data.chat_questions = state.messages.filter(function (m) { return m.role === "user"; })
        .map(function (m) { return m.content; }).slice(-6).join(" | ");
      var ok = function () {
        f.remove();
        var msg = "Thanks, " + (data.name || "there") + "! Your request was sent. Our team will reach out to " + data.email + " soon.";
        bubble("bot", msg); speak(msg);
      };
      if (!cfg.leadEmail) { ok(); return; }
      fetch("https://formsubmit.co/ajax/" + encodeURIComponent(cfg.leadEmail), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (r) { if (!r.ok) throw 0; ok(); })
        .catch(function () {
          btn.disabled = false; btn.textContent = "Send";
          bubble("bot", "That didn't go through. Please use the form [here](" + cfg.formUrl + ").");
        });
    };
    msgsEl.appendChild(f);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    f.querySelector("input").focus();
  }

  // ---------- open / close / callout ----------
  var calloutEl = null;
  function hideCallout() { if (calloutEl) { calloutEl.remove(); calloutEl = null; } }
  function openPanel() {
    hideCallout();
    state.open = true; panel.classList.add("open");
    launch.innerHTML = ICON.close; launch.setAttribute("aria-label", "Close chat");
    try { sessionStorage.setItem(STORE + "-seen", "1"); } catch (e) {}
    setTimeout(function () { input.focus(); }, 50);
  }
  function closePanel() {
    state.open = false; panel.classList.remove("open");
    launch.innerHTML = '<span class="pulse"></span>' + ICON.chat;
    launch.setAttribute("aria-label", "Open chat with " + cfg.name);
    if (synth) synth.cancel();
  }
  launch.onclick = function () { state.open ? closePanel() : openPanel(); };
  $(".cls").onclick = closePanel;

  function showCallout() {
    if (state.open) return;
    try { if (sessionStorage.getItem(STORE + "-callout") === page) return; sessionStorage.setItem(STORE + "-callout", page); } catch (e) {}
    calloutEl = document.createElement("div");
    calloutEl.className = "callout"; calloutEl.setAttribute("role", "status");
    calloutEl.innerHTML = esc(callout) + '<button class="x" aria-label="Dismiss">×</button>';
    calloutEl.onclick = function (e) { if (e.target.classList.contains("x")) { hideCallout(); return; } openPanel(); };
    root.appendChild(calloutEl);
    setTimeout(hideCallout, 14000);
  }
  setTimeout(showCallout, 6000);

  // ---------- input ----------
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 110) + "px"; }
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); }
  });
  sendBtn.onclick = function () { send(input.value); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.open) closePanel(); });

  setSpeak(state.speak);
  renderChips();
  greet();
})();
