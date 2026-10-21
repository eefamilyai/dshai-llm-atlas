/* ==========================================================================
   14-endtoend.js — one token, from characters to a decision
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  LLM.registerChapter({
    id: "endtoend",
    part: "synthesis",
    title: "End to end: one token at a time",
    kicker: "Chapter 14",
    summary: "Every stage you have read about, run in order on one prompt, with the actual tensors passed from one step to the next. This is the whole machine in one page.",
    difficulty: "Synthesis",
    keywords: "end to end walkthrough full pipeline complete example recap summary",

    render: function (ctx) {
      var icons = ctx.icons;

      return (
        '<h2 id="prompt">The prompt</h2>'
        + '<p data-narrate="' +
        ctx.attr("Here is the entire pipeline on one prompt, using the same toy model from every previous chapter. Nothing has been simplified for this page. The tensors you will see at each step are literally the output of the previous step, computed live in your browser. Step through it and watch the numbers travel.") +
        '">The entire pipeline on one prompt, using the same toy model from every previous chapter. <strong>Nothing has been simplified.</strong> The tensors you see at each step are literally the output of the previous step, computed live in your browser.</p>'

        + '<div class="prompt-hero"><span class="ph-label">prompt</span><div class="ph-text">The cat sat on the<span class="ph-cursor"></span></div>'
        + '<div class="ph-goal">goal: predict the next token</div></div>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">The complete forward pass</span><span class="ix-hint" id="e2eCount">step 1</span></div>'
        + '<div class="ix-body">'
        + '<div class="e2e-rail" id="e2eRail"></div>'
        + '<div class="e2e-panel" id="e2ePanel"></div>'
        + '<div class="ctl" style="margin-top:16px;justify-content:center">'
        + '<button class="btn btn-ghost btn-sm" id="e2ePrev">← Previous</button>'
        + '<button class="btn btn-primary btn-sm" id="e2eNext">Next stage →</button>'
        + "</div></div></div>"

        + '<h2 id="where">Where each chapter fits</h2>'
        + '<p data-narrate="' +
        ctx.attr("If you remember only one page of this guide, make it this one. It is the map. Every stage here is a chapter, and the arrows between them are the only things that connect a string of characters to a prediction.") +
        '">If you remember only one page of this guide, make it this one. Every stage here is a chapter, and the arrows between them are the only things that connect a string of characters to a prediction.</p>'

        + '<table class="cmp"><thead><tr><th style="width:26%">Stage</th><th>What happens</th><th style="width:16%">Chapter</th></tr></thead><tbody>'
        + '<tr><td>Tokenize</td><td>Characters → subword tokens → integer ids</td><td><a href="#/tokens">01</a></td></tr>'
        + '<tr><td>Embed</td><td>Each id indexes a row of the embedding table</td><td><a href="#/embeddings">02</a></td></tr>'
        + '<tr><td>Position</td><td>A positional fingerprint is added to each row</td><td><a href="#/position">03</a></td></tr>'
        + '<tr><td>Attention</td><td>Tokens exchange information via Q, K, V</td><td><a href="#/attention">04</a></td></tr>'
        + '<tr><td>Multi-head</td><td>Several attention patterns run in parallel</td><td><a href="#/multihead">05</a></td></tr>'
        + '<tr><td>Feed-forward</td><td>Each token processed alone: 8 → 32 → 8</td><td><a href="#/ffn">06</a></td></tr>'
        + '<tr><td>Residual + norm</td><td>Add back, renormalise, repeat N times</td><td><a href="#/norm">07</a> / <a href="#/block">08</a></td></tr>'
        + '<tr><td>Unembed</td><td>Final vector → one logit per vocabulary token</td><td><a href="#/logits">09</a></td></tr>'
        + '<tr><td>Softmax</td><td>Logits → a probability distribution</td><td><a href="#/logits">09</a></td></tr>'
        + '<tr><td>Sample</td><td>One token is drawn and appended</td><td><a href="#/sampling">10</a></td></tr>'
        + '<tr><td>Loop</td><td>The whole thing runs again with the cache</td><td><a href="#/generation">11</a></td></tr>'
        + "</tbody></table>"

        + '<h2 id="closing">The thing worth taking away</h2>'
        + '<p data-narrate="' +
        ctx.attr("Nothing in this pipeline is mysterious. There is no ghost in it. There is a lookup table, some matrix multiplications, a softmax, and a random draw, repeated until it stops. What makes it remarkable is not any single step but what happens when a hundred billion numbers are tuned so that the next token prediction is good across the whole of human text. Everything that looks like understanding is downstream of that one narrow objective being pursued extremely well.") +
        '">Nothing in this pipeline is mysterious. There is no ghost in it. A lookup table, some matrix multiplications, a softmax, and a random draw — repeated until it stops. What makes it remarkable is not any single step, but what happens when a hundred billion numbers are tuned so next-token prediction is good across the whole of human text.</p>'

        + '<div class="callout insight"><div class="co-label">' + icons.bulb + " The honest summary</div>"
        + "<p style=\"font-size:15.6px\">A large language model is a fixed function that maps a sequence of token ids to a probability distribution over the next token. Its parameters were fitted by gradient descent on that single objective, over a very large quantity of text. Asking it a question is choosing a special token sequence that makes the well-fitted continuation be an answer. Everything else — the apparent reasoning, the apparent personality, the apparent goals — is a property of that fitted function, not a component bolted onto it.</p></div>"
      );
    },

    mount: function (root, ctx) {
      var M = ctx.mm;
      var D = ctx.demo;
      var PROMPT = D.PROMPT;
      var run = D.model1.run(PROMPT);
      var toks = PROMPT.map(function (t) { return t.replace(/^ /, ""); });

      var toksTk = ctx.tokenizer.tokenize("The cat sat on the");
      var last = run.out[run.out.length - 1];

      var STAGES = [];

      function stage(title, sub, html) { STAGES.push({ title: title, sub: sub, html: html }); }

      stage("Tokenize", "text → ids", function () {
        return '<p class="tiny muted">The prompt is split into subword tokens. No neural network has touched anything yet — this is a fixed lookup table.</p>'
          + '<div class="tokrow">' + toksTk.map(function (t) {
            var sp = t.text.charAt(0) === " ";
            return '<div class="tok alt"><span class="t-sp">' + (sp ? "␣" : "&nbsp;") + "</span>"
              + '<span class="t-txt">' + ctx.esc(sp ? t.text.slice(1) : t.text) + "</span>"
              + '<span class="t-id">' + t.id + "</span></div>";
          }).join("") + "</div>"
          + '<div class="viz" style="margin-top:14px"><div class="viz-title">As integers</div>'
          + ctx.matrix.block({
            name: "ids", rows: [toksTk.map(function (t) { return t.id; })],
            colHeads: toks, desc: "1 × " + toksTk.length + " · these are the only numbers the model sees",
            dec: 0, heat: false
          }) + "</div>";
      }());

      stage("Embed", "ids → vectors", function () {
        return '<p class="tiny muted">Each id selects a row of the embedding table. Five integers become a 5 × 8 grid of real numbers.</p>'
          + ctx.matrix.block({
            name: "E[ids]", rows: run.x0.map(function (r) { return r; }),
            rowHeads: toks, desc: "5 × 8 · embeddings + position would come next",
            dec: 2, heat: true, scheme: "diverging", cls: "compact"
          })
          + '<p class="tiny muted" style="margin-top:10px">The matrix above is already <span class="mono">embedding + positional encoding</span> — step 3 is folded in, because in the model they are added before the first block runs.</p>';
      }());

      stage("Attention", "tokens exchange information", function () {
        var h = run.heads[0];
        return '<p class="tiny muted">Each token forms a query, a key and a value. Queries are matched against keys, the result is softmaxed into weights, and the values are blended by those weights. The causal mask hides the future.</p>'
          + '<div class="mat-flow">'
          + ctx.matrix.block({ name: "Q", rows: h.Q, rowHeads: toks, desc: "5 × 8", cls: "tight", dec: 2, heat: true, scheme: "diverging" })
          + '<div class="mat-arrow">×K<sup>⊤</sup>→</div>'
          + ctx.matrix.block({ name: "A", rows: h.A, rowHeads: toks, colHeads: toks, desc: "attention weights", cls: "tight", dec: 2, heat: true, scheme: "attn", maxAbs: 1 })
          + '<div class="mat-arrow">×V→</div>'
          + ctx.matrix.block({ name: "out", rows: h.O, rowHeads: toks, desc: "5 × 8", cls: "tight", dec: 2, heat: true, scheme: "diverging" })
          + "</div>";
      }());

      stage("Residual add", "attention is added, not substituted", function () {
        return '<p class="tiny muted">The attention output is added to the input. The residual stream now carries both the original token identity and everything attention gathered.</p>'
          + '<div class="mat-flow">'
          + ctx.matrix.block({ name: "x", rows: run.x0, desc: "5 × 8", cls: "tight", dec: 2, heat: true, scheme: "diverging" })
          + '<div class="mat-arrow">+</div>'
          + ctx.matrix.block({ name: "attn", rows: run.attnOut, desc: "5 × 8", cls: "tight", dec: 2, heat: true, scheme: "diverging" })
          + '<div class="mat-arrow">=</div>'
          + ctx.matrix.block({ name: "x₂", rows: run.x2, rowHeads: toks, desc: "5 × 8", cls: "tight", dec: 2, heat: true, scheme: "diverging" })
          + "</div>";
      }());

      stage("Feed-forward", "each token thinks alone", function () {
        return '<p class="tiny muted">After normalising, each row goes through 8 → 32 → 8 independently. No row talks to any other row here.</p>'
          + ctx.matrix.block({ name: "LN(x₂)", rows: run.ln, rowHeads: toks, desc: "5 × 8", cls: "tight", dec: 2, heat: true, scheme: "diverging" })
          + '<div style="height:10px"></div>'
          + ctx.matrix.block({ name: "GELU(LN·W₁)", rows: run.ffnAct, rowHeads: toks, desc: "5 × 32 · the widened middle", cls: "narrow", dec: 2, heat: true, scheme: "diverging" })
          + '<div style="height:10px"></div>'
          + ctx.matrix.block({ name: "block output", rows: run.out, rowHeads: toks, desc: "5 × 8", cls: "tight", dec: 2, heat: true, scheme: "diverging" });
      }());

      stage("Repeat × N", "the same block, 12 to 96 times", function () {
        return '<p class="tiny muted">Our toy model runs one block. A real model runs dozens, each with its own weights, all operating on the same residual stream shape.</p>'
          + '<div class="layer-stack">'
          + ['block 1', 'block 2', 'block 3', '…', 'block N'].map(function (b, i) {
            return '<div class="layer-row' + (i === 0 ? " on" : "") + '"><span class="ln">' + (i < 3 ? "L" + (i + 1) : i === 4 ? "L" + "N" : "") + '</span>'
              + '<span style="flex:1">' + b + '</span><span class="lbar" style="flex:0 0 80px"><span style="width:' + (100 - i * 18) + '%"></span></span></div>';
          }).join("") + "</div>"
          + '<p class="tiny muted" style="margin-top:12px">GPT-2 small: 12 blocks. GPT-3: 96. Llama-3 70B: 80.</p>';
      }());

      stage("Final hidden state", "one vector, for the last position", function () {
        return '<p class="tiny muted">Only the last row matters for predicting the next token. This 1 × 8 vector is the model\'s entire summary of the prompt at this position.</p>'
          + ctx.matrix.block({
            name: "h<sub>final</sub>", rows: [last],
            desc: "1 × 8 · last position", dec: 3, heat: true, scheme: "diverging"
          });
      }());

      stage("Unembed", "vector → one score per vocabulary token", function () {
        var toyLogits = D.NEXT_CANDIDATES.map(function (c, i) {
          var idx = D.VOCAB.indexOf(c);
          var e = idx >= 0 ? run.params.E[c] : null;
          return e ? M.dot(last.slice(0, e.length), e) : 0;
        });
        var mx = Math.max.apply(null, toyLogits);
        return '<p class="tiny muted">Multiply the final vector by the unembedding matrix. Our toy model does this for five candidate tokens. The result is honest and useless: the weights are random.</p>'
          + ctx.matrix.block({
            name: "toy logits", rows: [toyLogits],
            colHeads: D.NEXT_CANDIDATES.map(function (c) { return c.trim(); }),
            desc: "untrained model — values are meaningless", dec: 2, heat: true, scheme: "diverging"
          })
          + '<div class="callout warn" style="margin-top:14px"><div class="co-label">' + ctx.icons.warn + " This is what training fixes</div>"
          + "<p>The arithmetic above is <em>correct</em> and the answer is <em>garbage</em>, because every weight was random. Training (chapter 12) is what makes these numbers mean anything. Here is what a trained model’s logits look like for the same prompt:</p>"
          + ctx.matrix.block({
            name: "Trained logits", rows: [D.TRAINED_LOGITS],
            colHeads: D.NEXT_CANDIDATES.map(function (c) { return c.trim(); }),
            desc: "illustrative — a real trained model", dec: 2, heat: true, scheme: "diverging"
          }) + "</div>";
      }());

      stage("Softmax", "logits → probabilities", function () {
        var p = M.softmax(D.TRAINED_LOGITS);
        return '<p class="tiny muted">Exponentiate, divide by the total. Now the numbers sum to 1 and can be read as probabilities.</p>'
          + '<div id="e2eProbs"></div>'
          + '<div class="stat-row" style="margin-top:14px">'
          + '<div class="stat"><div class="sv">' + (Math.max.apply(null, p) * 100).toFixed(1) + '%</div><div class="sk">top token</div></div>'
          + '<div class="stat"><div class="sv">' + M.entropy(p).toFixed(3) + '</div><div class="sk">entropy (nats)</div></div>'
          + '<div class="stat"><div class="sv">' + Math.exp(M.entropy(p)).toFixed(2) + '</div><div class="sk">effective choices</div></div>'
          + '<div class="stat"><div class="sv">1.000</div><div class="sk">sum of probabilities</div></div>'
          + "</div>";
      }());

      stage("Sample", "choose one", function () {
        return '<p class="tiny muted">Temperature, top-k or top-p narrow the distribution, then one token is drawn. With greedy decoding the model picks “mat” essentially every time — which is correct here.</p>'
          + '<div class="sample-out" style="justify-content:center;flex-direction:column;gap:10px;padding:24px">'
          + '<span class="sample-tok" style="font-size:22px;padding:9px 20px">mat</span>'
          + '<span class="tiny faint">sampled token · 59.7% probability at T = 1</span></div>'
          + '<div class="gen-stream" style="margin-top:16px">The cat sat on the <span class="hl-cyan">mat</span><span class="cur"></span></div>';
      }());

      stage("Loop", "append and go again", function () {
        return '<p class="tiny muted">The new token joins the context and the machine runs again, reusing the KV cache. Every token in the output you have ever read came out of exactly this loop.</p>'
          + '<div class="loop-final">'
          + '<div class="lf-step"><span>1</span>tokenize</div><div class="lf-a">→</div>'
          + '<div class="lf-step"><span>2</span>forward</div><div class="lf-a">→</div>'
          + '<div class="lf-step"><span>3</span>softmax</div><div class="lf-a">→</div>'
          + '<div class="lf-step"><span>4</span>sample</div><div class="lf-a">↺</div>'
          + "</div>"
          + '<div class="gen-stream" style="margin-top:16px">The cat sat on the <span class="hl-cyan">mat</span><span class="hl-cyan"> and</span><span class="hl-cyan"> the</span><span class="hl-cyan"> dog</span><span class="hl-cyan"> sat</span> down next to it<span class="cur"></span></div>';
      }());

      var rail = ctx.q("#e2eRail", root);
      var panel = ctx.q("#e2ePanel", root);
      var cur = 0;

      rail.innerHTML = STAGES.map(function (s, i) {
        return '<button class="e2e-dot" data-i="' + i + '" title="' + ctx.attr(s.title) + '"><span>' + (i + 1) + "</span></button>";
      }).join("");

      function show(i) {
        cur = Math.max(0, Math.min(STAGES.length - 1, i));
        var s = STAGES[cur];
        ctx.qa(".e2e-dot", rail).forEach(function (d) {
          var n = Number(d.getAttribute("data-i"));
          d.classList.toggle("on", n === cur);
          d.classList.toggle("done", n < cur);
        });
        panel.innerHTML =
          '<div class="e2e-head"><div class="e2e-num">Stage ' + (cur + 1) + " of " + STAGES.length + "</div>"
          + '<div class="e2e-title">' + ctx.esc(s.title) + ' <span class="e2e-sub">' + ctx.esc(s.sub) + "</span></div></div>"
          + '<div class="e2e-content">' + s.html + "</div>";
        ctx.q("#e2eCount", ctx.q(".ix-head", root) || root).textContent = "step " + (cur + 1);
        if (cur === 9) {
          var bars = ctx.q("#e2eProbs", panel);
          if (bars) {
            var p = M.softmax(D.TRAINED_LOGITS);
            var order = p.map(function (v, k) { return { i: k, p: v }; }).sort(function (a, b) { return b.p - a.p; });
            ctx.chart.probBars(bars, order.map(function (o) {
              return { label: D.NEXT_CANDIDATES[o.i], p: o.p, pick: o.i === order[0].i };
            }));
          }
        }
      }

      ctx.q("#e2eNext", root).addEventListener("click", function () { show(cur + 1); });
      ctx.q("#e2ePrev", root).addEventListener("click", function () { show(cur - 1); });
      ctx.qa(".e2e-dot", rail).forEach(function (d) {
        d.addEventListener("click", function () { show(Number(d.getAttribute("data-i"))); });
      });
      show(0);
    }
  });
})();
