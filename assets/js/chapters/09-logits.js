/* ==========================================================================
   09-logits.js — unembedding and softmax
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  LLM.registerChapter({
    id: "logits",
    part: "output",
    title: "Logits & softmax",
    kicker: "Chapter 09",
    summary: "The model is done thinking. Its final vector is compared against every token in the vocabulary, producing one raw score each. Those scores are not probabilities — softmax is what turns them into a decision.",
    difficulty: "Intermediate",
    keywords: "logits unembedding softmax temperature probability distribution exp vocabulary weight tying greedy",

    render: function (ctx) {
      var icons = ctx.icons;
      var M = ctx.mm;
      var C = ctx.demo.NEXT_CANDIDATES;
      var L = ctx.demo.TRAINED_LOGITS;

      return (
        '<h2 id="unembed">From a vector to a score for every word</h2>'
        + '<p data-narrate="' +
        ctx.attr("Every layer has finished. The residual stream now holds one final vector for the last position in the sequence. That vector has to become a prediction about what comes next. The operation that does this is the unembedding, which is simply another matrix multiplication against a matrix with one row per token in the vocabulary. The result is one number per token, and those numbers are called logits.") +
        '">Every layer has finished. The residual stream holds one final vector for the last position. That vector must become a prediction. The operation is the <strong>unembedding</strong> — another matrix multiplication, this time against a matrix with one row per vocabulary token. The result is one number per token: a <strong>logit</strong>.</p>'

        + '<div class="formula"><span class="v">logits</span><span class="op">=</span>'
        + '<span class="v">h</span><sub><span class="v">final</span></sub> · <span class="v">E</span><sup>⊤</sup>'
        + '<span class="op" style="margin:0 16px">→</span>'
        + '<span class="v">logits</span> ∈ ℝ<sup><span class="v">vocab</span></sup></div>'

        + '<div class="callout note" data-narrate="' +
        ctx.attr("A neat detail that saves a lot of parameters. Most models do not have a separate unembedding matrix at all. They reuse the embedding matrix from chapter two, transposed, so the same numbers that turn a token into a vector also turn a vector back into a token score. This is called weight tying, and it works because the geometry should be consistent in both directions: if cat is near dog going in, it should also be near dog coming out.") +
        '"><div class="co-label">' + icons.info + " Weight tying</div>"
        + "<p>Most models do not have a separate unembedding matrix. They reuse the embedding matrix from chapter 2, transposed. The same numbers that turn a token into a vector also turn a vector back into a token score — the geometry is consistent in both directions.</p></div>"

        + '<h2 id="notprob">Why logits are not probabilities</h2>'
        + '<p data-narrate="' +
        ctx.attr("A logit is a real number on an unbounded scale. It can be ten, it can be minus three, it can be fourteen point two. It is not a probability and it has no upper bound. What matters is the relative size of the logits, not their absolute values. Adding one to every logit changes nothing about the resulting distribution, because the comparison is what counts.") +
        '">A logit is a real number on an unbounded scale. It can be <span class="mono">10</span>, <span class="mono">−3</span>, <span class="mono">14.2</span>. It is not a probability and has no upper bound. What matters is the <strong>relative</strong> size of the logits — adding 1 to every logit changes nothing.</p>'

        + '<h2 id="softmax">Softmax: turning scores into a decision</h2>'
        + '<p data-narrate="' +
        ctx.attr("Softmax does three useful things. It exponentiates each logit, which makes everything positive and exaggerates differences. It divides by the total so the results sum to one. And because exponentiation is relative, it is invariant to adding a constant to all inputs, so the zero point is arbitrary. The result is a genuine probability distribution over the whole vocabulary.") +
        '">Softmax does three things: <strong>exponentiate</strong> each logit (making everything positive and exaggerating differences), <strong>divide by the total</strong> so the results sum to 1, and stay invariant to adding a constant to all inputs.</p>'

        + '<div class="formula"><span class="v">p</span><sub><span class="v">i</span></sub>'
        + '<span class="op">=</span>'
        + '<span class="frac"><span class="num">exp(<span class="v">z</span><sub><span class="v">i</span></sub>)</span>'
        + '<span class="den"><span class="sum"><span class="sig">Σ</span><span class="lim"><span>j</span><span>j</span></span></span> exp(<span class="v">z</span><sub><span class="v">j</span></sub>)</span></span></div>'

        + '<h2 id="try">Try it: logits → probabilities, by hand</h2>'
        + '<p data-narrate="' +
        ctx.attr("Here is a realistic next token distribution for the prompt the cat sat on the. These logits are illustrative rather than computed from our random toy model, which would produce nonsense until it is trained. The arithmetic below is real and you can check every number. Watch how much of the probability mass is concentrated in the top two candidates. That concentration is typical.") +
        '">Here is a realistic next-token distribution for <em>“The cat sat on the”</em>. These logits are illustrative — the random toy model would produce nonsense until trained (more in chapter 12). <strong>The arithmetic below is real.</strong> Note how much mass concentrates in the top two candidates.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Softmax calculator</span><span class="ix-hint">' + C.length + " candidate tokens</span></div>"
        + '<div class="ix-body">'
        + '<div class="ctl"><div class="field" style="flex:1"><label>Temperature <b id="smT">1.00</b></label>'
        + '<input type="range" id="smTemp" min="0.1" max="2.5" step="0.05" value="1"></div></div>'
        + '<div class="attn-grid two"><div><div class="viz-title">Logits in</div><div id="smLogits"></div></div>'
        + '<div><div class="viz-title">exp(logit) and the total</div><div id="smExp"></div></div></div>'
        + '<div class="viz"><div class="viz-title">Probabilities out</div><div id="smProbs"></div>'
        + '<div class="stat-row" style="margin-top:13px" id="smStats"></div></div>'
        + "</div></div>"

        + '<h2 id="properties">What softmax promises and what it does not</h2>'
        + '<div class="grid-2" style="margin:1.2em 0">'
        + '<div class="card"><div class="card-title" style="color:var(--accent-5)">It guarantees</div><ul class="tight-list">'
        + "<li>Every output is strictly positive.</li>"
        + "<li>The outputs sum to exactly 1.</li>"
        + "<li>Ranking is preserved: the largest logit gives the largest probability.</li>"
        + "<li>Order doesn’t matter — it’s permutation-equivariant.</li>"
        + "</ul></div>"
        + '<div class="card"><div class="card-title" style="color:#f87171">It does not guarantee</div><ul class="tight-list">'
        + "<li>That the top probability is large. A model can be genuinely unsure.</li>"
        + "<li>That the probabilities are calibrated. They routinely are not.</li>"
        + "<li>That a token with tiny probability is wrong. It may be the best answer.</li>"
        + "<li>That the distribution is unimodal — long tails are normal.</li>"
        + "</ul></div>"
        + "</div>"

        + '<div class="callout warn"><div class="co-label">' + icons.warn + " The computational shortcut you will actually see</div>"
        + "<p>Because <span class=\"mono\">exp(z)</span> overflows for large <span class=\"mono\">z</span>, real implementations subtract the maximum logit first: <span class=\"mono\">softmax(z) = softmax(z − max(z))</span>. The result is mathematically identical and numerically safe. Every production framework does this.</p></div>"

        + '<h2 id="meaning">So the model “thinks” about one token at a time</h2>'
        + '<p data-narrate="' +
        ctx.attr("This is the moment to appreciate how narrow the output really is. After all of that computation, all those layers and attention heads, what comes out is a list of probabilities over tokens. Nothing more. There is no representation of the sentence as a whole, no plan, no goal. Whatever the model appears to be doing emerges from this one narrow interface being iterated many times.") +
        '">This is the moment to appreciate how narrow the interface really is. After all that computation, what comes out is a list of probabilities over tokens. Nothing more. There is no plan and no goal in the output — whatever the model appears to do emerges from this narrow interface being <strong>iterated</strong>.</p>'

        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>The final vector is multiplied by the (usually tied) unembedding matrix to give one <strong>logit</strong> per vocabulary token.</li>"
        + "<li>Logits are unbounded scores; only their relative size matters.</li>"
        + "<li><strong>Softmax</strong> exponentiates and normalises them into a distribution.</li>"
        + "<li>It is numerically stabilised by subtracting the max logit.</li>"
        + "<li>The model's entire output is this distribution — one decision, over and over.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var M = ctx.mm;
      var C = ctx.demo.NEXT_CANDIDATES;
      var L = ctx.demo.TRAINED_LOGITS.slice();
      var temp = 1;

      function render() {
        var z = L.map(function (v) { return v / temp; });
        var mx = Math.max.apply(null, z);
        var ex = z.map(function (v) { return Math.exp(v - mx); });
        var sum = ex.reduce(function (a, b) { return a + b; }, 0);
        var p = ex.map(function (v) { return v / sum; });

        ctx.q("#smLogits", root).innerHTML = ctx.matrix.block({
          name: "z",
          rows: [L],
          colHeads: C.map(function (c) { return c.trim(); }),
          desc: "raw logits · 1 × " + C.length,
          dec: 2, heat: true, scheme: "diverging", maxAbs: 9, cls: "narrow"
        });

        var exDisplay = ex.map(function (v) { return v / Math.max.apply(null, ex); });
        ctx.q("#smExp", root).innerHTML = ctx.matrix.block({
          name: "exp(z)",
          rows: [exDisplay],
          colHeads: C.map(function (c) { return c.trim(); }),
          desc: "normalised to max = 1 for display · sum = " + sum.toFixed(2),
          dec: 2, heat: true, scheme: "seq", maxAbs: 1, cls: "narrow"
        });

        var order = p.map(function (v, i) { return { i: i, p: v }; }).sort(function (a, b) { return b.p - a.p; });
        ctx.chart.probBars(ctx.q("#smProbs", root), order.map(function (o) {
          return { label: C[o.i], p: o.p, pick: o.i === order[0].i };
        }));

        var H = M.entropy(p);
        var top = order[0].p;
        ctx.q("#smStats", root).innerHTML =
          '<div class="stat"><div class="sv">' + (top * 100).toFixed(1) + '%</div><div class="sk">top token</div></div>'
          + '<div class="stat"><div class="sv">' + C[order[0].i].trim() + '</div><div class="sk">most likely</div></div>'
          + '<div class="stat"><div class="sv">' + H.toFixed(3) + '</div><div class="sk">entropy (nats)</div></div>'
          + '<div class="stat"><div class="sv">' + Math.exp(H).toFixed(2) + '</div><div class="sk">effective choices</div></div>'
          + '<div class="stat"><div class="sv">' + (sum).toFixed(1) + '</div><div class="sk">Σ exp(z)</div></div>';
      }

      var s = ctx.q("#smTemp", root);
      s.addEventListener("input", function () {
        temp = Number(this.value);
        ctx.q("#smT", root).textContent = temp.toFixed(2);
        render();
      });
      render();
    }
  });
})();
