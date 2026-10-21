/* ==========================================================================
   11-generation.js — the autoregressive loop and the KV cache
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  var SCRIPT = [" mat", " and", " the", " dog", " sat", " down", " next", " to", " it", "."];
  var START = ["The", " cat", " sat", " on", " the"];

  LLM.registerChapter({
    id: "generation",
    part: "output",
    title: "The generation loop & KV cache",
    kicker: "Chapter 11",
    summary: "A language model generates one token and then throws away almost all of its work — unless you cache it. This chapter is about the loop that produces text and the piece of engineering that makes it affordable.",
    difficulty: "Intermediate",
    keywords: "autoregressive generation loop kv cache prefill decode inference latency memory bandwidth context",

    render: function (ctx) {
      var icons = ctx.icons;

      return (
        '<h2 id="loop">The loop</h2>'
        + '<p data-narrate="' +
        ctx.attr("Everything up to now has been one forward pass, producing one distribution, for one next token. To produce a paragraph you simply do it again. Append the chosen token to the input, run the whole model again, get a new distribution for the token after that, and repeat. This is what autoregressive means: each output becomes part of the next input. Nothing in the model changes. The same weights are used for every single token.") +
        '">Everything so far has been <strong>one forward pass → one distribution → one next token</strong>. To produce a paragraph you do it again: append the chosen token, run the model again, get the next distribution, repeat. That is what <em>autoregressive</em> means — each output becomes part of the next input.</p>'

        + '<figure class="fig"><div class="fig-frame">'
        + '<div class="viz-title">The autoregressive loop</div>'
        + '<div class="loop-viz">'
        + '<div class="lv-step"><span class="lv-n">1</span><div class="lv-body"><b>Tokenize</b><small>the prompt becomes a list of ids</small></div></div>'
        + '<div class="lv-step"><span class="lv-n">2</span><div class="lv-body"><b>Forward pass</b><small>embeddings → N blocks → final hidden state</small></div></div>'
        + '<div class="lv-step"><span class="lv-n">3</span><div class="lv-body"><b>Unembed + softmax</b><small>one probability per vocabulary token</small></div></div>'
        + '<div class="lv-step"><span class="lv-n">4</span><div class="lv-body"><b>Sample</b><small>pick exactly one token</small></div></div>'
        + '<div class="lv-step lv-loop"><span class="lv-n">5</span><div class="lv-body"><b>Append and go to 2</b><small>the chosen token joins the context</small></div></div>'
        + "</div>"
        + '<div class="figcap"><b>Figure 11.1</b> — The loop never terminates on its own. Generation stops at a special end-of-sequence token, at a stop string, or when a token budget runs out.</div>'
        + "</div></figure>"

        + '<div class="callout warn" data-narrate="' +
        ctx.attr("Now the obvious problem. Every trip around that loop reruns the entire model on the entire sequence. If you have generated five hundred tokens and you want the five hundred and first, you would throw away all the computation from the previous five hundred steps and start again from scratch. That is catastrophically wasteful, and it is exactly what the KV cache fixes.") +
        '"><div class="co-label">' + icons.warn + " The obvious problem</div>"
        + "<p>Every trip around the loop re-runs the model on the whole sequence. To generate token 501 you would throw away all the work from the previous 500 steps. That is <strong>catastrophically wasteful</strong> — and it is exactly what the KV cache fixes.</p></div>"

        + '<h2 id="kv">The KV cache: the single best optimisations in inference</h2>'
        + '<p data-narrate="' +
        ctx.attr("Here is the key observation, and it is genuinely the key. Look at the causal mask from chapter four. Token five is only ever allowed to attend to tokens one through five. It never sees token six. Which means the key and value vectors computed for token one during the first forward pass are exactly the same as the key and value vectors you would compute for token one in the second forward pass and every forward pass after that. They do not depend on anything that comes later.") +
        '">Here is the key observation. Look back at the causal mask: token 5 can only attend to tokens 1–5, never 6. So the <strong>key and value vectors for token 1 are identical in every forward pass</strong>. They depend on nothing that comes after them.</p>'

        + '<p data-narrate="' +
        ctx.attr("So do not recompute them. Store them. On the first pass, cache the key and value for every token. On each subsequent pass, compute queries keys and values only for the brand new token, then attend that single new query against the entire cache of old keys and values. The attention work per step drops from proportional to the square of the sequence length down to proportional to the sequence length itself. Two passes now cost roughly half of what they cost before, and across a long generation the saving is enormous.") +
        '">So don\'t recompute them — <strong>store</strong> them. Cache K and V for every token. Each new step computes Q/K/V only for the new token, then attends that one query against the whole cache. Attention work per step drops from <span class="mono">O(n²)</span> to <span class="mono">O(n)</span>.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Generate token by token</span><span class="ix-hint">watch the cache grow</span></div>'
        + '<div class="ix-body">'
        + '<div class="gen-stream" id="genText"></div>'
        + '<div class="stat-row" id="genStats"></div>'
        + '<div class="viz"><div class="viz-title">Attention-score computations required this step</div>'
        + '<div class="bar-compare" id="genCompare"></div></div>'
        + '<div class="viz"><div class="viz-title">Cumulative attention-score computations</div>'
        + '<div class="plot-wrap"><canvas id="genChart"></canvas></div></div>'
        + '<div class="ctl"><button class="btn btn-primary btn-sm" id="genBtn">Generate next token</button>'
        + '<button class="btn btn-ghost btn-sm" id="genReset">Reset</button></div>'
        + "</div>"
        + '<div class="ix-foot"><span>The continuation shown is a scripted one. Our randomly-initialised toy model would produce nonsense — which is precisely the point of chapter 12.</span></div>'
        + "</div>"

        + '<h2 id="phases">Two phases: prefill and decode</h2>'
        + '<p data-narrate="' +
        ctx.attr("Inference splits into two phases with very different performance characteristics. Prefill is the first pass, where the entire prompt is processed at once. It is one big matrix multiplication, the graphics card is fully occupied, and it is fast per token. Decode is everything after that, one token at a time, and here the graphics card is mostly idle waiting on memory. That is why the first token of a response often appears after a noticeable delay while the rest stream out quickly, and it is why prompt processing and output generation are usually priced differently.") +
        '">Inference splits into two phases with very different performance. <strong>Prefill</strong> processes the whole prompt at once — one big matrix multiply, GPU fully occupied, fast per token. <strong>Decode</strong> is one token at a time, and the GPU is mostly idle waiting on memory. That is why the first token lags while the rest stream out quickly.</p>'

        + '<table class="cmp"><thead><tr><th>Phase</th><th>What it does</th><th>Bottleneck</th><th>Perceived as</th></tr></thead><tbody>'
        + "<tr><td><strong>Prefill</strong></td><td>Forward pass over the whole prompt in parallel; fills the KV cache.</td><td>Compute-bound — big dense matrices</td><td>The pause before the first token (TTFT)</td></tr>"
        + "<tr><td><strong>Decode</strong></td><td>One forward pass per generated token; reads the whole cache each time.</td><td>Memory-bandwidth bound — weights and cache must be streamed</td><td>Tokens per second while streaming</td></tr>"
        + "</tbody></table>"

        + '<h2 id="memory">The cost moves from compute to memory</h2>'
        + '<p data-narrate="' +
        ctx.attr("The cache is not free, and its cost is the interesting part. For a Llama scale model with eighty layers, thirty two heads, head dimension one hundred and twenty eight and a context of eight thousand tokens, the cache is several gigabytes. That is often larger than the model weights themselves. It also means the bottleneck during generation is not arithmetic, it is the memory bandwidth needed to read the cache over and over for every token.") +
        '">The cache is not free, and its cost is the interesting part. For a Llama-scale model (80 layers, 32 heads, head_dim 128, 8k context) the cache is <strong>several gigabytes</strong> — often larger than the weights. Generation becomes bottlenecked on <em>memory bandwidth</em>, not arithmetic.</p>'

        + '<div class="viz"><div class="viz-title">KV cache size — 80 layers, 32 heads, d_head 128, fp16, 8k context</div>'
        + '<div class="kv-list">'
        + '<div class="kv"><span>Per token (K + V)</span><b>≈ 1.31 MB</b></div>'
        + '<div class="kv"><span>8,192 tokens</span><b>≈ 10.7 GB</b></div>'
        + '<div class="kv"><span>Weights (70B params, fp16)</span><b>≈ 140 GB</b></div>'
        + '<div class="kv"><span>What it means</span><b>batch size × context is capped by VRAM</b></div>'
        + "</div></div>"

        + '<div class="callout insight"><div class="co-label">' + icons.bulb + " Everything downstream follows from this</div>"
        + "<p>Once you know the cache is the constraint, the whole modern inference stack makes sense: <strong>grouped-query attention</strong> shrinks the cache, <strong>paged attention</strong> stops it fragmenting, <strong>quantised KV</strong> halves it, <strong>sliding-window attention</strong> caps it, and <strong>prefix caching</strong> reuses it across requests that share a prompt.</p></div>"

        + '<h2 id="stopping">How generation stops</h2>'
        + '<p data-narrate="' +
        ctx.attr("Nothing in the mathematics stops the loop. A list of stops is negotiated outside the model entirely: a special end of sequence token that the model was trained to emit when an answer is finished, a set of stop strings configured by the API, or simply a maximum token budget. When you see a model cut off mid-sentence, it usually hit the budget rather than the end token.") +
        '">Nothing in the mathematics stops the loop. The stop condition is negotiated <em>outside</em> the model: a special <strong>end-of-sequence token</strong> the model was trained to emit, a set of configured <strong>stop strings</strong>, or a <strong>maximum token budget</strong>. A model cut off mid-sentence usually hit the budget.</p>'

        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>Generation is a loop: forward pass → sample → append → repeat.</li>"
        + "<li>The causal mask means past K/V never change, so they can be <strong>cached</strong>.</li>"
        + "<li>The cache turns per-step attention from <span class=\"mono\">O(n²)</span> into <span class=\"mono\">O(n)</span>.</li>"
        + "<li><strong>Prefill</strong> is compute-bound; <strong>decode</strong> is memory-bandwidth-bound.</li>"
        + "<li>Cache memory, not arithmetic, is the main scaling constraint in serving.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var tokens = START.slice();
      var generated = 0;

      function render() {
        var stream = tokens
          .map(function (t, i) {
            return '<span class="' + (i >= START.length ? "hl-cyan" : "") + '">' + ctx.esc(t) + "</span>";
          })
          .join("");
        ctx.q("#genText", root).innerHTML = stream + '<span class="cur"></span>';

        var n = tokens.length;
        var naive = n * n;
        var cached = n;
        ctx.q("#genStats", root).innerHTML =
          '<div class="stat"><div class="sv">' + n + '</div><div class="sk">tokens in context</div></div>'
          + '<div class="stat"><div class="sv">' + generated + '</div><div class="sk">generated</div></div>'
          + '<div class="stat"><div class="sv">' + n + '</div><div class="sk">cache entries (K+V)</div></div>'
          + '<div class="stat"><div class="sv">' + (naive / cached).toFixed(0) + '×</div><div class="sk">work saved this step</div></div>';

        var maxv = naive;
        ctx.q("#genCompare", root).innerHTML =
          '<div class="bc-row"><span class="bc-lab">Recompute whole sequence</span>'
          + '<div class="bc-track"><span class="bc-fill attn" style="width:100%"></span></div>'
          + '<span class="bc-val">' + naive + " scores</span></div>"
          + '<div class="bc-row"><span class="bc-lab">With KV cache</span>'
          + '<div class="bc-track"><span class="bc-fill ffn" style="width:' + ((cached / maxv) * 100).toFixed(1) + '%"></span></div>'
          + '<span class="bc-val">' + cached + " scores</span></div>";

        drawChart();
      }

      function drawChart() {
        var cv = ctx.q("#genChart", root);
        var naivePts = [], cachePts = [];
        var nMax = START.length + SCRIPT.length;
        var cumN = 0, cumC = 0;
        for (var n = START.length; n <= nMax; n++) {
          cumN += n * n;
          cumC += n;
          naivePts.push([n, cumN]);
          cachePts.push([n, cumC]);
        }
        ctx.chart.line(cv, {
          series: [
            { data: naivePts, color: "#f5a524", width: 2.2, fill: true },
            { data: cachePts, color: "#22d3ee", width: 2.2 }
          ],
          height: 200,
          xLabel: "tokens in context",
          yLabel: "cumulative scores",
          xTicks: [START.length, 10, 15],
          guide: tokens.length <= nMax ? { x: tokens.length, y: tokens.length * tokens.length } : null
        });
      }

      ctx.q("#genBtn", root).addEventListener("click", function () {
        if (generated >= SCRIPT.length) return;
        tokens.push(SCRIPT[generated]);
        generated++;
        render();
      });
      ctx.q("#genReset", root).addEventListener("click", function () {
        tokens = START.slice();
        generated = 0;
        render();
      });
      render();
      ctx.q("#genChart", root).addEventListener("redraw", drawChart);
    }
  });
})();
