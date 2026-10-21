/* ==========================================================================
   narrator.js — voice narration engine built on the Web Speech API.
   Walks every [data-narrate] block in the page in order, splits the text
   into utterance-sized chunks, highlights the block being spoken and
   scrolls it into view.
   ========================================================================== */
(function () {
  "use strict";
  var LLM = (window.LLM = window.LLM || {});

  var synth = window.speechSynthesis;
  var supported = !!synth && typeof window.SpeechSynthesisUtterance === "function";

  var state = {
    segments: [],   // [{el, text}]
    utterances: [], // [{segIndex, text}]
    index: -1,
    playing: false,
    paused: false,
    rate: 1,
    pitch: 1,
    voiceURI: "",
    follow: true,
    container: null
  };

  var listeners = {};
  function emit(evt, payload) {
    (listeners[evt] || []).forEach(function (f) {
      try { f(payload); } catch (e) { /* noop */ }
    });
  }
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }

  /* ---------------- voices ---------------- */
  var cachedVoices = [];
  var VOICE_PREFS = [
    /google\s*(uk|us)?\s*english/i, /natural/i, /premium/i, /enhanced/i,
    /samantha/i, /aria/i, /jenny/i, /guy/i, /libby/i, /sonia/i, /serena/i,
    /allison/i, /ava/i, /karen/i, /moira/i, /tessa/i, /daniel/i, /zira/i,
    /david/i, /mark/i, /google/i
  ];

  function scoreVoice(v) {
    var s = 0;
    if (/^en[-_]?(GB|US|AU|NZ|CA)?$/i.test(v.lang.replace(/_/g, "-")) || /^en/i.test(v.lang)) s += 30;
    if (v.localService) s += 2;
    for (var i = 0; i < VOICE_PREFS.length; i++) {
      if (VOICE_PREFS[i].test(v.name)) { s += 40 - i * 2; break; }
    }
    if (v.default) s += 3;
    return s;
  }

  function loadVoices() {
    if (!supported) return [];
    var all = synth.getVoices() || [];
    cachedVoices = all.slice().sort(function (a, b) {
      return scoreVoice(b) - scoreVoice(a);
    });
    return cachedVoices;
  }

  function englishVoices() {
    var en = cachedVoices.filter(function (v) { return /^en/i.test(v.lang); });
    return en.length ? en : cachedVoices;
  }

  function currentVoice() {
    var list = englishVoices();
    if (!list.length) return null;
    if (state.voiceURI) {
      var found = list.filter(function (v) { return v.voiceURI === state.voiceURI; })[0];
      if (found) return found;
    }
    return list[0];
  }

  /* ---------------- text chunking ---------------- */
  function splitText(text, maxLen) {
    maxLen = maxLen || 190;
    var t = String(text).replace(/\s+/g, " ").trim();
    if (t.length <= maxLen) return [t];
    var parts = [];
    var buf = "";
    var sentences = t.match(/[^.!?…;:]+[.!?…;:]*\s*/g) || [t];
    sentences.forEach(function (s) {
      s = s.trim();
      if (!s) return;
      if (s.length > maxLen) {
        // hard-wrap very long sentences at spaces
        var words = s.split(" ");
        var line = "";
        words.forEach(function (w) {
          if ((line + " " + w).trim().length > maxLen) {
            if (line) parts.push(line.trim());
            line = w;
          } else {
            line = (line + " " + w).trim();
          }
        });
        if (line) parts.push(line.trim());
        return;
      }
      if ((buf + " " + s).trim().length > maxLen) {
        if (buf) parts.push(buf.trim());
        buf = s;
      } else {
        buf = (buf + " " + s).trim();
      }
    });
    if (buf) parts.push(buf.trim());
    return parts.filter(Boolean);
  }

  /* ---------------- loading ---------------- */
  function load(container, opts) {
    opts = opts || {};
    state.container = container;
    state.segments = [];
    state.utterances = [];
    if (opts.voiceURI != null) state.voiceURI = opts.voiceURI;
    if (opts.rate != null) state.rate = opts.rate;
    if (opts.pitch != null) state.pitch = opts.pitch;
    if (opts.follow != null) state.follow = opts.follow;

    var nodes = container ? container.querySelectorAll("[data-narrate]") : [];
    Array.prototype.forEach.call(nodes, function (el) {
      var text = el.getAttribute("data-narrate");
      if (!text || !text.trim()) return;
      var segIndex = state.segments.length;
      state.segments.push({ el: el, text: text, startUtterance: state.utterances.length });
      splitText(text).forEach(function (piece) {
        state.utterances.push({ segIndex: segIndex, text: piece, el: el });
      });
    });
    state.index = -1;
    emit("loaded", { count: state.segments.length, utterances: state.utterances.length });
    return state.segments.length;
  }

  /* ---------------- speaking ---------------- */
  var token = 0;

  function clearHighlight() {
    Array.prototype.forEach.call(document.querySelectorAll(".nb.speaking"), function (e) {
      e.classList.remove("speaking");
    });
  }

  function highlight(el) {
    clearHighlight();
    if (!el) return;
    el.classList.add("speaking");
    if (!state.follow) return;
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    if (r.top < 120 || r.bottom > vh - 60) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function buildUtterance(u, myToken) {
    var utt = new SpeechSynthesisUtterance(u.text);
    var v = currentVoice();
    if (v) { utt.voice = v; utt.lang = v.lang; }
    else utt.lang = "en-US";
    utt.rate = state.rate;
    utt.pitch = state.pitch;
    utt.volume = 1;
    utt.onstart = function () {
      if (myToken !== token) return;
      state.playing = true;
      state.paused = false;
      var seg = state.segments[u.segIndex];
      highlight(seg ? seg.el : null);
      emit("statechange", snapshot());
      emit("progress", {
        index: state.index,
        total: state.utterances.length,
        segIndex: u.segIndex,
        segTotal: state.segments.length,
        text: u.text,
        el: seg ? seg.el : null
      });
    };
    utt.onend = function () {
      if (myToken !== token) return;
      state.index += 1;
      if (state.index >= state.utterances.length) {
        state.playing = false;
        state.paused = false;
        clearHighlight();
        emit("progress", { index: state.index, total: state.utterances.length, done: true });
        emit("statechange", snapshot());
        return;
      }
      speakCurrent();
    };
    utt.onerror = function (e) {
      if (myToken !== token) return;
      if (e && (e.error === "canceled" || e.error === "interrupted")) return;
      state.index += 1;
      if (state.index < state.utterances.length) speakCurrent();
    };
    return utt;
  }

  function speakCurrent() {
    if (!supported) return;
    if (state.index < 0 || state.index >= state.utterances.length) {
      state.playing = false;
      emit("statechange", snapshot());
      return;
    }
    var myToken = token;
    var u = state.utterances[state.index];
    var utt = buildUtterance(u, myToken);
    synth.speak(utt);
  }

  function play(fromIndex) {
    if (!supported) { emit("error", { message: "unsupported" }); return; }
    if (state.paused) { resume(); return; }
    if (state.playing) return;
    if (!state.utterances.length) { emit("empty"); return; }
    token++;
    synth.cancel();
    // cancel() is async in some engines; give it a tick
    setTimeout(function () {
      var myToken = token;
      if (fromIndex != null) state.index = fromIndex;
      else if (state.index < 0) state.index = 0;
      if (state.index >= state.utterances.length) state.index = 0;
      state.playing = true;
      state.paused = false;
      emit("statechange", snapshot());
      if (myToken === token) speakCurrent();
    }, 60);
  }

  function pause() {
    if (!supported || !state.playing) return;
    synth.pause();
    state.paused = true;
    state.playing = false;
    emit("statechange", snapshot());
  }

  function resume() {
    if (!supported) return;
    if (state.paused) {
      synth.resume();
      state.paused = false;
      state.playing = true;
      emit("statechange", snapshot());
      return;
    }
    play();
  }

  function stop() {
    if (!supported) return;
    token++;
    synth.cancel();
    state.playing = false;
    state.paused = false;
    state.index = -1;
    clearHighlight();
    emit("statechange", snapshot());
    emit("progress", { index: 0, total: state.utterances.length, stopped: true });
  }

  function toggle() {
    if (state.playing) pause();
    else if (state.paused) resume();
    else play();
  }

  function next() {
    if (!state.utterances.length) return;
    token++;
    synth.cancel();
    var wasPlaying = state.playing || state.paused;
    // jump to the first utterance of the next *segment*
    var cur = state.utterances[Math.max(state.index, 0)];
    var seg = cur ? cur.segIndex : -1;
    var target = state.segments[Math.min(seg + 1, state.segments.length - 1)];
    var idx = target ? target.startUtterance : 0;
    state.paused = false;
    if (wasPlaying) { state.index = idx; setTimeout(function () { play(idx); }, 60); }
    else {
      state.index = idx;
      highlight(target ? target.el : null);
      emit("progress", { index: idx, total: state.utterances.length, segIndex: target ? state.segments.indexOf(target) : 0, text: target ? target.text : "" });
    }
  }

  function prev() {
    if (!state.utterances.length) return;
    token++;
    synth.cancel();
    var wasPlaying = state.playing || state.paused;
    var cur = state.utterances[Math.max(state.index, 0)];
    var seg = cur ? cur.segIndex : 0;
    var curSeg = state.segments[seg];
    // if we're already near the start of this segment, go back one segment
    var offset = state.index - (curSeg ? curSeg.startUtterance : 0);
    var targetSeg = offset > 1 ? seg : Math.max(0, seg - 1);
    var target = state.segments[targetSeg];
    var idx = target ? target.startUtterance : 0;
    state.paused = false;
    if (wasPlaying) { state.index = idx; setTimeout(function () { play(idx); }, 60); }
    else {
      state.index = idx;
      highlight(target ? target.el : null);
      emit("progress", { index: idx, total: state.utterances.length, segIndex: targetSeg, text: target ? target.text : "" });
    }
  }

  /** Speak a single, ad-hoc string (used by "listen to this section"). */
  function speakElement(el) {
    if (!supported || !el) return;
    var text = el.getAttribute("data-narrate");
    if (!text) return;
    var segIndex = -1;
    for (var i = 0; i < state.segments.length; i++) {
      if (state.segments[i].el === el) { segIndex = i; break; }
    }
    if (segIndex < 0) return;
    var idx = state.segments[segIndex].startUtterance;
    play(idx);
  }

  function snapshot() {
    return {
      supported: supported,
      playing: state.playing,
      paused: state.paused,
      index: state.index,
      total: state.utterances.length,
      segTotal: state.segments.length,
      rate: state.rate,
      pitch: state.pitch,
      voiceURI: state.voiceURI
    };
  }

  function setRate(r) { state.rate = r; if (state.playing) restart(); }
  function setPitch(p) { state.pitch = p; if (state.playing) restart(); }
  function setVoice(uri) { state.voiceURI = uri; if (state.playing) restart(); }
  function restart() {
    var i = state.index;
    token++;
    synth.cancel();
    setTimeout(function () { play(i); }, 60);
  }

  /* initialise voices (async in Chrome) */
  if (supported) {
    loadVoices();
    if (typeof synth.onvoiceschanged !== "undefined") {
      synth.onvoiceschanged = function () {
        loadVoices();
        emit("voices", englishVoices());
      };
    }
    window.addEventListener("beforeunload", function () { try { synth.cancel(); } catch (e) {} });
  }

  LLM.narrator = {
    supported: supported,
    on: on,
    load: load,
    play: play,
    pause: pause,
    resume: resume,
    stop: stop,
    toggle: toggle,
    next: next,
    prev: prev,
    speakElement: speakElement,
    setRate: setRate,
    setPitch: setPitch,
    setVoice: setVoice,
    setFollow: function (v) { state.follow = v; },
    voices: englishVoices,
    allVoices: function () { return cachedVoices; },
    currentVoice: currentVoice,
    snapshot: snapshot,
    state: state,
    splitText: splitText
  };
})();
