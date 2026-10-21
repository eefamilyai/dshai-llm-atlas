/* ==========================================================================
   05-multihead.js — several attention heads, concatenated
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  LLM.registerChapter({
    id: "multihead",
    part: "transformer",
    title: "Multi-head attention",
    kicker: "Chapter 05",
    summary: "One attention pattern is not enough. A sentence contains syntax, co-reference, repetition and topic all at once. So the model runs several attention heads in parallel and stitches the results back together.",
    difficulty: "Core",
    keywords: "multi-head heads concatenate projection gqa mqa induction head previous token head",

    render: function (ctx) {
      var icons = ctx.icons;
      var run = ctx.demo.model4.run(ctx.demo.SENTENCE);
      var toks = ctx.demo.SENTENCE.map(function (t) { return t.replace(/^ /, ""); });

      var headBlocks = run.heads.map(function (h, i) {
        return (
          '<div class="mh-card" data-h="' + i + '">' +
          '<div class="mh-card-head"><span class="mh-id">head ' + i + "</span>"
          + '<span class="mh-shape">6 × 6</span></div>'
          + '<div class="plot-wrap"><canvas class="mh-canvas" data-h="' + i + '"></canvas></div>'
          + "</div>"
        );
      }).join("");

      return (
        '<h2 id="why">Why one head is not enough</h2>'
        + '<p data-narrate="' +
        ctx.attr("A single attention head produces exactly one way of looking at the sentence. But a sentence contains many relationships simultaneously. The word mat is syntactically the object of sat, and it is also semantically a thing made of woven material, and it also belongs to the topic of furniture. One softmax row cannot express all of those at once, because a single distribution has to divide its budget one way. Multiple heads let the model divide its attention budget several different ways at the same time.") +
        '">A single attention head produces exactly <strong>one</strong> way of looking at the sentence. But a sentence holds many relationships at once: <em>mat</em> is syntactically the object of <em>sat</em>, semantically a woven thing, topically furniture. One softmax row cannot express all three, because one distribution must divide its budget one way. Multiple heads let the model divide its budget several ways <strong>simultaneously</strong>.</p>'

        + '<div class="callout insight" data-narrate="' +
        ctx.attr("Here is the beautiful part. Multiple heads do not cost more compute. The model simply splits its vector width into chunks, gives each chunk to a different head, runs them all in parallel, and concatenates the results back together. Four heads of size sixteen cost exactly the same as one head of size sixty four, because the same number of multiplications happens either way.") +
        '"><div class="co-label">' + icons.bulb + " Heads are free</div>"
        + "<p>Multiple heads do not cost more compute. The model <strong>splits its vector width</strong> into chunks, gives each chunk to a different head, runs them in parallel, and concatenates. Four heads of size 16 cost the same as one head of size 64.</p></div>"

        + '<h2 id="mechanics">The mechanics: split, attend, concatenate, project</h2>'
        + '<p data-narrate="' +
        ctx.attr("Take a model with a width of eight and four heads. Each head gets two dimensions. Head zero works on dimensions one and two, head one on dimensions three and four, and so on. Each head has its own query key and value weight matrices, produces its own attention matrix, and produces its own output. Then you glue all four outputs side by side to rebuild a width eight vector, and multiply by one more weight matrix called W O which mixes the heads together.") +
        '">Take a model of width 8 with 4 heads: each head gets <strong>2 dimensions</strong>. Head 0 works on dims 1–2, head 1 on dims 3–4, and so on. Each has its own Q/K/V weights, its own attention matrix, its own output. Then all four outputs are glued side by side to rebuild width 8, and multiplied by <span class=\"mono\">W_O</span> to mix the heads.</p>'

        + '<div class="formula" style="flex-direction:column;gap:9px">'
        + "<div><span class=\"v\">head</span><sub><span class=\"v\">i</span></sub>"
        + '<span class="op">=</span><span class="v">Attention</span>(<span class="v">X</span><span class="v">W</span><sub><span class="v">Q</span></sub><sup>(<span class="v">i</span>)</sup>, '
        + '<span class="v">X</span><span class="v">W</span><sub><span class="v">K</span></sub><sup>(<span class="v">i</span>)</sup>, '
        + '<span class="v">X</span><span class="v">W</span><sub><span class="v">V</span></sub><sup>(<span class="v">i</span>)</sup>)</div>'
        + '<div><span class="v">MHA</span>(<span class="v">X</span>)<span class="op">=</span>'
        + '<span class="v">Concat</span>(<span class="v">head</span><sub>1</sub>, …, <span class="v">head</span><sub><span class="v">h</span></sub>) · <span class="v">W</span><sub><span class="v">O</span></sub></div>'
        + "</div>"

        + '<figure class="fig"><div class="fig-frame">'
        + '<div class="viz-title">Splitting the width across heads</div>'
        + '<div class="split-viz">'
        + '<div class="sv-row"><span class="sv-label">d_model = 8</span>'
        + '<div class="sv-cells">'
        + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {
          return '<span class="sv-cell h' + Math.floor(i / 2) + '">d' + (i + 1) + "</span>";
        }).join("") + "</div></div>"
        + '<div class="sv-row"><span class="sv-label">head 0 (d_k=2)</span><div class="sv-cells">'
        + '<span class="sv-cell h0 wide">d1</span><span class="sv-cell h0 wide">d2</span>'
        + "</div></div>"
        + '<div class="sv-row"><span class="sv-label">head 1 (d_k=2)</span><div class="sv-cells">'
        + '<span class="sv-cell h1 wide">d3</span><span class="sv-cell h1 wide">d4</span>'
        + "</div></div>"
        + '<div class="sv-row"><span class="sv-label">head 2 (d_k=2)</span><div class="sv-cells">'
        + '<span class="sv-cell h2 wide">d5</span><span class="sv-cell h2 wide">d6</span>'
        + "</div></div>"
        + '<div class="sv-row"><span class="sv-label">head 3 (d_k=2)</span><div class="sv-cells">'
        + '<span class="sv-cell h3 wide">d7</span><span class="sv-cell h3 wide">d8</span>'
        + "</div></div>"
        + "</div>"
        + '<div class="figcap"><b>Figure 5.1</b> — Real models use 12–128 heads with 64–128 dimensions each, inside a model width of 768–12,288. The toy model here uses 4 heads of size 2 so the matrices stay readable.</div>'
        + "</div></figure>"

        + '<h2 id="explore">Try it: four heads, four patterns</h2>'
        + '<p data-narrate="' +
        ctx.attr("Here are the four attention matrices from our toy model, all reading the same six token sentence. Notice how they genuinely differ. Each one is a different distribution of attention over the same tokens. Click a head to inspect its query key and value matrices and see which tokens it is pulling together.") +
        '">Here are the four attention matrices from the toy model, all reading the same six tokens. Notice how they genuinely differ — each is a different distribution over the same sentence. Click a head to inspect its Q, K and V.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Head inspector</span><span class="ix-hint">4 heads · d_k = 2</span></div>'
        + '<div class="ix-body">'
        + '<div class="mh-grid">' + headBlocks + "</div>"
        + '<div id="mhDetail"></div>'
        + '<div class="tiny faint">These are randomly initialised heads, so the differences are arbitrary. In a trained model the differences are <em>not</em> arbitrary — that is exactly what training discovers.</div>'
        + "</div></div>"

        + '<h2 id="what">What trained heads actually do</h2>'
        + '<p data-narrate="' +
        ctx.attr("Researchers have spent a lot of effort working out what individual heads in trained models do, and a few functional roles keep showing up. A previous token head attends almost entirely to the token immediately before, which lets the model copy rather than derive. An induction head does something cleverer: it finds earlier occurrences of the current context and predicts whatever followed them, which is the mechanism behind in-context learning. Some heads chase syntactic dependencies like subject verb agreement across a long clause. Others just dump their attention on the first token because they have nothing useful to do. Not every head is doing something important.") +
        '">Researchers have mapped what trained heads do; a few roles keep recurring.</p>'

        + '<table class="cmp"><thead><tr><th style="width:34%">Head type</th><th>What its attention matrix looks like</th></tr></thead><tbody>'
        + "<tr><td>Previous-token head</td><td>A bright band one cell below the diagonal. Token <em>i</em> attends almost entirely to token <em>i−1</em>. Lets the model copy names, spellings and rare words faithfully.</td></tr>"
        + "<tr><td>Induction head</td><td>Looks for an earlier occurrence of the current token, then attends to whatever followed <em>that</em>. The named mechanism behind in-context learning: “last time I saw this pattern, this came next.”</td></tr>"
        + "<tr><td>Syntactic head</td><td>Long-range links between a verb and its subject, or a pronoun and its antecedent. Its rows look sparse and structured, often spanning many positions.</td></tr>"
        + "<tr><td>Positional head</td><td>A stiff diagonal offset by a fixed distance. Attends to “three tokens back” regardless of content.</td></tr>"
        + "<tr><td>Attention sink</td><td>Almost all mass on token 0. A well-documented artefact — the model parks spare attention somewhere harmless rather than spreading it thin.</td></tr>"
        + "<tr><td>Punctuation / delimiter head</td><td>Fires on commas, brackets and sentence ends, marking structural boundaries.</td></tr>"
        + "</tbody></table>"

        + '<div class="callout note"><div class="co-label">' + icons.info + " Heads are not modules</div>"
        + "<p>It is tempting to read that table as a parts list. Resist it. Heads are heavily redundant — you can zero out a large fraction of them and performance barely moves. Meaning is distributed across the whole network, not assigned to tidy components.</p></div>"

        + '<h2 id="modern">Modern refinements: sharing keys and values</h2>'
        + '<p data-narrate="' +
        ctx.attr("There is one practical problem with classic multi-head attention, and it shows up at inference time. Each head needs its own key and value vectors cached for every token in the context, so the memory cost multiplies by the number of heads. Modern models fix this by sharing keys and values across groups of heads. Grouped query attention has, say, eight key value heads serving thirty two query heads. Multi query attention is the extreme version with a single shared key value pair. Quality barely drops and the cache shrinks dramatically.") +
        '">A practical problem appears at inference: each head needs its own K and V cached for every token, so cache memory scales with head count. Modern models share K/V across groups. <strong>Grouped-query attention</strong> uses, say, 8 K/V heads for 32 query heads; <strong>multi-query attention</strong> is the extreme with one shared K/V.</p>'

        + '<div class="viz"><div class="viz-title">Cache size per layer, 4096 tokens, 32 heads, d_head 128, fp16</div>'
        + '<div class="kv-list">'
        + '<div class="kv"><span>Multi-head (32 K/V heads)</span><b>64.0 MB</b></div>'
        + '<div class="kv"><span>Grouped-query (8 K/V heads)</span><b>16.0 MB</b></div>'
        + '<div class="kv"><span>Multi-query (1 K/V head)</span><b>2.1 MB</b></div>'
        + "</div></div>"

        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>Heads split the model width; total compute is unchanged.</li>"
        + "<li>Each head has independent <span class=\"mono\">W_Q</span>, <span class=\"mono\">W_K</span>, <span class=\"mono\">W_V</span> and produces its own attention matrix.</li>"
        + "<li>Outputs are concatenated and mixed by <span class=\"mono\">W_O</span>.</li>"
        + "<li>Trained heads specialise into recognisable roles (previous-token, induction, syntactic).</li>"
        + "<li>Modern models share K/V across heads to shrink the inference cache.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var run = ctx.demo.model4.run(ctx.demo.SENTENCE);
      var toks = ctx.demo.SENTENCE.map(function (t) { return t.replace(/^ /, ""); });
      var selected = 0;

      var canvases = ctx.qa(".mh-canvas", root);

      function drawHeads() {
        canvases.forEach(function (cv, i) {
          var h = run.heads[i];
          ctx.matrix.paintHeat(cv, h.A, {
            maxAbs: 1,
            values: false,
            rowLabels: i === 0 ? toks : null,
            colLabels: toks,
            cellHeight: 26,
            outline: i === selected ? null : undefined
          });
        });
      }

      function showDetail(i) {
        selected = i;
        ctx.qa(".mh-card", root).forEach(function (c) {
          c.classList.toggle("on", Number(c.getAttribute("data-h")) === i);
        });
        var h = run.heads[i];
        ctx.q("#mhDetail", root).innerHTML =
          '<div class="viz-title" style="margin-top:14px">Head ' + i + " · full computation</div>"
          + '<div class="mat-flow">'
          + ctx.matrix.block({ name: "X", rows: run.x0, desc: "6 × 8", cls: "narrow", dec: 2, heat: true, scheme: "diverging" })
          + '<div class="mat-arrow">→</div>'
          + ctx.matrix.block({ name: "W<sub>Q</sub><sup>(" + i + ")</sup>", rows: h.Wq, desc: "8 × " + h.headDim, cls: "narrow", dec: 2, heat: true, scheme: "diverging" })
          + '<div class="mat-arrow">→</div>'
          + ctx.matrix.block({ name: "Q<sup>(" + i + ")</sup>", rows: h.Q, rowHeads: toks, desc: "6 × " + h.headDim, cls: "narrow", dec: 2, heat: true, scheme: "diverging" })
          + "</div>"
          + '<div class="mat-flow" style="margin-top:12px">'
          + ctx.matrix.block({ name: "Q·K<sup>⊤</sup>", rows: h.scaled, rowHeads: toks, colHeads: toks, desc: "scaled scores", cls: "narrow", dec: 2, heat: true, scheme: "diverging" })
          + '<div class="mat-arrow">→<small>softmax</small></div>'
          + ctx.matrix.block({ name: "A<sup>(" + i + ")</sup>", rows: h.A, rowHeads: toks, colHeads: toks, desc: "weights", cls: "narrow", dec: 2, heat: true, scheme: "attn", maxAbs: 1 })
          + '<div class="mat-arrow">×V→</div>'
          + ctx.matrix.block({ name: "O<sup>(" + i + ")</sup>", rows: h.O, rowHeads: toks, desc: "6 × " + h.headDim, cls: "narrow", dec: 2, heat: true, scheme: "diverging" })
          + "</div>"
          + '<p class="tiny muted" style="margin-top:12px">With <span class="mono">d_k = ' + h.headDim + "</span> the dot product is just two terms — trivial to check by hand against the numbers above.</p>";
      }

      drawHeads();
      ctx.qa(".mh-card", root).forEach(function (c) {
        c.addEventListener("click", function () { showDetail(Number(c.getAttribute("data-h"))); });
      });
      showDetail(0);

      var grid = ctx.q(".mh-grid", root);
      grid.addEventListener("redraw", drawHeads);
    }
  });
})();
