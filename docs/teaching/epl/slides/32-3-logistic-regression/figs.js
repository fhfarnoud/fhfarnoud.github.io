// Figures of the Linear Classification deck (Chapter 6).  Each FIGS entry draws
// from one parameter object (see ../shared/deck.js).  The models are computed
// here (sigmoid, softmax, the 32-day loss, the gradient-descent runs, the L2
// fits), not copied from tables; they reproduce the plan's verified numbers
// (chat_files/logistic-regression-numbers.py).

Object.assign(MACROS, {
  '\\bx': '\\mathbf{x}', '\\bX': '\\mathbf{X}', '\\tbx': '\\tilde{\\mathbf{x}}',
  '\\bbeta': '\\textcolor{#2354A8}{\\boldsymbol{\\beta}}',
  '\\cbeta': '\\textcolor{#2354A8}{\\beta}', '\\cgamma': '\\textcolor{#A05A00}{\\gamma}',
  '\\clambda': '\\textcolor{#B33362}{\\lambda}',
  '\\muZero': '\\textcolor{#A0521B}{\\boldsymbol{\\mu}_0}',
  '\\muOne': '\\textcolor{#087F80}{\\boldsymbol{\\mu}_1}',
  '\\piZero': '\\textcolor{#A0521B}{\\pi_0}',
  '\\piOne': '\\textcolor{#087F80}{\\pi_1}',
  '\\btheta': '\\boldsymbol{\\theta}', '\\bmu': '\\boldsymbol{\\mu}', '\\bv': '\\mathbf{v}',
  '\\bz': '\\mathbf{z}', '\\be': '\\mathbf{e}', '\\bb': '\\mathbf{b}', '\\by': '\\mathbf{y}',
  '\\bphi': '\\boldsymbol{\\phi}', '\\tbphi': '\\tilde{\\boldsymbol{\\phi}}', '\\bzero': '\\mathbf{0}',
  '\\mW': '\\mathsf{W}', '\\cL': '\\mathcal{L}', '\\cV': '\\mathcal{V}', '\\cD': '\\mathcal{D}',
  '\\ber': '\\operatorname{Ber}', '\\bbR': '\\mathbb{R}',
  // role colours (## is a literal # inside a KaTeX macro)
  '\\cpr': '\\textcolor{##2354A8}{#1}', '\\clk': '\\textcolor{##008000}{#1}', '\\cpo': '\\textcolor{##B30000}{#1}',
  '\\cpd': '\\textcolor{##762A83}{#1}', '\\cml': '\\textcolor{##616161}{#1}', '\\cro': '\\textcolor{##B33362}{#1}',
  '\\cte': '\\textcolor{##087F80}{#1}', '\\cbr': '\\textcolor{##A0521B}{#1}'
});

// ---------------------------------------------------------------- models
const LN2 = Math.log(2), LN3 = Math.log(3);
const sigm = u => 1 / (1 + Math.exp(-u));
const lnsig = u => u > 0 ? -Math.log1p(Math.exp(-u)) : u - Math.log1p(Math.exp(u));   // ln sigma(u)
const neg = s => String(s).replace(/^-/, '−');
const f2 = v => neg((Math.abs(v) < 0.005 ? 0 : v).toFixed(2));
const f3 = v => neg((Math.abs(v) < 0.0005 ? 0 : v).toFixed(3));
const thou = v => v.toLocaleString('en-US');
const softmax = z => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
// a multiple of ln 3 in KaTeX: 0, \ln 3, -\ln 3, 2\ln 3, 1.35\ln 3
function lnK(v, base = '\\ln 3') {
  if (Math.abs(v) < 1e-9) return '0';
  if (Math.abs(v - 1) < 1e-9) return base;
  if (Math.abs(v + 1) < 1e-9) return '-' + base;
  return fmt(v, 2) + '\\,' + base;
}

// The 32 days of rain (Sec. 6.3.2). Plot coordinates r are humidity / 10;
// every displayed x value is humidity in percent, and beta = b / 10.
const DX = [5, 6, 7, 8, 9], DN = [10, 4, 4, 4, 10], DR = [1, 1, 2, 3, 9];
const loss32 = (b, g) => DX.reduce((s, x, k) => s - DR[k] * lnsig(b * x + g) - (DN[k] - DR[k]) * lnsig(-(b * x + g)), 0);
// Gradient descent on the summed loss from theta = 0. In displayed parameters,
// beta has step 1/32000 and gamma step 1/320. This is rho = 1/320 in (b,g).
// The second run centers humidity at 70 (r = 7).
function gdRun(T, shift = 0, rho = 1 / 320) {
  const B = new Float64Array(T + 1), G = new Float64Array(T + 1), L = new Float64Array(T + 1);
  let b = 0, g = 0;
  for (let t = 0; t <= T; t++) {
    B[t] = b; G[t] = g; L[t] = loss32(b, g - b * shift) / 32;
    let sb = 0, sg = 0;
    DX.forEach((x, k) => { const u = x - shift, e = DR[k] - DN[k] * sigm(b * u + g); sb += e * u; sg += e; });
    b += rho * sb; g += rho * sg;
  }
  return { B, G, L };
}
const GD = gdRun(10000);
const LMIN = loss32(LN3, -7 * LN3) / 32;      // 0.4304, the empirical conditional entropy

// The four separable days (Sec. 6.3.5): displayed u = -20,-10,10,20;
// the plot coordinates and model use u / 10, so displayed beta = b / 10.
const FU = [-2, -1, 1, 2], FY = [0, 0, 1, 1];
const loss4 = (b, g = 0) => FU.reduce((s, u, i) => s - lnsig((FY[i] ? 1 : -1) * (b * u + g)), 0);
const GD4 = (() => { const B = [0]; let b = 0;
  for (let t = 1; t <= 10000; t++) { let s = 0; FU.forEach((u, i) => { s += (FY[i] - sigm(b * u)) * u; }); b += s / 3; B.push(b); }
  return B; })();
// minimizer of L(beta, 0) + lambda beta^2 (gamma = 0 by symmetry), by Newton's method
function l2fit(lam) {
  let b = 1;
  for (let i = 0; i < 60; i++) {
    let d = 2 * lam * b, h2 = 2 * lam;
    FU.forEach((u, j) => { const h = sigm(b * u); d -= (FY[j] - h) * u; h2 += h * (1 - h) * u * u; });
    b -= d / h2;
  }
  return b;
}
const lamOf = ll => +(10 ** ll).toPrecision(2);   // a log-scale slider's lambda, as displayed

