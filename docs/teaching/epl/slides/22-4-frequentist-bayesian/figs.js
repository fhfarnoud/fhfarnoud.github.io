// Figures of the 22-4 deck (Frequentist and Bayesian, side by side).  Each
// FIGS entry draws from one parameter object (see ../shared/deck.js).

Object.assign(MACROS, {
  // ## is a literal # inside a KaTeX macro
  '\\cpr': '\\textcolor{##2354A8}{#1}', '\\clk': '\\textcolor{##008000}{#1}',
  '\\cpo': '\\textcolor{##B30000}{#1}', '\\cml': '\\textcolor{##616161}{#1}',
  '\\cpd': '\\textcolor{##762A83}{#1}',
  '\\var': '\\operatorname{Var}', '\\bias': '\\operatorname{Bias}', '\\mse': '\\operatorname{MSE}',
  '\\mle': '\\mathrm{mle}', '\\bet': '\\operatorname{Beta}', '\\gam': '\\operatorname{Gamma}',
  '\\poi': '\\operatorname{Poi}', '\\ber': '\\operatorname{Ber}', '\\expo': '\\operatorname{Exp}',
  '\\pr': '\\Pr', '\\bbR': '\\mathbb{R}', '\\bx': '\\boldsymbol{x}',
  '\\independent': '\\perp\\!\\!\\!\\perp'
});
const MAG = '#C71585';            // postBC magenta: a second posterior
const LIKE_D = '#006600';         // likeC!80!black

