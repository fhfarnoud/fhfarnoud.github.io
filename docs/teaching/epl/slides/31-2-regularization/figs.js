// Figures of the Linear Regression II deck (Chapter 5, Sections 5.4-5.6), redrawn
// from Sarvin's Beamer deck (Sarvin/lec15_regularization-overfitting_theme4/slides/)
// with the same functions, coordinates and plot-data tables: the tables that come
// from numpy's random draws are embedded in DATA (end of file); the ridge and
// least-squares fits are recomputed here, as generate_plot_data.py computes them,
// so that the two sliders can refit live.  Each FIGS entry draws from one parameter
// object (see ../shared/deck.js).

Object.assign(MACROS, {
  '\\bX': '\\boldsymbol{X}', '\\bZ': '\\boldsymbol{Z}', '\\bY': '\\boldsymbol{Y}', '\\bx': '\\boldsymbol{x}',
  '\\bz': '\\boldsymbol{z}', '\\bq': '\\boldsymbol{q}', '\\bu': '\\boldsymbol{u}', '\\by': '\\boldsymbol{y}', '\\be': '\\boldsymbol{e}', '\\mU': '\\mathsf{U}', '\\ba': '\\boldsymbol{a}',
  '\\bb': '\\boldsymbol{b}', '\\bmu': '\\boldsymbol{\\mu}', '\\btheta': '\\boldsymbol{\\theta}',
  '\\bTheta': '\\boldsymbol{\\Theta}', '\\bzero': '\\boldsymbol{0}', '\\bone': '\\boldsymbol{1}',
  '\\mK': '\\mathsf{K}', '\\mA': '\\mathsf{A}', '\\mS': '\\mathsf{S}', '\\mI': '\\mathsf{I}',
  '\\mQ': '\\mathsf{Q}', '\\mW': '\\mathsf{W}', '\\cov': '\\operatorname{Cov}', '\\var': '\\operatorname{Var}',
  '\\uni': '\\operatorname{Uni}', '\\mle': '\\mathrm{mle}',
  '\\bias': '\\operatorname{Bias}', '\\cL': '\\mathcal{L}', '\\cD': '\\mathcal{D}', '\\cX': '\\mathcal{X}',
  '\\cY': '\\mathcal{Y}', '\\bbR': '\\mathbb{R}', '\\ybar': '\\bar y', '\\predmean': '\\overline f',
  // role colours (deck.css); ## is a literal # inside a KaTeX macro
  '\\cpr': '\\textcolor{##2354A8}{#1}', '\\clk': '\\textcolor{##008000}{#1}',
  '\\cpo': '\\textcolor{##B30000}{#1}', '\\cml': '\\textcolor{##616161}{#1}',
  '\\cte': '\\textcolor{##087F80}{#1}', '\\cro': '\\textcolor{##B33362}{#1}',
  '\\cam': '\\textcolor{##CC8800}{#1}', '\\cbr': '\\textcolor{##A0521B}{#1}',
  '\\cpd': '\\textcolor{##762A83}{#1}', '\\cgy': '\\textcolor{##737373}{#1}'
});

// ---------------------------------------------------------------- numerics
const memo = f => { const m = new Map(); return k => { if (!m.has(k)) m.set(k, f(k)); return m.get(k); }; };
const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const GRID = linspace(-1, 1, 241);                       // generate_plot_data.py's grid
const truth = x => 0.45 + 0.65 * x - 1.25 * x * x;       // the true mean of Slides 2-5 and 18-25
const TRUTH = GRID.map(x => [x, truth(x)]);

// Least squares min ||A c - b|| by Householder QR (A is m x n, m >= n, full column rank).
function lsq(A, b) {
  const m = A.length, n = A[0].length, R = A.map(r => r.slice()), y = b.slice();
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let i = k; i < m; i++) s += R[i][k] * R[i][k];
    const alpha = R[k][k] > 0 ? -Math.sqrt(s) : Math.sqrt(s), v = [];
    for (let i = k; i < m; i++) v.push(R[i][k]);
    v[0] -= alpha;
    const vv = v.reduce((a, t) => a + t * t, 0);
    if (vv === 0) continue;
    const reflect = col => {
      let d = 0;
      for (let i = k; i < m; i++) d += v[i - k] * col(i);
      return 2 * d / vv;
    };
    for (let j = k; j < n; j++) { const d = reflect(i => R[i][j]); for (let i = k; i < m; i++) R[i][j] -= d * v[i - k]; }
    const d = reflect(i => y[i]);
    for (let i = k; i < m; i++) y[i] -= d * v[i - k];
  }
  const c = new Array(n).fill(0);
  for (let k = n - 1; k >= 0; k--) {
    let s = y[k];
    for (let j = k + 1; j < n; j++) s -= R[k][j] * c[j];
    c[k] = s / R[k][k];
  }
  return c;
}
const mono = (x, d) => Array.from({ length: d + 1 }, (_, j) => x ** j);
const monoAt = (c, x) => c.reduceRight((s, v) => s * x + v, 0);
// Ridge on the monomials 1, x, ..., x^d with every coefficient penalized, as the
// generator does: min ||y - X c||^2 + lam ||c||^2, solved as least squares on the
// stacked system [X; sqrt(lam) I] c = [y; 0] (QR, never the normal equations).
function ridge(xs, ys, d, lam) {
  const A = xs.map(x => mono(x, d)), b = ys.slice();
  if (lam > 0) for (let j = 0; j <= d; j++) { const r = new Array(d + 1).fill(0); r[j] = Math.sqrt(lam); A.push(r); b.push(0); }
  return lsq(A, b);
}
// Least squares on the Chebyshev polynomials T_0..T_d (numpy's chebvander).
function cheb(x, d) { const t = [1, x]; for (let k = 2; k <= d; k++) t.push(2 * x * t[k - 1] - t[k - 2]); return t.slice(0, d + 1); }
const chebFit = (xs, ys, d) => lsq(xs.map(x => cheb(x, d)), ys);
const chebAt = (c, x) => cheb(x, c.length - 1).reduce((s, t, k) => s + c[k] * t, 0);

// ---------------------------------------------------------------- drawing helpers
// candidate for deck.js: a polyline through data points, cut at the plot's edges as
// pgfplots' clip=true does (an SVG clipPath needs an id, which print clones duplicate).
function clipSeg(a, b, P) {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - P.xlo], [dx, P.xhi - a[0]], [-dy, a[1] - P.ylo], [dy, P.yhi - a[1]]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [t0, t1];
}
function clipD(P, pts) {
  let d = '', pen = false;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], s = a.concat(b).every(Number.isFinite) && clipSeg(a, b, P);
    if (!s) { pen = false; continue; }
    const at = t => P.px([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]).map(v => v.toFixed(1)).join(',');
    if (!pen || s[0] > 0) d += 'M' + at(s[0]);
    d += 'L' + at(s[1]);
    pen = s[1] === 1;
  }
  return d;
}
function cpath(P, pts, st = {}) {
  return P.g.el('path', paint(st, { d: clipD(P, pts), fill: 'none', stroke: C.ink,
    'stroke-width': STYLE.curve, 'stroke-linejoin': 'round' }));
}
// candidate for deck.js (the same helpers as 31-1's figs.js): a polygon cut to the plot's
// box (Sutherland-Hodgman), for filled regions that leave the axes
function clipPolygon(P, pts) {
  const sides = [[0, P.xlo, 1], [0, P.xhi, -1], [1, P.ylo, 1], [1, P.yhi, -1]];
  let out = pts;
  for (const [k, v, sg] of sides) {
    const inp = out; out = [];
    const ins = q => sg * (q[k] - v) >= 0, cut = (a, b) => { const t = (v - a[k]) / (b[k] - a[k]); return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; };
    inp.forEach((q, i) => {
      const r = inp[(i + 1) % inp.length];
      if (ins(q)) { out.push(q); if (!ins(r)) out.push(cut(q, r)); } else if (ins(r)) out.push(cut(q, r));
    });
    if (!out.length) break;
  }
  return out;
}
// candidate for deck.js: contours of a loss as a sequential ramp in the structure purple,
// darkest at the innermost (smallest value), lighter outwards to about #CFCBE0, with light
// filled bands between them in the same ramp; rings are closed point lists, innermost first.
const RAMP = ['#463C7D', '#CFCBE0'].map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
const rampAt = (t, a = 1) => 'rgb(' + RAMP[0].map((c0, i) => Math.round(255 + a * (c0 + (RAMP[1][i] - c0) * t - 255))).join(',') + ')';
function contourRamp(P, rings, line, fillA = 0.2) {
  const n = rings.length, t = k => n > 1 ? k / (n - 1) : 0;
  for (let k = n - 1; k >= 0; k--) {   // bands: each ring's inside, outermost first, opaque mixes with white
    const poly = clipPolygon(P, rings[k]);
    if (poly.length > 2) P.path(poly, { close: true, fill: rampAt(t(k), fillA), color: 'none', w: null });
  }
  return () => rings.forEach((ring, k) => line(ring, rampAt(t(k))));   // the lines, drawn when the caller says
}
// candidate for deck.js: axes of a box2d plot as pgfplots draws them: grid lines at
// the ticks (o.xg, o.yg override them), axis lines crossing at (o.ox, o.oy), by
// default the lower left corner (axis lines=left), tick numbers o.xt and o.yt (an
// entry [v, '$...$'] is a math label), and the names o.names at the arrow tips (the x
// name right of its arrow, clear of the last tick), or with o.xname 'below' centred
// under the axis and with o.yname 'above' over the arrow.
function pgfAxes(P, o = {}) {
  const g = P.g, B = P.B, ox = o.ox ?? P.xlo, oy = o.oy ?? P.ylo, k = o.key || '';
  const xt = o.xt || [], yt = o.yt || [], val = t => Array.isArray(t) ? t[0] : t;
  g.group({}, () => {
    for (const x of o.xg ?? xt.map(val)) g.el('line', { x1: B.X(x), x2: B.X(x), y1: B.Y(P.ylo), y2: B.Y(P.yhi), stroke: C.grid });
    for (const y of o.yg ?? yt.map(val)) g.el('line', { x1: B.X(P.xlo), x2: B.X(P.xhi), y1: B.Y(y), y2: B.Y(y), stroke: C.grid });
    g.arrow([B.X(P.xlo), B.Y(oy)], [B.X(P.xhi) + 16, B.Y(oy)]);
    g.arrow([B.X(ox), B.Y(P.ylo)], [B.X(ox), B.Y(P.yhi) - 16]);
    for (const t of xt) if (!Array.isArray(t)) g.text([B.X(t), B.Y(oy) + 20], minus(t));
    for (const t of yt) if (!Array.isArray(t)) g.text([B.X(ox) - 7, B.Y(t) + 5], minus(t), { anchor: 'end' });
  });
  xt.forEach((t, i) => { if (Array.isArray(t)) g.label(k + 'xt' + i, t[1], [B.X(t[0]), B.Y(oy) + 3], 't', { color: STYLE.tick[1] }); });
  const [nx, ny] = o.names || ['', ''], lc = { color: STYLE.axisName };
  if (nx) {
    if (o.xname === 'below') g.label(k + 'bx', nx, [(B.X(P.xlo) + B.X(P.xhi)) / 2, B.Y(oy) + 30], 't', lc);
    else g.label(k + 'bx', nx, [B.X(P.xhi) + 21, B.Y(oy)], 'l', lc);
  }
  if (ny) {
    if (o.yname === 'above') g.label(k + 'by', ny, [B.X(ox) - 8, B.Y(P.yhi) - 22], 'bl', lc);
    else g.label(k + 'by', ny, [B.X(ox) + 8, B.Y(P.yhi) - 14], 'l', lc);
  }
}
// A TikZ picture's bounding box [xlo, xhi] x [ylo, yhi] at sx, sy pixels per unit.
const tikz = (xlo, xhi, ylo, yhi, sx, sy = sx, x0 = 0, y0 = 0) =>
  box2d(x0, y0, (xhi - xlo) * sx, (yhi - ylo) * sy, xlo, xhi, ylo, yhi);
const tikzSize = (B, pad = [0, 0]) => [Math.ceil(B.x0 + B.W + pad[0]), Math.ceil(B.y0 + B.H + pad[1])];
const small = s => `<span class="cap">${s}</span>`;
const centred = s => `<div style="text-align:center">${s}</div>`;
// a double-headed arrow, as TikZ's <->
function arrow2(P, a, b, st) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; P.arrow(m, a, st); P.arrow(m, b, st); }