// ---------------------------------------------------------------- shared drawing
const halo = { stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' };
// a polyline of y = f(x) whose pen lifts outside the plot (both ways)
function fpath(P, f, lo, hi, n = 240) {
  let d = '', pen = false;
  for (let i = 0; i <= n; i++) {
    const x = lo + (hi - lo) * i / n, y = f(x);
    if (!Number.isFinite(y) || y < P.ylo || y > P.yhi || x < P.xlo || x > P.xhi) { pen = false; continue; }
    d += (pen ? 'L' : 'M') + P.X(x).toFixed(1) + ',' + P.Y(y).toFixed(1); pen = true;
  }
  return d;
}
const stroke = (P, d, st = {}) => P.g.el('path', paint(st, { d, fill: 'none', stroke: C.ink, 'stroke-width': STYLE.curve, 'stroke-linejoin': 'round' }));
// the days as dots at their labels: rainy days at y = 1 stacked upward, dry days
// at y = 0 stacked downward, in rows of five centred on each humidity
function dayDots(P, xs = DX, ns = DN, rs = DR, r = 5.5) {
  const sp = 2 * r + 2.4;
  xs.forEach((x, k) => {
    const put = (cnt, y, dir, col) => {
      for (let i = 0; i < cnt; i++) {
        const row = Math.floor(i / 5), inRow = Math.min(5, cnt - row * 5), j = i % 5;
        P.g.el('circle', { cx: P.X(x) + (j - (inRow - 1) / 2) * sp, cy: P.Y(y) - dir * row * sp, r,
          fill: C[col], 'fill-opacity': 0.9, stroke: '#fff', 'stroke-width': 1 });
      }
    };
    put(rs[k], 1, 1, 'teal');
    put(ns[k] - rs[k], 0, -1, 'brown');
  });
}
// probability axes over humidity: x from xlo, the axis under the dry days
function humAxes(P, o = {}) {
  percentAxes(P, { grid: false, ox: P.xlo, oy: P.ylo, xt: o.xt || [5, 6, 7, 8, 9], yt: [], names: ['', ''] });
  for (const v of [0, 0.5, 1]) {
    P.line([P.xlo, v], [P.xhi, v], { color: '#bbb', w: 1, dash: '4 5' });
    P.text([P.xlo, v], v === 0.5 ? '0.5' : String(v), { anchor: 'end', dx: -7, dy: 5 });
  }
}

// Figures retain a compact coordinate r = humidity/10, while tick labels show
// the physical humidity x in percent. The same helper labels centered u values.
function percentAxes(P, o) {
  const xt = o.xt || [], oy = o.oy ?? 0;
  P.axes({ ...o, xt: [] });
  for (const r of xt) P.g.text([P.X(r), P.Y(oy) + 20], String(10 * r));
}

// ---------------------------------------------------------------- generative classifiers, slides 6 to 9 and 14 to 17: one input
// Displayed humidity X | Y = 1 ~ N(80, 100), X | Y = 0 ~ N(60, 100).
// The plot coordinate r = x/10 has densities scaled by 1/10, so the plotted
// weighted-density values are densities per percentage point.
const N1 = r => phi(r, 8, 1) / 10, N0 = r => phi(r, 6, 1) / 10;
const aOf = (x, pi) => 2 * x - 14 + Math.log(pi / (1 - pi));
const postAt = (x, pi) => sigm(aOf(x, pi));
const bndOf = pi => 7 - Math.log(pi / (1 - pi)) / 2;          // where a(x) = 0
const HUM = '$x$ = humidity (%)';
// Slides 7–8: the first three generative steps; slide 8 adds normalization.
function drawDensityStages(g, p, showPosterior) {
    const pi = p.pi ?? 1 / 3, dry = 1 - pi;
    const title = (y, s) => g.text([16, y], s, { anchor: 'start', size: 18, color: C.ink, 'font-weight': 700 });
    title(24, '1. Prior probabilities');
    for (const [i, prior, color, label] of [[0, dry, 'brown', '$p(y=0)=\\frac23$'], [1, pi, 'teal', '$p(y=1)=\\frac13$']]) {
      const y = 36 + 30 * i;
      g.label('pr' + i, label, [18, y + 11], 'l', { color });
      g.el('rect', { x: 190, y, width: 270, height: 21, rx: 3, fill: '#eeeeee' });
      g.el('rect', { x: 190, y, width: 270 * prior, height: 21, rx: 3, fill: C[color], 'fill-opacity': 0.72 });
    }
    // st: the panels shown, 1 to 3 (slide 7 builds them up; slide 8 shows all three)
    const st = p.st ?? 3, s2 = clamp(st - 1, 0, 1), s3 = clamp(st - 2, 0, 1);
    const check = p.check ?? 0, x = 7;
    g.group({ opacity: s2 }, () => {
      g.line([16, 103], [475, 103], { color: '#dddddd', w: 1 });
      title(125, '2. Class-conditional densities');
      const U = g.plot(box2d(55, 140, 410, 77, 3, 10, 0, 0.043));
      U.line([3, 0], [10, 0], { color: C.axis, w: 1.5 });
      U.density(N0, { color: 'brown', fo: 0.12 });
      U.density(N1, { color: 'teal', fo: 0.12 });
      U.text([6, 0], '60', { dy: 15, size: 13 });
      U.text([8, 0], '80', { dy: 15, size: 13 });
    });
    const W = g.plot(box2d(55, 280, 410, 78, 3, 10, 0, 0.03));
    g.group({ opacity: s3 }, () => {
      g.line([16, 242], [475, 242], { color: '#dddddd', w: 1 });
      title(264, '3. Joint densities');
      W.line([3, 0], [10, 0], { color: C.axis, w: 1.5 });
      W.density(x => dry * N0(x), { color: 'brown', fo: 0.12 });
      W.density(x => pi * N1(x), { color: 'teal', fo: 0.12 });
      for (const x of [4, 6, 8, 10]) W.text([x, 0], String(10 * x), { dy: 16, size: 13 });
      W.line([x, 0], [x, 0.03], { color: C.ink, w: 1.5, dash: '5 4', opacity: check });
      W.dot([x, dry * N0(x)], { r: 5.5, color: 'brown', opacity: check });
      W.dot([x, pi * N1(x)], { r: 5.5, color: 'teal', opacity: check });
    });
    W.label('w0', '$w_0(x)$', [4.5, 0.012], 'r', { dx: -6, color: 'brown', opacity: s3 });
    W.label('w1', '$w_1(x)$', [9.3, 0.0085], 'l', { dx: 6, color: 'teal', opacity: s3 });
    W.label('qx', '70%', [x, 0], 't', { dy: 16, color: C.ink, opacity: check });
    if (!showPosterior) return;
    g.line([16, 386], [475, 386], { color: '#dddddd', w: 1 });
    title(408, '4. Posterior probability of rain');
    const P = g.plot(box2d(55, 427, 410, 91, 3, 10, 0, 1));
    P.line([3, 0], [10, 0], { color: C.axis, w: 1.5 });
    P.line([3, 0.5], [10, 0.5], { color: '#cccccc', w: 1, dash: '4 4' });
    for (const x of [4, 6, 8, 10]) P.text([x, 0], String(10 * x), { dy: 16, size: 13 });
    P.text([3, 1], '1', { dx: -12, dy: 4, size: 13 });
    P.text([3, 0], '0', { dx: -12, dy: 4, size: 13 });
    const cv = p.cv ?? 0;
    stroke(P, fpath(P, z => postAt(z, pi), 3, 10), { color: 'pred', w: 3, opacity: cv });
    P.label('post', '$p(y=1\\mid x)$', [7.6, 0.85], 'r', { dx: -10, color: 'pred', opacity: cv });
    P.line([x, 0], [x, postAt(x, pi)], { color: 'pred', w: 1.3, dash: '4 4', opacity: check });
    P.dot([x, postAt(x, pi)], { r: 5.5, color: 'pred', opacity: check });
    P.label('p70', '$1/3$', [x, postAt(x, pi)], 'tl', { dx: 8, dy: 7, color: 'pred', opacity: check });
}
FIGS.densityStages = {
  duration: 1100, size: [500, 390],
  draw(g, p) { drawDensityStages(g, p, false); }
};
FIGS.densityPosteriorStages = {
  duration: 1100, size: [500, 560],
  draw(g, p) { drawDensityStages(g, p, true); }
};
// the weighted class-conditional densities pi p(x | y = 1) and (1 - pi) p(x | y = 0)
const BL = box2d(62, 40, 450, 270, 3, 10, 0, 0.04);
FIGS.bells = {
  duration: 1100, size: [570, 380],
  draw(g, p) {
    const pi = p.pi ?? 0.5, P = g.plot(BL);
    percentAxes(P, { grid: false, ox: 3, xt: [3, 4, 5, 6, 7, 8, 9, 10], yt: [0.01, 0.02, 0.03, 0.04], names: ['', ''] });
    P.label('hx', HUM, [6.5, 0], 't', { dy: 28, color: '#444' });
    P.label('hy', 'joint density', [3, 0.04], 'l', { dx: 8, dy: -8, color: '#444' });
    P.density(x => (1 - pi) * N0(x), { color: 'brown' });
    P.density(x => pi * N1(x), { color: 'teal' });
    if (p.posteriorLabels) {
      P.label('l0', '$p(y=0\\mid x)$<br>$\\propto(1-\\pi)\\,p(x\\mid y=0)$', [6, (1 - pi) * N0(6)], 'b', { dx: -5, dy: -10, color: 'brown' });
      P.label('l1', '$p(y=1\\mid x)$<br>$\\propto\\pi\\,p(x\\mid y=1)$', [8.3, pi * N1(8.3)], 'b', { dx: -4, dy: -10, color: 'teal' });
    } else {
      P.label('l0', 'no rain:<br>$(1-\\pi)\\,p(x\\mid y=0)$', [6, (1 - pi) * N0(6)], 'b', { dx: -30, dy: -10, color: 'brown' });
      P.label('l1', 'rain: $\\pi\\,p(x\\mid y=1)$', [8.3, pi * N1(8.3)], 'bl', { dx: 6, dy: -8, color: 'teal' });
    }
    const q = p.q ?? 0, ans = p.ans ?? 0, x = 7.5;
    P.line([x, 0], [x, 0.036], { color: 'ink', w: 1.5, dash: '5 4', opacity: q });
    P.label('qx', '75%', [x, 0.036], 'b', { dy: -4, opacity: q });
    P.dot([x, pi * N1(x)], { r: 6.5, color: 'teal', opacity: ans });
    P.dot([x, (1 - pi) * N0(x)], { r: 6.5, color: 'brown', opacity: ans });
    P.label('a1', fmt(pi * N1(x), 4), [x, pi * N1(x)], 'l', { dx: 10, color: 'teal', opacity: ans });
    P.label('a0', fmt((1 - pi) * N0(x), 4), [x, (1 - pi) * N0(x)], 'l', { dx: 10, color: 'brown', opacity: ans });
  }
};
// the posterior p(y = 1 | x) against humidity (pi defaults to 1/2).
// bl: the bells, faint and scaled, beneath it;
// reg: the threshold 1/2 and the regions where rain and no rain are predicted; vals: the
// posterior at 6, 7, 7.5, 8. For the exercise: two = 1 draws pi = 1/4 solid
// and the given pi dashed; ea, eb, ec mark its parts (a), (b), (c).
const PO = box2d(62, 40, 450, 270, 3, 10, 0, 1);
FIGS.post1d = {
  duration: 1100, size: [570, 380],
  draw(g, p) {
    const P = g.plot(PO), two = p.two ?? 0, pi = p.pi ?? 0.5, boundary = bndOf(pi);
    const reg = p.reg ?? 0, bl = p.bl ?? 0, vals = p.vals ?? 0;
    P.rect([3, 0], [boundary, 1], { color: 'brown', fo: 0.1 * reg });
    P.rect([boundary, 0], [10, 1], { color: 'teal', fo: 0.1 * reg });
    percentAxes(P, { grid: false, ox: 3, xt: [3, 4, 5, 6, 7, 8, 9, 10], yt: [0.5, 1], names: ['', ''] });
    P.label('hx', HUM, [6.5, 0], 't', { dy: 28, color: '#444' });
    P.label('hy', '$p(y=1\\mid x)$', [3, 1], 'l', { dx: 8, dy: -8, color: '#444' });
    P.line([3, 1], [10, 1], { color: '#bbb', w: 1, dash: '4 5' });
    P.line([3, 0.5], [10, 0.5], { color: '#bbb', w: 1, dash: '4 5' });
    g.group({ opacity: 0.35 * bl }, () => {
      P.density(x => 22 * (1 - pi) * N0(x), { color: 'brown', w: 2, fo: 0.08 });
      P.density(x => 22 * pi * N1(x), { color: 'teal', w: 2, fo: 0.08 });
    });
    P.line([boundary, 0], [boundary, 1], { color: 'ink', w: 1.5, dash: '5 4', opacity: reg });
    P.label('r0', 'predict no rain', [5, 0.92], 'c', { color: 'brown', opacity: reg });
    P.label('r1', 'predict rain', [8.5, 0.12], 'c', { color: 'teal', opacity: reg });
    if (two) stroke(P, fpath(P, x => postAt(x, 0.25), 3, 10), { color: 'pred', opacity: two });
    stroke(P, fpath(P, x => postAt(x, pi), 3, 10), two > 0.5 ? { color: 'pred', w: 2.5, dash: '7 6', opacity: p.cv ?? 1 } : { color: 'pred', opacity: p.cv ?? 1 });
    if (vals) for (const x of [6, 7, 7.5, 8]) {
      P.dot([x, postAt(x, pi)], { r: 6, color: 'pred', opacity: vals });
      P.label('v' + x, fmt(postAt(x, pi), 3), [x, postAt(x, pi)], x < boundary ? 'br' : 'tl', { dx: x < boundary ? -8 : 8, dy: x < boundary ? -6 : 6, color: 'pred', opacity: vals });
    }
    if (two) {
      P.label('t5', Math.abs(pi - 1 / 3) < 0.001 ? 'dashed: $\\pi=1/3$' : 'dashed: $\\pi=1/2$',
        [7.4, postAt(7.4, pi)], 'r', { dx: -12, color: 'pred', opacity: two });
      P.label('t25', '$\\pi=1/4$', [8.6, postAt(8.6, 0.25)], 'tl', { dx: 8, dy: 6, color: 'pred', opacity: two });
      const ea = p.ea ?? 0, eb = p.eb ?? 0, ec = p.ec ?? 0, b25 = bndOf(0.25);
      P.dot([7, 0.25], { r: 6.5, color: 'pred', opacity: ea });
      P.label('ea', '$0.25$', [7, 0.25], 'tl', { dx: 10, dy: 6, color: 'pred', opacity: ea });
      P.line([bndOf(pi), 0], [bndOf(pi), 0.5], { color: 'pred', w: 1.5, dash: '4 4', opacity: 0.6 * eb });   // the boundary of the dashed model
      P.line([b25, 0], [b25, 0.5], { color: 'pred', w: 2, opacity: eb });
      P.label('eb', `$${fmt(10 * b25, 2)}$`, [b25, 0], 'bl', { dx: 6, dy: -4, color: 'pred', opacity: eb });   // above the axis, clear of the 80 tick
      P.dot([8, postAt(8, 0.25)], { r: 6.5, color: 'pred', opacity: ec });
      P.label('ec', f3(postAt(8, 0.25)), [8, postAt(8, 0.25)], 'tl', { dx: 8, dy: 6, color: 'pred', opacity: ec });
    }
  }
};

// ---------------------------------------------------------------- generative classifiers, slides 9 to 14: two inputs
// Standardized humidity x1 and pressure x2. Rain has higher humidity and lower
// pressure. Both classes have correlation 0.4; s=0 gives shared covariance
// [[1,.4],[.4,1]], while s=1 gives class one's [[2,.4],[.4,.5]].
// Both endpoint determinants are .84, so the QDA drawer's log determinants cancel.
// el: ellipses; bd: boundary; sh: correlated LDA posterior shading and levels.
const LDAB = box2d(36, 22, 420, 300, -1, 6, -1, 4), LDA_PER_CLASS = 160;
const LDAZ = normals(20261015, 2 * LDA_PER_CLASS);
const MU0 = [1, 2], MU1 = [3, 1], LDA_RHO = 0.4;
const ldaCov = s => [[1 + s, LDA_RHO], [LDA_RHO, 1 - 0.5 * s]];
const invSym2 = S => {
  const det = S[0][0] * S[1][1] - S[0][1] ** 2;
  return { det, m: [[S[1][1] / det, -S[0][1] / det], [-S[0][1] / det, S[0][0] / det]] };
};
const applySym2 = (S, v) => [S[0][0] * v[0] + S[0][1] * v[1], S[1][0] * v[0] + S[1][1] * v[1]];
const quadSym2 = (S, v) => v[0] * (S[0][0] * v[0] + S[0][1] * v[1]) + v[1] * (S[1][0] * v[0] + S[1][1] * v[1]);
const gaussianPoint = (mu, S, u, v) => {
  const a = Math.sqrt(S[0][0]);
  return [mu[0] + a * u, mu[1] + S[0][1] / a * u + Math.sqrt(S[1][1] - S[0][1] ** 2 / S[0][0]) * v];
};
// A one-dimensional slice of the two *bivariate* weighted densities, taken
// along the line from mu0 toward mu1. It shares the slide's live parameters.
function drawWeightedSlice(root, pi, sd, rho, mu0, mu1) {
  const svg = root.closest('section').querySelector('.weighted-slice');
  if (!svg) return;
  const distance = Math.hypot(mu1[0] - mu0[0], mu1[1] - mu0[1]);
  const ux = distance > 1e-8 ? (mu1[0] - mu0[0]) / distance : 1;
  const uy = distance > 1e-8 ? (mu1[1] - mu0[1]) / distance : 0;
  const q = (1 - 2 * rho * ux * uy) / (sd * sd * (1 - rho * rho));
  const sliceSd = 1 / Math.sqrt(q);
  const lo = -2.5 * sliceSd, hi = Math.max(5, distance + 2.5 * sliceSd);
  const X = t => 24 + 402 * (t - lo) / (hi - lo);
  // Scale by sigma only: as pi changes, one peak must rise while the other
  // falls. Scaling by max(pi, 1-pi) would hide the rise of the larger class.
  const peak = 1 / (2 * Math.PI * sd * sd * Math.sqrt(1 - rho * rho));
  const Y = density => 76 - 72 * density / peak;
  const curve = (prior, mean) => Array.from({ length: 121 }, (_, i) => {
    const t = lo + (hi - lo) * i / 120;
    const density = prior * peak * Math.exp(-q * (t - mean) ** 2 / 2);
    return `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(density).toFixed(1)}`;
  }).join(' ');
  const x0 = X(0).toFixed(1), x1 = X(distance).toFixed(1);
  svg.innerHTML = `<text x="24" y="13" fill="#666" font-size="12">class-conditional peak: ${peak.toFixed(3)}</text>
    <line x1="24" y1="76" x2="426" y2="76" stroke="#888" stroke-width="1"/>
    <path d="${curve(1 - pi, 0)}" fill="none" stroke="#A0521B" stroke-width="2.5"/>
    <path d="${curve(pi, distance)}" fill="none" stroke="#087F80" stroke-width="2.5"/>
    <line x1="${x0}" y1="75" x2="${x0}" y2="82" stroke="#A0521B" stroke-width="2"/>
    <line x1="${x1}" y1="75" x2="${x1}" y2="82" stroke="#087F80" stroke-width="2"/>
    <text x="${x0}" y="96" text-anchor="middle" fill="#A0521B" font-size="15">μ₀</text>
    <text x="${x1}" y="96" text-anchor="middle" fill="#087F80" font-size="15">μ₁</text>`;
}
// the box's polygon cut to lo <= w1 x1 + w2 x2 + c <= hi
function bandPoly(B, w1, w2, c, lo, hi) {
  let poly = [[B.xlo, B.ylo], [B.xhi, B.ylo], [B.xhi, B.yhi], [B.xlo, B.yhi]];
  const f = q => w1 * q[0] + w2 * q[1] + c;
  const cut = (poly, g) => { const out = [];
    poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length], ga = g(a), gb = g(b);
      if (ga <= 0) out.push(a);
      if ((ga < 0) !== (gb < 0) && ga !== gb) { const u = ga / (ga - gb); out.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]); } });
    return out; };
  return cut(cut(poly, q => f(q) - hi), q => lo - f(q));
}
FIGS.lda = {
  duration: 1500, size: [500, 370],
  draw(g, p) {
    const P = g.plot(LDAB), s = p.s ?? 0, sh = p.sh ?? 0;
    const S0 = ldaCov(0), S1 = ldaCov(s), I0 = invSym2(S0), I1 = invSym2(S1);
    const delta = [MU1[0] - MU0[0], MU1[1] - MU0[1]];
    const w = applySym2(I0.m, delta);
    const mid = [(MU0[0] + MU1[0]) / 2, (MU0[1] + MU1[1]) / 2];
    const c = -w[0] * mid[0] - w[1] * mid[1];
    if (sh) for (let i = -40; i < 40; i++) {
      const lo = i * 0.25, hi = lo + 0.25, h = sigm(lo + 0.125), pl = bandPoly(LDAB, w[0], w[1], c, lo, hi);
      if (pl.length > 2) P.path(pl, { close: true, color: 'none', w: 0, fill: h > 0.5 ? 'teal' : 'brown', fo: 0.3 * sh * Math.abs(2 * h - 1) });
    }
    P.axes({ step: 1, xt: [1, 2, 3, 4, 5], yt: [1, 2, 3], names: ['$x_1$', '$x_2$'] });
    P.ellipse(S0, { at: MU0, color: 'brown', w: 2, so: 0.6, opacity: p.el ?? 0 });
    P.ellipse(S1, { at: MU1, color: 'teal', w: 2, so: 0.6, opacity: p.el ?? 0 });
    P.cloud(LDAZ.slice(0, LDA_PER_CLASS).map(([u, v]) => gaussianPoint(MU0, S0, u, v)), { r: 2.8, color: 'brown', fo: 0.55 });
    P.cloud(LDAZ.slice(LDA_PER_CLASS).map(([u, v]) => gaussianPoint(MU1, S1, u, v)), { r: 2.8, color: 'teal', fo: 0.55 });
    if (sh) for (const [h, level] of [[0.25, -Math.log(3)], [0.75, Math.log(3)]]) {
      const pts = [LDAB.ylo, LDAB.yhi].map(y => [(level - c - w[1] * y) / w[0], y]);
      P.line(pts[0], pts[1], { color: 'pred', w: 2.5, dash: '8 6', opacity: sh });
      P.label('lv' + h, `$${h}$`, pts[0], 't', { dy: 4, color: 'pred', opacity: sh });   // at the line's bottom end
    }
    const logRatio = (x, y) => {
      const d1 = [x - MU1[0], y - MU1[1]], d0 = [x - MU0[0], y - MU0[1]];
      return -0.5 * Math.log(I1.det / I0.det) - 0.5 * quadSym2(I1.m, d1) + 0.5 * quadSym2(I0.m, d0);
    };
    const x1At = y => {
      if (s === 0) return -(w[1] * y + c) / w[0];
      const roots = [], count = 280, step = (LDAB.xhi - LDAB.xlo) / count;
      let xa = LDAB.xlo, fa = logRatio(xa, y);
      for (let i = 1; i <= count; i++) {
        const xb = LDAB.xlo + i * step, fb = logRatio(xb, y);
        if (fa * fb <= 0) roots.push(xa - fa * (xb - xa) / (fb - fa));
        xa = xb; fa = fb;
      }
      return roots.length ? roots.reduce((best, x) => Math.abs(x - mid[0]) < Math.abs(best - mid[0]) ? x : best) : NaN;
    };
    let d = '', pen = false;
    for (let i = 0; i <= 200; i++) {
      const y = P.ylo + (P.yhi - P.ylo) * i / 200, x = x1At(y);
      if (!Number.isFinite(x) || x < P.xlo || x > P.xhi) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + P.X(x).toFixed(1) + ',' + P.Y(y).toFixed(1); pen = true;
    }
    stroke(P, d, { color: 'ink', w: 3.5, opacity: p.bd ?? 0 });
    if (sh) P.label('lv5', '$0.5$', [x1At(-0.72), -0.72], 'l', { dx: 10, opacity: sh });
    if (p.bv) {
      const norm = Math.hypot(...w), tip = [mid[0] + 1.1 * w[0] / norm, mid[1] + 1.1 * w[1] / norm];
      P.arrow(mid, tip, { color: 'prior', w: 3, opacity: p.bv });
      P.label('normal', '$\\bbeta$', tip, 'bl', { dx: 9, dy: -6, color: 'prior', opacity: p.bv });
    }
    P.line(MU0, MU1, { color: '#666', w: 2, dash: '6 5', opacity: (p.bd ?? 0) * (1 - s) * (1 - sh) });
    P.dot(mid, { r: 5.5, color: 'ink', opacity: (p.bd ?? 0) * (1 - s) * (1 - sh) });
    P.dot(MU0, { r: 7, color: 'brown' });
    P.dot(MU1, { r: 7, color: 'teal' });
    P.label('m0', '$\\bmu_0$', MU0, 'tr', { dx: -9, dy: 7, color: 'brown' });
    P.label('m1', '$\\bmu_1$', MU1, 'bl', { dx: 8, dy: -6, color: 'teal' });
    P.label('quad', 'curved boundary', [1.62, 3.75], 'l', { dx: 10, opacity: (p.bd ?? 0) * s });
    P.label('c0', '$y=0$', [-0.95, -0.9], 'bl', { color: 'brown' });
    P.label('c1', '$y=1$', [5.9, 3.7], 'r', { color: 'teal' });
  }
};

