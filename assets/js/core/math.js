/* ==========================================================================
   math.js — deterministic RNG + the linear-algebra primitives an LLM uses
   Matrices are plain arrays of row arrays: [[1,2],[3,4]]
   ========================================================================== */
(function () {
  "use strict";
  var LLM = (window.LLM = window.LLM || {});
  var M = {};

  /* ---------------- deterministic randomness ---------------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  M.rng = mulberry32;

  function gaussFrom(rand) {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  M.gaussFrom = gaussFrom;

  /** Matrix of shape rows×cols, N(0, sd). Deterministic for a seed. */
  M.randMat = function (rows, cols, sd, seed) {
    var r = mulberry32(seed == null ? 7 : seed);
    var out = [];
    for (var i = 0; i < rows; i++) {
      var row = [];
      for (var j = 0; j < cols; j++) row.push(gaussFrom(r) * (sd == null ? 0.55 : sd));
      out.push(row);
    }
    return out;
  };

  /** Vector of length n ~ N(0, sd). */
  M.randVec = function (n, sd, seed) { return M.randMat(1, n, sd, seed)[0]; };

  /* ---------------- basics ---------------- */
  var dot = function (a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  };
  M.dot = dot;

  /** C = A (m×k) · B (k×n) */
  M.matmul = function (A, B) {
    var m = A.length, k = A[0].length, n = B[0].length;
    var C = [];
    for (var i = 0; i < m; i++) {
      var row = new Array(n).fill(0);
      for (var j = 0; j < n; j++) {
        var s = 0;
        for (var t = 0; t < k; t++) s += A[i][t] * B[t][j];
        row[j] = s;
      }
      C.push(row);
    }
    return C;
  };

  M.transpose = function (A) {
    var m = A.length, n = A[0].length, T = [];
    for (var j = 0; j < n; j++) {
      var row = new Array(m);
      for (var i = 0; i < m; i++) row[i] = A[i][j];
      T.push(row);
    }
    return T;
  };

  M.add = function (A, B) {
    return A.map(function (r, i) { return r.map(function (v, j) { return v + B[i][j]; }); });
  };
  M.sub = function (A, B) {
    return A.map(function (r, i) { return r.map(function (v, j) { return v - B[i][j]; }); });
  };
  M.scale = function (A, s) {
    return A.map(function (r) { return r.map(function (v) { return v * s; }); });
  };
  M.map = function (A, fn) {
    return A.map(function (r, i) { return r.map(function (v, j) { return fn(v, i, j); }); });
  };
  M.rowwise = function (A, fn) {
    return A.map(function (r, i) { return fn(r, i); });
  };

  /** Softmax of a plain vector (numerically stable). */
  M.softmax = function (v) {
    var mx = -Infinity, i;
    for (i = 0; i < v.length; i++) if (v[i] > mx) mx = v[i];
    var ex = new Array(v.length), sum = 0;
    for (i = 0; i < v.length; i++) { ex[i] = Math.exp(v[i] - mx); sum += ex[i]; }
    for (i = 0; i < v.length; i++) ex[i] /= sum;
    return ex;
  };

  /** Softmax applied to each row of a matrix. Handles -Infinity masking. */
  M.softmaxRows = function (A) {
    return A.map(function (r) { return M.softmax(r); });
  };

  /** temperature softmax */
  M.softmaxT = function (v, T) {
    if (T <= 0.0001) {
      var out = v.map(function () { return 0; });
      out[M.argmax(v)] = 1;
      return out;
    }
    return M.softmax(v.map(function (x) { return x / T; }));
  };

  M.argmax = function (v) {
    var bi = 0;
    for (var i = 1; i < v.length; i++) if (v[i] > v[bi]) bi = i;
    return bi;
  };
  M.max = function (v) { return Math.max.apply(null, v); };
  M.min = function (v) { return Math.min.apply(null, v); };
  M.sum = function (v) { return v.reduce(function (a, b) { return a + b; }, 0); };
  M.mean = function (v) { return M.sum(v) / v.length; };
  M.variance = function (v) {
    var mu = M.mean(v);
    return M.sum(v.map(function (x) { return (x - mu) * (x - mu); })) / v.length;
  };
  M.std = function (v) { return Math.sqrt(M.variance(v)); };

  M.norm = function (v) { return Math.sqrt(dot(v, v)); };
  M.cosine = function (a, b) { return dot(a, b) / (M.norm(a) * M.norm(b) + 1e-12); };
  M.normalize = function (v) {
    var n = M.norm(v) || 1;
    return v.map(function (x) { return x / n; });
  };

  /* ---------------- activations ---------------- */
  M.relu = function (x) { return x > 0 ? x : 0; };
  M.gelu = function (x) {
    // tanh approximation, the one GPT-style models usually use
    var c = Math.sqrt(2 / Math.PI);
    return 0.5 * x * (1 + Math.tanh(c * (x + 0.044715 * x * x * x)));
  };
  M.sigmoid = function (x) { return 1 / (1 + Math.exp(-x)); };
  M.tanh = Math.tanh;

  /* ---------------- layer norm ---------------- */
  M.layerNorm = function (v, eps) {
    eps = eps == null ? 1e-5 : eps;
    var mu = M.mean(v);
    var va = M.variance(v);
    var inv = 1 / Math.sqrt(va + eps);
    return v.map(function (x) { return (x - mu) * inv; });
  };
  M.rmsNorm = function (v, eps) {
    eps = eps == null ? 1e-6 : eps;
    var ms = M.sum(v.map(function (x) { return x * x; })) / v.length;
    var inv = 1 / Math.sqrt(ms + eps);
    return v.map(function (x) { return x * inv; });
  };

  /* ---------------- information theory ---------------- */
  M.entropy = function (p) {
    var h = 0;
    for (var i = 0; i < p.length; i++) if (p[i] > 1e-12) h -= p[i] * Math.log(p[i]);
    return h;
  };
  /** cross entropy in nats */
  M.crossEntropy = function (p, idx) { return -Math.log(Math.max(p[idx], 1e-12)); };

  /* ---------------- helpers used by explanations ---------------- */
  /** Row-wise scaling by 1/sqrt(d) */
  M.scaleRows = function (A, s) {
    return A.map(function (r) { return r.map(function (v) { return v * s; }); });
  };

  /** Causal mask: entries above the diagonal become -Infinity */
  M.causalMask = function (S) {
    return S.map(function (r, i) {
      return r.map(function (v, j) { return j <= i ? v : -Infinity; });
    });
  };

  /** Deterministic pseudo-random from a string (for stable ids) */
  M.hash = function (str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  };

  /** Draw a sample index from a probability distribution */
  M.sampleFrom = function (p, rand) {
    var r = rand == null ? Math.random() : rand;
    var u = r(), acc = 0;
    for (var i = 0; i < p.length; i++) {
      acc += p[i];
      if (u <= acc) return i;
    }
    return p.length - 1;
  };

  /** top-k mask: keep k largest, others -Infinity */
  M.topKMask = function (logits, k) {
    var idx = logits.map(function (v, i) { return [v, i]; });
    idx.sort(function (a, b) { return b[0] - a[0]; });
    var keep = {};
    for (var i = 0; i < Math.min(k, idx.length); i++) keep[idx[i][1]] = 1;
    return logits.map(function (v, i) { return keep[i] ? v : -Infinity; });
  };

  /** top-p (nucleus) mask */
  M.topPMask = function (probs, p) {
    var order = probs.map(function (v, i) { return [v, i]; });
    order.sort(function (a, b) { return b[0] - a[0]; });
    var acc = 0, keep = {};
    for (var i = 0; i < order.length; i++) {
      keep[order[i][1]] = 1;
      acc += order[i][0];
      if (acc >= p) break;
    }
    return probs.map(function (v, i) { return keep[i] ? v : 0; });
  };

  LLM.math = M;
})();
