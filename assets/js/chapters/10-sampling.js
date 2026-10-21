/* ==========================================================================
   10-sampling.js — choosing one token out of a distribution
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  LLM.registerChapter({
    id: "sampling",
    part: "output",
    title: "Sampling: choosing the next token",
    kicker: "Chapter 10",
    summary: "The model hands you a distribution. Something still has to pick a token. Greedy, temperature, top-k and top-p are four different answers to that question — and they are the whole reason the same prompt gives different answers.",
    difficulty: "Intermediate",
    keywords: "sampling temperature top-k top-p nucleus greedy beam repetition penalty seed randomness determinism",

    render: function (ctx) {
      var icons = ctx.icons;

      return (
        '<h2 id="choose">A distribution is not a decision</h2>'
        + '<p data-narrate="' +
        ctx.attr("The model has produced a probability for every token in its vocabulary. Something outside the model now has to turn that into a single token. This step is called decoding or sampling, and it is entirely under your control rather than the model's. Two people running the exact same model with the exact same prompt and different sampling settings get genuinely different text, and that is not a bug.") +
        '">The model has produced a probability for every token in its vocabulary. Something <em>outside</em> the model must turn that into a single token. This step is called <strong>decoding</strong> or <strong>sampling</strong>, and it is under your control, not the model\'s.</p>'

        + '<div class="callout insight" data-narrate="' +
        ctx.attr("This is worth sitting with. The weights are fixed and deterministic. The computation is deterministic. All the randomness in a language model lives in this tiny final step, where a coin is flipped against a probability distribution.") +
        '"><div class="co-label">' + icons.bulb + " All the randomness lives here</div>"
        + "<p>The weights are fixed. The computation is deterministic. <strong>All</strong> the randomness in a language model lives in this final step, where a coin is flipped against a probability distribution.</p></div>"

        + '<h2 id="methods">Four ways to pick</h2>'
        + '<table class="cmp"><thead><tr><th style="width:20%">Method</th><th>What it does</th><th style="width:26%">When you want it</th></tr></thead><tbody>'
        + "<tr><td><strong>Greedy</strong></td><td>Always take the single most likely token. Fully deterministic, no randomness at all.</td><td>Code, extraction, classification, anything where you want one clear answer.</td></tr>"
        + "<tr><td><strong>Temperature</strong></td><td>Divide the logits by <span class=\"mono\">T</span> before softmax. Below 1 sharpens, above 1 flattens. Still samples every token, just with a different spread.</td><td>Dialling creativity up or down while keeping the tail available.</td></tr>"
        + "<tr><td><strong>Top-k</strong></td><td>Keep the <span class=\"mono\">k</span> most likely tokens, discard the rest, renormalise.</td><td>A hard cap on how weird the output can get.</td></tr>"
        + "<tr><td><strong>Top-p</strong> (nucleus)</td><td>Keep the smallest set of tokens whose probabilities add up to <span class=\"mono\">p</span>, discard the rest.</td><td>The usual default. Adapts to the model's confidence: few choices when sure, more when unsure.</td></tr>"
        + "</tbody></table>"

        + '<h2 id="try">Try it: sample it yourself</h2>'
        + '<p data-narrate="' +
        ctx.attr("Below is the same next token distribution from the previous chapter. Use the controls to change how a token is picked, then press sample. Press it repeatedly and watch the histogram fill in. With greedy decoding you will get the same token every time. With high temperature you will see the unlikely candidates start to appear, which is exactly the mechanism behind creative but occasionally wrong output.") +
        '">Same distribution as the previous chapter. Change how a token is picked, then press <em>sample</em>. Press it repeatedly and watch the histogram fill in. Greedy always gives the same token; high temperature starts surfacing the unlikely candidates.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Sampling playground</span><span class="ix-hint">draw from the distribution</span></div>'
        + '<div class="ix-body">'
        + '<div class="switch-row">'
        + '<div class="seg" id="sampMode">'
        + '<button data-m="greedy">Greedy</button>'
        + '<button data-m="temp" class="on">Temperature</button>'
        + '<button data-m="topk">Top-k</button>'
        + '<button data-m="topp">Top-p</button>'
        + "</div></div>"
        + '<div class="ctl">'
        + '<div class="field" style="flex:1;min-width:150px"><label>Temperature T <b id="sampT">0.90</b></label>'
        + '<input type="range" id="sampTemp" min="0.1" max="2" step="0.05" value="0.9"></div>'
        + '<div class="field" style="flex:1;min-width:150px"><label>top-k <b id="sampK">5</b></label>'
        + '<input type="range" id="sampTopK" min="1" max="8" step="1" value="5"></div>'
        + '<div class="field" style="flex:1;min-width:150px"><label>top-p <b id="sampP">0.90</b></label>'
        + '<input type="range" id="sampTopP" min="0.1" max="1" step="0.01" value="0.9"></div>'
        + "</div>"
        + '<div class="sample-out" id="sampleOut"><span class="tiny faint">Press “Sample a token” to draw from the distribution above.</span></div>'
        + '<div class="ctl"><button class="btn btn-primary btn-sm" id="sampleBtn">Sample a token</button>'
        + '<button class="btn btn-ghost btn-sm" id="sampleMany">Sample ×200</button>'
        + '<button class="btn btn-ghost btn-sm" id="sampleReset">Reset</button></div>'
        + '<div class="viz"><div class="viz-title">Current distribution after your settings</div><div id="sampDist"></div></div>'
        + '<div class="viz"><div class="viz-title">Histogram of draws</div><div id="sampHist"></div></div>'
        + "</div>"
        + '<div class="ix-foot"><span id="sampNote">Temperature keeps the whole vocabulary alive; top-k and top-p cut the tail off entirely.</span></div>'
        + "</div>"

        + '<h2 id="temperature">What temperature really does</h2>'
        + '<p data-narrate="' +
        ctx.attr("Temperature is a single division applied before the softmax. Dividing logits by a number less than one makes the differences between them larger, so the softmax becomes more peaked. Dividing by a number greater than one shrinks the differences, so the distribution flattens toward uniform. At exactly zero, all the mass goes to the single largest logit, which is greedy decoding. Temperature never changes the ranking of tokens, only how much probability the lower ones keep.") +
        '">Temperature is a <strong>single division</strong> applied before the softmax. Dividing by <span class="mono">T &lt; 1</span> enlarges the differences and sharpens the distribution; <span class="mono">T &gt; 1</span> shrinks them and flattens it. At <span class="mono">T = 0</span> all mass goes to the top logit — that is greedy. Temperature never changes the <em>ranking</em>, only how much probability the losers keep.</p>'

        + '<div class="formula"><span class="v">p</span><sub><span class="v">i</span></sub><span class="op">=</span>'
        + '<span class="frac"><span class="num">exp(<span class="v">z</span><sub><span class="v">i</span></sub> / <span class="v">T</span>)</span>'
        + '<span class="den">Σ<sub><span class="v">j</span></sub> exp(<span class="v">z</span><sub><span class="v">j</span></sub> / <span class="v">T</span>)</span></span></div>'

        + '<div class="grid-3" style="margin:1.2em 0">'
        + '<div class="card"><div class="card-title" style="color:var(--accent-2)">T = 0.2</div><p class="tiny muted">Near-deterministic. Good for factual answers, terrible for anything needing variety. Tends to loop.</p></div>'
        + '<div class="card"><div class="card-title" style="color:var(--accent-5)">T = 0.7 – 1.0</div><p class="tiny muted">The usual working range. Keeps some variety without inviting nonsense.</p></div>'
        + '<div class="card"><div class="card-title" style="color:#f87171">T = 1.5+</div><p class="tiny muted">The tail dominates. Output becomes incoherent surprisingly fast — the model is picking words the data barely supported.</p></div>'
        + "</div>"

        + '<h2 id="topp">Why top-p usually beats top-k</h2>'
        + '<p data-narrate="' +
        ctx.attr("Top k has a subtle flaw. The right number of candidates depends on how confident the model is. When the model is certain, keeping forty candidates includes a lot of nonsense. When the model is genuinely unsure, forty might not be enough. Top p fixes this by expressing the cutoff as a budget of probability instead of a count. Keep adding the most likely tokens until you have covered p percent of the mass. When the model is confident that set is tiny. When it is unsure that set grows automatically. That adaptivity is why nucleus sampling became the default.") +
        '">Top-k has a flaw: the right number of candidates depends on how confident the model is. <strong>Top-p</strong> expresses the cutoff as a <em>budget of probability</em> instead: keep the smallest set of tokens covering <span class="mono">p</span> of the mass. Confident model → tiny set. Unsure model → set grows automatically. That adaptivity is why nucleus sampling became the default.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Top-k vs top-p, same distribution</span></div>'
        + '<div class="ix-body">'
        + '<div class="ctl"><div class="field" style="flex:1"><label>top-k <b id="cmpK">4</b></label><input type="range" id="cmpKs" min="1" max="8" step="1" value="4"></div>'
        + '<div class="field" style="flex:1"><label>top-p <b id="cmpP">0.90</b></label><input type="range" id="cmpPs" min="0.1" max="1" step="0.01" value="0.9"></div></div>'
        + '<div class="stat-row" id="cmpStats"></div>'
        + '<div class="tiny faint">Set top-p low and top-k high and watch which one actually trims the tail. They are not the same knob.</div>'
        + "</div></div>"

        + '<h2 id="more">Three more knobs worth knowing</h2>'
        + '<div class="grid-2">'
        + '<div class="card"><div class="card-title">Repetition penalty</div><p class="tiny muted">Down-weights any token that has already appeared recently, by dividing its logit (or subtracting a constant). Stops degenerate loops. Overdo it and the model starts avoiding necessary words like “the”.</p></div>'
        + '<div class="card"><div class="card-title">Min-p / typical sampling</div><p class="tiny muted">Newer variants. Min-p keeps tokens above a fraction of the <em>top</em> probability, so the cutoff tracks confidence even more directly. Typical sampling keeps tokens whose surprisal is close to the distribution’s entropy.</p></div>'
        + '<div class="card"><div class="card-title">Beam search</div><p class="tiny muted">Keep <span class="mono">k</span> partial sequences alive and pick the highest total log-probability at the end. Great for translation and constrained tasks. Produces bland, repetitive prose for open-ended writing.</p></div>'
        + '<div class="card"><div class="card-title">Seeds and determinism</div><p class="tiny muted">Randomness comes from a seeded PRNG. Fix the seed and the same prompt gives the same output. Batch size and hardware can still perturb results at the level of floating-point rounding.</p></div>'
        + "</div>"

        + '<div class="callout myth"><div class="co-label">' + icons.myth + " Myth: temperature 0 is perfectly reproducible</div>"
        + "<p>Almost. Greedy decoding is deterministic <em>given identical numbers</em>, but floating-point addition is not associative, and GPU kernels reduce sums in whatever order is fastest. Two different batch sizes can produce different results at <span class=\"mono\">T = 0</span>. It is rare, and it is real.</p></div>"

        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>Sampling happens outside the model's weights; it is where all randomness lives.</li>"
        + "<li><strong>Temperature</strong> rescales the distribution without changing the ranking.</li>"
        + "<li><strong>Top-k</strong> keeps a fixed count; <strong>top-p</strong> keeps a fixed probability mass.</li>"
        + "<li>Top-p adapts to confidence, which is why it is the usual default.</li>"
        + "<li>Every setting is a trade-off between variety and reliability.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var M = ctx.mm;
      var C = ctx.demo.NEXT_CANDIDATES;
      var L = ctx.demo.TRAINED_LOGITS.slice();
      var mode = "temp";
      var counts = {};
      var totalDraws = 0;
      var lastPick = -1;
      var rng = M.rng(20261021);

      function dist() {
        var T = Number(ctx.q("#sampTemp", root).value);
        var k = Number(ctx.q("#sampTopK", root).value);
        var p = Number(ctx.q("#sampTopP", root).value);
        var z = L.slice();
        var probs;
        if (mode === "greedy") {
          probs = L.map(function (v, i) { return i === M.argmax(L) ? 1 : 0; });
        } else {
          var zt = z.map(function (v) { return v / T; });
          probs = M.softmax(zt);
          if (mode === "topk") probs = M.softmax(M.topKMask(zt, k));
          if (mode === "topp") probs = norm(M.topPMask(probs, p));
        }
        return probs;
      }

      function norm(p) {
        var s = p.reduce(function (a, b) { return a + b; }, 0) || 1;
        return p.map(function (v) { return v / s; });
      }

      function render() {
        var p = dist();
        ctx.q("#sampT", root).textContent = Number(ctx.q("#sampTemp", root).value).toFixed(2);
        ctx.q("#sampK", root).textContent = ctx.q("#sampTopK", root).value;
        ctx.q("#sampP", root).textContent = Number(ctx.q("#sampTopP", root).value).toFixed(2);

        var order = p.map(function (v, i) { return { i: i, p: v }; }).sort(function (a, b) { return b.p - a.p; });
        ctx.chart.probBars(ctx.q("#sampDist", root), order.map(function (o) {
          return { label: C[o.i], p: o.p, pick: o.i === lastPick, zero: o.p === 0 };
        }));

        var kept = p.filter(function (v) { return v > 0; }).length;
        var H = M.entropy(p.filter(function (v) { return v > 0; }));
        ctx.q("#sampNote", root).textContent =
          "mode: " + mode + " · " + kept + " of " + C.length + " tokens kept · entropy " + H.toFixed(3) + " nats · effective choices " + Math.exp(H).toFixed(2);
      }

      function draw() {
        var p = dist();
        var idx = M.sampleFrom(p, rng);
        lastPick = idx;
        totalDraws++;
        counts[idx] = (counts[idx] || 0) + 1;
        ctx.q("#sampleOut", root).innerHTML =
          '<span class="sample-tok">' + ctx.esc(C[idx].trim()) + "</span>"
          + '<span class="tiny faint">drawn with probability ' + (p[idx] * 100).toFixed(2) + "%</span>";
        renderHist();
        render();
      }

      function renderHist() {
        var maxC = 1;
        for (var k in counts) if (counts[k] > maxC) maxC = counts[k];
        var html = C.map(function (c, i) {
          var n = counts[i] || 0;
          var cls = "prob-row" + (i === lastPick ? " pick" : "") + (n === 0 ? " zero" : "");
          return '<div class="' + cls + '">'
            + '<div class="pname">' + ctx.esc(c) + "</div>"
            + '<div class="ptrack"><div class="pfill" style="width:' + ((n / maxC) * 100).toFixed(1) + '%"></div></div>'
            + '<div class="pval">' + n + "</div></div>";
        }).join("");
        ctx.q("#sampHist", root).innerHTML =
          '<div class="prob-list">' + html + "</div>"
          + '<div class="tiny faint" style="margin-top:8px">' + totalDraws + " draws total</div>";
      }

      ctx.qa("#sampMode button", root).forEach(function (b) {
        b.addEventListener("click", function () {
          mode = b.getAttribute("data-m");
          ctx.qa("#sampMode button", root).forEach(function (x) { x.classList.toggle("on", x === b); });
          render();
        });
      });
      ["#sampTemp", "#sampTopK", "#sampTopP"].forEach(function (sel) {
        ctx.q(sel, root).addEventListener("input", render);
      });
      ctx.q("#sampleBtn", root).addEventListener("click", draw);
      ctx.q("#sampleMany", root).addEventListener("click", function () {
        for (var i = 0; i < 200; i++) {
          var p = dist();
          var idx = M.sampleFrom(p, rng);
          counts[idx] = (counts[idx] || 0) + 1;
          totalDraws++;
        }
        renderHist();
        render();
      });
      ctx.q("#sampleReset", root).addEventListener("click", function () {
        counts = {};
        totalDraws = 0;
        lastPick = -1;
        ctx.q("#sampleOut", root).innerHTML = '<span class="tiny faint">Press “Sample a token” to draw from the distribution above.</span>';
        renderHist();
        render();
      });

      render();
      renderHist();

      /* ---- top-k vs top-p comparison ---- */
      var base = M.softmax(L);
      function cmp() {
        var k = Number(ctx.q("#cmpKs", root).value);
        var p = Number(ctx.q("#cmpPs", root).value);
        ctx.q("#cmpK", root).textContent = k;
        ctx.q("#cmpP", root).textContent = p.toFixed(2);
        var byK = M.topKMask(L, k);
        var keptK = byK.filter(function (v) { return v > -Infinity; }).length;
        var byP = M.topPMask(base, p);
        var keptP = byP.filter(function (v) { return v > 0; }).length;
        var sorted = base.slice().sort(function (a, b) { return b - a; });
        var massK = sorted.slice(0, keptK).reduce(function (a, b) { return a + b; }, 0);
        var massP = byP.reduce(function (a, b) { return a + b; }, 0);
        ctx.q("#cmpStats", root).innerHTML =
          '<div class="stat"><div class="sv">' + keptK + '</div><div class="sk">tokens kept by top-k</div></div>'
          + '<div class="stat"><div class="sv">' + (massK * 100).toFixed(1) + '%</div><div class="sk">probability mass kept</div></div>'
          + '<div class="stat"><div class="sv">' + keptP + '</div><div class="sk">tokens kept by top-p</div></div>'
          + '<div class="stat"><div class="sv">' + (massP * 100).toFixed(1) + '%</div><div class="sk">probability mass kept</div></div>';
      }
      ctx.q("#cmpKs", root).addEventListener("input", cmp);
      ctx.q("#cmpPs", root).addEventListener("input", cmp);
      cmp();
    }
  });
})();