// The same LDA posterior with live class prior, shared spread, and draggable means.
FIGS.ldaExplore = {
  duration: 150, size: [500, 370],
  draw(g, p) {
    const P = g.plot(LDAB), pi = p.pi ?? 0.5, sd = p.sd ?? 1, rho = p.rho ?? LDA_RHO;
    const mu0 = [p.m0x ?? MU0[0], p.m0y ?? MU0[1]], mu1 = [p.m1x ?? MU1[0], p.m1y ?? MU1[1]];
    const variance = sd * sd, S = [[variance, rho * variance], [rho * variance, variance]];
    const d = [mu1[0] - mu0[0], mu1[1] - mu0[1]], w = applySym2(invSym2(S).m, d);
    const c = Math.log(pi / (1 - pi)) - 0.5 * (w[0] * (mu1[0] + mu0[0]) + w[1] * (mu1[1] + mu0[1]));
    for (let i = -100; i < 100; i++) {
      const lo = i * 0.5, hi = lo + 0.5, h = sigm(lo + 0.25);
      const poly = bandPoly(LDAB, w[0], w[1], c, lo, hi);
      if (poly.length > 2) P.path(poly, { close: true, color: 'none', w: 0,
        fill: h > 0.5 ? 'teal' : 'brown', fo: 0.3 * Math.abs(2 * h - 1) });
    }
    P.axes({ step: 1, xt: [1, 2, 3, 4, 5], yt: [1, 2, 3], names: ['$x_1$', '$x_2$'] });
    for (const [j, mu] of [mu0, mu1].entries()) {
      P.ellipse(S, { at: mu, color: j ? 'teal' : 'brown', w: 2, so: 0.6 });
      P.cloud(LDAZ.slice(j * LDA_PER_CLASS, (j + 1) * LDA_PER_CLASS)
        .map(([u, v]) => gaussianPoint(mu, S, u, v)),
        { r: 2.8, color: j ? 'teal' : 'brown', fo: 0.5 });
    }
    const level = value => {
      const pts = [], t = value - c;
      if (Math.abs(w[0]) > 1e-8) for (const y of [LDAB.ylo, LDAB.yhi]) {
        const x = (t - w[1] * y) / w[0]; if (x >= LDAB.xlo && x <= LDAB.xhi) pts.push([x, y]);
      }
      if (Math.abs(w[1]) > 1e-8) for (const x of [LDAB.xlo, LDAB.xhi]) {
        const y = (t - w[0] * x) / w[1]; if (y >= LDAB.ylo && y <= LDAB.yhi) pts.push([x, y]);
      }
      return pts;
    };
    const boundary = level(0);
    for (const [h, value] of [[0.25, -Math.log(3)], [0.5, 0], [0.75, Math.log(3)]]) {
      const pts = h === 0.5 ? boundary : level(value);
      if (pts.length < 2) continue;
      P.line(pts[0], pts[1], { color: h === 0.5 ? 'ink' : 'pred', w: h === 0.5 ? 3.5 : 2.5,
        dash: h === 0.5 ? undefined : '8 6' });
      P.label('lv' + h, `$${h}$`, h === 0.5 ? pts[0] : pts[1], h === 0.5 ? 't' : 'b',
        { dy: h === 0.5 ? 4 : -3, color: h === 0.5 ? 'ink' : 'pred' });
    }
    if (p.bv) {
      const norm = Math.hypot(...w);
      if (norm > 0.1 && boundary.length >= 2) {
        // The arrow starts on the visible decision boundary and follows it as
        // the prior, means, or shared spread change.
        // Place it below the center in the default view, away from the
        // class-one mean marker that otherwise covers the arrowhead.
        const base = boundary[0].map((coordinate, axis) =>
          0.68 * coordinate + 0.32 * boundary[1][axis]);
        const unit = w.map(component => component / norm);
        const room = unit.map((component, axis) => component > 0
          ? ((axis ? LDAB.yhi : LDAB.xhi) - base[axis]) / component
          : component < 0 ? ((axis ? LDAB.ylo : LDAB.xlo) - base[axis]) / component
            : Infinity);
        const length = Math.min(1.5, 0.45 * norm, 0.8 * Math.min(...room));
        if (length > 0.1) {
          const tip = base.map((coordinate, axis) => coordinate + length * unit[axis]);
          P.arrow(base, tip, { color: 'prior', w: 3 });
          P.label('normal', '$\\bbeta$', tip, 'bl', { dx: 9, dy: -6, color: 'prior' });
        }
      }
    }
    for (const [j, mu] of [mu0, mu1].entries()) {
      P.dot(mu, { r: 12, color: j ? 'teal' : 'brown', cls: 'mean-handle', 'data-mean': j,
        'stroke-width': 3, 'cursor': 'grab' });
      P.label('m' + j, `$\\bmu_${j}$`, mu, j ? 'bl' : 'tr',
        { dx: j ? 8 : -9, dy: j ? -6 : 7, color: j ? 'teal' : 'brown' });
    }
    drawWeightedSlice(g.root, pi, sd, rho, mu0, mu1);
  }
};

