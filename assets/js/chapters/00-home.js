/* ==========================================================================
   00-home.js — landing page
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  var STAGES = [
    { name: "Text", desc: "“The cat sat on the”", icon: "type", long: "Everything starts as characters. A language model never sees letters — it only ever sees integers." },
    { name: "Tokens", desc: "6 integers", icon: "grid", long: "The text is chopped into subword tokens. Each token is looked up in the vocabulary and becomes an integer ID." },
    { name: "Embeddings", desc: "6 × 8 numbers", icon: "spark", long: "Each ID indexes a row of an embedding table. A token ID becomes a learned vector — a point in a high-dimensional space where meaning is direction." },
    { name: "Position", desc: "+ positional signal", icon: "target", long: "The same word in different places must mean different things. A positional signal is added so the model knows the order." },
    { name: "Attention", desc: "tokens talk to tokens", icon: "layers", long: "Each token asks a question (query), every other token advertises what it has (key), and the best matches hand over their content (value). This is where context is built." },
    { name: "Feed-forward", desc: "think, per token", icon: "robot", long: "A small neural network processes each token's vector independently, expanding it 4×, applying a non-linearity, and squeezing it back down." },
    { name: "Repeat × N", desc: "12 – 96 layers", icon: "layers", long: "Attention and feed-forward alternate, dozens of times. Each layer refines the vectors a little more. This stack is the whole model." },
    { name: "Logits", desc: "one score per token", icon: "chart", long: "The final vector is compared against every token in the vocabulary, producing one raw score — a logit — for each." },
    { name: "Probabilities", desc: "softmax", icon: "spark", long: "Softmax turns the logits into a probability distribution that sums to 100%." },
    { name: "Sample", desc: "one token wins", icon: "dice", long: "A token is drawn from that distribution. It is appended to the text, and the whole loop runs again." }
  ];

  LLM.registerChapter({
    id: "home",
    part: "foundations",
    title: "How does an LLM actually work?",
    kicker: "Interactive field guide",
    summary: "Not a metaphor, not a black box — the actual arithmetic, step by step, with real numbers you can read off the matrices. Every chapter is narrated, every claim is computed live in your browser.",
    difficulty: "Start here",
    noProgress: true,
    keywords: "introduction overview start what is an llm transformer neural network",

    render: function (ctx) {
      var icons = ctx.icons;
      var stagesHtml = STAGES.map(function (s, i) {
        return (
          '<button class="pl-node" data-stage="' + i + '">' +
          '<span class="pl-ico">' + (icons[s.icon] || "") + "</span>" +
          '<span class="pl-name">' + ctx.esc(s.name) + "</span>" +
          '<span class="pl-desc">' + ctx.esc(s.desc) + "</span>" +
          "</button>"
        );
      }).join("");

      var chapters = LLM.chapters().filter(function (c) { return c.id !== "home"; });
      var cards = chapters.slice(0, 8).map(function (c) {
        return (
          '<a class="home-card" href="#/' + c.id + '">' +
          '<span class="hc-num">' + String(c.num).padStart(2, "0") + "</span>" +
          '<span class="hc-title">' + ctx.esc(c.title) + "</span>" +
          '<span class="hc-sub">' + ctx.esc((c.summary || "").split(".")[0]) + ".</span>" +
          "</a>"
        );
      }).join("");

      return (
        '<p class="lede" data-narrate="' +
        ctx.attr("A large language model is, at bottom, a very simple machine wearing an enormous costume. You give it a sequence of tokens. It runs that sequence through a fixed sequence of arithmetic operations — mostly matrix multiplications — and it gives you back a probability for every token in its vocabulary. Then one token is picked, appended to the input, and the whole thing runs again. That is it. That is the entire mechanism.") +
        '">A large language model is, at bottom, a very simple machine wearing an enormous costume. You give it a sequence of tokens. It runs that sequence through a fixed sequence of arithmetic operations — mostly matrix multiplications — and it gives you back a probability for every token in its vocabulary. Then one token is chosen, appended to the input, and the whole thing runs again. That is it. That is the entire mechanism.</p>'

        + '<p data-narrate="' +
        ctx.attr("What makes it feel like intelligence is not some hidden spark. It is the scale of two things: the number of parameters, which is to say how many numbers the model gets to tune, and the amount of text it was tuned on. GPT-scale models carry hundreds of billions of parameters and read trillions of tokens. Everything else follows from those numbers being fitted extremely well.") +
        '">What makes it feel like intelligence is not some hidden spark. It is the scale of two things: the <strong>number of parameters</strong> — how many numbers the model gets to tune — and the <strong>amount of text it was tuned on</strong>. GPT-scale models carry hundreds of billions of parameters and read trillions of tokens. Everything else follows from those numbers being fitted extremely well.</p>'

        + '<div class="hero-cta">'
        + '<button class="btn btn-primary" data-listen>' + icons.speaker + " Listen to this guide</button>"
        + '<a class="btn btn-ghost" href="#/tokens">Start with tokens ' + icons.arrow + "</a>"
        + "</div>"

        + '<div class="callout insight" data-narrate="' +
        ctx.attr("Here is the single most useful sentence on this whole site. A language model is a function from a sequence of tokens to a probability distribution over the next token. Everything you have heard about reasoning, planning, or emergent ability is a description of what that function computes once you make it big enough and train it long enough, not a description of a different kind of machine.") +
        '"><div class="co-label">' + icons.bulb + " The one-sentence version</div>"
        + "<p>A language model is a <strong>function from a sequence of tokens to a probability distribution over the next token</strong>. Everything you have heard about reasoning, planning or emergent ability describes <em>what that function computes</em> once it is big enough — not a different kind of machine.</p></div>"

        + '<h2>The pipeline, in one picture</h2>'
        + '<p data-narrate="' +
        ctx.attr("Here is the entire forward pass. Ten stages, three of which are just bookkeeping. Tap any stage to see what it does and which chapter covers it in detail.") +
        '">Here is the entire forward pass. Ten stages, three of which are just bookkeeping. Tap any stage to see what it does and which chapter covers it in detail.</p>'

        + '<div class="viz"><div class="pipeline" id="homePipeline">' + stagesHtml + "</div>"
        + '<div class="stage-detail" id="homeStageDetail"></div></div>'

        + '<h2>What you will actually learn</h2>'
        + '<div class="grid-3">'
        + '<div class="card"><div class="card-title">' + icons.type + " The mechanics</div><p class=\"tiny muted\">Exactly how text becomes tokens, tokens become vectors, and vectors become a score for every word in the vocabulary.</p></div>"
        + '<div class="card"><div class="card-title">' + icons.layers + " Attention</div><p class=\"tiny muted\">The one idea that made modern LLMs possible — derived from scratch, cell by cell, on real matrices.</p></div>"
        + '<div class="card"><div class="card-title">' + icons.chart + " Training</div><p class=\"tiny muted\">Cross-entropy loss, backpropagation and gradient descent, with a trainer you can actually run.</p></div>"
        + "</div>"

        + '<div class="callout note" data-narrate="' +
        ctx.attr("A note on honesty. Every number you see in this guide is computed live in your browser by JavaScript that is doing the actual arithmetic. Where a real model has a billion parameters and this page has eight, I say so. Where real values would be meaningless until training, I say so too, and then chapter twelve shows you why training is what makes them mean something.") +
        '"><div class="co-label">' + icons.info + " How to read this guide</div>"
        + "<p>Every number you see is <strong>computed live in your browser</strong>. Where a real model has a billion parameters and this page uses eight, I say so. Where values would be meaningless until training, I say so too — and chapter 12 shows you exactly why training is what makes them mean something.</p></div>"

        + '<h2>How to use this site</h2>'
        + '<div class="grid-2">'
        + '<div class="card"><div class="card-title">Voice narration</div><p class="tiny muted">Press the play button in the bottom-right corner and the page explains itself out loud, highlighting each passage as it speaks. Choose a voice and speed under the settings caret.</p></div>'
        + '<div class="card"><div class="card-title">Interactive figures</div><p class="tiny muted">Anything with a coloured <span class="chip violet">INTERACTIVE</span> badge can be dragged, clicked or stepped through. Nothing is a static picture.</p></div>'
        + '<div class="card"><div class="card-title">Real matrices</div><p class="tiny muted">Matrices are shown as bracketed grids of actual numbers — never as abstract blocks. You can hover any cell and read it.</p></div>'
        + '<div class="card"><div class="card-title">Progress</div><p class="tiny muted">Chapters you finish are ticked in the sidebar and remembered on this device. <span class="kbd">Ctrl</span>+<span class="kbd">K</span> searches everything.</p></div>'
        + "</div>"

        + '<h2>Start with</h2><div class="home-grid">' + cards + "</div>"
        + '<p class="tiny muted" style="margin-top:14px">…and eleven more chapters after those, ending with a full end-to-end walkthrough of a single token being generated.</p>'
      );
    },

    mount: function (root, ctx) {
      var nodes = ctx.qa("[data-stage]", root);
      var detail = ctx.q("#homeStageDetail", root);

      function show(i) {
        nodes.forEach(function (n, j) { n.classList.toggle("on", i === j); });
        var s = STAGES[i];
        var link = [
          { ch: "tokens", label: "Chapter 1 · Tokens" },
          { ch: "embeddings", label: "Chapter 2 · Embeddings" },
          { ch: "position", label: "Chapter 3 · Position" },
          { ch: "attention", label: "Chapter 4 · Attention" },
          { ch: "ffn", label: "Chapter 6 · Feed-forward" },
          { ch: "block", label: "Chapter 8 · Transformer block" },
          { ch: "logits", label: "Chapter 9 · Logits" },
          { ch: "logits", label: "Chapter 9 · Softmax" },
          { ch: "sampling", label: "Chapter 10 · Sampling" },
          { ch: "sampling", label: "Chapter 10 · Sampling" }
        ][i];
        detail.innerHTML =
          '<div class="sd-inner">' +
          '<div class="sd-num">Stage ' + (i + 1) + " of " + STAGES.length + "</div>" +
          '<div class="sd-title">' + ctx.esc(s.name) + " <span class=\"sd-desc\">" + ctx.esc(s.desc) + "</span></div>" +
          "<p>" + ctx.esc(s.long) + "</p>" +
          '<a class="sd-link" href="#/' + link.ch + '">' + ctx.esc(link.label) + " →</a>" +
          "</div>";
      }
      nodes.forEach(function (n) {
        n.addEventListener("click", function () { show(Number(n.getAttribute("data-stage"))); });
        n.addEventListener("mouseenter", function () {
          if (!detail.dataset.locked) show(Number(n.getAttribute("data-stage")));
        });
      });
      show(0);
    }
  });
})();
