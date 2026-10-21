/* ==========================================================================
   08-block.js — assembling one transformer block and stacking N of them
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  LLM.registerChapter({
    id: "block",
    part: "transformer",
    title: "The transformer block, assembled",
    kicker: "Chapter 08",
    summary: "Attention, feed-forward, two normalisations and two additions. That is the entire repeating unit. Stack 96 of them and you have GPT-3.",
    difficulty: "Intermediate",
    keywords: "block layer stack gpt parameters depth residual stream emergent layers",

    render: function (ctx) {
      var icons = ctx.icons;
      var run = ctx.demo.model1.run(ctx.demo.SENTENCE);
      var toks = ctx.demo.SENTENCE.map(function (t) { return t.replace(/^ /, ""); });

      var layers = [
        { n: 1, what: "detokenisation, mostly", detail: "Early layers push tokens toward rough word-sense vectors. Heads tend to be short-range." },
        { n: 2, what: "local syntax", detail: "Previous-token heads and simple agreement patterns." },
        { n: 4, what: "phrase structure", detail: "Chunks of meaning start forming; determiner–noun bonds." },
        { n: 8, what: "clause structure", detail: "Longer-range dependencies, subject–verb links across commas." },
        { n: 16, what: "semantics", detail: "Word senses disambiguated by surrounding context." },
        { n: 24, what: "facts & entities", detail: "FFN layers surface stored knowledge about named entities." },
        { n: 32, what: "reasoning chains", detail: "Induction heads, multi-hop composition, task-format detection." },
        { n: 48, what: "output shaping", detail: "Commits to a token class and a formatting style." },
        { n: 96, what: "final distribution", detail: "The residual stream is finally close to what the unembedding expects." }
      ];

      return (
        '<h2 id="assemble">Putting the pieces together</h2>'
        + '<p data-narrate="' +
        ctx.attr("You now have every piece. Take the token vectors. Normalise them. Run multi-head attention. Add the result back to the residual stream. Normalise again. Run the feed forward network. Add that back too. That is one transformer block. The output has exactly the same shape as the input, which is the property that makes stacking possible at all.") +
        '">You now have every piece. Normalise. Multi-head attention. Add back. Normalise again. Feed-forward. Add back. That is <strong>one transformer block</strong>. Its output has exactly the same shape as its input — the property that makes stacking possible at all.</p>'

        + '<div class="formula" style="flex-direction:column;gap:7px;font-size:17px">'
        + '<div><span class="v">x</span><span class="op">=</span><span class="v">x</span><span class="op">+</span><span class="v">MHA</span>(<span class="v">LN</span><sub>1</sub>(<span class="v">x</span>))</div>'
        + '<div><span class="v">x</span><span class="op">=</span><span class="v">x</span><span class="op">+</span><span class="v">FFN</span>(<span class="v">LN</span><sub>2</sub>(<span class="v">x</span>))</div>'
        + "</div>"

        + '<h2 id="walk">Try it: walk through one block</h2>'
        + '<p data-narrate="' +
        ctx.attr("Step through the block one operation at a time. On the right you will see the actual tensor at that point in the toy model, and you can watch the shapes stay constant while the numbers change. That constancy is the design. Every layer can read and write to the same bus.") +
        '">Step through the block one operation at a time. The tensor shown is the real one from the toy model. Watch the <strong>shape stay constant</strong> while the numbers change — that constancy is the design.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Block walkthrough</span><span class="ix-hint">7 operations</span></div>'
        + '<div class="ix-body">'
        + '<div class="attn-grid two">'
        + '<div class="tblock" id="blkDiag"></div>'
        + '<div><div class="viz-title">Tensor at this point <span class="sub" id="blkShape">6 × 8</span></div>'
        + '<div id="blkTensor"></div>'
        + '<div class="tiny faint" id="blkNote" style="margin-top:11px"></div></div>'
        + "</div>"
        + '<div class="ctl" style="margin-top:16px;justify-content:center">'
        + '<button class="btn btn-ghost btn-sm" id="blkPrev">← Back</button>'
        + '<span class="chip" id="blkStep">1 / 7</span>'
        + '<button class="btn btn-primary btn-sm" id="blkNext">Next →</button>'
        + "</div>"
        + "</div></div>"

        + '<h2 id="stack">Now stack them</h2>'
        + '<p data-narrate="' +
        ctx.attr("Because a block preserves shape, you can run as many as you like in sequence. GPT 2 small had twelve. GPT 3 had ninety six. The depth is where the model gets its capacity to do multi-step processing: each layer can treat the output of the previous one as a slightly more abstract version of the sentence, and by layer ninety the residual stream is no longer really about words at all.") +
        '">Because a block preserves shape, you can run as many as you like in sequence. GPT-2 small had 12. GPT-3 had 96. Depth is where multi-step processing comes from: each layer sees a slightly more abstract version of the sentence.</p>'

        + '<div class="layer-stack" id="layerStack">'
        + layers.map(function (l, i) {
          var w = 18 + (l.n / 96) * 82;
          return '<div class="layer-row" data-l="' + i + '">'
            + '<span class="ln">L' + l.n + "</span>"
            + '<span style="flex:1">' + ctx.esc(l.what) + "</span>"
            + '<span class="lbar" style="flex:0 0 90px"><span style="width:' + w + '%"></span></span>'
            + "</div>";
        }).join("")
        + "</div>"
        + '<div class="viz" id="layerDetail" style="margin-top:12px"></div>'
        + '<div class="tiny faint">Layer specialisation is a rough sketch, not a specification: measured behaviour varies between models, and many capabilities are distributed across many layers rather than owned by one.</div>'

        + '<h2 id="params">Where the parameters go</h2>'
        + '<p data-narrate="' +
        ctx.attr("It is worth seeing where a large model's parameter count actually comes from, because it explains a lot about how models are designed. Take GPT 3, which has ninety six layers and a width of twelve thousand two hundred and eighty eight. The token embedding table alone is about three quarters of a billion numbers, but it is dwarfed by the layers. Each block contributes roughly one hundred and fifty million, and ninety six of them is the bulk of the one hundred and seventy five billion total.") +
        '">Worth seeing where a large model\'s parameter count actually comes from. GPT-3: 96 layers, width 12,288. The token embedding table is ~0.8B numbers — dwarfed by the layers. Each block contributes roughly 150M, and 96 of them is the bulk of the 175B total.</p>'

        + '<table class="cmp"><thead><tr><th>Component</th><th>Formula</th><th>GPT-3 175B</th></tr></thead><tbody>'
        + "<tr><td>Token embeddings</td><td>vocab × d</td><td>50257 × 12288 ≈ 0.62 B</td></tr>"
        + "<tr><td>Attention, per layer</td><td>4 × d²</td><td>4 × 12288² ≈ 604 M</td></tr>"
        + "<tr><td>FFN, per layer</td><td>2 × d × 4d</td><td>8 × 12288² ≈ 1208 M</td></tr>"
        + "<tr><td>All 96 layers</td><td>96 × (attention + FFN)</td><td>≈ 174 B</td></tr>"
        + "<tr><td><strong>Total</strong></td><td></td><td><strong>≈ 175 B</strong></td></tr>"
        + "</tbody></table>"

        + '<div class="callout insight"><div class="co-label">' + icons.bulb + " Read that table again</div>"
        + "<p>The FFN is <strong>twice</strong> the size of attention in every block, and the blocks are ~99.6% of the model. Almost everything you are calling “an LLM” is a stack of feed-forward networks with a thin thread of attention holding them together.</p></div>"

        + '<h2 id="final">The very end of the stack</h2>'
        + '<p data-narrate="' +
        ctx.attr("After the last block there is one more normalisation, and then the unembedding. The final normalisation matters because the last block adds its output to the residual stream, and the unembedding was trained to expect vectors of a particular scale.") +
        '">After the last block there is one final normalisation, then the unembedding. That last normalisation matters: the final block adds its output to the residual stream, and the unembedding expects vectors of a particular scale.</p>'

        + '<div class="viz">'
        + '<div class="tb-row"><div class="tb-node live">final LN<small>normalise one last time</small></div></div>'
        + '<div class="tb-arrow">↓</div>'
        + '<div class="tb-row"><div class="tb-node">unembedding<small>d → vocab · one logit per token</small></div></div>'
        + '<div class="tb-arrow">↓</div>'
        + '<div class="tb-row"><div class="tb-node">softmax<small>logits → probabilities</small></div></div>'
        + "</div>"

        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>A block is <span class=\"mono\">LN → attention → +res</span> then <span class=\"mono\">LN → FFN → +res</span>.</li>"
        + "<li>Shape in equals shape out, which is why blocks stack freely.</li>"
        + "<li>Depth (12–126 layers) provides multi-step processing capacity.</li>"
        + "<li>~99% of parameters are in the stacked blocks; the FFN dominates.</li>"
        + "<li>The stack ends with a final normalisation before the unembedding.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var run = ctx.demo.model1.run(ctx.demo.SENTENCE);
      var toks = ctx.demo.SENTENCE.map(function (t) { return t.replace(/^ /, ""); });

      var STEPS = [
        { key: "x0", label: "input", node: "Input", note: "The residual stream entering the block: token embedding plus positional signal.", rows: run.x0 },
        { key: "ln", label: "LN₁", node: "LN₁", note: "Pre-norm: the attention sub-layer reads a normalised copy. The stream itself is untouched.", rows: run.ln },
        { key: "attnOut", label: "MHA", node: "MHA", note: "Multi-head attention. This is the only step that mixes information between positions.", rows: run.attnOut },
        { key: "x2", label: "+ res", node: "Add", note: "The attention output is added to the stream. Shape unchanged: 6 × 8.", rows: run.x2 },
        { key: "ffnAct", label: "LN₂ → FFN", node: "FFN", note: "Second normalisation, then the 8 → 32 → 8 feed-forward. Each row is processed independently.", rows: run.ffnAct },
        { key: "ffnLin", label: "W₂", node: "FFN↓", note: "Down-projection back to width 8. Now every row has been through the wide middle.", rows: run.ffnLin },
        { key: "out", label: "+ res", node: "Add", note: "Second residual add. This is the block output — same shape as the input, ready for the next block.", rows: run.out }
      ];

      var step = 0;
      var diag = ctx.q("#blkDiag", root);

      function nodeHtml(s, i) {
        var live = i === step ? " live" : "";
        return '<div class="tb-node' + live + '" data-n="' + i + '">' + ctx.esc(s.node) + "</div>";
      }

      function drawDiag() {
        diag.innerHTML =
          '<div class="tb-block"><div class="tb-block-label">transformer block</div>'
          + nodeHtml(STEPS[0], 0)
          + '<div class="tb-arrow">↓</div>'
          + nodeHtml(STEPS[1], 1)
          + '<div class="tb-arrow">↓</div>'
          + nodeHtml(STEPS[2], 2)
          + '<div class="tb-arrow">↓</div>'
          + nodeHtml(STEPS[3], 3)
          + '<div class="tb-arrow">↓</div>'
          + nodeHtml(STEPS[4], 4)
          + '<div class="tb-arrow">↓</div>'
          + nodeHtml(STEPS[5], 5)
          + '<div class="tb-arrow">↓</div>'
          + nodeHtml(STEPS[6], 6)
          + "</div>"
          + '<div class="tb-row" style="margin-top:8px"><div class="tb-node" style="opacity:.6;font-size:11px">next block →</div></div>';
      }

      function drawStep() {
        var s = STEPS[step];
        drawDiag();
        ctx.q("#blkShape", root).textContent = s.rows.length + " × " + s.rows[0].length;
        ctx.q("#blkStep", root).textContent = (step + 1) + " / " + STEPS.length;
        ctx.q("#blkTensor", root).innerHTML = ctx.matrix.block({
          name: s.label,
          rows: s.rows,
          rowHeads: toks,
          desc: s.rows.length + " × " + s.rows[0].length,
          dec: 2,
          heat: true,
          scheme: "diverging",
          cls: "tight"
        });
        ctx.q("#blkNote", root).textContent = s.note;
      }

      ctx.q("#blkNext", root).addEventListener("click", function () {
        step = Math.min(STEPS.length - 1, step + 1);
        drawStep();
      });
      ctx.q("#blkPrev", root).addEventListener("click", function () {
        step = Math.max(0, step - 1);
        drawStep();
      });
      drawStep();

      /* layer stack */
      var detail = ctx.q("#layerDetail", root);
      var LAYER_TEXT = [
        "Layer 1 mostly re-encodes. Attention is short-range and the residual stream is still dominated by the embedding.",
        "By layer 2 previous-token heads are already useful, which is how the model copies exact strings.",
        "Mid-early layers build phrase chunks: determiners bond to nouns, prepositions to their objects.",
        "Clause-level structure. Attention spans widen to cross commas and conjunctions.",
        "Word senses resolve here. The same token becomes different vectors depending on what surrounds it.",
        "Feed-forward layers begin to surface stored factual associations about entities and places.",
        "Compositional reasoning: induction heads let the model reuse patterns from earlier in the context.",
        "The model commits. Attention narrows, and the residual stream starts pointing at a token class.",
        "Close to the unembedding's expectations. Remaining work is formatting and final selection."
      ];
      var rows = ctx.qa("[data-l]", root);
      function pick(i) {
        rows.forEach(function (r, j) { r.classList.toggle("on", i === j); });
        detail.innerHTML =
          '<div class="viz-title">Layer ' + [1, 2, 4, 8, 16, 24, 32, 48, 96][i] + "</div>"
          + "<p style=\"margin:0;font-size:13.6px;line-height:1.66;color:var(--text-soft)\">" + ctx.esc(LAYER_TEXT[i]) + "</p>";
      }
      rows.forEach(function (r, i) { r.addEventListener("click", function () { pick(i); }); });
      pick(4);
    }
  });
})();
