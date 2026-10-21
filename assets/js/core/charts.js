/* ==========================================================================
   charts.js — tiny dependency-free canvas chart engine
   ========================================================================== */
(function () {
  "use strict";
  var LLM = (window.LLM = window.LLM || {});
  var C = {};

  function themeColors() {
    var cs = getComputedStyle(document.documentElement);
    var light = document.documentElement.getAttribute("data-theme") === "light";
    return {
      text: (cs.getPropertyValue("--muted") || "").trim() || "#8d97ae",
      faint: (cs.getPropertyValue("--faint") || "").trim() || "#626d84",
      line: (cs.getPropertyValue("--line") || "").trim() || "rgba(255,255,255,.09)",
      grid: light ? "rgba(16,24,48,.085)" : "rgba(255,255,255,.075)",
      axis: light ? "rgba(16,24,48,.22)" : "rgba(255,255,255,.18)",
      light: light
    };
  }
  C.themeColors = themeColors;

  var PALETTE = ["#8b7bff", "#22d3ee", "#f5a524", "#f472b6", "#34d399", "#60a5fa", "#f87171"];

  function setup(canvas, h) {
    var parent = canvas.parentElement;
    var W = Math.max(200, parent.clientWidth || 320);
    var H = h || 190;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    return { ctx: ctx, W: W, H: H };
  }
  C.setup = setup;

  function niceTicks(min, max, count) {
    if (min === max) { min -= 1; max += 1; }
    var span = max - min;
    var step = Math.pow(10, Math.floor(Math.log10(span / (count || 5))));
    var err = (span / (count || 5)) / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var start = Math.ceil(min / step) * step;
    var out = [];
    for (var v = start; v <= max + step * 0.001; v += step) {
      out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
    }
    return out;
  }
  C.niceTicks = niceTicks;

  function label(v) {
    var a = Math.abs(v);
    if (a === 0) return "0";
    if (a >= 10000) return (v / 1000).toFixed(0) + "k";
    if (a >= 100) return v.toFixed(0);
    if (a >= 1) return (Math.round(v * 10) / 10).toString();
    if (a >= 0.01) return v.toFixed(2);
    return v.toExponential(0);
  }

  /**
   * line(canvas, {
   *   series: [{data:[[x,y],...], color, width, fill, dash, dots}],
   *   xDomain, yDomain, xTicks, yTicks, xLabel, yLabel, height,
   *   guide: {x, y}, labels: [{x,y,text,color}], hline: [y], zeroLine
   * })
   */
  C.line = function (canvas, o) {
    o = o || {};
    var S = setup(canvas, o.height || 190);
    var ctx = S.ctx, W = S.W, H = S.H;
    var T = themeColors();
    var pad = { l: o.padLeft || 40, r: 14, t: 14, b: o.padBottom || 26 };
    if (o.yLabel) pad.l = Math.max(pad.l, 46);
    if (o.xLabel) pad.b = Math.max(pad.b, 38);

    var xs = [], ys = [];
    (o.series || []).forEach(function (s) {
      s.data.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
    });
    if (!xs.length) { xs = [0, 1]; ys = [0, 1]; }
    var xd = o.xDomain || [Math.min.apply(null, xs), Math.max.apply(null, xs)];
    var yd = o.yDomain || [Math.min.apply(null, ys), Math.max.apply(null, ys)];
    if (yd[0] === yd[1]) { yd = [yd[0] - 1, yd[1] + 1]; }
    var padY = (yd[1] - yd[0]) * (o.yPad == null ? 0.08 : o.yPad);
    yd = [yd[0] - padY, yd[1] + padY];

    var px = function (x) { return pad.l + ((x - xd[0]) / (xd[1] - xd[0])) * (W - pad.l - pad.r); };
    var py = function (y) { return H - pad.b - ((y - yd[0]) / (yd[1] - yd[0])) * (H - pad.t - pad.b); };

    // grid
    ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "middle";
    var yt = o.yTicks || niceTicks(yd[0], yd[1], o.yTickCount || 4);
    ctx.strokeStyle = T.grid;
    ctx.lineWidth = 1;
    yt.forEach(function (t) {
      var y = py(t);
      if (y < pad.t - 1 || y > H - pad.b + 1) return;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = T.faint;
      ctx.textAlign = "right";
      ctx.fillText(label(t), pad.l - 7, y);
    });
    var xt = o.xTicks || niceTicks(xd[0], xd[1], 5);
    xt.forEach(function (t) {
      var x = px(t);
      if (x < pad.l - 1 || x > W - pad.r + 1) return;
      ctx.fillStyle = T.faint;
      ctx.textAlign = "center";
      ctx.fillText(label(t), x, H - pad.b + 12);
    });

    // axes
    ctx.strokeStyle = T.axis;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t - 2);
    ctx.lineTo(pad.l, H - pad.b);
    ctx.lineTo(W - pad.r, H - pad.b);
    ctx.stroke();

    // zero line
    if (yd[0] < 0 && yd[1] > 0) {
      ctx.strokeStyle = T.axis;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(pad.l, py(0)); ctx.lineTo(W - pad.r, py(0)); ctx.stroke();
      ctx.setLineDash([]);
    }
    (o.hline || []).forEach(function (hy) {
      ctx.strokeStyle = "rgba(245,165,36,.5)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(pad.l, py(hy)); ctx.lineTo(W - pad.r, py(hy)); ctx.stroke();
      ctx.setLineDash([]);
    });

    // series
    (o.series || []).forEach(function (s, si) {
      var col = s.color || PALETTE[si % PALETTE.length];
      if (s.fill) {
        ctx.beginPath();
        ctx.moveTo(px(s.data[0][0]), py(yd[0]));
        s.data.forEach(function (p) { ctx.lineTo(px(p[0]), py(p[1])); });
        ctx.lineTo(px(s.data[s.data.length - 1][0]), py(yd[0]));
        ctx.closePath();
        var g = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
        g.addColorStop(0, hexA(col, 0.28));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.strokeStyle = col;
      ctx.lineWidth = s.width || 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (s.dash) ctx.setLineDash(s.dash);
      s.data.forEach(function (p, i) {
        var x = px(p[0]), y = py(p[1]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      if (s.dots) {
        s.data.forEach(function (p) {
          ctx.beginPath();
          ctx.arc(px(p[0]), py(p[1]), s.dotR || 2.6, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
        });
      }
    });

    // guide lines
    if (o.guide) {
      ctx.strokeStyle = "rgba(34,211,238,.55)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      if (o.guide.x != null) {
        ctx.beginPath(); ctx.moveTo(px(o.guide.x), pad.t); ctx.lineTo(px(o.guide.x), H - pad.b); ctx.stroke();
      }
      if (o.guide.y != null) {
        ctx.beginPath(); ctx.moveTo(pad.l, py(o.guide.y)); ctx.lineTo(W - pad.r, py(o.guide.y)); ctx.stroke();
      }
      ctx.setLineDash([]);
      if (o.guide.dot) {
        ctx.beginPath();
        ctx.arc(px(o.guide.x), py(o.guide.y), 5, 0, Math.PI * 2);
        ctx.fillStyle = "#22d3ee";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    // free labels
    (o.labels || []).forEach(function (l) {
      ctx.fillStyle = l.color || T.text;
      ctx.font = "600 10.5px 'Inter', system-ui, sans-serif";
      ctx.textAlign = l.align || "left";
      ctx.fillText(l.text, px(l.x) + (l.dx || 0), py(l.y) + (l.dy || 0));
    });

    // axis titles
    if (o.xLabel) {
      ctx.fillStyle = T.faint;
      ctx.font = "10.5px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(o.xLabel, pad.l + (W - pad.l - pad.r) / 2, H - 4);
    }
    if (o.yLabel) {
      ctx.save();
      ctx.translate(11, pad.t + (H - pad.t - pad.b) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = T.faint;
      ctx.font = "10.5px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(o.yLabel, 0, 0);
      ctx.restore();
    }
    return { px: px, py: py, xDomain: xd, yDomain: yd };
  };

  /** scatter with optional path */
  C.scatter = function (canvas, o) {
    var pts = o.points || [];
    var xs = pts.map(function (p) { return p.x; });
    var ys = pts.map(function (p) { return p.y; });
    return C.line(canvas, {
      series: [],
      xDomain: o.xDomain || [Math.min.apply(null, xs) - 1, Math.max.apply(null, xs) + 1],
      yDomain: o.yDomain || [Math.min.apply(null, ys) - 1, Math.max.apply(null, ys) + 1],
      height: o.height,
      xLabel: o.xLabel, yLabel: o.yLabel
    });
  };

  function hexA(hex, a) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  C.hexA = hexA;

  /** Build [[x,y]] from y-array */
  C.series = function (ys, x0, dx) {
    x0 = x0 == null ? 0 : x0;
    dx = dx == null ? 1 : dx;
    return ys.map(function (y, i) { return [x0 + i * dx, y]; });
  };

  /**
   * Render a labelled probability bar list into a container element.
   * items: [{label, p, pick, zero}]
   */
  C.probBars = function (container, items, opts) {
    opts = opts || {};
    var maxP = Math.max.apply(null, items.map(function (i) { return i.p; })) || 1;
    var html = items.map(function (it) {
      var w = (it.p / maxP) * 100;
      var cls = "prob-row" + (it.pick ? " pick" : "") + (it.zero ? " zero" : "");
      return (
        '<div class="' + cls + '">' +
        '<div class="pname">' + LLM.esc(it.label) + "</div>" +
        '<div class="ptrack"><div class="pfill" style="width:' + w.toFixed(2) + '%"></div></div>' +
        '<div class="pval">' + (it.p >= 0.0001 ? (it.p * 100).toFixed(2) + "%" : it.p === 0 ? "0%" : "<0.01%") + "</div>" +
        "</div>"
      );
    });
    container.innerHTML = '<div class="prob-list">' + html.join("") + "</div>";
  };

  LLM.chart = C;
})();
