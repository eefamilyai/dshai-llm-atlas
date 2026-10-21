/* ==========================================================================
   store.js — localStorage-backed settings & chapter progress
   ========================================================================== */
(function () {
  "use strict";
  var LLM = (window.LLM = window.LLM || {});
  var KEY = "llm-atlas.v1";

  var defaults = {
    theme: "dark",
    progress: {},          // { chapterId: true }
    visited: {},           // { chapterId: true }
    voice: {
      uri: "",
      rate: 1,
      pitch: 1,
      autoplay: false,
      follow: true
    },
    quizBest: {}           // { chapterId: {score, total} }
  };

  var state = load();
  var listeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaults));
      var p = JSON.parse(raw);
      var out = JSON.parse(JSON.stringify(defaults));
      Object.keys(defaults).forEach(function (k) {
        if (p[k] !== undefined) {
          if (typeof defaults[k] === "object" && defaults[k] !== null && !Array.isArray(defaults[k])) {
            out[k] = Object.assign({}, defaults[k], p[k]);
          } else {
            out[k] = p[k];
          }
        }
      });
      return out;
    } catch (e) {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function emit() { listeners.forEach(function (f) { try { f(state); } catch (e) {} }); }

  var Store = {
    get: function () { return state; },
    settings: function () { return state; },
    voice: function () { return state.voice; },
    setTheme: function (t) { state.theme = t; save(); emit(); },
    setVoice: function (patch) { Object.assign(state.voice, patch); save(); emit(); },
    isDone: function (id) { return !!state.progress[id]; },
    markDone: function (id) {
      if (!state.progress[id]) { state.progress[id] = true; save(); emit(); }
    },
    isVisited: function (id) { return !!state.visited[id]; },
    markVisited: function (id) { state.visited[id] = true; save(); emit(); },
    setQuizBest: function (id, score, total) {
      var prev = state.quizBest[id];
      if (!prev || score > prev.score) { state.quizBest[id] = { score: score, total: total }; save(); emit(); }
    },
    getQuizBest: function (id) { return state.quizBest[id] || null; },
    doneCount: function () { return Object.keys(state.progress).length; },
    reset: function () {
      state.progress = {};
      state.visited = {};
      state.quizBest = {};
      save();
      emit();
    },
    subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    KEY: KEY
  };

  LLM.store = Store;
})();