// Full-covariance LDA and shared-variance Gaussian naive Bayes fitted to the
// same correlated two-class sample. The latter uses diag(S), where S is LDA's
// pooled within-class MLE covariance; both models therefore have linear rules.
const NB_N = 170, NB_MU = [[1.5, 2], [4.5, 3]], NB_S = [[1.5, 1.1], [1.1, 1.5]];
const NB_Z = normals(20261016, 2 * NB_N);
const NB_DATA = [0, 1].map(j => NB_Z.slice(j * NB_N, (j + 1) * NB_N).map(([u, v]) => [
  NB_MU[j][0] + Math.sqrt(1.5) * u,
  NB_MU[j][1] + 1.1 / Math.sqrt(1.5) * u + Math.sqrt(1.5 - 1.1 ** 2 / 1.5) * v
]));
const NB_FIT = (() => {
  const means = NB_DATA.map(pts => pts.reduce((a, q) => [a[0] + q[0] / NB_N, a[1] + q[1] / NB_N], [0, 0]));
  let s11 = 0, s12 = 0, s22 = 0;
  NB_DATA.forEach((pts, j) => pts.forEach(q => {
    const u = q[0] - means[j][0], v = q[1] - means[j][1];
    s11 += u * u; s12 += u * v; s22 += v * v;
  }));
  s11 /= 2 * NB_N; s12 /= 2 * NB_N; s22 /= 2 * NB_N;
  const d = [means[1][0] - means[0][0], means[1][1] - means[0][1]], det = s11 * s22 - s12 * s12;
  return {
    mid: [(means[0][0] + means[1][0]) / 2, (means[0][1] + means[1][1]) / 2],
    lda: [(s22 * d[0] - s12 * d[1]) / det, (s11 * d[1] - s12 * d[0]) / det],
    nb: [d[0] / s11, d[1] / s22]
  };
})();
const NBB = box2d(48, 24, 455, 325, -1, 8, -1, 7);
FIGS.nbcomp = {
  duration: 900, size: [530, 390],
  draw(g) {
    const P = g.plot(NBB);
    P.axes({ step: 1, xt: [0, 2, 4, 6, 8], yt: [0, 2, 4, 6], names: ['$x_1$', '$x_2$'] });
    NB_DATA.forEach((pts, j) => {
      P.ellipse(NB_S, { at: NB_MU[j], color: j ? 'teal' : 'brown', w: 2, so: 0.55 });
      P.cloud(pts, { r: 2.7, color: j ? 'teal' : 'brown', fo: 0.5 });
    });
    for (const [w, color, dash] of [[NB_FIT.lda, 'pred', undefined], [NB_FIT.nb, 'postC', '9 6']]) {
      const f = x => NB_FIT.mid[1] - w[0] / w[1] * (x - NB_FIT.mid[0]);
      stroke(P, fpath(P, f, NBB.xlo, NBB.xhi, 500), { color, w: 4, dash });
    }
    P.label('lda', 'Full LDA', [7.8, 6.5], 'r', { color: 'pred' });
    P.label('nb', 'Naive Bayes', [7.8, 5.9], 'r', { color: 'postC' });
  }
};

// ---------------------------------------------------------------- slide 19: the sigmoid function
// Properties shown one per step: p1 its range (0, 1), p2 sigma(0) = 1/2, p3 the symmetry at
// u = 2 and -2, p4 the tails beyond 4.
const SFB = box2d(56, 40, 470, 280, -6, 6, -0.05, 1.05);
FIGS.sigfun = {
  duration: 900, size: [570, 380],
  draw(g, p) {
    const P = g.plot(SFB), p1 = p.p1 ?? 0, p2 = p.p2 ?? 0, p3 = p.p3 ?? 0, p4 = p.p4 ?? 0;
    P.rect([-6, -0.05], [-4, 1.05], { color: 'mle', fo: 0.1 * p4 });
    P.rect([4, -0.05], [6, 1.05], { color: 'mle', fo: 0.1 * p4 });
    P.axes({ grid: false, ox: 0, oy: -0.05, xt: [-6, -4, -2, 2, 4, 6], yt: [], names: ['$u$', '$\\sigma(u)$'] });
    for (const v of [0, 0.5, 1]) P.text([0, v], String(v), { anchor: 'end', dx: -7, dy: 5 });
    P.line([-6, 0], [6, 0], { color: 'pred', w: 1.5, dash: '5 4', opacity: 0.25 + 0.75 * p1 });
    P.line([-6, 1], [6, 1], { color: 'pred', w: 1.5, dash: '5 4', opacity: 0.25 + 0.75 * p1 });
    stroke(P, fpath(P, sigm, -6, 6), { color: 'pred' });
    P.dot([0, 0.5], { r: 6.5, color: 'pred', opacity: p2 });
    P.label('s0', '$\\sigma(0)=\\frac12$', [0, 0.5], 'tl', { dx: 10, dy: 4, color: 'pred', opacity: p2 });
    for (const u of [2, -2]) {
      P.line([u, 0], [u, sigm(u)], { color: 'pred', w: 1.5, dash: '4 4', opacity: p3 });
      P.dot([u, sigm(u)], { r: 6, color: 'pred', opacity: p3 });
      P.label('sy' + u, f3(sigm(u)), [u, sigm(u)], u > 0 ? 'br' : 'bl', { dx: u > 0 ? -8 : 8, dy: -6, color: 'pred', opacity: p3 });
    }
    P.label('t0', 'near 0', [-5, 0.08], 'b', { color: 'mle', opacity: p4 });
    P.label('t1', 'near 1', [5, 0.92], 't', { color: 'mle', opacity: p4 });
  }
};

// Slide 23: h(x) = sigma(beta x + gamma) for one generic input; b and g are beta and gamma,
// gh draws the curve for (gb, gg) dashed.
const SAB = box2d(56, 56, 470, 280, -6, 6, 0, 1);
FIGS.sigab = {
  duration: 1100, size: [570, 400],
  draw(g, p) {
    const P = g.plot(SAB), h = (b, c) => x => sigm(b * x + c);
    P.axes({ grid: false, ox: -6, oy: 0, xt: [-6, -4, -2, 0, 2, 4, 6], yt: [0.5, 1], names: ['$x$', '$p_{\\btheta}(y=1\\mid x)$'] });
    P.line([-6, 0.5], [6, 0.5], { color: '#bbb', w: 1, dash: '4 5' });
    P.line([-6, 1], [6, 1], { color: '#bbb', w: 1, dash: '4 5' });
    if (p.gh) stroke(P, fpath(P, h(p.gb, p.gg), -6, 6), { color: 'pred', w: 2.5, dash: '7 6', opacity: 0.45 * p.gh });
    stroke(P, fpath(P, h(p.b, p.g), -6, 6), { color: 'pred' });
    const m = -p.g / p.b, on = m > -6 && m < 6 ? 1 : 0, right = m < 2;
    P.line([m, 0], [m, 0.5], { color: 'pred', w: 1.5, dash: '5 4', opacity: on });
    P.dot([m, 0.5], { r: 6, color: 'pred', opacity: on });
    P.label('mid', `midpoint $-\\cgamma/\\cbeta=${fmt(m, 2)}$`, [m, 0.5], right ? 'l' : 'r', { dx: right ? 12 : -12, dy: 16, color: 'pred', opacity: on });
    P.label('par', `$\\cbeta=${fmt(p.b, 2)},\\ \\cgamma=${fmt(p.g, 2)}$`, [0, 1], 'b', { dy: -30, color: 'pred' });
  }
};

// ---------------------------------------------------------------- slide 21: odds and log-odds
const LOB = box2d(70, 30, 430, 300, 0, 1, -3.4, 3.4);
const LOP = [0.1, 0.25, 0.5, 0.75, 0.9], LOL = ['-2\\ln 3', '-\\ln 3', '0', '\\ln 3', '2\\ln 3'];
FIGS.logodds = {
  duration: 900, size: [560, 380],
  draw(g, p) {
    const P = g.plot(LOB), pts = p.pts ?? 0;
    P.axes({ grid: false, ox: 0, oy: 0, xt: [], yt: [], names: ['$p$', '$\\ln\\frac{p}{1-p}$'] });
    for (const v of [0.5, 1]) P.text([v, 0], String(v), { dy: 20 });
    P.line([1, -3.4], [1, 3.4], { color: '#bbb', w: 1, dash: '4 5' });
    stroke(P, fpath(P, q => Math.log(q / (1 - q)), 0.02, 0.98, 300), { color: 'pred' });
    LOP.forEach((q, i) => {
      const y = Math.log(q / (1 - q));
      P.dot([q, y], { r: 6, color: 'pred', opacity: pts });
      P.label('lo' + i, `$${LOL[i]}$`, [q, y], 'r', { dx: -10, dy: q === 0.5 ? -12 : 0, color: 'pred', opacity: pts });
    });
  }
};

// ---------------------------------------------------------------- slide 41: three regions in the plane
// Logits (x1, x2, 0): class 1 where x1 is the largest, class 2 where x2 is, class 3 where both
// are negative.  bd: the boundaries; pt: the point (ln 3, ln 2) and its probabilities.
const RB = box2d(50, 30, 420, 420, -2.5, 2.5, -2.5, 2.5);
const RCOL = ['teal', 'brown', 'postC'];
FIGS.soft2d = {
  duration: 900, size: [520, 490],
  draw(g, p) {
    const P = g.plot(RB), bd = p.bd ?? 0, pt = p.pt ?? 0;
    P.path([[0, 0], [2.5, 2.5], [2.5, -2.5], [0, -2.5]], { close: true, color: 'none', w: 0, fill: RCOL[0], fo: 0.22 });
    P.path([[0, 0], [2.5, 2.5], [-2.5, 2.5], [-2.5, 0]], { close: true, color: 'none', w: 0, fill: RCOL[1], fo: 0.22 });
    P.path([[0, 0], [-2.5, 0], [-2.5, -2.5], [0, -2.5]], { close: true, color: 'none', w: 0, fill: RCOL[2], fo: 0.22 });
    P.axes({ step: 1, xt: [-2, -1, 1, 2], yt: [-2, -1, 1, 2] });
    P.label('k1', 'class 1', [1.7, -1.6], 'c', { color: RCOL[0] });
    P.label('k2', 'class 2', [-0.9, 1.7], 'c', { color: RCOL[1] });
    P.label('k3', 'class 3', [-1.4, -1.4], 'c', { color: RCOL[2] });
    P.line([0, 0], [2.5, 2.5], { color: 'ink', w: 3.5, opacity: bd });
    P.line([0, 0], [0, -2.5], { color: 'ink', w: 3.5, opacity: bd });
    P.line([0, 0], [-2.5, 0], { color: 'ink', w: 3.5, opacity: bd });
    P.label('b12', '$x_1=x_2$', [1.9, 1.9], 'br', { dx: -6, dy: -2, opacity: bd });
    P.label('b13', '$x_1=0$', [0, -2.0], 'l', { dx: 8, opacity: bd });
    P.label('b23', '$x_2=0$', [-2.0, 0], 'b', { dy: -6, opacity: bd });
    const x = [LN3, LN2], q = softmax([LN3, LN2, 0]);
    P.dot(x, { r: 7, color: 'pred', opacity: pt });
    P.label('pt', '$(\\ln 3,\\ln 2)$', x, 'l', { dx: 10, color: 'pred', opacity: pt });
    P.label('pq', '$p=(\\tfrac12,\\tfrac13,\\tfrac16)$', [1.0, -0.3], 'tl', { color: 'pred', opacity: pt });
  }
};

