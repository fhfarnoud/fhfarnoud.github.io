// Figures of the Chapter 3 deck "Bayesian Estimation: Priors, Posteriors, MAP".
// Each FIGS entry draws from one parameter object (see ../shared/deck.js).

Object.assign(MACROS, {
  '\\bX': '\\boldsymbol{X}', '\\bx': '\\boldsymbol{x}',
  '\\pr': '\\Pr', '\\var': '\\operatorname{Var}', '\\ber': '\\operatorname{Ber}',
  '\\bin': '\\operatorname{Bin}', '\\uni': '\\operatorname{Uni}', '\\bet': '\\operatorname{Beta}',
  '\\gam': '\\operatorname{Gamma}', '\\poi': '\\operatorname{Poi}',
  '\\argmax': '\\operatorname*{arg\\,max}', '\\independent': '\\perp\\!\\!\\!\\perp',
  // ## is a literal # inside a KaTeX macro
  '\\cpr': '\\textcolor{##2354A8}{#1}', '\\clk': '\\textcolor{##008000}{#1}',
  '\\cpo': '\\textcolor{##B30000}{#1}', '\\cpd': '\\textcolor{##762A83}{#1}',
  '\\cml': '\\textcolor{##616161}{#1}', '\\cmean': '\\textcolor{##8C4614}{#1}',
  '\\cmed': '\\textcolor{##CC8800}{#1}', '\\cmode': '\\textcolor{##C71585}{#1}'
});

// Cool hues for several priors, warm hues for several posteriors and for the
// posterior summaries (slides-preamble.tex); five shades for the rate bands.
const HUE = { priorB: '#008080', priorC: '#0096C7', priorD: '#102666',
  postB: '#C71585', postC: '#CC8800', postD: '#8C4614' };
const MODE = HUE.postB, MED = HUE.postC, MEAN = HUE.postD;
const BAND = ['#FEE391', '#FEC44F', '#FE9929', '#D95F0E', '#993404'];

