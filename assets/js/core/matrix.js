/* ==========================================================================
   matrix.js — renders real numeric matrices (bracketed grids of numbers),
   attention heatmaps and small comparison grids.
   ========================================================================== */
(function () {
  "use strict";
  var LLM = (window.LLM = window.LLM || {});
  var esc = LLM.esc, attr = LLM.attr, clamp = LLM.clamp, fmt = LLM.fmt;

  var PRESET = {
    normal: { w: 58, h: 29 },
    compact: { w: 47, h: 25 },
    tight: { w: 41, h: 23 },
    wide: { w: 64, h: 31 },
    narrow: { w: 36, h: 22 }
  };

  /* ---------------- heat colours ----------------
     The colour is applied through CSS custom properties so light/dark
     themes adapt automatically (see components.css .mcell rule).        */
  function heatStyle(v, maxAbs, scheme) {
    if (!isFinite(v)) return "--hp:0%;";
    var a = clamp(Math.abs(v) / (maxAbs || 1), 0, 1);
    var p = (a * 68).toFixed(1) + "%";
    var col = "var(--heat-pos)";
    if (scheme === "attn") col = "var(--heat-attn)";
    else if (scheme === "diverging" && v < 0) col = "var(--heat-neg)";
    return "--hp:" + p + ";--hc:" + col + ";";
  }

  function cellText(v, dec) {
    if (v === Infinity) return "+∞";
    if (v === -Infinity) return "−∞";
    if (!isFinite(v)) return "—";
    if (Math.abs(v) < Math.pow(10, -dec) && v !== 0) return v.toFixed(dec).replace("-", "−");
    return (v < 0 ? "−" : "") + Math.abs(v).toFixed(dec);
  }

  /**
   * Render the numeric grid.
   * rows: [[..]]   opts: {dec, heat, maxAbs, scheme, cls, id, rowHl, colHl, dimRows}
   */
  function render(rows, opts) {
    opts = opts || {};
    var R = rows.length, C = rows[0].length;
    var dec = opts.dec == null ? 2 : opts.dec;
    var preset = PRESET[opts.cls || "normal"] || PRESET.normal;
    var cw = opts.cellw || (C > 10 ? PRESET.tight.w : C > 7 ? PRESET.compact.w : preset.w);
    var ch = opts.cellh || (R > 10 ? PRESET.tight.h : R > 7 ? PRESET.compact.h : preset.h);
    var maxAbs = opts.maxAbs;
    if (maxAbs == null) {
      var mx = 0;
      for (var i = 0; i < R; i++) for (var j = 0; j < C; j++) {
        var a = Math.abs(rows[i][j]);
        if (isFinite(a) && a > mx) mx = a;
      }
      maxAbs = mx || 1;
    }
    var out = [];
    out.push(
      '<div class="matrix ' + (opts.cls || "") + '" id="' + attr(opts.id || "") + '"' +
      ' style="--cols:' + C + ";--rows:" + R + ";--cellw:" + cw + "px;--cellh:" + ch + "px;" +
      (opts.minw ? "--minw:" + opts.minw + "px;" : "") + '">'
    );
    for (var r = 0; r < R; r++) {
      for (var c = 0; c < C; c++) {
        var v = rows[r][c];
        var cls = ["mcell"];
        if (opts.highlight && opts.highlight(r, c)) cls.push("hl");
        else if (opts.rowHl === r) cls.push("row-hl");
        else if (opts.colHl === c) cls.push("col-hl");
        if (opts.dim && opts.dim(r, c)) cls.push("dim");
        if (isFinite(v) && Math.abs(v) >= maxAbs * 0.82) cls.push(v >= 0 ? "pos" : "neg");
        var st = opts.heat === false ? "" : heatStyle(v, maxAbs, opts.scheme);
        out.push(
          '<div class="' + cls.join(" ") + '" data-r="' + r + '" data-c="' + c + '" style="' + st + '">' +
          cellText(v, dec) + "</div>"
        );
      }
    }
    out.push("</div>");
    return out.join("");
  }

  /**
   * Full labelled block: caption + column heads + row heads + numbers.
   * o: {name, desc, shape, rows, rowHeads, colHeads, dec, heat, maxAbs, scheme,
   *     cls, id, note, highlight, rowHl, colHl, dim, rotCols}
   */
  function block(o) {
    var rows = o.rows;
    var R = rows.length, C = rows[0].length;
    var preset = PRESET[o.cls || "normal"] || PRESET.normal;
    var cw = o.cellw || (C > 10 ? PRESET.tight.w : C > 7 ? PRESET.compact.w : preset.w);
    var ch = o.cellh || (R > 10 ? PRESET.tight.h : R > 7 ? PRESET.compact.h : preset.h);
    var vars = "--cols:" + C + ";--rows:" + R + ";--cellw:" + cw + "px;--cellh:" + ch + "px;";

    var html = '<div class="mat-block" ' + (o.blockId ? 'id="' + attr(o.blockId) + '"' : "") + ">";
    html += '<div class="mat-cap">';
    if (o.name) html += "<b>" + o.name + "</b>";
    html += '<span class="shape">' + R + " × " + C + "</span>";
    if (o.desc) html += '<span class="note">' + o.desc + "</span>";
    html += "</div>";

    html += '<div class="mat-scroll"><div class="mat-outer" style="' + vars + '">';
    html += '<div class="mat-corner"></div>';

    html += '<div class="mat-colheads' + (o.rotCols ? " rot" : "") + '">';
    if (o.colHeads) {
      for (var c = 0; c < C; c++) html += "<span>" + esc(o.colHeads[c] == null ? "d" + (c + 1) : o.colHeads[c]) + "</span>";
    }
    html += "</div>";

    html += '<div class="mat-rowheads">';
    if (o.rowHeads) {
      for (var r = 0; r < R; r++) html += "<span>" + esc(o.rowHeads[r] == null ? "r" + (r + 1) : o.rowHeads[r]) + "</span>";
    }
    html += "</div>";

    html += render(rows, {
      dec: o.dec, heat: o.heat, maxAbs: o.maxAbs, scheme: o.scheme, cls: o.cls,
      id: o.id, highlight: o.highlight, rowHl: o.rowHl, colHl: o.colHl, dim: o.dim,
      cellw: cw, cellh: ch
    });
    html += "</div></div></div>";
    return html;
  }

  /** Wrap several blocks in a horizontal flow with arrows. */
  function flow(items, opts) {
    opts = opts || {};
    var html = '<div class="mat-flow">';
    items.forEach(function (it, i) {
      if (i) html += '<div class="mat-arrow">' + (it.arrow || "→") + (it.arrowNote ? "<small>" + esc(it.arrowNote) + "</small>" : "") + "</div>";
      if (typeof it === "string") html += it;
      else html += block(it);
    });
    html += "</div>";
    return html;
  }

  /* ---------------- canvas heatmap ---------------- */
  function paintHeat(canvas, data, o) {
    o = o || {};
    var R = data.length, C = data[0].length;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var pad = { l: o.rowLabels ? 62 : 8, t: o.colLabels ? 34 : 10, r: 10, b: 10 };
    var avail = canvas.parentElement.clientWidth || 360;
    var gap = 2;
    var cw = (avail - pad.l - pad.r - gap * (C - 1)) / C;
    var chh = Math.min(o.cellHeight || 30, cw * (o.aspect || 1));
    var W = pad.l + pad.r + cw * C + gap * (C - 1);
    var H = pad.t + pad.b + chh * R + gap * (R - 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var cs = getComputedStyle(document.documentElement);
    var theme = document.documentElement.getAttribute("data-theme");
    var textMuted = cs.getPropertyValue("--faint").trim() || "#7b86d1";
    var accentCyan = "#22d3ee";
    var accentWarm = "#f5a524";
    var accentBlue = "#60a5fa";
    var maxAbs = o.maxAbs;
    if (maxAbs == null) {
      maxAbs = 0;
      for (var i = 0; i < R; i++) for (var j = 0; j < C; j++) {
        var v0 = Math.abs(data[i][j]);
        if (isFinite(v0) && v0 > maxAbs) maxAbs = v0;
      }
      maxAbs = maxAbs || 1;
    }

    var fontStack = "11px 'JetBrains Mono', ui-monospace, monospace";
    var labels = !!o.values;

    for (var r = 0; r < R; r++) {
      for (var c = 0; c < C; c++) {
        var v = data[r][c];
        var x = pad.l + c * (cw + gap);
        var y = pad.t + r * (chh + gap);
        var t = isFinite(v) ? clamp(Math.abs(v) / maxAbs, 0, 1) : 0;
        var alpha = 0.04 + t * 0.92;
        var col;
        if (o.scheme === "diverging") {
          col = v >= 0
            ? "rgba(245,165,36," + alpha.toFixed(3) + ")"
            : "rgba(96,165,250," + alpha.toFixed(3) + ")";
        } else if (o.scheme === "warm") {
          col = "rgba(245,165,36," + alpha.toFixed(3) + ")";
        } else {
          col = "rgba(34,211,238," + alpha.toFixed(3) + ")";
        }
        if (!isFinite(v)) col = theme === "light" ? "rgba(120,130,160,.14)" : "rgba(255,255,255,.045)";
        ctx.fillStyle = col;
        roundRect(ctx, x, y, cw, chh, 4);
        ctx.fill();

        if (labels && cw > 34) {
          ctx.fillStyle = t > 0.55 ? (theme === "light" ? "#0b1220" : "#ffffff") : textMuted;
          ctx.font = fontStack;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          var s = !isFinite(v) ? "—" : Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(2);
          ctx.fillText(s.replace("-", "−"), x + cw / 2, y + chh / 2 + 0.5);
        }
      }
    }

    if (o.colLabels) {
      ctx.fillStyle = textMuted;
      ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      for (var c2 = 0; c2 < C; c2++) {
        var lbl = o.colLabels[c2];
        if (lbl == null) continue;
        ctx.fillText(String(lbl), pad.l + c2 * (cw + gap) + cw / 2, pad.t - 7);
      }
    }
    if (o.rowLabels) {
      ctx.fillStyle = textMuted;
      ctx.font = "10.5px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (var r2 = 0; r2 < R; r2++) {
        var lb = o.rowLabels[r2];
        if (lb == null) continue;
        ctx.fillText(String(lb), pad.l - 8, pad.t + r2 * (chh + gap) + chh / 2);
      }
    }
    if (o.outline) {
      ctx.strokeStyle = "rgba(139,123,255,.55)";
      ctx.lineWidth = 1.6;
      roundRect(ctx, pad.l + o.outline.c * (cw + gap) - 1, pad.t + o.outline.r * (chh + gap) - 1, cw + 2, chh + 2, 5);
      ctx.stroke();
    }
    var meta = { cw: cw, chh: chh, pad: pad, gap: gap, W: W, H: H };
    canvas._meta = meta;
    return meta;
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    r = Math.min(Math.abs(r), w / 2, h / 2);
    if (r < 0) r = 0;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** A legend strip for heat scales */
  function legend(low, mid, high) {
    return '<div class="heat-legend"><span>' + esc(low) + '</span><span class="heat-bar"></span><span>' + esc(high) + "</span></div>";
  }

  LLM.matrix = {
    render: render,
    block: block,
    flow: flow,
    legend: legend,
    heatStyle: heatStyle,
    paintHeat: paintHeat,
    roundRect: roundRect,
    cellText: cellText,
    PRESET: PRESET
  };
})();