// ---------------------------------------------------------------- slides 6 to 9: the logistic function
// b and g are beta/(ln 3/10) and gamma/ln 3, so the rain model is b=1, g=-7.
const SB = box2d(62, 56, 470, 290, 4, 10, 0, 1);
const hAt = (b, g) => x => sigm(LN3 * (b * x + g));
FIGS.sig = {
  duration: 1100, size: [580, 420],
  draw(g, p) {
    const P = g.plot(SB);
    percentAxes(P, { grid: false, ox: 4, oy: 0, xt: [4, 5, 6, 7, 8, 9, 10], yt: [0.5, 1], names: ['', '$p_{\\btheta}(y=1\\mid x)$'] });
    P.line([4, 0.5], [10, 0.5], { color: '#bbb', w: 1, dash: '4 5' });
    P.line([4, 1], [10, 1], { color: '#bbb', w: 1, dash: '4 5' });
    P.label('hum', HUM, [7, 0], 't', { dy: 30, color: '#444' });
    if (p.gh) stroke(P, fpath(P, hAt(p.gb, p.gg), 4, 10), { color: 'pred', w: 2.5, dash: '7 6', opacity: 0.45 });
    if (p.two != null) stroke(P, fpath(P, hAt(2, -14), 4, 10), { color: 'pred', opacity: p.two });
    stroke(P, fpath(P, hAt(p.b, p.g), 4, 10), p.two > 0.5 ? { color: 'pred', w: 2.5, dash: '7 6' } : { color: 'pred' });
    const h = hAt(p.b, p.g), m = -p.g / p.b;
    if (p.mid) {
      const on = m > 4 && m < 10 ? p.mid : 0;
      P.line([m, 0], [m, 0.5], { color: 'pred', w: 1.5, dash: '5 4', opacity: on });
      P.dot([m, 0.5], { r: 6, color: 'pred', opacity: on });
      P.label('mid', `midpoint $-\\cgamma/\\cbeta=${fmt(10 * m, 2)}$`, [m, 0.5], 'l', { dx: 12, dy: 16, color: 'pred', opacity: on });
      P.label('par', `$\\cbeta=${lnK(p.b, '\\frac{\\ln 3}{10}')},\\ \\cgamma=${lnK(p.g)}$`, [7, 1], 'b', { dy: -34, color: 'pred', opacity: p.mid });
    }
    if (p.pts) {
      DX.forEach(x => P.dot([x, h(x)], { r: 6.5, color: 'pred', opacity: p.pts }));
      for (let x = 5; x < 9; x++) {   // the odds triple between neighbours: a "x 3" off the curve, on its upper-left side
        const xm = x + 0.5, y = h(xm), sl = (h(xm + 0.01) - h(xm - 0.01)) / 0.02;
        const nx = -sl * (P.X(1) - P.X(0)), ny = -(P.Y(0) - P.Y(1)), n = Math.hypot(nx, ny);
        P.label('x3' + x, '$\\times 3$', [xm, y], 'c', { dx: 26 * nx / n, dy: 26 * ny / n, color: 'pred', opacity: p.x3 ?? 0 });
      }
    }
    if (p.two != null) {
      P.dot([6.5, 0.25], { r: 6.5, color: 'pred', opacity: p.pb ?? 0 });
      P.label('p25', '$0.25$', [6.5, 0.25], 'tl', { dx: 10, dy: 2, color: 'pred', opacity: p.pb ?? 0 });
      P.dot([8, 0.9], { r: 6.5, color: 'pred', opacity: p.pc ?? 0 });
      P.label('two', '$\\cbeta=\\frac{2\\ln 3}{10}$', [7.5, 0.9], 'r', { dx: -10, color: 'pred', opacity: p.two });
      P.label('one', 'dashed: $\\cbeta=\\frac{\\ln 3}{10}$', [8.3, h(8.3)], 'tl', { dx: 6, dy: 8, color: 'pred', opacity: p.two });
      P.label('p9', '$0.9$', [8, 0.9], 'b', { dy: -10, color: 'pred', opacity: p.pc ?? 0 });
    }
  }
};

// ---------------------------------------------------------------- slide 11: the 32 days and h
// b, g use the scaled plotting coordinate. At displayed x = 90, the bar splits
// [0, 1] at h: the probability a rainy
// day receives (below h) and the probability the dry day receives (above h).
const D11 = box2d(56, 70, 400, 290, 4.3, 9.95, -0.2, 1.25);
// B and G are beta and gamma themselves; the slide's .v-ll shows the negative log-likelihood of the 32 days.
// er: each day's contribution to minus the log-likelihood, as a bar on its dot.
FIGS.days = {
  duration: 1200, size: [550, 430],
  draw(g, p) {
    if (p.B != null) p = Object.assign({}, p, { b: p.B * 10 / LN3, g: p.G / LN3 });
    const P = g.plot(D11), h = hAt(p.b, p.g);
    humAxes(P);
    P.label('hx', HUM, [7, -0.2], 't', { dy: 26, color: '#444' });
    P.label('hy', '$p_{\\btheta}(y=1\\mid x)$', [4.3, 1.25], 'l', { dx: 8, dy: -10, color: '#444' });
    stroke(P, fpath(P, h, 4.3, 9.3), { color: 'pred' });
    // one row of dots per humidity and label, so that each day can carry its own bar;
    // er: each day's -ln q (q the probability given to its label), 20 px per nat up to 14 nats,
    // hanging from the dot toward the curve
    const r = 4, sp = 9.5;
    DX.forEach((x, k) => {
      for (const [cnt, y, col] of [[DR[k], 1, 'teal'], [DN[k] - DR[k], 0, 'brown']]) {
        const q = y ? h(x) : 1 - h(x), len = Math.min(280, -20 * Math.log(q)), dir = y ? 1 : -1;
        for (let i = 0; i < cnt; i++) {
          const cx = P.X(x) + (i - (cnt - 1) / 2) * sp, cy = P.Y(y);
          if (p.er) P.g.line([cx, cy + dir * r], [cx, cy + dir * (r + len)], { color: 'rose', w: 5, opacity: p.er });
          P.g.el('circle', { cx, cy, r, fill: C[col], 'fill-opacity': 0.9, stroke: '#fff', 'stroke-width': 1 });
        }
      }
    });
    const sec = g.root.closest('section'), out = sec && sec.querySelector('.v-ll');
    if (out) out.textContent = fmt(loss32(LN3 * p.b, LN3 * p.g), 2);
  }
};

// ---------------------------------------------------------------- slide 12: the cost of a day
const NB = box2d(66, 28, 450, 300, 0, 1.05, 0, 4.8);
FIGS.nll = {
  duration: 900, size: [580, 400],
  draw(g, p) {
    const P = g.plot(NB);
    P.axes({ grid: false, xt: [0.5, 1], yt: [1, 2, 3, 4], names: ['$q$', '$\\ln(1/q)$'] });
    stroke(P, fpath(P, q => -Math.log(q), 0.005, 1, 300), { color: 'rose' });
    // at the closing state the two extreme points also name the day they price; the
    // q = 0.9 label then has two lines and sits on a short leader above its point
    const ex = p.ex > 0.5;
    for (const [q, k, anc, dx, dy, day] of [[0.9, 'a', 'b', 0, -12, 'a rainy day at 90%'], [0.5, 'b', 'tr', -8, 8, ''], [0.1, 'c', 'l', 14, 0, 'a dry day at 90%']]) {
      const y = -Math.log(q), up = ex && k === 'a' ? 34 : 0, op = p.ex;
      P.line([q, 0], [q, y], { color: 'rose', w: 1.2, dash: '4 4', opacity: 0.6 * op });
      if (up) g.line([P.X(q), P.Y(y) - 8], [P.X(q), P.Y(y) - up + 2], { color: 'rose', w: 1.2 });
      P.dot([q, y], { r: 6.5, color: 'rose', opacity: op });
      const s = `$q=${q}$: ${f3(y)}` + (day ? (k === 'a' ? '<br>' : ', ') + day : '');
      P.label('v' + k, s, [q, y], anc, { dx, dy: dy - up, color: 'rose', opacity: op });
    }
  }
};

// ---------------------------------------------------------------- slide 14: gradient descent on the 32 days
// lt = log10 t; its left end, -0.5, is t = 0.  Left: the days and h at the t-th iterate,
// the earlier print states lighter.  Right: the loss per day against t on a log axis.
const tOf = lt => lt <= -0.5 + 1e-9 ? 0 : Math.min(10000, Math.round(10 ** lt));
const GL = box2d(62, 34, 440, 200, 4.3, 9.95, -0.2, 1.25), GR = box2d(690, 34, 430, 200, -0.6, 4.25, 0.38, 0.72);
const LT = lt => lt <= -0.5 + 1e-9 ? -0.5 : lt;
FIGS.gd = {
  duration: 1600, size: [1200, 292],
  draw(g, p) {
    const t = tOf(p.lt), b = GD.B[t], gm = GD.G[t];
    // left panel
    const P = g.plot(GL);
    humAxes(P);
    P.label('lx', HUM, [7, -0.2], 't', { dy: 26, color: '#444' });
    P.label('ly', '$p_{\\btheta^{(t)}}(y=1\\mid x)$', [4.3, 1.25], 'l', { dx: 8, dy: -10, color: '#444' });
    dayDots(P, DX, DN, DR, 5);
    for (const tg of [0, 100, 1000]) if (tg < t)
      stroke(P, fpath(P, x => sigm(GD.B[tg] * x + GD.G[tg]), 4.3, 9.95), { color: 'pred', w: 2.2, opacity: 0.3 });
    stroke(P, fpath(P, x => sigm(b * x + gm), 4.3, 9.95), { color: 'pred' });
    P.label('lr', t ? `$t=${thou(t)}$: $\\cbeta=${f3(b / 10)}$, $\\cgamma=${f2(gm)}$` : '$t=0$: probability $1/2$ everywhere', [4.3, 1.25], 'bl', { dx: 8, dy: -40, color: 'pred' });
    // right panel
    const Q = g.plot(GR);
    Q.axes({ grid: false, ox: -0.6, oy: 0.38, xt: [], yt: [0.5, 0.6, 0.7], names: ['', ''] });
    [[-0.5, '0'], [0, '1'], [1, '10'], [2, '100'], [3, '1,000'], [4, '10,000']].forEach(([v, s]) => Q.text([v, 0.38], s, { dy: 20 }));
    Q.line([-0.3, 0.372], [-0.24, 0.388], { color: C.axis, w: 1.5 });
    Q.line([-0.22, 0.372], [-0.16, 0.388], { color: C.axis, w: 1.5 });
    Q.label('rx', 'step $t$ (log scale)', [1.8, 0.38], 't', { dy: 28, color: '#444' });
    Q.label('ry', 'loss per day', [-0.6, 0.72], 'br', { dx: -10, dy: 0, color: '#444' });
    Q.line([-0.6, LMIN], [4.25, LMIN], { color: 'mle', w: 2, dash: true, opacity: p.fl ?? 0 });
    Q.label('fl', `${f3(LMIN)}: the ML estimate of slide 26`, [-0.45, LMIN], 'tl', { dy: 4, color: 'mle', opacity: p.fl ?? 0 });
    const pts = [[-0.5, GD.L[0]]];
    if (t >= 1) {
      const lc = Math.log10(t);
      for (let i = 0; i <= 240; i++) { const l = lc * i / 240, k = Math.round(10 ** l); pts.push([l, GD.L[k]]); }
    }
    stroke(Q, pathOf(pts.map(q => Q.px(q))), { color: 'rose', w: 3 });
    const at = [LT(t ? Math.log10(t) : -0.5), GD.L[t]];
    Q.dot(at, { r: 6.5, color: 'rose' });
    Q.label('lv', f3(GD.L[t]), at, 'bl', { dx: 8, dy: -8, color: 'rose' });
    const sec = g.root.closest('section'), out = sec && sec.querySelector('.v-t');
    if (out && out.textContent !== thou(t)) out.textContent = thou(t);
  }
};

