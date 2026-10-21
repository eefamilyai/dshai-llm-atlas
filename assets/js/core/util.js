/* ==========================================================================
   util.js — namespace, DOM helpers, formatting, icons
   ========================================================================== */
(function () {
  "use strict";

  var LLM = (window.LLM = window.LLM || {});

  /* ---------- escaping ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  // escape for a double-quoted HTML attribute
  function attr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- DOM ---------- */
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function on(node, evt, sel, fn) {
    if (typeof sel === "function") { node.addEventListener(evt, sel); return; }
    node.addEventListener(evt, function (e) {
      var t = e.target.closest(sel);
      if (t && node.contains(t)) fn.call(t, e, t);
    });
  }
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
  function txt(node, s) { node.textContent = String(s == null ? "" : s); }

  /* ---------- formatting ---------- */
  function fmt(v, dec) {
    dec = dec == null ? 2 : dec;
    if (!isFinite(v)) return "—";
    if (v === 0) return (0).toFixed(dec);
    var a = Math.abs(v);
    if (a >= 1000) return v.toFixed(0);
    if (a < Math.pow(10, -dec)) return (v > 0 ? "" : "-") + "<" + Math.pow(10, -dec).toFixed(dec);
    return (v < 0 ? "-" : "") + Math.abs(v).toFixed(dec);
  }
  function pct(v, dec) {
    dec = dec == null ? 1 : dec;
    return (v * 100).toFixed(dec) + "%";
  }
  function compact(v) {
    var a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(1) + "B";
    if (a >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (a >= 1e3) return (v / 1e3).toFixed(1) + "k";
    return String(v);
  }
  function sig(v, n) {
    if (v === 0) return "0";
    var d = Math.ceil(Math.log10(Math.abs(v)));
    var dec = Math.max(0, (n || 3) - d);
    return v.toFixed(dec);
  }

  /* ---------- misc ---------- */
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms || 150);
    };
  }
  function raf(fn) { return requestAnimationFrame(fn); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function download(filename, text, mime) {
    var b = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = filename;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* ---------- icons ---------- */
  var I = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 010 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6.5l5.5 5.5L13 17.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.6" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5.4M12 7.9v.3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 00-3.6 10.8c.4.3.6.7.6 1.2v.5h6v-.5c0-.5.2-.9.6-1.2A6 6 0 0012 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4.2L21 19.4H3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 9.6v4.2M12 16.6v.3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    myth: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.6" stroke="currentColor" stroke-width="1.7"/><path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 4.5h9l4 4v11H6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14.6 4.6v4h4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.4" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.6V12l3 1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.4l8.4 4.3L12 12 3.6 7.7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3.6 12.2L12 16.5l8.4-4.3M3.6 16.6L12 20.9l8.4-4.3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.6" y="3.6" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6"/><rect x="13.4" y="3.6" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6"/><rect x="3.6" y="13.4" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6"/><rect x="13.4" y="13.4" width="7" height="7" rx="1.4" stroke="currentColor" stroke-width="1.6"/></svg>',
    type: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 6.5V5h14v1.5M12 5v14M9 19h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.4" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.6" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
    dice: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.8" y="3.8" width="16.4" height="16.4" rx="3.4" stroke="currentColor" stroke-width="1.6"/><circle cx="8.6" cy="8.6" r="1.3" fill="currentColor"/><circle cx="15.4" cy="15.4" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 19.5h16M6.5 16V11M11 16V6.5M15.5 16v-7M20 16v-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5.2c2.6-.9 5.3-.9 8 .6 2.7-1.5 5.4-1.5 8-.6v13c-2.6-.9-5.3-.9-8 .6-2.7-1.5-5.4-1.5-8-.6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 5.8v13" stroke="currentColor" stroke-width="1.6"/></svg>',
    plug: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 3.5v5M15 3.5v5M6.5 8.5h11v3.2a5.5 5.5 0 01-11 0z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17.2v3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    robot: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.2" y="7.6" width="15.6" height="11.6" rx="3.2" stroke="currentColor" stroke-width="1.6"/><circle cx="9.2" cy="13" r="1.35" fill="currentColor"/><circle cx="14.8" cy="13" r="1.35" fill="currentColor"/><path d="M12 4v3.6M9.6 16.4h4.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  LLM.esc = esc;
  LLM.attr = attr;
  LLM.q = q;
  LLM.qa = qa;
  LLM.on = on;
  LLM.el = el;
  LLM.clear = clear;
  LLM.txt = txt;
  LLM.fmt = fmt;
  LLM.pct = pct;
  LLM.compact = compact;
  LLM.sig = sig;
  LLM.clamp = clamp;
  LLM.lerp = lerp;
  LLM.debounce = debounce;
  LLM.raf = raf;
  LLM.sleep = sleep;
  LLM.download = download;
  LLM.icons = I;
})();
