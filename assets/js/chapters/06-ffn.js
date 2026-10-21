/* ==========================================================================
   06-ffn.js — the feed-forward network
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  LLM.registerChapter({
    id: "ffn",
    part: "transformer",
    title: "Feed-forward: the model thinking alone",
    kicker: "Chapter 06",
    summary: "Attention moves information between tokens. The feed-forward network then works on every token by itself, expanding it four times wider, applying a non-linearity, and squeezing it back. Two thirds of all parameters live here.",
    difficulty: "Core",
    keywords: "feed forward ffn mlp gelu relu expansion neurons key value memory parameters experts",

    render: function (ctx) {
      var icons = ctx.icons;
      var run = ctx.demo.model1.run(ctx.demo.SENTENCE);
      var toks = ctx.demo.SENTENCE.map(function (t) { return t.replace(/^ /, ""); });
      var F = run.config.ffnWidth;

      return (
        '<h2 id="what">What happens after attention</h2>'
        + '<p data-narrate="' +
        ctx.attr("Attention has just finished mixing information between tokens. Now comes a completely different operation. The feed-forward network takes each token vector on its own, with no communication with any other token, and transforms it through a small two layer neural network. It is applied to every position identically and independently. If you deleted attention the model could not see context; if you deleted the feed forward network the model could not think about the context it saw.") +
        '">Attention has just finished mixing information <em>between</em> tokens. Now comes something completely different: the feed-forward network takes each token vector <strong>on its own</strong>, with no communication, and pushes it through a small two-layer network. Identical and independent at every position.</p>'

        + '<div class="callout insight" data-narrate="' +
        ctx.attr("The clean division of labour is the most useful way to think about a transformer. Attention is the only operation that moves information horizontally, between positions. Everything else, the feed forward network and the normalisations and the residuals, works vertically, on a single position at a time. Attention is the communication channel and the feed forward network is the computation.") +
        '"><div class="co-label">' + icons.bulb + " The division of labour</div>"
        + "<p>Attention is the <strong>only</strong> operation that moves information horizontally, between positions. Everything else — the FFN, the norms, the residuals — works vertically, on one position at a time. <em>Attention communicates; the FFN computes.</em></p></div>"

        + '<h2 id="shape">The shape of it: up, bend, down</h2>'
        + '<p data-narrate="' +
        ctx.attr("The feed forward network is two matrix multiplications with a non-linearity in between. The first expands the width, typically by a factor of four. Our toy model goes from eight to thirty two. Then a non-linearity is applied element by element, and the second matrix brings the width back down to eight so the residual stream keeps its shape. Without that non-linearity the two matrices would collapse into a single linear map and the whole thing would be pointless.") +
        '">Two matrix multiplications with a non-linearity in between. The first <strong>expands the width</strong>, typically by 4× (our toy model: 8 → 32). Then a non-linearity is applied element by element, and the second matrix brings it <strong>back down</strong> to 8 so the residual stream keeps its shape.</p>'

        + '<div class="formula" style="flex-direction:column;gap:8px">'
        + '<div><span class="v">h</span><span class="op">=</span><span class="v">GELU</span>(<span class="v">x</span><span class="v">W</span><sub>1</sub><span class="op">+</span><span class="v">b</span><sub>1</sub>)</div>'
        + '<div><span class="v">out</span><span class="op">=</span><span class="v">h</span><span class="v">W</span><sub>2</sub><span class="op">+</span><span class="v">b</span><sub>2</sub></div>'
        + "</div>"

        + '<div class="viz"><div class="viz-title">Getting the shapes right is the whole trick</div>'
        + '<div class="shape-flow">'
        + '<div class="sf-box">x<br><span>1 × 8</span></div>'
        + '<div class="sf-arrow">→</div>'
        + '<div class="sf-box sf-up">× W₁<br><span>8 × 32</span></div>'
        + '<div class="sf-arrow">→</div>'
        + '<div class="sf-box sf-up">GELU<br><span>1 × 32</span></div>'
        + '<div class="sf-arrow">→</div>'
        + '<div class="sf-box sf-up">× W₂<br><span>32 × 8</span></div>'
        + '<div class="sf-arrow">→</div>'
        + '<div class="sf-box">out<br><span>1 × 8</span></div>'
        + "</div>"
        + '<div class="tiny faint" style="margin-top:10px">The widened middle is where the capacity lives. 8 × 32 + 32 × 8 = <b>512</b> numbers here; a real model with d = 4096 would have 4096 × 16384 × 2 = <b>134 million</b> numbers in a single FFN.</div>'
        + "</div>"

        + '<h2 id="gelu">Why the bend matters</h2>'
        + '<p data-narrate="' +
        ctx.attr("The non-linearity is what makes depth meaningful. Without it, multiplying by W2 after multiplying by W1 is exactly the same as multiplying by a single combined matrix, so stacking layers would add nothing. The bend gives the network a way to express conditional behaviour: this neuron only participates when its input is above a certain threshold. Modern models usually use GELU rather than ReLU because GELU is smooth near zero, which makes the gradient better behaved during training.") +
        '">The non-linearity is what makes depth meaningful. Without it, <span class="mono">W₁</span> then <span class="mono">W₂</span> is just one combined matrix, so stacking layers would add nothing. The bend lets the network express <strong>conditional</strong> behaviour: this neuron only participates when its input crosses a threshold.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">GELU vs ReLU</span><span class="ix-hint">drag the input</span></div>'
        + '<div class="ix-body">'
        + '<div class="plot-wrap"><canvas id="geluCv" data-autodraw="1"></canvas></div>'
        + '<div class="ctl"><div class="field" style="flex:1"><label>input x <b id="geluX">1.00</b></label>'
        + '<input type="range" id="geluS" min="-4" max="4" step="0.05" value="1"></div>'
        + '<div class="stat" style="flex:none;min-width:150px"><div class="sv" id="geluOut">0.84</div><div class="sk">GELU(x)</div></div></div>'
        + '<div class="tiny faint">GELU ≈ 0.5x(1 + tanh(√(2/π)(x + 0.044715x³))). It never truly hits zero, so a little signal always flows — one reason gradients behave better than with ReLU’s hard corner.</div>'
        + "</div></div>"

        + '<h2 id="compute">Try it: one token through the FFN</h2>'
        + '<p data-narrate="' +
        ctx.attr("Pick a token and follow it through. You are looking at the actual activation values of the thirty two hidden neurons. Most of them are close to zero, which is the normal state of affairs. A few are strongly positive or negative and those are the ones doing work for this particular token. In a trained model, individual neurons often correspond to surprisingly specific concepts, and that is the sense in which people say the feed forward network is where factual knowledge is stored.") +
        '">Pick a token and follow it through. You are looking at the actual activations of 32 hidden neurons. Most sit near zero; a few are strongly positive or negative, and those are the ones doing work for this token.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">FFN internals</span><span class="ix-hint">8 → ' + F + " → 8</span></div>"
        + '<div class="ix-body">'
        + '<div class="emb-selrow" id="ffnTok">' + toks.map(function (t, i) {
          return '<button class="emb-word' + (i === 5 ? " on" : "") + '" data-t="' + i + '">' + ctx.esc(t) + "</button>";
        }).join("") + "</div>"
        + '<div class="viz"><div class="viz-title">The 32 hidden neurons for <span class="sub" id="ffnName">mat</span></div>'
        + '<div class="plot-wrap"><canvas id="ffnBars"></canvas></div></div>'
        + '<div class="viz-title" style="margin-top:6px">Step 1 — up-projection, then GELU (scroll for all ' + F + " neurons)</div>"
        + '<div id="ffnUp"></div>'
        + '<div class="viz-title" style="margin-top:14px">Step 2 — down-projection back to width 8</div>'
        + '<div id="ffnDown"></div>'
        + '<div id="ffnTop"></div>'
        + "</div></div>"

        + '<h2 id="memory">The FFN as a key–value memory</h2>'
        + '<p data-narrate="' +
        ctx.attr("There is a useful way to read the two matrices in the feed forward network. The rows of the first matrix behave like keys: each neuron fires when its pattern matches what is currently in the residual stream. The columns of the second matrix behave like values: when a neuron fires, it writes that value back into the residual stream. So the feed forward network is a lookup table with a very large number of soft matches rather than exact ones. Storing a fact and then recalling it is literally what this structure does well.") +
        '">Read the two matrices as a lookup table. The <strong>rows of W₁ are keys</strong>: each neuron fires when its pattern matches what is currently in the residual stream. The <strong>columns of W₂ are values</strong>: when a neuron fires, it writes that value back. So the FFN is a lookup table with a huge number of <em>soft</em> matches.</p>'

        + '<div class="callout note"><div class="co-label">' + icons.info + " Where the facts live</div>"
        + "<p>Work on interpretable models has found that specific facts are often traceable to specific FFN neurons — the Eiffel Tower is in Paris kind of facts. Editing a single neuron can flip a fact. This is also why fine-tuning on new facts is unreliable: you are writing into a memory that assumes facts are stable.</p></div>"

        + '<h2 id="params">Where the parameters actually are</h2>'
        + '<p data-narrate="' +
        ctx.attr("A lot of people are surprised by this ratio. In a standard transformer block the attention matrices are only about a third of the parameters. The feed forward network holds roughly two thirds, because its middle layer is four times wider. When you read a parameter count for a model, most of that number is feed forward weights.") +
        '">A lot of people are surprised by this ratio. In a standard block, attention holds only about a third of the parameters. The FFN holds roughly <strong>two thirds</strong>, because its middle layer is 4× wider.</p>'

        + '<div class="viz"><div class="viz-title">Parameter split, d_model = 4096, FFN ratio 4, per layer</div>'
        + '<div class="bar-compare">'
        + '<div class="bc-row"><span class="bc-lab">Attention (W<sub>Q,K,V,O</sub>)</span><div class="bc-track"><span class="bc-fill attn" style="width:33.3%"></span></div><span class="bc-val">67.1 M</span></div>'
        + '<div class="bc-row"><span class="bc-lab">Feed-forward (W₁, W₂)</span><div class="bc-track"><span class="bc-fill ffn" style="width:66.7%"></span></div><span class="bc-val">134.2 M</span></div>'
        + "</div></div>"

        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>The FFN is applied <strong>per token</strong>, independently — no communication between positions.</li>"
        + "<li>Shape is <span class=\"mono\">d → 4d → d</span>, with a non-linearity in the wide middle.</li>"
        + "<li>Without the non-linearity, two matrices collapse into one and depth becomes useless.</li>"
        + "<li>It behaves like a soft key–value memory; much factual knowledge appears to live here.</li>"
        + "<li>It holds roughly two thirds of the model's parameters.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var run = ctx.demo.model1.run(ctx.demo.SENTENCE);
      var toks = ctx.demo.SENTENCE.map(function (t) { return t.replace(/^ /, ""); });
      var F = run.config.ffnWidth;
      var cur = 5;

      /* ---- GELU curve ---- */
      var geluCv = ctx.q("#geluCv", root);
      var geluS = ctx.q("#geluS", root);

      function drawGelu() {
        var x = Number(geluS.value);
        ctx.q("#geluX", root).textContent = x.toFixed(2);
        ctx.q("#geluOut", root).textContent = ctx.mm.gelu(x).toFixed(3);
        var pts = [], rpts = [];
        for (var t = -4; t <= 4.001; t += 0.1) {
          pts.push([t, ctx.mm.gelu(t)]);
          rpts.push([t, Math.max(0, t)]);
        }
        ctx.chart.line(geluCv, {
          series: [
            { data: pts, color: "#8b7bff", width: 2.4 },
            { data: rpts, color: "#5b6480", width: 1.5, dash: [4, 4] }
          ],
          height: 210,
          xLabel: "x",
          yLabel: "activation",
          yDomain: [-0.6, 4.2],
          xTicks: [-4, -2, 0, 2, 4],
          guide: { x: x, y: ctx.mm.gelu(x), dot: true }
        });
      }
      geluS.addEventListener("input", drawGelu);
      drawGelu();
      geluCv.addEventListener("redraw", drawGelu);

      /* ---- FFN internals ---- */
      var bars = ctx.q("#ffnBars", root);

      function drawToken(i) {
        cur = i;
        var pre = run.ffnPre[i];
        var act = run.ffnAct[i];
        var outv = run.ffnLin[i];
        ctx.q("#ffnName", root).textContent = toks[i];

        ctx.qa("[data-t]", root).forEach(function (b) {
          b.classList.toggle("on", Number(b.getAttribute("data-t")) === i);
        });

        // bar chart
        var S = ctx.chart.setup(bars, 150);
        var c = S.ctx, W = S.W, H = S.H;
        var bw = W / F;
        var maxA = Math.max.apply(null, act.map(Math.abs)) || 1;
        act.forEach(function (v, k) {
          var hgt = (Math.abs(v) / maxA) * (H - 22);
          var x = k * bw + bw * 0.15, w = bw * 0.7;
          var g = c.createLinearGradient(0, H - 16 - hgt, 0, H - 16);
          g.addColorStop(0, v >= 0 ? "#22d3ee" : "#60a5fa");
          g.addColorStop(1, v >= 0 ? "rgba(34,211,238,.25)" : "rgba(96,165,250,.25)");
          c.fillStyle = g;
          ctx.matrix.roundRect(c, x, H - 16 - hgt, w, hgt, 2);
          c.fill();
        });
        c.strokeStyle = "rgba(255,255,255,.12)";
        c.beginPath(); c.moveTo(0, H - 16); c.lineTo(W, H - 16); c.stroke();

        ctx.q("#ffnUp", root).innerHTML =
          ctx.matrix.block({
            name: "x<sub>ln</sub> → h<sub>pre</sub>",
            rows: [pre],
            desc: "before GELU · 1 × " + F + " · scroll →",
            dec: 2, heat: true, scheme: "diverging", cls: "narrow"
          })
          + '<div style="height:10px"></div>'
          + ctx.matrix.block({
            name: "GELU(h<sub>pre</sub>)",
            rows: [act],
            desc: "after the bend · 1 × " + F + " · scroll →",
            dec: 2, heat: true, scheme: "diverging", cls: "narrow"
          });

        ctx.q("#ffnDown", root).innerHTML =
          '<div class="mat-flow">'
          + ctx.matrix.block({ name: "h", rows: [act], desc: "1 × " + F, dec: 2, heat: true, scheme: "diverging", cls: "narrow" })
          + '<div class="mat-arrow">×W₂→</div>'
          + ctx.matrix.block({ name: "out", rows: [outv], desc: "1 × 8", dec: 2, heat: true, scheme: "diverging" })
          + "</div>";

        var ranked = act.map(function (v, k) { return { k: k, v: v }; })
          .sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); })
          .slice(0, 5);
        ctx.q("#ffnTop", root).innerHTML =
          '<div class="viz" style="margin-top:14px"><div class="viz-title">Most active neurons for “' + ctx.esc(toks[i]) + "”</div>"
          + '<div class="kv-list">'
          + ranked.map(function (r) {
            return '<div class="kv"><span>neuron ' + r.k + "</span><b>" + r.v.toFixed(3) + "</b></div>";
          }).join("")
          + "</div></div>";
      }

      ctx.qa("[data-t]", root).forEach(function (b) {
        b.addEventListener("click", function () { drawToken(Number(b.getAttribute("data-t"))); });
      });
      drawToken(5);
      bars.addEventListener("redraw", function () { drawToken(cur); });

      ctx.q(".ix-body", root).addEventListener("redraw", function () { drawToken(cur); });
    }
  });
})();