// ---------------------------------------------------------------- slides 15 to 17 and 20: the four days
// b: beta of the current curve (gamma = 0).  lt = log10 of the number of gradient-descent
// steps (rho = 1/3), when given, sets b instead, and earlier print states show lighter.
const FB = box2d(56, 30, 450, 270, -2.8, 2.8, -0.12, 1.12);
function fourAxes(P) {
  percentAxes(P, { grid: false, ox: -2.8, oy: -0.12, xt: [-2, -1, 0, 1, 2], yt: [], names: ['', ''] });
  for (const v of [0, 0.5, 1]) {
    P.line([-2.8, v], [2.8, v], { color: '#bbb', w: 1, dash: '4 5' });
    P.text([-2.8, v], String(v), { anchor: 'end', dx: -7, dy: 5 });
  }
  P.label('fx', '$u=x-70$ (percentage points)', [0, -0.12], 't', { dy: 26, color: '#444' });
  P.label('fy', '$p_{\\btheta}(y=1\\mid u)$', [-2.8, 1.12], 'l', { dx: 8, dy: -8, color: '#444' });
}
const fourDots = P => FU.forEach((u, i) => P.dot([u, FY[i]], { r: 8, color: FY[i] ? 'teal' : 'brown' }));
FIGS.four = {
  duration: 1300, size: [560, 360],
  draw(g, p) {
    const P = g.plot(FB);
    fourAxes(P);
    if (p.sep) {
      P.line([0, -0.12], [0, 1.12], { color: 'ink', w: 2, dash: '7 5', opacity: p.sep });
      P.label('sep', 'separated at $u=0$', [0, 0.16], 'l', { dx: 8, opacity: p.sep });
    }
    let b = p.b ?? 0, t = null;
    if (p.lt != null) { t = Math.round(10 ** p.lt); b = GD4[Math.min(10000, t)]; }
    if (p.lt != null) for (const tg of [1, 10, 100]) if (tg < t - 1e-9)
      stroke(P, fpath(P, u => sigm(GD4[tg] * u), -2.8, 2.8), { color: 'pred', w: 2.2, opacity: 0.3 });
    stroke(P, fpath(P, u => sigm(b * u), -2.8, 2.8), { color: 'pred', opacity: p.on ?? 1 });
    if (p.err) FU.forEach((u, i) => {
      const h = sigm(b * u);
      P.line([u, h], [u, FY[i]], { color: 'ink', w: 2, dash: '4 3', opacity: p.err });
    });
    fourDots(P);
    if (p.cl) P.label('cl', '$\\btheta^{(1)}$: $\\sigma(0.1u)$', [1.25, sigm(b * 1.25)], 'tl', { dx: 10, dy: 8, color: 'pred', opacity: p.on ?? 1 });
    if (p.lt != null) P.label('st', t === 0 ? '$t=0$: probability $1/2$ everywhere' : `after $t=${thou(t)}$ ${t === 1 ? 'step' : 'steps'}: $\\cbeta=${f3(b / 10)}$`, [-2.8, 1.12], 'bl', { dx: 150, dy: -8, color: 'pred' });
  }
};
// slide 24: the L2-regularized fit; ll = log10 lambda
FIGS.fourl2 = {
  duration: 1100, size: [560, 360],
  draw(g, p) {
    const P = g.plot(FB), lam = lamOf(p.ll), b = l2fit(lam);
    fourAxes(P);
    stroke(P, fpath(P, u => sigm(b * u), -2.8, 2.8), { color: 'pred' });
    fourDots(P);
    for (const u of [1, 2]) P.dot([u, sigm(b * u)], { r: 6, color: 'pred', opacity: p.hv ?? 0 });
    P.label('h1', f3(sigm(b)), [1, sigm(b)], 'tl', { dx: 8, dy: 6, color: 'pred', opacity: p.hv ?? 0 });
    P.label('h2', f3(sigm(2 * b)), [2, sigm(2 * b)], 'tl', { dx: 8, dy: 6, color: 'pred', opacity: p.hv ?? 0 });
    P.label('rd', `$\\clambda=${fmt(100 * lam, 2)}$: $\\hat\\cbeta_{\\clambda}=${f3(b / 10)}$`, [-2.8, 1.12], 'bl', { dx: 150, dy: -8, color: 'ink' });
    const sec = g.root.closest('section'), out = sec && sec.querySelector('.v-lam');
    const shownLam = fmt(100 * lam, 2);
    if (out && out.textContent !== shownLam) out.textContent = shownLam;
  }
};

// ---------------------------------------------------------------- slide 19: the decision boundary in 2-D
// beta = ln 3 (0.6, 0.8), gamma = -2 ln 3, scaled by c; lc = log2 c.  The signed distance
// from the boundary is d = 0.6 x1 + 0.8 x2 - 2 (a unit normal), and h = sigma(c ln3 d).
const BB = box2d(46, 30, 432, 360, -1, 5, -1, 4), NRM = [0.6, 0.8];
const BPTS = (() => { const r = mulberry32(61015), out = [];
  for (let i = 0; i < 40; i++) { const x = [-1 + 6 * r(), -1 + 5 * r()], d = 0.6 * x[0] + 0.8 * x[1] - 2;
    out.push([x[0], x[1], r() < sigm(LN3 * d) ? 1 : 0]); }
  return out; })();
// the box's polygon cut to lo <= d <= hi
function strip(lo, hi) {
  let poly = [[-1, -1], [5, -1], [5, 4], [-1, 4]];
  const cut = (poly, f) => { const out = [];
    poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
      if (fa <= 0) out.push(a);
      if ((fa < 0) !== (fb < 0) && fa !== fb) { const u = fa / (fa - fb); out.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]); } });
    return out; };
  const dd = q => 0.6 * q[0] + 0.8 * q[1] - 2;
  poly = cut(poly, q => dd(q) - hi);
  return cut(poly, q => lo - dd(q));
}
// where the line d = d0 crosses the box: its two ends, the upper (or right) one last
function lineEnds(d0) {
  const pts = [];
  for (const x of [-1, 5]) { const y = (2 + d0 - 0.6 * x) / 0.8; if (y >= -1 - 1e-9 && y <= 4 + 1e-9) pts.push([x, y]); }
  for (const y of [-1, 4]) { const x = (2 + d0 - 0.8 * y) / 0.6; if (x > -1 + 1e-9 && x < 5 - 1e-9) pts.push([x, y]); }
  return pts.sort((a, b) => a[1] - b[1]);
}
FIGS.bnd = {
  duration: 1300, size: [500, 432],
  draw(g, p) {
    const P = g.plot(BB), c = +(2 ** p.lc).toPrecision(2), k = c * LN3, lv = p.lv ?? 1;
    for (let i = -40; i < 40; i++) {
      const lo = i * 0.12, hi = lo + 0.12, h = sigm(k * (lo + 0.06)), pl = strip(lo, hi);
      if (pl.length > 2) P.path(pl, { close: true, color: 'none', w: 0, fill: h > 0.5 ? 'teal' : 'brown', fo: 0.32 * Math.abs(2 * h - 1) });
    }
    P.axes({ step: 1, xt: [1, 2, 3, 4], yt: [1, 2, 3], names: ['', ''] });
    P.label('n1', '$x_1$', [5, 0], 'l', { dx: 20, color: '#444' });
    P.label('n2', '$x_2$', [0, 4], 'tl', { dx: 7, dy: 3, color: '#444' });
    BPTS.forEach(([x1, x2, y]) => P.dot([x1, x2], { r: 6, color: y ? 'teal' : 'brown' }));
    for (const [h, key] of [[0.1, 'a'], [0.25, 'b'], [0.75, 'c'], [0.9, 'd']]) {
      const d0 = Math.log(h / (1 - h)) / k, e = lineEnds(d0);
      if (e.length < 2) continue;
      P.line(e[0], e[1], { color: 'pred', w: 2.5, dash: '8 6', opacity: lv });
      const top = e[1], onTop = top[1] > 4 - 1e-6;
      P.label('h' + key, `$${h}$`, top, onTop ? 'b' : 'r', { dx: onTop ? 0 : -6, dy: onTop ? -4 : 0, color: 'pred', opacity: lv });
    }
    const e0 = lineEnds(0);
    P.line(e0[0], e0[1], { color: 'ink', w: 3.5 });
    P.label('h5', '$0.5$', e0[1], e0[1][1] > 4 - 1e-6 ? 'b' : 'r', e0[1][1] > 4 - 1e-6 ? { dy: -4 } : { dx: -6 });
    const x0 = [2.4, 0.7], tip = [x0[0] + k * NRM[0], x0[1] + k * NRM[1]];
    P.vec(x0, tip, { color: 'prior', w: 3.5 });
    P.dot(x0, { r: 5, color: 'prior' });
    P.label('beta', Math.abs(c - 1) < 1e-9 ? '$\\bbeta$' : `$${fmt(c, 2)}\\bbeta$`, tip, 'l', { dx: 8, dy: 6 });
    // cs: c has been introduced (the build that replaces theta by c theta); before it the
    // readout names no c and the slider stays hidden
    const cs = p.cs ?? 1;
    P.label('rd', (cs ? `$c=${fmt(c, 2)}$: the` : 'The') + ` $0.75$ level line is ${fmt(1 / c, 2)} unit from the boundary`, [2, -1], 't', { dy: 8, color: '#333', opacity: p.ro ?? 1 });
    const sec = g.root.closest('section'), out = sec && sec.querySelector('.v-c'), bar = out && out.closest('.knobs');
    if (bar) bar.style.visibility = cs ? 'visible' : 'hidden';
    if (out && out.textContent !== fmt(c, 2)) out.textContent = fmt(c, 2);
  }
};

// ---------------------------------------------------------------- slide 22: prior, likelihood, posterior over beta
const PB = box2d(50, 30, 470, 300, -2.5, 4.5, 0, 1.08);
const phiN = b => Math.exp(-b * b / 2) / Math.sqrt(2 * Math.PI);
const POSTZ = (() => { let z = 0; for (let b = -10; b <= 10; b += 0.001) z += Math.exp(-loss4(b)) * phiN(b) * 0.001; return z; })();
const post = b => Math.exp(-loss4(b)) * phiN(b) / POSTZ;
const BMAP = l2fit(0.5);
FIGS.post = {
  duration: 1100, size: [560, 390],
  draw(g, p) {
    const P = g.plot(PB);
    P.axes({ grid: false, ox: -2.5, xt: [], yt: [0.5, 1], names: ['$\\cbeta$', ''] });
    for (const b of [-2, -1, 0, 1, 2, 3, 4]) P.g.text([P.X(b), P.Y(0) + 20], (b / 10).toFixed(1));
    P.label('yl', 'densities $\\div 10$; likelihood probability', [-2.5, 1.08], 'l', { dx: 8, dy: -12, color: '#444' });
    P.density(phiN, { color: 'prior', from: -2.5, to: 4.5, fo: 0.12 });
    P.curve(b => Math.exp(-loss4(b)), { color: 'like', from: -2.5, to: 4.5 });
    P.dot([0, 1 / 16], { r: 5.5, color: 'like' });
    P.label('l16', '$1/16$', [0, 1 / 16], 'br', { dx: -8, dy: -2, color: 'like' });
    P.label('pr', 'prior $p(\\cbeta)$', [-1.25, phiN(-1.25)], 'r', { dx: -10, dy: -8, color: 'prior' });
    P.label('lk', 'likelihood $e^{-\\cL(\\cbeta,0)}$', [2.2, Math.exp(-loss4(2.2))], 'br', { dx: -8, dy: -10, color: 'like' });
    g.group({ opacity: p.po }, () => {
      P.density(post, { color: 'post', from: -2.5, to: 4.5, fo: 0.15 });
      P.line([BMAP, 0], [BMAP, post(BMAP)], { color: 'post', w: 2, dash: '5 4' });
      P.dot([BMAP, post(BMAP)], { r: 6, color: 'post' });
    });
    P.label('po', 'posterior $p(\\cbeta\\mid\\cD)$', [2.05, post(2.05)], 'l', { dx: 10, dy: -4, color: 'post', opacity: p.po });
    P.label('md', `mode $\\hat\\cbeta=${fmt(BMAP / 10, 4)}$`, [BMAP, post(BMAP)], 'br', { dx: -10, dy: -8, color: 'post', opacity: p.po });
  }
};