// ---------------------------------------------------------------- the polynomial data (Slides 2-5, 15, 23, 27)
// Sarvin's lrplot: x in [-1.05, 1.05], y in [-2, 1.35], axes on the left and bottom.
const LR = [620, 370];
const lrBox = (H = 300) => box2d(60, 30, 520, H, -1.05, 1.05, -2, 1.35);
const lrAxes = P => pgfAxes(P, { xt: [-1, -0.5, 0, 0.5, 1], yt: [-2, -1, 0, 1], names: ['$x$', '$y$'] });
const TRX = () => DATA.training.map(q => q[0]), TRY = () => DATA.training.map(q => q[1]);
const training = (P, st = {}) => DATA.training.forEach(q => P.dot(q, Object.assign({ r: 6, color: 'like' }, st)));
const truthLine = (P, opacity = 1, pts = TRUTH) => cpath(P, pts, { color: 'ink', w: 2.5, dash: true, opacity });
// the degree-11 ridge fit at lam (lam = 0: least squares, which interpolates), on GRID
const fitCurve = memo(lam => {
  const c = ridge(TRX(), TRY(), 11, lam);
  return { c, norm: Math.hypot(...c), pts: GRID.map(x => [x, monoAt(c, x)]) };
});
const SMOOTH = memo(() => { const c = chebFit(TRX(), TRY(), 2); return GRID.map(x => [x, chebAt(c, x)]); });

FIGS.trust = {
  size: LR,
  draw(g, p) {
    const P = g.plot(lrBox()), a = clamp(p.s), b = clamp(p.s - 1);
    lrAxes(P);
    cpath(P, SMOOTH(0), { color: 'pred', opacity: a });
    cpath(P, fitCurve(0).pts, { color: 'teal', opacity: a });
    truthLine(P, b);
    DATA.test.forEach(q => P.dot(q, { r: 5.5, fill: 'none', stroke: 'mle', 'stroke-width': 2.2, opacity: b }));
    training(P);
  }
};

FIGS.lsfit = {
  size: LR,
  draw(g) {
    const P = g.plot(lrBox());
    lrAxes(P);
    cpath(P, fitCurve(0).pts, { color: 'teal' });
    training(P);
  }
};

// Slide 4: the penalty against the coefficient length, for two values of lambda.
const PEN = tikz(-0.3, 4.6, -0.4, 3.3, 97, 85, 4, 4);
FIGS.penalty = {
  size: tikzSize(PEN, [40, 0]),
  draw(g, p) {
    const P = g.plot(PEN);
    P.arrow([0, 0], [4.1, 0]);
    P.arrow([0, 0], [0, 3]);
    P.label('nx', '$\\|\\btheta\\|_2$', [4.1, 0], 'tl', { dx: -6, dy: 6, color: STYLE.axisName });
    P.label('ny', 'penalty', [0, 3], 'b', { dy: -4, color: STYLE.axisName });
    P.curve(x => 0.2 * x * x, { from: 0, to: 3, color: 'prior', w: 2.5 });
    P.curve(x => 0.6 * x * x, { from: 0, to: 2.1, color: 'prior', w: 4.5, opacity: p.lam });
    P.label('lam', 'larger $\\lambda$', [3, 2.7], 'c', { color: 'prior', opacity: p.lam });
  }
};

// Slide 5: ridge on the degree-11 basis.  The state's ll is log10(lambda); the
// slider's left end, ll = -4, is lambda = 0.  lambda is rounded to two significant
// figures for display, and the fit and its norm are computed from the rounded value.
const LL0 = -4;
const lamOf = ll => ll <= LL0 + 1e-9 ? 0 : +(10 ** ll).toPrecision(2);
const sig = (v, n) => String(+v.toPrecision(n));
FIGS.lam = {
  size: LR,
  draw(g, p) {
    const P = g.plot(lrBox()), lam = lamOf(p.ll), fit = fitCurve(lam);
    lrAxes(P);
    if (p.gh !== 'none') {    // the previous state's fit, faded and dashed
      const gl = +p.gh;
      cpath(P, fitCurve(gl).pts, { color: gl ? 'prior' : 'teal', w: 2.5, dash: true, opacity: 0.4 * p.on });
    }
    cpath(P, fit.pts, { color: lam ? 'prior' : 'teal', opacity: p.on });
    training(P);
    const sec = g.root.closest('section'), out = sec && sec.querySelector('.ro');
    if (out) {
      out.querySelector('.v-lam').textContent = sig(lam, 2);
      out.querySelector('.v-norm').textContent = sig(fit.norm, 3);
    }
  }
};

// Slide 15: least squares and ridge against the truth.
FIGS.lsridge = {
  size: LR,
  draw(g) {
    const P = g.plot(lrBox());
    lrAxes(P);
    truthLine(P);
    cpath(P, fitCurve(0).pts, { color: 'teal' });
    cpath(P, fitCurve(0.8).pts, { color: 'prior' });
    training(P);
  }
};

// Slide 23 (states 1-6): a constant, the quadratic and the degree-11 fit.
FIGS.fits = {
  size: LR,
  draw(g, p) {
    const P = g.plot(lrBox()), op = k => clamp(1 - Math.abs(p.s - k));
    lrAxes(P);
    truthLine(P);
    cpath(P, [[-1, -0.11], [1, -0.11]], { color: 'brown', opacity: op(1) });
    cpath(P, SMOOTH(0), { color: 'pred', opacity: op(2) });
    cpath(P, fitCurve(0).pts, { color: 'teal', opacity: op(3) });
    training(P);
  }
};

// Slide 27: three candidates.
FIGS.cands = {
  size: [620, 340],
  draw(g) {
    const P = g.plot(lrBox(270));
    lrAxes(P);
    cpath(P, fitCurve(0).pts, { color: 'teal' });
    cpath(P, fitCurve(0.8).pts, { color: 'prior' });
    cpath(P, fitCurve(25).pts, { color: 'prior', opacity: 0.5 });
    training(P);
  }
};
// Slide 27: the three disjoint datasets.
FIGS.split = {
  size: [1080, 58],
  draw(g) {
    [[202, 389, 'like', 'Training'], [567, 324, 'pred', 'Validation'], [907, 324, 'mle', 'Test']].forEach(([cx, w, c, s], i) => {
      g.el('rect', { x: cx - w / 2, y: 2, width: w, height: 52, fill: colorOf(c), 'fill-opacity': 0.08, stroke: colorOf(c), 'stroke-width': 1.5 });
      g.label('s' + i, s, [cx, 28], 'c');
    });
  }
};

