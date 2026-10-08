// Figures of the Linear regression I deck: Sarvin Motamen's Beamer deck
// (Sarvin/lec14_linear-regression_theme4/slides/14-LinearRegression-I-Slides.tex)
// redrawn on the shared engine.  Each FIGS entry draws from one parameter object
// (see ../shared/deck.js), from the Beamer figures' own functions, coordinates and
// data; plot marks take the colour of their role (reports/part3-slides-plan.md).

Object.assign(MACROS, {
  '\\bX': '\\boldsymbol{X}', '\\bZ': '\\boldsymbol{Z}', '\\bY': '\\boldsymbol{Y}', '\\bx': '\\boldsymbol{x}',
  '\\bz': '\\boldsymbol{z}', '\\bq': '\\boldsymbol{q}', '\\bu': '\\boldsymbol{u}', '\\by': '\\boldsymbol{y}', '\\be': '\\boldsymbol{e}', '\\mU': '\\mathsf{U}', '\\ba': '\\boldsymbol{a}',
  '\\bb': '\\boldsymbol{b}', '\\bmu': '\\boldsymbol{\\mu}', '\\btheta': '\\boldsymbol{\\theta}',
  '\\bTheta': '\\boldsymbol{\\Theta}', '\\bzero': '\\boldsymbol{0}', '\\bone': '\\boldsymbol{1}',
  '\\mK': '\\mathsf{K}', '\\mA': '\\mathsf{A}', '\\mS': '\\mathsf{S}', '\\mI': '\\mathsf{I}',
  '\\mQ': '\\mathsf{Q}', '\\mW': '\\mathsf{W}', '\\cov': '\\operatorname{Cov}', '\\var': '\\operatorname{Var}',
  '\\uni': '\\operatorname{Uni}', '\\mle': '\\mathrm{mle}',
  // ## is a literal # inside a KaTeX macro
  '\\cpr': '\\textcolor{##2354A8}{#1}', '\\clk': '\\textcolor{##008000}{#1}',
  '\\cpo': '\\textcolor{##B30000}{#1}', '\\cml': '\\textcolor{##616161}{#1}',
  // the slides preamble's names that this deck uses
  '\\cH': '\\mathcal{H}', '\\cD': '\\mathcal{D}', '\\cX': '\\mathcal{X}', '\\cY': '\\mathcal{Y}', '\\cL': '\\mathcal{L}',
  '\\bbR': '\\mathbb{R}', '\\argmin': '\\operatorname*{arg\\,min}', '\\argmax': '\\operatorname*{arg\\,max}',
  '\\nor': '\\operatorname{\\mathcal{N}}', '\\mse': '\\operatorname{MSE}', '\\bias': '\\operatorname{Bias}'
});