// ---------------------------------------------------------------- slides 24 to 27 and 31: softmax bars
// Logits on the left, probabilities on the right, one bar per class or token.
const LOGB = box2d(46, 40, 210, 250, 0.1, 3.6, -1.5, 4.5), PRB = box2d(372, 40, 190, 250, 0.4, 3.6, 0, 1);
const sm = t => `<span style="font-size:18px">${t}</span>`;
// a logit as the slides write it: ln 2, ln 3, plus a whole shift, or a whole number
function lnLab(z) {
  for (const [v, s] of [[LN3, '\\ln 3'], [LN2, '\\ln 2']])
    for (const c of [0, 2, 3]) if (Math.abs(z - v - c) < 1e-9) return sm('$' + s + (c ? '+' + c : '') + '$');
  if (Math.abs(z - Math.round(z)) < 1e-9) return sm('$' + Math.round(z) + '$');
  return sm('$' + fmt(z, 2) + '$');
}
function barPanel(g, B, names, hs, o) {
  const P = g.plot(B), xs = hs.map((_, i) => i + 1);
  g.group({ opacity: o.opacity ?? 1 }, () => {
    P.line([B.xlo, o.base], [B.xhi, o.base], { color: C.axis, w: 1.5 });
    P.line([B.xlo, B.ylo], [B.xlo, B.yhi], { color: C.axis, w: 1.5 });
    for (const v of o.yt) P.text([B.xlo, v], neg(v), { anchor: 'end', dx: -7, dy: 5 });
    if (o.ghost) P.bars(xs, o.ghost, { color: 'pred', width: 0.62, base: o.base, 'fill-opacity': 0, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.55 });
    P.bars(xs, hs.map(h => clamp(h, B.ylo, B.yhi)), { color: 'pred', width: 0.62, base: o.base, 'fill-opacity': o.fo ?? 0.55 });
  });
  names.forEach((n, i) => P.label(o.key + 'n' + i, n, [i + 1, B.ylo], 't', { dy: 8, color: '#333', opacity: o.opacity ?? 1 }));
  if (o.xtitle) P.label(o.key + 'x', o.xtitle, [(B.xlo + B.xhi) / 2, B.ylo], 't', { dy: 36, color: '#444', opacity: o.opacity ?? 1 });
  hs.forEach((h, i) => P.label(o.key + 'v' + i, o.lab(h), [i + 1, clamp(Math.max(h, o.base, o.ghost ? o.ghost[i] : -Infinity), B.ylo, B.yhi)], 'b', { dy: -5, color: 'pred', opacity: o.opacity ?? 1 }));
  P.label(o.key + 't', o.title, [B.xlo, B.yhi], 'bl', { dy: -8, color: '#333', opacity: o.opacity ?? 1 });
}
const CLS = ['$1$', '$2$', '$3$'], TOK = ['rain', 'snow', 'clear'];
function softFig(names, xtitle) {
  return {
    duration: 1100, size: [590, 350],
    draw(g, p) {
      const z = [p.z1, p.z2, p.z3], q = softmax(z);
      barPanel(g, LOGB, names, z, { key: 'l', base: 0, yt: [-1, 0, 1, 2, 3, 4], title: 'logits $z_k$', lab: lnLab, xtitle });
      g.arrow([LOGB.x0 + LOGB.W + 14, 165], [PRB.x0 - 44, 165], { color: '#666', w: 2, opacity: p.pb ?? 1 });
      g.label('sm', 'softmax', [(LOGB.x0 + LOGB.W + PRB.x0 - 30) / 2, 165], 'b', { dy: -6, color: '#555', opacity: p.pb ?? 1 });
      barPanel(g, PRB, names, q, { key: 'p', base: 0, yt: [0, 0.5, 1], title: 'probabilities', lab: v => fmt(v, 3), opacity: p.pb ?? 1, xtitle });
    }
  };
}
FIGS.softk = softFig(CLS, 'class $k$');
FIGS.tok = softFig(TOK, null);
// slide 31: probabilities at temperature T = 10^lT for the logits (ln 2, 0, 0); T = 1 dashed
const TB = box2d(70, 46, 400, 250, 0.4, 3.6, 0, 1);
const tempOf = lT => +(10 ** lT).toPrecision(2);
FIGS.temp = {
  duration: 1100, size: [560, 350],
  draw(g, p) {
    const T = tempOf(p.lT), q = softmax([LN2 / T, 0, 0]);
    barPanel(g, TB, TOK, q, { key: 'p', base: 0, yt: [0, 0.5, 1], title: '$p_T(k)$, logits $(\\ln 2,0,0)$', lab: v => fmt(v, 3),
      ghost: Math.abs(T - 1) > 1e-9 ? softmax([LN2, 0, 0]) : null });
    const Ts = T === 0.5 ? '1/2' : String(T);
    g.label('T', `$T=${Ts}$`, [TB.x0 + TB.W - 10, TB.y0 + 4], 'tr', { color: 'pred' });
    g.label('Tg', 'dashed: $T=1$', [TB.x0 + TB.W - 10, TB.y0 + 36], 'tr', { color: '#666', opacity: Math.abs(T - 1) > 1e-9 ? 1 : 0 });
    const sec = g.root.closest('section'), out = sec && sec.querySelector('.v-T');
    if (out && out.textContent !== String(T)) out.textContent = String(T);
  }
};

// ---------------------------------------------------------------- slides 29 and 30: the language model's pipeline
// Pixel layout.  The bars are illustrative: logits for four of the V tokens after
// "Tomorrow it will", and the softmax over these four.
const PTOK = ['rain', 'be', 'snow', 'clear'], PZ = [2.1, 1.7, 0.7, -0.4];
FIGS.pipe = {
  duration: 900, size: [560, 530],
  draw(g, p) {
    const box = (x, y, w, h, st = {}) => g.el('rect', Object.assign({ x, y, width: w, height: h, rx: 8, fill: '#f1f1f1', stroke: '#888', 'stroke-width': 1.5 }, st));
    const down = (y1, y2, x = 210) => g.arrow([x, y1], [x, y2], { color: '#666', w: 2 });
    // the context
    [['Tomorrow', 40, 120], ['it', 172, 60], ['will', 244, 70]].forEach(([w, x, wd], i) => { box(x, 8, wd, 40); g.label('w' + i, w, [x + wd / 2, 28], 'c'); });
    g.label('ctx', 'context $w_{1:t-1}$', [326, 28], 'l', { color: '#555' });
    down(52, 80);
    box(40, 84, 340, 48, { fill: '#e7e4ee', stroke: '#463C7D' });
    g.label('net', 'embeddings and network', [210, 108], 'c', { color: '#463C7D' });
    down(136, 166);
    for (let i = 0; i < 10; i++) g.el('rect', { x: 70 + i * 20, y: 170, width: 18, height: 26, fill: C.pred, 'fill-opacity': 0.15 + 0.07 * ((i * 7) % 10), stroke: '#fff' });
    g.label('phi', 'features $\\bphi(w_{1:t-1})\\in\\bbR^m$', [280, 183], 'l', { color: '#333' });
    down(200, 236);
    g.label('lin', '$\\bz=\\mW\\bphi+\\bb$', [220, 218], 'l', { color: '#333' });
    // logits and probabilities
    const P = g.plot(box2d(40, 290, 200, 150, 0.4, 4.6, -0.8, 2.4)), Q = g.plot(box2d(330, 290, 200, 150, 0.4, 4.6, 0, 0.55));
    const xs = [1, 2, 3, 4], q = softmax(PZ);
    P.line([0.4, 0], [4.6, 0], { color: C.axis }); Q.line([0.4, 0], [4.6, 0], { color: C.axis });
    P.bars(xs, PZ, { color: 'pred', width: 0.6 });
    Q.bars(xs, q, { color: 'pred', width: 0.6 });
    PTOK.forEach((w, i) => { const t = `<span style="font-size:18px">${w}</span>`;
      P.label('lt' + i, t, [i + 1, -0.8], 't', { dy: 4, color: '#333' }); Q.label('pt' + i, t, [i + 1, 0], 't', { dy: 4, color: '#333' }); });
    g.label('zl', 'logits $\\bz$, one per token', [40, 280], 'bl', { color: '#333' });
    g.label('ql', '$p(w_t=k\\mid w_{1:t-1})$', [330, 280], 'bl', { color: '#333' });
    g.arrow([252, 370], [318, 370], { color: '#666', w: 2 });
    g.label('smx', 'softmax', [285, 366], 'b', { color: '#555' });
    g.label('cap', 'four of the V tokens, softmax over these four; numbers are illustrative', [280, 500], 't', { color: '#666' });
    // the last layer, softmax regression on the features
    g.el('rect', { x: 18, y: 160, width: 528, height: 330, rx: 14, fill: 'none', stroke: C.ink, 'stroke-width': 3, 'stroke-dasharray': '10 6', opacity: p.hl });
    g.label('sr', 'last layer: softmax regression', [540, 158], 'br', { dy: -2, color: 'ink', opacity: p.hl });
  }
};

// ---------------------------------------------------------------- slide 15: entropy and relative entropy; b2 shows the fitted model's bar
const KB = box2d(80, 46, 400, 360, 0.4, 3.6, 0, 0.8);
FIGS.kl = {
  duration: 900, size: [580, 460],
  draw(g, p) {
    const P = g.plot(KB), D0 = GD.L[0] - LMIN;
    P.axes({ grid: false, ox: 0.4, xt: [], yt: [0.2, 0.4, 0.6, 0.8], names: ['', ''] });
    P.label('yl', 'loss per day (nats)', [0.4, 0.8], 'l', { dx: 10, dy: -14, color: '#444' });
    const bar = (x, lo, hi, col) => P.rect([x - 0.25, lo], [x + 0.25, hi], { color: col, fo: 0.55, stroke: C[col], 'stroke-width': 1.5 });
    const X0 = 1, X1 = 2.8;
    const b2 = p.b2 ?? 1;
    bar(X0, 0, LMIN, 'mle'); bar(X0, LMIN, GD.L[0], 'rose');
    g.group({ opacity: b2 }, () => bar(X1, 0, LMIN, 'mle'));
    P.label('n0', '$\\btheta=\\bzero$', [X0, 0], 't', { dy: 8, color: '#333' });
    P.label('n1', '$\\hat\\btheta$', [X1, 0], 't', { dy: 8, color: '#333', opacity: b2 });
    P.label('e0', `$H$ ${f3(LMIN)}`, [X0 + 0.25, LMIN / 2], 'l', { dx: 8, color: 'mle' });
    P.label('e1', `$H$ ${f3(LMIN)}`, [X1 + 0.25, LMIN / 2], 'l', { dx: 8, color: 'mle', opacity: b2 });
    P.label('d0', `$D$ ${f3(D0)}`, [X0 + 0.25, LMIN + D0 / 2], 'l', { dx: 8, color: 'rose' });
    P.label('d1', '$D$ 0', [X1 + 0.25, LMIN], 'l', { dx: 8, color: 'rose', opacity: b2 });
    P.label('t0', `total ${f3(GD.L[0])}`, [X0, GD.L[0]], 'b', { dy: -6, color: '#333' });
  }
};

// ---------------------------------------------------------------- slide 33: perplexity
// The model of the softmax exercise, logits (ln 2, 0, 0).  hi marks the observed token, snow, and
// its cost in bits; u shows the uniform choice among 2^bits tokens that costs the same.
const PPL = box2d(56, 56, 230, 250, 0.4, 3.6, 0, 1), PPU = box2d(350, 56, 230, 250, 0.4, 4.6, 0, 1);
FIGS.ppl = {
  duration: 900, size: [600, 420],
  draw(g, p) {
    const q = softmax([LN2, 0, 0]), bits = -Math.log2(q[1]), K = Math.round(2 ** bits), hi = p.hi ?? 0, u = p.u ?? 0;
    barPanel(g, PPL, TOK, q, { key: 'm', base: 0, yt: [0, 0.5, 1], title: 'model: $p(w_t=k\\mid w_{1:t-1})$', lab: v => fmt(v, 3) });
    const P = g.plot(PPL);
    P.rect([2 - 0.36, 0], [2 + 0.36, q[1]], { color: 'none', stroke: C.ink, 'stroke-width': 3, fill: 'none', opacity: hi });
    P.label('cost', `observed: snow<br>$-\\log_2 ${fmt(q[1], 3)}=${fmt(bits, 3)}$ bits`, [2, 0], 't', { dy: 36, color: 'ink', opacity: hi });
    barPanel(g, PPU, ['', '', '', ''], new Array(K).fill(1 / K), { key: 'u', base: 0, yt: [0, 0.5, 1], title: `${K} equally likely tokens`, lab: v => fmt(v, 3), opacity: u });
    g.label('pp', `same cost:<br>perplexity $2^{${fmt(bits, 3)}}=${K}$`, [PPU.x0 + PPU.W / 2, PPU.y0 + PPU.H], 't', { dy: 36, color: 'pred', opacity: u });
  }
};

