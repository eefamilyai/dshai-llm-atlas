/* ==========================================================================
   tokenizer.js — a small, deterministic subword tokenizer.
   Pre-tokenization follows the GPT-2 style regex; within each pre-token we
   do greedy longest-match against a fixed vocabulary (case-insensitive
   fallback for capitalised forms). Behaves like BPE from the outside.
   ========================================================================== */
(function () {
  "use strict";
  var LLM = (window.LLM = window.LLM || {});

  /* ---------------- vocabulary source ---------------- */
  var COMMON = (
    "the of and to in a is that it for on was with as be at by this had not are but from or have " +
    "an they which one you were her all she there would their we him been has when who will more no " +
    "if out so said what up its about into than them can only other new some could time these two may " +
    "then do first any my now such like our over man me even most made after also did many before must " +
    "through back years where much your way well down should because each just those people how too " +
    "little state good very make world still own see men work long get here between both life being " +
    "under never day same another know while last might us great old year off come since against go " +
    "came right used take three help every always night point thing part find give number answer school " +
    "water room mother area money story fact month study book eye job word business issue side kind head " +
    "house service friend father power hour game line end member law car city community name president " +
    "team minute idea kid body information parent face level office door health person art war history " +
    "party result change morning reason research girl guy moment air teacher force education foot boy " +
    "age policy process music market sense nation plan college interest death experience effect use " +
    "class control care field development role effort rate heart drug show leader light voice wife " +
    "police mind price report decision son view relationship town road arm difference value building " +
    "action model season society tax director position player record paper space ground form event " +
    "official matter center couple site project activity star table need court oil situation cost " +
    "industry figure street image phone data computer program system network machine learning language " +
    "text token attention transformer vector matrix weight layer neural deep large small high low fast " +
    "slow better best worst big hot cold warm cool dark heavy strong weak hard soft easy simple complex " +
    "important different similar possible real true false full empty open close start stop begin finish " +
    "build create destroy send receive lose win buy sell keep hold put set bring carry call talk speak " +
    "tell ask read write learn teach think understand remember forget want love hate enjoy prefer try " +
    "test check move turn follow lead grow become seem look feel sound taste smell play run walk jump " +
    "fly swim drive ride sit stand lie sleep wake eat drink cook wash clean cut break fix join split " +
    "add remove push pull throw catch hit kick sat ran ate went saw took gave left told felt found " +
    "thought brought bought caught taught held stood slept spoke wrote drove flew swam won lost sent " +
    "spent built broke chose drank fell grew knew threw wore hid blew drew fought forgot got hung kept " +
    "laid led lent lit meant met paid rode rang rose shook shot showed sang sank sold sought stuck " +
    "struck swept swore swung tore woke bit says goes does has had done doing went gone been doing " +
    "hello hi hey goodbye bye thanks thank please sorry welcome sure okay yeah nope hmm wow oh ah " +
    "language models tokens embeddings embedding attention transformer neural natural processing " +
    "artificial intelligence machine learning deep predict prediction probability probabilities " +
    "distribution sample sampling softmax gradient descent training trained inference generation " +
    "generated context prompt response question answers conversation chat assistant user system human " +
    "alignment fine tuning prompt engineering hallucination parameter parameters billion trillion " +
    "sentence paragraph chapter section example examples idea ideas concept concepts theory science " +
    "math mathematics physics biology chemistry code coding programming software hardware internet " +
    "website browser server database function variable loop array object class method string integer " +
    "float boolean value values numbers datum input output result cat dog bird fish horse cow pig sheep " +
    "mouse rat lion tiger bear wolf fox deer rabbit apple orange banana grape lemon cherry peach pear " +
    "plum berry fruit vegetable bread butter cheese milk coffee tea juice wine beer food meal dinner " +
    "lunch breakfast snack red blue green yellow purple pink brown black white gray grey silver gold " +
    "one two three four five six seven eight nine ten eleven twelve twenty thirty hundred thousand " +
    "million billion zero percent half quarter third word words letter letters king queen prince " +
    "princess woman boy child children animals happy sad angry joyful tired bored excited scared calm " +
    "anxious proud ashamed curious quickly slowly carefully easily clearly simply finally actually " +
    "basically literally running walking talking thinking working reading writing rainbow mountain " +
    "river ocean forest desert island valley lake sky cloud sun moon star stars afternoon evening " +
    "midnight noon today tomorrow yesterday week decade inside outside above below near far everywhere " +
    "nowhere somewhere anywhere although however therefore moreover furthermore nevertheless meanwhile " +
    "otherwise something anything nothing everything someone anyone everyone nobody somebody anybody " +
    "straw berry cat mat hat bat rat fat sat flat that than then them there their " +
    "quick lazy clever bright quiet weird strange gentle harsh sharp dull smooth rough thick thin " +
    "wide narrow tall short huge tiny massive ancient modern future early late young fresh stale safe " +
    "risky cheap expensive rich poor busy free ready simple plain fancy elegant ugly beautiful pretty " +
    "funny serious honest secret public private local global national international digital analog " +
    "smart stupid brave shy kind cruel polite rude humble proud generous selfish patient impatient " +
    "brown green orange purple yellow pink black white silver golden salty sweet sour bitter spicy " +
    "soft loud silent noisy bright dark clear blurry exact roughly nearly almost barely mostly " +
    "suddenly finally actually simply quickly slowly carefully easily clearly quietly loudly gently " +
    "fox jump jumps jumped jumping lazy clever funny happy quickly slowly dogs cats kittens puppies " +
    "cars trucks laptops phones kings queens men women princes princesses"
  ).split(/\s+/);

  var SUFFIX = (
    "ing ed er ers est ly tion tions sion sions ment ments ness ity ities ize ized izing ism ist ists " +
    "ous ful less able ible al ial ation ations ance ence ant ent ary ory ive ives en ate ated ic ical " +
    "ish some ward wise hood ship ships age ages ure ures ency ancy ify ified ively ative atively " +
    "ously fully lessly ically ibility ability ture tures cial tial ious eous ology ography izing " +
    "ization isation ational ationally istically ibilities ableness believ liev vab ably ibly ness"
  ).split(" ");

  var PREFIX = ("un re pre dis non in im over under out sub inter trans super anti auto multi semi micro macro co de mis pro en de re un ex extra intra ultra".split(" "));

  var PUNCT = "! \" # $ % & ' ( ) * + , - . / : ; < = > ? @ [ \\ ] ^ _ ` { | } ~".split(" ");
  var EXTRA = ["…", "—", "–", "“", "”", "‘", "’", "•", "·", "×", "≈", "→", "←", "↑", "↓", "✓", "∞", "•"];

  var CONTRACTIONS = ["'s", "'t", "'re", "'ve", "'m", "'ll", "'d", "n't",
    "’s", "’t", "’re", "’ve", "’m", "’ll", "’d", "n’t"];

  var ACRONYMS = ["LLM", "LLMs", "GPT", "GPU", "CPU", "API", "AI", "ML", "NN", "RNN", "CNN",
    "BERT", "RLHF", "SFT", "DPO", "LoRA", "JSON", "HTML", "CSS", "URL", "SQL", "HTTP", "PDF"];

  /* ---------------- build the vocabulary ---------------- */
  var entries = [];
  var seen = {};
  function add(tok) {
    if (!tok || seen[tok]) return;
    seen[tok] = true;
    entries.push(tok);
  }

  var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  chars.forEach(add);
  PUNCT.forEach(add);
  EXTRA.forEach(add);
  add(" ");
  CONTRACTIONS.forEach(add);

  // digit groups of length 2 and 3, like byte-level BPE vocabularies carry
  for (var d2 = 0; d2 < 100; d2++) add(("0" + d2).slice(-2));
  for (var d3 = 100; d3 < 1000; d3++) add(String(d3));

  function variants(w) {
    add(w);
    add(" " + w);
    add(w.charAt(0).toUpperCase() + w.slice(1));
    add(" " + w.charAt(0).toUpperCase() + w.slice(1));
    if (w.length > 3) add(w.toUpperCase());
    // inflections, so common word forms are single tokens
    if (w.length <= 12 && /^[a-z]+$/.test(w)) {
      var cap = w.charAt(0).toUpperCase() + w.slice(1);
      ["s", "ed", "ing", "er", "ers", "ly"].forEach(function (suf) {
        add(w + suf); add(" " + w + suf);
        add(cap + suf); add(" " + cap + suf);
      });
    }
  }

  COMMON.forEach(variants);
  ACRONYMS.forEach(function (a) { add(a); add(" " + a); });

  SUFFIX.forEach(add);
  PREFIX.forEach(function (p) {
    add(p); add(" " + p);
    add(p.charAt(0).toUpperCase() + p.slice(1));
  });

  ["token", "tokens", "embed", "embedding", "embeddings", "multihead", "logit", "logits",
    "cache", "layernorm", "gelu", "relu", "positional", "decoder", "encoder", "autoregressive",
    "subword", "subwords", "byte", "bytes", "unicode", "emoji", "chatbot", "dataset", "benchmark",
    "quantization", "distillation", "checkpoint", "hyperparameter", "tokenizer", "tokenizers",
    "tokenization", "tokenize", "tokenized", "tokenizing", "vocabulary", "dimension", "dimensions",
    "perplexity", "temperature", "beam", "logprob", "logprobs", "topk", "topp", "context", "window",
    "strawberry", "straw", "berry", "mat", "sat", "bat", "hat", "rat", "fat", "flat", "mat."
  ].forEach(function (t) { add(t); add(" " + t); });

  // stable, realistic-looking ids across the GPT-2 size range
  var vocab = {};
  var used = {};
  entries.forEach(function (t) {
    var h = LLM.math.hash(t);
    var id = 260 + (h % 49800);
    var guard = 0;
    while (used[id] && guard++ < 20000) id = id + 1 > 50056 ? 260 : id + 1;
    used[id] = true;
    vocab[t] = id;
  });

  var has = function (s) { return Object.prototype.hasOwnProperty.call(vocab, s); };

  /* ---------------- encode ---------------- */
  var SPLIT_RE = /['’]s|['’]t|['’]re|['’]ve|['’]m|['’]ll|['’]d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

  function lookup(sub) {
    if (has(sub)) return sub;
    var low = sub.toLowerCase();
    if (low !== sub && has(low)) return low;
    return null;
  }

  function encodeChunk(chunk) {
    var out = [];
    var i = 0, n = chunk.length, guard = 0;
    while (i < n && guard++ < 4000) {
      var matchedKey = null;
      var matchedLen = 0;
      var maxLen = Math.min(18, n - i);
      for (var len = maxLen; len >= 1; len--) {
        var sub = chunk.substr(i, len);
        var k = lookup(sub);
        if (k) { matchedKey = k; matchedLen = len; break; }
      }
      if (!matchedKey) { matchedKey = chunk[i]; matchedLen = 1; }
      out.push({
        text: chunk.substr(i, matchedLen),
        id: has(matchedKey) ? vocab[matchedKey] : -1
      });
      i += matchedLen;
    }
    return out;
  }

  /** tokenize(text) -> [{text, id}] */
  function tokenize(text) {
    text = String(text || "");
    if (!text.length) return [];
    var chunks = text.match(SPLIT_RE) || [];
    var out = [];
    chunks.forEach(function (chunk) {
      encodeChunk(chunk).forEach(function (t) { out.push(t); });
    });
    return out;
  }

  function stats(text) {
    var toks = tokenize(text);
    var chars = String(text || "").length;
    return {
      tokens: toks.length,
      chars: chars,
      words: (String(text || "").trim().match(/\S+/g) || []).length,
      ratio: toks.length ? chars / toks.length : 0
    };
  }

  LLM.tokenizer = {
    tokenize: tokenize,
    stats: stats,
    size: entries.length,
    vocab: vocab
  };
})();
