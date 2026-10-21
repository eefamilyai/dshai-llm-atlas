/* ==========================================================================
   07-norm.js — residual connections and layer normalisation
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  LLM.registerChapter({
    id: "norm",
    part: "transformer",
    title: "Residuals & normalisation",
    kicker: "Chapter 07",
    summary: "Two boring-looking pieces of plumbing that are the difference between a model that trains and one that does not. One is a shortcut that carries information untouched; the other keeps the numbers in a healthy range.",
    difficulty: "Intermediate",
    keywords: "residual connection shortcut skip layer norm layernorm rmsnorm pre-norm post-norm variance mean gamma beta",

    render: function (ctx) {
      var icons = ctx.icons;
      var run = ctx.demo.model1.run(ctx.demo.SENTENCE);
      var toks = ctx.demo.SENTENCE.map(function (t) { return t.replace(/^ /, ""); });

      return (
        '<h2 id="residual">The residual stream: a shared bus</h2>'
        + '<p data-narrate="' +
        ctx.attr("Both sub-layers in a transformer block are wrapped in a residual connection. Instead of replacing the token vector with the output of the sub-layer, you add the output to the vector you started with. This sounds like a trivial detail and it is one of the two most important design decisions in the whole architecture. The running vector becomes a shared bus, and each layer writes a delta onto it rather than overwriting it.") +
        '">Both sub-layers are wrapped in a <strong>residual connection</strong>. Instead of replacing the token vector, the sub-layer output is <em>added</em> to the vector you started with. This sounds trivial and is one of the most important decisions in the architecture.</p>'

        + '<div class="formula"><span class="v">x</span><span class="op">=</span><span class="v">x</span>'
        + '<span class="op">+</span><span class="v">f</span>(<span class="v">x</span>)</div>'

        + '<figure class="fig"><div class="fig-frame">'
        + '<div class="viz-title">The residual stream</div>'
        + '<div class="resid-viz">'
        + '<div class="rv-bus"></div>'
        + '<div class="rv-nodes">'
        + '<div class="rv-node">embed</div>'
        + '<div class="rv-op">+</div>'
        + '<div class="rv-node">block 1</div>'
        + '<div class="rv-op">+</div>'
        + '<div class="rv-node">block 2</div>'
        + '<div class="rv-op">+</div>'
        + '<div class="rv-node">…</div>'
        + '<div class="rv-op">+</div>'
        + '<div class="rv-node">block N</div>'
        + "</div>"
        + "</div>"
        + '<div class="figcap"><b>Figure 7.1</b> — Nothing is ever overwritten. Every layer reads the whole stream and adds its contribution back. Layer 40 can still access exactly what the embedding layer wrote at position 0, which is why information survives deep stacks.</div>'
        + "</div></figure>"

        + '<p data-narrate="' +
        ctx.attr("Residual connections solve two problems at once. The first is the vanishing gradient. In a very deep network without shortcuts, the gradient has to travel backwards through every single operation, and it shrinks multiplicatively at each step until there is nothing left. With a shortcut, the gradient has a path backwards that involves no multiplication at all, so it arrives intact. The second problem is preserving identity. Even a badly behaved layer cannot destroy information, it can only fail to add anything useful.") +
        '">Residuals solve two problems at once. <strong>Vanishing gradients</strong>: the backward gradient had to pass through every operation and shrank multiplicatively at each step — a shortcut gives it a multiplication-free path back. <strong>Identity preservation</strong>: a badly behaved layer cannot destroy information, it can only fail to add anything useful.</p>'

        + '<div class="callout note"><div class="co-label">' + icons.info + " Architecture archaeology</div>"
        + "<p>ResNet introduced this idea for image recognition in 2015 and it is why networks could suddenly go from 20 layers to 150. The Transformer inherited it with no changes. If you removed residual connections, a 96-layer GPT would not train at all.</p></div>"

        + '<h2 id="ln">Layer normalisation: keeping numbers sane</h2>'
        + '<p data-narrate="' +
        ctx.attr("The second piece of plumbing is layer normalisation. It takes a single token vector, subtracts its mean, divides by its standard deviation, and then rescales and shifts using two learned parameters. After that operation the vector always has mean zero and standard deviation one, before the learned rescaling. This matters because the residual stream accumulates contributions from many layers, and a few large values would otherwise dominate everything downstream.") +
        '">Layer normalisation takes a single token vector, subtracts its mean, divides by its standard deviation, then rescales and shifts with two learned parameters. After it, the vector always has mean 0 and standard deviation 1 — before the learned rescaling.</p>'

        + '<div class="formula" style="flex-direction:column;gap:8px">'
        + '<div><span class="v">LN</span>(<span class="v">x</span>)<span class="op">=</span>'
        + '<span class="v">γ</span> ⊙ <span class="frac"><span class="num"><span class="v">x</span> − <span class="v">μ</span></span>'
        + '<span class="den">√(<span class="v">σ</span><sup>2</sup> + <span class="v">ε</span>)</span></span>'
        + "<span class=\"op\">+</span><span class=\"v\">β</span></div>"
        + '<div class="faint" style="font-size:12.5px">μ and σ are computed <em>across the features of one token</em>, not across the batch</div>'
        + "</div>"

        + '<p data-narrate="' +
        ctx.attr("Notice something that confuses almost everyone at first. Layer normalisation normalises across the features of a single token, not across the batch. Batch normalisation, which you may have met in image models, uses statistics gathered across all the examples in a batch. Layer norm does not, which is why it works perfectly with a batch size of one and why inference does not need running averages. Every token is normalised on its own.") +
        '">Notice something that confuses almost everyone at first: layer norm normalises <strong>across the features of a single token</strong>, not across the batch. That is why it works with a batch size of 1 and why inference needs no running averages.</p>'

        + '<h2 id="try">Try it: what normalisation actually does</h2>'
        + '<p data-narrate="' +
        ctx.attr("Here is a real vector from our toy model with eight components. Drag the slider to add a large outlier to component three and watch what layer normalisation does. The mean shifts, the standard deviation grows, and every single component gets rescaled, not just the one you touched. The outlier is not clipped away, it is compressed back into a sensible range along with everything else.") +
        '">Here is a real vector from the toy model. Drag the slider to push an outlier into one component and watch layer norm rescale <em>every</em> component — not just the one you touched.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Layer normalisation, live</span><span class="ix-hint">one token, 8 features</span></div>'
        + '<div class="ix-body">'
        + '<div class="ctl"><div class="field" style="flex:1"><label>Outlier injected into dimension 3 <b id="lnOut">+0.00</b></label>'
        + '<input type="range" id="lnS" min="-4" max="8" step="0.1" value="0"></div></div>'
        + '<div class="stat-row" id="lnStats"></div>'
        + '<div class="attn-grid two">'
        + '<div><div class="viz-title">Before normalisation</div><div id="lnBefore"></div>'
        + '<div class="plot-wrap" style="margin-top:10px"><canvas id="lnBarA" data-autodraw="1"></canvas></div></div>'
        + '<div><div class="viz-title">After normalisation</div><div id="lnAfter"></div>'
        + '<div class="plot-wrap" style="margin-top:10px"><canvas id="lnBarB" data-autodraw="1"></canvas></div></div>'
        + "</div></div></div>"

        + '<h2 id="prenorm">Pre-norm vs post-norm</h2>'
        + '<p data-narrate="' +
        ctx.attr("The original transformer applied normalisation after each sub-layer. Almost every modern model applies it before instead, so the sub-layer sees a normalised input and its output is added raw to the residual stream. Why the switch? Because pre-norm puts no obstacle in the gradient path along the residual stream. Training is far more stable, especially for very deep models, and you can often train without the careful warmup schedule the original paper needed.") +
        '">The original Transformer normalised <em>after</em> each sub-layer. Almost every modern model normalises <strong>before</strong>. Why? Because pre-norm leaves the residual path completely unobstructed for gradients, so training is far more stable at depth.</p>'

        + '<div class="pre-post">'
        + '<div class="pp-card"><div class="pp-title">Post-norm <span class="tiny faint">(original 2017)</span></div>'
        + '<div class="pp-flow"><div class="pp-n">x</div><div class="pp-a">→</div><div class="pp-n">sublayer</div><div class="pp-a">→</div><div class="pp-n hl">LN</div><div class="pp-a">→</div><div class="pp-n">x′</div></div>'
        + '<div class="tiny faint" style="margin-top:9px">Normalisation sits <em>inside</em> the residual loop, so the gradient path is not clean.</div></div>'
        + '<div class="pp-card"><div class="pp-title">Pre-norm <span class="tiny faint">(modern default)</span></div>'
        + '<div class="pp-flow"><div class="pp-n">x</div><div class="pp-a">→</div><div class="pp-n hl">LN</div><div class="pp-a">→</div><div class="pp-n">sublayer</div><div class="pp-a">→</div><div class="pp-n">+ x</div></div>'
        + '<div class="tiny faint" style="margin-top:9px">The residual path has no operation on it at all — gradients flow straight through.</div></div>'
        + "</div>"

        + '<h2 id="rms">RMSNorm, the modern simplification</h2>'
        + '<p data-narrate="' +
        ctx.attr("Many recent models, including the Llama family, use a stripped down version called RMS norm. It skips the mean subtraction entirely and only divides by the root mean square of the vector. It also usually drops the additive parameter. The justification is that centring the mean turned out not to matter much in practice, so why pay for it. It is slightly cheaper and works just as well, and that is the entire reason it exists.") +
        '">Recent models (including the Llama family) use a stripped-down version: <strong>RMSNorm</strong>. It skips mean subtraction and only divides by the root mean square, usually dropping the additive parameter too. Centring the mean turned out not to matter much — so it is cheaper and works just as well.</p>'

        + '<div class="formula"><span class="v">RMSNorm</span>(<span class="v">x</span>)<span class="op">=</span>'
        + '<span class="frac"><span class="num"><span class="v">x</span></span>'
        + '<span class="den">√(<span class="frac"><span class="num">1</span><span class="den"><span class="v">d</span></span></span>'
        + '<span class="sum"><span>Σ</span></span><span class="v">x</span><sub><span class="v">i</span></sub><sup>2</sup>)</span></span>'
        + '<span class="op">⊙</span><span class="v">γ</span></div>'

        + '<h2 id="result">What the numbers look like on a real token</h2>'
        + '<p data-narrate="' +
        ctx.attr("Here is one row of the toy model taken straight out of the residual stream after attention was added. You can see that after normalisation the mean is essentially zero and the standard deviation is essentially one, which is exactly what the formula promises.") +
        '">One row of the toy model, straight out of the residual stream after attention. After normalisation the mean is essentially zero and the standard deviation essentially one — exactly what the formula promises.</p>'

        + '<div class="mat-flow">'
        + ctx.matrix.block({ name: "x (post-attention residual)", rows: [run.x2[5]], desc: "1 × 8", dec: 3, heat: true, scheme: "diverging" })
        + '<div class="mat-arrow">LN→</div>'
        + ctx.matrix.block({ name: "LN(x)", rows: [run.ln[5]], desc: "1 × 8", dec: 3, heat: true, scheme: "diverging" })
        + "</div>"

        + '<div class="stat-row" style="margin-top:12px">'
        + '<div class="stat"><div class="sv">' + ctx.mm.mean(run.x2[5]).toFixed(3) + '</div><div class="sk">mean before</div></div>'
        + '<div class="stat"><div class="sv">' + ctx.mm.std(run.x2[5]).toFixed(3) + '</div><div class="sk">std before</div></div>'
        + '<div class="stat"><div class="sv">' + ctx.mm.mean(run.ln[5]).toFixed(3) + '</div><div class="sk">mean after</div></div>'
        + '<div class="stat"><div class="sv">' + ctx.mm.std(run.ln[5]).toFixed(3) + '</div><div class="sk">std after</div></div>'
        + "</div>"

        + '<h2 id="recap">Why both matter</h2>'
        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li><strong>Residual</strong>: <span class=\"mono\">x = x + f(x)</span>. Layers add, never overwrite.</li>"
        + "<li>Residuals give gradients a clean path and make identity the default.</li>"
        + "<li><strong>LayerNorm</strong> normalises across one token's features, not across the batch.</li>"
        + "<li>Modern models use <strong>pre-norm</strong> for stability at depth.</li>"
        + "<li><strong>RMSNorm</strong> drops the mean and is what most new models use.</li>"
        + "</ul>"
        + "<p class=\"tiny faint\" style=\"margin-top:12px\">These two mechanisms are unglamorous, and if you removed either one a large model simply would not train. Most of the transformer's engineering is like this.</p>"
        + "</div>"
      );
    },

    mount: function (root, ctx) {
      var run = ctx.demo.model1.run(ctx.demo.SENTENCE);
      var base = run.x2[5].slice();
      var s = ctx.q("#lnS", root);

      function draw() {
        var delta = Number(s.value);
        ctx.q("#lnOut", root).textContent = (delta >= 0 ? "+" : "") + delta.toFixed(2);
        var v = base.slice();
        v[2] += delta;
        var mu = ctx.mm.mean(v);
        var sd = ctx.mm.std(v);
        var norm = ctx.mm.layerNorm(v);

        ctx.q("#lnStats", root).innerHTML =
          '<div class="stat"><div class="sv">' + mu.toFixed(3) + '</div><div class="sk">mean μ</div></div>'
          + '<div class="stat"><div class="sv">' + sd.toFixed(3) + '</div><div class="sk">std σ</div></div>'
          + '<div class="stat"><div class="sv">' + (Math.max.apply(null, v)).toFixed(2) + '</div><div class="sk">max value</div></div>'
          + '<div class="stat"><div class="sv">' + (Math.max.apply(null, norm)).toFixed(2) + '</div><div class="sk">max after LN</div></div>';

        ctx.q("#lnBefore", root).innerHTML = ctx.matrix.block({
          name: "x", rows: [v], colHeads: ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"],
          dec: 2, heat: true, scheme: "diverging", maxAbs: 3
        });
        ctx.q("#lnAfter", root).innerHTML = ctx.matrix.block({
          name: "LN(x)", rows: [norm], colHeads: ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"],
          dec: 2, heat: true, scheme: "diverging", maxAbs: 3
        });

        drawBars(ctx.q("#lnBarA", root), v);
        drawBars(ctx.q("#lnBarB", root), norm);
      }

      function drawBars(cv, vals) {
        var S = ctx.chart.setup(cv, 120);
        var c = S.ctx, W = S.W, H = S.H;
        var bw = W / vals.length;
        var maxv = Math.max.apply(null, vals.map(Math.abs)) || 1;
        var zero = H / 2;
        vals.forEach(function (v, i) {
          var hgt = (Math.abs(v) / maxv) * (H / 2 - 10);
          var x = i * bw + bw * 0.16, w = bw * 0.68;
          c.fillStyle = v >= 0 ? "rgba(245,165,36,.85)" : "rgba(96,165,250,.85)";
          ctx.matrix.roundRect(c, x, v >= 0 ? zero - hgt : zero, w, hgt, 3);
          c.fill();
        });
        c.strokeStyle = "rgba(255,255,255,.14)";
        c.beginPath(); c.moveTo(0, zero); c.lineTo(W, zero); c.stroke();
      }

      s.addEventListener("input", draw);
      draw();
      ctx.q("#lnBarA", root).addEventListener("redraw", draw);
      ctx.q("#lnBarB", root).addEventListener("redraw", draw);
    }
  });
})();
