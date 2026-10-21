/* ==========================================================================
   app.js — shell: routing, sidebar, search, progress, voice dock
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;
  var esc = LLM.esc, q = LLM.q, qa = LLM.qa, on = LLM.on;
  var store = LLM.store;
  var narrator = LLM.narrator;

  var view, chBody, chNav, sidebar, scrim;
  var current = null;
  var bottomObserver = null;
  var toastTimer = null;

  /* ================= helpers exposed to chapters ================= */
  var ctx = {
    esc: LLM.esc,
    attr: LLM.attr,
    fmt: LLM.fmt,
    pct: LLM.pct,
    mm: LLM.math,
    matrix: LLM.matrix,
    chart: LLM.chart,
    demo: LLM.demo,
    tokenizer: LLM.tokenizer,
    icons: LLM.icons,
    store: LLM.store,
    toast: toast,
    on: LLM.on,
    q: LLM.q,
    qa: LLM.qa,
    rerender: function () {
      if (!current) return;
      view.dataset.rendered = "";
      var anchor = null;
      try { narrator.stop(); } catch (e) {}
      render(current, anchor);
    }
  };

  /* ================= toast ================= */
  function toast(msg, ms) {
    var t = q("#toast");
    q("#toastText").textContent = msg;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.hidden = true; }, 300);
    }, ms || 2600);
  }

  /* ================= error reporting ================= */
  var errorLog = [];
  function reportError(where, err) {
    var msg = err && err.message ? err.message : String(err);
    errorLog.push(where + ": " + msg);
    console.error("[" + where + "]", err);
    var banner = q("#errBanner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "errBanner";
      banner.className = "err-banner";
      banner.setAttribute("role", "status");
      var v = q("#view");
      if (v && v.parentElement) v.parentElement.insertBefore(banner, v);
      else document.body.appendChild(banner);
    }
    banner.textContent = "⚠ " + where + " failed: " + msg + " — the rest of the page still works.";
    banner.hidden = false;
    window.__llmErrors = errorLog;
  }
  window.addEventListener("error", function (e) {
    if (e && e.message) reportError("runtime", e);
  });
  window.addEventListener("unhandledrejection", function (e) {
    reportError("promise", e.reason);
  });

  /* ================= theme ================= */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store.setTheme(t);
  }
  function initTheme() {
    var t = store.get().theme;
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", t);
  }

  /* ================= sidebar ================= */
  function buildSidebar() {
    var chapters = LLM.chapters();
    var parts = LLM.parts();
    var html = "";
    parts.forEach(function (p) {
      var inPart = chapters.filter(function (c) { return c.part === p.id; });
      if (!inPart.length) return;
      html += '<div class="nav-part">' + esc(p.title) + "</div>";
      inPart.forEach(function (c) {
        html +=
          '<a class="nav-item" href="#/' + c.id + '" data-ch="' + c.id + '">' +
          '<span class="nav-num"><span>' + String(c.num).padStart(2, "0") + "</span></span>" +
          '<span class="nav-label">' + esc(c.title) + "</span>" +
          '<span class="nav-dot"></span>' +
          "</a>";
      });
    });
    chNav.innerHTML = html;
    refreshNav();
  }

  function refreshNav() {
    var chapters = LLM.chapters();
    var contentChapters = chapters.filter(function (c) { return !c.noProgress; });
    qa(".nav-item", chNav).forEach(function (a) {
      var id = a.getAttribute("data-ch");
      a.classList.toggle("active", current && current.id === id);
      a.classList.toggle("done", store.isDone(id));
    });
    var done = contentChapters.filter(function (c) { return store.isDone(c.id); }).length;
    var pctv = contentChapters.length ? Math.round((done / contentChapters.length) * 100) : 0;
    q("#progressFill").style.width = pctv + "%";
    q("#progressLabel").textContent = pctv + "%";
  }

  function openSidebar() { sidebar.classList.add("open"); scrim.hidden = false; }
  function closeSidebar() { sidebar.classList.remove("open"); scrim.hidden = true; }

  /* ================= routing ================= */
  function parseHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    if (!h) return { id: null, anchor: null };
    var parts = h.split("#");
    return { id: decodeURIComponent(parts[0]), anchor: parts[1] || null };
  }

  function route() {
    var p = parseHash();
    var ch = p.id ? LLM.chapter(p.id) : null;
    if (!ch) {
      ch = LLM.chapter("home") || LLM.chapters()[0];
      if (ch && p.id) { location.replace("#/" + ch.id); }
    }
    if (!ch) return;
    render(ch, p.anchor);
  }

  function go(id) {
    if (location.hash === "#/" + id) { route(); return; }
    location.hash = "#/" + id;
  }

  /* ================= render ================= */
  function render(ch, anchor) {
    if (current && current.id === ch.id && view.dataset.rendered === "1") {
      // same chapter: just scroll to anchor / top
      scrollToAnchor(anchor);
      return;
    }
    try { narrator.stop(); } catch (e) {}
    current = ch;
    store.markVisited(ch.id);

    document.title = ch.title + " · Inside an LLM";
    var part = LLM.partOf(ch);
    q("#crumbPart").textContent = part.title.replace(/^Part [IVX]+ · /, "");
    q("#crumbTitle").textContent = ch.title;

    var head =
      '<header class="ch-head">' +
      (ch.kicker ? '<div class="ch-kicker">' + esc(ch.kicker) + "</div>" : "") +
      '<h1 class="ch-title">' + esc(ch.title) + "</h1>" +
      (ch.summary ? '<p class="ch-sub">' + esc(ch.summary) + "</p>" : "") +
      '<div class="ch-meta" id="chMeta"></div>' +
      "</header>";

    view.innerHTML = '<div class="wrap">' + head + '<article class="prose" id="chBody"></article><div id="chFoot"></div></div>';
    chBody = q("#chBody");
    view.dataset.rendered = "1";

    var body = "";
    try {
      body = ch.render ? ch.render(ctx) : "";
    } catch (e) {
      reportError("render " + ch.id, e);
      body = '<div class="callout warn"><div class="co-label">Render error</div><p>' + esc(e.message) + "</p></div>";
    }
    chBody.innerHTML = body;
    chBody.classList.toggle("prose", ch.prose !== false);

    // narration hooks
    qa("[data-narrate]", chBody).forEach(function (el) { el.classList.add("nb"); });
    wireReadButtons(chBody);

    if (ch.mount) {
      try { ch.mount(chBody, ctx); } catch (e) { reportError("mount " + ch.id, e); }
    }

    var meta = q("#chMeta");
    if (meta && ch.meta !== false) {
      var words = (chBody.innerText || "").split(/\s+/).filter(Boolean).length;
      var mins = Math.max(1, Math.round(words / 210));
      var segs = chBody.querySelectorAll("[data-narrate]").length;
      meta.innerHTML =
        '<span class="meta-pill"><b>' + mins + " min</b> read</span>" +
        '<span class="meta-pill"><b>' + words.toLocaleString() + "</b> words</span>" +
        (segs ? '<span class="meta-pill"><b>' + segs + "</b> narrated passages</span>" : "") +
        (ch.difficulty ? '<span class="meta-pill">Level <b>' + esc(ch.difficulty) + "</b></span>" : "");
    }

    buildFoot(ch);
    narrator.load(chBody, {
      rate: store.voice().rate,
      pitch: store.voice().pitch,
      voiceURI: store.voice().uri,
      follow: store.voice().follow
    });
    updateVoiceUI();
    refreshNav();
    closeSidebar();

    if (anchor) scrollToAnchor(anchor);
    else window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    watchBottom(ch);
    refreshQueryState();

    if (store.voice().autoplay && narrator.supported) {
      setTimeout(function () { narrator.play(); }, 500);
    }
  }

  function scrollToAnchor(anchor) {
    if (anchor) {
      var el = document.getElementById(anchor);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function buildFoot(ch) {
    var chapters = LLM.chapters();
    var idx = chapters.indexOf(ch);
    var prev = chapters[idx - 1];
    var next = chapters[idx + 1];
    q("#chFoot").innerHTML =
      '<div class="ch-end">' +
      '<div class="ch-end-line"></div>' +
      '<div class="ch-end-actions">' +
      '<button class="btn btn-ghost btn-sm" id="markDoneBtn">' + LLM.icons.check + " Mark as complete</button>" +
      "</div>" +
      "</div>";
    var mark = q("#markDoneBtn");
    if (store.isDone(ch.id)) { mark.textContent = "✓ Completed"; mark.disabled = true; }
    mark.addEventListener("click", function () {
      store.markDone(ch.id);
      mark.textContent = "✓ Completed";
      mark.disabled = true;
      refreshNav();
      toast("Chapter marked complete");
    });

    var pv = q("#prevBtn"), nx = q("#nextBtn");
    pv.disabled = !prev;
    nx.disabled = !next;
    pv.textContent = prev ? "← " + prev.title : "← Previous";
    nx.textContent = next ? next.title + " →" : "Next →";
    pv.onclick = prev ? function () { go(prev.id); } : null;
    nx.onclick = next ? function () { go(next.id); } : null;
  }

  function watchBottom(ch) {
    if (bottomObserver) bottomObserver.disconnect();
    var foot = q("#chFoot");
    if (!foot || !("IntersectionObserver" in window)) return;
    var timer = null;
    bottomObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          if (timer) return;
          timer = setTimeout(function () {
            if (!store.isDone(ch.id)) {
              store.markDone(ch.id);
              refreshNav();
              toast("Chapter complete — nice work");
              var mark = q("#markDoneBtn");
              if (mark) { mark.textContent = "✓ Completed"; mark.disabled = true; }
            }
          }, 1600);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      });
    }, { threshold: 0.6 });
    bottomObserver.observe(foot);
  }

  function refreshQueryState() {
    var body = q("#chBody");
    if (!body) return;
    qa("canvas[data-autodraw]", body).forEach(function (cv) {
      try { cv.dispatchEvent(new CustomEvent("redraw")); } catch (e) {}
    });
  }

  /* ================= "listen from here" buttons ================= */
  function wireReadButtons(root) {
    if (!narrator.supported) return;
    qa("h2", root).forEach(function (h) {
      // find the next narrated block after this heading
      var node = h.nextElementSibling;
      var found = null;
      while (node && !found) {
        if (node.hasAttribute && node.hasAttribute("data-narrate")) found = node;
        else if (node.querySelector && node.querySelector("[data-narrate]")) found = node.querySelector("[data-narrate]");
        if (node.tagName === "H2") break;
        node = node.nextElementSibling;
      }
      if (!found) return;
      var btn = document.createElement("button");
      btn.className = "read-btn";
      btn.type = "button";
      btn.innerHTML = LLM.icons.speaker + " Listen";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        narrator.speakElement(found);
      });
      h.appendChild(btn);
    });
  }

  /* ================= voice dock ================= */
  function updateVoiceUI() {
    var s = narrator.snapshot();
    var dock = q("#voiceDock");
    dock.classList.toggle("playing", s.playing);
    q("#voiceTopBtn").classList.toggle("on", s.playing || s.paused);
    if (!narrator.supported) {
      q("#vdLabel").textContent = "No speech support";
      q("#vdText").textContent = "This browser does not expose the Web Speech API. Everything else works normally.";
      return;
    }
    var total = s.total || 1;
    var pctv = s.index < 0 ? 0 : Math.min(100, (s.index / total) * 100);
    q("#vdFill").style.width = pctv + "%";
    if (s.index < 0) {
      q("#vdLabel").textContent = "Narration";
      if (!dock.dataset.live) q("#vdText").textContent = "Press play to hear this chapter explained.";
    }
  }

  function fillVoiceSelect() {
    var sel = q("#vdVoice");
    var voices = narrator.voices();
    if (!voices.length) {
      sel.innerHTML = '<option value="">Default system voice</option>';
      return;
    }
    var cur = narrator.currentVoice();
    sel.innerHTML = voices.map(function (v) {
      return '<option value="' + LLM.attr(v.voiceURI) + '"' + (cur && cur.voiceURI === v.voiceURI ? " selected" : "") + ">" +
        LLM.esc(v.name + " · " + v.lang) + "</option>";
    }).join("");
  }

  function wireVoice() {
    var dock = q("#voiceDock");
    var supported = narrator.supported;

    /* ---- compact / expanded behaviour ---- */
    function setCompact(on) {
      dock.classList.toggle("compact", !!on);
    }
    var hoverCapable = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    setCompact(true);
    if (hoverCapable) {
      dock.addEventListener("mouseenter", function () { setCompact(false); });
      dock.addEventListener("mouseleave", function () {
        if (q("#vdPanel").hidden) setCompact(true);
      });
      dock.addEventListener("focusin", function () { setCompact(false); });
    }
    dock.addEventListener("click", function (e) {
      if (dock.classList.contains("compact") && hoverCapable && !e.target.closest("button")) setCompact(false);
    });

    q("#vdPlay").addEventListener("click", function () {
      if (!supported) { toast("Speech synthesis is not available in this browser"); return; }
      narrator.toggle();
    });
    q("#vdStop").addEventListener("click", function () { narrator.stop(); dock.dataset.live = ""; });
    q("#vdBack").addEventListener("click", function () { narrator.prev(); });
    q("#vdFwd").addEventListener("click", function () { narrator.next(); });
    q("#voiceTopBtn").addEventListener("click", function () {
      if (!supported) { toast("Speech synthesis is not available in this browser"); return; }
      narrator.toggle();
    });

    var panel = q("#vdPanel");
    q("#vdMore").addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      q("#vdMore").classList.toggle("open", !panel.hidden);
      if (!panel.hidden) { setCompact(false); fillVoiceSelect(); }
      else if (hoverCapable) setCompact(true);
    });

    q("#vdVoice").addEventListener("change", function () {
      narrator.setVoice(this.value);
      store.setVoice({ uri: this.value });
    });
    var rate = q("#vdRate"), pitch = q("#vdPitch");
    rate.value = store.voice().rate;
    pitch.value = store.voice().pitch;
    q("#vdRateVal").textContent = Number(rate.value).toFixed(2).replace(/0$/, "") + "×";
    q("#vdPitchVal").textContent = Number(pitch.value).toFixed(2).replace(/0$/, "");
    rate.addEventListener("input", function () {
      q("#vdRateVal").textContent = Number(this.value).toFixed(2).replace(/0$/, "") + "×";
      narrator.setRate(Number(this.value));
      store.setVoice({ rate: Number(this.value) });
    });
    pitch.addEventListener("input", function () {
      q("#vdPitchVal").textContent = Number(this.value).toFixed(2).replace(/0$/, "");
      narrator.setPitch(Number(this.value));
      store.setVoice({ pitch: Number(this.value) });
    });
    var auto = q("#vdAutoplay"), follow = q("#vdFollow");
    auto.checked = !!store.voice().autoplay;
    follow.checked = store.voice().follow !== false;
    auto.addEventListener("change", function () { store.setVoice({ autoplay: this.checked }); });
    follow.addEventListener("change", function () {
      store.setVoice({ follow: this.checked });
      narrator.setFollow(this.checked);
      document.body.classList.toggle("focus-mode", this.checked && narrator.state.playing);
    });
    narrator.setFollow(follow.checked);

    if (!supported) {
      q("#vdNote").textContent = "Web Speech API unavailable — the written explanations stand on their own.";
      q("#vdPlay").disabled = true;
    } else {
      q("#vdNote").textContent = "Narration uses your browser's built-in speech engine. Nothing is sent to a server.";
      if (narrator.voices().length) fillVoiceSelect();
      setTimeout(fillVoiceSelect, 700);
      setTimeout(fillVoiceSelect, 2000);
    }

    narrator.on("statechange", function (s) {
      updateVoiceUI();
      document.body.classList.toggle("focus-mode", s.playing && store.voice().follow);
    });
    narrator.on("progress", function (p) {
      dock.dataset.live = "1";
      if (p.done || p.stopped) {
        q("#vdLabel").textContent = p.done ? "Finished" : "Stopped";
        q("#vdText").textContent = p.done ? "That is the end of this chapter's narration." : "Press play to continue.";
        q("#vdFill").style.width = p.done ? "100%" : "0%";
        return;
      }
      q("#vdLabel").textContent = "Speaking " + Math.min((p.segIndex || 0) + 1, p.segTotal || 1) + "/" + (p.segTotal || 1);
      q("#vdText").textContent = p.text || "";
      var total = p.total || 1;
      q("#vdFill").style.width = Math.min(100, ((p.index || 0) / total) * 100) + "%";
    });
    narrator.on("voices", function () {
      if (!q("#vdPanel").hidden) fillVoiceSelect();
    });
    narrator.on("empty", function () {
      q("#vdText").textContent = "This chapter has no narration.";
    });
    narrator.on("error", function (e) {
      q("#vdText").textContent = "Speech error: " + (e && e.message ? e.message : "unknown");
    });
  }

  /* ================= search ================= */
  var searchIndex = [];
  var searchSel = 0;
  var searchItems = [];

  function buildSearchIndex() {
    searchIndex = [];
    LLM.chapters().forEach(function (c) {
      searchIndex.push({
        type: "chapter",
        id: c.id,
        title: c.title,
        sub: c.summary || c.kicker || "",
        haystack: (c.title + " " + (c.kicker || "") + " " + (c.summary || "") + " " + (c.keywords || "")).toLowerCase()
      });
    });
    (LLM.glossaryTerms || []).forEach(function (t) {
      searchIndex.push({
        type: "term",
        id: t.chapter || "glossary",
        anchor: "term-" + t.slug,
        title: t.term,
        sub: t.def.replace(/<[^>]+>/g, "").slice(0, 120),
        haystack: (t.term + " " + t.def.replace(/<[^>]+>/g, "")).toLowerCase()
      });
    });
  }

  function runSearch(qstr) {
    var s = qstr.trim().toLowerCase();
    var box = q("#searchResults");
    if (!s) {
      searchItems = searchIndex.filter(function (x) { return x.type === "chapter"; }).slice(0, 8);
    } else {
      var toks = s.split(/\s+/);
      searchItems = searchIndex
        .map(function (x) {
          var score = 0;
          toks.forEach(function (t) {
            if (x.title.toLowerCase().indexOf(t) === 0) score += 6;
            else if (x.title.toLowerCase().indexOf(t) > -1) score += 4;
            if (x.haystack.indexOf(t) > -1) score += 2;
          });
          if (x.type === "term" && score) score += 1;
          return { x: x, score: score };
        })
        .filter(function (r) { return r.score > 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 12)
        .map(function (r) { return r.x; });
    }
    searchSel = 0;
    renderSearchResults();
  }

  function renderSearchResults() {
    var box = q("#searchResults");
    if (!searchItems.length) {
      box.innerHTML = '<div class="sr-empty">Nothing found. Try “attention”, “softmax”, “token”.</div>';
      return;
    }
    var html = "";
    var lastType = null;
    searchItems.forEach(function (it, i) {
      if (it.type !== lastType) {
        html += '<div class="sr-group">' + (it.type === "term" ? "Glossary" : "Chapters") + "</div>";
        lastType = it.type;
      }
      var num = it.type === "chapter" ? String((LLM.chapter(it.id) || { num: 0 }).num).padStart(2, "0") : "¶";
      html +=
        '<button class="sr-item' + (i === searchSel ? " sel" : "") + '" data-i="' + i + '">' +
        '<span class="sr-ico">' + num + "</span>" +
        '<span class="sr-txt"><span class="sr-t">' + esc(it.title) + "</span>" +
        '<span class="sr-d">' + esc(it.sub || "") + "</span></span></button>";
    });
    box.innerHTML = html;
    qa(".sr-item", box).forEach(function (b) {
      b.addEventListener("click", function () {
        var it = searchItems[Number(b.getAttribute("data-i"))];
        closeSearch();
        if (it.anchor) location.hash = "#/" + it.id + "#" + it.anchor;
        else go(it.id);
      });
    });
  }

  function openSearch() {
    q("#searchModal").hidden = false;
    var inp = q("#searchInput");
    inp.value = "";
    inp.focus();
    runSearch("");
  }
  function closeSearch() { q("#searchModal").hidden = true; }

  function wireSearch() {
    q("#searchBtn").addEventListener("click", openSearch);
    q("#searchModal").addEventListener("click", function (e) {
      if (e.target.id === "searchModal") closeSearch();
    });
    var inp = q("#searchInput");
    inp.addEventListener("input", LLM.debounce(function () { runSearch(inp.value); }, 90));
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (q("#searchModal").hidden) openSearch(); else closeSearch();
        return;
      }
      if (!q("#searchModal").hidden) {
        if (e.key === "Escape") { closeSearch(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); searchSel = Math.min(searchSel + 1, searchItems.length - 1); renderSearchResults(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); searchSel = Math.max(searchSel - 1, 0); renderSearchResults(); }
        else if (e.key === "Enter") {
          var it = searchItems[searchSel];
          if (it) { closeSearch(); if (it.anchor) location.hash = "#/" + it.id + "#" + it.anchor; else go(it.id); }
        }
      }
    });
  }

  /* ================= global wiring ================= */
  function wireShell() {
    q("#themeBtn").addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      setTimeout(function () { refreshQueryState(); }, 60);
      setTimeout(function () { if (current && current.remountOnTheme) render(current); }, 80);
    });
    q("#menuBtn").addEventListener("click", openSidebar);
    q("#sidebarClose").addEventListener("click", closeSidebar);
    scrim.addEventListener("click", closeSidebar);
    q("#resetProgress").addEventListener("click", function () {
      store.reset();
      refreshNav();
      toast("Progress reset");
    });

    document.addEventListener("click", function (e) {
      var listen = e.target.closest && e.target.closest("[data-listen]");
      if (listen) {
        e.preventDefault();
        if (!narrator.supported) { toast("Speech synthesis is not available in this browser"); return; }
        narrator.toggle();
        return;
      }
      var a = e.target.closest && e.target.closest('a[href^="#/"]');
      if (a) { e.preventDefault(); var id = a.getAttribute("href").slice(2); go(id); }
    });

    window.addEventListener("scroll", function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
      q("#scrollBar").style.width = p + "%";
    }, { passive: true });

    window.addEventListener("keydown", function (e) {
      if (e.target.matches && e.target.matches("input, textarea, select")) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight" && !q("#searchModal") || false) { /* reserved */ }
      if (e.key === "n") q("#nextBtn").click();
      if (e.key === "p") q("#prevBtn").click();
      if (e.key === " ") {
        if (narrator.state.playing || narrator.state.paused) { e.preventDefault(); narrator.toggle(); }
      }
    });

    window.addEventListener("beforeunload", function () {
      try { narrator.stop(); } catch (e) {}
    });

    store.subscribe(function () { refreshNav(); });
  }

  /* ================= boot ================= */
  function boot() {
    view = q("#view");
    chNav = q("#chapterNav");
    sidebar = q("#sidebar");
    scrim = q("#scrim");

    initTheme();
    buildSidebar();
    buildSearchIndex();
    wireShell();
    wireVoice();
    wireSearch();
    window.addEventListener("hashchange", route);
    route();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // re-index once all chapter files have executed
  setTimeout(function () { buildSearchIndex(); }, 0);

  LLM.app = { go: go, toast: toast, ctx: ctx };
})();
