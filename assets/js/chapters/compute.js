/* ==========================================================================
   _compute.js — the deterministic toy transformer every chapter computes on.
   These are REAL computed tensors: the arithmetic is exactly what a real
   transformer does. The specific weights are randomly initialised, so the
   values are arbitrary until chapter 12 explains training.
   ========================================================================== */
(function () {
  "use strict";
  var LLM = (window.LLM = window.LLM || {});
  var M = LLM.math;

  var VOCAB = ["The", " cat", " sat", " on", " the", " mat", " floor", " table",
    " dog", " roof", " sofa", " bed", " chair", " ground"];

  /* ---------------- helpers ---------------- */
  function makeVec(rng, n, sd) {
    var v = [];
    for (var i = 0; i < n; i++) v.push(M.gaussFrom(rng) * sd);
    return v;
  }
  function makeMat(rng, r, c, sd) {
    var m = [];
    for (var i = 0; i < r; i++) m.push(makeVec(rng, c, sd));
    return m;
  }
  function sliceCols(A, start, count) {
    return A.map(function (row) { return row.slice(start, start + count); });
  }
  function concatCols(mats) {
    return mats[0].map(function (_, r) {
      var row = [];
      mats.forEach(function (m) { row = row.concat(m[r]); });
      return row;
    });
  }
  function addVec(a, b) { return a.map(function (v, i) { return v + b[i]; }); }

  /* ---------------- sinusoidal positional encoding ---------------- */
  function positional(pos, i, d) {
    var k = Math.floor(i / 2);
    var denom = Math.pow(10000, (2 * k) / d);
    return i % 2 === 0 ? Math.sin(pos / denom) : Math.cos(pos / denom);
  }
  function peMatrix(n, d) {
    var out = [];
    for (var p = 0; p < n; p++) {
      var row = [];
      for (var i = 0; i < d; i++) row.push(positional(p, i, d));
      out.push(row);
    }
    return out;
  }

  /* ---------------- model ---------------- */
  function buildModel(cfg) {
    var d = cfg.d, nh = cfg.heads, hd = d / nh;
    var seed = cfg.seed;
    var R = function (k) { return M.rng(seed * 977 + k); };

    var E = {};
    VOCAB.forEach(function (w, i) {
      E[w] = makeVec(R(100 + i), d, 1.0);
    });

    var WQ = makeMat(R(1), d, d, 1 / Math.sqrt(d));
    var WK = makeMat(R(2), d, d, 1 / Math.sqrt(d));
    var WV = makeMat(R(3), d, d, 1 / Math.sqrt(d));
    var WO = makeMat(R(4), d, d, 1 / Math.sqrt(d));
    var ffnW = cfg.ffnWidth || d * 4;
    var W1 = makeMat(R(5), d, ffnW, 1 / Math.sqrt(d));
    var b1 = new Array(ffnW).fill(0);
    var W2 = makeMat(R(6), ffnW, d, 1 / Math.sqrt(ffnW));
    var b2 = new Array(d).fill(0);

    function run(tokens) {
      var n = tokens.length;
      var hdIdx = [];
      for (var h = 0; h < nh; h++) hdIdx.push(h * hd);

      var x0 = tokens.map(function (t, i) {
        var e = E[t] || makeVec(M.rng(M.hash(t) >>> 0), d, 1);
        var p = [];
        for (var k = 0; k < d; k++) p.push(positional(i, k, d));
        return addVec(e, p);
      });

      var heads = [];
      for (var hh = 0; hh < nh; hh++) {
        var wq = sliceCols(WQ, hdIdx[hh], hd);
        var wk = sliceCols(WK, hdIdx[hh], hd);
        var wv = sliceCols(WV, hdIdx[hh], hd);
        var Q = M.matmul(x0, wq);
        var K = M.matmul(x0, wk);
        var V = M.matmul(x0, wv);
        var scores = M.matmul(Q, M.transpose(K));
        var scale = 1 / Math.sqrt(hd);
        var scaled = M.scale(scores, scale);
        var masked = M.causalMask(scaled);
        var A = M.softmaxRows(masked);
        var O = M.matmul(A, V);
        heads.push({
          index: hh, Wq: wq, Wk: wk, Wv: wv, Q: Q, K: K, V: V,
          scores: scores, scale: scale, scaled: scaled, masked: masked,
          A: A, O: O, headDim: hd
        });
      }

      var concat = concatCols(heads.map(function (x) { return x.O; }));
      var attnOut = M.matmul(concat, WO);
      var x2 = M.add(x0, attnOut);
      var ln = x2.map(function (row) { return M.layerNorm(row); });
      var ffnPre = M.matmul(ln, W1).map(function (row) {
        return row.map(function (v, j) { return v + b1[j]; });
      });
      var ffnAct = ffnPre.map(function (row) { return row.map(M.gelu); });
      var ffnLin = M.matmul(ffnAct, W2).map(function (row) {
        return row.map(function (v, j) { return v + b2[j]; });
      });
      var out = M.add(x2, ffnLin);

      return {
        tokens: tokens, x0: x0, heads: heads, concat: concat, attnOut: attnOut,
        x2: x2, ln: ln, ffnPre: ffnPre, ffnAct: ffnAct, ffnLin: ffnLin, out: out,
        config: { d: d, heads: nh, headDim: hd, ffnWidth: ffnW },
        params: { WQ: WQ, WK: WK, WV: WV, WO: WO, W1: W1, b1: b1, W2: W2, b2: b2, E: E }
      };
    }

    return { run: run, config: { d: d, heads: nh, headDim: hd }, E: E, VOCAB: VOCAB };
  }

  /* ---------------- the two configurations used in chapters ---------------- */
  // single head, d_k = 4 → clear hand-checkable dot products
  var single = buildModel({ d: 8, heads: 1, seed: 4271 });
  // four heads, d_k = 2 → shows how a model splits its width
  var multi = buildModel({ d: 8, heads: 4, seed: 9137 });

  var SENTENCE = ["The", " cat", " sat", " on", " the", " mat"];
  var PROMPT = ["The", " cat", " sat", " on", " the"];

  /* ---------------- unembedding / illustrative logits ---------------- */
  var NEXT_CANDIDATES = [" mat", " floor", " table", " rug", " bed", " dog", " sofa", " roof"];
  // logits a *trained* model would plausibly produce here
  var TRAINED_LOGITS = [8.42, 6.05, 5.91, 4.77, 3.12, 2.44, 2.18, 1.05];

  LLM.demo = {
    VOCAB: VOCAB,
    D: 8,
    SENTENCE: SENTENCE,
    PROMPT: PROMPT,
    model1: single,
    model4: multi,
    positional: positional,
    peMatrix: peMatrix,
    buildModel: buildModel,
    sliceCols: sliceCols,
    concatCols: concatCols,
    NEXT_CANDIDATES: NEXT_CANDIDATES,
    TRAINED_LOGITS: TRAINED_LOGITS
  };
})();
