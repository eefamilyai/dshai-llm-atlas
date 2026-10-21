/* ==========================================================================
   12-training.js — loss, backpropagation, gradient descent
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  LLM.registerChapter({
    id: "training",
    part: "learning",
    title: "Training: how the numbers get good",
    kicker: "Chapter 12",
    summary: "Everything so far was arithmetic on randomly-initialised weights, which is why the outputs were nonsense. This chapter is how those weights become the model you actually talk to — one gradient at a time.",
    difficulty: "Advanced",
    keywords: "training loss cross-entropy backpropagation gradient descent learning rate adam batch epoch overfitting chinchilla scaling",

    render: function (ctx) {
      var icons = ctx.icons;

      return (
        '<h2 id="task">The training task is embarrassingly simple</h2>'
        + '<p data-narrate="' +
        ctx.attr("Here is the whole of pre-training, stated plainly. Take a huge amount of text. Cut it into tokens. Feed the model a chunk of tokens and ask it to predict the next one. Compare its prediction against the token that actually came next. Adjust the weights slightly so the model would have been a little less wrong. Move one token forward and do it again. Trillions of times. That is the entire process. Everything else in this chapter is detail about how the adjustment is computed efficiently.") +
        '">State it plainly: take a huge amount of text. Cut it into tokens. Feed the model a chunk and ask it to predict the next token. Compare with what actually came next. Adjust the weights slightly so it would have been less wrong. Slide forward one token and repeat — <strong>trillions of times</strong>. That is the entire process.</p>'

        + '<div class="callout insight" data-narrate="' +
        ctx.attr("There is no explicit supervision for grammar, no labels for facts, no curriculum. The only signal is whether the next token was predicted well. And yet to predict the next token well across all of human writing you end up having to learn syntax, semantics, arithmetic, style, and a great deal of world knowledge. The task is simple, the consequences of doing it well are not.") +
        '"><div class="co-label">' + icons.bulb + " Why such a simple task works</div>"
        + "<p>There are no labels for grammar, no annotations for facts, no curriculum. The only signal is whether the next token was predicted well. To do that across all of human writing, you end up having to learn syntax, semantics, arithmetic, style and a great deal of world knowledge.</p></div>"

        + '<h2 id="loss">Measuring wrongness: cross-entropy loss</h2>'
        + '<p data-narrate="' +
        ctx.attr("The model outputs a probability for every token. The correct token has some probability p. The loss is minus the logarithm of p. If the model gave the right answer probability one, the loss is zero. If it gave it probability a half, the loss is about nought point six nine. If it gave it probability one in a hundred, the loss is four point six. The logarithm is what makes the penalty severe for confident mistakes and mild for hesitant ones.") +
        '">The model outputs a probability for every token; the correct token has some probability <span class="mono">p</span>. The loss is <span class="mono">−log p</span>. Right answer with probability 1 → loss 0. Probability ½ → 0.69. Probability 1/100 → <strong>4.6</strong>. The logarithm makes confident mistakes expensive and hesitant ones cheap.</p>'

        + '<div class="formula"><span class="v">L</span><span class="op">=</span><span class="op">−</span>log(<span class="v">p</span><sub><span class="v">correct</span></sub>)</div>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Cross-entropy loss</span><span class="ix-hint">how wrong is a wrong answer?</span></div>'
        + '<div class="ix-body">'
        + '<div class="ctl"><div class="field" style="flex:1"><label>probability assigned to the correct token <b id="ceP">0.70</b></label>'
        + '<input type="range" id="ceS" min="0.001" max="1" step="0.001" value="0.7"></div>'
        + '<div class="stat" style="flex:none;min-width:140px"><div class="sv" id="ceL">0.357</div><div class="sk">loss (nats)</div></div></div>'
        + '<div class="plot-wrap"><canvas id="ceCv" data-autodraw="1"></canvas></div>'
        + '<div class="tiny faint">Note the shape: flattening out at the right (model is right, cheap) and rising steeply at the left (model is confidently wrong, expensive). A model that assigns 0.01 to the true token pays 100× more than one that assigns 1.0.</div>'
        + "</div></div>"

        + '<p data-narrate="' +
        ctx.attr("In practice you average this over every token in a batch. That average is the single number you watch during training, and the shape of its curve over time tells you almost everything about whether the run is healthy. It should fall quickly at first, then slowly, and eventually flatten into a long tail of diminishing returns.") +
        '">In practice you average this over every token in a batch. That average is <strong>the</strong> number to watch during training, and its curve tells you almost everything about whether the run is healthy.</p>'

        + '<h2 id="backprop">Backpropagation, without the calculus</h2>'
        + '<p data-narrate="' +
        ctx.attr("Now you know how wrong the model was. The hard question is which of its billions of parameters to blame and in which direction to nudge them. Backpropagation answers that by running the computation backwards. Remember that the forward pass is a chain of simple operations. You know how much each output contributed to the loss. Backpropagation applies the chain rule in reverse to work out how sensitive the loss is to every intermediate value, and then to every weight. One backward pass gives you the gradient for all of them at once.") +
        '">Now you know how wrong the model was. The hard question: <em>which of the billions of parameters to blame, and in which direction?</em> Backpropagation answers it by running the computation backwards. The forward pass is a chain of simple operations; you know how much each output contributed to the loss; the chain rule in reverse gives the sensitivity of the loss to every intermediate value, then to every weight — <strong>all at once, in one backward pass</strong>.</p>'

        + '<div class="backprop-viz">'
        + '<div class="bp-row"><span class="bp-tag">forward</span>'
        + '<span class="bp-node">x</span><span class="bp-a">→</span>'
        + '<span class="bp-node">W₁</span><span class="bp-a">→</span>'
        + '<span class="bp-node">GELU</span><span class="bp-a">→</span>'
        + '<span class="bp-node">W₂</span><span class="bp-a">→</span>'
        + '<span class="bp-node">softmax</span><span class="bp-a">→</span>'
        + '<span class="bp-node bp-end">loss</span></div>'
        + '<div class="bp-row bp-back"><span class="bp-tag">backward</span>'
        + '<span class="bp-node2">∂L/∂x</span><span class="bp-a">←</span>'
        + '<span class="bp-node2">∂L/∂W₁</span><span class="bp-a">←</span>'
        + '<span class="bp-node2">∂L/∂act</span><span class="bp-a">←</span>'
        + '<span class="bp-node2">∂L/∂W₂</span><span class="bp-a">←</span>'
        + '<span class="bp-node2">∂L/∂logits</span><span class="bp-a">←</span>'
        + '<span class="bp-node2">1</span></div>'
        + "</div>"
        + '<div class="tiny faint">The backward pass costs roughly the same as the forward pass. Training therefore costs about 3× inference per token (forward + backward + the optimiser update).</div>'

        + '<h2 id="descent">Try it: descend the loss surface</h2>'
        + '<p data-narrate="' +
        ctx.attr("Gradient descent is the simplest part of the whole story. Your parameters are a point somewhere on a loss surface. The gradient tells you which direction is uphill. So step in the opposite direction. The size of the step is the learning rate, and it is one of the few genuinely delicate settings in all of deep learning. Too small and training takes forever. Too large and you overshoot the valley entirely and the loss explodes.") +
        '">Gradient descent is the simplest part of the story. Your parameters are a point on a loss surface. The gradient points uphill, so step the other way. The step size is the <strong>learning rate</strong> — one of the few genuinely delicate settings in deep learning.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Gradient descent</span><span class="ix-hint">L(w) = (w₁−2)² + 3(w₂+1)²</span></div>'
        + '<div class="ix-body">'
        + '<div class="train-panel">'
        + '<div><div class="viz-title">Loss surface <span class="sub">contours; dot = current weights</span></div>'
        + '<div class="plot-wrap"><canvas id="gdContour"></canvas></div></div>'
        + '<div><div class="viz-title">Loss over steps</div>'
        + '<div class="plot-wrap"><canvas id="gdLoss"></canvas></div>'
        + '<div class="viz-title" style="margin-top:12px">Weights</div>'
        + '<div class="stat-row"><div class="stat"><div class="sv" id="gdW1">—</div><div class="sk">w₁</div></div>'
        + '<div class="stat"><div class="sv" id="gdW2">—</div><div class="sk">w₂</div></div>'
        + '<div class="stat"><div class="sv loss-big" id="gdL">—</div><div class="sk">loss</div></div></div></div>'
        + "</div>"
        + '<div class="ctl">'
        + '<div class="field" style="flex:1;min-width:170px"><label>learning rate <b id="gdLrVal">0.10</b></label>'
        + '<input type="range" id="gdLr" min="0.01" max="0.55" step="0.01" value="0.1"></div>'
        + '<button class="btn btn-primary btn-sm" id="gdStep">Step</button>'
        + '<button class="btn btn-ghost btn-sm" id="gdRun">Run</button>'
        + '<button class="btn btn-ghost btn-sm" id="gdReset">Reset</button></div>'
        + '<div class="tiny faint">Try a learning rate above 0.3 and watch the point bounce out of the valley. That failure mode is real and it is why learning rates are tuned so carefully.</div>'
        + "</div></div>"

        + '<h2 id="adam">Adam: the optimiser everyone actually uses</h2>'
        + '<p data-narrate="' +
        ctx.attr("Plain gradient descent is rarely used directly. Almost every modern model is trained with Adam or a variant of it. Adam keeps two running averages per parameter: a smoothed version of the gradient, and a smoothed version of the squared gradient. Dividing the first by the square root of the second gives every parameter its own effective learning rate. A parameter whose gradients are consistently tiny gets a larger effective step, and one whose gradients swing wildly gets a smaller one. It makes training far less sensitive to the initial learning rate.") +
        '">Plain gradient descent is rarely used directly. Almost every modern model uses <strong>Adam</strong> or a variant: it keeps two running averages per parameter — a smoothed gradient, and a smoothed <em>squared</em> gradient. Dividing the first by the root of the second gives every parameter its own effective learning rate.</p>'

        + '<div class="grid-2">'
        + '<div class="card"><div class="card-title">Batch size</div><p class="tiny muted">The gradient from one example is extremely noisy. Averaging over a batch of, say, 512 sequences gives a direction that is far more reliable. Larger batches are more compute-efficient but generalise slightly worse.</p></div>'
        + '<div class="card"><div class="card-title">Learning-rate schedule</div><p class="tiny muted">Almost every run uses warmup then decay — start tiny, ramp up, then slowly reduce. Warmup exists because Adam’s variance estimates are meaningless in the first few hundred steps.</p></div>'
        + '<div class="card"><div class="card-title">Gradient clipping</div><p class="tiny muted">If the gradient norm exceeds a threshold, rescale it. One pathological batch can otherwise destroy a run in a single step.</p></div>'
        + '<div class="card"><div class="card-title">Mixed precision</div><p class="tiny muted">Do the matrix multiplies in 16-bit and keep a 32-bit copy of the weights. Twice the speed, roughly half the memory, same quality.</p></div>'
        + "</div>"

        + '<h2 id="scale">How much training is enough?</h2>'
        + '<p data-narrate="' +
        ctx.attr("There is a well-known empirical result here and it changed how models are built. For a fixed amount of computing power, the loss falls predictably as a power law in both parameter count and data volume. Early models were badly under-trained: huge models fed far too little text. The finding that became known as Chinchilla suggested roughly twenty tokens of training data per parameter is the efficient point. That is why modern small models trained on enormous corpora often beat older large models.") +
        '">For a fixed compute budget, loss falls as a <strong>power law</strong> in both parameters and data. Early models were badly undertrained — huge models fed far too little text. The <strong>Chinchilla</strong> finding suggested roughly <strong>20 tokens per parameter</strong> is the efficient point, which is why modern small models on enormous corpora beat older large ones.</p>'

        + '<table class="cmp"><thead><tr><th>Model</th><th>Parameters</th><th>Training tokens</th><th>Tokens / param</th></tr></thead><tbody>'
        + "<tr><td>GPT-2</td><td>1.5 B</td><td>≈ 40 B</td><td>≈ 27</td></tr>"
        + "<tr><td>GPT-3</td><td>175 B</td><td>≈ 300 B</td><td>≈ 1.7</td></tr>"
        + "<tr><td>Chinchilla</td><td>70 B</td><td>≈ 1.4 T</td><td>≈ 20</td></tr>"
        + "<tr><td>Llama 3 8B</td><td>8 B</td><td>≈ 15 T</td><td>≈ 1875</td></tr>"
        + "</tbody></table>"

        + '<div class="callout note"><div class="co-label">' + icons.info + " The inference cost flips the trade-off</div>"
        + "<p>Chinchilla optimised training compute. If a model will serve billions of requests, you care about <em>inference</em> cost, so it is rational to train a smaller model well past the Chinchilla-optimal point. That is exactly what Llama 3 8B did — nearly 2,000 tokens per parameter.</p></div>"

        + '<h2 id="overfit">Overfitting, and what it means here</h2>'
        + '<p data-narrate="' +
        ctx.attr("Overfitting is when a model memorises its training data instead of learning patterns from it. For large language models this shows up as memorised passages and slightly worse held-out loss. It is a real concern for privacy as well as quality, because memorised training data can be elicited. It is also why the largest models are trained on data so vast that no single document is seen more than a handful of times.") +
        '">Overfitting is memorising training data instead of learning patterns. For LLMs it shows up as memorised passages and slightly worse held-out loss — a <strong>privacy</strong> concern as well as a quality one, since memorised data can be elicited.</p>'

        + '<div class="callout insight"><div class="co-label">' + icons.bulb + " Why chapter 4 produced nonsense</div>"
        + "<p>Every matrix you saw was randomly initialised. The arithmetic was exactly right and the meaning was exactly zero. Training is the process that turns <em>correct geometry</em> into <em>correct numbers</em>. The architecture is the shape of the container; the training run is what fills it.</p></div>"

        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>Pre-training is next-token prediction over trillions of tokens.</li>"
        + "<li><strong>Cross-entropy</strong> <span class=\"mono\">−log p</span> measures how much probability the model gave the right answer.</li>"
        + "<li><strong>Backpropagation</strong> computes the gradient of the loss with respect to every weight in one backward pass.</li>"
        + "<li><strong>Learning rate</strong> is the step size; too high diverges, too low crawls.</li>"
        + "<li>Roughly <strong>20 tokens per parameter</strong> is the compute-optimal ratio; serving cost pushes models past it.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var M = ctx.mm;

      /* ---- cross entropy ---- */
      var ceS = ctx.q("#ceS", root);
      var ceCv = ctx.q("#ceCv", root);
      function drawCE() {
        var p = Number(ceS.value);
        var L = -Math.log(p);
        ctx.q("#ceP", root).textContent = p.toFixed(3);
        ctx.q("#ceL", root).textContent = L.toFixed(3);
        var pts = [];
        for (var t = 0.005; t <= 1.0001; t += 0.005) pts.push([t, -Math.log(t)]);
        ctx.chart.line(ceCv, {
          series: [{ data: pts, color: "#f5a524", width: 2.4, fill: true }],
          height: 200,
          xLabel: "probability given to the correct token",
          yLabel: "loss (nats)",
          yDomain: [0, 5.5],
          xTicks: [0, 0.25, 0.5, 0.75, 1],
          guide: { x: p, y: L, dot: true },
          labels: [{ x: p, y: L, text: L.toFixed(2), dx: 8, dy: -10, color: "#f5a524" }]
        });
      }
      ceS.addEventListener("input", drawCE);
      drawCE();
      ceCv.addEventListener("redraw", drawCE);

      /* ---- gradient descent ---- */
      var GOAL = [2, -1];
      var start = [-2.4, 2.6];
      var w = start.slice();
      var path = [w.slice()];
      var losses = [];
      function lossOf(v) {
        var a = v[0] - GOAL[0], b = v[1] - GOAL[1];
        return a * a + 3 * b * b;
      }
      function gradOf(v) {
        return [2 * (v[0] - GOAL[0]), 6 * (v[1] - GOAL[1])];
      }

      var contour = ctx.q("#gdContour", root);
      var lossCv = ctx.q("#gdLoss", root);
      var lrS = ctx.q("#gdLr", root);
      var running = false;

      function drawContour() {
        var S = ctx.chart.setup(contour, 260);
        var c = S.ctx, W = S.W, H = S.H;
        var T = ctx.chart.themeColors();
        var xr = [-4, 4], yr = [-4, 4];
        var px = function (x) { return 20 + ((x - xr[0]) / (xr[1] - xr[0])) * (W - 40); };
        var py = function (y) { return H - 20 - ((y - yr[0]) / (yr[1] - yr[0])) * (H - 40); };

        // contour ellipses: a² + 3b² = L  →  a = √L, b = √(L/3)
        var levels = [0.5, 2, 5, 10, 18, 28, 42, 60];
        levels.forEach(function (L, i) {
          var rx = Math.sqrt(L), ry = Math.sqrt(L / 3);
          c.beginPath();
          c.ellipse(px(GOAL[0]), py(GOAL[1]),
            Math.abs(px(GOAL[0] + rx) - px(GOAL[0])),
            Math.abs(py(GOAL[1] + ry) - py(GOAL[1])),
            0, 0, Math.PI * 2);
          c.strokeStyle = "rgba(139,123,255," + (0.46 - i * 0.042).toFixed(2) + ")";
          c.lineWidth = 1;
          c.stroke();
        });

        // minimum marker
        c.beginPath();
        c.arc(px(GOAL[0]), py(GOAL[1]), 4, 0, Math.PI * 2);
        c.fillStyle = "rgba(52,211,153,.9)";
        c.fill();
        c.fillStyle = T.faint;
        c.font = "9.5px 'JetBrains Mono', ui-monospace, monospace";
        c.textAlign = "left";
        c.fillText("minimum", px(GOAL[0]) + 7, py(GOAL[1]) + 3);

        // travelled path
        if (path.length > 1) {
          c.beginPath();
          path.forEach(function (p, i) {
            var X = px(p[0]), Y = py(p[1]);
            if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
          });
          c.strokeStyle = "rgba(34,211,238,.55)";
          c.lineWidth = 1.4;
          c.stroke();
          path.forEach(function (p, i) {
            if (i === path.length - 1) return;
            c.beginPath();
            c.arc(px(p[0]), py(p[1]), 1.7, 0, Math.PI * 2);
            c.fillStyle = "rgba(34,211,238,.45)";
            c.fill();
          });
        }

        // current weights — always visible
        var cx = px(w[0]), cy = py(w[1]);
        c.beginPath();
        c.arc(cx, cy, 11, 0, Math.PI * 2);
        c.fillStyle = "rgba(34,211,238,.16)";
        c.fill();
        c.beginPath();
        c.arc(cx, cy, 5.5, 0, Math.PI * 2);
        c.fillStyle = "#22d3ee";
        c.fill();
        c.strokeStyle = "#fff";
        c.lineWidth = 1.8;
        c.stroke();
        c.fillStyle = "#9beefc";
        c.font = "600 10px 'JetBrains Mono', ui-monospace, monospace";
        c.textAlign = "left";
        c.fillText("w", cx + 9, cy - 8);
      }

      function drawLoss() {
        if (losses.length < 2) {
          var S = ctx.chart.setup(lossCv, 200);
          var c2 = S.ctx, T2 = ctx.chart.themeColors();
          c2.fillStyle = T2.faint;
          c2.font = "11.5px 'Inter', system-ui, sans-serif";
          c2.textAlign = "center";
          c2.fillText("press Step or Run to start training", S.W / 2, S.H / 2);
          return;
        }
        var pts = losses.map(function (L, i) { return [i, Math.min(L, 80)]; });
        ctx.chart.line(lossCv, {
          series: [{ data: pts, color: "#8b7bff", width: 2, fill: true }],
          height: 200,
          xLabel: "step",
          yLabel: "loss",
          yDomain: [0, Math.min(80, Math.max.apply(null, pts.map(function (p) { return p[1]; })) * 1.15 + 0.5)]
        });
      }

      function refresh() {
        var L = lossOf(w);
        ctx.q("#gdW1", root).textContent = w[0].toFixed(3);
        ctx.q("#gdW2", root).textContent = w[1].toFixed(3);
        var el = ctx.q("#gdL", root);
        el.textContent = L.toFixed(4);
        el.className = "sv loss-big " + (L > 20 ? "bad" : L < 0.05 ? "good" : "");
        drawContour();
        drawLoss();
      }

      function step() {
        var g = gradOf(w);
        var lr = Number(lrS.value);
        w = [w[0] - lr * g[0], w[1] - lr * g[1]];
        if (!isFinite(w[0]) || Math.abs(w[0]) > 1e4) w = [w[0] * 0.5, w[1] * 0.5];
        path.push(w.slice());
        if (path.length > 120) path.shift();
        losses.push(lossOf(w));
        refresh();
      }

      lrS.addEventListener("input", function () {
        ctx.q("#gdLrVal", root).textContent = Number(this.value).toFixed(2);
      });
      ctx.q("#gdStep", root).addEventListener("click", step);
      ctx.q("#gdReset", root).addEventListener("click", function () {
        w = start.slice();
        path = [w.slice()];
        losses = [];
        refresh();
      });
      ctx.q("#gdRun", root).addEventListener("click", function (e) {
        if (running) return;
        running = true;
        e.target.disabled = true;
        var n = 0;
        var tick = setInterval(function () {
          step();
          if (++n >= 40) {
            clearInterval(tick);
            running = false;
            e.target.disabled = false;
          }
        }, 55);
      });
      refresh();
      contour.addEventListener("redraw", refresh);
      lossCv.addEventListener("redraw", drawLoss);
    }
  });
})();
