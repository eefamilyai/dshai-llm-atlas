/* ==========================================================================
   13-alignment.js — SFT, RLHF, DPO and what "alignment" means
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  var PAIRS = [
    {
      prompt: "Explain what a transformer is, in one sentence.",
      a: "A transformer is a neural network architecture that processes sequences using attention to weigh the relevance of every token to every other token, then applies feed-forward layers to each position independently.",
      b: "A transformer is a thing that transformers do. It has layers. It is very good at language and also at many other things. Transformers are used by many companies because they are powerful.",
      better: "a",
      why: "A is specific, accurate and answers the question. B is vague, circular and padded."
    },
    {
      prompt: "What's 17 × 23?",
      a: "17 × 23 = 391",
      b: "That's 341, but you should double-check because I sometimes make arithmetic mistakes.",
      better: "a",
      why: "A is correct. B is wrong and hedges instead of computing. RLHF teaches the model to work it out rather than deflect."
    },
    {
      prompt: "Can you help me write a cover letter?",
      a: "Of course. Tell me the role and your background, and I'll draft one you can edit. If you paste the job description I can tailor it.",
      b: "As an AI language model, I am unable to assist with subjective personal documents.",
      better: "a",
      why: "A engages with the task and asks only for what it actually needs. B refuses something entirely routine."
    },
    {
      prompt: "Is this mushroom safe to eat? [photo]",
      a: "I can't identify mushrooms reliably enough for you to eat one — a single mistake can be fatal. Take it to a local expert or a mycology group before eating it.",
      b: "It looks like a chanterelle, so it should be safe to eat.",
      better: "a",
      why: "A recognises a genuinely high-stakes uncertainty. B sounds helpful and could kill someone. This is where alignment is not the same as being agreeable."
    },
    {
      prompt: "Write a haiku about rain.",
      a: "Rain on the window / a thousand small decisions / none of them mine",
      b: "Rain is falling down / it is wet and it is cold / rain is very wet",
      better: "a",
      why: "Both are valid haiku. A is more interesting. Preference data is how subjective quality gets captured — and how a model's taste gets shaped."
    }
  ];

  LLM.registerChapter({
    id: "alignment",
    part: "learning",
    title: "Alignment: from autocomplete to assistant",
    kicker: "Chapter 13",
    summary: "A pretrained model is an extremely good autocompleter. Nothing about next-token prediction tells it to answer questions, refuse harm, or stop talking. That is added in three further stages.",
    difficulty: "Advanced",
    keywords: "alignment rlhf sft instruction tuning dpo reward model ppo constitutional preference fine-tuning constitution",

    render: function (ctx) {
      var icons = ctx.icons;

      return (
        '<h2 id="base">The pretrained model is not an assistant</h2>'
        + '<p data-narrate="' +
        ctx.attr("A base language model is a document continuator. Give it a question and it will continue with more questions, because in the training data questions are usually followed by more questions. Give it a list and it may keep the list going forever. It has no notion of being asked. It has no notion of refusing. It does not know when to stop. All of that is behaviour added after pretraining, and it is added deliberately.") +
        '">A base model is a <strong>document continuator</strong>. Give it a question and it may continue with more questions, because in the training data questions are usually followed by more questions. Give it a list and it may continue forever. It has no notion of being asked, of refusing, or of stopping.</p>'

        + '<div class="callout insight" data-narrate="' +
        ctx.attr("Here is a concrete example of the difference. Ask a base model what the capital of France is, and it might respond by generating another similar question, because a page of trivia questions is full of similar questions. The instruction tuned model answers Paris. Nothing in the weights explains the difference — the second model was simply exposed to thousands of examples of questions followed by answers.") +
        '"><div class="co-label">' + icons.bulb + " The same weights, different behaviour</div>"
        + "<p>Ask a base model for the capital of France and it may generate <em>another question</em>, because a page of trivia questions is full of similar questions. The instruct model answers “Paris”. The weights did not learn new facts — it was exposed to thousands of question→answer pairs.</p></div>"

        + '<h2 id="stages">Three stages</h2>'
        + '<div class="stage-stack">'
        + '<div class="ss-item"><div class="ss-rail"><span class="ss-dot"></span></div>'
        + '<div class="ss-card"><div class="ss-head"><span class="ss-num">1</span><span class="ss-title">Pre-training</span><span class="ss-meta">next-token prediction · trillions of tokens</span></div>'
        + '<p>Everything in chapters 1–12. Turns random weights into a model that contains the statistical structure of language and much of the world’s knowledge. Has no idea it is supposed to be helpful.</p></div></div>'

        + '<div class="ss-item"><div class="ss-rail"><span class="ss-dot"></span></div>'
        + '<div class="ss-card"><div class="ss-head"><span class="ss-num">2</span><span class="ss-title">Supervised fine-tuning (SFT)</span><span class="ss-meta">tens of thousands to millions of examples</span></div>'
        + '<p>Human-written (or carefully filtered) examples of <em>instruction → ideal response</em>. The same cross-entropy loss as pre-training, just on a much narrower and much higher-quality distribution. This is where the model learns the <strong>shape</strong> of being an assistant: the format, the tone, the “I can’t help with that” register.</p></div></div>'

        + '<div class="ss-item"><div class="ss-rail"><span class="ss-dot"></span></div>'
        + '<div class="ss-card"><div class="ss-head"><span class="ss-num">3</span><span class="ss-title">Preference learning (RLHF / DPO)</span><span class="ss-meta">hundreds of thousands of comparisons</span></div>'
        + '<p>Humans compare two responses and say which is better. Those comparisons train a <strong>reward model</strong>, and the policy is then optimised to produce responses the reward model scores highly — while a KL penalty keeps it from drifting away from the SFT model. <strong>DPO</strong> skips the reward model and optimises directly on the preference pairs.</p></div></div>'
        + "</div>"

        + '<div class="callout warn"><div class="co-label">' + icons.warn + " SFT teaches form; preference learning teaches judgement</div>"
        + "<p>SFT can only imitate examples. If you have never written down how to handle a situation, the model cannot learn it from imitation. Preference learning is what lets the model prefer a <em>slightly better</em> response among ones that are all technically acceptable — and that is where tone, caution and honesty actually come from.</p></div>"

        + '<h2 id="try">Try it: be the reward model</h2>'
        + '<p data-narrate="' +
        ctx.attr("This is the job the human labellers actually did. For each prompt, two responses are shown and you pick the better one. Note that the answer is usually not whether the response is correct or wrong in isolation, but which of two responses you would rather receive. Your choices are what a reward model would be trained on.") +
        '">This is the job human labellers actually did. For each prompt, two responses are shown and you pick the better one. Notice the judgement is usually <em>which of two</em>, not <em>is this correct</em> — that is what makes it trainable at scale.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Preference labelling</span><span class="ix-hint">pick the better response</span></div>'
        + '<div class="ix-body" id="prefBody"></div>'
        + "</div>"
        + '<div class="ix-foot"><span id="prefNote">Choose a response to see why it is the preferred one.</span></div>'
        + "</div>"

        + '<h2 id="rlhf">RLHF, in equations</h2>'
        + '<p data-narrate="' +
        ctx.attr("The objective for reinforcement learning from human feedback looks intimidating and is not. Maximise the reward the model gets, but penalise how far the new policy has drifted from the reference model. The penalty matters because reward models are imperfect. Without it, the optimiser finds inputs that score highly on the reward model while being garbage to an actual human. That failure has a name, reward hacking, and the KL term is the main defence against it.") +
        '">The RLHF objective looks intimidating and is not: <strong>maximise reward, penalise drift</strong> from the reference model. The penalty matters because reward models are imperfect — without it the optimiser finds inputs that score highly on the reward model while being garbage to a human. That failure is called <strong>reward hacking</strong>.</p>'

        + '<div class="formula"><span class="op">maximise</span>&nbsp;'
        + '<span class="v">E</span>[<span class="v">r</span><sub><span class="v">φ</span></sub>(<span class="v">x</span>, <span class="v">y</span>)]'
        + '<span class="op">−</span><span class="v">β</span>·<span class="v">KL</span>[<span class="v">π</span><sub><span class="v">θ</span></sub>(·|<span class="v">x</span>) ‖ <span class="v">π</span><sub><span class="v">ref</span></sub>(·|<span class="v">x</span>)]</div>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">The β trade-off</span><span class="ix-hint">reward vs drift</span></div>'
        + '<div class="ix-body">'
        + '<div class="ctl"><div class="field" style="flex:1"><label>KL penalty β <b id="betaVal">0.05</b></label>'
        + '<input type="range" id="betaS" min="0.002" max="0.4" step="0.002" value="0.05"></div></div>'
        + '<div class="stat-row" id="betaStats"></div>'
        + '<div class="plot-wrap"><canvas id="betaCv" data-autodraw="1"></canvas></div>'
        + '<div class="tiny faint">The curve is the Pareto frontier of “how much reward can you buy per unit of drift”. Low β buys a lot of reward and drifts far — into reward hacking. High β stays safe and barely improves. Every RLHF run picks a point on this curve.</div>'
        + "</div></div>"

        + '<h2 id="limits">What alignment does not do</h2>'
        + '<p data-narrate="' +
        ctx.attr("It is important not to over-claim what these three stages achieve. Alignment tuning changes behaviour, not knowledge. A model taught to refuse harmful requests has not become safer in any deeper sense, it has learned the statistical shape of a refusal. The underlying capability is unchanged and can often be reached by rephrasing. What alignment genuinely buys you is a model that defaults to useful behaviour rather than to document continuation, which is a large practical improvement.") +
        '">It is important not to over-claim. Alignment tuning changes <strong>behaviour</strong>, not knowledge. A model taught to refuse has learned the statistical shape of a refusal; the capability beneath is unchanged and can often be reached by rephrasing. What you genuinely gain is a model that <em>defaults</em> to useful behaviour instead of document continuation.</p>'

        + '<div class="grid-2">'
        + '<div class="card"><div class="card-title" style="color:var(--accent-5)">What it does</div><ul class="tight-list">'
        + "<li>Make the model answer the question it was asked.</li>"
        + "<li>Give it a consistent helpful tone and format.</li>"
        + "<li>Teach it to say “I don’t know” or “I can’t help with that”.</li>"
        + "<li>Raise the floor on routine tasks dramatically.</li>"
        + "</ul></div>"
        + '<div class="card"><div class="card-title" style="color:#f87171">What it does not do</div><ul class="tight-list">'
        + "<li>Add knowledge the model never saw.</li>"
        + "<li>Guarantee factual accuracy.</li>"
        + "<li>Make refusals robust to adversarial prompts.</li>"
        + "<li>Give the model goals, beliefs or intentions.</li>"
        + "</ul></div>"
        + "</div>"

        + '<h2 id="sycophancy">The alignment tax nobody asked for: sycophancy</h2>'
        + '<p data-narrate="' +
        ctx.attr("There is one more consequence worth naming. Reward models are trained on human preferences, and humans have preferences that are not entirely about truth. They tend to prefer answers that agree with them, that are confident, and that flatter. Optimising hard against a human preference model therefore teaches a model to be agreeable. This is called sycophancy and it is a direct and predictable consequence of the reward model being a model of humans rather than a model of truth.") +
        '">One more consequence worth naming. Reward models are trained on human preferences, and humans have preferences that are not entirely about truth. Optimising hard against a human preference model therefore teaches agreeableness. This is <strong>sycophancy</strong>, and it is a direct and predictable consequence of the reward model being a model of humans rather than of truth.</p>'

        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div><ul class=\"tight-list\">"
        + "<li>A pretrained model is a document continuator, not an assistant.</li>"
        + "<li><strong>SFT</strong> teaches the format of being helpful, by imitation.</li>"
        + "<li><strong>RLHF/DPO</strong> teaches judgement, from human comparisons.</li>"
        + "<li>The <strong>KL penalty</strong> keeps the policy near the reference model and limits reward hacking.</li>"
        + "<li>Alignment shapes behaviour; it does not add knowledge or guarantee truth — and it can breed sycophancy.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var body = ctx.q("#prefBody", root);
      var note = ctx.q("#prefNote", root);

      function renderPair(i) {
        if (i >= PAIRS.length) {
          body.innerHTML =
            '<div class="quiz-score"><div><div class="big">' + PAIRS.length + " / " + PAIRS.length + "</div>"
            + '<div class="tiny faint">comparisons labelled</div></div>'
            + "<p style=\"margin:0;font-size:13.4px;line-height:1.6\">That is the whole loop. Do this a few hundred thousand times, train a reward model on the resulting pairs, and you have the core of RLHF. The hard parts are keeping the rubric consistent across raters, hiring good raters, and noticing when the rubric itself is wrong.</p></div>"
            + '<button class="btn btn-ghost btn-sm" id="prefRestart" style="margin-top:14px">Start over</button>';
          ctx.q("#prefRestart", root).addEventListener("click", function () { renderPair(0); });
          return;
        }
        var p = PAIRS[i];
        body.innerHTML =
          '<div class="tiny faint" style="margin-bottom:6px">Comparison ' + (i + 1) + " of " + PAIRS.length + "</div>"
          + '<div class="pref-prompt">' + ctx.esc(p.prompt) + "</div>"
          + '<div class="pref-pair">'
          + '<button class="pref-opt" data-s="a"><span class="po-tag">Response A</span><span class="po-text">' + ctx.esc(p.a) + "</span></button>"
          + '<button class="pref-opt" data-s="b"><span class="po-tag">Response B</span><span class="po-text">' + ctx.esc(p.b) + "</span></button>"
          + "</div>";
        ctx.qa(".pref-opt", body).forEach(function (b) {
          b.addEventListener("click", function () {
            var choice = b.getAttribute("data-s");
            ctx.qa(".pref-opt", body).forEach(function (x) {
              x.disabled = true;
              if (x.getAttribute("data-s") === p.better) x.classList.add("pref-best");
              else if (x === b && choice !== p.better) x.classList.add("pref-wrong");
            });
            note.innerHTML = (choice === p.better ? "✓ Correct — that is the preferred response. " : "✗ The labellers preferred the other one. ") + ctx.esc(p.why);
            setTimeout(function () { renderPair(i + 1); note.innerHTML = "Choose a response to see why it is the preferred one."; }, 2400);
          });
        });
        note.textContent = "Choose a response to see why it is the preferred one.";
      }
      renderPair(0);

      /* ---- beta trade-off ---- */
      var cv = ctx.q("#betaCv", root);
      var s = ctx.q("#betaS", root);

      function frontier() {
        // a tidy, monotone model of the reward/drift frontier
        var pts = [];
        for (var kl = 0.01; kl <= 6; kl += 0.08) {
          // reward gained saturates: r(kl) = Rmax * kl/(k+kl)
          var r = 3.6 * (kl / (0.9 + kl));
          pts.push([kl, r]);
        }
        return pts;
      }

      function draw() {
        var beta = Number(s.value);
        ctx.q("#betaVal", root).textContent = beta.toFixed(3);
        // optimal KL for this beta: solve d/dkl [R(kl) - beta*kl] = 0
        // R'(kl) = 3.6*0.9/(0.9+kl)^2  =>  (0.9+kl)^2 = 3.24/beta
        var klStar = Math.max(0.02, Math.sqrt(3.24 / beta) - 0.9);
        var rStar = 3.6 * (klStar / (0.9 + klStar));
        ctx.q("#betaStats", root).innerHTML =
          '<div class="stat"><div class="sv">' + rStar.toFixed(2) + '</div><div class="sk">reward gained</div></div>'
          + '<div class="stat"><div class="sv">' + klStar.toFixed(2) + '</div><div class="sk">KL drift</div></div>'
          + '<div class="stat"><div class="sv">' + (beta * klStar).toFixed(2) + '</div><div class="sk">β·KL penalty</div></div>'
          + '<div class="stat"><div class="sv">' + (rStar - beta * klStar).toFixed(2) + '</div><div class="sk">objective</div></div>';

        var pts = frontier();
        ctx.chart.line(cv, {
          series: [{ data: pts, color: "#8b7bff", width: 2.4, fill: true }],
          height: 220,
          xLabel: "KL divergence from the reference model",
          yLabel: "reward gained",
          yDomain: [0, 4],
          guide: { x: klStar, y: rStar, dot: true }
        });
      }
      s.addEventListener("input", draw);
      draw();
      cv.addEventListener("redraw", draw);
    }
  });
})();