// ---------------------------------------------------------------- densities
function lgam(x) {   // log Gamma, Lanczos (g = 7)
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgam(1 - x);
  x -= 1; let a = c[0]; const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
const pw = (x, e) => e === 0 ? 1 : x <= 0 ? (e > 0 ? 0 : Infinity) : Math.exp(e * Math.log(x));
const betaPdf = (x, a, b) => Math.exp(lgam(a + b) - lgam(a) - lgam(b)) * pw(x, a - 1) * pw(1 - x, b - 1);
const betaMode = (a, b) => a > 1 && b > 1 ? (a - 1) / (a + b - 2) : a >= b ? 1 : 0;
const gamPdf = (x, a, b) => x <= 0 ? 0 : Math.exp(a * Math.log(b) - lgam(a) + (a - 1) * Math.log(x) - b * x);
const poiPmf = (y, l) => Math.exp(-l + y * Math.log(l) - lgam(y + 1));
const poiTail5 = l => 1 - [0, 1, 2, 3, 4, 5].reduce((s, k) => s + poiPmf(k, l), 0);
// Gamma(a, b) mixture of Poissons: the posterior predictive pmf.
const nbPmf = (y, a, b) => Math.exp(lgam(y + a) - lgam(a) - lgam(y + 1) + a * Math.log(b / (b + 1)) - y * Math.log(b + 1));
function simpson(f, lo, hi, n = 400) {
  const h = (hi - lo) / n; let s = f(lo) + f(hi);
  for (let i = 1; i < n; i++) s += f(lo + i * h) * (i % 2 ? 4 : 2);
  return s * h / 3;
}
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
function mix(c1, c2, u) {
  const a = hex(c1), b = hex(c2);
  return '#' + a.map((v, i) => Math.round(lerp(v, b[i], clamp(u))).toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- plot boxes
function pbox(x0, y0, W, H, xlo, xhi, ylo, yhi) {
  return { x0, y0, W, H, xlo, xhi, ylo, yhi,
    X: x => x0 + (x - xlo) / (xhi - xlo) * W, Y: y => y0 + (yhi - y) / (yhi - ylo) * H };
}
const tick = v => typeof v === 'string' ? v : fmt(v, 3);
// Left and bottom axis lines with outward ticks (the Beamer 'deck' axis style).
function yTicks(g, B, yt, ytl) {
  yt.forEach((v, i) => {
    el(g, 'line', { x1: B.x0 - 5, x2: B.x0, y1: B.Y(v), y2: B.Y(v), stroke: C.axis });
    el(g, 'text', { x: B.x0 - 9, y: B.Y(v) + 5, 'text-anchor': 'end', 'font-size': 16, fill: '#555' })
      .textContent = ytl ? ytl[i] : tick(v);
  });
}
function plotAxes(root, svg, B, o = {}) {
  const g = el(svg, 'g'), k = o.key || '';
  el(g, 'line', { x1: B.x0, x2: B.x0 + B.W, y1: B.y0 + B.H, y2: B.y0 + B.H, stroke: C.axis, 'stroke-width': 1.3 });
  el(g, 'line', { x1: B.x0, x2: B.x0, y1: B.y0, y2: B.y0 + B.H, stroke: C.axis, 'stroke-width': 1.3 });
  (o.xt || []).forEach((v, i) => {
    el(g, 'line', { x1: B.X(v), x2: B.X(v), y1: B.y0 + B.H, y2: B.y0 + B.H + 5, stroke: C.axis });
    if (!o.noxl) el(g, 'text', { x: B.X(v), y: B.y0 + B.H + 21, 'text-anchor': 'middle', 'font-size': 16, fill: '#555' })
      .textContent = o.xtl ? o.xtl[i] : tick(v);
  });
  const yg = el(g, 'g', { class: 'yt' + k });
  yTicks(yg, B, o.yt || [], o.ytl);
  if (o.xlab) label(root, 'xl' + k, o.xlab, B.x0 + B.W / 2, B.y0 + B.H + 28, 't', '#444');
  if (o.ylab) {
    label(root, 'yl' + k, o.ylab, B.x0 - (o.ylabDx ?? 48), B.y0 + B.H / 2, 'c', '#444');
    root.querySelector(`.lab[data-k="yl${k}"]`).style.transform = 'translate(-50%,-50%) rotate(-90deg)';
  }
  if (o.title) label(root, 'ti' + k, o.title, B.x0 + B.W / 2, B.y0 - 8, 'b', C.ink);
  return g;
}
// A curve that stops where it leaves the box; an area under it, clamped.
function cpath(B, f, lo, hi, n = 240) {
  let d = '', pen = false;
  for (let i = 0; i <= n; i++) {
    const x = lo + (hi - lo) * i / n, y = f(x);
    if (!isFinite(y) || y > B.yhi) { pen = false; continue; }
    d += (pen ? 'L' : 'M') + B.X(x).toFixed(1) + ',' + B.Y(y).toFixed(1); pen = true;
  }
  return d;
}
function apath(B, f, lo, hi, n = 240) {
  let d = `M${B.X(lo).toFixed(1)},${B.Y(0).toFixed(1)}`;
  for (let i = 0; i <= n; i++) {
    const x = lo + (hi - lo) * i / n, y = f(x);
    d += 'L' + B.X(x).toFixed(1) + ',' + B.Y(isFinite(y) ? Math.min(y, B.yhi) : B.yhi).toFixed(1);
  }
  return d + `L${B.X(hi).toFixed(1)},${B.Y(0).toFixed(1)}Z`;
}
const DASH = { dashed: '9 6', dense: '6 3', dashdot: '10 5 2 5', dotted: '2 4' };
// A filled density (\dens): area at low opacity, then the curve.
function dens(svg, cls, color, w = 2.5, dash) {
  el(svg, 'path', { class: cls + 'a', fill: color, 'fill-opacity': 0.18, stroke: 'none' });
  el(svg, 'path', { class: cls, fill: 'none', stroke: color, 'stroke-width': w,
    'stroke-dasharray': dash ? DASH[dash] : 'none', 'stroke-linejoin': 'round' });
}
function setDens(root, B, cls, f, lo, hi, op = 1, color) {
  const a = $(root, cls + 'a'), c = $(root, cls);
  attr(a, { d: apath(B, f, lo, hi), 'fill-opacity': 0.18 * op });
  attr(c, { d: cpath(B, f, lo, hi), opacity: op });
  if (color) { attr(a, { fill: color }); attr(c, { stroke: color }); }
}
function line(g, x1, y1, x2, y2, color, w = 1.3, dash, cls) {
  const o = { x1, y1, x2, y2, stroke: color, 'stroke-width': w };
  if (dash) o['stroke-dasharray'] = DASH[dash] || dash;
  if (cls) o.class = cls;
  return el(g, 'line', o);
}
// Vertical bars: one rect per value, class cls + index.
function bars(svg, cls, n, color, fill, w = 1.5) {
  for (let i = 0; i < n; i++) el(svg, 'rect', { class: cls, fill, stroke: color, 'stroke-width': w });
}
function setBar(r, B, x, wd, lo, hi) {
  attr(r, { x: B.X(x - wd / 2), width: B.X(wd) - B.X(0), y: B.Y(hi), height: Math.max(0, B.Y(lo) - B.Y(hi)) });
}
function brace(g, x1, x2, y, amp, color) {   // a horizontal brace opening upward, tip down
  const m = (x1 + x2) / 2, q = amp;
  el(g, 'path', { d: `M${x1},${y}Q${x1},${y + q} ${x1 + q},${y + q}L${m - q},${y + q}Q${m},${y + q} ${m},${y + 2 * q}` +
    `Q${m},${y + q} ${m + q},${y + q}L${x2 - q},${y + q}Q${x2},${y + q} ${x2},${y}`, fill: 'none', stroke: color, 'stroke-width': 1.5 });
}

// ---------------------------------------------------------------- outline picture
function core(svg, x0, y0, s) {   // prior x likelihood -> posterior (\corepicture)
  const bell = (cx, sd, h, color) => {
    let d = '';
    for (let i = 0; i <= 60; i++) { const x = -1 + 2 * i / 60;
      d += (i ? 'L' : 'M') + (x0 + (cx + 0.45 * x) * s).toFixed(1) + ',' + (y0 - h * s * Math.exp(-x * x / (2 * sd * sd))).toFixed(1); }
    el(svg, 'path', { d: d + `L${x0 + (cx + 0.45) * s},${y0}L${x0 + (cx - 0.45) * s},${y0}Z`, fill: color, 'fill-opacity': 0.18 });
    el(svg, 'path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5 });
    el(svg, 'line', { x1: x0 + (cx - 0.5) * s, x2: x0 + (cx + 0.5) * s, y1: y0, y2: y0, stroke: '#999' });
  };
  bell(0, 0.34, 0.8, C.prior); bell(2.1, 0.34, 0.8, C.like); bell(4.4, 0.24, 1.3, C.post);
  const t = (x, y, s2, c, fs = 20) => { const e = el(svg, 'text', { x, y, 'text-anchor': 'middle', 'font-size': fs, fill: c }); e.textContent = s2; };
  t(x0 + 1.05 * s, y0 - 0.25 * s, '×', '#333', 30);
  el(svg, 'path', { d: arrowD(x0 + 3.05 * s, y0 - 0.35 * s, x0 + 3.6 * s, y0 - 0.35 * s, 12), stroke: '#777', fill: '#777', 'stroke-width': 2.5 });
  t(x0, y0 + 26, 'prior', C.prior); t(x0 + 2.1 * s, y0 + 26, 'likelihood', C.like); t(x0 + 4.4 * s, y0 + 26, 'posterior', C.post);
}
FIGS.core = { init(root) { const svg = newSvg(root, 480, 220); core(svg, 50, 160, 82); }, render() {} };

// ---------------------------------------------------------------- traffic road
const RB = () => pbox(80, 40, 420, 250, 0, 1, 0, 2);
const XT = [0, 0.2, 0.4, 0.6, 0.8, 1];
const road = (x) => 210 * pw(x, 6) * pw(1 - x, 4);   // binom(10,6) theta^6 (1-theta)^4
FIGS.road1 = {
  init(root) {
    const svg = newSvg(root, 540, 360), B = RB();
    plotAxes(root, svg, B, { xt: XT, yt: [0, 0.5, 1, 1.5, 2], xlab: '$\\theta$', ylab: '$p(\\theta)$', title: 'Prior' });
    dens(svg, 'pr', C.prior, 2.5); setDens(root, B, 'pr', () => 1, 0, 1);
  },
  render() {}
};
FIGS.road2 = {
  init(root) {
    const svg = newSvg(root, 540, 360), B = pbox(80, 40, 420, 250, 0, 1, 0, 0.3);
    plotAxes(root, svg, B, { xt: XT, yt: [0, 0.1, 0.2, 0.3], xlab: '$\\theta$', ylab: '$p(\\bx|\\theta)$', title: 'Likelihood', ylabDx: 56 });
    dens(svg, 'lk', C.like, 2.5); setDens(root, B, 'lk', road, 0, 1);
    line(svg, B.X(0.6), B.Y(0), B.X(0.6), B.Y(0.251), C.mle, 2, 'dashed');
  },
  render() {}
};
const RB3 = pbox(80, 40, 420, 250, 0, 1, 0, 3);
FIGS.road3 = {
  duration: 1600,
  init(root) {
    const svg = newSvg(root, 540, 360), B = RB3;
    plotAxes(root, svg, B, { xt: XT, yt: [0, 1, 2, 3], xlab: '$\\theta$', ylab: 'density', title: 'Prior and posterior' });
    line(svg, B.X(0), B.Y(1), B.X(1), B.Y(1), C.prior, 2.5, 'dashed').setAttribute('stroke-opacity', 0.6);
    label(root, 'pr', 'prior', B.X(0.03), B.Y(1.03), 'bl', C.prior, 0.8);
    el(svg, 'path', { class: 'ghost', fill: 'none', stroke: C.post, 'stroke-width': 1.8, 'stroke-dasharray': DASH.dense, d: cpath(B, road, 0, 1) });
    el(svg, 'path', { class: 'up', stroke: C.mle, fill: C.mle, 'stroke-width': 2, d: arrowD(B.X(0.96), B.Y(0.12), B.X(0.96), B.Y(1.45), 12) });
    line(svg, B.X(0.27), B.Y(0.56), B.X(0.45), B.Y(0.17), C.post, 1.2, null, 'gl');
    dens(svg, 'po', C.post, 3.5);
  },
  render(root, p) {
    const B = RB3, u = p.u, k = 1 + 10 * u;   // p(x) = 1/11: normalizing multiplies by 11
    setDens(root, B, 'po', x => k * road(x), 0, 1);
    $(root, 'poa').setAttribute('fill-opacity', 0.18 * u);
    attr($(root, 'ghost'), { opacity: u }); attr($(root, 'up'), { opacity: u }); attr($(root, 'gl'), { opacity: u > 0.5 ? 1 : 0 });
    label(root, 'prod', '$p(\\theta)\\,p(\\bx|\\theta)$', B.X(0.6), B.Y(0.3) - 4, 'b', C.post, 1 - u);
    label(root, 'ghost', '$p(\\theta)\\,p(\\bx|\\theta)$', B.X(0.03), B.Y(0.62), 'l', C.post, u > 0.5 ? 1 : 0);
    label(root, 'div', '$\\div\\,p(\\bx)$', B.X(0.96), B.Y(1.45) - 4, 'b', C.mle, u);
    label(root, 'post', 'posterior', B.X(0.46), B.Y(2.45), 'r', C.post, u > 0.5 ? 1 : 0);
  }
};

// ---------------------------------------------------------------- one toss, then three
// The posterior after s observations of H, H, T: Beta(1 + min(s,2), 1 + max(0, s-2)).
const TB = pbox(70, 20, 400, 300, 0, 1, 0, 3.2);
const tossAB = s => [1 + Math.min(s, 2), 1 + Math.max(0, s - 2)];
const tossCol = s => s <= 1 ? HUE.postB : s <= 2 ? mix(HUE.postB, HUE.postC, s - 1) : mix(HUE.postC, C.post, s - 2);
FIGS.toss = {
  duration: 1300,
  init(root) {
    const svg = newSvg(root, 500, 370), B = TB;
    plotAxes(root, svg, B, { xt: XT, yt: [0, 1, 2, 3], xlab: '$\\theta$', ylab: 'density' });
    el(svg, 'path', { class: 'tail', fill: C.post, 'fill-opacity': 0.3, stroke: 'none', d: apath(B, x => 12 * x * x * (1 - x), 0.5, 1) });
    line(svg, B.X(0), B.Y(1), B.X(1), B.Y(1), C.prior, 2.5, 'dashed');
    label(root, 'pr', 'prior', B.X(0.03), B.Y(1.03), 'bl', C.prior);
    el(svg, 'path', { class: 'gh', fill: 'none', stroke: HUE.postB, 'stroke-width': 3.2, 'stroke-dasharray': DASH.dense, d: cpath(B, x => 2 * x, 0, 1) });
    dens(svg, 'po', C.post, 3.5);
    line(svg, 0, 0, 0, 0, C.post, 1.2, null, 'ld');
  },
  render(root, p) {
    const B = TB, [a, b] = tossAB(p.s), col = tossCol(p.s), gh = p.gh || 0;
    attr($(root, 'tail'), { opacity: p.tail || 0 });
    attr($(root, 'gh'), { opacity: gh });
    label(root, 'gh', 'after H', B.X(1), B.Y(2.02), 'br', HUE.postB, gh);
    setDens(root, B, 'po', x => betaPdf(x, a, b), 0, 1, p.cur, col);
    const r = Math.round(p.s), near = p.cur * clamp(1 - 12 * Math.abs(p.s - r));
    const L = { 1: ['after H', 1, 2.02, 'br'], 2: ['after HH', 0.93, 3.0, 'r'], 3: ['after HHT', 0.40, 1.80, 'r'] }[r];
    if (L) label(root, 'po', L[0], B.X(L[1]), B.Y(L[2]), L[3], col, gh && r === 1 ? 0 : near);
    attr($(root, 'ld'), { x1: B.X(0.40) + 2, y1: B.Y(1.80), x2: B.X(0.53), y2: B.Y(1.61), opacity: r === 3 ? near : 0 });
  }
};

// ---------------------------------------------------------------- observed percentages
const OB = pbox(70, 20, 400, 310, 0, 1, 0, 5);
FIGS.obs = {
  init(root) {
    const svg = newSvg(root, 500, 380), B = OB;
    plotAxes(root, svg, B, { xt: XT, yt: [0, 1, 2, 3, 4, 5], xlab: '$\\theta$', ylab: 'density' });
    el(svg, 'path', { fill: C.prior, 'fill-opacity': 0.12, d: apath(B, () => 1, 0, 1) });
    el(svg, 'path', { fill: C.post, 'fill-opacity': 0.3, d: apath(B, () => 1, 0.8, 1) });
    line(svg, B.X(0), B.Y(1), B.X(1), B.Y(1), C.prior, 2.5);
    label(root, 'pr', 'prior', B.X(0.03), B.Y(1.03), 'bl', C.prior);
    line(svg, B.X(0.8), B.Y(0), B.X(0.8), B.Y(5), C.post, 1.5, 'dashed');
    label(root, 'th', '$0.8$', B.X(0.8) - 4, B.Y(4.6), 'r', C.post);
  },
  render(root, p) { label(root, 'v', '<b>0.20</b>', OB.X(0.9), OB.Y(0.5), 'c', C.post, p.v); }
};

// Three panels: each morphs from the uniform prior to its posterior
// Beta(1 + u h, 1 + u t), the tail beyond 0.8 shaded and integrated.
const RK = [[1, 0, 0.9, 1.2], [9, 1, 0.88, 2], [85, 15, 0.84, 3]];   // h, t, leader start
const rkBox = i => pbox(90 + i * 385, 34, 290, 150, 0, 1, 0, 12);
FIGS.rank = {
  duration: 1300,
  init(root) {
    const svg = newSvg(root, 1200, 232);
    RK.forEach(([h, t], i) => {
      const B = rkBox(i);
      plotAxes(root, svg, B, { key: i, xt: [0, 0.5, 1], yt: [0, 6, 12], xlab: '$\\theta$', ylab: i ? null : 'density',
        title: `<span class="cap">$(h,t)=(${h},${t})$</span>` });
      el(svg, 'path', { class: 'tl' + i, fill: C.post, 'fill-opacity': 0.3 });
      dens(svg, 'c' + i, C.post, 2.5);
      line(svg, B.X(0.8), B.Y(0), B.X(0.8), B.Y(12), '#999', 1.5, 'dashed');
      if (!i) label(root, 'e', '$0.8$', B.X(0.8) + 4, B.Y(10.5), 'l', '#555');
      line(svg, 0, 0, 0, 0, C.post, 1.2, null, 'ld' + i);
    });
  },
  render(root, p) {
    RK.forEach(([h, t, lx, ly], i) => {
      const B = rkBox(i), u = p['u' + (i + 1)], a = 1 + u * h, b = 1 + u * t, f = x => betaPdf(x, a, b);
      attr($(root, 'tl' + i), { d: apath(B, f, 0.8, 0.9995) });
      setDens(root, B, 'c' + i, f, 0.0005, 0.9995);
      const pr = simpson(f, 0.8, 1);
      attr($(root, 'ld' + i), { x1: B.X(lerp(0.9, lx, u)), y1: B.Y(lerp(0.5, ly, u)), x2: B.X(0.62), y2: B.Y(7.2) });
      label(root, 'p' + i, `<b>${pr.toFixed(2)}</b>`, B.X(0.55), B.Y(7.2), 'b', C.post);
    });
  }
};

// ---------------------------------------------------------------- sensitivity to the prior
// 80% likes among n viewers; flat Beta(1,1) and skeptic Beta(2,8) priors.
const SB = pbox(70, 40, 420, 270, 0, 1, 0, 12);
FIGS.sens = {
  duration: 1400,
  init(root) {
    const svg = newSvg(root, 520, 370), B = SB;
    plotAxes(root, svg, B, { xt: XT, yt: [], xlab: '$\\theta$', ylab: 'density' });
    el(svg, 'path', { class: 'fp', fill: 'none', stroke: C.prior, 'stroke-width': 2.5 });
    dens(svg, 'sp', HUE.priorB, 2.5, 'dashdot');
    dens(svg, 'fq', C.post, 3.5);
    dens(svg, 'sq', HUE.postB, 3.5, 'dashed');
  },
  render(root, p) {
    const n = Math.pow(10, p.lg), h = 0.8 * n, t = 0.2 * n;
    const pk = (a, b) => betaPdf(betaMode(a, b), a, b);
    const ymax = Math.max(4.2, 1.2 * Math.max(pk(1 + h, 1 + t), pk(2 + h, 8 + t)));
    const B = pbox(SB.x0, SB.y0, SB.W, SB.H, 0, 1, 0, ymax), step = ymax < 9 ? 1 : ymax < 18 ? 2 : ymax < 45 ? 5 : 10;
    const g = $(root, 'yt'); g.replaceChildren();
    const yt = []; for (let v = 0; v <= ymax; v += step) yt.push(v);
    yTicks(g, B, yt);
    attr($(root, 'fp'), { d: cpath(B, () => 1, 0, 1) });
    setDens(root, B, 'sp', x => 72 * x * pw(1 - x, 7), 0, 1);
    setDens(root, B, 'fq', x => betaPdf(x, 1 + h, 1 + t), 0.0005, 0.9995, 1);
    setDens(root, B, 'sq', x => betaPdf(x, 2 + h, 8 + t), 0.0005, 0.9995, 1);
    const mf = betaMode(1 + h, 1 + t), ms = betaMode(2 + h, 8 + t);
    label(root, 'cap', `Priors and posteriors after ${Math.round(n)} viewers`, B.x0 + B.W / 2, B.y0 - 12, 'b', C.ink);
    label(root, 'fp', 'flat prior', B.X(0.4), B.Y(1) - 3, 'b', C.prior);
    label(root, 'sp', 'skeptic prior', B.X(0.13), B.Y(3.55) - 3, 'b', HUE.priorB);
    label(root, 'fq', 'flat posterior', B.X(mf), B.Y(pk(1 + h, 1 + t)) - 4, 'b', C.post);
    const far = mf - ms > 0.3, ps = pk(2 + h, 8 + t);
    if (far) label(root, 'sq', 'skeptic posterior', B.X(ms), B.Y(ps) - 4, 'b', HUE.postB);
    else label(root, 'sq', 'skeptic posterior', B.X(ms) - 12, B.Y(0.55 * ps), 'r', HUE.postB);
  }
};

// ---------------------------------------------------------------- sequential and batch updating
// Road: x = the first 10 days (6 light), x' = the next 40 days (23 light).
const QB = pbox(70, 12, 470, 100, 0, 1, 0, 6.5);
function seqInit(root) {
  const svg = newSvg(root, 580, 150), B = QB;
  plotAxes(root, svg, B, { xt: [0, 0.5, 1], yt: [0, 3, 6], ylab: '<span class="cap">density</span>', ylabDx: 42 });
  label(root, 'xl', '$\\theta$', B.X(1) + 12, B.Y(0), 'l', '#444');
  line(svg, B.X(0), B.Y(1), B.X(1), B.Y(1), C.prior, 2.2, 'dashed');
  label(root, 'pr', 'prior', B.X(0.02), B.Y(1) - 2, 'bl', C.prior);
  el(svg, 'path', { class: 'gh', fill: 'none', stroke: HUE.postC, 'stroke-width': 2.2, 'stroke-dasharray': DASH.dense, d: cpath(B, x => betaPdf(x, 7, 5), 0, 1) });
  dens(svg, 'po', C.post, 3);
}
function seqDraw(root, a, b, op, col) {
  const B = QB;
  setDens(root, B, 'po', x => betaPdf(x, a, b), 0.0005, 0.9995, op, col);
}
FIGS.seqL = {
  duration: 1300, init: seqInit,
  render(root, p) {
    const s = p.s, u = clamp(s), v = clamp(s - 1);
    const a = s <= 1 ? lerp(1, 7, u) : lerp(7, 30, v), b = s <= 1 ? lerp(1, 5, u) : lerp(5, 22, v);
    seqDraw(root, a, b, clamp(s * 3), s <= 1 ? HUE.postC : mix(HUE.postC, C.post, v));
    attr($(root, 'gh'), { opacity: v });
    label(root, 'b1', '$\\bet(7,5)$', QB.X(v > 0.5 ? 0.75 : 0.6), QB.Y(v > 0.5 ? 1.9 : 2.8) - 2, v > 0.5 ? 'l' : 'b', HUE.postC,
      v > 0.5 ? 1 : clamp(1 - 12 * Math.abs(s - 1)));
    label(root, 'b2', '$\\bet(30,22)$', QB.X(0.64), QB.Y(5.6), 'l', C.post, clamp(1 - 12 * Math.abs(s - 2)));
  }
};
FIGS.seqR = {
  duration: 1300, init: seqInit,
  render(root, p) {
    const u = p.s;
    seqDraw(root, lerp(1, 30, u), lerp(1, 22, u), clamp(u * 3), C.post);
    attr($(root, 'gh'), { opacity: 0 });
    label(root, 'b2', '$\\bet(30,22)$', QB.X(0.64), QB.Y(5.6), 'l', C.post, clamp(1 - 12 * Math.abs(u - 1)));
  }
};
ICONS.seqarrows = svg => {
  el(svg, 'path', { d: 'M300,2 C300,20 380,26 452,28', fill: 'none', stroke: '#8c8c8c', 'stroke-width': 2.5 });
  el(svg, 'path', { d: arrowD(440, 27, 456, 28, 11), fill: '#8c8c8c', stroke: '#8c8c8c', 'stroke-width': 2 });
  el(svg, 'path', { d: 'M900,2 C900,20 820,26 748,28', fill: 'none', stroke: '#8c8c8c', 'stroke-width': 2.5 });
  el(svg, 'path', { d: arrowD(760, 27, 744, 28, 11), fill: '#8c8c8c', stroke: '#8c8c8c', 'stroke-width': 2 });
};

// ---------------------------------------------------------------- Beta shapes
const BB = pbox(70, 20, 420, 320, 0, 1, 0, 7);
FIGS.shapes = {
  init(root) {
    const svg = newSvg(root, 520, 390), B = BB;
    plotAxes(root, svg, B, { xt: XT, yt: [0, 1, 2, 3, 4, 5, 6, 7], xlab: '$\\theta$', ylab: 'density' });
    const cur = (f, lo, hi, c, dash) => el(svg, 'path', { d: cpath(B, f, lo, hi, 300), fill: 'none', stroke: c, 'stroke-width': 3.2, 'stroke-dasharray': dash ? DASH[dash] : 'none' });
    cur(x => 0.31831 * pw(x, -0.5) * pw(1 - x, -0.5), 0.005, 0.995, HUE.priorD);
    cur(x => 4 * x * x * x, 0, 1, HUE.priorB, 'dashed');
    cur(x => 6 * pw(1 - x, 5), 0, 1, HUE.priorC, 'dashdot');
    cur(x => 630 * pw(x, 4) * pw(1 - x, 4), 0, 1, C.prior, 'dotted');
    line(svg, B.X(0.05), B.Y(1.5), B.X(0.24), B.Y(4.6), HUE.priorD, 1.2);
    label(root, 'a', '$\\bet(0.5,0.5)$', B.X(0.24) + 2, B.Y(4.6), 'l', HUE.priorD);
    label(root, 'b', '$\\bet(4,1)$', B.X(0.9), B.Y(3.75), 'r', HUE.priorB);
    label(root, 'c', '$\\bet(1,6)$', B.X(0.06), B.Y(5.3), 'l', HUE.priorC);
    label(root, 'd', '$\\bet(5,5)$', B.X(0.5), B.Y(2.5) - 2, 'b', C.prior);
    el(svg, 'path', { class: 'live', fill: 'none', stroke: '#333', 'stroke-width': 3 });
  },
  render(root, p) {   // a live Beta(a, b), drawn only once a slider has moved
    const on = p.a > 0 || p.b > 0, a = p.a || 1, b = p.b || 1, B = BB;
    attr($(root, 'live'), { d: on ? cpath(B, x => betaPdf(x, a, b), 0.002, 0.998, 300) : '' });
    const m = a > 1 && b > 1 ? betaMode(a, b) : 0.5, y = Math.min(betaPdf(m, a, b), 6.4);
    label(root, 'live', `$\\bet(${fmt(a, 1)},${fmt(b, 1)})$`, B.X(m), B.Y(y) - 6, 'b', '#333', on ? 1 : 0);
  }
};

// ---------------------------------------------------------------- Poisson pmf
const PB = pbox(80, 44, 420, 250, -0.5, 8.5, 0, 0.32);
FIGS.pois = {
  init(root) {
    const svg = newSvg(root, 520, 370), B = PB;
    plotAxes(root, svg, B, { xt: [0, 1, 2, 3, 4, 5, 6, 7, 8], yt: [0, 0.1, 0.2, 0.3], xlab: '$y_i$: events in one window', ylab: 'probability', ylabDx: 56 });
    bars(svg, 'b', 9, C.like, 'rgba(0,128,0,.25)', 2);
  },
  render(root, p) {
    const B = PB;
    $$(root, 'b').forEach((r, y) => setBar(r, B, y, 0.5, 0, Math.min(poiPmf(y, p.l), 0.32)));
    label(root, 'ti', `Example with $\\lambda=${fmt(p.l, 1)}$`, B.x0 + B.W / 2, B.y0 - 14, 'b', C.ink);
  }
};

// ---------------------------------------------------------------- flat prior for a rate
FIGS.gam21 = {
  init(root) {
    const svg = newSvg(root, 520, 370), B = pbox(80, 20, 420, 280, 0, 10, 0, 1.2);
    plotAxes(root, svg, B, { xt: [0, 2, 4, 6, 8, 10], yt: [0, 0.5, 1], xlab: '$\\lambda$', ylab: 'relative height', ylabDx: 52 });
    line(svg, B.X(0), B.Y(0.1), B.X(10), B.Y(0.1), C.prior, 2.5, 'dashed');
    label(root, 'pr', 'flat prior (scaled)', B.X(9.9), B.Y(0.11) - 2, 'br', C.prior);
    dens(svg, 'po', C.post, 3.5); setDens(root, B, 'po', x => gamPdf(x, 21, 10), 0.01, 10);
    label(root, 'po', '$\\gam(21,10)$ posterior', B.X(2.75), B.Y(0.8), 'l', C.post);
  },
  render() {}
};

// ---------------------------------------------------------------- point estimates
const EB = pbox(76, 20, 420, 300, 0, 0.12, 0, 30);
const EMK = [['m1', 0.029, 23, 18, 'mean', MEAN], ['m2', 0.026, 26, 22.5, 'median', MED], ['m3', 0.020, 29, 27, 'mode', MODE]];
FIGS.est = {
  duration: 800,
  init(root) {
    const svg = newSvg(root, 520, 380), B = EB;
    plotAxes(root, svg, B, { xt: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12], yt: [0, 10, 20, 30], xlab: '$\\theta$', ylab: 'density' });
    dens(svg, 'po', C.post, 3.5); setDens(root, B, 'po', x => betaPdf(x, 3, 99), 0.0001, 0.12);
    for (const [k, , , , , c] of EMK) { line(svg, 0, 0, 0, 0, c, 3, 'dashed', k); line(svg, 0, 0, 0, 0, c, 1.2, null, k + 'l'); }
  },
  render(root, p) {
    const B = EB;
    for (const [k, x, h, ly, name, c] of EMK) {
      const v = clamp(p[k]);
      attr($(root, k), { x1: B.X(x), x2: B.X(x), y1: B.Y(0), y2: B.Y(h * v), opacity: v > 0 ? 1 : 0 });
      attr($(root, k + 'l'), { x1: B.X(x), y1: B.Y(h), x2: B.X(0.058), y2: B.Y(ly), opacity: v > 0.95 ? 1 : 0 });
      label(root, k, name, B.X(0.058) + 3, B.Y(ly), 'l', c, v > 0.95 ? 1 : 0);
    }
  }
};

// ---------------------------------------------------------------- squared error
const VB = 35 / 1872, MB = 7 / 12;   // Var and mean of Beta(7,5)
const QE = pbox(84, 20, 470, 340, 0.13, 1.02, 0, 0.23);
FIGS.sqerr = {
  duration: 1200,
  init(root) {
    const svg = newSvg(root, 580, 430), B = QE;
    plotAxes(root, svg, B, { xt: [0.2, 0.4, 0.6, 0.8, 1], yt: [0, 0.05, 0.1, 0.15, 0.2], xlab: '$\\hat\\theta$', ylab: 'sq. error', ylabDx: 58 });
    el(svg, 'path', { d: cpath(B, x => (x - MB) ** 2 + VB, 0.2, 1), fill: 'none', stroke: '#404040', 'stroke-width': 3.5 });
    line(svg, B.X(1), B.Y(VB), B.X(0.2), B.Y(VB), '#999', 1.5, 'dashed', 'vl');
    line(svg, B.X(MB), B.Y(0), B.X(MB), B.Y(0.2), MEAN, 2.5, 'dashed', 'ml');
    line(svg, 0, 0, 0, 0, '#777', 1.3, 'dotted', 'drop');
    el(svg, 'circle', { class: 'pt', r: 6, fill: C.ink, stroke: '#fff', 'stroke-width': 1.5 });
  },
  render(root, p) {
    const B = QE, th = Math.round(p.th * 100) / 100, loss = (th - MB) ** 2 + VB, f = clamp(p.fin);
    attr($(root, 'vl'), { opacity: f }); attr($(root, 'ml'), { opacity: f });
    label(root, 'vl', '$\\var(\\Theta|\\bx)$', B.X(0.2) + 4, B.Y(VB) - 4, 'bl', '#555', f);
    label(root, 'ml', '$\\E[\\Theta|\\bx]$', B.X(MB) + 6, B.Y(0.2), 'l', MEAN, f);
    const x = B.X(p.th), y = B.Y((p.th - MB) ** 2 + VB);
    attr($(root, 'pt'), { cx: x, cy: y, fill: mix(C.ink, MEAN, f) });
    attr($(root, 'drop'), { x1: x, x2: x, y1: y, y2: B.Y(0), opacity: 1 - f });
    label(root, 'rd', `$\\hat\\theta=${th.toFixed(2)}$: ${loss.toFixed(4)}`, x + (th < MB ? 14 : -14), y, th < MB ? 'l' : 'r', C.ink, 1 - f);
  }
};

// ---------------------------------------------------------------- the seesaw
// TikZ units of the Beamer figure: theta 0.4..0.7 maps to x 0..10; S px per unit.
const SS = 88, SX0 = 70, SGY = 206;
const sx = th => SX0 + (th - 0.4) / 0.03 * SS, sy = y => SGY - (y + 0.85) * SS;
FIGS.seesaw = {
  duration: 1400,
  init(root) {
    const svg = newSvg(root, 1100, 322);
    const g = el(svg, 'g');
    line(g, SX0 - 0.3 * SS, SGY, SX0 + 10.3 * SS, SGY, '#8c8c8c', 2.5);
    for (const v of [0.4, 0.5, 0.6, 0.7]) {
      line(g, sx(v), SGY, sx(v), SGY + 10, '#8c8c8c', 1.5);
      el(g, 'text', { x: sx(v), y: SGY + 28, 'text-anchor': 'middle', 'font-size': 17, fill: '#555' }).textContent = v;
    }
    el(svg, 'path', { class: 'fulc', fill: C.post });
    const pl = el(svg, 'g', { class: 'plank' });
    el(pl, 'rect', { x: SX0 - 0.3 * SS, y: sy(0.25), width: 10.6 * SS, height: 0.25 * SS, rx: 3, fill: '#b3b3b3', stroke: '#9a9a9a' });
    el(pl, 'rect', { class: 'w0', fill: C.prior, stroke: '#1b3f7e', rx: 2 });
    el(pl, 'rect', { class: 'w1', fill: C.like, stroke: '#006000', rx: 2 });
    for (const k of ['t0', 't1']) el(pl, 'text', { class: k, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 'bold', fill: '#fff' });
    el(svg, 'g', { class: 'br' });
  },
  render(root, p) {
    const n = Math.round(p.n), h = Math.round(0.6 * n), bal = (h + 1) / (n + 2);
    const fx = lerp(0.5, bal, p.fb), fo = clamp(p.f);
    const ang = fo * clamp((bal - fx) / 0.0833 * 5, -6, 6);   // degrees, clockwise when the data side is heavy
    const ax = sx(fx), ay = sy(0);
    attr($(root, 'fulc'), { d: `M${ax},${ay}L${sx(fx) - 0.45 * SS},${SGY}L${sx(fx) + 0.45 * SS},${SGY}Z`, opacity: fo });
    attr($(root, 'plank'), { transform: `rotate(${ang} ${ax} ${ay})` });
    const side = w => 0.45 * Math.sqrt(w / 2) * SS;
    [[2, 0.5, 'w0', 't0'], [n, 0.6, 'w1', 't1']].forEach(([w, th, r, t]) => {
      const s = side(w);
      attr($(root, r), { x: sx(th) - s / 2, y: sy(0.25) - s, width: s, height: s });
      attr($(root, t), { x: sx(th), y: sy(0.25) - s / 2 + 6 }); $(root, t).textContent = w;
    });
    // the weights' labels ride with the plank
    const s0 = side(2), s1 = side(n), c = Math.cos(ang * Math.PI / 180), sn = Math.sin(ang * Math.PI / 180);
    const rot = (x, y) => [ax + (x - ax) * c - (y - ay) * sn, ay + (x - ax) * sn + (y - ay) * c];
    label(root, 'pm', 'prior mean $1/2$', ...rot(sx(0.5) - s0 / 2 - 14, sy(0.25) - s0 / 2), 'r', C.prior);
    label(root, 'ml', `MLE $${h}/${n}$`, ...rot(sx(0.6) + s1 / 2 + 14, sy(0.25) - s1 / 2), 'l', C.like);
    const done = clamp((p.fb - 0.9) * 10) * fo;
    label(root, 'po', `posterior mean $${h + 1}/${n + 2}$`, ax - 0.55 * SS, sy(-0.45), 'r', C.post, done);
    const g = $(root, 'br'); g.replaceChildren();
    if (done > 0) { brace(g, sx(0.5), ax, SGY + 38, 8, '#999'); g.setAttribute('opacity', done); }
    label(root, 'way', `$\\dfrac{${n}}{${n + 2}}$ of the way`, (sx(0.5) + ax) / 2, SGY + 58, 't', '#444', done);
  }
};

// ---------------------------------------------------------------- your turn, Beta(2,2) prior
const YB = pbox(70, 40, 380, 270, 0, 1, 0, 3);
const YMK = [[0.5, C.prior, 0.26, 'prior'], [4 / 7, MEAN, 0.47, 'mean'], [0.6, MODE, 0.69, 'MAP'], [2 / 3, C.mle, 0.88, 'MLE']];
FIGS.yt = {
  duration: 1200,
  init(root) {
    const svg = newSvg(root, 480, 370), B = YB;
    plotAxes(root, svg, B, { xt: XT, yt: [0, 1, 2], xlab: '$\\theta$', ylab: 'density' });
    dens(svg, 'pr', C.prior, 2.5, 'dashed'); setDens(root, B, 'pr', x => 6 * x * (1 - x), 0, 1);
    label(root, 'pr', 'prior', B.X(0.2), B.Y(1.25), 'r', C.prior);
    dens(svg, 'po', C.post, 3.5);
    YMK.forEach((m, i) => { line(svg, 0, 0, 0, 0, m[1], 2.5, 'dashed', 'k' + i); line(svg, 0, 0, 0, 0, m[1], 1.2, null, 'kl' + i); });
  },
  render(root, p) {
    const B = YB, u = p.u;
    setDens(root, B, 'po', x => betaPdf(x, 2 + 2 * u, 2 + u), 0, 1, p.cur);
    label(root, 'po', 'posterior', B.X(0.8), B.Y(1.05), 'bl', C.post, p.cur * clamp(u * 3 - 2));
    YMK.forEach(([x, c, lx, name], i) => {
      attr($(root, 'k' + i), { x1: B.X(x), x2: B.X(x), y1: B.Y(0), y2: B.Y(2.2 * clamp(p.mk)), opacity: p.mk > 0 ? 1 : 0 });
      attr($(root, 'kl' + i), { x1: B.X(x), y1: B.Y(2.2), x2: B.X(lx), y2: B.Y(2.55), opacity: p.mk > 0.95 ? 1 : 0 });
      label(root, 'k' + i, name, B.X(lx), B.Y(2.55) - 1, 'b', c, p.mk > 0.95 ? 1 : 0);
    });
  }
};

// ---------------------------------------------------------------- the fire department
const GAM21 = x => gamPdf(x, 21, 10);
FIGS.q1 = {
  init(root) {
    const svg = newSvg(root, 540, 270), B = pbox(80, 14, 430, 190, 0.5, 4.3, 0, 1.05);
    plotAxes(root, svg, B, { xt: [1, 2, 3, 4], yt: [0, 0.5, 1], xlab: '$\\lambda$', ylab: 'density' });
    dens(svg, 'po', C.post, 3.5); setDens(root, B, 'po', GAM21, 0.5, 4.2);
    label(root, 'po', '$\\gam(21,10)$', B.X(2.55), B.Y(0.75), 'l', C.post);
  },
  render() {}
};
// Posterior on top, Pr(Y > 5 | lambda) below; a marker at lambda runs through both.
const DT = pbox(100, 30, 420, 140, 0.5, 4.3, 0, 1.05), DL = pbox(100, 196, 420, 170, 0.5, 4.3, 0, 0.26);
FIGS.dep = {
  duration: 1200,
  init(root) {
    const svg = newSvg(root, 540, 430);
    plotAxes(root, svg, DT, { key: 't', xt: [1, 2, 3, 4], noxl: true, yt: [0, 0.5, 1], ylab: 'density', ylabDx: 56 });
    plotAxes(root, svg, DL, { key: 'l', xt: [1, 2, 3, 4], yt: [0, 0.1, 0.2], xlab: '$\\lambda$', ylab: '<span class="cap">$\\pr(Y_{11}>5\\mid\\lambda)$</span>', ylabDx: 62 });
    dens(svg, 'po', C.post, 3.5); setDens(root, DT, 'po', GAM21, 0.5, 4.2);
    label(root, 'po', '$\\gam(21,10)$', DT.X(3.15), DT.Y(0.6), 'l', C.post);
    el(svg, 'path', { d: cpath(DL, poiTail5, 0.5, 4.2), fill: 'none', stroke: C.like, 'stroke-width': 3.5 });
    line(svg, 0, 0, 0, 0, '#888', 1.5, 'dashed', 'mk');
    el(svg, 'circle', { class: 'v1', cx: DL.X(1.5), cy: DL.Y(0.0045), r: 5, fill: C.like });
    line(svg, DL.X(1.5), DL.Y(0.0045), DL.X(1.8), DL.Y(0.12), C.like, 1.2, null, 'v1l');
    el(svg, 'circle', { class: 'dt', r: 4.5, fill: C.post });
    el(svg, 'circle', { class: 'dl', r: 5.5, fill: C.like });
  },
  render(root, p) {
    const l = p.lam, lr = Math.round(l * 100) / 100, pv = poiTail5(lr), on = clamp(p.on);
    attr($(root, 'mk'), { x1: DT.X(l), x2: DT.X(l), y1: DT.Y(1.05), y2: DL.Y(0), opacity: on });
    attr($(root, 'dt'), { cx: DT.X(l), cy: DT.Y(GAM21(l)), opacity: on });
    attr($(root, 'dl'), { cx: DL.X(l), cy: DL.Y(poiTail5(l)), opacity: on });
    const txt = Math.abs(lr - 1.5) < 1e-9 ? '0.004' : Math.abs(lr - 3) < 1e-9 ? '0.084' : pv.toFixed(4);
    label(root, 'lam', `$\\lambda=${fmt(lr, 2)}$`, DT.X(l), DT.y0 - 4, 'b', '#555', on);
    label(root, 'val', `$${txt}$`, DL.X(l) - 4, DL.Y(poiTail5(l)) - 6, 'br', C.like, on);
    const v1 = clamp(p.v1);
    attr($(root, 'v1'), { opacity: v1 }); attr($(root, 'v1l'), { opacity: v1 });
    label(root, 'v1', '$0.004$', DL.X(1.8), DL.Y(0.12) - 2, 'b', C.like, v1);
  }
};
FIGS.plug = {
  init(root) {
    const svg = newSvg(root, 540, 330), B = pbox(100, 14, 410, 240, 0.5, 4.3, 0, 0.26);
    plotAxes(root, svg, B, { xt: [1, 2, 3, 4], yt: [0, 0.1, 0.2], xlab: '$\\lambda$', ylab: '<span class="cap">$\\pr(Y_{11}>5\\mid\\lambda)$</span>', ylabDx: 62 });
    el(svg, 'path', { d: cpath(B, poiTail5, 0.5, 4.2), fill: 'none', stroke: C.like, 'stroke-width': 3.5 });
    line(svg, B.X(2.1), B.Y(0), B.X(2.1), B.Y(0.0204), C.mle, 1.3, 'dashed');
    el(svg, 'rect', { x: B.X(2.1) - 5.5, y: B.Y(0.0204) - 5.5, width: 11, height: 11, fill: C.mle });
    line(svg, B.X(2.1), B.Y(0.0204), B.X(1.6), B.Y(0.10), C.mle, 1.2);
    label(root, 'pt', '$\\lambda=2.1$: $0.020$', B.X(1.6), B.Y(0.10) - 2, 'b', C.mle);
  },
  render() {}
};
// Lambda -> past data, tomorrow (the softbox graph).
FIGS.dag = {
  init(root) {
    const svg = newSvg(root, 340, 190), n = root.dataset.n || 'n';
    const box = (cx, cy, c, k, s) => {
      el(svg, 'rect', { x: cx - 72, y: cy - 30, width: 144, height: 60, rx: 9, fill: c, 'fill-opacity': 0.1, stroke: c, 'stroke-opacity': 0.7, 'stroke-width': 1.8 });
      label(root, k, s, cx, cy, 'c', C.ink);
      root.querySelector(`.lab[data-k="${k}"]`).style.textAlign = 'center';
    };
    arrow(svg, 170, 62, 102, 124, '#8c8c8c', 2.2, 11);
    arrow(svg, 170, 62, 238, 124, '#8c8c8c', 2.2, 11);
    box(170, 34, C.post, 'lam', '$\\Lambda$');
    box(84, 154, C.like, 'past', `<span class="cap">past data<br>$Y_1^{${n}}$</span>`);
    box(256, 154, C.pred, 'next', `<span class="cap">tomorrow<br>$Y_{${n === 'n' ? 'n+1' : +n + 1}}$</span>`);
  },
  render() {}
};
// Bar charts over y = 0..10: tomorrow's count.
const POI21 = [.1225, .2572, .2700, .1890, .0992, .0417, .0146, .0044, .0011, .0003, .0001];
const PRED21 = [.1351, .2580, .2580, .1798, .0981, .0446, .0176, .0062, .0020, .0006, .0002];
const CB = pbox(84, 20, 430, 260, -0.7, 10.7, 0, 0.3);
const Y10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
function countAxes(root, svg, B, o = {}) {
  plotAxes(root, svg, B, Object.assign({ xt: Y10, yt: [0, 0.1, 0.2, 0.3], xlab: 'incidents tomorrow', ylab: 'probability', ylabDx: 58 }, o));
}
FIGS.pmf = {   // u = 0: plug-in Poi(2.1); u = 1: posterior predictive
  duration: 1300,
  init(root) {
    const svg = newSvg(root, 540, 360); countAxes(root, svg, CB);
    bars(svg, 'b', 11, C.mle, '#fff', 1.8);
    line(svg, CB.X(7), CB.Y(0.008), CB.X(7.6), CB.Y(0.07), C.mle, 1.2, null, 'ld');
  },
  render(root, p) {
    const B = CB, u = p.u, col = mix(C.mle, C.pred, u);
    $$(root, 'b').forEach((r, y) => {
      setBar(r, B, y, 0.55, 0, lerp(POI21[y], PRED21[y], u));
      attr(r, { stroke: col, fill: y > 5 ? col : mix('#d8d8d8', '#d6c3d9', u) });
    });
    attr($(root, 'ld'), { stroke: col });
    label(root, 'tl', `more than $5$: $${u < 0.5 ? '0.020' : '0.026'}$`, B.X(7.6), B.Y(0.07) - 2, 'b', col);
    label(root, 'pi', '$\\poi(2.1)$', B.X(4.2), B.Y(0.23), 'b', C.mle, clamp(1 - 2 * u));
    label(root, 'pd', 'posterior predictive', B.X(3.4), B.Y(0.23), 'l', C.pred, clamp(2 * u - 1));
  }
};

// One day: Gamma(3,1) in five bands, each band's Poisson counts stacked into
// the predictive pmf (band contributions from the plan, quadrature).
const CONTRIB = [
  [.0721, .0661, .0346, .0131, .0039, .0010, .0002, 0, 0, 0, 0],
  [.0373, .0717, .0703, .0469, .0239, .0100, .0035, .0011, .0003, .0001, 0],
  [.0119, .0344, .0502, .0493, .0366, .0220, .0111, .0048, .0019, .0006, .0002],
  [.0034, .0134, .0270, .0365, .0374, .0310, .0217, .0131, .0070, .0034, .0015],
  [.0003, .0019, .0055, .0105, .0153, .0181, .0182, .0161, .0128, .0094, .0064]];
const POI3 = [.0498, .1494, .2240, .2240, .1680, .1008, .0504, .0216, .0081, .0027, .0008];
const CUTS = [0, 1.5, 2.5, 3.5, 5, 9];
const GL = pbox(70, 20, 470, 300, 0, 9, 0, 0.37), GR = pbox(660, 20, 500, 300, -0.7, 10.7, 0, 0.25);
const G31 = x => x * x * Math.exp(-x) / 2;
FIGS.bands = {
  duration: 1000,
  init(root) {
    const svg = newSvg(root, 1200, 380);
    plotAxes(root, svg, GL, { key: 'L', xt: [0, 1.5, 2.5, 3.5, 5, 7, 9], yt: [0, 0.1, 0.2, 0.3], xlab: '$\\lambda$', ylab: 'density' });
    plotAxes(root, svg, GR, { key: 'R', xt: Y10, yt: [0, 0.05, 0.1, 0.15, 0.2, 0.25], xlab: 'incidents tomorrow $y_2$', ylab: 'probability', ylabDx: 58 });
    for (let i = 0; i < 5; i++) {
      el(svg, 'path', { d: apath(GL, G31, CUTS[i], CUTS[i + 1], 80), fill: '#e4e4e4' });
      el(svg, 'path', { class: 'bd' + i, d: apath(GL, G31, CUTS[i], CUTS[i + 1], 80), fill: BAND[i] });
    }
    for (const b of [1.5, 2.5, 3.5, 5]) line(svg, GL.X(b), GL.Y(0), GL.X(b), GL.Y(G31(b)), '#fff', 2.2);
    el(svg, 'path', { d: cpath(GL, G31, 0, 9), fill: 'none', stroke: C.post, 'stroke-width': 3.5 });
    label(root, 'g', '$\\gam(3,1)$', GL.X(5.3), GL.Y(0.16), 'l', C.post);
    line(svg, GL.X(3), GL.Y(0), GL.X(3), GL.Y(0.224), C.mle, 3, 'dashed');
    el(svg, 'circle', { cx: GL.X(3), cy: GL.Y(0.224), r: 5, fill: C.mle });
    line(svg, GL.X(3), GL.Y(0.224), GL.X(3), GL.Y(0.315), C.mle, 1.2);
    label(root, 'pl', 'plug-in: $\\lambda=3$ only', GL.X(3), GL.Y(0.315) - 2, 'b', C.mle);
    line(svg, GL.X(3.3), GL.Y(0.17), GL.X(3.7), GL.Y(0.235), '#666', 1.2, null, 'l2');
    line(svg, GL.X(5.8), GL.Y(0.025), GL.X(6.4), GL.Y(0.075), '#666', 1.2, null, 'l4');
    for (let i = 0; i < 5; i++) for (let y = 0; y <= 10; y++) el(svg, 'rect', { class: `s${i}`, fill: BAND[i], stroke: '#fff', 'stroke-width': 1 });
    Y10.forEach((y, j) => el(svg, 'rect', { x: GR.X(y + 0.1), width: GR.X(0.22) - GR.X(0), y: GR.Y(POI3[j]), height: GR.Y(0) - GR.Y(POI3[j]),
      fill: 'none', stroke: C.mle, 'stroke-width': 2.2 }));
    label(root, 'k1', '<span style="display:inline-block;width:9px;height:15px;border:2px solid #616161;vertical-align:-2px"></span> plug-in $\\cml{\\poi(3)}$', GR.X(10.6), GR.Y(0.245), 'tr', C.ink);
    label(root, 'k2', `<span style="display:inline-block;width:13px;height:13px;background:${BAND[2]};vertical-align:-1px"></span> posterior predictive`, GR.X(10.6), GR.Y(0.245) + 28, 'tr', C.ink);
  },
  render(root, p) {
    const lab = [['0.191', 0.95, 0.06, 'c', C.ink], ['0.265', 2, 0.274, 'b', C.ink], ['0.223', 3.6, 0.232, 'bl', C.ink],
      ['0.196', 4.25, 0.05, 'c', '#fff'], ['0.125', 6.3, 0.07, 'bl', C.ink]];
    const base = Y10.map(() => 0);
    for (let i = 0; i < 5; i++) {
      const v = clamp(p.k - i);
      attr($(root, 'bd' + i), { opacity: v });
      const [s, x, y, a, c] = lab[i];
      label(root, 'm' + i, s, GL.X(x), GL.Y(y), a, c, v);
      if (c === '#fff') root.querySelector(`.lab[data-k="m${i}"]`).style.textShadow = 'none';
      $$(root, 's' + i).forEach((r, y) => {
        const h = CONTRIB[i][y] * v;
        setBar(r, GR, y - 0.12, 0.38, base[y], base[y] + h); base[y] += h;
        attr(r, { opacity: v > 0 ? 1 : 0 });
      });
    }
    attr($(root, 'l2'), { opacity: clamp(p.k - 2) }); attr($(root, 'l4'), { opacity: clamp(p.k - 4) });
  }
};

// One day and d days: the plug-in Poi((1+2d)/d) against the predictive, a
// Gamma(1+2d, d) mixture (two incidents a day, flat prior).
const DDL = pbox(80, 40, 470, 170, -0.7, 10.7, 0, 0.3), DDR = pbox(670, 40, 470, 170, -0.7, 10.7, 0, 0.3);
const WORD = { 1: 'one day', 10: 'ten days' };
function dayBars(root, svg, B, k) {
  plotAxes(root, svg, B, { key: k, xt: [0, 2, 4, 6, 8, 10], yt: [0, 0.1, 0.2, 0.3], ytl: k === 'R' ? ['', '', '', ''] : null,
    xlab: 'incidents tomorrow', ylab: k === 'R' ? null : 'probability', ylabDx: 58 });
  bars(svg, 'p' + k, 11, C.mle, 'rgba(97,97,97,.3)', 1.5);
  bars(svg, 'q' + k, 11, C.pred, 'rgba(118,42,131,.7)', 1.5);
}
function setDays(root, B, k, d) {
  const a = 1 + 2 * d;
  $$(root, 'p' + k).forEach((r, y) => setBar(r, B, y - 0.17, 0.34, 0, poiPmf(y, a / d)));
  $$(root, 'q' + k).forEach((r, y) => setBar(r, B, y + 0.17, 0.34, 0, nbPmf(y, a, d)));
  const dr = Math.round(d);
  label(root, 'ti' + k, `<span class="cap">${WORD[dr] || dr + ' days'}, $\\cpo{\\gam(${1 + 2 * dr},${dr})}$</span>`, B.x0 + B.W / 2, B.y0 - 6, 'b', C.ink);
}
FIGS.days = {
  duration: 1600,
  init(root) {
    const svg = newSvg(root, 1200, 270);
    dayBars(root, svg, DDL, 'L'); dayBars(root, svg, DDR, 'R');
    setDays(root, DDL, 'L', 1);
    label(root, 'key', `<span class="cap"><span style="color:${C.mle}">■</span> plug-in&nbsp;&nbsp;<span style="color:${C.pred}">■</span> predictive</span>`,
      DDL.X(10.6), DDL.y0 + 8, 'tr', C.ink);
  },
  render(root, p) { setDays(root, DDR, 'R', p.d); }
};

// Var(Y_{n+1} | y) = Poisson noise + uncertainty about Lambda, as bars.
FIGS.vbars = {
  init(root) {
    const svg = newSvg(root, 560, 170), s = 78, x0 = 10;
    const row = (y, a, b, k, cap) => {
      label(root, 'c' + k, `<span class="cap">${cap}</span>`, x0, y - 6, 'bl', C.ink);
      el(svg, 'rect', { x: x0, y, width: a * s, height: 40, fill: C.mle, 'fill-opacity': 0.55 });
      el(svg, 'rect', { x: x0 + a * s, y, width: b * s, height: 40, fill: C.post });
      el(svg, 'rect', { x: x0 - 3, y: y - 3, width: (a + b) * s + 6, height: 46, rx: 2, fill: 'none', stroke: C.pred, 'stroke-width': 3 });
      return y;
    };
    row(34, 3, 3, 1, '$n=1$, $S=2$, $\\gam(3,1)$');
    label(root, 'a1', '$3$', x0 + 1.5 * s, 54, 'c', '#fff'); label(root, 'b1', '$3$', x0 + 4.5 * s, 54, 'c', '#fff');
    label(root, 't1', '$6$', x0 + 6 * s + 12, 54, 'l', C.pred);
    row(120, 2.1, 0.21, 2, '$n=10$, $S=20$, $\\gam(21,10)$');
    label(root, 'a2', '$2.1$', x0 + 1.05 * s, 140, 'c', '#fff');
    label(root, 'b2', '$0.21$', x0 + 2.31 * s + 12, 140, 'l', C.post);
    label(root, 't2', '$2.31$', x0 + 3.55 * s, 140, 'l', C.pred);
    for (const k of ['a1', 'b1', 'a2']) root.querySelector(`.lab[data-k="${k}"]`).style.textShadow = 'none';
  },
  render() {}
};

// ---------------------------------------------------------------- Summary icons
const iconPath = (f, lo, hi, sx, sy, x0, y0, n = 40) => {
  let d = '';
  for (let i = 0; i <= n; i++) { const x = lo + (hi - lo) * i / n; d += (i ? 'L' : 'M') + (x0 + x * sx).toFixed(1) + ',' + (y0 - f(x) * sy).toFixed(1); }
  return d;
};
function iconDens(svg, f, lo, hi, c, w = 2.5, sx = 120, sy = 120, x0 = 4, y0 = 60) {
  const d = iconPath(f, lo, hi, sx, sy, x0, y0);
  el(svg, 'path', { d: d + `L${x0 + hi * sx},${y0}L${x0 + lo * sx},${y0}Z`, fill: c, 'fill-opacity': 0.2 });
  el(svg, 'path', { d, fill: 'none', stroke: c, 'stroke-width': w });
}
Object.assign(ICONS, {
  bayes(svg) {
    iconDens(svg, x => 0.2 * Math.exp(-((x - 0.33) ** 2) / 0.04), 0, 0.85, C.prior);
    iconDens(svg, x => 0.2 * Math.exp(-((x - 0.6) ** 2) / 0.03), 0, 0.85, C.like);
    iconDens(svg, x => 0.44 * Math.exp(-((x - 0.47) ** 2) / 0.008), 0.25, 0.75, C.post, 3);
    el(svg, 'line', { x1: 4, x2: 106, y1: 60, y2: 60, stroke: '#999' });
  },
  conj(svg) {
    iconDens(svg, x => 7.5 * (x / 0.38) ** 3 * (1 - x / 0.38) ** 1.5 / 20, 0, 0.38, C.post, 3);
    iconDens(svg, x => 0.9 * ((x - 0.47) / 0.06) ** 2 * Math.exp(-(x - 0.47) / 0.06) / 1.7, 0.47, 0.85, C.post, 3);
    el(svg, 'line', { x1: 4, x2: 50, y1: 60, y2: 60, stroke: '#999' });
    el(svg, 'line', { x1: 60, x2: 106, y1: 60, y2: 60, stroke: '#999' });
  },
  add(svg) {
    el(svg, 'rect', { x: 4, y: 20, width: 20, height: 26, fill: C.prior });
    el(svg, 'text', { x: 32, y: 40, 'text-anchor': 'middle', 'font-size': 20 }).textContent = '+';
    el(svg, 'rect', { x: 40, y: 20, width: 20, height: 26, fill: C.like });
    el(svg, 'text', { x: 69, y: 40, 'text-anchor': 'middle', 'font-size': 20 }).textContent = '=';
    el(svg, 'rect', { x: 78, y: 20, width: 30, height: 26, fill: C.post });
  },
  loss(svg) {
    iconDens(svg, x => 0.4 * (x / 0.12) ** 1.3 * Math.exp(-x / 0.12) * 0.7, 0, 0.85, C.post);
    for (const [x, c] of [[0.16, MODE], [0.22, MED], [0.27, MEAN]])
      el(svg, 'line', { x1: 4 + x * 120, x2: 4 + x * 120, y1: 60, y2: 60 - 0.42 * 120, stroke: c, 'stroke-width': 2.5 });
    el(svg, 'line', { x1: 4, x2: 106, y1: 60, y2: 60, stroke: '#999' });
  },
  pred(svg) {
    [0.2, 0.34, 0.4, 0.32, 0.22, 0.13, 0.06].forEach((h, i) =>
      el(svg, 'rect', { x: 4 + (0.02 + i * 0.12) * 120, y: 60 - h * 120, width: 0.09 * 120, height: h * 120, fill: C.pred, 'fill-opacity': 0.6, stroke: C.pred, 'stroke-width': 1.5 }));
    el(svg, 'line', { x1: 4, x2: 106, y1: 60, y2: 60, stroke: '#999' });
  }
});
