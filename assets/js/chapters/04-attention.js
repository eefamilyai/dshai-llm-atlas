/* ==========================================================================
   04-attention.js — scaled dot-product attention, step by step
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  LLM.registerChapter({
    id: "attention",
    part: "transformer",
    title: "Attention: tokens talking to tokens",
    kicker: "Chapter 04",
    summary: "The single mechanism that made modern language models possible. Queries ask, keys answer, values deliver. Here it is computed on real matrices, one multiplication at a time.",
    difficulty: "Core",
    keywords: "attention query key value qkv dot product scaled softmax causal mask weighted sum",

    render: function (ctx) {
      var icons = ctx.icons;
      var M = ctx.mm;
      var run = ctx.demo.model1.run(ctx.demo.SENTENCE);
      var h = run.heads[0];
      var toks = ctx.demo.SENTENCE.map(function (t) { return t.replace(/^ /, ""); });
      var dk = h.headDim;
      var scale = h.scale;

      function mb(name, rows, opts) {
        opts = opts || {};
        opts.name = name;
        opts.rows = rows;
        opts.dec = opts.dec == null ? 2 : opts.dec;
        opts.heat = opts.heat !== false;
        if (opts.scheme == null) opts.scheme = "diverging";
        if (opts.cls == null) opts.cls = "compact";
        return ctx.matrix.block(opts);
      }

      var step = function (n, title, body, narrate) {
        return (
          '<div class="attn-step" ' + (narrate ? 'data-narrate="' + ctx.attr(narrate) + '"' : "") + ">" +
          '<div class="as-head"><span class="as-n">' + n + "</span>" + ctx.esc(title) + "</div>" +
          '<div class="as-body">' + body + "</div></div>"
        );
      };

      return (
        '<h2 id="intuition">The intuition before the algebra</h2>'
        + '<p data-narrate="' +
        ctx.attr("Picture a library where every book has a title on its spine and content inside. You arrive with a question. You compare your question against every title you can see, and the titles that match your question well get pulled off the shelf. Then you read the contents of those books and blend them together, weighted by how well each title matched. That is attention, exactly. Your question is the query, the titles are the keys, and the contents are the values.") +
        '">Picture a library. Every book has a <em>title on its spine</em> and <em>content inside</em>. You arrive with a question. You compare your question against every title — the good matches get pulled off the shelf — and you read those books, blending them by how well each title matched. That is attention, exactly.</p>'

        + '<div class="grid-3" style="margin:1.2em 0">'
        + '<div class="card"><div class="card-title" style="color:var(--accent)">Query · Q</div><p class="tiny muted">What <em>this</em> token is looking for. “I am a noun, I need to know what I am attached to.”</p></div>'
        + '<div class="card"><div class="card-title" style="color:var(--accent-2)">Key · K</div><p class="tiny muted">What each token advertises. “I am a determiner, I usually introduce a noun.”</p></div>'
        + '<div class="card"><div class="card-title" style="color:var(--accent-3)">Value · V</div><p class="tiny muted">What each token actually hands over once it has been selected. The payload.</p></div>'
        + "</div>"

        + '<p data-narrate="' +
        ctx.attr("Crucially, queries keys and values are not separate data. They are three different linear projections of the very same input vector. Every token produces a query a key and a value for itself, by multiplying its own vector by three different learned weight matrices. So the same token plays all three roles at once, wearing a different hat for each.") +
        '">Crucially, Q, K and V are not separate data. They are <strong>three linear projections of the same vector</strong>. Every token produces its own query, key and value by multiplying itself by three different learned matrices — the same token wearing three different hats.</p>'

        + '<div class="formula"><span class="v">Q</span><span class="op">=</span><span class="v">X</span><span class="v">W</span><sub><span class="v">Q</span></sub>'
        + '<span class="op" style="margin:0 14px">·</span><span class="v">K</span><span class="op">=</span><span class="v">X</span><span class="v">W</span><sub><span class="v">K</span></sub>'
        + '<span class="op" style="margin:0 14px">·</span><span class="v">V</span><span class="op">=</span><span class="v">X</span><span class="v">W</span><sub><span class="v">V</span></sub></div>'

        + '<div class="sec-div"><span class="num">THE FORMULA</span></div>'

        + '<div class="formula" style="font-size:20px;padding:22px">'
        + '<span class="v">Attention</span>(<span class="v">Q</span>,<span class="v">K</span>,<span class="v">V</span>)'
        + "<span class=\"op\">=</span>"
        + '<span class="v">softmax</span>'
        + '<span style="font-size:1.5em;line-height:1">&nbsp;(</span>'
        + '<span class="frac"><span class="num"><span class="v">Q</span><span class="v">K</span><sup>⊤</sup></span>'
        + '<span class="den"><span class="rad"><span style="margin-top:.28em">√</span><span class="rhook"><span class="v">d</span><sub><span class="v">k</span></sub></span></span></span></span>'
        + '<span style="font-size:1.5em;line-height:1">&nbsp;)</span>'
        + '<span class="v">V</span></div>'

        + '<p data-narrate="' +
        ctx.attr("Read it in four moves. Multiply the queries by the keys transposed to get a table of every token against every other token. Divide by the square root of the key dimension to keep the numbers from exploding. Apply softmax to each row so the weights in that row sum to one. Finally multiply by the values, which mixes them together according to those weights. That is the whole operation.") +
        '">Read it in four moves: multiply <strong>Q by Kᵀ</strong> to get every token against every other token; <strong>divide by √d_k</strong> so the numbers do not explode; <strong>softmax each row</strong> so the weights sum to 1; <strong>multiply by V</strong> to mix the values by those weights. That is the whole operation.</p>'

        + '<div class="sec-div"><span class="num">THE WALKTHROUGH · REAL NUMBERS</span></div>'

        + '<p data-narrate="' +
        ctx.attr("Now let us do it for real. Our toy model has a width of eight and a single attention head, and it is reading the six token sentence: The cat sat on the mat. Every number below is computed live in your browser by the same code that produces the final answer. Watch the shapes as we go, they are the clearest guide to what is happening.") +
        '">Let us do it for real. The toy model below has width 8, a single head, and is reading the six tokens <span class="mono">The · cat · sat · on · the · mat</span>. <strong>Every number is computed live in your browser.</strong> Watch the shapes — they are the clearest guide to what is happening.</p>'

        + '<div class="attn-walk">'

        + step(1, "The input — one row per token",
          mb("X", run.x0, { rowHeads: toks, desc: "token embedding + position · 6 × 8" })
          + '<p class="tiny muted">Each row is one token\'s vector. Nothing has been mixed yet: this is purely the embedding from chapter 2 plus the position from chapter 3.</p>')

        + step(2, "Project to queries — Q = X · W_Q",
          '<div class="mat-flow">'
          + mb("W<sub>Q</sub>", ctx.demo.sliceCols(run.params.WQ, 0, dk), { desc: "8 × " + dk, cls: "tight" })
          + '<div class="mat-arrow">→</div>'
          + mb("Q", h.Q, { rowHeads: toks, desc: "query per token · 6 × " + dk })
          + "</div>"
          + '<p class="tiny muted">Same shape in, same shape out: <span class="mono">(6×8)·(8×8) = 6×8</span>. The weight matrix does not move information between tokens; it only re-mixes the 8 numbers inside each row. That re-mixing is what turns “this is a token” into “this is what I am looking for”.</p>',
          "Step one, the queries. Each token multiplies its own vector by the query weight matrix. Notice the shape: a six by eight input times an eight by eight weight matrix gives a six by eight output. The weight matrix never moves information between rows. It only re-mixes the eight numbers inside each row.")

        + step(3, "Project to keys and values",
          '<div class="mat-flow">'
          + mb("K", h.K, { rowHeads: toks, desc: "what each token advertises · 6 × " + dk })
          + '<div class="mat-arrow">·</div>'
          + mb("V", h.V, { rowHeads: toks, desc: "what each token delivers · 6 × " + dk })
          + "</div>"
          + '<p class="tiny muted">Keys and values come from the <em>same</em> input, through different weight matrices. A token\'s key is its advertisement; its value is its cargo.</p>')

        + step(4, "Compare every query with every key — S = Q · Kᵀ",
          '<div class="mat-flow">'
          + mb("Q", h.Q, { desc: "6 × " + dk, cls: "tight" })
          + '<div class="mat-arrow">×</div>'
          + mb("K<sup>⊤</sup>", M.transpose(h.K), { rowHeads: null, colHeads: toks, desc: dk + " × 6", cls: "tight" })
          + '<div class="mat-arrow">=</div>'
          + mb("S", h.scores, { rowHeads: toks, colHeads: toks, desc: "raw scores · 6 × 6" })
          + "</div>"
          + '<p class="tiny muted">Cell <span class="mono">(i, j)</span> is the dot product of query <span class="mono">i</span> with key <span class="mono">j</span> — a single number saying how interested token <span class="mono">i</span> is in token <span class="mono">j</span>. Large positive means very interested.</p>',
          "Step four is the heart of it. The query matrix multiplied by the transposed key matrix gives a six by six table. Cell i j is the dot product of query i with key j. One number per pair, saying how interested token i is in token j. The transposition is only there so that the shapes line up for multiplication.")

        + step(5, "Scale by 1/√d_k",
          '<div class="mat-flow">'
          + mb("S / √" + dk, h.scaled, { rowHeads: toks, colHeads: toks, desc: "scaled scores · 6 × 6" })
          + "</div>"
          + '<p class="tiny muted">Each score is divided by <span class="mono">√' + dk + " ≈ " + (1 / scale).toFixed(2) + '</span>. This is not cosmetic — see <a href="#why-scale">why the square root</a> below.</p>')

        + step(6, "Mask the future (causal attention)",
          '<div class="mat-flow">'
          + mb("masked", h.masked, { rowHeads: toks, colHeads: toks, desc: "future set to −∞", cls: "compact" })
          + "</div>"
          + '<p class="tiny muted">Everything strictly above the diagonal becomes <span class="mono">−∞</span>. A token is allowed to look at itself and at everything before it, but never at what comes next — otherwise it would be reading the answer off the exam paper.</p>')

        + step(7, "Softmax each row — the attention weights",
          '<div class="mat-flow">'
          + mb("A = softmax(masked)", h.A, { rowHeads: toks, colHeads: toks, desc: "attention weights · 6 × 6", scheme: "attn", heat: true, maxAbs: 1 })
          + "</div>"
          + '<p class="tiny muted">Now each row is a probability distribution: all entries non-negative and summing to exactly 1. Read row <span class="mono">i</span> as “token <span class="mono">i</span> spends its attention budget like this”.</p>',
          "After softmax, each row sums to exactly one. Row i tells you how token i spends its attention budget. Look at the last row, the word mat: it puts most of its budget on one particular earlier token. That is the layer deciding what the word mat should be made of.")

        + step(8, "Blend the values — output = A · V",
          '<div class="mat-flow">'
          + mb("A", h.A, { desc: "6 × 6", scheme: "attn", maxAbs: 1, cls: "tight" })
          + '<div class="mat-arrow">×</div>'
          + mb("V", h.V, { desc: "6 × " + dk, cls: "tight" })
          + '<div class="mat-arrow">=</div>'
          + mb("head output", h.O, { rowHeads: toks, desc: "context-mixed · 6 × " + dk })
          + "</div>"
          + '<p class="tiny muted">Row <span class="mono">i</span> of the output is a weighted average of all the value rows, weighted by how much token <span class="mono">i</span> attended to each. After this step, every row contains information that came from other tokens — this is where context is born.</p>',
          "Step eight blends everything. The attention weights times the values gives each token a new vector that is a weighted average of everybody's cargo. Before this step, each row knew only about its own token. After it, each row carries information gathered from the rest of the sentence. This is the moment context appears.")

        + step(9, "Project back out — · W_O",
          '<div class="mat-flow">'
          + mb("concat", run.concat, { desc: "6 × 8", cls: "tight" })
          + '<div class="mat-arrow">×</div>'
          + mb("W<sub>O</sub>", run.params.WO, { desc: "8 × 8", cls: "tight" })
          + '<div class="mat-arrow">=</div>'
          + mb("attn out", run.attnOut, { rowHeads: toks, desc: "6 × 8" })
          + "</div>"
          + '<p class="tiny muted">With one head the “concatenation” is a no-op. With several heads this step is what mixes all their results into one width-<span class="mono">d</span> vector. Then the residual adds <span class="mono">X</span> back on top (chapter 7).</p>')

        + "</div>"

        + '<h2 id="explore">Try it: the attention explorer</h2>'
        + '<p data-narrate="' +
        ctx.attr("Pick a token on the left to be the query. The heatmap shows what that token attends to and the bars show it numerically. Click any cell of the heatmap to see the exact arithmetic that produced that number, term by term. Then try turning the causal mask off and watch the future light up.") +
        '">Pick a token to be the query. Click any cell of the heatmap to see the exact arithmetic that produced it, term by term. Then try switching the causal mask off.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Attention, cell by cell</span><span class="ix-hint">6 tokens · d_k = ' + dk + "</span></div>"
        + '<div class="ix-body">'
        + '<div class="emb-selrow" id="atTok">' + toks.map(function (t, i) {
          return '<button class="emb-word' + (i === 5 ? " on" : "") + '" data-q="' + i + '">' + ctx.esc(t) + "</button>";
        }).join("") + "</div>"
        + '<div class="ctl"><div class="switch-row">'
        + '<div class="seg" id="atMask"><button data-m="1" class="on">Causal mask on</button><button data-m="0">Mask off</button></div>'
        + "</div>"
        + '<div class="field" style="flex:1;min-width:180px"><label>Sharpness <b id="atTempVal">1.00</b></label>'
        + '<input type="range" id="atTemp" min="0.25" max="3" step="0.05" value="1"></div></div>'
        + '<div class="attn-grid two">'
        + '<div><div class="viz-title">Attention weights <span class="sub">row = query, column = key · click a cell</span></div>'
        + '<div class="plot-wrap"><canvas id="atHeat"></canvas></div>'
        + '<div class="heat-legend"><span>0</span><span class="heat-bar"></span><span>1</span></div></div>'
        + '<div><div class="viz-title">Where <span id="atQName" class="sub">mat</span> sends its attention</div>'
        + '<div id="atBars"></div>'
        + '<div class="tiny faint" style="margin-top:10px">Row sums to 1 by construction. Softmax cannot produce anything else.</div></div>'
        + "</div>"
        + '<div class="viz"><div class="viz-title">The arithmetic behind the selected cell</div>'
        + '<div class="compute" id="atCalc"></div></div>'
        + "</div></div>"

        + '<h2 id="why-scale">Why divide by √d_k?</h2>'
        + '<p data-narrate="' +
        ctx.attr("The division by the square root of the key dimension is the least obvious part of the formula, and it is genuinely important. A dot product of two vectors with independent random entries adds up the products of d things, so its variance grows with d. If the key dimension is sixty four, the scores have a standard deviation around eight, and softmax applied to numbers that spread easily saturates: one weight becomes essentially one and the rest essentially zero. The gradient through a saturated softmax is almost zero, so learning stalls. Dividing by root d puts the variance back to roughly one, which is exactly the operating range softmax behaves well in.") +
        '">A dot product of two vectors with independent entries sums <span class="mono">d</span> products, so its variance grows with <span class="mono">d</span>. With <span class="mono">d_k = 64</span> the scores have standard deviation around 8, and softmax applied to values that spread that widely <strong>saturates</strong>: one weight becomes ≈1 and the rest ≈0. The gradient through a saturated softmax is almost zero, so learning stalls. Dividing by <span class="mono">√d</span> puts the variance back near 1 — exactly the range softmax behaves well in.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">What scaling does to the softmax</span></div>'
        + '<div class="ix-body">'
        + '<div class="ctl"><div class="field" style="flex:1"><label>Score spread σ <b id="scaleSd">1.0</b></label>'
        + '<input type="range" id="scaleSdR" min="0.1" max="8" step="0.1" value="1"></div></div>'
        + '<div class="attn-grid two"><div><div class="viz-title">Softmax of 8 scores</div><div class="plot-wrap"><canvas id="scaleCv"></canvas></div>'
        + '<div class="tiny faint" style="margin-top:6px">Too wide → one-hot and gradient-free. Too narrow → uniform and useless.</div></div>'
        + '<div><div class="viz-title">Entropy of the distribution</div><div class="stat" style="text-align:center;padding:22px"><div class="sv big" id="scaleH">2.08</div><div class="sk">nats (max 2.08 = uniform)</div></div>'
        + '<div class="tiny faint" style="margin-top:8px">Healthy attention keeps entropy somewhere in the middle: it prefers a few tokens without ignoring the rest entirely.</div></div></div>'
        + "</div></div>"

        + '<h2 id="mask">Causal masking</h2>'
        + '<p data-narrate="' +
        ctx.attr("Language models are trained to predict the next token, so during training they are fed real text and asked to guess each next token. If token five could attend to token six, the answer would be right there in the input and the task would be trivially solvable by copying. The mask prevents that by setting every score to a future token to negative infinity before the softmax, which makes those weights exactly zero no matter what the scores were.") +
        '">A language model predicts the next token, so during training it is fed real text and asked to guess each next token. If token 5 could attend to token 6, the answer would be sitting in the input. The mask sets every score for a future token to <span class="mono">−∞</span> before the softmax, which makes those weights <strong>exactly zero</strong>.</p>'

        + '<div class="callout note"><div class="co-label">' + icons.info + " Why −∞ and not “a very negative number”</div>"
        + "<p><span class=\"mono\">exp(−∞) = 0</span> exactly, so a masked token contributes nothing at all. Using, say, <span class=\"mono\">−1e9</span> would work numerically but leaves a hair of probability that accumulates over many layers.</p></div>"

        + '<p data-narrate="' +
        ctx.attr("There is a second consequence that is easy to miss. Row zero of the attention matrix has only one legal entry, itself, so its weight is forced to exactly one. You can see that in the matrix above. The first token always attends to itself completely, because there is nothing else to attend to.") +
        '">A second consequence is easy to miss: row 0 has only one legal entry — itself — so its weight is forced to exactly <strong>1.00</strong>. You can see that in the matrix above.</p>'

        + '<h2 id="cost">What attention costs</h2>'
        + '<p data-narrate="' +
        ctx.attr("The score matrix is the number of tokens squared. That single fact explains most of the practical engineering around large language models. Double the context length and you quadruple the attention computation and the memory it needs. This is why context windows were expensive to grow, why the KV cache in chapter eleven matters so much, and why a whole generation of approximate attention methods exists.") +
        '">The score matrix is <strong>tokens × tokens</strong>. That single fact explains most of the engineering around LLMs: double the context and you quadruple the attention work and its memory. It is also why the KV cache (chapter 11) matters so much.</p>'

        + '<div class="viz"><div class="viz-title">Cost per layer for a 4096-wide sequence</div>'
        + '<div class="kv-list">'
        + '<div class="kv"><span>Attention scores matrix (per head)</span><b>4096 × 4096</b></div>'
        + '<div class="kv"><span>Floats at fp16, per head</span><b>33.5 MB</b></div>'
        + '<div class="kv"><span>With 32 heads, one layer</span><b>≈ 1.07 GB</b></div>'
        + '<div class="kv"><span>Scaling rule</span><b>O(n²)</b></div>'
        + "</div></div>"

        + '<h2 id="recap">Recap</h2>'
        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>Q, K, V are three learned projections of the <em>same</em> input.</li>"
        + "<li><span class=\"mono\">softmax(QKᵀ/√d_k)·V</span> — compare, normalise, blend.</li>"
        + "<li>Each row of the weight matrix sums to 1: it is an attention budget.</li>"
        + "<li>The causal mask hides the future so the model cannot cheat during training.</li>"
        + "<li>Cost is <span class=\"mono\">O(n²)</span> in sequence length — the reason context windows are expensive.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var M = ctx.mm;
      var run = ctx.demo.model1.run(ctx.demo.SENTENCE);
      var h = run.heads[0];
      var toks = ctx.demo.SENTENCE.map(function (t) { return t.replace(/^ /, ""); });
      var state = { causal: 1, temp: 1, q: 5, cell: { r: 5, c: 2 } };

      var heat = ctx.q("#atHeat", root);
      var bars = ctx.q("#atBars", root);
      var calc = ctx.q("#atCalc", root);

      function currentA() {
        var s = h.scaled.map(function (row) { return row.map(function (v) { return v / state.temp; }); });
        var masked = state.causal
          ? s.map(function (row, i) { return row.map(function (v, j) { return j <= i ? v : -Infinity; }); })
          : s;
        return M.softmaxRows(masked);
      }

      function drawAll() {
        var A = currentA();

        ctx.matrix.paintHeat(heat, A, {
          maxAbs: 1,
          values: true,
          rowLabels: toks,
          colLabels: toks,
          outline: state.cell,
          cellHeight: 34
        });

        ctx.q("#atQName", root).textContent = toks[state.q];
        var items = A[state.q].map(function (p, i) { return { label: toks[i], p: p, pick: i === state.cell.c && state.cell.r === state.q, zero: p === 0 }; });
        ctx.chart.probBars(bars, items);

        var r = state.cell.r, c = state.cell.c;
        var score = h.scores[r][c];
        var scaled = h.scaled[r][c];
        var masked = state.causal && c > r;
        var lines = [];
        lines.push('<span class="c"># query token: ' + toks[r] + "   key token: " + toks[c] + "   (head 0)</span>");
        lines.push("");
        lines.push('<span class="k">q</span> = [' + h.Q[r].map(function (v) { return v.toFixed(2); }).join(", ") + "]");
        lines.push('<span class="k">k</span> = [' + h.K[c].map(function (v) { return v.toFixed(2); }).join(", ") + "]");
        lines.push("");
        lines.push("dot product:");
        var terms = h.Q[r].map(function (qv, i) {
          return "<span class=\"c\">(" + qv.toFixed(2) + " × " + h.K[c][i].toFixed(2) + ")</span>";
        });
        lines.push("  " + terms.join(" + "));
        lines.push("  = <span class=\"v\">" + score.toFixed(4) + "</span>   ← raw score");
        lines.push("");
        lines.push("scale:  " + score.toFixed(4) + " / √" + h.headDim + " = " + score.toFixed(4) + " / " + (1 / h.scale).toFixed(3) + " = <span class=\"v\">" + scaled.toFixed(4) + "</span>");
        if (state.temp !== 1) {
          lines.push("sharpness: " + scaled.toFixed(4) + " / " + state.temp.toFixed(2) + " = <span class=\"v\">" + (scaled / state.temp).toFixed(4) + "</span>");
        }
        if (masked) {
          lines.push("");
          lines.push('<span class="hl">Masked: token ' + c + " comes after token " + r + ", so score → −∞ and weight → 0</span>");
        } else {
          var rowVals = A[r].map(function (v) { return v.toFixed(3); });
          lines.push("");
          lines.push("softmax over row " + r + ":");
          lines.push("  [" + rowVals.join(", ") + "]");
          lines.push("  sum = " + A[r].reduce(function (a, b) { return a + b; }, 0).toFixed(3));
          lines.push("");
          lines.push('<span class="hl">weight of ' + toks[c] + " in " + toks[r] + "'s context = " + (A[r][c] * 100).toFixed(1) + "%</span>");
        }
        calc.innerHTML = lines.join("\n");
      }

      var canvasClickTargets = null;
      heat.addEventListener("click", function (e) {
        var rect = heat.getBoundingClientRect();
        var meta = heat._meta;
        if (!meta) return;
        var x = e.clientX - rect.left - meta.pad.l;
        var y = e.clientY - rect.top - meta.pad.t;
        var c = Math.floor(x / (meta.cw + meta.gap));
        var r = Math.floor(y / (meta.chh + meta.gap));
        if (r < 0 || r >= toks.length || c < 0 || c >= toks.length) return;
        state.cell = { r: r, c: c };
        state.q = r;
        ctx.qa("[data-q]", root).forEach(function (b) { b.classList.toggle("on", Number(b.getAttribute("data-q")) === r); });
        drawAll();
      });

      ctx.qa("[data-q]", root).forEach(function (b) {
        b.addEventListener("click", function () {
          state.q = Number(b.getAttribute("data-q"));
          if (state.cell.r !== state.q) state.cell = { r: state.q, c: Math.min(state.q, 2) };
          ctx.qa("[data-q]", root).forEach(function (x) { x.classList.toggle("on", x === b); });
          drawAll();
        });
      });

      ctx.qa("#atMask button", root).forEach(function (b) {
        b.addEventListener("click", function () {
          state.causal = Number(b.getAttribute("data-m"));
          ctx.qa("#atMask button", root).forEach(function (x) { x.classList.toggle("on", x === b); });
          drawAll();
        });
      });

      var tempSlider = ctx.q("#atTemp", root);
      tempSlider.addEventListener("input", function () {
        state.temp = Number(this.value);
        ctx.q("#atTempVal", root).textContent = state.temp.toFixed(2);
        drawAll();
      });

      drawAll();

      /* ---------- scaling illustration ---------- */
      var scaleCv = ctx.q("#scaleCv", root);
      var sdR = ctx.q("#scaleSdR", root);
      var rng = M.rng(99);
      var rawScores = [];
      for (var i = 0; i < 8; i++) rawScores.push(M.gaussFrom(rng));

      function drawScale() {
        var sd = Number(sdR.value);
        ctx.q("#scaleSd", root).textContent = sd.toFixed(1);
        var scores = rawScores.map(function (v) { return v * sd; });
        var p = M.softmax(scores);
        var S = ctx.chart.setup(scaleCv, 190);
        var c = S.ctx, W = S.W, H = S.H;
        var T = ctx.chart.themeColors();
        var bw = W / 8;
        var maxP = Math.max.apply(null, p);
        p.forEach(function (v, k) {
          var hgt = (v / Math.max(maxP, 0.0001)) * (H - 34);
          var x = k * bw + bw * 0.14, w = bw * 0.72;
          c.fillStyle = "rgba(139,123,255,.28)";
          ctx.matrix.roundRect(c, x, H - 22, w, -(H - 34), 4);
          c.fill();
          var g = c.createLinearGradient(0, H - 22 - hgt, 0, H - 22);
          g.addColorStop(0, "#22d3ee");
          g.addColorStop(1, "rgba(139,123,255,.65)");
          c.fillStyle = g;
          ctx.matrix.roundRect(c, x, H - 22 - hgt, w, hgt, 4);
          c.fill();
          c.fillStyle = T.faint;
          c.font = "9.5px 'JetBrains Mono', ui-monospace, monospace";
          c.textAlign = "center";
          c.fillText((v * 100).toFixed(0) + "%", x + w / 2, H - 8);
        });
        var Hent = M.entropy(p);
        ctx.q("#scaleH", root).textContent = Hent.toFixed(2);
      }
      sdR.addEventListener("input", drawScale);
      drawScale();
      scaleCv.addEventListener("redraw", drawScale);
    }
  });
})();