// ---------------------------------------------------------------- slide 36: the loss over (beta, gamma), on x and on u
// Average loss contours by marching squares on a grid, the same levels in both panels,
// and each gradient-descent path (step 0.1 on the average) until it is within 0.001
// of the minimum loss per day.
function contourD(P, f, levels, nx = 260, ny = 220) {
  const xs = [], ys = [], v = [];
  for (let i = 0; i <= nx; i++) xs.push(P.xlo + (P.xhi - P.xlo) * i / nx);
  for (let j = 0; j <= ny; j++) ys.push(P.ylo + (P.yhi - P.ylo) * j / ny);
  for (let j = 0; j <= ny; j++) { v.push([]); for (let i = 0; i <= nx; i++) v[j].push(f(xs[i], ys[j])); }
  const out = [];
  for (const L of levels) {
    let d = '';
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const c = [[xs[i], ys[j], v[j][i]], [xs[i + 1], ys[j], v[j][i + 1]], [xs[i + 1], ys[j + 1], v[j + 1][i + 1]], [xs[i], ys[j + 1], v[j + 1][i]]];
      const pts = [];
      for (let e = 0; e < 4; e++) { const a = c[e], b = c[(e + 1) % 4];
        if ((a[2] < L) !== (b[2] < L)) { const u = (L - a[2]) / (b[2] - a[2]); pts.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]); } }
      for (let k = 0; k + 1 < pts.length; k += 2)
        d += `M${P.X(pts[k][0]).toFixed(1)},${P.Y(pts[k][1]).toFixed(1)}L${P.X(pts[k + 1][0]).toFixed(1)},${P.Y(pts[k + 1][1]).toFixed(1)}`;
    }
    out.push(d);
  }
  return out;
}
const CLEV = [0.432, 0.44, 0.46, 0.5, 0.56, 0.64, 0.75, 0.9];
const CX = box2d(70, 24, 420, 280, -0.5, 2.4, -17, 1.2), CU = box2d(700, 24, 420, 280, -0.5, 2.4, -1.3, 1.3);
const stepsTo = run => { for (let t = 0; t < run.L.length; t++) if (run.L[t] <= LMIN + 0.001) return t; return run.L.length - 1; };
const RUNX = gdRun(4000), RUNU = gdRun(200, 7), NX = stepsTo(RUNX), NU = stepsTo(RUNU);
let CONT = null;
FIGS.cont = {
  size: [1200, 360],
  draw(g, p) {
    const P = g.plot(CX), Q = g.plot(CU);
    if (!CONT) CONT = [contourD(P, (b, gm) => loss32(b, gm) / 32, CLEV), contourD(Q, (b, gm) => loss32(b, gm - 7 * b) / 32, CLEV)];
    [[P, 0, RUNX, NX, 'x'], [Q, 1, RUNU, NU, 'u']].forEach(([R, k, run, n, nm]) => {
      R.axes({ grid: false, ox: R.xlo, oy: R.ylo, xt: [], yt: k ? [-1, 0, 1] : [-15, -10, -5, 0], names: ['', ''] });
      for (const b of [0, 1, 2]) R.g.text([R.X(b), R.Y(R.ylo) + 20], (b / 10).toFixed(1));
      CONT[k].forEach(d => stroke(R, d, { color: 'rose', w: 1.6, opacity: 0.75 }));
      const pts = [];
      for (let t = 0; t <= n; t += Math.max(1, Math.floor(n / 300))) pts.push([run.B[t], run.G[t]]);
      pts.push([run.B[n], run.G[n]]);
      stroke(R, pathOf(pts.map(q => R.px(q))), { color: 'pred', w: 3 });
      R.dot([0, 0], { r: 6, color: 'pred' });
      R.dot([run.B[n], run.G[n]], { r: 6, color: 'pred' });
      R.label('ax' + k, '$\\cbeta$', [R.xhi, R.ylo], 't', { dx: 14, dy: 6, color: '#444' });
      R.label('ay' + k, '$\\cgamma$', [R.xlo, R.yhi], 'l', { dx: 8, dy: -10, color: '#444' });
      R.label('tt' + k, nm === 'x' ? `on $x$: ${thou(n)} steps` : `on $u=x-70$: ${n} steps`, [(R.xlo + R.xhi) / 2, R.ylo], 't', { dy: 30, color: 'pred' });
      R.label('s' + k, '$\\btheta^{(0)}$', [0, 0], 'r', { dx: -10, color: 'pred' });
    });
  }
};

// ---------------------------------------------------------------- slide 35: the four days' loss along beta
const VB = box2d(60, 30, 450, 280, -1, 6, 0, 4.2);
FIGS.cvx = {
  size: [560, 370],
  draw(g, p) {
    const P = g.plot(VB);
    P.axes({ grid: false, ox: 0, xt: [], yt: [1, 2, 4], names: ['$\\cbeta$', '$\\cL(\\cbeta,0)$'] });
    for (const b of [1, 2, 3, 4, 5]) P.g.text([P.X(b), P.Y(0) + 20], (b / 10).toFixed(1));
    stroke(P, fpath(P, b => loss4(b), -1, 6, 300), { color: 'rose' });
    for (const b of [0, 1, 2, 3, 5]) P.dot([b, loss4(b)], { r: 6, color: 'rose' });
    P.label('v0', f3(loss4(0)), [0, loss4(0)], 'l', { dx: 14, dy: 10, color: 'rose' });
    P.label('vz', 'never reaches 0', [3.4, loss4(3.4)], 'bl', { dx: 4, dy: -12, color: 'rose' });
  }
};

// ---------------------------------------------------------------- slide 37: losses of the margin
const MB = box2d(46, 30, 320, 290, -2.2, 2.2, 0, 3.2);
FIGS.margin = {
  size: [400, 380],
  // n: how many losses are drawn, one more per slide of Part 3 (1 the zero-one loss,
  // 2 also the logistic loss, 3 also the hinge loss)
  draw(g, p) {
    const P = g.plot(MB), n = p.n ?? 3;
    P.axes({ grid: false, ox: 0, xt: [-2, -1, 1, 2], yt: [2, 3], names: ['', 'loss'] });
    P.label('mx', '$y(\\bbeta^T\\bx+\\cgamma)$', [0, 0], 't', { dy: 26, color: '#444' });
    P.line([-2.2, 1], [0, 1], { color: 'ink', w: 3.5 }); P.line([0, 0], [2.2, 0], { color: 'ink', w: 3.5 });
    if (n >= 3) P.curve(m => Math.max(0, 1 - m), { color: 'postC', from: -2.2, to: 2.2 });
    if (n >= 2) P.curve(m => Math.log1p(Math.exp(-m)), { color: 'rose', from: -2.2, to: 2.2 });
    for (const m of [-1, 0, 1]) {
      if (n >= 2) P.dot([m, Math.log1p(Math.exp(-m))], { r: 5.5, color: 'rose' });
      if (n >= 3) P.dot([m, Math.max(0, 1 - m)], { r: 5.5, color: 'postC' });
    }
    // the tick at 1 sits on the zero-one line, so it is drawn over it with a halo
    P.text([0, 1], '1', { anchor: 'end', dx: -7, dy: 5, stroke: '#fff', 'stroke-width': 5, 'paint-order': 'stroke' });
    P.label('z1', '0-1', [-1.6, 1], 'b', { dy: -6 });
    P.label('hg', 'hinge', [-1.75, 2.75], 'l', { dx: 16, dy: -10, color: 'postC', opacity: n >= 3 ? 1 : 0 });
    P.label('lg', 'logistic', [1.45, Math.log1p(Math.exp(-1.45))], 'bl', { dx: 6, dy: -8, color: 'rose', opacity: n >= 2 ? 1 : 0 });
  }
};

// ---------------------------------------------------------------- Summary icons
// slide 7: the two routes' small pictures
function iconPrior(svg) {
  const base = 62;
  el(svg, 'line', { x1: 6, y1: base, x2: 224, y2: base, stroke: C.axis, 'stroke-width': 1.5 });
  for (const [x, h, c] of [[55, 39, C.brown], [145, 52, C.teal]]) {
    el(svg, 'rect', { x, y: base - h, width: 34, height: h, fill: c, 'fill-opacity': 0.22, stroke: c, 'stroke-width': 2 });
  }
  el(svg, 'text', { x: 72, y: 14, 'text-anchor': 'middle', fill: C.brown, 'font-size': 14 }).textContent = '0';
  el(svg, 'text', { x: 162, y: 7, 'text-anchor': 'middle', fill: C.teal, 'font-size': 14 }).textContent = '1';
}
function iconBells(svg) {
  const W = 230, H = 70, base = 62, X = x => 10 + (x - 3) / 7 * (W - 20);
  for (const [m, c] of [[6, C.brown], [8, C.teal]]) {
    let d = '';
    for (let i = 0; i <= 80; i++) { const x = 3 + 7 * i / 80; d += (i ? 'L' : 'M') + X(x).toFixed(1) + ',' + (base - 50 * Math.exp(-((x - m) ** 2) / 2)).toFixed(1); }
    el(svg, 'path', { d: d + `L${X(10)},${base}L${X(3)},${base}Z`, fill: c, 'fill-opacity': 0.15 });
    el(svg, 'path', { d, fill: 'none', stroke: c, 'stroke-width': 2.5 });
  }
  el(svg, 'line', { x1: 6, y1: base, x2: W - 6, y2: base, stroke: C.axis, 'stroke-width': 1.5 });
}
function iconPost(svg) {
  const W = 230, base = 62, X = x => 10 + (x - 3) / 7 * (W - 20);
  let d = '';
  for (let i = 0; i <= 80; i++) { const x = 3 + 7 * i / 80; d += (i ? 'L' : 'M') + X(x).toFixed(1) + ',' + (base - 52 * sigm(2 * x - 14)).toFixed(1); }
  el(svg, 'line', { x1: 6, y1: base, x2: W - 6, y2: base, stroke: C.axis, 'stroke-width': 1.5 });
  el(svg, 'path', { d, fill: 'none', stroke: C.pred, 'stroke-width': 3 });
}
Object.assign(ICONS, { prioric: iconPrior, bellsic: iconBells, postic: iconPost });

Object.assign(ICONS, {
  gen(svg) {
    [[30, 38, C.brown], [76, 24, C.teal]].forEach(([x, y, c]) => {
      el(svg, 'circle', { cx: x, cy: y, r: 15, fill: c, 'fill-opacity': 0.18, stroke: c, 'stroke-width': 2 });
      el(svg, 'circle', { cx: x, cy: y, r: 3.5, fill: c });
    });
    el(svg, 'line', { x1: 40, y1: 2, x2: 66, y2: 62, stroke: C.ink, 'stroke-width': 2.5 });
  },
  logit(svg) {
    let d = '';
    for (let i = 0; i <= 40; i++) { const x = i / 40; d += (i ? 'L' : 'M') + (8 + 94 * x).toFixed(1) + ',' + (56 - 48 * sigm(10 * (x - 0.5))).toFixed(1); }
    el(svg, 'line', { x1: 6, y1: 56, x2: 104, y2: 56, stroke: C.axis, 'stroke-width': 1.5 });
    el(svg, 'path', { d, fill: 'none', stroke: C.pred, 'stroke-width': 3 });
  },
  reg(svg) {
    const curve = (k, c, w, dash) => { let d = '';
      for (let i = 0; i <= 40; i++) { const x = i / 40; d += (i ? 'L' : 'M') + (8 + 94 * x).toFixed(1) + ',' + (56 - 48 * sigm(k * (x - 0.5))).toFixed(1); }
      el(svg, 'path', { d, fill: 'none', stroke: c, 'stroke-width': w, 'stroke-dasharray': dash || 'none', 'stroke-opacity': dash ? 0.6 : 1 }); };
    el(svg, 'line', { x1: 6, y1: 56, x2: 104, y2: 56, stroke: C.axis, 'stroke-width': 1.5 });
    curve(60, C.pred, 2.5, '5 4');
    curve(6, C.pred, 3);
  },
  losses(svg) {   // the zero-one, logistic and hinge losses against y (beta^T x + gamma)
    const X = m => 55 + 22 * m, Y = v => 58 - 16 * v;
    const line = (f, c, w) => { let d = '';
      for (let i = 0; i <= 60; i++) { const m = -2.2 + 4.4 * i / 60; d += (i ? 'L' : 'M') + X(m).toFixed(1) + ',' + Y(Math.min(f(m), 3.3)).toFixed(1); }
      el(svg, 'path', { d, fill: 'none', stroke: c, 'stroke-width': w }); };
    el(svg, 'line', { x1: 4, y1: Y(0), x2: 106, y2: Y(0), stroke: C.axis, 'stroke-width': 1.5 });
    el(svg, 'path', { d: `M${X(-2.2)},${Y(1)}H${X(0)}V${Y(0)}H${X(2.2)}`, fill: 'none', stroke: C.ink, 'stroke-width': 2.5 });
    line(m => Math.log1p(Math.exp(-m)), C.rose, 2.5);
    line(m => Math.max(0, 1 - m), C.postC, 2.5);
  },
  soft(svg) {
    el(svg, 'line', { x1: 10, y1: 58, x2: 100, y2: 58, stroke: C.axis, 'stroke-width': 1.5 });
    [[22, 44], [50, 22], [78, 22]].forEach(([x, h]) => el(svg, 'rect', { x: x - 10, y: 58 - h, width: 20, height: h, fill: C.pred, 'fill-opacity': 0.55, stroke: C.pred, 'stroke-width': 1.5 }));
  }
});
