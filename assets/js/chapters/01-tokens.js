/* ==========================================================================
   01-tokens.js — text → token ids
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  var SAMPLES = [
    "The cat sat on the mat.",
    "Tokenization is how a language model reads.",
    "Unbelievable! Transformers tokenize subwords.",
    "Hello, world! I’m learning about LLMs.",
    "3.14159 + 42 = 45.14159",
    "antidisestablishmentarianism"
  ];

  function chipClass(tok) {
    var core = tok.text.replace(/^ /, "");
    if (core.length === 1) return "w-single";
    if (/^[^\p{L}\p{N}]+$/u.test(core)) return "w-single";
    return core.length >= 8 ? "w-long" : "alt";
  }

  function renderTokens(tokens) {
    if (!tokens.length) return '<div class="tiny faint">Nothing to tokenize yet.</div>';
    return (
      '<div class="tokrow">' +
      tokens
        .map(function (t) {
          var spaced = t.text.charAt(0) === " ";
          var core = spaced ? t.text.slice(1) : t.text;
          var shown = core.replace(/ /g, "␣").replace(/\n/g, "⏎");
          if (shown === "") shown = "␣";
          return (
            '<div class="tok ' + chipClass(t) + '">' +
            '<span class="t-sp">' + (spaced ? "␣" : "&nbsp;") + "</span>" +
            '<span class="t-txt">' + LLM.esc(shown) + "</span>" +
            '<span class="t-id">' + (t.id < 0 ? "?" : t.id) + "</span>" +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  LLM.registerChapter({
    id: "tokens",
    part: "foundations",
    title: "Tokens: text becomes numbers",
    kicker: "Chapter 01",
    summary: "A model has never seen a letter. Before anything else happens, your sentence is cut into subword pieces and each piece is replaced by an integer. Getting this step wrong explains half of the weird things LLMs do.",
    difficulty: "Beginner",
    keywords: "token tokenizer tokenization bpe byte pair encoding vocabulary subword id unicode",

    render: function (ctx) {
      var icons = ctx.icons;
      var n = ctx.tokenizer.size;

      return (
        '<h2 id="why">Why a model can only see numbers</h2>'
        + '<p data-narrate="' +
        ctx.attr("A transformer is a pile of matrix multiplications, and matrix multiplication only works on numbers. So the very first job is a translation: text on the left, integers on the right. That translation is called tokenization, and the component that does it is the tokenizer. Crucially, the tokenizer is not part of the neural network at all. It is a fixed, hand-built lookup table that sits outside the model, and every model ships with exactly one.") +
        '">A transformer is a pile of matrix multiplications, and matrix multiplication only works on numbers. So the very first job is a translation: <strong>text on the left, integers on the right</strong>. That translation is called <em>tokenization</em>, and the component that does it is the tokenizer. Crucially, the tokenizer is <strong>not part of the neural network</strong> — it is a fixed, hand-built lookup table outside the model.</p>'

        + '<div class="callout insight" data-narrate="' +
        ctx.attr("The tokenizer is the only part of the pipeline that is not learned. It was decided in advance by whoever built the model. This matters, because every quirk of the tokenizer becomes a quirk of the model.") +
        '"><div class="co-label">' + icons.bulb + " Fixed, not learned</div>"
        + "<p>The tokenizer is the <strong>only part of the pipeline that is not learned</strong>. It was decided in advance. Every quirk of the tokenizer becomes a quirk of the model.</p></div>"

        + '<h2 id="what">What counts as a token?</h2>'
        + '<p data-narrate="' +
        ctx.attr("A token is somewhere between a character and a word. Not a whole word, because vocabulary would explode and misspellings would break. Not a single character, because sequences would get absurdly long and attention would have to work much harder. Subwords sit in the sweet spot: common words get their own token, rare words get split into reusable pieces, and nothing is ever impossible to represent.") +
        '">A token is somewhere <em>between a character and a word</em>. Not a whole word — the vocabulary would explode and misspellings would break everything. Not a single character — sequences would get absurdly long and attention would have to work far harder. <strong>Subwords</strong> sit in the sweet spot.</p>'

        + '<figure class="fig"><div class="fig-frame">'
        + '<div class="viz-title">The same sentence at three granularities <span class="sub">"Tokenization"</span></div>'
        + '<div class="grid-3">'
        + '<div class="viz"><div class="viz-title">Characters</div><div class="tokrow">'
        + "Tokenization".split("").map(function (c) { return '<div class="tok w-single"><span class="t-txt">' + c + "</span></div>"; }).join("")
        + '</div><div class="tiny faint" style="margin-top:9px">13 units · vocabulary of 256</div></div>'
        + '<div class="viz"><div class="viz-title">Words</div><div class="tokrow">'
        + '<div class="tok w-long"><span class="t-txt">Tokenization</span></div>'
        + '</div><div class="tiny faint" style="margin-top:9px">1 unit · needs a vocabulary of millions</div></div>'
        + '<div class="viz"><div class="viz-title">Subwords</div><div class="tokrow">'
        + ["Token", "ization"].map(function (c, i) { return '<div class="tok ' + (i ? "alt" : "") + '"><span class="t-txt">' + c + "</span><span class=\"t-id\">" + (400 + i * 137) + "</span></div>"; }).join("")
        + '</div><div class="tiny faint" style="margin-top:9px">2 units · vocabulary of ~50k–200k</div></div>'
        + "</div>"
        + '<div class="figcap"><b>Figure 1.1</b> — The trade-off. Characters give a tiny vocabulary but long sequences. Words give short sequences but a vocabulary that cannot cover every word ever written. Subwords balance both.</div>'
        + "</div></figure>"

        + '<h2 id="try">Try it: the tokenizer, live</h2>'
        + '<p data-narrate="' +
        ctx.attr("Type anything into the box. Every coloured chip below is one token, and the small grey number underneath is the integer ID the model actually receives. Note how a leading space is baked into the token itself. In most modern tokenizers, the token for space plus cat is a completely different entry from the token for cat alone.") +
        '">Type anything below. Every chip is one token; the small number underneath is the integer ID the model actually receives. Note that a <strong>leading space is baked into the token</strong> — in most modern tokenizers, <code> cat</code> is a completely different entry from <code>cat</code>.</p>'

        + '<div class="ix"><div class="ix-head"><span class="ix-badge">Interactive</span>'
        + '<span class="ix-title">Live subword tokenizer</span>'
        + '<span class="ix-hint">vocabulary: ' + n.toLocaleString() + " tokens</span></div>"
        + '<div class="ix-body">'
        + '<div class="tok-input-row"><textarea id="tkInput" spellcheck="false">The cat sat on the mat.</textarea></div>'
        + '<div class="tok-samples">' + SAMPLES.map(function (s, i) {
          return '<button class="tok-sample" data-s="' + i + '">' + ctx.esc(s.length > 34 ? s.slice(0, 32) + "…" : s) + "</button>";
        }).join("") + "</div>"
        + '<div class="stat-row" id="tkStats"></div>'
        + '<div id="tkOut"></div>'
        + '<div class="tiny faint">This is a real tokenizer implemented in this page: GPT-2 style pre-tokenization plus a greedy longest-match merge over a hand-built vocabulary of ' + n.toLocaleString() + " entries. Production tokenizers learn their merges from data and carry 50,000 to 200,000 entries, but the shape of the output is the same."
        + "</div></div>"
        + '<div class="ix-foot"><span>Green = whole piece</span><span>Violet = subword fragment</span><span>Amber = long fragment</span></div></div>'

        + '<h2 id="bpe">Where the subwords come from: byte-pair encoding</h2>'
        + '<p data-narrate="' +
        ctx.attr("The classic algorithm is called byte pair encoding, and it is almost embarrassingly simple. Start with a vocabulary of individual bytes. Look at a huge pile of training text. Find the pair of adjacent symbols that appears most often, and merge it into a new single symbol. Repeat that merge step tens of thousands of times. The frequent pairs become the tokens, so common words end up with one token each and rare words end up as a chain of familiar pieces.") +
        '">The classic algorithm is <strong>byte-pair encoding</strong>, and it is almost embarrassingly simple. Start with a vocabulary of individual bytes. Scan a huge pile of text. Find the <em>pair of adjacent symbols that appears most often</em> and merge it into a new symbol. Repeat tens of thousands of times.</p>'

        + '<figure class="fig"><div class="fig-frame">'
        + '<div class="viz-title">How a merge table turns letters into tokens</div>'
        + '<div class="bpe-steps">'
        + '<div class="bpe-step"><span class="bs-n">start</span><span class="bs-toks">'
        + ["l", "o", "w", "e", "r"].map(function (c) { return '<span class="bs-tok">' + c + "</span>"; }).join("") + "</span></div>"
        + '<div class="bpe-step"><span class="bs-n">merge l+o</span><span class="bs-toks">'
        + ["lo", "w", "e", "r"].map(function (c) { return '<span class="bs-tok merged">' + c + "</span>"; }).join("") + "</span></div>"
        + '<div class="bpe-step"><span class="bs-n">merge lo+w</span><span class="bs-toks">'
        + ["low", "e", "r"].map(function (c) { return '<span class="bs-tok merged">' + c + "</span>"; }).join("") + "</span></div>"
        + '<div class="bpe-step"><span class="bs-n">merge e+r</span><span class="bs-toks">'
        + ["low", "er"].map(function (c) { return '<span class="bs-tok merged">' + c + "</span>"; }).join("") + "</span></div>"
        + '<div class="bpe-step"><span class="bs-n">now “er”</span><span class="bs-toks">'
        + ["lower", " ","newer", " ","higher"].map(function (c) { return '<span class="bs-tok">' + (c === " " ? "␣" : c) + "</span>"; }).join("")
        + "</span></div>"
        + "</div>"
        + '<div class="figcap"><b>Figure 1.2</b> — Each merge is learned once from global statistics. Because <code>er</code> was merged, it is free inside <code>newer</code> and <code>higher</code> too — that reuse is the whole point of subwords.</div>'
        + "</div></figure>"

        + '<div class="callout note"><div class="co-label">' + icons.info + " Byte-level vs character-level</div>"
        + "<p>Modern tokenizers operate on <strong>bytes</strong>, not Unicode characters. Because every possible byte is in the base vocabulary, <em>no string is ever out of vocabulary</em>. A rare emoji simply costs several tokens instead of one.</p></div>"

        + '<h2 id="whycare">Why tokenization explains the weird behaviour</h2>'
        + '<p data-narrate="' +
        ctx.attr("Once you know the text is really a sequence of subword ids, a pile of famous LLM quirks stops being mysterious and starts being arithmetic.") +
        '">Once you know the text is really a sequence of subword IDs, a pile of famous LLM quirks stops being mysterious and starts being arithmetic.</p>'

        + '<table class="cmp"><thead><tr><th style="width:38%">Symptom</th><th>Cause</th></tr></thead><tbody>'
        + "<tr><td>It cannot count the letters in “strawberry”</td><td>The model never sees <code>s-t-r-a-w-b-e-r-r-y</code>. It sees perhaps <code>str</code> <code>aw</code> <code>berry</code> — three opaque integers. Counting letters requires re-deriving spelling from scratch.</td></tr>"
        + "<tr><td>It is bad at arithmetic</td><td>Numbers are split into arbitrary digit chunks. <code>1234</code> and <code>1235</code> may share no token at all, so “one more” is not a small change in the input.</td></tr>"
        + "<tr><td>Trailing-space sensitivity</td><td><code>“hello”</code> and <code>“hello ”</code> can end in different tokens. The model is genuinely reading different input.</td></tr>"
        + "<tr><td>Non-English text costs more</td><td>Common English words are single tokens; most languages need 2–4 tokens per word. The same idea costs 2–4× more context.</td></tr>"
        + "<tr><td>Prompts end with a space</td><td>A trailing space can force a token boundary, which is why some prompts generate better completions when they end mid-word or with an explicit space.</td></tr>"
        + "</tbody></table>"

        + '<h2 id="ids">From token to ID (and back)</h2>'
        + '<p data-narrate="' +
        ctx.attr("Each token maps to one integer through the vocabulary table. That integer is all the neural network ever sees. To make the numbers concrete: GPT 2 used fifty thousand two hundred and fifty seven tokens, Llama 3 about a hundred and twenty eight thousand, GPT 4 class models something in that range. The IDs themselves carry no meaning. ID 464 is not larger than ID 200 in any useful sense. They are labels, like room numbers.") +
        '">Each token maps to one integer. That integer is <em>all</em> the network ever sees. To make it concrete: GPT-2 used <span class="nowrap">50,257</span> tokens; Llama 3 uses about <span class="nowrap">128,000</span>. The IDs carry <strong>no meaning</strong> — ID 464 is not “larger” than ID 200 in any useful sense. They are labels, like room numbers.</p>'

        + '<div class="callout myth" data-narrate="' +
        ctx.attr("A common myth is that the model reads your prompt as text. It does not. By the time any neural network weight is touched, your prompt is a list of integers and nothing else. The meaning has to be reconstructed from the learned embedding of each of those integers.") +
        '"><div class="co-label">' + icons.myth + " Myth</div>"
        + "<p>The model does not read your prompt as text. By the time any weight is touched, the prompt is a <strong>list of integers</strong>. Meaning is reconstructed from the learned embedding of each integer — which is the next chapter.</p></div>"

        + '<h2 id="recap">Recap</h2>'
        + '<div class="card"><div class="card-title">' + icons.check + " What to remember</div>"
        + "<ul class=\"tight-list\">"
        + "<li>Text is split into <strong>subword tokens</strong> by a fixed, non-learned tokenizer.</li>"
        + "<li>Each token is an integer ID indexing a vocabulary of 50k–200k entries.</li>"
        + "<li>Tokens are <em>not</em> words, <em>not</em> characters, and leading spaces are part of the token.</li>"
        + "<li>Byte-level tokenizers can encode anything, at a variable cost in tokens.</li>"
        + "<li>Most “LLMs are bad at X” stories are really “tokenizers make X expensive” stories.</li>"
        + "</ul></div>"
      );
    },

    mount: function (root, ctx) {
      var input = ctx.q("#tkInput", root);
      var out = ctx.q("#tkOut", root);
      var stats = ctx.q("#tkStats", root);

      function update() {
        var text = input.value;
        var toks = ctx.tokenizer.tokenize(text);
        out.innerHTML = renderTokens(toks);
        var st = ctx.tokenizer.stats(text);
        stats.innerHTML =
          '<div class="stat"><div class="sv">' + st.tokens + '</div><div class="sk">tokens</div></div>'
          + '<div class="stat"><div class="sv">' + st.chars + '</div><div class="sk">characters</div></div>'
          + '<div class="stat"><div class="sv">' + st.words + '</div><div class="sk">words</div></div>'
          + '<div class="stat"><div class="sv">' + (st.ratio ? st.ratio.toFixed(2) : "0") + '</div><div class="sk">chars / token</div></div>';
      }
      input.addEventListener("input", update);
      ctx.qa("[data-s]", root).forEach(function (b) {
        b.addEventListener("click", function () {
          input.value = SAMPLES[Number(b.getAttribute("data-s"))];
          update();
        });
      });
      update();
    }
  });
})();
