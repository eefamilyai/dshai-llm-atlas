/* ==========================================================================
   03-position.js — how the model learns where a token is
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  LLM.registerChapter({
    id: "position",
    part: "foundations",
    title: "Position: where a token sits",
    kicker: "Chapter 03",
    summary: "Attention is order-blind by construction. “The dog bit the man” and “the man bit the dog” would look identical without a positional signal. Here is exactly how that signal is built.",
    difficulty: "Beginner",
    keywords: "positional encoding sinusoidal rope rotary rotation order sequence absolute relative",

    render: function (ctx) {
      var icons = ctx.icons;
      var mm = ctx.mm;

      var pe = ctx.demo.peMatrix(8, 8);
      var peBlock = ctx.matrix.block({
        name: "PE",
        desc: "sinusoidal position encoding, first 8 positions × 8 dimensions",
        rows: pe,
        rowHeads: pe.map(function (_, i) { return "pos " + i; }),
        colHeads: pe[0].map(function (_, i) { return "d" + (i + 1); }),
        dec: 2,
        heat: true,
        scheme: "diverging",
        maxAbs: 1,
        cls: "tight"
      });

      function formula() {
        return (
          '<div class="formula" style="flex-direction:column;gap:10px">'
          + '<div><span class="v">PE</span>(<span class="v">pos</span>, 2<span class="v">i</span>)<span class="op">=</span>sin'
          + '<span style="display:inline-block;text-align:left;margin-left:4px">'
          + '<span class="frac"><span class="num"><span class="v">pos</span></span>'
          + '<span class="den">10000<sup>2<span class="v">i</span>/<span class="v">d</span></sup></span></span>'
          + "</span></div>"
          + '<div><span class="v">PE</span>(<span class="v">pos</span>, 2<span class="v">i</span>+1)<span class="op">=</span>cos'
          + '<span style="display:inline-block;text-align:left;margin-left:4px">'
          + '<span class="frac"><span class="num"><span class="v">pos</span></span>'
          + '<span class="den">10000<sup>2<span class="v">i</span>/<span class="v">d</span></sup></span></span>'
          + "</span></div></div>"
        );
      }

      return (
        '<h2 id="problem">The problem: attention has no clock</h2>'
        + '<p data-narrate="' +
        ctx.attr("Before we can appreciate positional encoding we have to see the hole it fills. Attention works by comparing every token to every other token using dot products. Dot products do not care about order. If you fed it the cat chased the dog and the dog chased the cat, every comparison would be identical, just with rows swapped, and the model would have no way whatsoever to tell the two meanings apart. The set of tokens is the same set either way.") +
        '">Before we can appreciate positional encoding we must see the hole it fills. Attention compares every token to every other token with dot products — and <strong>dot products do not care about order</strong>. Feed it “the cat chased the dog” and “the dog chased the cat”, and every comparison is identical, just with rows swapped. The model could not tell the two meanings apart.</p>'

        + '<div class="callout warn"><div class="co-label">' + icons.warn + " What breaks without it</div>"
        + '<p>Without positional information a transformer is a <strong>bag of tokens</strong>. “Dog bites man” and “man bites dog” become literally the same input. Word order carries most of the grammar of every human language, so this is not a small loss.</p></div>'

        + '<h2 id="idea">The idea: stamp each position with a fingerprint</h2>'
        + '<p data-narrate="' +
        ctx.attr("The fix is to give each position its own unique fingerprint of numbers and add it to the token embedding. Position zero gets one fingerprint, position one gets a different one, and so on. Because the fingerprint is added to the vector rather than replacing it, the token keeps its identity while also acquiring a location stamp.") +
        '">The fix: give each position its own unique <strong>fingerprint</strong> of numbers and <em>add</em> it to the token embedding. Position 0 gets one fingerprint, position 1 a different one, and so on. Because it is added rather than replacing, the token keeps its identity while acquiring a location stamp.</p>'

        + '<div class="formula"><span class="v">x</span><sub><span class="v">pos</span></sub><span class="op">=</span>'
        + '<span class="v">E</span>[<span class="v">token</span>]<span class="op">+</span><span class="v">PE</span>(<span class="v">pos</span>)</div>'

        + '<p data-narrate="' +
        ctx.attr("The original Transformer paper used sines and cosines at geometrically spaced frequencies. Low dimensions oscillate slowly and mark out the broad strokes of position. High dimensions oscillate extremely fast, like the fine second hand of a clock. Together the whole vector is a binary-ish code that is unique for every position, and every dimension stays bounded between minus one and one no matter how long the sequence gets.") +
        '">The original Transformer used sines and cosines at <strong>geometrically spaced frequencies</strong>. Low dimensions oscillate slowly and mark the broad strokes of position; high dimensions oscillate extremely fast, like the fine second hand of a clock. Together they form a code that is unique for every position — and every dimension stays bounded between −1 and 1 no matter how long the sequence gets.</p>'

        + formula()

        + '<figure class="fig"><div class="fig-frame">'
        + '<div class="viz-title">The positional encoding matrix <span class="sub">8 positions × 8 dimensions</span></div>'
        + peBlock
        + '<div class="figcap"><b>Figure 3.1</b> — Each <em>row</em> is the fingerprint for one position; each <em>column</em> is one sine wave at one frequency. Column 1 and 2 share the slowest frequency, column 7 and 8 the fastest. No two rows are the same, which is exactly the point: every position is uniquely identifiable.</div>'
        + "</div></figure>"

        + '<div class="callout note"><div class="co-label">' + icons.info + " A clock you can read in binary</div>"
        + "<p>Think of it as the hands of a clock: the second hand spins fast, the minute hand slowly, the hour hand slower still. Read all three together and you know the exact time. Read any two and you can still work out how much time passed between two readings — which is the property the next section exploits.</p></div>"

        + '<h2 id="explore">Try it: the pattern</h2>'
        + '<p data-narrate="' +
        ctx.attr("Use the slider to change how many positions are shown, then look at the heatmap. The left hand columns change slowly and the right hand columns change fast, and the whole pattern looks like a barcode that never repeats.") +
        '">Change the number of positions and look at the heatmap. Left-hand columns change slowly, right-hand columns change fast — a barcode that never repeats.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Positional encoding field</span><span class="ix-hint" id="peHint">32 positions × 32 dims</span></div>'
        + '<div class="ix-body">'
        + '<div class="ctl"><div class="field" style="flex:1"><label>Positions <b id="peLbl">32</b></label>'
        + '<input type="range" id="peN" min="4" max="48" value="32" step="1"></div></div>'
        + '<div class="viz"><div class="viz-title">Heatmap <span class="sub">rows = position, columns = dimension</span></div>'
        + '<div class="plot-wrap"><canvas id="peHeat"></canvas></div>'
        + '<div class="heat-legend"><span>−1</span><span class="heat-bar"></span><span>+1</span></div></div>'
        + '<div class="attn-grid two"><div><div class="viz-title">The first four sine waves</div>'
        + '<div class="plot-wrap"><canvas id="peWaves"></canvas></div></div>'
        + '<div><div class="viz-title">Similarity of PE(0) with PE(d)</div>'
        + '<div class="plot-wrap"><canvas id="peSim"></canvas></div></div></div>'
        + "</div></div>"

        + '<h2 id="relative">The clever part: distance survives</h2>'
        + '<p data-narrate="' +
        ctx.attr("Here is the reason sines and cosines were chosen instead of just using the index as a number. Because the encoding is built from waves, the dot product between the encoding of position A and position B depends almost entirely on how far apart they are, not on where they are. Position five against position nine looks very similar to position twenty against twenty four. The model can learn to turn that into a sense of relative distance.") +
        '">Here is why sines and cosines were chosen over simply using the index. Because the encoding is built from waves, the dot product between PE(A) and PE(B) depends almost entirely on <strong>how far apart</strong> they are, not where they are. PE(5)·PE(9) ≈ PE(20)·PE(24).</p>'

        + '<p data-narrate="' +
        ctx.attr("This means a model can learn a rule of the form look about three tokens back and have it work at position five and position five hundred equally well. Generalising to longer sequences that were never seen in training becomes possible. That is a very desirable property, and it is why this choice survived.") +
        '">This lets a model learn a rule like “look about three tokens back” and have it work at position 5 and position 500 equally well — the foundation for <strong>generalising to sequences longer than it was trained on</strong>.</p>'

        + '<figure class="fig"><div class="fig-frame">'
        + '<div class="viz-title">Dot product of PE(a) and PE(b) as a function of a − b</div>'
        + '<div class="plot-wrap"><canvas id="peRel" data-autodraw="1"></canvas></div>'
        + '<div class="figcap"><b>Figure 3.2</b> — Each curve is a different starting position. They overlap almost perfectly, which is the visual statement of “only the difference matters”. The oscillation is the different clock frequencies adding up.</div>'
        + "</div></figure>"

        + '<h2 id="rope">What modern models actually do: RoPE</h2>'
        + '<p data-narrate="' +
        ctx.attr("Almost every model built after twenty twenty one uses rotary position embeddings instead of adding anything. Instead of adding a position vector to the token vector, RoPE rotates the query and key vectors by an angle proportional to the token position. When you later take the dot product of a query and a key, the rotation angles subtract, and what comes out depends only on their relative distance. The positions are baked into the geometry of the comparison itself.") +
        '">Almost every model built after 2021 uses <strong>rotary position embeddings</strong> instead of adding anything. Rather than adding a position vector, RoPE <em>rotates</em> the query and key vectors by an angle proportional to position. When a query and key are later dotted, the angles subtract — so the result depends only on their <strong>relative</strong> distance.</p>'

        + '<div class="formula" style="flex-direction:column;gap:8px">'
        + '<div><span class="v">q</span><sub><span class="v">pos</span></sub><span class="op">=</span>'
        + '<span class="v">R</span>(<span class="v">pos</span>·<span class="v">θ</span>) · <span class="v">q</span>'
        + '<span class="op">&nbsp;&nbsp;&nbsp;</span><span class="v">k</span><sub><span class="v">pos</span></sub><span class="op">=</span>'
        + '<span class="v">R</span>(<span class="v">pos</span>·<span class="v">θ</span>) · <span class="v">k</span></div>'
        + '<div class="faint" style="font-size:13px">then&nbsp;&nbsp;'
        + '<span class="v">q</span><sub><span class="v">a</span></sub> · <span class="v">k</span><sub><span class="v">b</span></sub>'
        + '<span class="op">=</span> <span class="v">f</span>(<span class="v">a</span> − <span class="v">b</span>)</div></div>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Rotation, and why the angle difference is what matters</span></div>'
        + '<div class="ix-body">'
        + '<div class="plot-wrap"><canvas id="ropeCv"></canvas></div>'
        + '<div class="ctl"><div class="field" style="flex:1"><label>Position of query a <b id="ropeA">2</b></label>'
        + '<input type="range" id="ropeAs" min="0" max="12" value="2" step="1"></div>'
        + '<div class="field" style="flex:1"><label>Position of key b <b id="ropeB">6</b></label>'
        + '<input type="range" id="ropeBs" min="0" max="12" value="6" step="1"></div></div>'
        + '<div class="stat-row"><div class="stat"><div class="sv" id="ropeDiff">4</div><div class="sk">b − a</div></div>'
        + '<div class="stat"><div class="sv" id="ropeDot">—</div><div class="sk">q · k</div></div>'
        + '<div class="stat"><div class="sv" id="ropeSame">—</div><div class="sk">at another pair</div></div></div>'
        + '<div class="tiny faint">Rotate both vectors by their own position angle, then take the dot product. Move either slider and watch the dot product follow only the <em>difference</em>: shift both positions by the same amount and nothing changes.</div>'
        + "</div></div>"

        + '<div class="callout insight" data-narrate="' +
        ctx.attr("The practical consequence is that position stopped being data the model has to carry around, and became part of how distances are measured. That is a large part of why context windows grew from two thousand tokens to a million in a couple of years.") +
        '"><div class="co-label">' + icons.bulb + " Why it matters</div>"
        + "<p>Position stopped being <em>data</em> the model carries and became part of <em>how distance is measured</em>. That is a big part of why context windows grew from 2,000 tokens to over a million in a few years.</p></div>"

        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>Attention is order-blind; positional information must be injected.</li>"
        + "<li>Classic transformers <strong>add</strong> a sinusoidal fingerprint to the embedding.</li>"
        + "<li>The fingerprints are unique per position and bounded in [−1, 1].</li>"
        + "<li>Dot products of fingerprints depend mostly on <strong>relative</strong> distance.</li>"
        + "<li>Modern models use <strong>RoPE</strong>, rotating q and k by a position-scaled angle.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var mm = ctx.mm;

      /* ---------- heatmap ---------- */
      var heat = ctx.q("#peHeat", root);
      var waves = ctx.q("#peWaves", root);
      var simCv = ctx.q("#peSim", root);
      var nSlider = ctx.q("#peN", root);

      function drawAll() {
        var n = Number(nSlider.value);
        var d = 32;
        ctx.q("#peLbl", root).textContent = n;
        ctx.q("#peHint", root).textContent = n + " positions × " + d + " dims";

        var data = [];
        for (var p = 0; p < n; p++) {
          var row = [];
          for (var i = 0; i < d; i++) row.push(ctx.demo.positional(p, i, d));
          data.push(row);
        }
        ctx.matrix.paintHeat(heat, data, {
          scheme: "diverging",
          maxAbs: 1,
          cellHeight: Math.max(5, Math.min(14, 260 / n)),
          colLabels: pctLabels(d)
        });

        // waves
        var S = ctx.chart.setup(waves, 170);
        var series = [0, 1, 2, 3].map(function (i) {
          var pts = [];
          for (var t = 0; t < n; t++) pts.push([t, ctx.demo.positional(t, i, d)]);
          return { data: pts, color: ["#8b7bff", "#22d3ee", "#f5a524", "#34d399"][i], width: 1.8 };
        });
        ctx.chart.line(waves, {
          series: series,
          height: 170,
          xLabel: "position",
          yDomain: [-1.15, 1.15],
          xTicks: [0, Math.round(n / 2), n - 1],
          yTicks: [-1, 0, 1]
        });

        // similarity decay
        var sims = [];
        var maxD = Math.min(48, Math.max(16, n));
        for (var dd = 0; dd <= maxD; dd++) {
          sims.push([dd, mm.cosine(ctx.demo.peMatrix(dd + 1, d)[0], ctx.demo.peMatrix(dd + 1, d)[dd])]);
        }
        ctx.chart.line(simCv, {
          series: [{ data: sims, color: "#22d3ee", width: 2, fill: true }],
          height: 170,
          xLabel: "distance d",
          yLabel: "cosine",
          yDomain: [-0.4, 1.05],
          xTicks: [0, Math.round(maxD / 2), maxD]
        });
      }

      function pctLabels(d) {
        var out = [];
        for (var i = 0; i < d; i++) out.push(i % 8 === 0 ? "d" + (i + 1) : null);
        return out;
      }

      nSlider.addEventListener("input", drawAll);
      drawAll();

      /* ---------- relative similarity (static figure) ---------- */
      var rel = ctx.q("#peRel", root);
      function drawRel() {
        if (!rel) return;
        var d = 32, maxD = 40;
        var starts = [0, 5, 10, 17];
        var colors = ["#8b7bff", "#22d3ee", "#f5a524", "#34d399"];
        var series = starts.map(function (s, si) {
          var pts = [];
          for (var dd = 0; dd <= maxD; dd++) {
            var a = ctx.demo.peMatrix(s + 1, d)[0];
            var b = ctx.demo.peMatrix(s + dd + 1, d)[dd];
            pts.push([dd, mm.cosine(a, b)]);
          }
          return { data: pts, color: colors[si], width: 1.8 };
        });
        ctx.chart.line(rel, {
          series: series,
          height: 220,
          xLabel: "distance  b − a",
          yLabel: "cosine similarity",
          yDomain: [-0.4, 1.05],
          xTicks: [0, 10, 20, 30, 40]
        });
      }
      rel.addEventListener("redraw", drawRel);
      drawRel();

      /* ---------- RoPE interactive ---------- */
      var rope = ctx.q("#ropeCv", root);
      var as = ctx.q("#ropeAs", root), bs = ctx.q("#ropeBs", root);
      var base = 0.62; // radians per position for this demo
      function drawRope() {
        var a = Number(as.value), b = Number(bs.value);
        ctx.q("#ropeA", root).textContent = a;
        ctx.q("#ropeB", root).textContent = b;

        var S = ctx.chart.setup(rope, 230);
        var c = S.ctx, W = S.W, H = S.H;
        var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 26;
        var T = ctx.chart.themeColors();

        c.strokeStyle = T.grid;
        c.lineWidth = 1;
        c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(cx - R - 12, cy); c.lineTo(cx + R + 12, cy);
        c.moveTo(cx, cy - R - 12); c.lineTo(cx, cy + R + 12); c.stroke();

        // base vector (unrotated key)
        var baseAngle = -0.35;
        function arrow(angle, color, label, dashed) {
          var x = cx + Math.cos(angle) * R, y = cy + Math.sin(angle) * R;
          c.strokeStyle = color;
          c.lineWidth = 2.2;
          if (dashed) c.setLineDash([4, 4]); else c.setLineDash([]);
          c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
          c.setLineDash([]);
          c.beginPath(); c.arc(x, y, 3.6, 0, Math.PI * 2); c.fillStyle = color; c.fill();
          c.fillStyle = color;
          c.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
          c.textAlign = "center";
          c.fillText(label, cx + Math.cos(angle) * (R + 18), cy + Math.sin(angle) * (R + 18) + 4);
        }
        arrow(baseAngle, "rgba(140,150,180,.45)", "k", true);
        arrow(baseAngle + a * base, "#8b7bff", "q(pos a)");
        arrow(baseAngle + b * base, "#22d3ee", "k(pos b)");

        var dot = Math.cos((b - a) * base) * 1.0 * 1.0;
        ctx.q("#ropeDiff", root).textContent = b - a;
        ctx.q("#ropeDot", root).textContent = dot.toFixed(3);
        // same relative distance, different absolute positions
        var a2 = a + 3, b2 = b + 3;
        var dot2 = Math.cos((b2 - a2) * base);
        ctx.q("#ropeSame", root).textContent = a2 + "," + b2 + " → " + dot2.toFixed(3);
      }
      as.addEventListener("input", drawRope);
      bs.addEventListener("input", drawRope);
      drawRope();
      rope.addEventListener("redraw", drawRope);
    }
  });
})();
