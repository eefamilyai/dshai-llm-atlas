/* ==========================================================================
   registry.js — chapter registration & lookup
   ========================================================================== */
(function () {
  "use strict";
  var LLM = (window.LLM = window.LLM || {});

  var chapters = [];
  var byId = {};

  var PARTS = [
    { id: "foundations", title: "Part I · Foundations" },
    { id: "transformer", title: "Part II · The Transformer" },
    { id: "output", title: "Part III · Turning Numbers Into Words" },
    { id: "learning", title: "Part IV · Learning & Alignment" },
    { id: "synthesis", title: "Part V · Synthesis" }
  ];

  LLM.registerChapter = function (ch) {
    if (!ch || !ch.id) throw new Error("chapter needs an id");
    if (byId[ch.id]) throw new Error("duplicate chapter id: " + ch.id);
    ch.num = chapters.length;
    chapters.push(ch);
    byId[ch.id] = ch;
    return ch;
  };

  LLM.chapters = function () { return chapters.slice(); };
  LLM.chapter = function (id) { return byId[id] || null; };
  LLM.parts = function () { return PARTS; };
  LLM.partOf = function (ch) {
    for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === ch.part) return PARTS[i];
    return PARTS[0];
  };
})();
