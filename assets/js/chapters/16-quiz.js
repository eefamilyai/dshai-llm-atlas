/* ==========================================================================
   16-quiz.js — self-check
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  var Q = [
    {
      q: "What is the only objective a base language model is trained on?",
      o: ["Predict the next token", "Answer questions helpfully", "Classify sentiment", "Translate between languages"],
      a: 0,
      e: "Pre-training is next-token prediction, full stop. Every other capability, including question answering, is a side effect of getting very good at that one task across a huge corpus."
    },
    {
      q: "Which component of the pipeline is NOT learned during training?",
      o: ["The embedding matrix", "The attention weights", "The tokenizer", "The feed-forward layers"],
      a: 2,
      e: "The tokenizer is a fixed, hand-built lookup table that ships with the model. Everything else — embeddings, attention, FFN — is tuned by gradient descent."
    },
    {
      q: "A token is best described as…",
      o: ["A whole word", "A single character", "A subword piece, often with a leading space", "A sentence"],
      a: 2,
      e: "Subwords sit between characters and words. Common words get one token; rare words split into reusable fragments. A leading space is typically part of the token itself."
    },
    {
      q: "Why does attention divide the scores by √d_k?",
      o: ["To make the matrix smaller", "To keep softmax out of saturation as d_k grows", "To preserve the causal mask", "It is a historical accident with no effect"],
      a: 1,
      e: "A dot product of d_k terms has variance growing with d_k. Without scaling, softmax saturates into a near one-hot distribution whose gradients are almost zero, and learning stalls."
    },
    {
      q: "What does the causal mask do?",
      o: ["Hides padding tokens", "Sets scores for future tokens to −∞ before softmax", "Drops entire attention heads", "Prevents the model overfitting"],
      a: 1,
      e: "Every score for a position after the current one becomes −∞, so exp(−∞) = 0 and the weight is exactly zero. Otherwise the model could read the answer during training."
    },
    {
      q: "In multi-head attention with model width d and h heads, each head operates on…",
      o: ["The full width d, independently", "d/h dimensions", "The vocabulary", "A single dimension"],
      a: 1,
      e: "The width is split: each head has d_head = d/h dimensions. Total compute is unchanged — you have traded one wide attention pattern for several narrow ones."
    },
    {
      q: "Which operation is the only one that moves information BETWEEN positions?",
      o: ["Feed-forward network", "Layer norm", "Attention", "The residual add"],
      a: 2,
      e: "Attention is the only horizontal operation. The FFN, layer norm and residuals all act on each position independently — attention communicates, everything else computes."
    },
    {
      q: "Roughly what fraction of a transformer's parameters are in the feed-forward layers?",
      o: ["About 10%", "About one third", "About two thirds", "Essentially all of them"],
      a: 2,
      e: "The FFN expands by 4× (d → 4d → d), so it holds about twice the parameters of attention. Roughly two thirds of a model is feed-forward."
    },
    {
      q: "Layer normalisation computes its statistics across…",
      o: ["The whole batch", "The features of a single token", "The sequence length", "The vocabulary"],
      a: 1,
      e: "Per token, not per batch. That is why it works with batch size 1 and needs no running averages at inference — unlike batch normalisation."
    },
    {
      q: "A residual connection does what?",
      o: ["Replaces the sub-layer output", "Adds the sub-layer output to its input", "Resets the vector to zero", "Concatenates layers"],
      a: 1,
      e: "x = x + f(x). It gives gradients an unobstructed path backwards and makes identity the default, so a bad layer can only fail to add something useful."
    },
    {
      q: "Logits are…",
      o: ["Probabilities that sum to 1", "Unbounded raw scores before softmax", "Token ids", "Loss values"],
      a: 1,
      e: "Logits are real numbers on an unbounded scale. Only their relative differences matter; adding a constant to all of them leaves the distribution unchanged."
    },
    {
      q: "Setting temperature to 2.0 …",
      o: ["Changes which token is most likely", "Flattens the distribution without changing the ranking", "Makes output deterministic", "Doubles the vocabulary"],
      a: 1,
      e: "Dividing logits by T changes the spread, not the order. Higher T flattens toward uniform — the tail gets more probability, which is why it feels more creative and less reliable."
    },
    {
      q: "Top-p differs from top-k because it truncates by…",
      o: ["A fixed token count", "A budget of probability mass, adapting to confidence", "The alphabet", "The entropy of the weights"],
      a: 1,
      e: "Nucleus sampling keeps the smallest set of tokens covering mass p. When the model is confident the set is tiny; when it is unsure the set grows automatically. Top-k uses a fixed count regardless."
    },
    {
      q: "Why is the KV cache mathematically valid?",
      o: ["Because the weights never change", "Because the causal mask means past keys and values never depend on future tokens", "Because softmax is normalised", "Because attention is symmetric"],
      a: 1,
      e: "Token i may only attend to positions ≤ i, so its key and value are computed once and stay valid forever. Only the brand new token needs fresh Q/K/V each step."
    },
    {
      q: "Cross-entropy loss is −log p(correct). If the model gives the correct token probability 0.01, the loss is about…",
      o: ["0.01", "1.0", "4.6", "100"],
      a: 2,
      e: "−ln(0.01) ≈ 4.605. The logarithm makes confident mistakes expensive — ten times less likely is worth roughly one nat of loss per decade."
    },
    {
      q: "What does a single backward pass give you?",
      o: ["The output distribution", "The gradient of the loss with respect to every parameter", "The tokenizer mapping", "A new sample"],
      a: 1,
      e: "Backpropagation runs the chain rule once in reverse through the whole graph, producing every parameter's gradient simultaneously. It costs roughly the same as the forward pass."
    },
    {
      q: "What does supervised fine-tuning (SFT) primarily teach?",
      o: ["New facts", "The format and tone of being an assistant, by imitation", "Better tokenization", "Longer context windows"],
      a: 1,
      e: "SFT imitates examples of instruction→response. It teaches the shape of an answer — format, register, when to refuse — rather than knowledge the model never saw."
    },
    {
      q: "The KL penalty in RLHF exists to…",
      o: ["Speed up training", "Keep the policy close to the reference model, limiting reward hacking", "Increase the reward", "Compress the model"],
      a: 1,
      e: "Reward models are imperfect. Without a penalty on drift, the optimiser finds inputs that score well on the reward model while being bad by human judgement — that is reward hacking."
    },
    {
      q: "Which of these would break the transformer if removed?",
      o: ["The residual connections", "The glossary", "The final softmax only", "Nothing — all parts are optional"],
      a: 0,
      e: "Without residuals, gradients vanish or explode long before 96 layers. Likewise layer norm: both are unglamorous plumbing without which a deep model simply does not train."
    },
    {
      q: "Two words have similar embeddings. What does that mean concretely?",
      o: ["They have the same token id", "Their vectors point in similar directions (high cosine similarity)", "They appear equally often", "They are the same length"],
      a: 1,
      e: "Similarity is measured by cosine — the angle between vectors, not their magnitude. That is why vector arithmetic like king − man + woman ≈ queen works."
    }
  ];

  LLM.registerChapter({
    id: "quiz",
    part: "synthesis",
    title: "Check yourself",
    kicker: "Final",
    summary: "Twenty questions covering the whole guide. Each answer comes with an explanation, so getting one wrong is still worth something.",
    difficulty: "Final",
    noProgress: true,
    prose: false,
    keywords: "quiz test questions self-check final review",

    render: function (ctx) {
      var best = ctx.store.getQuizBest("quiz");
      return (
        '<p class="lede" data-narrate="' +
        ctx.attr("Twenty questions covering everything in this guide. Each answer comes with an explanation, so getting one wrong is still worth something. There is no time limit and the order does not matter. When you finish, you will get a score and a suggestion about which chapters to revisit.") +
        '">Twenty questions covering everything in this guide. Each answer comes with an explanation, so getting one wrong is still worth something. When you finish you get a score and a suggestion about what to revisit.</p>'
        + '<div class="quiz" id="quizRoot">'
        + '<div class="quiz-score" id="quizScore" style="display:none"></div>'
        + Q.map(function (item, i) {
          return '<div class="quiz-q" data-q="' + i + '">'
            + '<div class="qnum">Question ' + (i + 1) + " of " + Q.length + "</div>"
            + '<div class="qtext">' + ctx.esc(item.q) + "</div>"
            + '<div class="quiz-opts">'
            + item.o.map(function (opt, j) {
              return '<button class="quiz-opt" data-q="' + i + '" data-o="' + j + '">'
                + '<span class="k">' + "ABCD"[j] + "</span><span>" + ctx.esc(opt) + "</span></button>";
            }).join("")
            + "</div></div>";
        }).join("")
        + '<div id="quizResult"></div>'
        + "</div>"
        + (best ? '<p class="tiny faint" style="margin-top:16px">Your best score on this device: ' + best.score + " / " + best.total + "</p>" : "")
      );
    },

    mount: function (root, ctx) {
      var answered = 0;
      var correct = 0;
      var total = Q.length;
      var scoreEl = ctx.q("#quizScore", root);

      ctx.qa(".quiz-opt", root).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var qi = Number(btn.getAttribute("data-q"));
          var oi = Number(btn.getAttribute("data-o"));
          var item = Q[qi];
          var card = ctx.q('.quiz-q[data-q="' + qi + '"]', root);
          if (card.dataset.done) return;
          card.dataset.done = "1";
          answered++;

          var opts = ctx.qa(".quiz-opt", card);
          opts.forEach(function (o) {
            o.disabled = true;
            var j = Number(o.getAttribute("data-o"));
            if (j === item.a) o.classList.add("correct");
            else if (j === oi) o.classList.add("wrong");
          });
          if (oi === item.a) correct++;

          var exp = document.createElement("div");
          exp.className = "quiz-exp";
          exp.innerHTML = "<strong>" + (oi === item.a ? "Correct. " : "Not quite. ") + "</strong>" + ctx.esc(item.e);
          card.appendChild(exp);

          updateScore();
          if (answered === total) finish();
        });
      });

      function updateScore() {
        scoreEl.style.display = "flex";
        scoreEl.innerHTML =
          '<div><div class="big">' + correct + " / " + answered + "</div>"
          + '<div class="tiny faint">answered correctly</div></div>'
          + '<div style="flex:1;min-width:120px"><div class="side-progress-track"><span style="display:block;height:100%;border-radius:99px;background:var(--accent-grad);width:' + ((answered / total) * 100).toFixed(0) + '%"></span></div>'
          + '<div class="tiny faint" style="margin-top:6px">' + (total - answered) + " remaining</div></div>";
      }

      function finish() {
        ctx.store.setQuizBest("quiz", correct, total);
        var pct = Math.round((correct / total) * 100);
        var msg = pct >= 90 ? "That is a thorough understanding. You could explain this to someone else."
          : pct >= 70 ? "Solid. Revisit the chapters behind the ones you missed."
            : pct >= 45 ? "A reasonable start — the attention and training chapters are worth a second pass."
              : "Worth reading through again from chapter 4 onward. It is dense material.";
        ctx.q("#quizResult", root).innerHTML =
          '<div class="quiz-score" style="margin-top:20px;flex-direction:column;align-items:flex-start;gap:8px">'
          + '<div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap"><div class="big">' + correct + " / " + total + "</div>"
          + '<div class="chip ' + (pct >= 70 ? "ok" : "warm") + '">' + pct + "%</div></div>"
          + '<p style="margin:0;font-size:13.6px;line-height:1.65">' + msg + "</p></div>"
          + '<div class="ctl" style="margin-top:16px"><button class="btn btn-ghost btn-sm" id="quizRetry">Retake the quiz</button>'
          + '<button class="btn btn-primary btn-sm" id="quizHome">Back to the start</button></div>';
        ctx.q("#quizRetry", root).addEventListener("click", function () {
          ctx.rerender();
        });
        ctx.q("#quizHome", root).addEventListener("click", function () { location.hash = "#/home"; });
      }
    }
  });
})();
