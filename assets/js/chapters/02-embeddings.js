/* ==========================================================================
   02-embeddings.js — token id → meaning vector
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  /* ---- a hand-built embedding table with semantic structure ---- */
  var W = ["king", "queen", "man", "woman", "prince", "princess",
    "cat", "dog", "kitten", "puppy", "car", "truck",
    "laptop", "phone", "happy", "sad"];

  //                    royal masc fem human animal small vehicle tech   +emo  -emo  arousal concrete
  var RAW = [
    [1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.20, 0.0, 0.30, 0.80], // king
    [1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.20, 0.0, 0.30, 0.80], // queen
    [0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.10, 0.0, 0.30, 0.90], // man
    [0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.10, 0.0, 0.30, 0.90], // woman
    [0.9, 1.0, 0.0, 1.0, 0.0, 0.45, 0.0, 0.0, 0.20, 0.0, 0.50, 0.80], // prince
    [0.9, 0.0, 1.0, 1.0, 0.0, 0.45, 0.0, 0.0, 0.20, 0.0, 0.50, 0.80], // princess
    [0.0, 0.0, 0.0, 0.0, 1.0, 0.40, 0.0, 0.0, 0.20, 0.0, 0.30, 1.00], // cat
    [0.0, 0.0, 0.0, 0.0, 1.0, 0.15, 0.0, 0.0, 0.45, 0.0, 0.60, 1.00], // dog
    [0.0, 0.0, 0.0, 0.0, 1.0, 0.95, 0.0, 0.0, 0.35, 0.0, 0.35, 1.00], // kitten
    [0.0, 0.0, 0.0, 0.0, 1.0, 0.85, 0.0, 0.0, 0.55, 0.0, 0.65, 1.00], // puppy
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.30, 0.10, 0.0, 0.50, 1.00], // car
    [0.0, 0.0, 0.0, 0.0, 0.0, -0.35, 1.0, 0.20, 0.00, 0.0, 0.40, 1.00], // truck
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.50, 0.0, 1.0, 0.10, 0.0, 0.20, 1.00], // laptop
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.80, 0.0, 1.0, 0.10, 0.0, 0.20, 1.00], // phone
    [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.60, 0.20],   // happy
    [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.20, 0.20]    // sad
  ];

  var DIMS = ["royal", "masc", "fem", "human", "animal", "small", "vehicle", "tech", "+emo", "−emo", "arousal", "concrete"];

  // deterministic noise so the vectors are not suspiciously clean
  var EMB = (function () {
    var r = LLM.math.rng(20240607);
    return W.map(function (w, i) {
      return RAW[i].map(function (v) { return +(v * 1.55 + (LLM.math.gaussFrom(r) * 0.21)).toFixed(3); });
    });
  })();

  var IDX = {};
  W.forEach(function (w, i) { IDX[w] = i; });
  var M = LLM.math;

  function vec(w) { return EMB[IDX[w]]; }
  function sim(a, b) { return M.cosine(vec(a), vec(b)); }

  function neighbours(target, excludeSelf) {
    var t = Array.isArray(target) ? target : vec(target);
    return W.map(function (w, i) {
      return { w: w, s: M.cosine(t, EMB[i]), self: !excludeSelf && Array.isArray(target) ? false : false };
    })
      .filter(function (o) { return !(excludeSelf && !Array.isArray(target) && o.w === target); })
      .sort(function (a, b) { return b.s - a.s; });
  }

  /* ---- tiny PCA for the 2-D map ---- */
  function pca2(rows) {
    var n = rows.length, d = rows[0].length;
    var mean = [];
    for (var j = 0; j < d; j++) {
      var s = 0;
      for (var i = 0; i < n; i++) s += rows[i][j];
      mean.push(s / n);
    }
    var X = rows.map(function (r) { return r.map(function (v, j) { return v - mean[j]; }); });
    function powerIter(C, iters) {
      var v = [];
      var rr = LLM.math.rng(7);
      for (var k = 0; k < d; k++) v.push(rr() - 0.5);
      for (var it = 0; it < (iters || 60); it++) {
        var w = new Array(d).fill(0);
        for (var a = 0; a < d; a++) for (var b = 0; b < d; b++) w[a] += C[a][b] * v[b];
        var nv = Math.sqrt(w.reduce(function (p, q) { return p + q * q; }, 0)) || 1;
        v = w.map(function (x) { return x / nv; });
      }
      return v;
    }
    function cov(dir, rowsX) {
      // rotate data onto dir, compute 1D variance, rebuild
      var proj = rowsX.map(function (r) { return M.dot(r, dir); });
      var varp = proj.reduce(function (a, b) { return a + b * b; }, 0) / rowsX.length;
      return { dir: dir, var: varp, proj: proj };
    }
    var C = [];
    for (var a = 0; a < d; a++) {
      C.push([]);
      for (var b = 0; b < d; b++) {
        var s2 = 0;
        for (var i2 = 0; i2 < n; i2++) s2 += X[i2][a] * X[i2][b];
        C[a].push(s2 / n);
      }
    }
    var v1 = powerIter(C);
    var p1 = cov(v1, X);
    // deflate
    var C2 = C.map(function (row, a2) {
      return row.map(function (val, b2) { return val - p1.var * v1[a2] * v1[b2]; });
    });
    var v2 = powerIter(C2);
    var p2 = cov(v2, X);
    return X.map(function (r, i) {
      return { x: p1.proj[i], y: p2.proj[i], w: W[i] };
    });
  }

  var PROJ = pca2(EMB);

  LLM.registerChapter({
    id: "embeddings",
    part: "foundations",
    title: "Embeddings: meaning as geometry",
    kicker: "Chapter 02",
    summary: "An integer ID becomes a list of numbers. That list is a point in space, and the geometry of that space is where everything the model knows about a word lives.",
    difficulty: "Beginner",
    keywords: "embedding vector cosine similarity king queen analogy nearest neighbour lookup table dimensions",

    render: function (ctx) {
      var icons = ctx.icons;

      var embMatrix = ctx.matrix.block({
        name: "E",
        desc: "the embedding table — one row per token, 12 dimensions shown",
        rows: EMB,
        rowHeads: W,
        colHeads: DIMS,
        dec: 2,
        heat: true,
        scheme: "diverging",
        maxAbs: 1.6,
        cls: "tight",
        blockId: "embTable",
        rotCols: true
      });

      return (
        '<h2 id="lookup">From an integer to a vector</h2>'
        + '<p data-narrate="' +
        ctx.attr("Chapter one ended with a list of integers. Step two is a lookup table. The embedding matrix has one row per token in the vocabulary and one column per dimension of meaning. Give it the integer four hundred and sixty four and it hands back that row as a vector of real numbers. That single multiplication-free lookup is the only thing that happens between the tokenizer and the transformer.") +
        '">Chapter one ended with a list of integers. Step two is a <strong>lookup table</strong>. The embedding matrix has one row per token and one column per dimension. Give it an integer and it hands back a vector of real numbers. That lookup is the only thing that happens between the tokenizer and the transformer.</p>'

        + '<div class="callout insight" data-narrate="' +
        ctx.attr("Here is the thing that surprises people. Nobody decides what each dimension means. The values in this table are just numbers the model was allowed to tune, and during training it tuned them so that whatever arrangement helped predict the next token is the arrangement it got. The structure you are about to see was discovered, not designed.") +
        '"><div class="co-label">' + icons.bulb + " Nobody wrote these numbers</div>"
        + "<p>No one decides what each dimension means. Every value in this table is a number the model was <strong>allowed to tune</strong>. Training finds whatever arrangement predicts the next token best — and the structure was discovered, not designed.</p></div>"

        + '<figure class="fig"><div class="fig-frame">'
        + '<div class="viz-title">The embedding matrix <span class="sub">16 tokens × 12 dimensions</span></div>'
        + embMatrix
        + ctx.matrix.legend("−1.6", "", "+1.6")
        + '<div class="figcap"><b>Figure 2.1</b> — A real embedding table has 768–12,288 columns, one row per vocabulary entry. These are <em>illustrative</em> vectors with hand-placed semantic structure plus deterministic noise, so that the geometry below behaves the way real embeddings do. Amber = positive, blue = negative.</div>'
        + "</div></figure>"

        + '<div class="callout warn"><div class="co-label">' + icons.warn + " About the labels on the columns</div>"
        + "<p>The column names <code>royal</code>, <code>animal</code>, <code>+emo</code> are a teaching fiction. In a real embedding you cannot point at one column and name it — the meaning is spread across combinations of many dimensions and is only visible when you look at <em>directions</em>, not individual columns. The fiction makes the geometry readable; don’t carry it too far.</p></div>"

        + '<h2 id="sim">Meaning is an angle</h2>'
        + '<p data-narrate="' +
        ctx.attr("Two vectors point in similar directions when two words mean similar things. The standard measure of that is cosine similarity. It ignores magnitude and only looks at the angle between the two arrows, giving one when they point exactly the same way, zero when they are unrelated, and minus one when they point in opposite directions.") +
        '">Two vectors point in similar directions when two words mean similar things. The measure of that is <strong>cosine similarity</strong>: it ignores length and looks only at the angle between the arrows. One means identical direction, zero means unrelated, minus one means opposite.</p>'

        + '<div class="formula"><span class="v">cos</span>(<span class="v">a</span>, <span class="v">b</span>)<span class="op">=</span>'
        + '<span class="frac"><span class="num"><span class="v">a</span> · <span class="v">b</span></span>'
        + '<span class="den">‖<span class="v">a</span>‖ ‖<span class="v">b</span>‖</span></span></div>'

        + '<h2 id="explore">Try it: explore the space</h2>'
        + '<p data-narrate="' +
        ctx.attr("Pick a word and see its vector and its nearest neighbours. Then scroll to the analogy section and watch the classic trick: king minus man plus woman lands almost exactly on queen. That is not a lookup. It is subtraction and addition of vectors, followed by a search for whatever token happens to sit nearest the result.") +
        '">Pick a word to see its vector and its neighbours. Then try the analogy: <strong>king − man + woman</strong> lands almost exactly on <strong>queen</strong> — not by lookup, but by vector arithmetic.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Embedding explorer</span>'
        + '<span class="ix-hint">12 dimensions</span></div>'
        + '<div class="ix-body">'
        + '<div class="emb-selrow" id="embPick">' + W.map(function (w, i) {
          return '<button class="emb-word' + (i === 0 ? " on" : "") + '" data-w="' + w + '">' + w + "</button>";
        }).join("") + "</div>"
        + '<div class="attn-grid two">'
        + '<div><div class="viz-title">Vector for <span id="embName" class="sub">king</span></div><div id="embVec"></div></div>'
        + '<div><div class="viz-title">Nearest neighbours by cosine</div><div class="sim-list" id="embSim"></div></div>'
        + "</div>"
        + '<div class="viz"><div class="viz-title">The whole vocabulary projected onto two dimensions <span class="sub">principal components</span></div>'
        + '<div class="plot-wrap"><canvas id="embPlot" data-autodraw="1"></canvas></div></div>'
        + "</div></div>"

        + '<h2 id="analogy">Try it: meaning arithmetic</h2>'
        + '<p data-narrate="' +
        ctx.attr("The famous result is that word vectors support arithmetic. Compute king minus man plus woman and you get a vector that is closest to queen. The geometric reading is that the offset from man to woman is roughly the same as the offset from king to queen. Gender is a direction in the space, and you can step along it.") +
        '">Compute <strong>king − man + woman</strong> and you get a vector closest to <strong>queen</strong>. The geometric reading: the offset from man to woman is roughly the same as the offset from king to queen. Gender is <em>a direction in the space</em>, and you can step along it.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Vector arithmetic</span><span class="ix-hint">a − b + c ≈ ?</span></div>'
        + '<div class="ix-body">'
        + '<div class="ctl"><select id="anaA" class="ana-sel"></select><span class="ctl-label">−</span>'
        + '<select id="anaB" class="ana-sel"></select><span class="ctl-label">+</span>'
        + '<select id="anaC" class="ana-sel"></select></div>'
        + '<div id="anaResult"></div>'
        + "</div></div>"

        + '<h2 id="position">Why this cannot be the whole story</h2>'
        + '<p data-narrate="' +
        ctx.attr("There is an obvious problem with a pure lookup table. The embedding for the word cat is the same vector no matter where it appears in the sentence. But bank in river bank and bank in bank account are different meanings, and the model needs to distinguish them. Worse, an embedding table has no notion of order at all, so the cat chased the dog and the dog chased the cat would be identical input. Both problems are fixed later, by position encodings and by attention.") +
        '">There is an obvious problem. The embedding for <code>cat</code> is the same vector wherever it appears — but <em>bank</em> in “river bank” and “bank account” are different meanings. Worse, an embedding table has <strong>no notion of order</strong>: “the cat chased the dog” and “the dog chased the cat” would be identical input. Both problems are fixed next.</p>'

        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>The embedding matrix is <strong>learned</strong>: vocabulary × dimensions, typically 768–12,288 wide.</li>"
        + "<li>A token ID selects a row. That vector is the token's first representation.</li>"
        + "<li>Similarity is measured by <strong>cosine</strong> — angle, not distance.</li>"
        + "<li>Directions in the space carry consistent meaning, which is why analogies work.</li>"
        + "<li>A static lookup has no context and no order — those arrive in chapters 3 and 4.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var M = ctx.mm;
      var sel = null;

      function showWord(w) {
        sel = w;
        ctx.qa(".emb-word", root).forEach(function (b) {
          b.classList.toggle("on", b.getAttribute("data-w") === w);
        });
        ctx.q("#embName", root).textContent = w;
        ctx.q("#embVec", root).innerHTML = ctx.matrix.block({
          name: "E[" + w + "]",
          rows: [vec(w)],
          colHeads: DIMS,
          dec: 2,
          heat: true,
          scheme: "diverging",
          maxAbs: 1.6,
          cls: "tight",
          rotCols: true
        });
        var nb = neighbours(w, true).slice(0, 7);
        ctx.q("#embSim", root).innerHTML = nb.map(function (o, i) {
          return (
            '<div class="sim-row' + (i === 0 ? " top" : "") + '">' +
            '<span class="sname">' + ctx.esc(o.w) + "</span>" +
            '<span class="sbar"><span style="width:' + Math.max(1, o.s * 100).toFixed(1) + '%"></span></span>' +
            '<span class="sval">' + o.s.toFixed(3) + "</span></div>"
          );
        }).join("");
        drawPlot();
      }

      ctx.qa(".emb-word", root).forEach(function (b) {
        b.addEventListener("click", function () { showWord(b.getAttribute("data-w")); });
      });

      /* --- scatter --- */
      var canvas = ctx.q("#embPlot", root);
      function drawPlot() {
        if (!canvas) return;
        var S = ctx.chart.setup(canvas, 300);
        var c2 = S.ctx, Wd = S.W, H = S.H;
        var T = ctx.chart.themeColors();
        var xs = PROJ.map(function (p) { return p.x; });
        var ys = PROJ.map(function (p) { return p.y; });
        var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
        var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
        var padx = (xmax - xmin) * 0.16, pady = (ymax - ymin) * 0.2;
        var px = function (x) { return 20 + ((x - (xmin - padx)) / ((xmax + padx) - (xmin - padx))) * (Wd - 40); };
        var py = function (y) { return H - 20 - ((y - (ymin - pady)) / ((ymax + pady) - (ymin - pady))) * (H - 40); };

        c2.strokeStyle = T.grid;
        c2.lineWidth = 1;
        c2.beginPath();
        c2.moveTo(0, H / 2); c2.lineTo(Wd, H / 2);
        c2.moveTo(Wd / 2, 0); c2.lineTo(Wd / 2, H);
        c2.stroke();

        PROJ.forEach(function (p) {
          var isSel = p.w === sel;
          var x = px(p.x), y = py(p.y);
          c2.beginPath();
          c2.arc(x, y, isSel ? 6 : 3.4, 0, Math.PI * 2);
          c2.fillStyle = isSel ? "#f5a524" : "rgba(139,123,255,.85)";
          c2.fill();
          if (isSel) {
            c2.strokeStyle = "#fff";
            c2.lineWidth = 1.6;
            c2.stroke();
          }
          c2.fillStyle = isSel ? "#f5a524" : T.faint;
          c2.font = (isSel ? "600 11px " : "10px ") + "'JetBrains Mono', ui-monospace, monospace";
          c2.textAlign = "left";
          c2.fillText(p.w, x + 7, y + 3.5);
        });
      }
      canvas.addEventListener("redraw", drawPlot);

      /* --- analogy --- */
      var sels = ["#anaA", "#anaB", "#anaC"].map(function (s) { return ctx.q(s, root); });
      sels.forEach(function (s) {
        s.innerHTML = W.map(function (w) { return '<option value="' + w + '">' + w + "</option>"; }).join("");
      });
      sels[0].value = "king";
      sels[1].value = "man";
      sels[2].value = "woman";
      var res = ctx.q("#anaResult", root);

      function computeAna() {
        var a = sels[0].value, b = sels[1].value, c = sels[2].value;
        var v = vec(a).map(function (x, i) { return x - vec(b)[i] + vec(c)[i]; });
        var nb = neighbours(v, true).filter(function (o) { return o.w !== a && o.w !== b && o.w !== c; }).slice(0, 4);
        var best = nb[0];
        res.innerHTML =
          '<div class="mat-flow" style="margin:14px 0 4px">'
          + ctx.matrix.block({ name: "E[" + a + "]", rows: [vec(a)], dec: 2, heat: true, scheme: "diverging", maxAbs: 1.6, cls: "tight" })
          + '<div class="mat-arrow">−</div>'
          + ctx.matrix.block({ name: "E[" + b + "]", rows: [vec(b)], dec: 2, heat: true, scheme: "diverging", maxAbs: 1.6, cls: "tight" })
          + '<div class="mat-arrow">+</div>'
          + ctx.matrix.block({ name: "E[" + c + "]", rows: [vec(c)], dec: 2, heat: true, scheme: "diverging", maxAbs: 1.6, cls: "tight" })
          + '<div class="mat-arrow">=</div>'
          + ctx.matrix.block({ name: "result", rows: [v], dec: 2, heat: true, scheme: "diverging", maxAbs: 1.6, cls: "tight" })
          + "</div>"
          + '<div class="sim-list">'
          + nb.map(function (o, i) {
            return '<div class="sim-row' + (i === 0 ? " top" : "") + '"><span class="sname">' + ctx.esc(o.w) +
              '</span><span class="sbar"><span style="width:' + Math.max(1, o.s * 100).toFixed(1) + '%"></span></span>' +
              '<span class="sval">' + o.s.toFixed(3) + "</span></div>";
          }).join("")
          + "</div>"
          + '<div class="callout insight" style="margin-top:14px"><div class="co-label">Result</div><p>The nearest token to <strong>'
          + ctx.esc(a) + " − " + ctx.esc(b) + " + " + ctx.esc(c) + "</strong> is <strong>" + ctx.esc(best.w)
          + "</strong> at cosine " + best.s.toFixed(3) + ". No rule was written for this. It falls out of the geometry.</p></div>";
      }
      sels.forEach(function (s) { s.addEventListener("change", computeAna); });
      computeAna();

      showWord("king");
    }
  });
})();