// candidate for deck.js: a readout in the slide's text, outside the figure.  draw()
// fills each [data-ro=KEY] element of the figure's slide with s (text with $…$ math,
// or one display formula when display is set), so a column follows the figure's
// state and its sliders; each print page fills its own copy.
function readout(g, key, s, display = false) {
  const sec = g.root.closest('section');
  if (!sec) return;
  sec.querySelectorAll(`[data-ro="${key}"]`).forEach(e => {
    if (e.dataset.s === s) return;
    e.innerHTML = display ? katex.renderToString(s, { displayMode: true, macros: MACROS, throwOnError: false }) : rich(s);
    e.dataset.s = s;
  });
}
// candidate for deck.js: the part of segment a-b inside [xlo,xhi] x [ylo,yhi]
// (Liang-Barsky), with the parameters t0 <= t1 where it enters and leaves; null if none.
function clipSeg([x0, y0], [x1, y1], P) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  for (const [p, q] of [[-dx, x0 - P.xlo], [dx, P.xhi - x0], [-dy, y0 - P.ylo], [dy, P.yhi - y0]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return { a: [x0 + t0 * dx, y0 + t0 * dy], b: [x0 + t1 * dx, y0 + t1 * dy], t0, t1 };
}
// candidate for deck.js: a polyline cut to the plot's box, as the pieces inside it
// (pgfplots clips what leaves the axes)
function clipPoly(P, pts) {
  const out = [];
  let cur = null;
  for (let i = 1; i < pts.length; i++) {
    const s = clipSeg(pts[i - 1], pts[i], P);
    if (!s) { cur = null; continue; }
    if (cur && s.t0 === 0) cur.push(s.b); else { cur = [s.a, s.b]; out.push(cur); }
    if (s.t1 < 1) cur = null;
  }
  return out;
}

// candidate for deck.js: a polygon cut to the plot's box (Sutherland-Hodgman), for filled
// regions that leave the axes
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

const dots = (P, pts, st = {}) => pts.forEach(q => P.dot(q, Object.assign({ color: 'like' }, st)));
// Her 'deck' axes (axis lines=left): along the bottom and the left of the box, no grid.
const deckAxes = (P, xt, yt, names = ['$x$', '$y$']) => P.axes({ grid: false, ox: P.xlo, oy: P.ylo, xt, yt, names });
// The column space drawn as a parallelogram (her geomC plane).
const plane = (P, pts) => P.path(pts, { close: true, fill: 'pred', fo: 0.1, color: 'pred', so: 0.6, w: 2 });
// pgfplots' mark=star: five strokes from the centre.
function star(P, at, r, st = {}) {
  const [cx, cy] = P.px(at);
  for (let k = 0; k < 5; k++) {
    const t = -Math.PI / 2 + k * 2 * Math.PI / 5;
    P.g.line([cx, cy], [cx + r * Math.cos(t), cy + r * Math.sin(t)], Object.assign({ w: 2 }, st));
  }
}
// A TikZ softbox in pixels: rounded, light fill, a soft shadow, its text centred.
function softRect(g, key, [x, y, w, h], color, s, opacity = 1) {
  const c = colorOf(color);
  g.el('rect', { x: x + 1.5, y: y + 1.5, width: w, height: h, rx: 6, fill: '#000', 'fill-opacity': 0.18, opacity });
  g.el('rect', { x, y, width: w, height: h, rx: 6, fill: '#fff', opacity });
  g.el('rect', { x, y, width: w, height: h, rx: 6, fill: c, 'fill-opacity': 0.1, stroke: c, 'stroke-opacity': 0.7, 'stroke-width': 1.5, opacity });
  g.label(key, s, [x + w / 2, y + h / 2], 'c', { opacity });
}

// \datapoints, and the least-squares line through them as she draws it.
const DATA = [[0, 1.0], [1, 1.9], [2, 3.2], [3, 3.8], [4, 5.1], [5, 5.9], [6, 7.2], [7, 7.8]];
const LSF = x => 1.0083 + 0.994 * x;
// the 9.5 x 6.2 cm plots of \datapoints: x in [-0.3, 7.4], y in [0, 8.7]
const dataBox = (W, H) => box2d(64, 30, W, H, -0.3, 7.4, 0, 8.7);
const XT = [0, 2, 4, 6], YT = [0, 2, 4, 6, 8];

// ---------------------------------------------------------------- title backdrop
// Her title frame's background: a faint fitted line and ten points, in cm on the 16 x 9 cm page.
ICONS.titlefit = svg => {
  const X = x => 80 * x, Y = y => 720 - 80 * y;
  el(svg, 'line', { x1: X(0.7), y1: Y(0.75), x2: X(15.2), y2: Y(3.0), stroke: C.teal, 'stroke-opacity': 0.35, 'stroke-width': 3.4 });
  for (const [x, y] of [[1.2, 1.05], [2.4, 1.20], [3.8, 1.55], [5.0, 1.45], [6.3, 1.95], [8.0, 2.08], [9.2, 2.42], [10.8, 2.48], [12.1, 2.78], [13.8, 2.95]])
    el(svg, 'circle', { cx: X(x), cy: Y(y), r: 4.5, fill: C.like, 'fill-opacity': 0.35 });
};

// ---------------------------------------------------------------- what would you predict here?
const PB = box2d(92, 26, 930, 400, -0.3, 7.5, 0, 8.7);
FIGS.predict = {
  size: [1110, 470],
  draw(g) {
    const P = g.plot(PB);
    deckAxes(P, [0, 1, 2, 3, 4, 5, 6, 7], YT, ['feature $x_\\star$', 'response $y$']);
    P.line([5.6, 0], [5.6, 8.2], { color: 'pred', w: 2.5, dash: '8 6' });
    dots(P, DATA);
    P.dot([5.6, 0], { color: 'pred', r: 9 });
    P.label('xs', '<b>$x_\\star$</b>', [5.6, 0], 't', { dy: 6, color: 'pred' });
  }
};

// ---------------------------------------------------------------- many functions fit the data
// k = 0..3: how many of the three candidates are drawn.
const MB = dataBox(650, 410);
const CANDS = [[x => 1 + x, 'brown'], [x => 1 + 0.98 * x + 0.55 * Math.sin(2.25 * x), 'pred'],
  [x => 0.95 + 1.04 * x - 0.045 * (x - 3.5) ** 2, 'post']];
FIGS.many = {
  size: [770, 490],
  draw(g, p) {
    const P = g.plot(MB);
    deckAxes(P, XT, YT);
    CANDS.forEach(([f, c], i) => P.curve(f, { from: 0, to: 7, color: c, opacity: clamp(p.k - i) }));
    dots(P, DATA);
  }
};

// ---------------------------------------------------------------- the linear predictor
const RB = dataBox(520, 360);
FIGS.restrict = {
  size: [640, 440],
  draw(g) {
    const P = g.plot(RB);
    deckAxes(P, XT, YT);
    P.line([0, LSF(0)], [7, LSF(7)], { color: 'teal', w: 3.5 });
    dots(P, DATA);
  }
};

// ---------------------------------------------------------------- a curve linear in theta
const QB = box2d(70, 30, 330, 320, -2.2, 2.2, -0.5, 4.8);
FIGS.poll = {
  size: [450, 400],
  draw(g) {
    const P = g.plot(QB);
    deckAxes(P, [-2, 0, 2], [0, 2, 4], ['$x$', '$f_{\\btheta}(x)$']);
    P.curve(x => 0.6 + 0.2 * x + 0.85 * x * x, { from: -2, to: 2, color: 'pred' });
    dots(P, [[-1.7, 2.7], [-0.9, 1.0], [0, 0.7], [0.9, 1.4], [1.7, 3.5]]);
  }
};

// ---------------------------------------------------------------- lines A, B, C (also Demo 1's guesses)
const ABC = [[0.5, 0.65, 'post', 'A', [6.8, 4.5]], [1.6, 0.72, 'pred', 'B', [6.8, 6.4]], [1.15, 0.93, 'brown', 'C', [6.8, 7.7]]];
FIGS.three = {
  size: [770, 490],
  draw(g) {
    const P = g.plot(MB);
    deckAxes(P, XT, YT);
    for (const [a, b, c, k, at] of ABC) {
      P.line([0, a], [7, a + 7 * b], { color: c, w: 3.5 });
      P.label(k, `<b>${k}</b>`, at, 'c', { color: c, dx: k === 'C' ? -8 : 0 });   // C clear of the point (7, 7.8)
    }
    dots(P, DATA);
  }
};

// ---------------------------------------------------------------- residuals
// r: the residual segments; a: the marked residual at x = 2 and its formula.
const RPTS = [[0, 0.4], [1, 2.6], [2, 2.1], [3, 4.9], [4, 4.0], [5, 6.8], [6, 6.0], [7, 8.5]];
FIGS.resid = {
  size: [770, 490],
  draw(g, p) {
    const P = g.plot(MB);
    deckAxes(P, XT, YT);
    P.line([0, LSF(0)], [7, LSF(7)], { color: 'teal', w: 3.5 });
    for (const [x, y] of RPTS) P.line([x, LSF(x)], [x, y], { color: 'rose', w: 2.5, opacity: p.r });
    const m = [2, (LSF(2) + 2.1) / 2];
    P.vec(m, [2, LSF(2)], { color: 'rose', w: 3.5, head: 10, opacity: p.a });
    P.vec(m, [2, 2.1], { color: 'rose', w: 3.5, head: 10, gap: 7, opacity: p.a });
    dots(P, RPTS);
    P.label('e', '<b>$e_i=y_i-\\widehat y_i$</b>', [2.15, 2.55], 'l', { color: 'rose', opacity: p.a });
  }
};

// ---------------------------------------------------------------- squaring the misses
// Her axes x = 0.85 cm, y = 0.62 cm per unit; s: the two marked squares.
const SB = box2d(44, 40, 6.3 * 72, 8.2 * 52.5, 0, 6.3, 0, 8.2);
FIGS.sq = {
  size: [590, 500],
  draw(g, p) {
    const P = g.plot(SB);
    P.axes({ grid: false, names: ['$|e_i|$', '$e_i^2$'] });
    for (const x of [1, 2]) P.path([[x, 0], [x, x * x], [0, x * x]], { color: '#bfbfbf', w: 1.5, dash: '5 4' });
    P.curve(x => x * x, { from: 0, to: 2.8, color: 'teal' });
    P.line([1, 0], [1, 1], { color: 'rose', w: 3.5, opacity: p.s });
    P.line([2, 0], [2, 4], { color: 'post', w: 3.5, opacity: p.s });
    P.label('s1', '$1\\mapsto 1$', [1.05, 1.0], 'l', { dx: 6, color: 'rose', opacity: p.s });
    P.label('s2', '$2\\mapsto 4$', [2.05, 4.0], 'l', { dx: 6, color: 'post', opacity: p.s });
  }
};

// ---------------------------------------------------------------- Demo 1: can you beat least squares?
// The line a + b x and its SSE on \datapoints; s = 0..3 the Beamer state (the guess's hue).
// A coefficient off the sliders' 0.01 grid (her optimum 1.0083 + 0.99405x) shows three
// decimals, as her box does, and the SSE is computed from the coefficients as shown.
const D1_OPT = [1.0083, 0.99405], D1_HUE = ['post', 'pred', 'brown'];
FIGS.demo1 = {
  size: [770, 490],
  draw(g, p) {
    const P = g.plot(MB), a = p.a, b = p.b;
    const dec = [a, b].some(v => Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) ? 3 : 2;
    const aD = +a.toFixed(dec), bD = +b.toFixed(dec);
    const opt = Math.abs(a - D1_OPT[0]) < 1e-4 && Math.abs(b - D1_OPT[1]) < 1e-5;
    const col = opt ? 'teal' : D1_HUE[clamp(Math.round(p.s), 0, 2)];
    deckAxes(P, XT, YT);
    P.line([0, a], [7, a + 7 * b], { color: col, w: opt ? 4.5 : 3.5 });
    dots(P, DATA);
    const sse = DATA.reduce((t, [x, y]) => t + (y - aD - bD * x) ** 2, 0);
    readout(g, 'd1model', `<span class="modelbox k-${col}">$\\widehat y=${aD.toFixed(dec)}${bD < 0 ? '-' : '+'}${Math.abs(bD).toFixed(dec)}x$</span>`);
    const S = `\\mathrm{SSE}=${sse.toFixed(sse >= 1 ? 2 : 3)}`;
    readout(g, 'd1sse', opt ? `\\boxed{${S}}` : S, true);
  }
};

// ---------------------------------------------------------------- least squares in one dimension, before any model
// The points of the one-dimensional slide and a candidate line y = th x through the origin
// (show = 1 draws it); the loss L(th) is computed from th as shown (two decimals).  At
// theta-hat = 30.6/30 = 1.02 the line takes the least-squares teal.
const LF1 = box2d(56, 30, 400, 380, 0, 4.5, 0, 5), PTSF1 = [[1, 1.2], [2, 1.8], [3, 3.4], [4, 3.9]];
FIGS.lsfit1 = {
  size: [530, 450],
  draw(g, p) {
    const P = g.plot(LF1), th = +p.th.toFixed(2), on = p.show;
    const L = PTSF1.reduce((t, [x, y]) => t + (y - th * x) ** 2, 0);
    const hat = PTSF1.reduce((t, [x, y]) => t + x * y, 0) / PTSF1.reduce((t, [x]) => t + x * x, 0);
    deckAxes(P, [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5]);
    const x1 = Math.min(4.5, 5 / Math.max(th, 1e-9));   // the line, cut where it leaves the top
    P.line([0, 0], [x1, x1 * th], { color: Math.abs(th - hat) < 0.005 ? 'teal' : 'post', w: 3.5, opacity: on });
    dots(P, PTSF1);
    P.label('rt', `$\\theta=${th.toFixed(2)}$`, [0, 5], 'tl', { dx: 16, dy: 22, color: 'post', opacity: on });
    P.label('rl', `$L(\\theta)=${L.toFixed(3)}$`, [0, 5], 'tl', { dx: 16, dy: 54, color: 'post', opacity: on });
  }
};

// ---------------------------------------------------------------- the column space
// The exercise's plane col(X) in orthonormal coordinates (a, b, c) along u1 = x1/sqrt5,
// u2 = -(x2 - x1/5)/(3/sqrt5) and the normal n = (-2, -1, 2)/3, so that e = y - y-hat = n/3
// and y lies on the +n side: x1 = (sqrt5, 0, 0), x2 = (1/sqrt5, -3/sqrt5, 0),
// y-hat = X theta-hat = (2/sqrt5, 7/(3 sqrt5), 0) and y = y-hat + (0, 0, 1/3).  The flat
// pictures use the camera view3.
const R5 = Math.sqrt(5), SX = [[R5, 0], [1 / R5, -3 / R5]], SCOL = ['brown', 'prior'];
const inPlane = (t1, t2) => [t1 * SX[0][0] + t2 * SX[1][0], t1 * SX[0][1] + t2 * SX[1][1]];
const SYH = inPlane(5 / 9, -7 / 9);
const C3 = { o: [0, 0, 0], x1: [...SX[0], 0], x2: [...SX[1], 0], yh: [...SYH, 0], y: [...SYH, 1 / 3] };
// One orthographic camera for every 3-D picture: (a, b) turned by the azimuth psi within the
// plane, then tilted by the elevation el, so the normal (and e) is vertical on screen.
const VIEW3 = { psi: -15 * Math.PI / 180, el: 28 * Math.PI / 180 };
function view3([a, b, c]) {
  const { psi, el } = VIEW3, a1 = a * Math.cos(psi) - b * Math.sin(psi), b1 = a * Math.sin(psi) + b * Math.cos(psi);
  return [a1, b1 * Math.sin(el) + c * Math.cos(el)];
}
// Each picture's plane patch is a parallelogram with edges along u1 and u2, fitted to that
// picture's content and labels with padding (computed offline): its far edge clears y's tip,
// the origin sits toward the front-left, and the vectors span about two thirds of its width.
// pic3(u, [[a0, a1], [b0, b1]], colAt, margins): the patch's screen corners, the figure's box
// and size at u px per unit, and where col(X) goes (a plane point in a free corner).
function pic3(u, [[a0, a1], [b0, b1]], colAt = null, [l, t, r, bm] = [8, 8, 8, 8]) {
  const patch = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map(([a, b]) => view3([a, b, 0]));
  const xs = patch.map(q => q[0]), ys = patch.map(q => q[1]);
  const xlo = Math.min(...xs), xhi = Math.max(...xs), ylo = Math.min(...ys), yhi = Math.max(...ys), W = (xhi - xlo) * u, H = (yhi - ylo) * u;
  return { u, patch, colAt, B: box2d(l, t, W, H, xlo, xhi, ylo, yhi), size: [Math.ceil(W + l + r), Math.ceil(H + t + bm)] };
}
// The 3-D picture q (a pic3) on its plot: the plane; o.cols the two columns; o.ydot y as a dot
// with a dashed drop to its foot; o.yvec, o.hat, o.res the arrows y, y-hat and e (with the
// right angle at y-hat, side o.s); o.lab 'full' (slides 15-17) or 'y' (the card).
function colSpace3(g, q, o) {
  const P = g.plot(q.B), v = view3, w = o.w ?? 3.5, head = o.head ?? 14;
  P.path(q.patch, { close: true, fill: 'pred', fo: 0.1, color: 'pred', so: 0.6, w: o.lab === 'full' ? 2 : 1.5 });
  if (q.colAt) P.label('col', '<b>$\\operatorname{col}(X)$</b>', v([...q.colAt, 0]), 'c', { color: 'pred', opacity: o.colOp ?? 1 });
  if (o.cols) {
    P.vec(v(C3.o), v(C3.x1), { color: 'brown', w, head });
    P.vec(v(C3.o), v(C3.x2), { color: 'prior', w, head });
    P.label('x1', '$\\boldsymbol x^{(1)}$', v(C3.x1), 'b', { dy: -8, color: 'brown' });
    P.label('x2', '$\\boldsymbol x^{(2)}$', v(C3.x2), 'l', { dx: 10, color: 'prior' });
  }
  if (o.ydot != null) {
    P.line(v(C3.y), v(C3.yh), { color: '#8a8a8a', w: 1.5, dash: '4 4', opacity: o.ydot });
    P.dot(v(C3.yh), { color: '#8a8a8a', r: 3, outline: false, opacity: o.ydot });
    P.dot(v(C3.y), { color: 'like', opacity: o.ydot });
    P.label('y', '$\\by$', v(C3.y), 'b', { dy: -9, color: 'like', opacity: o.ydot });
  }
  if (o.yvec) {
    // the right angle at y-hat: a square spanned by the normal and the in-plane direction
    // perpendicular to y-hat, on the viewer's side (clear of the arrowheads)
    const hat = o.hat ?? 1, res = o.res ?? 1, s = o.s ?? 0.07, L = Math.hypot(...SYH), d = [SYH[1] / L * s, -SYH[0] / L * s];
    P.vec(v(C3.o), v(C3.yh), { color: 'teal', w, head, opacity: hat });
    P.vec(v(C3.o), v(C3.y), { color: 'like', w, head });
    P.vec(v(C3.yh), v(C3.y), { color: 'rose', w, head: Math.min(head, 10), opacity: res });
    P.path([v([SYH[0] + d[0], SYH[1] + d[1], 0]), v([SYH[0] + d[0], SYH[1] + d[1], s]), v([SYH[0], SYH[1], s])],
      { color: '#4d4d4d', w: o.lab === 'full' ? 1.8 : 1.2, opacity: res });
    if (o.lab === 'full') {
      P.label('y', '$\\by$', v(C3.y), 'b', { dy: -6, color: 'like' });
      P.label('yh', '$\\widehat{\\by}=X\\widehat{\\btheta}$', v(C3.yh), 'tl', { dx: 4, dy: 16, color: 'teal', opacity: hat });
      P.label('e', '$\\boldsymbol e=\\by-\\widehat{\\by}$', mid(v(C3.yh), v(C3.y)), 'l', { dx: 10, color: 'rose', opacity: res });
    } else P.label('iy', '$\\by$', v(C3.y), 'b', { dy: -3, color: 'like' });
  }
}

// Slide 15: the plane and its two columns; y (a dot off the plane) and col(X) on the last step.
const SUB3 = pic3(150, [[-0.52, 2.43], [-1.89, 2.49]], [2.04, -1.49]);
FIGS.subspace = {
  size: SUB3.size,
  draw(g, p) { colSpace3(g, SUB3, { cols: true, ydot: p.y, colOp: p.y }); }
};
// Slide 16 and its smaller copy on slide 17: y, then y-hat = X theta-hat, then e, vertical.
function projScene(q, s) {
  return { size: q.size, draw(g, p) { colSpace3(g, q, { yvec: true, hat: p.hat ?? 1, res: p.res ?? 1, s, lab: 'full' }); } };
}
FIGS.proj = projScene(pic3(320, [[-0.33, 1.33], [-0.45, 2.05]], [1.15, -0.26]), 0.045);
FIGS.projs = projScene(pic3(210, [[-0.36, 1.54], [-0.49, 2.22]], [1.26, -0.21]), 0.06);
// The same picture small: the geometry card of slide 44.

// ---------------------------------------------------------------- the solution in the column space
// Slide 21: a candidate X theta = t1 x1 + t2 x2 in the plane, with its dashed parallelogram, and
// the residual y - X theta from it to y; at theta-hat = (5/9, -7/9) (within half a knob step)
// the residual is vertical and the right angle appears.  The patch holds every position the
// knobs reach (t1 in [-0.5, 1.5], t2 in [-1.5, 0.5]).
const SOL3 = pic3(170, [[-2.1, 3.9], [-1.65, 2.32]]), THAT3 = [5 / 9, -7 / 9];
FIGS.solve3 = {
  duration: 1200, size: SOL3.size,
  draw(g, p) {
    const P = g.plot(SOL3.B), v = view3, c = [...inPlane(p.t1, p.t2), 0];
    const at = Math.abs(p.t1 - THAT3[0]) <= 1 / 180 + 1e-9 && Math.abs(p.t2 - THAT3[1]) <= 1 / 180 + 1e-9;
    P.path(SOL3.patch, { close: true, fill: 'pred', fo: 0.1, color: 'pred', so: 0.6, w: 2 });
    P.path([C3.o, [...inPlane(p.t1, 0), 0], c, [...inPlane(0, p.t2), 0]].map(v), { close: true, color: 'post', w: 1.8, dash: '6 4' });
    P.vec(v(C3.o), v(C3.x1), { color: 'brown' });
    P.vec(v(C3.o), v(C3.x2), { color: 'prior' });
    P.dot(v(C3.yh), { color: 'teal', r: 5 });
    P.vec(v(c), v(C3.y), { color: 'rose', w: 3, head: 12, gap: 7, cls: 'resid' });
    P.dot(v(C3.y), { color: 'like' });
    P.dot(v(c), { color: 'none', stroke: 'post', 'stroke-width': 3, r: 10 });
    // the right angle at y-hat (the normal and the in-plane direction perpendicular to y-hat),
    // larger than the candidate's ring, which sits on y-hat then
    const s = 0.12, L = Math.hypot(...SYH), d = [SYH[1] / L * s, -SYH[0] / L * s];
    P.path([[SYH[0] + d[0], SYH[1] + d[1], 0], [SYH[0] + d[0], SYH[1] + d[1], s], [SYH[0], SYH[1], s]].map(v),
      { color: '#4d4d4d', w: 2, opacity: at ? 1 : 0, cls: 'rmark' });
    P.label('x1', '$\\boldsymbol x^{(1)}$', v(C3.x1), 'b', { dy: -10, color: 'brown' });
    P.label('x2', '$\\boldsymbol x^{(2)}$', v(C3.x2), 'l', { dx: 10, color: 'prior' });
    P.label('y', '$\\by$', v(C3.y), 'b', { dy: -9, color: 'like' });
    P.label('yh', '$\\widehat{\\by}$', v(C3.yh), 'l', { dx: 17, color: 'teal' });
    P.label('c', '$X\\btheta$', v(c), 'tr', { dx: -8, dy: 8, color: 'post' });
    // the readout, above the far edge at the right
    const fx = (x, d) => { const t = x.toFixed(d); return /^-0\.0*$/.test(t) ? t.slice(1) : t; };
    P.label('rt', `$\\btheta=(${fx(p.t1, 3)},\\,${fx(p.t2, 3)})$`, [P.xhi, P.yhi], 'tr', { dx: -12, dy: 12, color: 'post' });
  }
};

// ---------------------------------------------------------------- Demo 2: three learning rates
// Gradient descent on J(theta) = (theta0 - 1)^2 + 4 (theta1 - 2)^2 from (-2, -1):
// theta <- theta - eta grad J reproduces her three paths (eta = 0.04, 0.15, 0.28 with
// n = 7, 8, 3 steps).  A path that leaves the axes stops where it crosses them.
const GB = box2d(40, 24, 780, 500, -3.1, 4.8, -4.2, 6.1), J_START = [-2, -1];
function gdPath(eta, n) {
  const pts = [J_START.slice()];
  let [u, v] = J_START;
  for (let k = 0; k < n; k++) { u -= eta * 2 * (u - 1); v -= eta * 8 * (v - 2); pts.push([u, v]); }
  return pts;
}
FIGS.gd = {
  duration: 1200, size: [850, 560],
  draw(g, p) {
    const P = g.plot(GB), eta = p.eta, on = clamp(eta / 0.01);
    // the contours of J: darker means smaller J, nearer the minimum
    const rings = [[0.71, 0.35], [1.41, 0.71], [2.24, 1.12], [3.16, 1.58], [4.47, 2.24], [6.32, 3.16]]
      .map(([ra, rb]) => P.steps({}, 0, 2 * Math.PI, 100).map(t => [1 + ra * Math.cos(t), 2 + rb * Math.sin(t)]));
    const lines = contourRamp(P, rings, (ring, col) => clipPoly(P, ring).forEach(seg => P.path(seg, { color: col, w: STYLE.contour })));
    lines();
    P.axes({ grid: false, xt: [-2, 1, 2, 4], yt: [-4, -2, 2, 4, 6], names: ['$\\theta_0$', '$\\theta_1$'] });
    star(P, [1, 2], 11);
    P.label('min', '<b>minimum</b>', [1, 2], 'bl', { dx: 2, dy: -2 });
    // the iterates up to the first that leaves the axes, that step cut where it crosses them
    const it = gdPath(eta, Math.round(p.n)), path = [it[0]];
    let inside = it.length;
    for (let i = 1; i < it.length; i++) {
      const s = clipSeg(it[i - 1], it[i], P);
      path.push(s ? s.b : it[i - 1]);
      if (!s || s.t1 < 1) { inside = i; break; }
    }
    const st = { color: 'teal', opacity: on };
    if (path.length > 2) P.path(path.slice(0, -1), Object.assign({ w: 3.5, join: 'round' }, st));
    if (path.length > 1) P.vec(path[path.length - 2], path[path.length - 1], Object.assign({ w: 3.5, head: 14 }, st));
    it.slice(0, inside).forEach(q => P.dot(q, Object.assign({ r: 5, outline: false }, st)));
    P.dot(J_START, { color: 'ink', r: 8, opacity: 1 - on });
    P.label('start', 'start', J_START, 'tr', { dx: -4, dy: 4, opacity: 1 - on });
    readout(g, 'eta', `<span class="badge k-teal">$\\eta=${fmt(eta, 2)}$</span>`);
  }
};

// ---------------------------------------------------------------- least squares in one dimension
// The one-column case: Y_i = theta* x_i + e_i with theta* = 1, sigma = 0.5, x = 1..4; the true line y = x
// (dashed), the fit y = 1.02 x (fit = 1 shows it), and (samp) the fits to five more samples
// from the same model (seeded noise, rounded to 0.1).
const LB1 = box2d(56, 30, 400, 380, 0, 4.5, 0, 5), PTS1 = [[1, 1.2], [2, 1.8], [3, 3.4], [4, 3.9]];
const SLOPES1 = [0.943, 1.053, 1.020, 1.010, 0.783];
FIGS.ls1d = {
  size: [530, 450],
  draw(g, p) {
    const P = g.plot(LB1), ah = PTS1.reduce((t, [x, y]) => t + x * y, 0) / PTS1.reduce((t, [x]) => t + x * x, 0);   // 30.6 / 30
    deckAxes(P, [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5]);
    SLOPES1.forEach(b => P.line([0, 0], [4.5, 4.5 * b], { color: 'teal', w: 1.5, so: 0.45, opacity: p.samp }));
    P.line([0, 0], [4.5, 4.5], { color: 'ink', w: 2.5, dash: true });
    P.line([0, 0], [4.5, 4.5 * ah], { color: 'teal', w: 3.5, opacity: p.fit });
    dots(P, PTS1);
    P.label('lt', '$y=\\theta^*x$', [4.5, 4.5], 'tl', { dx: 6, dy: 2 });
    P.label('lf', '$y=\\widehat\\theta\\,x$', [4.5, 4.5 * ah], 'bl', { dx: 6, dy: -2, color: 'teal', opacity: p.fit });
  }
};

// ---------------------------------------------------------------- the Gaussian model
// The model's mean 1 + 0.98x (dashed) and, when b = 1, the noise density at x = 2, 4, 6
// drawn sideways: x0 + 0.55 exp(-t^2 / (2 0.38^2)) at height 1 + 0.98 x0 + t.
const NB = box2d(64, 30, 540, 410, -0.3, 7.5, 0, 9.1);
FIGS.gauss = {
  size: [660, 490],
  draw(g, p) {
    const P = g.plot(NB), m = x => 1 + 0.98 * x;
    deckAxes(P, XT, YT);
    P.line([0, m(0)], [7, m(7)], { color: 'ink', w: 3, dash: true });
    for (const x0 of [2, 4, 6]) {
      const lo = m(x0) - 1.35, hi = m(x0) + 1.35;
      const bell = P.steps({}, -1.35, 1.35, 80).map(t => [x0 + 0.55 * Math.exp(-t * t / (2 * 0.38 * 0.38)), m(x0) + t]);
      P.line([x0, lo], [x0, hi], { color: 'like', w: 1.2, so: 0.55, opacity: p.b });
      P.path([[x0, lo], ...bell, [x0, hi]], { close: true, fill: 'like', fo: 0.13, color: 'none', w: null, opacity: p.b });
      P.path(bell, { color: 'like', w: 2.5, opacity: p.b });
    }
    dots(P, DATA, { r: 6 });
  }
};

// ---------------------------------------------------------------- independent factors multiply
FIGS.lik = {
  size: [450, 340],
  draw(g, p) {
    const bw = 116, bh = 46, step = 66, x0 = 4, y0 = 6, px = x0 + bw + 78, py = y0 + 2 * step + bh / 2;
    for (let i = 0; i < 5; i++) {
      const y = y0 + i * step + bh / 2;
      g.arrow([x0 + bw, y], [px - 18, py], { color: '#222', w: 1.6, head: 9, opacity: p.on });
    }
    for (let i = 0; i < 5; i++) softRect(g, 'l' + i, [x0, y0 + i * step, bw, bh], 'like', `$p(y_{${i + 1}}\\mid\\cdot)$`);
    g.label('prod', '<span style="font-size:46px">$\\prod$</span>', [px, py], 'c', { opacity: p.on });
    softRect(g, 'lk', [px + 34, py - 32, 156, 64], 'prior', '<span style="font-size:20px;line-height:1.1">likelihood<br>of the data</span>', p.on);
  }
};

// ---------------------------------------------------------------- Demo 3: one evil outlier
// The points (0,1) ... (5,6) and the outlier (6, h); the least-squares line refitted to all
// seven.  Her readout is the outlier's distance from the dashed line y = 1 + x, the fit
// before it moved: residual = h - 7, computed from the shown height.
const OB = box2d(64, 30, 580, 410, -0.3, 6.5, -1.5, 18.2), OPTS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
function lsLine(pts) {
  const n = pts.length, mx = pts.reduce((s, q) => s + q[0], 0) / n, my = pts.reduce((s, q) => s + q[1], 0) / n;
  const b = pts.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / pts.reduce((s, [x]) => s + (x - mx) ** 2, 0);
  return [my - b * mx, b];
}
FIGS.outlier = {
  size: [700, 490],
  draw(g, p) {
    const P = g.plot(OB), h = +fmt(p.h, 1), [a, b] = lsLine([...OPTS, [6, h]]);
    deckAxes(P, XT, [0, 5, 10, 15]);
    P.line([0, 1], [6.2, 7.2], { color: '#a6a6a6', w: 2, dash: '5 3' });
    P.line([0, a], [6.2, a + 6.2 * b], { color: 'teal', w: 3.5 });
    P.line([6, 7], [6, h], { color: 'rose', w: 2.5, dash: '7 5' });
    dots(P, OPTS);
    P.dot([6, h], { color: 'like', r: 9 });
    const r = +fmt(h - 7, 1);
    readout(g, 'res', `<span class="badge k-rose">residual $=${r}$</span>`);
    readout(g, 'sq', `${r < 0 ? `(${r})` : r}^2=${fmt(r * r, 2)}`, true);
  }
};

// ---------------------------------------------------------------- synthesis: the geometry card
const SYN3 = pic3(120, [[-0.40, 1.22], [-0.58, 2.47]]);
FIGS.synth = {
  size: SYN3.size,
  draw(g) { colSpace3(g, SYN3, { yvec: true, w: 3, head: 11, s: 0.08, lab: 'y' }); }
};