// ---------------------------------------------------------------- coefficient pictures (Slides 6, 9, 12-14)
// Sarvin's \coeffaxes: a grid on [-2, 2]^2, axes theta_1 and theta_2, ticks at -1 and 1.
const coefBox = s => tikz(-2.7, 2.8, -2.7, 2.9, s, s, 6, 4);
function coefAxes(P) {
  for (let v = -2; v <= 2; v++) { P.line([v, -2], [v, 2], { color: C.grid, w: 1 }); P.line([-2, v], [2, v], { color: C.grid, w: 1 }); }
  P.arrow([-2.3, 0], [2.4, 0]);
  P.arrow([0, -2.3], [0, 2.4]);
  for (const v of [-1, 1]) { P.text([v, 0], minus(v), { dy: 18, size: 15 }); P.text([0, v], minus(v), { anchor: 'end', dx: -6, dy: 5, size: 15 }); }
  P.label('t1', '$\\theta_1$', [2.4, 0], 'l', { dx: 6, color: STYLE.axisName });
  P.label('t2', '$\\theta_2$', [0, 2.4], 'b', { dy: -2, color: STYLE.axisName });
}
const RINGS = [0.65, 1.25, 1.9];
// level sets of sum |theta_i|^q at three sizes: q = 2 circles, q = 1 diamonds, q = 1/2 astroid-like curves
function levelSets(P, q, st) {
  for (const r of RINGS) {
    if (q === 2) P.ellipse(0, Object.assign({ r }, st));
    else if (q === 1) P.path([[r, 0], [0, r], [-r, 0], [0, -r]], Object.assign({ close: true, join: 'round' }, st));
    else for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]])
      P.param(t => [a * r * t * t, b * r * (1 - t) ** 2], Object.assign({ from: 0, to: 1, n: 60 }, st));
  }
}
// Slides 9, 13, 14: equal-density contours; s fades them in, lab adds Slide 9's centre and name
const COEF = coefBox(62);
FIGS.coef = {
  size: tikzSize(COEF),
  draw(g, p) {
    const P = g.plot(COEF), s = p.s ?? 1, col = { 2: 'prior', 1: 'brown', 0.5: 'rose' }[p.q];
    coefAxes(P);
    if (p.lab) P.ellipse(0, { r: 1.9, color: 'none', fill: 'prior', fo: 0.06, opacity: s });
    levelSets(P, p.q, { color: col, w: 2.5, opacity: s });
    if (p.lab) {
      P.dot([0, 0], { r: 4.5, color: 'prior', outline: false, opacity: s });
      P.label('gp', 'Gaussian prior', [0, -2.6], 'c', { color: 'prior', opacity: s });
    }
  }
};
// Slide 6: the penalized and constrained forms of one ridge problem, linked.  X^T X =
// [[2, 0.5], [0.5, 1]] and X^T y = (3.5, 1.75), so the least-squares solution is (1.5, 1); the
// ridge path theta(lam) = (X^T X + lam I)^-1 X^T y has t(lam) = |theta(lam)|^2, falling from 3.25
// at lam = 0.  Both pictures draw from the state's lam.
const RXX = [[2, 0.5], [0.5, 1]], RXY = [3.5, 1.75], RLS = [1.5, 1];
function ridgeAt(l) {
  const a = RXX[0][0] + l, b = RXX[0][1], d = RXX[1][1] + l, det = a * d - b * b;
  return [(d * RXY[0] - b * RXY[1]) / det, (a * RXY[1] - b * RXY[0]) / det];
}
const tAt = l => { const q = ridgeAt(l); return q[0] * q[0] + q[1] * q[1]; };
// lam from t, by bisection in log lam on the monotone path (t falls as lam grows)
function lamAtT(t) {
  let lo = Math.log(0.05), hi = Math.log(20);
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (tAt(Math.exp(m)) > t) lo = m; else hi = m; }
  return Math.exp((lo + hi) / 2);
}
// the loss contour (theta - LS)^T X^T X (theta - LS) = k, as LS + sqrt(k) L u with L L^T = (X^T X)^-1
const RLL = (() => {
  const det = RXX[0][0] * RXX[1][1] - RXX[0][1] ** 2, i11 = RXX[1][1] / det, i12 = -RXX[0][1] / det, i22 = RXX[0][0] / det;
  const l11 = Math.sqrt(i11), l21 = i12 / l11;
  return [l11, l21, Math.sqrt(i22 - l21 * l21)];
})();
const lossRing = k => linspace(0, 2 * Math.PI, 161).map(a => {
  const s = Math.sqrt(k), u = Math.cos(a), v = Math.sin(a);
  return [RLS[0] + s * RLL[0] * u, RLS[1] + s * (RLL[1] * u + RLL[2] * v)];
});
const lossAt = q => { const d = [q[0] - RLS[0], q[1] - RLS[1]]; return RXX[0][0] * d[0] * d[0] + 2 * RXX[0][1] * d[0] * d[1] + RXX[1][1] * d[1] * d[1]; };
// a slider of the figure's slide set from the figure's state, unless the presenter is dragging it
function setKnob(g, param, v) {
  const sec = g.root.closest('section'), inp = sec && sec.querySelector(`input[data-param="${param}"]`);
  if (inp && document.activeElement !== inp) inp.value = v;
}
// candidate for deck.js: linked sliders.  On a slide of class "linked" each slider drives one value
// shared by all its figures, lam: the lambda slider directly (log10, two significant figures, as
// shown), the t slider through lamAtT; each figure's draw then moves the other slider.  The listener
// runs in the capture phase on the document, so the engine's per-figure slider handler never sees
// these inputs.
document.addEventListener('input', e => {
  const inp = e.target;
  if (!(inp instanceof HTMLInputElement) || !inp.dataset.param || !inp.closest('section.linked')) return;
  e.stopPropagation();
  const lam = inp.dataset.param === 'll' ? clamp(+(10 ** +inp.value).toPrecision(2), 0.05, 20) : lamAtT(+inp.value);
  inp.closest('section').querySelectorAll('.fig[data-fig]').forEach(root => {
    const st = live.get(root) || {};
    cancelAnimationFrame(st.raf);
    const p = Object.assign({}, st.p || stateFor(root), { lam });
    FIGS[root.dataset.fig].render(root, p); st.p = p; live.set(root, st);
  });
}, true);
// The two pictures share one layout: a 30 px band on top for the axis names (and the key), a
// 297 x 240 plot (the constraint plot at equal scales, 57 px per unit), 26 px for the ticks.  Tick
// numbers and labels are 15 and 14 px with a white halo; each plot has a light frame, so a
// clipped curve ends at a visible edge.
const LTOP = 30, LPW = 297, LPH = 240, LBOT = 26;
const halo = { stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' };
const tick = (g, at, v, anchor) => g.text(at, minus(v), Object.assign({ size: 15, anchor }, halo));
const frame = P => P.g.el('rect', { x: P.X(P.xlo), y: P.Y(P.yhi), width: P.X(P.xhi) - P.X(P.xlo), height: P.Y(P.ylo) - P.Y(P.yhi),
  fill: 'none', stroke: '#cfcfcf', 'stroke-width': 1 });
// a readout in the slide's slider bar (class .v-NAME), so it sits on the slider's line
function readout(g, name, s) {
  const sec = g.root.closest('section');
  if (sec) sec.querySelectorAll('.v-' + name).forEach(e => { if (e.textContent !== s) e.textContent = s; });
}
// the penalty lam |theta|^2 against |theta| (fixed y range, so it steepens with lam), with
// |theta(lam)| = sqrt t marked by a dashed line and a dot on the curve
const LPEN = box2d(42, LTOP, LPW, LPH, 0, 2, 0, 8);
FIGS.penpic = {
  size: [42 + LPW + 52, LTOP + LPH + LBOT],
  draw(g, p) {
    const P = g.plot(LPEN), l = p.lam, r = Math.sqrt(tAt(l)), h = l * r * r;
    for (const v of [0.5, 1, 1.5]) P.line([v, 0], [v, 8], { color: C.grid, w: 1 });
    for (const v of [2, 4, 6]) P.line([0, v], [2, v], { color: C.grid, w: 1 });
    frame(P);
    g.arrow(P.px([0, 0]), [P.X(2) + 14, P.Y(0)]);
    g.arrow(P.px([0, 0]), [P.X(0), P.Y(8) - 14]);
    for (const v of [0, 0.5, 1, 1.5, 2]) tick(g, [P.X(v), P.Y(0) + 19], v, 'middle');
    for (const v of [0, 2, 4, 6, 8]) tick(g, [P.X(0) - 7, P.Y(v) + 5], v, 'end');
    g.label('bx', '$\\|\\btheta\\|_2$', [P.X(2) + 18, P.Y(0)], 'l', { color: STYLE.axisName });
    g.label('by', '$\\lambda\\|\\btheta\\|_2^2$', [P.X(0) + 7, P.Y(8) - 14], 'l', { color: STYLE.axisName });
    cpath(P, linspace(0, 2, 201).map(x => [x, l * x * x]), { color: 'prior' });
    P.line([r, 0], [r, h], { color: 'prior', w: 2, dash: '6 5' });
    P.dot([r, h], { color: 'prior', r: 6 });
    // sqrt t above and left of the dot, clear of the convex curve, and kept right of the y axis
    const [dx, dy] = P.px([r, h]), right = Math.max(dx - 6, P.X(0) + 30);
    g.label('st', '$\\sqrt t$', [right, dy - 7], 'br', { color: 'prior' });
    readout(g, 'lam', l.toPrecision(2));
    setKnob(g, 'll', Math.log10(l));
  }
};
// the constraint: the disk |theta| <= sqrt t, the loss contours around the least-squares solution,
// and the one through theta(lam), which touches the circle there; a key names the two dots
const LCON = box2d(30, LTOP, LPW, LPH, -1.9, 3.3, -1.9, 2.3), LCW = 30 + LPW + 44;
FIGS.conpic = {
  size: [LCW, LTOP + LPH + LBOT],
  draw(g, p) {
    const P = g.plot(LCON), l = p.lam, q = ridgeAt(l), t = tAt(l);
    for (const v of [-1, 1, 2, 3]) P.line([v, P.ylo], [v, P.yhi], { color: C.grid, w: 1 });
    for (const v of [-1, 1, 2]) P.line([P.xlo, v], [P.xhi, v], { color: C.grid, w: 1 });
    frame(P);
    P.ellipse(0, { r: Math.sqrt(t), color: 'prior', fill: 'prior', fo: 0.12, w: 2.5 });
    g.arrow([P.X(P.xlo), P.Y(0)], [P.X(P.xhi) + 14, P.Y(0)]);
    g.arrow([P.X(0), P.Y(P.ylo)], [P.X(0), P.Y(P.yhi) - 14]);
    // the tick numbers on the frame's bottom and left edges, outside the plot, where no curve reaches
    for (const v of [-1, 1, 2, 3]) tick(g, [P.X(v), P.Y(P.ylo) + 19], v, 'middle');
    for (const v of [-1, 1, 2]) tick(g, [P.X(P.xlo) - 7, P.Y(v) + 5], v, 'end');
    g.label('bx', '$\\theta_1$', [P.X(P.xhi) + 18, P.Y(0)], 'l', { color: STYLE.axisName });
    g.label('by', '$\\theta_2$', [P.X(0) + 7, P.Y(P.yhi) - 14], 'l', { color: STYLE.axisName });
    for (const k of [0.25, 1, 2.25, 4, 6.25]) cpath(P, lossRing(k), { color: 'teal', w: 1.5, opacity: 0.45 });
    cpath(P, lossRing(lossAt(q)), { color: 'teal', w: 3 });
    P.dot(RLS, { color: 'teal', r: 5 });
    P.dot(q, { color: 'prior', r: clamp(0.45 * Math.sqrt(t) * (P.X(1) - P.X(0)), 3.5, 6) });   // smaller on a small circle, so the touch shows
    g.label('key', `<span style="color:${C.prior}">&#9679;&nbsp;$\\widehat{\\btheta}(\\lambda)$</span>&emsp;` +
      `<span style="color:${C.teal}">&#9679;&nbsp;$\\widehat{\\btheta}_{\\rm LS}$</span>`, [P.X(P.xhi), P.Y(P.yhi) - 13], 'r');
    readout(g, 't', t.toFixed(3));
    setKnob(g, 'tq', t.toFixed(3));
  }
};

// Slide 8: a singular X^T X.  X = [[1,2],[2,4],[3,6]], y = (2,4,6): X theta = (theta1 + 2 theta2)(1,2,3),
// so the least-squares loss is 14 (theta1 + 2 theta2 - 2)^2, constant along lines; theta1 + 2 theta2 = 2
// is the line of minimizers.  The ridge objective adds lam |theta|^2: elliptical contours
// (theta - th)^T (X^T X + lam I)(theta - th) = c around its one minimizer th = 28/(70 + lam) (1, 2).
// States: ls (the least-squares lines), rg (the ridge contours and minimizer), ll = log10 lam.
const SXX = [[14, 28], [28, 56]];
const sideMin = l => { const c = 28 / (70 + l); return [c, 2 * c]; };
function ridgeRing(l, c) {   // (theta - th)^T M (theta - th) = c, M = X^T X + lam I, via M^-1 = L L^T
  const a = SXX[0][0] + l, b = SXX[0][1], d = SXX[1][1] + l, det = a * d - b * b, i11 = d / det, i12 = -b / det, i22 = a / det;
  const l11 = Math.sqrt(i11), l21 = i12 / l11, l22 = Math.sqrt(i22 - l21 * l21), th = sideMin(l), r = Math.sqrt(c);
  return linspace(0, 2 * Math.PI, 241).map(t => [th[0] + r * l11 * Math.cos(t), th[1] + r * (l21 * Math.cos(t) + l22 * Math.sin(t))]);
}
const SIDE = box2d(30, 30, 4 * 110, 3 * 110, -1, 3, -1, 2), SIDEW = 30 + 4 * 110 + 44;
FIGS.side = {
  size: [SIDEW, 30 + 3 * 110 + 26],
  draw(g, p) {
    const P = g.plot(SIDE), l = clamp(+(10 ** p.ll).toPrecision(2), 0.1, 50), th = sideMin(l);
    for (const v of [1, 2]) P.line([v, P.ylo], [v, P.yhi], { color: C.grid, w: 1 });
    for (const v of [1]) P.line([P.xlo, v], [P.xhi, v], { color: C.grid, w: 1 });
    frame(P);
    g.arrow([P.X(P.xlo), P.Y(0)], [P.X(P.xhi) + 14, P.Y(0)]);
    g.arrow([P.X(0), P.Y(P.ylo)], [P.X(0), P.Y(P.yhi) - 14]);
    for (const v of [1, 2, 3]) tick(g, [P.X(v), P.Y(P.ylo) + 19], v, 'middle');   // no -1 ticks: they would meet at the corner
    for (const v of [1, 2]) tick(g, [P.X(P.xlo) - 7, P.Y(v) + 5], v, 'end');
    g.label('bx', '$\\theta_1$', [P.X(P.xhi) + 18, P.Y(0)], 'l', { color: STYLE.axisName });
    g.label('by', '$\\theta_2$', [P.X(0) + 7, P.Y(P.yhi) - 14], 'l', { color: STYLE.axisName });
    // the least-squares contours theta1 + 2 theta2 = 2 + d, and the line of minimizers (d = 0)
    const lsLine = d => [-3, 5].map(x => [x, (2 + d - x) / 2]);
    for (const d of [-4, -3, -2, -1, 1, 2, 3, 4]) cpath(P, lsLine(d), { color: 'teal', w: 1.5, opacity: 0.45 * p.ls });
    cpath(P, lsLine(0), { color: 'teal', w: 3.5, opacity: p.ls });
    // its label along the line's upper-left end, 0.3 above it: clear of the axes, of the ridge
    // contours (at most 0.18 from the line) and of the next least-squares line (0.45)
    const at = [-0.6, 1.3], nrm = [1 / Math.sqrt(5), 2 / Math.sqrt(5)], off = 0.3, ang = Math.atan2(P.Y(-0.5) - P.Y(0), P.X(1) - P.X(0)) * 180 / Math.PI;
    P.label('mn', `<span style="display:inline-block;transform:rotate(${ang.toFixed(2)}deg)">minimizers</span>`,
      [at[0] + off * nrm[0], at[1] + off * nrm[1]], 'c', { color: 'teal', opacity: p.ls });
    // the ridge objective's contours and its minimizer
    for (const c of [0.25, 1, 2.25]) cpath(P, ridgeRing(l, c), { color: 'prior', w: 2, opacity: p.rg });
    P.dot(th, { color: 'prior', r: 6, opacity: p.rg });
    g.label('key', `<span style="color:${C.prior}">&#9679;&nbsp;$\\widehat{\\btheta}_{\\rm ridge}$, $\\lambda=${l.toPrecision(2)}$</span>`,
      [P.X(P.xhi), P.Y(P.yhi) - 13], 'r', { opacity: p.rg });
    readout(g, 'lam9', l.toPrecision(2));
  }
};

// Slide 10: a schematic coefficient vector, small entries (state 1) and exact zeros (state 2).
const FEAT = tikz(0.5, 5.5, -1.1, 3.5, 138, 53);
FIGS.feat = {
  size: tikzSize(FEAT),
  draw(g, p) {
    const P = g.plot(FEAT);
    P.line([0.6, 0], [5.4, 0], { color: C.axis, w: 1.5 });
    P.rect([0.85, 0], [1.15, 2.8], { color: 'prior', fo: 0.65 });
    P.rect([3.85, 0], [4.15, 1.9], { color: 'prior', fo: 0.65 });
    [[2, 0.05], [3, -0.03], [5, 0.01]].forEach(([j, h]) => {
      P.rect([j - 0.15, 0], [j + 0.15, h], { color: '#737373', opacity: 1 - p.z });
      P.dot([j, 0], { r: 7, color: 'brown', outline: false, opacity: p.z });
    });
    for (let j = 1; j <= 5; j++) P.label('f' + j, 'feature ' + j, [j, -0.3], 't');
  }
};

// Slide 12: the smallest loss contour touching the l2 circle (s = 1) or the l1 diamond (s = 2).
const GEOM = tikz(-2, 5.1, -2.1, 2.6, 88, 88, 4, 4);   // to 5.1: the widest contour reaches 5.0
const R_RIDGE = 1.2699093, R_LASSO = Math.sqrt(1.2 ** 2 + 1.6 * 0.55 ** 2), LOSS = [[1, 0], [0, 1 / 1.6]];
FIGS.geom = {
  size: tikzSize(GEOM),
  draw(g, p) {
    const P = g.plot(GEOM), a = clamp(2 - p.s), b = clamp(p.s - 1), c = clamp(p.s - 2);
    for (let v = -1; v <= 3; v++) P.line([v, -1.5], [v, 2], { color: C.grid, w: 1 });
    for (let v = -1; v <= 2; v++) P.line([-1.5, v], [3.5, v], { color: C.grid, w: 1 });
    P.line([-1.5, -1.5], [3.5, -1.5], { color: C.grid, w: 1 });
    P.line([-1.5, -1.5], [-1.5, 2], { color: C.grid, w: 1 });
    P.arrow([-1.8, 0], [4, 0]);
    P.arrow([0, -1.7], [0, 2.2]);
    P.label('t1', '$\\theta_1$', [4, 0], 'l', { dx: 6, color: STYLE.axisName });
    P.label('t2', '$\\theta_2$', [0, 2.2], 'b', { dy: -2, color: STYLE.axisName });
    for (const r of [0.5, 0.9, 1.4, 1.9, 2.4]) P.ellipse(LOSS, { r, at: [2.6, 0.55], color: 'teal', w: 2.5, opacity: 0.6 });
    P.ellipse(0, { r: 1.4, color: 'prior', fill: 'prior', fo: 0.1, w: 3.5, opacity: a });
    P.path([[1.4, 0], [0, 1.4], [-1.4, 0], [0, -1.4]], { close: true, join: 'round', color: 'brown', fill: 'brown', fo: 0.1, w: 3.5, opacity: b });
    P.ellipse(LOSS, { r: lerp(R_RIDGE, R_LASSO, b), at: [2.6, 0.55], color: 'teal', w: 3.5 });
    P.dot([2.6, 0.55], { r: 5, color: 'teal', outline: false });
    P.label('unc', 'unconstrained', [2.6, 0.65], 'b', { color: 'teal' });
    P.dot([1.3556726, 0.3495022], { r: 6, color: 'prior', opacity: a });
    P.label('ridge', 'ridge', [1.3556726, 0.3495022], 'br', { dx: -6, dy: -4, color: 'prior', opacity: a });
    P.dot([1.4, 0], { r: 6, color: 'brown', opacity: b });
    P.arrow([2, -1.1], [1.43, -0.04], { color: 'rose', w: 2, opacity: c });
    P.label('corner', centred('corner lies on an axis<br>$\\theta_2=0$'), [2.7, -1.5], 'c', { color: 'rose', opacity: c });
  }
};

// ---------------------------------------------------------------- noise and prediction error (Slides 16, 17, 20)
// Slide 16: the conditional density of Y at one input, drawn sideways.
const CEIL = tikz(-0.2, 4.3, -0.35, 4.8, 109, 75, 4, 6);
FIGS.ceiling = {
  size: tikzSize(CEIL, [40, 0]),
  draw(g) {
    const P = g.plot(CEIL), dens = y => 2 + 0.9 * Math.exp(-((y - 2.45) ** 2) / (2 * 0.55 ** 2));
    for (let v = 0; v <= 3; v++) P.line([v, 0], [v, 4.4], { color: C.grid, w: 1 });
    for (let v = 0; v <= 4; v++) P.line([0, v], [3.7, v], { color: C.grid, w: 1 });
    P.arrow([0, 0], [4, 0]);
    P.arrow([0, 0], [0, 4.6]);
    P.label('ax', '$x$', [4, 0], 'l', { dx: 6, color: STYLE.axisName });
    P.label('ay', '$Y$', [0, 4.6], 'b', { dy: -2, color: STYLE.axisName });
    P.line([0.3, 1.09], [3.2, 3.41], { color: 'ink', w: 2.5, dash: true });
    P.line([2, 0], [2, 4.4], { color: 'pred', w: 2.5, opacity: 0.65 });
    const ys = linspace(0.4, 4.4, 81), curve = ys.map(y => [dens(y), y]);
    P.path(curve.concat([[2, 4.4], [2, 0.4]]), { close: true, fill: 'pred', fo: 0.13, stroke: null });
    P.path(curve, { color: 'pred', w: 3.5, join: 'round' });
    P.line([0, 2.45], [3.45, 2.45], { color: '#8c8c8c', w: 1.5, dash: '2 4' });
    for (const y of [1.55, 2.13, 2.9, 3.3]) P.dot([2, y], { r: 6, color: 'prior' });
    P.dot([2, 2.45], { r: 6.5, color: 'ink' });
    P.label('fx', 'fixed $x$', [2, 0], 't', { dy: 4, color: 'pred' });
    P.label('yb', '$\\ybar(x)$', [3.1, 2.45], 'l', { dx: 6 });
    P.label('hw', small('horizontal width<br>is density'), [2.4, 4], 'l', { dx: 6, color: 'pred' });
  }
};

// Slide 17: a fixed predictor f(x) against the mean of Y at x.
const ERRF = tikz(-0.4, 4.2, -0.3, 3.8, 93, 77, 4, 4);
FIGS.errf = {
  size: tikzSize(ERRF, [20, 0]),
  draw(g) {
    const P = g.plot(ERRF), ys = linspace(0.2, 3.2, 71);
    P.arrow([0, 0], [0, 3.5]);
    P.label('ay', '$Y$', [0, 3.5], 'b', { dy: -2, color: STYLE.axisName });
    P.line([0.4, 0.2], [0.4, 3.2], { color: C.axis, w: 1.5 });
    P.path(ys.map(y => [0.4 + 1.2 * Math.exp(-((y - 1.7) ** 2) / (2 * 0.48 ** 2)), y]), { color: 'pred', w: 3.5, join: 'round' });
    P.line([0, 2.7], [2.6, 2.7], { color: 'rose', w: 2, dash: true });
    P.line([0, 1.7], [2.6, 1.7], { color: 'ink', w: 2, dash: true });
    arrow2(P, [2.3, 1.7], [2.3, 2.7], { color: 'rose', w: 2.5 });
    P.label('f', '$f(\\bx)$', [2.6, 2.7], 'l', { dx: 6, color: 'rose' });
    P.label('yb', '$\\ybar(\\bx)$', [2.6, 1.7], 'l', { dx: 6 });
  }
};

// Slide 20: one small picture per term (k = 1 noise, 2 bias, 3 variance).
const MINI = tikz(-0.1, 3.5, -0.2, 2.4, 81, 53, 4, 4);
FIGS.bvmini = {
  size: tikzSize(MINI, [50, 0]),
  draw(g, p) {
    const P = g.plot(MINI);
    if (p.k === 1) {
      P.line([0.5, 0], [0.5, 2.2], { color: C.axis, w: 1.5 });
      P.path(linspace(0, 2.2, 61).map(y => [0.5 + Math.exp(-((y - 1.1) ** 2) / 0.3), y]), { color: 'pred', w: 2.5, join: 'round' });
      P.label('ny', 'new $Y$', [1.6, 1.1], 'l', { dx: 4, color: 'pred' });
    } else if (p.k === 2) {
      P.line([0.2, 0.7], [3, 0.7], { color: 'ink', w: 2, dash: true });
      P.label('tr', 'truth', [3, 0.7], 'l', { dx: 4 });
      P.line([0.2, 1.8], [3, 1.8], { color: 'rose', w: 2.5 });
      arrow2(P, [1.6, 0.7], [1.6, 1.8], { color: 'rose', w: 2.5 });
    } else {
      P.line([0.2, 1.1], [3.1, 1.1], { color: 'postC', w: 2, dash: true });
      for (const q of [[0.5, 0.35], [1, 1.6], [1.5, 0.8], [2, 2], [2.5, 1.0]]) P.dot(q, { r: 5.5, color: 'postC', outline: false });
    }
  }
};

// ---------------------------------------------------------------- repeated datasets (Slides 18, 19, 21, 22)
// Sarvin's lrsmall: x in [-1, 1], y in [-2, 1.7].
const smallBox = (W, H) => box2d(46, 24, W, H, -1, 1, -2, 1.7);
const smallAxes = P => pgfAxes(P, { xt: [-1, 0, 1], yt: [-1, 0, 1], names: ['$x$', '$y$'] });
const REPX = () => DATA.repeatX, REPY = j => DATA.repeatY[j];
// least-squares fits of degree d on the eight datasets, on GRID
const repFits = memo(d => DATA.repeatY.map(y => { const c = chebFit(REPX(), y, d); return GRID.map(x => [x, chebAt(c, x)]); }));

// Slide 18: three independent datasets and their quadratic fits (k = how many so far).
const DS = ['prior', 'brown', 'rose'];
FIGS.rand = {
  size: LR,
  draw(g, p) {
    const P = g.plot(lrBox());
    lrAxes(P);
    truthLine(P);
    for (let j = 0; j < 3; j++) {
      const on = clamp(1 - Math.abs(p.k - 1 - j));   // only the current dataset's points
      REPX().forEach((x, i) => P.dot([x, REPY(j)[i]], { r: 5, color: DS[j], outline: false, opacity: 0.6 * on }));
    }
    for (let j = 0; j < 3; j++) cpath(P, repFits(2)[j], { color: DS[j], w: 2.5, opacity: clamp(p.k - j) });
  }
};

// Slide 19: schematic repeated-fit panels (generate_plot_data.py's paired deviations,
// whose average is exactly truth + bias).
const PANEL = { A: [0.65, 0.06, 'brown'], B: [0, 0.55, 'prior'], C: [0, 0.08, 'teal'] };
FIGS.panel = {
  size: [380, 270],
  draw(g, p) {
    const P = g.plot(smallBox(296, 206)), [bias, spread, col] = PANEL[p.w];
    smallAxes(P);
    for (let k = 1; k <= 3; k++) for (const sgn of [1, -1]) {
      const dev = x => spread * (0.35 * k + (0.6 - 0.2 * k) * x + 0.25 * Math.sin(k * Math.PI * x));
      cpath(P, GRID.map(x => [x, truth(x) + bias + sgn * dev(x)]), { color: col, w: 1.6, opacity: 0.45 });
    }
    cpath(P, GRID.map(x => [x, truth(x) + bias]), { color: col, w: 4 });
    truthLine(P);
  }
};

// Slide 21: least-squares fits of one degree on the eight datasets, refitted live.
FIGS.degfits = {
  size: LR,
  draw(g, p) {
    const P = g.plot(lrBox()), d = clamp(Math.round(p.deg), 0, 11);
    lrAxes(P);
    for (const f of repFits(d)) cpath(P, f, { color: 'teal', w: 1.8, opacity: 0.55 });
    truthLine(P);
  }
};

// Slide 22: integrated squared bias and variance against the degree; more data.
const errBox = (W, H, xlo, xhi, ylo, yhi) => box2d(66, 40, W, H, xlo, xhi, ylo, yhi);
const col = (rows, j) => rows.map(r => [r[0], r[j]]);
FIGS.comp = {
  size: [580, 360],
  draw(g, p) {
    const P = g.plot(errBox(460, 250, 0, 11, 0, 0.36));
    pgfAxes(P, { xt: [0, 2, 5, 8, 11], yt: [0, 0.1, 0.2, 0.3], names: ['polynomial degree', 'error component'], xname: 'below', yname: 'above' });
    cpath(P, col(DATA.complexity, 3), { color: 'rose' });
    cpath(P, col(DATA.complexity, 4), { color: 'postC', opacity: p.v });
  }
};
FIGS.moredata = {
  size: [440, 196],
  draw(g) {
    const P = g.plot(smallBox(360, 136));
    smallAxes(P);
    DATA.moreData.forEach(f => cpath(P, f.map((y, i) => [GRID[i], y]), { color: 'teal', w: 1.6, opacity: 0.5 }));
    truthLine(P);
  }
};

// ---------------------------------------------------------------- risk curves (Slides 24, 25, 26)
FIGS.traintest = {
  size: [600, 370],
  draw(g, p) {
    const P = g.plot(errBox(480, 260, 0, 11, 0, 0.55));
    P.rect([0, 0], [1.5, 0.55], { color: 'brown', fo: 0.07, opacity: p.r });
    P.rect([1.5, 0], [3.5, 0.55], { color: 'pred', fo: 0.07, opacity: p.r });
    P.rect([3.5, 0], [11, 0.55], { color: 'rose', fo: 0.06, opacity: p.r });
    pgfAxes(P, { xt: [0, 2, 5, 8, 11], yt: [0, 0.1, 0.3, 0.5], names: ['polynomial degree', 'mean squared error'], xname: 'below', yname: 'above' });
    cpath(P, col(DATA.complexity, 1), { color: 'like' });
    cpath(P, col(DATA.complexity, 2), { color: 'teal', opacity: p.r });
    P.line([0, 0.09], [11, 0.09], { color: '#999', w: 1.5, dash: true, opacity: p.r });
    P.label('uf', small('underfit'), [0.8, 0.51], 'c', { color: 'brown', opacity: p.r });
    P.label('bal', small('balance'), [2.5, 0.51], 'c', { color: 'pred', opacity: p.r });
    P.label('of', small('overfit'), [7.5, 0.51], 'c', { color: 'rose', opacity: p.r });
  }
};

// Slide 25: exact ridge risk in one orthonormal-design direction: true prediction 1,
// unregularized prediction variance 0.6, noise 0.2.
const LAMS = linspace(0, 5, 181);
FIGS.ridgerisk = {
  size: [600, 370],
  draw(g, p) {
    const P = g.plot(errBox(480, 260, 0, 5, 0, 1.05));
    pgfAxes(P, { xt: [0, 1, 3, 5], yt: [0, 0.2, 0.6, 1], names: ['$\\lambda$', 'prediction error'], xname: 'below', yname: 'above' });
    const b2 = l => (l / (1 + l)) ** 2, v = l => 0.6 / (1 + l) ** 2;
    cpath(P, LAMS.map(l => [l, v(l)]), { color: 'postC' });
    cpath(P, LAMS.map(l => [l, b2(l)]), { color: 'rose', opacity: p.b });
    cpath(P, LAMS.map(l => [l, 0.2 + b2(l) + v(l)]), { color: 'teal', opacity: p.t });
    P.line([0, 0.2], [5, 0.2], { color: '#999', w: 1.5, dash: true, opacity: p.t });
    P.label('irr', small('irreducible error'), [4.95, 0.2], 'br', { dy: -2, color: '#737373', opacity: p.t });
    P.dot([0.6, 0.575], { r: 6, color: 'teal', opacity: p.t });
    P.label('min', 'minimum', [0.6, 0.575], 'bl', { dx: 4, dy: -2, color: 'teal', opacity: p.t });
  }
};
// Slide 25, state 5: Example 5.6 with the curvature-only penalty b theta_2^2.
const BS = linspace(0, 8, 181);
FIGS.selrisk = {
  size: [470, 300],
  draw(g) {
    const P = g.plot(errBox(370, 200, 0, 8, 0, 20));
    pgfAxes(P, { xt: [0, 2, 4, 8], yt: [0, 5, 10, 15, 20], names: ['$b$', 'test error / $\\sigma^2$'], xname: 'below', yname: 'above' });
    cpath(P, BS.map(b => [b, (14 + 81 / (1 + 5 * b / 4) ** 2) / 5]), { color: 'teal' });
    P.line([0, 2.8], [8, 2.8], { color: '#999', w: 1.5, dash: true });
  }
};

// Slide 26: a sinusoidal mean and the linear family.
FIGS.mismatch = {
  size: [620, 370],
  draw(g) {
    const P = g.plot(errBox(500, 280, -6.5, 6.5, -1.6, 1.6));
    pgfAxes(P, { xt: [-6, -3, 0, 3, 6], yt: [-1, 0, 1], names: ['$x$', '$y$'] });
    cpath(P, linspace(-6.3, 6.3, 160).map(x => [x, Math.sin(x)]), { color: 'ink', w: 2.5, dash: true });
    linspace(-6, 6, 34).forEach(x => P.dot([x, Math.sin(x) + 0.17 * Math.sin(17 * x)], { r: 4.5, color: 'like', outline: false }));
    cpath(P, [[-6.3, 0.079 * 6.3], [6.3, -0.079 * 6.3]], { color: 'rose' });
  }
};

// ---------------------------------------------------------------- train, validate, test (Slide 28)
const TVT = tikz(-0.2, 14.5, -0.4, 3.8, 81, 81, 4, 0);
FIGS.tvt = {
  size: tikzSize(TVT),
  draw(g, p) {
    const P = g.plot(TVT);
    const parts = [
      [2.1, 'like', 'TRAINING SET', 'Fit model parameters', 'For each degree or $\\lambda$,<br>estimate $\\widehat{\\btheta}$ here.', 1],
      [7.05, 'pred', 'VALIDATION SET', 'Compare fitted candidates', 'Choose degree, $\\lambda$,<br>or model family here.', clamp(p.k - 1)],
      [12, 'mle', 'TEST SET', 'Evaluate the final choice', 'After selection is complete,<br>assess future performance here.', clamp(p.k - 2)]];
    parts.forEach(([x, c, t, s, u, op], i) => {
      const [cx, cy] = P.px([x, 2.6]);
      g.el('rect', { x: cx - 160, y: cy - 44, width: 320, height: 88, rx: 6, fill: colorOf(c), 'fill-opacity': 0.07,
        stroke: colorOf(c), 'stroke-width': 1.5, opacity: op });
      g.label('b' + i, centred(`<b>${t}</b><br>${s}`), [cx, cy], 'c', { opacity: op });
      g.label('u' + i, centred(small(u)), P.px([x, 1]), 'c', { opacity: op });
      if (i) { const [px] = P.px([parts[i - 1][0], 0]); g.arrow([px + 162, cy], [cx - 162, cy], { color: '#888', w: 2, opacity: op }); }
    });
  }
};

// ---------------------------------------------------------------- computation and root finding (Slides 29-34)
// Slide 29: a data matrix, one row picked out.
const DMAT = tikz(-1, 16, -2, 25, 27, 14.6, 4, 4);
FIGS.datamat = {
  size: tikzSize(DMAT),
  draw(g) {
    const P = g.plot(DMAT);
    for (let r = 0; r <= 21; r++) for (let c = 0; c <= 12; c++)
      P.rect([c, r], [c + 0.7, r + 0.65], { color: 'like', fo: 0.15 + 0.018 * ((r + c) % 9) });
    P.rect([-0.3, 10.7], [12.9, 11.9], { color: 'none', stroke: 'postC', 'stroke-width': 3.5 });
    P.label('nm', '$n$ observations, $m$ features', [6, -1], 't', { dy: -4 });
  }
};

// Sarvin's rootplot: theta in [-0.5, 3.3], f in [-1.7, 2.2], axes through the origin.
const rootBox = () => box2d(24, 30, 520, 280, -0.5, 3.3, -1.7, 2.2);
const rootAxes = P => pgfAxes(P, { ox: 0, oy: 0, xt: [1, 2, 3], yt: [-1, 1, 2], xg: [0, 1, 2, 3], yg: [-1, 0, 1, 2], names: ['$\\theta$', '$f(\\theta)$'] });
const TANH = linspace(-0.5, 3.3, 110).map(x => [x, Math.tanh(x - 1)]);
const track = (P, rows, y, color, r = 3.5) => {
  const pts = rows.map((q, i) => [q[1], typeof y === 'function' ? y(q, i) : y]);
  cpath(P, pts, { color, w: 2.5 });
  pts.forEach(q => P.dot(q, { r, color, outline: false }));
};
FIGS.root = {
  size: [600, 340],
  draw(g, p) {
    const P = g.plot(rootBox());
    rootAxes(P);
    cpath(P, TANH, { color: 'prior' });
    g.group({ opacity: p.h }, () => track(P, DATA.rootHarmonic, 0, 'teal'));
    P.line([2.8, 0], [2.8, 0.9468], { color: 'brown', w: 2, dash: true, opacity: p.a });
    P.vec([2.8, 0.05], [2.3266, 0.05], { color: 'brown', w: 3.5, head: 12, opacity: p.a });
    P.dot([2.3266, 0], { r: 4.5, color: 'brown', outline: false, opacity: p.a });
    P.dot([1, 0], { r: 6, color: 'teal' });
    P.label('ts', '$\\theta^*$', [1, 0], 'tl', { dx: 6, dy: 4, color: 'teal' });
    P.dot([2.8, 0], { r: 6, color: 'brown' });
    P.label('t0', '$\\theta^{(0)}$', [2.8, 0], 't', { dy: 6, color: 'brown' });
  }
};
FIGS.steps = {
  size: [600, 340],
  draw(g, p) {
    const P = g.plot(rootBox());
    rootAxes(P);
    cpath(P, TANH, { color: 'prior', w: 2.5 });
    P.dot([1, 0], { r: 5.5, color: 'ink' });
    P.label('ts', '$\\theta^*$', [1, 0], 't', { dy: 6 });
    track(P, DATA.rootHarmonic, -0.16, 'teal', 3);
    g.group({ opacity: p.f }, () => track(P, DATA.rootFast, 0.16, 'rose', 3));
  }
};
FIGS.noisy = {
  size: [600, 340],
  draw(g, p) {
    const P = g.plot(rootBox());
    rootAxes(P);
    cpath(P, TANH, { color: 'prior' });
    P.cloud(DATA.rootNoisy.map(q => [q[1], q[2]]), { r: 5, color: 'rose', fo: 0.65 });
    g.group({ opacity: p.i }, () => track(P, DATA.rootNoisy, q => -0.12 - 0.012 * q[0], 'postC', 3));
    P.dot([1, 0], { r: 5.5, color: 'teal' });
    P.label('ts', '$\\theta^*$', [1, 0], 'tl', { dx: 6, dy: 4, color: 'teal' });
  }
};

// Slide 34: gradient descent and SGD on a quadratic with Hessian diag(1, 3), minimum (0.3, -0.2);
// the contours in the deck's sequential purple ramp, as Lecture 14's Demo 2.
FIGS.gdsgd = {
  size: [640, 400],
  draw(g, p) {
    const P = g.plot(box2d(24, 30, 560, 330, -3.2, 3.2, -2.2, 2.5));
    // the loss contours: darker means smaller loss, nearer the minimum
    const rings = [0.4, 0.8, 1.3, 1.9, 2.7, 3.3].map(r => linspace(0, 2 * Math.PI, 121).map(t => [0.3 + r * Math.cos(t), -0.2 + r / Math.sqrt(3) * Math.sin(t)]));
    const lines = contourRamp(P, rings, (ring, col) => cpath(P, ring, { color: col, w: STYLE.contour }));
    lines();
    pgfAxes(P, { ox: 0, oy: 0, xt: [-2, 2], yt: [-2, 2], xg: [-2, 0, 2], yg: [-2, 0, 2], names: ['$\\theta_1$', '$\\theta_2$'] });
    P.dot([0.3, -0.2], { r: 6.5, color: 'ink' });
    P.label('min', 'minimum', [0.3, -0.2], 'tl', { dx: 6, dy: 4 });
    cpath(P, DATA.gdPath, { color: 'teal' });
    cpath(P, DATA.sgdPath, { color: 'postC', w: 2.5, opacity: p.s });
    P.dot([-2.4, 1.9], { r: 5.5, color: 'ink' });
    P.label('st', 'start', [-2.4, 1.9], 'bl', { dx: 6, dy: -2 });
  }
};

// ---------------------------------------------------------------- the whole story (Slide 35)
const STORY = tikz(-0.1, 14.6, -0.6, 5.9, 81, 77, 4, 4);
FIGS.story = {
  size: tikzSize(STORY),
  draw(g) {
    const P = g.plot(STORY);
    const rows = [[5.4, 'LEAST SQUARES', 'Fit the observed data; flexible models can overfit.'],
      [4.1, 'REGULARIZATION', 'Control flexibility with coefficient preferences.'],
      [2.8, 'BIAS AND VARIANCE', 'Explain why accepting some bias can reduce test error.'],
      [1.5, 'VALIDATION', 'Choose the model; use the test set for final evaluation.'],
      [0.2, 'STOCHASTIC GRADIENT DESCENT', 'Make fitting scalable with cheap noisy updates.']];
    rows.forEach(([y, t, s], i) => {
      P.label('r' + i, centred(`<b>${t}</b><br><span style="font-size:20px">${s}</span>`), [5, y], 'c');
      if (i) { const [x, y0] = P.px([5, rows[i - 1][0]]), [, y1] = P.px([5, y]); g.arrow([x, y0 + 30], [x, y1 - 30], { color: '#463C7D', w: 2.5 }); }
    });
    P.line([10.3, 0], [10.3, 5.55], { color: 'pred', w: 2.5, opacity: 0.55 });
    P.label('irr', centred('<b>IRREDUCIBLE<br>NOISE</b><div style="font-size:20px;margin-top:14px">Responses vary<br>even at fixed input.</div>' +
      '<div style="margin-top:14px">$\\var(Y\\mid\\bX=\\bx)$</div><div style="font-size:20px;margin-top:14px">Sets the irreducible<br>lower bound on<br>expected prediction<br>error.</div>'),
      [12.4, 2.8], 'c', { color: 'pred' });
  }
};

// ---------------------------------------------------------------- data
// Tables from Sarvin's plot-data/ (generate_plot_data.py) that come from numpy's
// random draws, at the files' precision.  Everything else is recomputed above.
const DATA = {
  // training.dat and test.dat (x, y): 12 training and 18 held-out observations, seed 19
  training: [[-0.9914449,-1.5230495],[-0.9238795,-0.9490622],[-0.7933533,-0.7401601],[-0.6087614,-0.5758372],[-0.3826834,0.1996755],[-0.1305262,-0.0476518],[0.1305262,0.6737865],[0.3826834,0.3639919],[0.6087614,0.5529492],[0.7933533,0.2974722],[0.9238795,-0.2235772],[0.9914449,0.0083951]],
  test: [[-0.96,-1.2336795],[-0.8470588,-1.1719327],[-0.7341176,-0.1605267],[-0.6211765,-0.2195608],[-0.5082353,-0.5223895],[-0.3952941,-0.2690181],[-0.2823529,0.2523612],[-0.1694118,0.3882589],[-0.0564706,0.2130568],[0.0564706,0.8110067],[0.1694118,0.5504368],[0.2823529,0.3009509],[0.3952941,0.410478],[0.5082353,0.4091998],[0.6211765,-0.0479544],[0.7341176,0.0288183],[0.8470588,-0.3849738],[0.96,-0.1572602]],
  // repeat-data-1..8.dat: the same 16 inputs, eight independent noise draws (seeds 200-207)
  repeatX: [-0.9951847,-0.9569403,-0.8819213,-0.7730105,-0.6343933,-0.4713967,-0.2902847,-0.0980171,0.0980171,0.2902847,0.4713967,0.6343933,0.7730105,0.8819213,0.9569403,0.9951847],
  repeatY: [
    [-1.3405747,-1.4450543,-1.2471668,-0.7155991,-0.161243,-0.0202595,0.0693543,-0.0714539,0.2687087,0.3391096,0.8246177,-0.279856,0.3690145,-0.0966362,0.0756069,-0.7173236],
    [-0.8561737,-1.4989845,-1.71699,-1.0396912,0.0526478,-0.0494497,0.0714938,0.4306826,0.5948291,0.8338607,0.5116698,0.7539936,0.0462666,0.0352418,-0.2379592,-0.1216421],
    [-0.8913448,-1.5353958,-1.4211682,-0.9199616,-0.8112019,0.3182909,0.4199536,0.5655696,0.9246633,0.3529524,0.0844004,0.4634084,0.2983109,-0.2056393,0.0880971,0.3005018],
    [-1.593375,-1.4216184,-0.812676,-0.308998,-0.7474929,0.5416912,0.4313951,0.1233827,0.2430021,0.5034346,0.313209,-0.0943034,-0.4079525,0.266402,-0.3815332,0.3267538],
    [-1.1528904,-1.266742,-0.4219807,-0.4705764,-0.4483494,-0.3859253,-0.0906691,0.4740594,-0.0767188,0.5669825,0.0855176,0.0989493,0.0842589,0.3827064,0.064297,0.3802029],
    [-1.5405798,-0.7546856,-0.5298778,-0.6357267,-0.3425341,-0.1519669,0.3472778,0.7045319,0.534505,0.9830995,0.5741572,0.6165061,-0.3421259,0.6709948,-0.1697763,0.1443998],
    [-1.2274227,-1.3442266,-0.6810564,-0.6455914,-0.5267393,-0.2649048,-0.1926299,-0.1678307,0.4880094,0.8983207,0.318017,0.0863012,0.0925293,0.2224453,0.162975,0.573326],
    [-1.2883926,-1.7879048,-1.0525298,-1.0482142,-0.7523711,0.0872189,-0.0806107,0.6018382,0.3485566,1.2906784,0.9488582,0.7099621,0.473702,-0.0263926,0.114176,-0.4941309]],
  // more-data.dat: eight quadratic fits with n = 150 (seeds 500-507), on the 241-point grid
  moreData: [
    [-1.4535682,-1.4281757,-1.4029476,-1.3778841,-1.352985,-1.3282504,-1.3036803,-1.2792746,-1.2550334,-1.2309567,-1.2070445,-1.1832967,-1.1597134,-1.1362945,-1.1130402,-1.0899503,-1.0670249,-1.0442639,-1.0216675,-0.9992355,-0.9769679,-0.9548649,-0.9329263,-0.9111522,-0.8895425,-0.8680974,-0.8468167,-0.8257004,-0.8047487,-0.7839614,-0.7633386,-0.7428802,-0.7225864,-0.702457,-0.6824921,-0.6626916,-0.6430556,-0.6235841,-0.6042771,-0.5851345,-0.5661564,-0.5473428,-0.5286936,-0.510209,-0.4918888,-0.473733,-0.4557418,-0.437915,-0.4202526,-0.4027548,-0.3854214,-0.3682525,-0.3512481,-0.3344081,-0.3177326,-0.3012216,-0.2848751,-0.268693,-0.2526754,-0.2368223,-0.2211336,-0.2056094,-0.1902497,-0.1750544,-0.1600237,-0.1451574,-0.1304555,-0.1159182,-0.1015453,-0.0873369,-0.0732929,-0.0594135,-0.0456985,-0.032148,-0.0187619,-0.0055403,0.0075168,0.0204094,0.0331376,0.0457013,0.0581005,0.0703353,0.0824056,0.0943114,0.1060527,0.1176296,0.129042,0.1402899,0.1513733,0.1622923,0.1730468,0.1836368,0.1940624,0.2043235,0.2144201,0.2243523,0.2341199,0.2437231,0.2531619,0.2624361,0.2715459,0.2804912,0.2892721,0.2978885,0.3063404,0.3146278,0.3227508,0.3307092,0.3385033,0.3461328,0.3535979,0.3608985,0.3680346,0.3750062,0.3818134,0.3884561,0.3949344,0.4012482,0.4073975,0.4133823,0.4192026,0.4248585,0.4303499,0.4356769,0.4408393,0.4458373,0.4506708,0.4553399,0.4598445,0.4641846,0.4683602,0.4723714,0.4762181,0.4799003,0.483418,0.4867713,0.4899601,0.4929845,0.4958443,0.4985397,0.5010706,0.5034371,0.505639,0.5076765,0.5095496,0.5112581,0.5128022,0.5141818,0.515397,0.5164477,0.5173339,0.5180556,0.5186128,0.5190056,0.5192339,0.5192978,0.5191972,0.5189321,0.5185025,0.5179084,0.5171499,0.5162269,0.5151395,0.5138875,0.5124711,0.5108903,0.5091449,0.5072351,0.5051608,0.502922,0.5005188,0.4979511,0.4952189,0.4923223,0.4892611,0.4860355,0.4826455,0.4790909,0.4753719,0.4714885,0.4674405,0.4632281,0.4588512,0.4543098,0.449604,0.4447337,0.4396989,0.4344996,0.4291359,0.4236077,0.417915,0.4120579,0.4060363,0.3998502,0.3934996,0.3869846,0.3803051,0.3734611,0.3664527,0.3592798,0.3519424,0.3444405,0.3367742,0.3289434,0.3209481,0.3127884,0.3044642,0.2959755,0.2873223,0.2785047,0.2695226,0.260376,0.2510649,0.2415894,0.2319494,0.222145,0.212176,0.2020426,0.1917447,0.1812824,0.1706556,0.1598643,0.1489085,0.1377883,0.1265036,0.1150544,0.1034407,0.0916626,0.07972,0.0676129,0.0553414,0.0429054,0.0303049,0.0175399,0.0046105,-0.0084834,-0.0217418,-0.0351646,-0.0487519,-0.0625037,-0.07642],
    [-1.4983258,-1.4722767,-1.4464024,-1.4207029,-1.3951783,-1.3698284,-1.3446534,-1.3196531,-1.2948277,-1.2701771,-1.2457013,-1.2214003,-1.1972741,-1.1733227,-1.1495461,-1.1259443,-1.1025173,-1.0792652,-1.0561878,-1.0332853,-1.0105576,-0.9880046,-0.9656265,-0.9434232,-0.9213947,-0.899541,-0.8778621,-0.8563581,-0.8350288,-0.8138743,-0.7928947,-0.7720898,-0.7514598,-0.7310046,-0.7107242,-0.6906186,-0.6706878,-0.6509318,-0.6313506,-0.6119442,-0.5927126,-0.5736559,-0.5547739,-0.5360668,-0.5175344,-0.4991769,-0.4809942,-0.4629863,-0.4451532,-0.4274949,-0.4100114,-0.3927027,-0.3755689,-0.3586098,-0.3418255,-0.3252161,-0.3087815,-0.2925216,-0.2764366,-0.2605264,-0.244791,-0.2292304,-0.2138446,-0.1986336,-0.1835975,-0.1687361,-0.1540495,-0.1395378,-0.1252009,-0.1110387,-0.0970514,-0.0832389,-0.0696012,-0.0561383,-0.0428502,-0.0297369,-0.0167985,-0.0040348,0.0085541,0.0209681,0.0332074,0.0452718,0.0571614,0.0688762,0.0804162,0.0917814,0.1029718,0.1139874,0.1248282,0.1354941,0.1459853,0.1563016,0.1664432,0.1764099,0.1862018,0.195819,0.2052613,0.2145288,0.2236215,0.2325393,0.2412824,0.2498507,0.2582441,0.2664628,0.2745066,0.2823757,0.2900699,0.2975893,0.3049339,0.3121037,0.3190987,0.3259189,0.3325643,0.3390348,0.3453306,0.3514515,0.3573977,0.363169,0.3687655,0.3741873,0.3794342,0.3845063,0.3894036,0.3941261,0.3986737,0.4030466,0.4072447,0.4112679,0.4151164,0.41879,0.4222888,0.4256128,0.4287621,0.4317365,0.434536,0.4371608,0.4396108,0.441886,0.4439863,0.4459119,0.4476626,0.4492386,0.4506397,0.451866,0.4529175,0.4537942,0.4544961,0.4550232,0.4553755,0.455553,0.4555556,0.4553835,0.4550365,0.4545148,0.4538182,0.4529468,0.4519007,0.4506797,0.4492839,0.4477132,0.4459678,0.4440476,0.4419526,0.4396827,0.4372381,0.4346186,0.4318243,0.4288553,0.4257114,0.4223927,0.4188992,0.4152309,0.4113878,0.4073698,0.4031771,0.3988096,0.3942672,0.38955,0.3846581,0.3795913,0.3743497,0.3689333,0.3633421,0.3575761,0.3516353,0.3455197,0.3392292,0.332764,0.3261239,0.3193091,0.3123194,0.305155,0.2978157,0.2903016,0.2826127,0.274749,0.2667105,0.2584971,0.250109,0.2415461,0.2328083,0.2238958,0.2148084,0.2055462,0.1961092,0.1864974,0.1767109,0.1667494,0.1566132,0.1463022,0.1358164,0.1251557,0.1143203,0.10331,0.092125,0.0807651,0.0692304,0.0575209,0.0456366,0.0335775,0.0213436,0.0089349,-0.0036486,-0.016407,-0.0293401,-0.0424481,-0.0557308,-0.0691884,-0.0828208,-0.096628,-0.11061,-0.1247668,-0.1390984,-0.1536048,-0.168286,-0.1831421,-0.1981729,-0.2133786,-0.228759,-0.2443143,-0.2600444],
    [-1.5238139,-1.4966583,-1.4696854,-1.4428952,-1.4162878,-1.3898631,-1.363621,-1.3375617,-1.3116851,-1.2859913,-1.2604801,-1.2351516,-1.2100059,-1.1850429,-1.1602626,-1.135665,-1.1112501,-1.0870179,-1.0629684,-1.0391017,-1.0154177,-0.9919163,-0.9685977,-0.9454618,-0.9225086,-0.8997382,-0.8771504,-0.8547454,-0.8325231,-0.8104834,-0.7886265,-0.7669523,-0.7454609,-0.7241521,-0.7030261,-0.6820827,-0.6613221,-0.6407442,-0.620349,-0.6001365,-0.5801067,-0.5602597,-0.5405953,-0.5211137,-0.5018148,-0.4826986,-0.4637651,-0.4450143,-0.4264463,-0.4080609,-0.3898583,-0.3718384,-0.3540012,-0.3363467,-0.3188749,-0.3015858,-0.2844794,-0.2675558,-0.2508149,-0.2342567,-0.2178812,-0.2016884,-0.1856783,-0.1698509,-0.1542063,-0.1387443,-0.1234651,-0.1083686,-0.0934548,-0.0787237,-0.0641753,-0.0498097,-0.0356267,-0.0216265,-0.007809,0.0058258,0.0192779,0.0325473,0.0456339,0.0585379,0.0712591,0.0837977,0.0961535,0.1083266,0.120317,0.1321246,0.1437496,0.1551918,0.1664514,0.1775282,0.1884223,0.1991337,0.2096624,0.2200083,0.2301716,0.2401521,0.2499499,0.2595651,0.2689975,0.2782471,0.2873141,0.2961984,0.3048999,0.3134188,0.3217549,0.3299083,0.337879,0.345667,0.3532722,0.3606948,0.3679346,0.3749917,0.3818662,0.3885579,0.3950668,0.4013931,0.4075367,0.4134975,0.4192757,0.4248711,0.4302838,0.4355138,0.4405611,0.4454256,0.4501075,0.4546066,0.4589231,0.4630568,0.4670078,0.4707761,0.4743616,0.4777645,0.4809846,0.4840221,0.4868768,0.4895488,0.4920381,0.4943447,0.4964686,0.4984097,0.5001682,0.5017439,0.5031369,0.5043472,0.5053748,0.5062197,0.5068818,0.5073613,0.507658,0.507772,0.5077033,0.5074519,0.5070178,0.506401,0.5056014,0.5046192,0.5034542,0.5021065,0.5005761,0.498863,0.4969672,0.4948887,0.4926274,0.4901835,0.4875568,0.4847474,0.4817553,0.4785805,0.4752229,0.4716827,0.4679597,0.4640541,0.4599657,0.4556946,0.4512408,0.4466043,0.441785,0.4367831,0.4315984,0.426231,0.420681,0.4149481,0.4090326,0.4029344,0.3966535,0.3901898,0.3835434,0.3767144,0.3697026,0.3625081,0.3551308,0.3475709,0.3398283,0.3319029,0.3237948,0.315504,0.3070305,0.2983743,0.2895354,0.2805137,0.2713094,0.2619223,0.2523525,0.2426,0.2326648,0.2225469,0.2122463,0.2017629,0.1910969,0.1802481,0.1692166,0.1580024,0.1466055,0.1350259,0.1232635,0.1113185,0.0991907,0.0868802,0.074387,0.0617111,0.0488525,0.0358112,0.0225871,0.0091804,-0.0044091,-0.0181813,-0.0321362,-0.0462738,-0.0605941,-0.0750972,-0.0897829,-0.1046514,-0.1197026,-0.1349364,-0.1503531,-0.1659524,-0.1817344,-0.1976991,-0.2138466,-0.2301768,-0.2466897],
    [-1.4521205,-1.4271827,-1.4024045,-1.377786,-1.3533272,-1.3290279,-1.3048883,-1.2809084,-1.2570881,-1.2334274,-1.2099264,-1.186585,-1.1634032,-1.1403811,-1.1175186,-1.0948158,-1.0722726,-1.049889,-1.0276651,-1.0056008,-0.9836962,-0.9619512,-0.9403658,-0.9189401,-0.897674,-0.8765676,-0.8556208,-0.8348336,-0.8142061,-0.7937382,-0.77343,-0.7532813,-0.7332924,-0.7134631,-0.6937934,-0.6742833,-0.6549329,-0.6357421,-0.616711,-0.5978395,-0.5791276,-0.5605754,-0.5421829,-0.5239499,-0.5058766,-0.487963,-0.470209,-0.4526146,-0.4351798,-0.4179047,-0.4007893,-0.3838335,-0.3670373,-0.3504007,-0.3339238,-0.3176066,-0.3014489,-0.285451,-0.2696126,-0.2539339,-0.2384148,-0.2230554,-0.2078556,-0.1928155,-0.177935,-0.1632141,-0.1486529,-0.1342513,-0.1200093,-0.105927,-0.0920043,-0.0782413,-0.0646379,-0.0511942,-0.03791,-0.0247856,-0.0118207,0.0009845,0.01363,0.026116,0.0384422,0.0506089,0.0626159,0.0744632,0.086151,0.097679,0.1090475,0.1202563,0.1313055,0.142195,0.1529249,0.1634951,0.1739057,0.1841567,0.194248,0.2041797,0.2139518,0.2235642,0.233017,0.2423101,0.2514436,0.2604174,0.2692316,0.2778862,0.2863812,0.2947165,0.3028921,0.3109081,0.3187645,0.3264612,0.3339983,0.3413758,0.3485936,0.3556518,0.3625504,0.3692893,0.3758685,0.3822881,0.3885481,0.3946485,0.4005892,0.4063703,0.4119917,0.4174535,0.4227556,0.4278981,0.432881,0.4377042,0.4423678,0.4468718,0.4512161,0.4554008,0.4594258,0.4632912,0.4669969,0.4705431,0.4739295,0.4771564,0.4802236,0.4831311,0.4858791,0.4884673,0.490896,0.493165,0.4952743,0.4972241,0.4990141,0.5006446,0.5021154,0.5034266,0.5045781,0.50557,0.5064022,0.5070748,0.5075878,0.5079411,0.5081348,0.5081689,0.5080433,0.5077581,0.5073132,0.5067087,0.5059445,0.5050208,0.5039373,0.5026943,0.5012916,0.4997292,0.4980072,0.4961256,0.4940844,0.4918835,0.4895229,0.4870027,0.4843229,0.4814835,0.4784844,0.4753256,0.4720073,0.4685293,0.4648916,0.4610943,0.4571374,0.4530208,0.4487446,0.4443087,0.4397133,0.4349581,0.4300434,0.4249689,0.4197349,0.4143412,0.4087879,0.4030749,0.3972023,0.3911701,0.3849782,0.3786267,0.3721155,0.3654447,0.3586143,0.3516242,0.3444745,0.3371651,0.3296961,0.3220675,0.3142792,0.3063313,0.2982237,0.2899565,0.2815297,0.2729432,0.2641971,0.2552914,0.246226,0.2370009,0.2276163,0.218072,0.208368,0.1985044,0.1884812,0.1782983,0.1679558,0.1574537,0.1467919,0.1359705,0.1249894,0.1138487,0.1025484,0.0910884,0.0794688,0.0676895,0.0557506,0.0436521,0.0313939,0.0189761,0.0063986,-0.0063385,-0.0192352,-0.0322916,-0.0455076],
    [-1.4844523,-1.4570771,-1.4298849,-1.4028756,-1.3760493,-1.3494059,-1.3229455,-1.2966681,-1.2705736,-1.2446621,-1.2189335,-1.1933879,-1.1680253,-1.1428456,-1.1178489,-1.0930351,-1.0684043,-1.0439564,-1.0196915,-0.9956096,-0.9717106,-0.9479946,-0.9244615,-0.9011114,-0.8779443,-0.8549601,-0.8321589,-0.8095406,-0.7871053,-0.764853,-0.7427836,-0.7208972,-0.6991937,-0.6776732,-0.6563356,-0.635181,-0.6142094,-0.5934207,-0.572815,-0.5523922,-0.5321524,-0.5120956,-0.4922217,-0.4725308,-0.4530228,-0.4336978,-0.4145558,-0.3955967,-0.3768205,-0.3582274,-0.3398171,-0.3215899,-0.3035456,-0.2856843,-0.2680059,-0.2505105,-0.233198,-0.2160685,-0.199122,-0.1823584,-0.1657777,-0.1493801,-0.1331654,-0.1171336,-0.1012848,-0.085619,-0.0701361,-0.0548362,-0.0397193,-0.0247853,-0.0100342,0.0045339,0.018919,0.0331211,0.0471403,0.0609766,0.0746299,0.0881002,0.1013876,0.114492,0.1274134,0.1401519,0.1527074,0.16508,0.1772696,0.1892763,0.2011,0.2127407,0.2241985,0.2354733,0.2465652,0.2574741,0.2682,0.278743,0.289103,0.2992801,0.3092742,0.3190854,0.3287135,0.3381588,0.3474211,0.3565004,0.3653967,0.3741101,0.3826406,0.390988,0.3991526,0.4071341,0.4149327,0.4225484,0.4299811,0.4372308,0.4442976,0.4511814,0.4578822,0.4644001,0.470735,0.476887,0.482856,0.4886421,0.4942452,0.4996653,0.5049025,0.5099567,0.514828,0.5195163,0.5240216,0.528344,0.5324834,0.5364399,0.5402134,0.543804,0.5472116,0.5504362,0.5534779,0.5563366,0.5590123,0.5615051,0.563815,0.5659419,0.5678858,0.5696467,0.5712248,0.5726198,0.5738319,0.574861,0.5757072,0.5763704,0.5768506,0.5771479,0.5772623,0.5771936,0.5769421,0.5765075,0.57589,0.5750896,0.5741061,0.5729398,0.5715904,0.5700581,0.5683429,0.5664447,0.5643635,0.5620994,0.5596523,0.5570222,0.5542092,0.5512132,0.5480343,0.5446724,0.5411276,0.5373998,0.533489,0.5293953,0.5251186,0.520659,0.5160164,0.5111909,0.5061823,0.5009909,0.4956164,0.4900591,0.4843187,0.4783954,0.4722891,0.4659999,0.4595277,0.4528726,0.4460345,0.4390134,0.4318094,0.4244224,0.4168525,0.4090996,0.4011638,0.3930449,0.3847432,0.3762584,0.3675907,0.3587401,0.3497065,0.3404899,0.3310904,0.3215079,0.3117425,0.3017941,0.2916627,0.2813484,0.2708511,0.2601709,0.2493077,0.2382616,0.2270324,0.2156204,0.2040253,0.1922474,0.1802864,0.1681425,0.1558156,0.1433058,0.130613,0.1177373,0.1046786,0.0914369,0.0780123,0.0644047,0.0506142,0.0366407,0.0224843,0.0081449,-0.0063775,-0.0210828,-0.0359711,-0.0510424,-0.0662966,-0.0817338,-0.0973539,-0.113157,-0.129143,-0.145312,-0.161664],
    [-1.50167,-1.4738412,-1.4462005,-1.4187481,-1.3914838,-1.3644079,-1.3375201,-1.3108205,-1.2843092,-1.2579861,-1.2318512,-1.2059045,-1.1801461,-1.1545758,-1.1291938,-1.104,-1.0789945,-1.0541771,-1.029548,-1.0051071,-0.9808544,-0.9567899,-0.9329137,-0.9092256,-0.8857258,-0.8624142,-0.8392909,-0.8163557,-0.7936088,-0.7710501,-0.7486796,-0.7264974,-0.7045033,-0.6826975,-0.6610799,-0.6396505,-0.6184094,-0.5973564,-0.5764917,-0.5558152,-0.5353269,-0.5150269,-0.494915,-0.4749914,-0.455256,-0.4357088,-0.4163499,-0.3971792,-0.3781966,-0.3594023,-0.3407963,-0.3223784,-0.3041488,-0.2861074,-0.2682542,-0.2505892,-0.2331125,-0.2158239,-0.1987236,-0.1818115,-0.1650877,-0.148552,-0.1322046,-0.1160454,-0.1000744,-0.0842916,-0.0686971,-0.0532908,-0.0380727,-0.0230428,-0.0082011,0.0064523,0.0209176,0.0351946,0.0492833,0.0631839,0.0768962,0.0904204,0.1037563,0.1169039,0.1298634,0.1426346,0.1552176,0.1676124,0.179819,0.1918374,0.2036675,0.2153094,0.2267631,0.2380286,0.2491058,0.2599949,0.2706957,0.2812083,0.2915327,0.3016688,0.3116167,0.3213764,0.3309479,0.3403312,0.3495262,0.3585331,0.3673517,0.3759821,0.3844242,0.3926782,0.4007439,0.4086214,0.4163107,0.4238118,0.4311246,0.4382492,0.4451856,0.4519338,0.4584938,0.4648655,0.471049,0.4770443,0.4828514,0.4884703,0.4939009,0.4991433,0.5041975,0.5090635,0.5137413,0.5182308,0.5225321,0.5266452,0.5305701,0.5343067,0.5378552,0.5412154,0.5443874,0.5473711,0.5501667,0.552774,0.5551931,0.557424,0.5594667,0.5613211,0.5629874,0.5644654,0.5657552,0.5668567,0.5677701,0.5684952,0.5690321,0.5693808,0.5695413,0.5695135,0.5692975,0.5688933,0.5683009,0.5675203,0.5665514,0.5653943,0.564049,0.5625155,0.5607938,0.5588838,0.5567856,0.5544992,0.5520246,0.5493618,0.5465107,0.5434714,0.5402439,0.5368282,0.5332242,0.5294321,0.5254517,0.5212831,0.5169262,0.5123812,0.5076479,0.5027264,0.4976167,0.4923188,0.4868327,0.4811583,0.4752957,0.4692449,0.4630058,0.4565786,0.4499631,0.4431594,0.4361675,0.4289874,0.421619,0.4140624,0.4063176,0.3983846,0.3902634,0.3819539,0.3734563,0.3647704,0.3558962,0.3468339,0.3375833,0.3281446,0.3185176,0.3087023,0.2986989,0.2885072,0.2781273,0.2675592,0.2568029,0.2458584,0.2347256,0.2234046,0.2118954,0.200198,0.1883123,0.1762385,0.1639764,0.1515261,0.1388875,0.1260608,0.1130458,0.0998426,0.0864512,0.0728716,0.0591037,0.0451477,0.0310034,0.0166708,0.0021501,-0.0125588,-0.027456,-0.0425414,-0.057815,-0.0732769,-0.0889269,-0.1047652,-0.1207917,-0.1370064,-0.1534094,-0.1700005,-0.1867799,-0.2037475,-0.2209033],
    [-1.4073119,-1.3821809,-1.3572118,-1.3324045,-1.307759,-1.2832754,-1.2589535,-1.2347935,-1.2107953,-1.1869589,-1.1632843,-1.1397715,-1.1164206,-1.0932315,-1.0702041,-1.0473386,-1.0246349,-1.0020931,-0.979713,-0.9574948,-0.9354384,-0.9135437,-0.891811,-0.87024,-0.8488308,-0.8275835,-0.8064979,-0.7855742,-0.7648123,-0.7442123,-0.723774,-0.7034975,-0.6833829,-0.6634301,-0.6436391,-0.6240099,-0.6045425,-0.585237,-0.5660932,-0.5471113,-0.5282912,-0.5096329,-0.4911364,-0.4728018,-0.4546289,-0.4366179,-0.4187687,-0.4010813,-0.3835557,-0.366192,-0.34899,-0.3319499,-0.3150716,-0.2983551,-0.2818004,-0.2654075,-0.2491765,-0.2331072,-0.2171998,-0.2014542,-0.1858704,-0.1704485,-0.1551883,-0.14009,-0.1251534,-0.1103787,-0.0957658,-0.0813148,-0.0670255,-0.0528981,-0.0389324,-0.0251286,-0.0114866,0.0019936,0.0153119,0.0284685,0.0414632,0.0542961,0.0669672,0.0794765,0.091824,0.1040096,0.1160335,0.1278955,0.1395957,0.1511341,0.1625107,0.1737254,0.1847784,0.1956695,0.2063988,0.2169663,0.227372,0.2376158,0.2476979,0.2576181,0.2673765,0.2769731,0.2864079,0.2956809,0.304792,0.3137414,0.3225289,0.3311546,0.3396185,0.3479205,0.3560608,0.3640392,0.3718559,0.3795107,0.3870037,0.3943348,0.4015042,0.4085117,0.4153575,0.4220414,0.4285635,0.4349238,0.4411222,0.4471589,0.4530337,0.4587467,0.4642979,0.4696873,0.4749149,0.4799806,0.4848846,0.4896267,0.494207,0.4986255,0.5028822,0.506977,0.5109101,0.5146813,0.5182907,0.5217383,0.5250241,0.528148,0.5311102,0.5339105,0.536549,0.5390257,0.5413406,0.5434937,0.5454849,0.5473144,0.548982,0.5504878,0.5518318,0.5530139,0.5540343,0.5548928,0.5555896,0.5561245,0.5564976,0.5567088,0.5567583,0.5566459,0.5563718,0.5559358,0.555338,0.5545784,0.5536569,0.5525737,0.5513286,0.5499217,0.548353,0.5466225,0.5447302,0.542676,0.5404601,0.5380823,0.5355427,0.5328413,0.5299781,0.526953,0.5237662,0.5204175,0.516907,0.5132347,0.5094006,0.5054046,0.5012469,0.4969273,0.4924459,0.4878027,0.4829977,0.4780309,0.4729022,0.4676118,0.4621595,0.4565454,0.4507695,0.4448317,0.4387322,0.4324708,0.4260477,0.4194627,0.4127159,0.4058072,0.3987368,0.3915045,0.3841105,0.3765546,0.3688369,0.3609574,0.352916,0.3447129,0.3363479,0.3278211,0.3191325,0.3102821,0.3012699,0.2920958,0.28276,0.2732623,0.2636028,0.2537815,0.2437984,0.2336534,0.2233467,0.2128781,0.2022477,0.1914555,0.1805015,0.1693856,0.158108,0.1466685,0.1350672,0.1233041,0.1113792,0.0992925,0.0870439,0.0746336,0.0620614,0.0493274,0.0364316,0.0233739,0.0101545,-0.0032268,-0.0167698],
    [-1.3435724,-1.3195727,-1.2957275,-1.2720368,-1.2485005,-1.2251188,-1.2018915,-1.1788187,-1.1559004,-1.1331367,-1.1105273,-1.0880725,-1.0657722,-1.0436264,-1.021635,-0.9997982,-0.9781158,-0.9565879,-0.9352145,-0.9139956,-0.8929312,-0.8720213,-0.8512658,-0.8306649,-0.8102184,-0.7899264,-0.7697889,-0.749806,-0.7299775,-0.7103034,-0.6907839,-0.6714189,-0.6522083,-0.6331523,-0.6142507,-0.5955036,-0.576911,-0.5584729,-0.5401893,-0.5220602,-0.5040855,-0.4862654,-0.4685997,-0.4510886,-0.4337319,-0.4165297,-0.399482,-0.3825888,-0.36585,-0.3492658,-0.332836,-0.3165608,-0.30044,-0.2844737,-0.2686619,-0.2530046,-0.2375018,-0.2221535,-0.2069597,-0.1919203,-0.1770355,-0.1623051,-0.1477292,-0.1333078,-0.1190409,-0.1049285,-0.0909706,-0.0771671,-0.0635182,-0.0500237,-0.0366838,-0.0234983,-0.0104673,0.0024092,0.0151312,0.0276987,0.0401118,0.0523703,0.0644744,0.0764239,0.088219,0.0998596,0.1113457,0.1226773,0.1338545,0.1448771,0.1557452,0.1664589,0.1770181,0.1874227,0.1976729,0.2077686,0.2177098,0.2274966,0.2371288,0.2466065,0.2559298,0.2650986,0.2741128,0.2829726,0.2916779,0.3002287,0.3086251,0.3168669,0.3249542,0.3328871,0.3406655,0.3482893,0.3557587,0.3630736,0.370234,0.37724,0.3840914,0.3907883,0.3973308,0.4037188,0.4099522,0.4160312,0.4219557,0.4277257,0.4333413,0.4388023,0.4441088,0.4492609,0.4542585,0.4591015,0.4637901,0.4683242,0.4727038,0.4769289,0.4809996,0.4849157,0.4886774,0.4922845,0.4957372,0.4990354,0.5021791,0.5051683,0.508003,0.5106833,0.513209,0.5155803,0.517797,0.5198593,0.5217671,0.5235204,0.5251192,0.5265635,0.5278533,0.5289887,0.5299695,0.5307959,0.5314678,0.5319852,0.5323481,0.5325565,0.5326104,0.5325098,0.5322548,0.5318452,0.5312812,0.5305626,0.5296896,0.5286621,0.5274801,0.5261436,0.5246527,0.5230072,0.5212073,0.5192528,0.5171439,0.5148805,0.5124626,0.5098902,0.5071633,0.5042819,0.5012461,0.4980557,0.4947109,0.4912116,0.4875578,0.4837494,0.4797867,0.4756694,0.4713976,0.4669713,0.4623906,0.4576553,0.4527656,0.4477214,0.4425227,0.4371695,0.4316618,0.4259996,0.420183,0.4142118,0.4080862,0.4018061,0.3953715,0.3887823,0.3820388,0.3751407,0.3680881,0.360881,0.3535195,0.3460034,0.3383329,0.3305079,0.3225284,0.3143944,0.3061059,0.2976629,0.2890655,0.2803135,0.2714071,0.2623462,0.2531307,0.2437608,0.2342364,0.2245575,0.2147242,0.2047363,0.194594,0.1842971,0.1738458,0.16324,0.1524797,0.1415649,0.1304956,0.1192718,0.1078935,0.0963608,0.0846735,0.0728318,0.0608356,0.0486849,0.0363797,0.02392,0.0113058,-0.0014628,-0.014386]],
  // complexity-errors.dat: degree, train, test, bias2, variance (1200 repetitions, seed 715)
  complexity: [[0,0.493531,0.4213805,0.3256287,0.0057517],[1,0.2709509,0.28338,0.1836447,0.0097352],[2,0.0713095,0.105339,0.0000291,0.0153099],[3,0.065999,0.1107298,0.0000364,0.0206934],[4,0.0610137,0.1156959,0.0000414,0.0256545],[5,0.0554976,0.1210454,0.0000558,0.0309896],[6,0.0501705,0.1264186,0.0000627,0.0363559],[7,0.0444236,0.1322403,0.0000617,0.0421786],[8,0.0386807,0.1381667,0.0000613,0.0481055],[9,0.0331495,0.1437329,0.0000726,0.0536602],[10,0.0278084,0.1491808,0.0000729,0.059108],[11,0.0219717,0.1550784,0.000073,0.0650054]],
  // root-*.dat: iteration, theta, observation (40 steps of 0.5/t or 0.5/t^2 from 2.8; noisy: seed 701)
  rootHarmonic: [[0,2.8,0.946806],[1,2.326597,0.8684152],[2,2.1094932,0.8038832],[3,1.9755127,0.7511168],[4,1.8816231,0.7072315],[5,1.8108999,0.6700864],[6,1.7550594,0.6381576],[7,1.7094767,0.6103486],[8,1.6713299,0.585854],[9,1.6387825,0.56407],[10,1.610579,0.5445345],[11,1.5858274,0.526888],[12,1.5638737,0.5108459],[13,1.5442258,0.4961801],[14,1.5265051,0.482705],[15,1.5104149,0.4702684],[16,1.495719,0.4587438],[17,1.4822266,0.448025],[18,1.4697814,0.4380227],[19,1.4582545,0.4286605],[20,1.447538,0.4198731],[21,1.437541,0.4116041],[22,1.4281864,0.4038045],[23,1.419408,0.3964316],[24,1.411149,0.3894479],[25,1.4033601,0.3828203],[26,1.3959982,0.3765196],[27,1.3890256,0.3705199],[28,1.3824091,0.3647978],[29,1.3761195,0.3593328],[30,1.3701306,0.354106],[31,1.3644193,0.3491007],[32,1.3589646,0.3443017],[33,1.3537479,0.3396951],[34,1.3487524,0.3352686],[35,1.3439628,0.3310106],[36,1.3393654,0.3269108],[37,1.3349477,0.3229595],[38,1.3306983,0.319148],[39,1.3266066,0.3154684],[40,1.3226633,0]],
  rootFast: [[0,2.8,0.946806],[1,2.326597,0.8684152],[2,2.2180451,0.8390766],[3,2.1714297,0.82473],[4,2.1456569,0.8163102],[5,2.1293307,0.8107901],[6,2.1180697,0.8068965],[7,2.1098361,0.8040045],[8,2.1035548,0.8017723],[9,2.0986056,0.7999976],[10,2.0946056,0.798553],[11,2.0913058,0.7973543],[12,2.0885372,0.7963436],[13,2.0861812,0.7954801],[14,2.0841519,0.7947337],[15,2.0823858,0.7940822],[16,2.0808349,0.7935085],[17,2.079462,0.7929995],[18,2.0782383,0.7925449],[19,2.0771406,0.7921363],[20,2.0761504,0.7917672],[21,2.0752527,0.791432],[22,2.0744351,0.7911263],[23,2.0736873,0.7908464],[24,2.0730008,0.7905891],[25,2.0723684,0.7903518],[26,2.0717838,0.7901323],[27,2.0712419,0.7899286],[28,2.0707381,0.7897391],[29,2.0702686,0.7895624],[30,2.0698299,0.7893971],[31,2.0694192,0.7892423],[32,2.0690338,0.7890969],[33,2.0686715,0.7889602],[34,2.0683303,0.7888313],[35,2.0680083,0.7887097],[36,2.067704,0.7885946],[37,2.067416,0.7884857],[38,2.067143,0.7883824],[39,2.0668838,0.7882843],[40,2.0666375,0]],
  rootNoisy: [[0,2.8,1.9615588],[1,1.8192206,1.7642351],[2,1.3781619,1.0616699],[3,1.2012169,1.3908581],[4,1.0273596,1.0466178],[5,0.9226978,-0.5568888],[6,0.9691052,-1.0579598],[7,1.0446738,-0.402491],[8,1.0698295,1.0985768],[9,1.0087974,-0.3330608],[10,1.0254505,0.8133138],[11,0.9884817,0.1013905],[12,0.9842571,0.2606382],[13,0.9742325,0.0354066],[14,0.972968,-0.4739624],[15,0.9887667,0.62634],[16,0.9691936,-0.4980102],[17,0.983841,-0.0680342],[18,0.9857308,-0.1759253],[19,0.9903604,-0.9598521],[20,1.0143567,-1.0462837],[21,1.0392683,-0.0034507],[22,1.0393467,0.4787619],[23,1.0289388,-1.042512],[24,1.0506578,0.8429641],[25,1.0337985,0.379811],[26,1.0264945,-0.1399394],[27,1.0290859,0.5436506],[28,1.0193779,-0.3443792],[29,1.0253155,-0.0570734],[30,1.0262667,0.0774884],[31,1.0250169,0.5756482],[32,1.0160224,-0.1348489],[33,1.0180655,-0.8816091],[34,1.0310304,1.1286337],[35,1.014907,-0.4448146],[36,1.021085,-0.901058],[37,1.0332615,-0.9881667],[38,1.0462637,1.0231185],[39,1.0331468,1.1767349],[40,1.0184376,0]],
  // gd-path.dat and sgd-path.dat (theta1, theta2): 32 steps from (-2.4, 1.9); SGD seed 84
  gdPath: [[-2.4,1.9],[-1.806,0.514],[-1.34268,0.04276],[-0.9812904,-0.1174616],[-0.6994065,-0.1719369],[-0.4795371,-0.1904586],[-0.3080389,-0.1967559],[-0.1742704,-0.198897],[-0.0699309,-0.199625],[0.0114539,-0.1998725],[0.0749341,-0.1999566],[0.1244486,-0.1999853],[0.1630699,-0.199995],[0.1931945,-0.1999983],[0.2166917,-0.1999994],[0.2350195,-0.1999998],[0.2493152,-0.1999999],[0.2604659,-0.2],[0.2691634,-0.2],[0.2759474,-0.2],[0.281239,-0.2],[0.2853664,-0.2],[0.2885858,-0.2],[0.2910969,-0.2],[0.2930556,-0.2],[0.2945834,-0.2],[0.295775,-0.2],[0.2967045,-0.2],[0.2974295,-0.2],[0.297995,-0.2],[0.2984361,-0.2],[0.2987802,-0.2],[0.2990485,-0.2]],
  sgdPath: [[-2.4,1.9],[-2.0955116,0.3104753],[-2.0188468,0.5364077],[-1.7823123,0.0520122],[-1.3381798,-0.0135978],[-1.1955916,0.3542341],[-0.9930171,-0.0846314],[-0.9162051,-0.6263838],[-0.6467437,-0.7451025],[-0.5394536,-1.037379],[-0.4723518,-0.2225721],[-0.5137178,-0.1871702],[-0.4984625,0.079938],[-0.2627402,0.398341],[-0.3328486,0.3880123],[-0.4242273,-0.0969801],[-0.34043,-0.0482353],[-0.296736,-0.0628246],[-0.2138139,-0.3361022],[-0.1320503,-0.480421],[-0.0832937,-0.2002324],[-0.0040222,-0.232663],[-0.0163267,-0.123148],[0.0715357,-0.1938377],[0.1123805,-0.3519385],[0.161145,-0.1448906],[0.1216613,0.050888],[0.0639857,-0.1038752],[-0.0333652,-0.1770215],[-0.0282918,-0.0113467],[0.017494,-0.1671224],[0.0355963,-0.2645165],[0.0067941,-0.1632003]]
};