// ---------------------------------------------------------------- plot helpers
// y = f(x) on [lo, hi]; the path breaks where the curve leaves the top of the plot.
function curveD(B, f, lo = B.xlo, hi = B.xhi, n = 200) {
  let d = '', pen = false;
  for (let i = 0; i <= n; i++) {
    const x = lo + (hi - lo) * i / n, y = f(x);
    if (y > B.yhi) { pen = false; continue; }
    d += (pen ? 'L' : 'M') + B.X(x).toFixed(1) + ',' + B.Y(Math.max(y, B.ylo)).toFixed(1); pen = true;
  }
  return d;
}
// The region between g (default: the x axis) and f, cut at the top of the plot.
function areaD(B, f, lo = B.xlo, hi = B.xhi, n = 200, g = null) {
  let up = '', dn = '';
  for (let i = 0; i <= n; i++) {
    const x = lo + (hi - lo) * i / n, y = clamp(f(x), B.ylo, B.yhi), y0 = g ? clamp(g(x), B.ylo, B.yhi) : B.ylo;
    up += (i ? 'L' : 'M') + B.X(x).toFixed(1) + ',' + B.Y(y).toFixed(1);
    dn = 'L' + B.X(x).toFixed(1) + ',' + B.Y(y0).toFixed(1) + dn;
  }
  return up + dn + 'Z';
}
// The Beamer `deck` axis style: left and bottom axis lines with arrow tips,
// tick values, the x name centred below and the y name rotated at the left.
function axesLB(root, svg, B, o = {}) {
  const g = el(svg, 'g'), y0 = B.Y(B.ylo), x0 = B.X(B.xlo), key = o.key ?? '';
  arrow(g, x0, y0, B.X(B.xhi) + 14, y0, C.axis, 1.5, 9);
  arrow(g, x0, y0, x0, B.Y(B.yhi) - 14, C.axis, 1.5, 9);
  for (const t of o.xt ?? []) {
    const [v, s] = Array.isArray(t) ? t : [t, minus(t)];
    el(g, 'line', { x1: B.X(v), x2: B.X(v), y1: y0, y2: y0 + 6, stroke: C.axis, 'stroke-width': 1.5 });
    if (s.includes('$')) label(root, key + 'xt' + v, s, B.X(v), y0 + 7, 't', '#555');
    else el(g, 'text', { x: B.X(v), y: y0 + 24, 'text-anchor': 'middle', 'font-size': 17, fill: '#555' }).textContent = s;
  }
  for (const t of o.yt ?? []) {
    const [v, s] = Array.isArray(t) ? t : [t, minus(t)];
    el(g, 'line', { x1: x0 - 6, x2: x0, y1: B.Y(v), y2: B.Y(v), stroke: C.axis, 'stroke-width': 1.5 });
    el(g, 'text', { x: x0 - 9, y: B.Y(v) + 6, 'text-anchor': 'end', 'font-size': 17, fill: '#555' }).textContent = s;
  }
  if (o.xl) label(root, key + 'xl', o.xl, (x0 + B.X(B.xhi)) / 2, y0 + (o.xt?.length ? 30 : 8), 't', '#444');
  if (o.yl) {
    label(root, key + 'yl', o.yl, x0 - (o.yt?.length ? 52 : 18), (y0 + B.Y(B.yhi)) / 2, 'c', '#444');
    root.querySelector(`.lab[data-k="${key}yl"]`).style.transform = 'translate(-50%,-50%) rotate(-90deg)';
  }
  return g;
}
// A filled density: <path class=K+'F'> under <path class=K>.
function densEl(svg, k, color, w = 3, dash = null, op = 0.15) {
  el(svg, 'path', { class: k + 'F', fill: color, 'fill-opacity': op, stroke: 'none' });
  const a = { class: k, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linejoin': 'round' };
  if (dash) a['stroke-dasharray'] = dash;
  el(svg, 'path', a);
}
function setDens(root, k, B, f, lo = B.xlo, hi = B.xhi, opacity = 1, n = 200) {
  attr($(root, k + 'F'), { d: areaD(B, f, lo, hi, n), opacity });
  attr($(root, k), { d: curveD(B, f, lo, hi, n), opacity });
}
// A |<->| bracket between x1 and x2 at height y (pixels).
function bracketD(x1, x2, y, h = 7, L = 9) {
  if (x2 - x1 < 4) return '';
  return `M${x1},${y - h}L${x1},${y + h}M${x2},${y - h}L${x2},${y + h}` +
    arrowD(x2 - 1, y, x1 + 1, y, L) + arrowD(x1 + 1, y, x2 - 1, y, L);
}
// A curly brace from x1 to x2 at height y, opening downward (the tip points down).
function braceD(x1, x2, y, a = 8) {
  const m = (x1 + x2) / 2;
  return `M${x1},${y}Q${x1},${y + a} ${x1 + a},${y + a}L${m - a},${y + a}Q${m},${y + a} ${m},${y + 2 * a}` +
    `Q${m},${y + a} ${m + a},${y + a}L${x2 - a},${y + a}Q${x2},${y + a} ${x2},${y}`;
}
const gamD = (lnc, a, b) => x => x > 0 ? Math.exp(lnc + (a - 1) * Math.log(x) - b * x) : 0;
// A soft box (the Beamer softbox): tinted fill, a darker border, a faint shadow.
function softbox(svg, cx, cy, w, h, color, cls = null) {
  el(svg, 'rect', { x: cx - w / 2 + 2, y: cy - h / 2 + 2, width: w, height: h, rx: 8, fill: '#000', 'fill-opacity': 0.13 });
  el(svg, 'rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 8, fill: '#fff' });
  const a = { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 8, fill: color, 'fill-opacity': 0.1,
    stroke: color, 'stroke-opacity': 0.7, 'stroke-width': 2 };
  if (cls) a.class = cls;
  return el(svg, 'rect', a);
}

// ---------------------------------------------------------------- outline: prior x likelihood -> posterior
FIGS.outline = {
  init(root) {
    const svg = newSvg(root, 480, 170), k = 72, bx = x => 60 + (x + 0.8) * k, by = y => 115 - y * k;
    const bell = (c, sd, h, w, col) => {
      let d = '';
      for (let i = 0; i <= 60; i++) { const x = c - w + 2 * w * i / 60;
        d += (i ? 'L' : 'M') + bx(x).toFixed(1) + ',' + by(h * Math.exp(-((x - c) ** 2) / (2 * sd * sd))).toFixed(1); }
      el(svg, 'path', { d: d + `L${bx(c + w)},${by(0)}L${bx(c - w)},${by(0)}Z`, fill: col, 'fill-opacity': 0.18 });
      el(svg, 'path', { d, fill: 'none', stroke: col, 'stroke-width': 3.5 });
      el(svg, 'line', { x1: bx(c - w), x2: bx(c + w), y1: by(0), y2: by(0), stroke: '#8c8c8c', 'stroke-width': 1.5 });
    };
    bell(0, 0.34, 0.9, 0.8, C.prior); bell(2.1, 0.34, 0.9, 0.8, C.like); bell(4.4, 0.24, 1.3, 0.8, C.post);
    label(root, 'x', '$\\times$', bx(1.05), by(0.35), 'c', C.ink);
    arrow(svg, bx(3.05), by(0.35), bx(3.55), by(0.35), '#666', 2.5, 12);
    label(root, 'p', 'prior', bx(0), by(0) + 6, 't', C.prior);
    label(root, 'l', 'likelihood', bx(2.1), by(0) + 6, 't', C.like);
    label(root, 'q', 'posterior', bx(4.4), by(0) + 6, 't', C.post);
  },
  render() {}
};

// ---------------------------------------------------------------- flat prior: the posterior is the likelihood
const FB = box2d(80, 20, 400, 290, 7, 17, 0, 0.5);
FIGS.flat = {
  duration: 1300,
  init(root) {
    const svg = newSvg(root, 500, 380), B = FB;
    axesLB(root, svg, B, { xt: [8, 10, 12, 14, 16], yt: [[0, '0'], [0.2, '0.2'], [0.4, '0.4']], xl: '$\\theta$', yl: 'relative height' });
    el(svg, 'rect', { x: B.X(7), y: B.Y(0.1), width: B.W, height: B.Y(0) - B.Y(0.1), fill: C.prior, 'fill-opacity': 0.08 });
    el(svg, 'line', { x1: B.X(7), x2: B.X(17), y1: B.Y(0.1), y2: B.Y(0.1), stroke: C.prior, 'stroke-width': 3, 'stroke-dasharray': '9 6' });
    densEl(svg, 'lk', C.like);
    densEl(svg, 'po', C.post, 4.5);
    setDens(root, 'lk', B, x => phi(x, 12, 1));
    label(root, 'fp', 'flat prior', B.X(7.15), B.Y(0.105) - 2, 'bl', C.prior);
    label(root, 'lk', 'likelihood (scaled)', B.X(12), B.Y(0.41), 'b', C.like);
  },
  render(root, p) {
    const B = FB, u = p.p;
    setDens(root, 'po', B, x => (1 - u) * 0.1 + u * phi(x, 12, 1), B.xlo, B.xhi, u > 0.001 ? 1 : 0);
    label(root, 'po', 'posterior $\\cN(12,1)$', B.X(13.3), B.Y(0.3), 'l', C.post, clamp((u - 0.7) / 0.3));
  }
};

// ---------------------------------------------------------------- sigma^2/n, two readings
const TB1 = box2d(80, 10, 390, 130, 8, 16, 0, 0.5), TB2 = box2d(80, 222, 390, 130, 8, 16, 0, 0.5);
const RUG = [11.4, 12.31, 10.05, 12.94, 11.17, 10.88, 12.03, 11.76];
FIGS.tworead = {
  duration: 1500,
  init(root) {
    const svg = newSvg(root, 490, 410), B = TB1, D = TB2;
    axesLB(root, svg, B, { key: 'a', xt: [[11.4, '$\\theta^*$']], yt: [[0, '0'], [0.4, '0.4']], yl: 'density' });
    axesLB(root, svg, D, { key: 'b', xt: [8, 10, 12, 14, 16], yt: [[0, '0'], [0.4, '0.4']], xl: '$\\theta$', yl: 'density' });
    densEl(svg, 'sm', C.mle);
    setDens(root, 'sm', B, x => phi(x, 11.4, 1));
    el(svg, 'line', { x1: B.X(11.4), x2: B.X(11.4), y1: B.Y(0), y2: B.Y(0.5), stroke: C.mle, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' });
    for (const v of RUG) el(svg, 'circle', { class: 'rug', cx: B.X(v), r: 5, fill: C.mle });
    label(root, 'c2', '<b>Chapter 2</b>', B.X(8.1), B.Y(0.5), 'tl', C.mle);
    densEl(svg, 'po', C.post, 4.5);
    el(svg, 'line', { class: 'ybar', x1: D.X(12), x2: D.X(12), y1: D.Y(0), y2: D.Y(0.5), stroke: C.post, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' });
    el(svg, 'circle', { class: 'ydot', cx: D.X(12), cy: D.Y(0), r: 5, fill: C.post });
  },
  render(root, p) {
    const B = TB1, D = TB2;
    $$(root, 'rug').forEach((c, i) => { const u = clamp(p.k - i);
      attr(c, { cy: B.Y(0.035 + (1 - u) * 0.3), opacity: u }); });
    setDens(root, 'po', D, x => p.b * phi(x, 12, 1), D.xlo, D.xhi, p.b > 0.001 ? 1 : 0, 150);
    for (const k of ['ybar', 'ydot']) attr($(root, k), { opacity: p.b });
    label(root, 'yb', '$\\bar y$', D.X(12) + 6, D.Y(0.25), 'l', C.post, p.b);
    label(root, 'n', '$\\cN(12,1)$', D.X(13.3), D.Y(0.3), 'l', C.post, p.b);
    label(root, 'td', '<b>Today</b>', D.X(8.1), D.Y(0.5), 'tl', C.post, p.b);
  }
};

// ---------------------------------------------------------------- tomorrow's travel time: the predictive widens
const PB = box2d(80, 20, 400, 310, 5, 19, 0, 0.5);
FIGS.pred = {
  duration: 1500,
  init(root) {
    const svg = newSvg(root, 500, 400), B = PB;
    axesLB(root, svg, B, { xt: [6, 9, 12, 15, 18], yt: [[0, '0'], [0.2, '0.2'], [0.4, '0.4']], xl: 'travel time', yl: 'density' });
    densEl(svg, 'pd', C.pred);
    el(svg, 'path', { class: 'pdb', stroke: C.pred, fill: C.pred, 'stroke-width': 2.5 });
    densEl(svg, 'po', C.post, 4.5);
    setDens(root, 'po', B, x => phi(x, 12, 1));
    el(svg, 'path', { d: bracketD(B.X(11), B.X(13), B.Y(0.242)), stroke: C.post, fill: C.post, 'stroke-width': 2.5 });
    label(root, 'pm1', '$\\pm1$', B.X(12), B.Y(0.242) - 8, 'b', C.post);
    label(root, 'po', '$\\Theta\\mid y_1^4$<br>$\\sim\\cN(12,1)$', B.X(12.9), B.Y(0.33), 'bl', C.post);
  },
  render(root, p) {
    const B = PB, v = 1 + 4 * p.p, sd = Math.sqrt(v), op = clamp(p.p * 3), lab = clamp((p.p - 0.75) / 0.25);
    setDens(root, 'pd', B, x => phi(x, 12, v), B.xlo, B.xhi, op);
    const yb = B.Y(phi(12 + sd, 12, v));
    attr($(root, 'pdb'), { d: bracketD(B.X(12 - sd), B.X(12 + sd), yb), opacity: op });
    label(root, 'sd', '$\\pm\\sqrt5$<br>$\\approx\\pm2.24$', B.X(9.2), B.Y(0.15), 'br', C.pred, lab);
    label(root, 'pd', '$Y_5\\mid y_1^4$<br>$\\sim\\cN(12,5)$', B.X(14.6), B.Y(0.1), 'bl', C.pred, lab);
  }
};

// ---------------------------------------------------------------- Theta -> past data, tomorrow (and the variance bar)
FIGS.graph = {
  init(root) {
    const bar = JSON.parse(root.dataset.init || '{}').bar;
    const svg = newSvg(root, 440, bar ? 420 : 250);
    const nodes = [[220, 50, C.post, '$\\Theta$'], [95, 200, C.like, 'past data<br>$Y_1^n$'], [345, 200, C.pred, 'tomorrow<br>$Y_{n+1}$']];
    for (const [cx, cy, col] of nodes) softbox(svg, cx, cy, 160, 76, col);
    arrow(svg, 205, 90, 115, 160, '#777', 2.5, 12);
    arrow(svg, 235, 90, 325, 160, '#777', 2.5, 12);
    nodes.forEach(([cx, cy, , s], i) => label(root, 'n' + i, s, cx, cy, 'c', C.ink));
    root.querySelectorAll('.lab').forEach(d => { d.style.textAlign = 'center'; });
    if (!bar) return;
    const u = 76, x0 = 30, y0 = 300, h = 40;
    el(svg, 'rect', { x: x0, y: y0, width: 4 * u, height: h, fill: C.mle, 'fill-opacity': 0.55 });
    el(svg, 'rect', { x: x0 + 4 * u, y: y0, width: u, height: h, fill: C.post });
    el(svg, 'rect', { x: x0 - 5, y: y0 - 5, width: 5 * u + 10, height: h + 10, rx: 3, fill: 'none', stroke: C.pred, 'stroke-width': 3.5 });
    label(root, 'b1', '$\\sigma^2=4$', x0 + 2 * u, y0 + h / 2, 'c', '#fff');
    root.querySelector('.lab[data-k="b1"]').style.textShadow = 'none';
    label(root, 'b2', '$\\sigma^2/n=1$', x0 + 4.5 * u, y0 - 10, 'b', C.post);
    el(svg, 'path', { d: braceD(x0, x0 + 5 * u, y0 + h + 12, 8), fill: 'none', stroke: C.pred, 'stroke-width': 2.5 });
    label(root, 'b3', '$\\sigma^2+\\sigma^2/n=5$', x0 + 2.5 * u, y0 + h + 36, 't', C.pred);
  },
  render() {}
};

// ---------------------------------------------------------------- a proper Gaussian prior
const GB = box2d(80, 20, 400, 290, 7, 15, 0, 0.5);
FIGS.prop = {
  init(root) {
    const svg = newSvg(root, 500, 380), B = GB;
    axesLB(root, svg, B, { xt: [8, 10, 12, 14], yt: [[0, '0'], [0.2, '0.2'], [0.4, '0.4']], xl: '$\\theta$', yl: 'density' });
    densEl(svg, 'pr', C.prior); densEl(svg, 'lk', C.like);
    setDens(root, 'pr', B, x => phi(x, 10, 1)); setDens(root, 'lk', B, x => phi(x, 12, 1));
    label(root, 'pr', 'prior $\\cN(10,1)$', B.X(7.1), B.Y(0.5), 'tl', C.prior);
    label(root, 'lk', 'likelihood (scaled)', B.X(15), B.Y(0.5), 'tr', C.like);
  },
  render() {}
};

// ---------------------------------------------------------------- the parabola f and the bell e^{-f}
const QB1 = box2d(70, 10, 420, 175, -2.2, 3.2, 0, 5), QB2 = box2d(70, 235, 420, 175, -2.2, 3.2, 0, 0.8);
FIGS.parab = {
  duration: 1300,
  init(root) {
    const svg = newSvg(root, 500, 460), B = QB1, D = QB2;
    axesLB(root, svg, B, { key: 'a', yl: '$f(x)$' });
    axesLB(root, svg, D, { key: 'b', xt: [[0, '$b/(2a)$']], yl: '$e^{-f(x)}$' });
    el(svg, 'line', { x1: B.X(0), x2: B.X(0), y1: B.Y(0), y2: B.Y(5), stroke: '#8c8c8c', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' });
    el(svg, 'path', { class: 'par', fill: 'none', stroke: C.mle, 'stroke-width': 4.5 });
    el(svg, 'circle', { cx: B.X(0), cy: B.Y(0.4), r: 6, fill: C.mle });
    label(root, 'cv', 'curvature $2a$', B.X(0.95), B.Y(0.75), 'l', C.mle);
    el(svg, 'line', { class: 'dl', x1: D.X(0), x2: D.X(0), y1: D.Y(0), y2: D.Y(0.8), stroke: '#8c8c8c', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' });
    densEl(svg, 'bell', C.post, 4.5);
  },
  render(root, p) {
    const B = QB1, D = QB2, a = p.a, g = p.g;
    attr($(root, 'par'), { d: curveD(B, x => a * x * x + 0.4, B.xlo, B.xhi, 240) });
    setDens(root, 'bell', D, x => g * Math.exp(-0.4 - a * x * x), D.xlo, D.xhi, g > 0.001 ? 1 : 0, 240);
    attr($(root, 'dl'), { opacity: g });
    label(root, 'var', 'variance $1/(2a)$', D.X(1.05), D.Y(0.42), 'l', C.post, clamp((g - 0.7) / 0.3));
  }
};

// ---------------------------------------------------------------- seesaws: weights on a plank, area proportional to precision
// cfg: lo, hi (plank ends), px (pixels per unit), x0, top (plank top), side (weight side for precision 1,
// as [w, h]), weights(p) -> [{v, w, color}], fulcrum(p), labels(root, p, pos, end).
function seesaw(cfg) {
  const X = v => cfg.x0 + (v - cfg.lo) * cfg.px, PT = cfg.top, PH = 18, GY = PT + PH + cfg.leg;
  return {
    duration: cfg.duration ?? 1600,
    init(root) {
      const svg = newSvg(root, cfg.W, cfg.H);
      el(svg, 'line', { x1: X(cfg.lo) - 10, x2: X(cfg.hi) + 10, y1: GY, y2: GY, stroke: '#8c8c8c', 'stroke-width': 2.5 });
      for (let v = Math.ceil(cfg.lo); v <= cfg.hi; v++) {
        el(svg, 'line', { x1: X(v), x2: X(v), y1: GY, y2: GY + 8, stroke: '#8c8c8c', 'stroke-width': 1.5 });
        el(svg, 'text', { x: X(v), y: GY + 28, 'text-anchor': 'middle', 'font-size': 18, fill: '#555' }).textContent = v;
      }
      el(svg, 'path', { class: 'ful', fill: C.post });
      const g = el(svg, 'g', { class: 'plank' });
      el(g, 'rect', { x: X(cfg.lo), y: PT, width: X(cfg.hi) - X(cfg.lo), height: PH, rx: 3, fill: '#bdbdbd', stroke: '#9e9e9e', 'stroke-width': 1.5 });
      for (let i = 0; i < 2; i++) {
        el(g, 'rect', { class: 'w' + i, rx: 2, 'stroke-width': 2 });
        el(g, 'text', { class: 't' + i, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 'bold', fill: '#fff' });
      }
    },
    render(root, p) {
      const ws = cfg.weights(p), f = cfg.fulcrum(p), s = p.s ?? 1;
      const torque = ws.reduce((t, q) => t + q.w * (q.v - f), 0);
      const ang = s * clamp(torque * 5, -7, 7), px = X(f), py = PT + PH;
      attr($(root, 'plank'), { transform: `rotate(${ang.toFixed(2)} ${px} ${py})` });
      const pos = [];
      ws.forEach((q, i) => {
        const w = cfg.side[0] * Math.sqrt(q.w), h = cfg.side[1] * Math.sqrt(q.w), cx = X(q.v);
        attr($(root, 'w' + i), { x: cx - w / 2, y: PT - h, width: w, height: h, fill: q.color, stroke: q.color });
        const t = $(root, 't' + i), fits = w >= 11 * q.text.length + 6;   // a number too wide for its weight sits above it
        attr(t, { x: cx, y: fits ? PT - h / 2 + 7 : PT - h - 7, fill: fits ? '#fff' : q.color }); t.textContent = q.text;
        const a = ang * Math.PI / 180, dx = cx - px, dy = PT - h / 2 - py;   // the weight's centre, rotated with the plank
        pos.push([px + dx * Math.cos(a) - dy * Math.sin(a), py + dx * Math.sin(a) + dy * Math.cos(a), w]);
      });
      attr($(root, 'ful'), { d: `M${px},${py}L${px - 0.54 * cfg.leg},${GY}L${px + 0.54 * cfg.leg},${GY}Z`, opacity: s });
      cfg.labels(root, p, pos, { X, GY, px, s, end: clamp((s - 0.8) / 0.2) });
    }
  };
}
// The balance point of precisions 1 (prior mean 10) and 1 (ybar 12).
FIGS.seesaw = seesaw({
  lo: 8.88, hi: 13.12, px: 170, x0: 250, top: 70, leg: 64, side: [44, 44], W: 1060, H: 250,
  weights: () => [{ v: 10, w: 1, color: C.prior, text: '1' }, { v: 12, w: 1, color: C.like, text: '1' }],
  fulcrum: p => p.f,
  labels(root, p, pos, o) {
    label(root, 'pm', 'prior mean $\\theta_0=10$', pos[0][0] - pos[0][2] / 2 - 14, pos[0][1], 'r', C.prior);
    label(root, 'yb', '$\\bar y=12$', pos[1][0] + pos[1][2] / 2 + 14, pos[1][1], 'l', C.like);
    label(root, 'q', '<b style="font-size:30px">?</b>', o.X(10.5), o.GY - 34, 'c', '#888', 1 - o.s);
    label(root, 'mu', '$\\mu_1=11$', o.px + 26, o.GY - 34, 'l', C.post, o.end);
    let br = root.querySelector('.brace');
    if (!br) br = el(root.querySelector('svg'), 'path', { class: 'brace', fill: 'none', stroke: '#9e9e9e', 'stroke-width': 2 });
    attr(br, { d: braceD(o.X(10), o.X(11), o.GY + 40, 8), opacity: o.end });
    label(root, 'br', 'precisions $1$ and $1$: halfway', (o.X(10) + o.X(11)) / 2, o.GY + 62, 't', '#444', o.end);
  }
});
// Sixteen days: precision 1 at 10 and n/4 at 12, balanced at mu_1(n) = (40 + 12 n) / (4 + n).
const mu1 = n => (40 + 12 * n) / (4 + n);
FIGS.seesaw16 = seesaw({
  lo: 8.78, hi: 13.22, px: 128, x0: 30, top: 118, leg: 52, side: [24, 32], W: 640, H: 218,
  weights: p => [{ v: 10, w: 1, color: C.prior, text: '1' }, { v: 12, w: p.n / 4, color: C.like, text: fmt(p.n / 4) }],
  fulcrum: p => mu1(p.n),
  labels(root, p, pos, o) {
    label(root, 'mu', `$\\mu_1=${fmt(mu1(p.n))}$`, o.px - 30, o.GY - 22, 'r', C.post);
  }
});

// ---------------------------------------------------------------- narrower than both
const NB = box2d(80, 15, 620, 270, 7, 15, 0, 0.65);
FIGS.three = {
  init(root) {
    const svg = newSvg(root, 760, 390), B = NB;
    axesLB(root, svg, B, { xt: [7, 8, 9, 10, 11, 12, 13, 14, 15], yt: [[0, '0'], [0.2, '0.2'], [0.4, '0.4'], [0.6, '0.6']], xl: '$\\theta$', yl: 'density' });
    densEl(svg, 'pr', C.prior); densEl(svg, 'lk', C.like); densEl(svg, 'po', C.post, 4.5);
    setDens(root, 'pr', B, x => phi(x, 10, 1)); setDens(root, 'lk', B, x => phi(x, 12, 1)); setDens(root, 'po', B, x => phi(x, 11, 0.5));
    label(root, 'pr', 'prior $\\cN(10,1)$', B.X(9.2), B.Y(0.33), 'br', C.prior);
    label(root, 'lk', 'likelihood (scaled)', B.X(12.8), B.Y(0.33), 'bl', C.like);
    label(root, 'po', 'posterior $\\cN(11,1/2)$', B.X(11.45), B.Y(0.58), 'l', C.post);
    const u = 56, x0 = 200, y0 = 345, h = 28;
    label(root, 'pc', 'precision', x0 - 12, y0 + h / 2, 'r', '#666');
    const bars = [[0, 1, C.prior, '1'], [1.6, 1, C.like, '1'], [3.2, 2, C.post, '2']];
    for (const [a, w, col, s] of bars) {
      el(svg, 'rect', { x: x0 + a * u, y: y0, width: w * u, height: h, fill: col });
      label(root, 'b' + a, `$${s}$`, x0 + (a + w / 2) * u, y0 + h / 2, 'c', '#fff');
    }
    label(root, 'plus', '$+$', x0 + 1.3 * u, y0 + h / 2, 'c', C.ink);
    label(root, 'eq', '$=$', x0 + 2.9 * u, y0 + h / 2, 'c', C.ink);
    root.querySelectorAll('.lab[data-k^="b"]').forEach(d => { d.style.textShadow = 'none'; });
  },
  render() {}
};

// ---------------------------------------------------------------- sixteen days: the posterior narrows
const SB = box2d(80, 15, 390, 330, 7, 15, 0, 1);
FIGS.sixteen = {
  duration: 1600,
  init(root) {
    const svg = newSvg(root, 490, 410), B = SB;
    axesLB(root, svg, B, { xt: [8, 10, 12, 14], yt: [[0, '0'], [0.5, '0.5'], [1, '1']], xl: '$\\theta$', yl: 'density' });
    densEl(svg, 'pr', C.prior); densEl(svg, 'p4', MAG); densEl(svg, 'pn', C.post, 4.5);
    setDens(root, 'pr', B, x => phi(x, 10, 1)); setDens(root, 'p4', B, x => phi(x, 11, 0.5));
    label(root, 'pr', 'prior', B.X(9.1), B.Y(0.3), 'br', C.prior);
    label(root, 'p4', 'posterior, $n=4$', B.X(10.75), B.Y(0.56), 'br', MAG);
  },
  render(root, p) {
    const B = SB, m = mu1(p.n), v = 4 / (4 + p.n), s = p.s ?? 1;
    setDens(root, 'pn', B, x => phi(x, m, v), B.xlo, B.xhi, s > 0.001 ? 1 : 0, 300);
    const ly = B.Y(Math.min(0.9 * phi(m, m, v), 0.9)), right = p.n < 10;   // beside the n = 4 label, it moves right
    label(root, 'pn', `posterior, $n=${fmt(p.n, 0)}$`, B.X(right ? m + 0.35 : m - 0.35), ly, right ? 'bl' : 'br', C.post, clamp((s - 0.8) / 0.2));
  }
};

// ---------------------------------------------------------------- mu_1 against n
const MB = box2d(80, 15, 390, 320, 0, 60, 9.5, 12.5);
FIGS.mun = {
  duration: 1800,
  init(root) {
    const svg = newSvg(root, 490, 410), B = MB;
    axesLB(root, svg, B, { xt: [0, 20, 40, 60], yt: [10, 11, 12], xl: '$n$ (days)', yl: '$\\mu_1$' });
    el(svg, 'line', { x1: B.X(0), x2: B.X(60), y1: B.Y(12), y2: B.Y(12), stroke: C.like, 'stroke-width': 3, 'stroke-dasharray': '9 6' });
    el(svg, 'line', { x1: B.X(0), x2: B.X(60), y1: B.Y(10), y2: B.Y(10), stroke: C.prior, 'stroke-width': 3, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round' });
    label(root, 'yb', '$\\bar y=12$', B.X(60), B.Y(12.02) - 2, 'br', C.like);
    label(root, 't0', '$\\theta_0=10$', B.X(60), B.Y(10.02) - 2, 'br', C.prior);
    el(svg, 'path', { class: 'mu', fill: 'none', stroke: C.post, 'stroke-width': 4.5 });
    el(svg, 'circle', { class: 'm4', cx: B.X(4), cy: B.Y(11), r: 6, fill: C.post });
    el(svg, 'circle', { class: 'm16', cx: B.X(16), cy: B.Y(11.6), r: 6, fill: C.post });
  },
  render(root, p) {
    const B = MB, N = p.N;
    attr($(root, 'mu'), { d: N > 0.01 ? curveD(B, mu1, 0, N, 200) : '' });
    attr($(root, 'm4'), { opacity: N >= 4 ? 1 : 0 });
    attr($(root, 'm16'), { opacity: N >= 16 ? 1 : 0 });
    label(root, 'n4', '$n=4$', B.X(4) + 6, B.Y(11) + 6, 'tl', C.ink, N >= 4 ? 1 : 0);
    label(root, 'n16', '$n=16$', B.X(16) - 6, B.Y(11.6) - 6, 'br', C.ink, N >= 16 ? 1 : 0);
    label(root, 'mu', 'posterior mean $\\mu_1$', B.X(60), B.Y(11.72), 'tr', C.post, clamp((N - 50) / 10));
  }
};

// ---------------------------------------------------------------- shrinkage lines
const KB = box2d(80, 15, 350, 350, -3, 3, -3, 3), ARR = [-2.5, -1.5, 1.5, 2.5];
FIGS.shrink = {
  enter: { e: 0 },
  duration: 1600,
  init(root) {
    const svg = newSvg(root, 580, 430), B = KB;
    el(svg, 'line', { x1: B.X(-3), x2: B.X(3), y1: B.Y(0), y2: B.Y(0), stroke: '#dcdcdc', 'stroke-width': 1.5 });
    el(svg, 'line', { x1: B.X(0), x2: B.X(0), y1: B.Y(-3), y2: B.Y(3), stroke: '#dcdcdc', 'stroke-width': 1.5 });
    axesLB(root, svg, B, { xt: [-2, 0, 2], yt: [-2, 0, 2], xl: '$\\bar y$', yl: 'estimate' });
    el(svg, 'line', { x1: B.X(-3), y1: B.Y(-3), x2: B.X(3), y2: B.Y(3), stroke: C.mle, 'stroke-width': 4.5 });
    el(svg, 'line', { class: 'l16', stroke: C.post, 'stroke-width': 4.5 });
    el(svg, 'line', { class: 'l4', stroke: MAG, 'stroke-width': 4.5 });
    for (let i = 0; i < ARR.length; i++) el(svg, 'path', { class: 'ar' + i, stroke: MAG, fill: MAG, 'stroke-width': 2.5 });
    label(root, 'ml', '$\\hat\\theta_{\\mle}$', B.X(3) + 8, B.Y(3), 'l', C.mle);
  },
  render(root, p) {
    const B = KB, e = p.e ?? 1, k4 = 1 - e * (1 - p.t / (p.t + 1)), k16 = 1 - e * (1 - p.t / (p.t + 0.25));
    attr($(root, 'l16'), { x1: B.X(-3), y1: B.Y(-3 * k16), x2: B.X(3), y2: B.Y(3 * k16) });
    attr($(root, 'l4'), { x1: B.X(-3), y1: B.Y(-3 * k4), x2: B.X(3), y2: B.Y(3 * k4) });
    ARR.forEach((v, i) => attr($(root, 'ar' + i), { d: arrowD(B.X(v), B.Y(v), B.X(v), B.Y(k4 * v), 11) }));
    const y16 = Math.max(B.Y(3 * k16), B.Y(3) + 26), y4 = Math.max(B.Y(3 * k4), y16 + 26);   // labels kept apart
    label(root, 'l16', '$\\hat\\theta_B$, $n=16$', B.X(3) + 8, y16, 'l', C.post);
    label(root, 'l4', '$\\hat\\theta_B$, $n=4$', B.X(3) + 8, y4, 'l', MAG);
  }
};

// ---------------------------------------------------------------- the dot strip: each MLE value and its Bayes value
const YS = [1.00, 1.91, -0.35, 2.54, 0.77, 0.48, 1.63, 1.36, 0.23, 1.49, 0.01, 1.94, 1.04, 1.07, 0.53, 1.73, 0.59, -0.33, -0.83, 3.34];
const SX = v => 40 + (v + 1.1) * 100, SU = 80, SL = 250;   // upper and lower strips
FIGS.strip = {
  duration: 2400,
  init(root) {
    const svg = newSvg(root, 520, 420);
    el(svg, 'line', { x1: SX(-1.1), x2: SX(3.6), y1: SU, y2: SU, stroke: '#bdbdbd', 'stroke-width': 1.5 });
    el(svg, 'line', { x1: SX(-1.1), x2: SX(3.6), y1: SL, y2: SL, stroke: '#bdbdbd', 'stroke-width': 1.5 });
    YS.forEach((y, i) => el(svg, 'line', { class: 'ln' + i, x1: SX(y), y1: SU, stroke: '#9e9e9e', 'stroke-width': 1 }));
    el(svg, 'line', { x1: SX(1), x2: SX(1), y1: SL + 16, y2: SU - 26, stroke: '#4d4d4d', 'stroke-width': 2, 'stroke-dasharray': '7 5' });
    label(root, 'th', '$\\theta^*=1$', SX(1) - 2, SU - 28, 'bl', '#333');
    for (let t = -1; t <= 3; t++) {
      el(svg, 'line', { x1: SX(t), x2: SX(t), y1: SL + 5, y2: SL + 12, stroke: '#777', 'stroke-width': 1.5 });
      el(svg, 'text', { x: SX(t), y: SL + 32, 'text-anchor': 'middle', 'font-size': 17, fill: '#555' }).textContent = minus(t);
    }
    YS.forEach(y => el(svg, 'circle', { cx: SX(y), cy: SU, r: 5.5, fill: C.mle }));
    YS.forEach(() => el(svg, 'circle', { class: 'bd', r: 5.5, fill: C.post }));
    label(root, 'ml', '$\\hat\\theta_{\\mle}=\\bar y$', SX(-1.2), SU - 10, 'bl', C.mle);
    label(root, 'cap', '<div style="text-align:center;font-size:20px">20 samples, $\\theta^*=1$, $\\sigma^2/n=\\tau_0^2=1$:<br>average squared error<br>1.00 (MLE), 0.50 (Bayes)</div>',
      SX(1.25), SL + 50, 't', '#222');
  },
  render(root, p) {
    const m = p.m;
    $$(root, 'bd').forEach((c, i) => {
      const u = ease(clamp((m - i * 0.025) / 0.5)), y = YS[i];
      attr(c, { cx: SX(lerp(y, y / 2, u)), cy: lerp(SU, SL, u), opacity: u > 0.001 ? 1 : 0 });
      attr($(root, 'ln' + i), { x2: SX(lerp(y, y / 2, u)), y2: lerp(SU, SL, u), opacity: u > 0.001 ? 1 : 0 });
    });
    const end = clamp((m - 0.85) / 0.15);
    label(root, 'b', '$\\hat\\theta_B=\\bar y/2$', SX(1.95), SL - 8, 'bl', C.post, end);
    root.querySelector('.lab[data-k="cap"]').style.opacity = end;
    root.querySelector('.lab[data-k="cap"]').style.visibility = end > 0.01 ? 'visible' : 'hidden';
  }
};

// ---------------------------------------------------------------- MSE as stacked areas: Bias^2 under Var
const EB = box2d(70, 40, 410, 230, 0, 6, 0, 1.6);
const MSE_LAB = {
  1: { b: [0.4, 0.2], v: [4.6, 0.38], min: [1, 0.5], minLab: ['$0.5$', 1.1, 0.47, 'tl'], mse: [2.6, 0.7, 'b'] },
  2: { b: [0.55, 0.45], v: [4.6, 0.38], min: [4, 0.8], minLab: ['$0.8$', 4, 0.76, 't'], mse: [0.75, 1.45, 'l'] }
};
FIGS.mse = {
  duration: 1600,
  init(root) {
    const th = JSON.parse(root.dataset.init).th, svg = newSvg(root, 530, 330), B = EB;
    axesLB(root, svg, B, { xt: [0, 2, 4, 6], yt: [[0, '0'], [0.5, '0.5'], [1, '1'], [1.5, '1.5']], xl: '$\\tau_0^2$', yl: 'error' });
    label(root, 'ti', `$\\theta^*=${th}$`, (B.X(0) + B.X(6)) / 2, 8, 't', C.ink);
    el(svg, 'path', { class: 'va', fill: C.like, 'fill-opacity': 0.22, stroke: 'none' });
    el(svg, 'path', { d: areaD(B, t => th * th / (1 + t) ** 2), fill: C.prior, 'fill-opacity': 0.22, stroke: 'none' });
    el(svg, 'path', { d: curveD(B, t => th * th / (1 + t) ** 2), fill: 'none', stroke: C.prior, 'stroke-width': 3 });
    el(svg, 'path', { class: 'ms', fill: 'none', stroke: C.post, 'stroke-width': 4.5 });
    el(svg, 'line', { x1: B.X(0), x2: B.X(6), y1: B.Y(1), y2: B.Y(1), stroke: C.mle, 'stroke-width': 3, 'stroke-dasharray': '9 6' });
    const L = MSE_LAB[th];
    el(svg, 'circle', { class: 'mn', cx: B.X(L.min[0]), cy: B.Y(L.min[1]), r: 6, fill: C.post });
    label(root, 'b2', '$\\bias^2$', B.X(L.b[0]), B.Y(L.b[1]), 'c', C.prior);
    label(root, 'ml', '$\\mse(\\hat\\theta_{\\mle})$', B.X(6), B.Y(1.01) - 2, 'br', C.mle);
  },
  render(root, p) {
    const th = JSON.parse(root.dataset.init).th, B = EB, a = p.a, L = MSE_LAB[th];
    const b = t => th * th / (1 + t) ** 2, v = t => t * t / (1 + t) ** 2, top = t => b(t) + a * v(t);
    attr($(root, 'va'), { d: areaD(B, top, 0, 6, 200, b) });
    attr($(root, 'ms'), { d: curveD(B, top), opacity: clamp(a * 2) });
    const end = clamp((a - 0.75) / 0.25);
    attr($(root, 'mn'), { opacity: end });
    label(root, 'v', '$\\var$', B.X(L.v[0]), B.Y(L.v[1]), 'c', LIKE_D, end);
    label(root, 'mv', L.minLab[0], B.X(L.minLab[1]), B.Y(L.minLab[2]) + 2, L.minLab[3], C.post, end);
    label(root, 'ms', '$\\mse(\\hat\\theta_B)$', B.X(L.mse[0]), B.Y(L.mse[1]), L.mse[2], C.post, end);
  }
};

// ---------------------------------------------------------------- where the Bayes estimator beats the MLE
const WB = box2d(80, 15, 400, 300, 0, 6, 0, 1.6);
// sigma^2/n = 1: MSE = (th^2 + t^2)/(1 + t)^2, below the MLE for t > (th^2 - 1)/2,
// minimum th^2/(th^2 + 1) at t = th^2.  p.th comes from the steps and the slider.
FIGS.mse2 = {
  duration: 1400,
  init(root) {
    const svg = newSvg(root, 520, 390), B = WB;
    axesLB(root, svg, B, { xt: [0, 2, 4, 6], yt: [[0, '0'], [0.5, '0.5'], [1, '1'], [1.5, '1.5']], xl: '$\\tau_0^2$', yl: 'MSE' });
    el(svg, 'path', { class: 'win', fill: C.post, 'fill-opacity': 0.13 });
    el(svg, 'path', { class: 'bA', fill: C.prior, 'fill-opacity': 0.22, stroke: 'none' });
    el(svg, 'path', { class: 'vA', fill: C.like, 'fill-opacity': 0.22, stroke: 'none' });
    el(svg, 'path', { class: 'bC', fill: 'none', stroke: C.prior, 'stroke-width': 3 });
    el(svg, 'line', { x1: B.X(0), x2: B.X(6), y1: B.Y(1), y2: B.Y(1), stroke: C.mle, 'stroke-width': 3, 'stroke-dasharray': '9 6' });
    el(svg, 'line', { class: 'drop', stroke: C.post, 'stroke-width': 2, 'stroke-dasharray': '4 5' });
    el(svg, 'path', { class: 'cv', fill: 'none', stroke: C.post, 'stroke-width': 4.5 });
    el(svg, 'circle', { class: 'mn', r: 6, fill: C.post });
    label(root, 'm', '$\\hat\\theta_{\\mle}$', B.X(6), B.Y(1.01) - 2, 'br', C.mle);
  },
  render(root, p) {
    const B = WB, th = p.th, s = th * th, b = t => s / (1 + t) ** 2, m = t => (s + t * t) / (1 + t) ** 2;
    attr($(root, 'win'), { d: areaD(B, () => 1, Math.max(0, (s - 1) / 2), 6, 200, m) });
    attr($(root, 'bA'), { d: areaD(B, b, 0, 6, 300) });
    attr($(root, 'vA'), { d: areaD(B, m, 0, 6, 300, b) });
    attr($(root, 'bC'), { d: curveD(B, b, 0, 6, 300) });
    // Bias^2 inside its band when the band is tall enough, else just above the blue curve;
    // Var mid-band, away from the minimum's drop line
    const vt = s > 3.2 ? 2.4 : 4.6;
    if (b(0.45) >= 0.9) label(root, 'b2', '$\\bias^2$', B.X(0.45), B.Y(Math.min(b(0.45), 1.6) / 2), 'c', C.prior);
    else label(root, 'b2', '$\\bias^2$', B.X(2.5), B.Y(b(2.5)) - 4, 'bl', C.prior);
    label(root, 'v', '$\\var$', B.X(vt), B.Y(b(vt) + (m(vt) - b(vt)) / 2), 'c', LIKE_D);
    attr($(root, 'cv'), { d: curveD(B, m, 0, 6, 300) });
    attr($(root, 'mn'), { cx: B.X(s), cy: B.Y(m(s)) });
    attr($(root, 'drop'), { x1: B.X(s), x2: B.X(s), y1: B.Y(m(s)), y2: B.Y(0) });
    label(root, 'ti', `$\\theta^*=${fmt(th)}$`, (B.X(0) + B.X(6)) / 2, 0, 't', C.ink);
    // near the right edge the value goes left of the dot
    const lft = s > 4.5;
    label(root, 'mv', `$${fmt(m(s))}$`, B.X(s) + (lft ? -8 : 8), B.Y(m(s)) + 6, lft ? 'tr' : 'tl', C.post);
    // the curve's name: beside its top end when it leaves the plot, else above its right end
    if (s > 1.5) {
      let lo = 0, hi = s;   // m falls on [0, s]; find m = 1.45
      for (let i = 0; i < 30; i++) { const c = (lo + hi) / 2; if (m(c) > 1.45) lo = c; else hi = c; }
      label(root, 'b', '$\\hat\\theta_B$', B.X(lo) + 10, B.Y(1.45), 'l', C.post);
    } else label(root, 'b', '$\\hat\\theta_B$', B.X(6), B.Y(m(6)) - 5, 'br', C.post);
  }
};

// ---------------------------------------------------------------- Exp(theta): the posterior's exponents come from the prior and the likelihood
// Each posterior exponent symbol (\htmlClass{dX}) starts on top of its source
// (\htmlClass{sX}) and travels straight to its own place, while the source glows.
// One click runs p.f from 0 to 2.  Its first half builds theta's exponent: the
// base appears, the prior's alpha and -1 come down, the likelihood's n drops
// into the gap between them, then the +.  The second half builds e's exponent
// the same way (base and brackets, beta, y, then the +).
const FLY = { a: [['sa', 'da', 0.1], ['s1', 'd1', 0.1], ['sn', 'dn', 0.45]], b: [['sb', 'db', 0.1], ['sy', 'dy', 0.45]] };
FIGS.expfly = {
  duration: 4200, linear: true,   // each symbol eases on its own
  init(root) {
    root.querySelectorAll('[class*="enclosing"]').forEach(e => { e.style.display = 'inline-block'; });
  },
  render(root, p) {
    if (!root.offsetWidth) return;
    const k = root.getBoundingClientRect().width / root.offsetWidth;   // reveal's scale
    for (const step of ['a', 'b']) {
      const v = clamp(step === 'a' ? p.f : p.f - 1);
      root.querySelectorAll(`.g${step}B`).forEach(g => { g.style.opacity = clamp(v / 0.15); });
      root.querySelectorAll(`.g${step}P`).forEach(g => { g.style.opacity = clamp((v - 0.8) / 0.2); });
      for (const [s, d, lag] of FLY[step]) {
        const src = $(root, s), dst = $(root, d);
        dst.style.transform = '';
        const a = src.getBoundingClientRect(), b = dst.getBoundingClientRect();
        const t = clamp((v - lag) / 0.4), u = ease(t);
        dst.style.transform = `translate(${((a.left - b.left) / k * (1 - u)).toFixed(1)}px,${((a.top - b.top) / k * (1 - u)).toFixed(1)}px)`;
        dst.style.opacity = t > 0 ? 1 : 0;
        src.style.textShadow = t > 0 && t < 1 ? `0 0 ${(10 * Math.sin(Math.PI * t)).toFixed(1)}px` : '';
      }
    }
  }
};

// ---------------------------------------------------------------- five waits: Gamma(2,2) to Gamma(7,12)
const XB = box2d(80, 15, 390, 330, 0, 3, 0, 2.2);
FIGS.gam = {
  init(root) {
    const svg = newSvg(root, 500, 410), B = XB;
    axesLB(root, svg, B, { xt: [[0, '0'], [0.5, '0.5'], [1, '1'], [1.5, '1.5'], [2, '2'], [2.5, '2.5'], [3, '3']],
      yt: [[0, '0'], [0.5, '0.5'], [1, '1'], [1.5, '1.5'], [2, '2']], xl: '$\\theta$ (per day)', yl: 'density' });
    densEl(svg, 'pr', C.prior, 3, '9 6'); densEl(svg, 'po', C.post, 4.5);
    setDens(root, 'pr', B, gamD(1.386294, 2, 2), 0.001, 3, 1, 300);
    setDens(root, 'po', B, gamD(10.815095, 7, 12), 0.001, 3, 1, 300);
    label(root, 'pr', 'prior $\\gam(2,2)$', B.X(1.25), B.Y(0.45), 'bl', C.prior);
    label(root, 'po', 'posterior $\\gam(7,12)$', B.X(0.85), B.Y(1.75), 'l', C.post);
  },
  render() {}
};

// ---------------------------------------------------------------- the sufficient-statistic funnel
const UX = x => 200 + x * 100, UY = y => 400 - y * 100;
const CLOUD = [[-1.25, 0.15], [-0.95, 0.5], [-0.7, 0.2], [-0.45, 0.62], [-0.25, 0.3], [0, 0.55], [0.05, 0.1], [0.3, 0.4],
  [0.5, 0.7], [0.62, 0.18], [0.85, 0.5], [1.1, 0.25], [1.25, 0.62], [-1.05, 0.8], [0.2, 0.85], [-0.5, 0.02], [0.95, 0.9]];
FIGS.funnel = {
  duration: 2600,
  init(root) {
    const svg = newSvg(root, 400, 500);
    el(svg, 'path', { d: `M${UX(-1.5)},${UY(2.25)}L${UX(1.5)},${UY(2.25)}L${UX(0.22)},${UY(1.35)}L${UX(0.22)},${UY(1.0)}` +
      `L${UX(-0.22)},${UY(1.0)}L${UX(-0.22)},${UY(1.35)}Z`, fill: '#d9d9d9', 'fill-opacity': 0.6, stroke: '#9e9e9e', 'stroke-width': 2.5, 'stroke-linejoin': 'round' });
    for (const [x, y] of [[-0.5, 1.95], [0.35, 1.85], [-0.05, 1.6], [0.1, 2.05]]) el(svg, 'circle', { cx: UX(x), cy: UY(y), r: 5, fill: C.like });
    CLOUD.forEach(([x, y]) => el(svg, 'circle', { class: 'gh', cx: UX(x), cy: UY(y + 2.35), r: 5.5, fill: C.like }));
    CLOUD.forEach(() => el(svg, 'circle', { class: 'dt', r: 5.5, fill: C.like }));
    label(root, 'dat', '<div style="text-align:center">data $y_1,\\dotsc,y_n$<br>$n$ numbers</div>', UX(0), UY(3.35), 'b', C.like);
    softbox(svg, UX(0), UY(0.85) + 38, 330, 76, C.like, 'tb');
    softbox(svg, UX(0), UY(0.85) + 76 + 35 + 30, 330, 60, C.post);
    arrow(svg, UX(0), UY(1.0), UX(0), UY(0.85) - 2, '#777', 2.5, 11);
    arrow(svg, UX(0), UY(0.85) + 76, UX(0), UY(0.85) + 76 + 33, '#777', 2.5, 11);
    label(root, 't', '<div style="text-align:center">$\\clk{t(y_1^n)=\\sum_ia(y_i)}$<br>fixed size</div>', UX(0), UY(0.85) + 38, 'c', C.ink);
    label(root, 'o', '$\\hat\\theta_{\\mle}$ and $p(\\theta\\mid y_1^n)$', UX(0), UY(0.85) + 141, 'c', C.ink);
  },
  render(root, p) {
    const f = p.f;
    $$(root, 'dt').forEach((c, i) => {
      const [x, y] = CLOUD[i], u = clamp((f - i * 0.03) / 0.5);
      // along a quadratic path: the cloud, the funnel's mouth, its neck
      const ax = UX(x), ay = UY(y + 2.35), bx = UX(x * 0.45), by = UY(2.1), cx = UX(0), cy = UY(1.05);
      const px = (1 - u) ** 2 * ax + 2 * u * (1 - u) * bx + u * u * cx, py = (1 - u) ** 2 * ay + 2 * u * (1 - u) * by + u * u * cy;
      attr(c, { cx: px, cy: py, opacity: 1 - clamp((u - 0.85) / 0.15) });
    });
    $$(root, 'gh').forEach(c => attr(c, { 'fill-opacity': 0.22 * clamp(f * 3) }));
    attr($(root, 'tb'), { 'fill-opacity': 0.1 + 0.18 * f, 'stroke-width': 2 + 1.5 * f });
  }
};

// ---------------------------------------------------------------- Summary icons (the Beamer \sumrow pictures)
const IX = x => 8 + x * 110, IY = y => 58 - y * 110;
const iconCurve = (f, lo, hi, n = 40) => { let d = '';
  for (let i = 0; i <= n; i++) { const x = lo + (hi - lo) * i / n; d += (i ? 'L' : 'M') + IX(x).toFixed(1) + ',' + IY(f(x)).toFixed(1); }
  return d; };
Object.assign(ICONS, {
  gauss(svg) {
    const f = x => 0.2 * Math.exp(-((x - 0.33) ** 2) / 0.04), g = x => 0.44 * Math.exp(-((x - 0.55) ** 2) / 0.008);
    el(svg, 'path', { d: iconCurve(f, 0, 0.85) + 'Z', fill: C.prior, 'fill-opacity': 0.2 });
    el(svg, 'path', { d: iconCurve(f, 0, 0.85), fill: 'none', stroke: C.prior, 'stroke-width': 2.5 });
    el(svg, 'path', { d: iconCurve(g, 0.25, 0.85) + 'Z', fill: C.post, 'fill-opacity': 0.2 });
    el(svg, 'path', { d: iconCurve(g, 0.25, 0.85), fill: 'none', stroke: C.post, 'stroke-width': 3.5 });
    el(svg, 'line', { x1: IX(0), x2: IX(0.85), y1: IY(0), y2: IY(0), stroke: '#8c8c8c', 'stroke-width': 1.5 });
  },
  mse(svg) {
    el(svg, 'line', { x1: IX(0), x2: IX(0.85), y1: IY(0.36), y2: IY(0.36), stroke: C.mle, 'stroke-width': 2.5, 'stroke-dasharray': '6 4' });
    el(svg, 'path', { d: `M${IX(0)},${IY(0.36)}C${IX(0.1)},${IY(0.08)} ${IX(0.3)},${IY(0.1)} ${IX(0.85)},${IY(0.27)}`, fill: 'none', stroke: C.post, 'stroke-width': 3.5 });
    el(svg, 'line', { x1: IX(0), x2: IX(0.85), y1: IY(0), y2: IY(0), stroke: '#8c8c8c', 'stroke-width': 1.5 });
  },
  meet(svg) {
    el(svg, 'line', { x1: IX(0), y1: IY(0.03), x2: IX(0.8), y2: IY(0.22), stroke: C.mle, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    el(svg, 'line', { x1: IX(0), y1: IY(0.42), x2: IX(0.8), y2: IY(0.22), stroke: C.post, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    el(svg, 'circle', { cx: IX(0.8), cy: IY(0.22), r: 4, fill: '#595959' });
  },
  funnel(svg) {
    el(svg, 'path', { d: `M${IX(0)},${IY(0.44)}L${IX(0.5)},${IY(0.44)}L${IX(0.3)},${IY(0.22)}L${IX(0.3)},${IY(0.1)}L${IX(0.2)},${IY(0.1)}L${IX(0.2)},${IY(0.22)}Z`,
      fill: '#e0e0e0', stroke: '#9e9e9e', 'stroke-width': 2 });
    for (const [x, y] of [[0.1, 0.39], [0.22, 0.36], [0.36, 0.4], [0.26, 0.29], [0.4, 0.34]]) el(svg, 'circle', { cx: IX(x), cy: IY(y), r: 2.5, fill: C.like });
    arrow(svg, IX(0.3), IY(0.1), IX(0.55), IY(0.1), '#777', 2, 7);
    el(svg, 'rect', { x: IX(0.58), y: IY(0.19), width: IX(0.82) - IX(0.58), height: IY(0.01) - IY(0.19), fill: C.like, 'fill-opacity': 0.2, stroke: C.like, 'stroke-width': 2 });
  }
});

// The n slider on "the data's weight" also moves the seesaw beside the plot.
document.querySelectorAll('.knobs[data-also]').forEach(k => {
  const other = k.closest('section').querySelector(`.fig[data-fig="${k.dataset.also}"]`);
  k.querySelectorAll('input[data-param]').forEach(inp => inp.addEventListener('input', () =>
    FIGS[other.dataset.fig].render(other, Object.assign(stateFor(other), { [inp.dataset.param]: +inp.value }))));
});
