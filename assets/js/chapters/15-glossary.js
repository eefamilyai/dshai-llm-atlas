/* ==========================================================================
   15-glossary.js — searchable reference
   ========================================================================== */
(function () {
  "use strict";
  var LLM = window.LLM;

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  var TERMS = [
    ["Activation function", "Attention", "A non-linear function applied element-wise inside a network. Without one, stacked linear layers collapse into a single linear map. GELU and ReLU are the common choices."],
    ["Adam", "Training", "The default optimiser for almost every modern LLM. Keeps a running average of the gradient and of the squared gradient, giving each parameter its own adaptive step size."],
    ["Attention", "Transformer", "The mechanism that lets every token look at every other token. Each token emits a query, a key and a value; queries are dotted with keys to score relevance, softmaxed into weights, and used to blend values."],
    ["Attention head", "Transformer", "One independent attention computation within a layer. Heads split the model width, each producing its own attention matrix over the same tokens."],
    ["Autoregressive", "Generation", "Generating output one token at a time, where each generated token is appended to the input for the next step."],
    ["Backpropagation", "Training", "The algorithm that computes the gradient of the loss with respect to every parameter, by applying the chain rule backwards through the computation graph."],
    ["Batch size", "Training", "How many sequences are processed together before one optimiser step. Larger batches give less noisy gradients."],
    ["Beam search", "Generation", "Keeping several partial sequences alive at once and choosing the highest total log-probability. Good for translation, bland for creative writing."],
    ["BPE (byte-pair encoding)", "Tokens", "A subword tokenization algorithm. Start with bytes, repeatedly merge the most frequent adjacent pair, and the merges become the vocabulary."],
    ["Causal mask", "Transformer", "A mask that sets attention scores for future tokens to −∞, so position i can only attend to positions ≤ i. Required for autoregressive training."],
    ["Chinchilla scaling", "Training", "The empirical finding that compute-optimal training uses roughly 20 tokens per parameter, rather than making the model ever larger on fixed data."],
    ["Context window", "Generation", "The maximum number of tokens the model can condition on at once. Cost grows with the square of this number inside attention."],
    ["Cross-entropy loss", "Training", "The training objective: −log of the probability assigned to the correct next token, averaged over all tokens."],
    ["Decoder / Encoder", "Architecture", "An encoder reads a whole sequence bidirectionally; a decoder generates left to right with a causal mask. GPT-style LLMs are decoder-only."],
    ["DPO (Direct Preference Optimisation)", "Alignment", "A preference-learning method that skips the reward model and optimises the policy directly on pairs of preferred/rejected responses."],
    ["Embedding", "Embeddings", "A learned vector representation of a token. The embedding matrix maps token ids to vectors, one row per vocabulary entry."],
    ["EOS token", "Generation", "A special end-of-sequence token. The model emits it to signal it has finished, which is how the generation loop terminates."],
    ["Feed-forward network (FFN)", "Transformer", "The per-token two-layer MLP inside each block: d → 4d → d with a non-linearity in the middle. Holds roughly two thirds of model parameters."],
    ["GELU", "Transformer", "Gaussian Error Linear Unit. A smooth activation, ≈ 0.5x(1 + tanh(√(2/π)(x + 0.044715x³))). Default in GPT-style models."],
    ["Gradient", "Training", "The vector of partial derivatives of the loss with respect to each parameter. Points in the direction of steepest loss increase."],
    ["Gradient descent", "Training", "Parameter update rule: step in the direction opposite the gradient, scaled by the learning rate."],
    ["Grouped-query attention (GQA)", "Transformer", "Sharing key/value heads across groups of query heads. Shrinks the KV cache with negligible quality loss; standard in modern models."],
    ["Hallucination", "Generation", "Confidently produced text that is not grounded in fact. A consequence of optimising for plausible continuations rather than for truth."],
    ["Induction head", "Transformer", "An attention pattern that finds an earlier occurrence of the current context and attends to what followed it. A named mechanism behind in-context learning."],
    ["Inference", "Generation", "Running a trained model to produce output. Split into prefill (process the prompt) and decode (generate tokens one at a time)."],
    ["KL divergence", "Alignment", "A measure of how different one probability distribution is from another. Used as a penalty in RLHF to keep the policy near the reference model."],
    ["KV cache", "Generation", "Cached key and value tensors for all previously processed tokens. Turns per-step attention from O(n²) into O(n) by never recomputing the past."],
    ["LayerNorm", "Transformer", "Normalises a vector to zero mean and unit variance across its features, then applies learned scale and shift. Normalises per token, not per batch."],
    ["Learning rate", "Training", "The step size in gradient descent. Too high diverges, too low trains slowly. Usually warmed up then decayed."],
    ["Logit", "Output", "A raw, unbounded score for a token before softmax. Only the relative differences between logits matter."],
    ["LoRA", "Training", "Low-rank adaptation. Freezes the base weights and trains a small low-rank update, making fine-tuning cheap."],
    ["Multi-head attention", "Transformer", "Running several attention heads in parallel over different slices of the model width, then concatenating and projecting the results."],
    ["Next-token prediction", "Training", "The sole pre-training objective: given a sequence, predict the following token. Everything a base model can do is downstream of this."],
    ["Parameter", "Training", "One learned number in the model. GPT-3 has 175 billion of them; modern frontier models have well over a trillion."],
    ["Perplexity", "Training", "exp(cross-entropy). Roughly, “how many tokens the model is effectively choosing between”. Lower is better."],
    ["Positional encoding", "Position", "Information injected so the model knows token order. Classic form adds sinusoidal fingerprints; RoPE instead rotates query/key vectors by position."],
    ["Pre-norm", "Transformer", "Applying layer norm before each sub-layer instead of after. Standard in modern models because it leaves the residual gradient path clean."],
    ["Prefill", "Generation", "The first inference pass, where the whole prompt is processed in parallel and the KV cache is filled. Compute-bound."],
    ["Prompt", "Generation", "The input text (and any system instructions) the model conditions on. It is not a program; it is context."],
    ["Quantization", "Training", "Storing weights or activations in fewer bits (8-bit, 4-bit) to reduce memory and increase throughput, at some cost in quality."],
    ["Query, Key, Value", "Transformer", "Three learned linear projections of the same input. Queries ask, keys advertise, values carry content. Attention scores are query·key; the output is a weighted sum of values."],
    ["Residual connection", "Transformer", "x = x + f(x). Adds a sub-layer's output to its input instead of replacing it, giving gradients a clean path and making identity the default."],
    ["Reward hacking", "Alignment", "The optimiser finding inputs that score high on the reward model but are bad by human judgement. Mitigated by a KL penalty to a reference model."],
    ["RLHF", "Alignment", "Reinforcement learning from human feedback. Train a reward model on human comparisons, then optimise the policy against it with a KL constraint."],
    ["RMSNorm", "Transformer", "LayerNorm without mean subtraction: divide by the root mean square. Cheaper, works as well, used by the Llama family."],
    ["RoPE (rotary position embedding)", "Position", "Encodes position by rotating query and key vectors by a position-scaled angle, so their dot product depends only on relative distance."],
    ["Sampling", "Generation", "Drawing a token from the output distribution. All the randomness in an LLM lives here, not in the weights."],
    ["Scaling laws", "Training", "The empirical power-law relationship between loss and model size, data size and compute. The basis for planning large training runs."],
    ["SFT (supervised fine-tuning)", "Alignment", "Training on human-written instruction→response examples so the model adopts the format and tone of an assistant."],
    ["Softmax", "Output", "Turns arbitrary scores into a probability distribution: exponentiate each, then divide by the sum."],
    ["Sycophancy", "Alignment", "The tendency of preference-tuned models to agree with the user rather than be accurate. A direct consequence of optimising against human preferences."],
    ["Temperature", "Generation", "Divides logits before softmax. Below 1 sharpens the distribution, above 1 flattens it. Never changes the ranking of tokens."],
    ["Token", "Tokens", "The atomic unit a model reads: a subword piece, roughly three quarters of a word. Vocabulary sizes run from 50k to 200k."],
    ["Top-k / top-p sampling", "Generation", "Truncating the distribution before sampling. Top-k keeps a fixed count; top-p (nucleus) keeps the smallest set covering a given probability mass."],
    ["Transformer", "Transformer", "The architecture underlying every modern LLM: stacked blocks of multi-head attention and feed-forward layers, with residuals and normalisation."],
    ["Vocabulary", "Tokens", "The fixed set of tokens a model can read and write. Anything outside it must be expressed as several tokens."],
    ["Weight tying", "Output", "Reusing the embedding matrix as the unembedding matrix, transposed. Saves parameters and keeps the geometry consistent in both directions."],
    ["Zero-shot / few-shot", "Generation", "Zero-shot means no examples in the prompt; few-shot means a handful. Both rely on the model's in-context pattern matching, not weight updates."]
  ];

  var TERM_OBJECTS = TERMS.map(function (t) {
    return { term: t[0], chapter: null, slug: slug(t[0]), def: t[2], tag: t[1] };
  });
  LLM.glossaryTerms = TERM_OBJECTS;

  var CHAPTER_LINK = {
    Attention: "attention", "Attention head": "multihead", Multi_head: "multihead",
    Tokens: "tokens", Embeddings: "embeddings", Position: "position",
    Transformer: "block", Output: "logits", Generation: "generation",
    Training: "training", Alignment: "alignment", Architecture: "block"
  };

  LLM.registerChapter({
    id: "glossary",
    part: "synthesis",
    title: "Glossary",
    kicker: "Reference",
    summary: "Every term used in this guide, in plain language. Filter as you read, or search it from the command palette.",
    difficulty: "Reference",
    noProgress: true,
    prose: false,
    keywords: "glossary definitions terms reference index",

    render: function (ctx) {
      TERM_OBJECTS.forEach(function (t) {
        t.chapter = CHAPTER_LINK[t.tag] || "block";
      });
      return (
        '<p class="lede" data-narrate="' +
        ctx.attr("Every term used in this guide, in plain language, sorted alphabetically and filterable. If a word in an earlier chapter slipped past you, this is where to come back to. Use the filter box, or press control K from anywhere on the site to search across the chapters and these definitions at the same time.") +
        '">Every term used in this guide, in plain language, sorted alphabetically and filterable. If a word from an earlier chapter slipped past you, this is where to come back to. Press <span class="kbd">Ctrl</span>+<span class="kbd">K</span> anywhere on the site to search chapters and these definitions at once.</p>'
        + '<div class="gloss-search"><input type="search" id="glossInput" placeholder="Filter ' + TERMS.length + ' terms…" autocomplete="off" spellcheck="false"></div>'
        + '<div class="gloss-list" id="glossList">'
        + TERM_OBJECTS.slice().sort(function (a, b) { return a.term.localeCompare(b.term); }).map(function (t) {
          return '<div class="gloss-item" id="term-' + t.slug + '" data-h="' + ctx.attr((t.term + " " + t.def).toLowerCase()) + '">'
            + '<div class="gloss-term">' + ctx.esc(t.term) + '<span class="tag">' + ctx.esc(t.tag) + "</span></div>"
            + '<div class="gloss-def">' + ctx.esc(t.def) + " <a href=\"#/" + t.chapter + '" class="gloss-link">Read more →</a></div>'
            + "</div>";
        }).join("")
        + "</div>"
        + '<div class="sr-empty" id="glossEmpty" style="display:none">No matching terms.</div>'
      );
    },

    mount: function (root, ctx) {
      var input = ctx.q("#glossInput", root);
      var items = ctx.qa(".gloss-item", root);
      var empty = ctx.q("#glossEmpty", root);
      input.addEventListener("input", function () {
        var v = this.value.trim().toLowerCase();
        var n = 0;
        items.forEach(function (it) {
          var hit = !v || it.getAttribute("data-h").indexOf(v) > -1;
          it.style.display = hit ? "" : "none";
          if (hit) n++;
        });
        empty.style.display = n ? "none" : "";
      });
    }
  });
})();
