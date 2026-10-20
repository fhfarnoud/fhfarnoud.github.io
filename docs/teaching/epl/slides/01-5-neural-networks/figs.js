// Figures of the Neural networks deck (Part 4, lecture 1).  Each FIGS entry draws from one
// parameter object (see ../shared/deck.js).  Network diagrams use the engine's g.net, computation
// graphs its g.cgraph.  The models are computed here from their definitions; the seeded data
// (the ellipse networks, the minibatch draws, the initialization run) come from data.js, written
// by deck_numbers.py, which also prints every number the slides quote.

Object.assign(MACROS, {
  '\\bx': '\\mathbf{x}', '\\bh': '\\mathbf{h}', '\\bw': '\\mathbf{w}', '\\bW': '\\mathbf{W}', '\\bA': '\\mathbf{A}',
  '\\bc': '\\mathbf{c}', '\\bb': '\\mathbf{b}', '\\bz': '\\mathbf{z}', '\\bp': '\\mathbf{p}', '\\be': '\\mathbf{e}',
  '\\by': '\\mathbf{y}', '\\bg': '\\mathbf{g}', '\\bm': '\\mathbf{m}', '\\bI': '\\mathbf{I}', '\\bzero': '\\mathbf{0}',
  '\\bdelta': '\\boldsymbol{\\delta}', '\\btheta': '\\boldsymbol{\\theta}', '\\bphi': '\\boldsymbol{\\phi}',
  '\\cL': '\\mathcal{L}', '\\cD': '\\mathcal{D}', '\\bbR': '\\mathbb{R}', '\\relu': '\\operatorname{ReLU}',
  '\\ber': '\\operatorname{Ber}', '\\Var': '\\operatorname{Var}',
  // role colours (## is a literal # inside a KaTeX macro)
  '\\cpr': '\\textcolor{##2354A8}{#1}', '\\clk': '\\textcolor{##008000}{#1}', '\\cpo': '\\textcolor{##B30000}{#1}',
  '\\cpd': '\\textcolor{##762A83}{#1}', '\\cml': '\\textcolor{##616161}{#1}', '\\cro': '\\textcolor{##B33362}{#1}',
  '\\cte': '\\textcolor{##087F80}{#1}', '\\cbr': '\\textcolor{##A0521B}{#1}', '\\cam': '\\textcolor{##A86E00}{#1}'
});

// ---------------------------------------------------------------- shared pieces
const sigm = u => 1 / (1 + Math.exp(-u));
const relu = u => Math.max(0, u);
const neg = s => String(s).replace(/^-/, '−');
const sm = (t, px = 18) => `<span style="font-size:${px}px">${t}</span>`;
const f2 = v => neg((Math.abs(v) < 0.005 ? 0 : v).toFixed(2));
const f3 = v => neg((Math.abs(v) < 0.0005 ? 0 : v).toFixed(3));
const CLS = y => y ? 'teal' : 'brown';      // class 1 teal, class 0 brown, as in 32-3
const halo = { stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' };
// The part of a convex polygon where a x + b y + c >= 0 (one Sutherland-Hodgman step).
function clipHalf(poly, a, b, c) {
  const out = [], s = q => a * q[0] + b * q[1] + c;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length], sp = s(p), sq = s(q);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) { const u = sp / (sp - sq); out.push([p[0] + u * (q[0] - p[0]), p[1] + u * (q[1] - p[1])]); }
  });
  return out;
}
// Where the line a x + b y + c = 0 crosses the square [lo, hi]^2: its two ends, or null.
function lineInBox(a, b, c, lo, hi) {
  const pts = [];
  for (const x of [lo, hi]) if (Math.abs(b) > 1e-12) { const y = -(a * x + c) / b; if (y >= lo - 1e-9 && y <= hi + 1e-9) pts.push([x, y]); }
  for (const y of [lo, hi]) if (Math.abs(a) > 1e-12) { const x = -(b * y + c) / a; if (x >= lo - 1e-9 && x <= hi + 1e-9) pts.push([x, y]); }
  if (pts.length < 2) return null;
  let best = [pts[0], pts[1]], dmax = -1;
  for (const p of pts) for (const q of pts) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d > dmax) { dmax = d; best = [p, q]; } }
  return best;
}
// A raster of f over a box2d plot, as an <image> (cached by key: the HTML and every print page share it).
const RASTERS = {};
function raster(g, B, key, f, nx = 160, ny = 160) {
  if (!RASTERS[key]) {
    const cv = document.createElement('canvas'); cv.width = nx; cv.height = ny;
    const ctx = cv.getContext('2d'), im = ctx.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = B.xlo + (i + 0.5) / nx * (B.xhi - B.xlo), y = B.yhi - (j + 0.5) / ny * (B.yhi - B.ylo);
      const [r, gg, b] = f(x, y), k = 4 * (j * nx + i);
      im.data[k] = r; im.data[k + 1] = gg; im.data[k + 2] = b; im.data[k + 3] = 255;
    }
    ctx.putImageData(im, 0, 0); RASTERS[key] = cv.toDataURL('image/png');
  }
  return g.el('image', { href: RASTERS[key], x: B.X(B.xlo), y: B.Y(B.yhi), width: B.X(B.xhi) - B.X(B.xlo),
    height: B.Y(B.ylo) - B.Y(B.yhi), preserveAspectRatio: 'none' });
}
// brown (v = -1) through white (0) to teal (v = 1), with the strength s of the tint
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function diverge(v, s = 0.55) {
  const [r, g, b] = hexRGB(v < 0 ? C.brown : C.teal), u = clamp(Math.abs(v)) * s;
  return [255 + (r - 255) * u, 255 + (g - 255) * u, 255 + (b - 255) * u];
}
// Line segments where f = level, by marching squares on an nx x ny grid of a box2d plot.
function contourD(B, f, level, nx = 120, ny = 120) {
  const xs = [], ys = [], v = [];
  for (let i = 0; i <= nx; i++) xs.push(B.xlo + (B.xhi - B.xlo) * i / nx);
  for (let j = 0; j <= ny; j++) ys.push(B.ylo + (B.yhi - B.ylo) * j / ny);
  for (let j = 0; j <= ny; j++) { v.push([]); for (let i = 0; i <= nx; i++) v[j].push(f(xs[i], ys[j])); }
  let d = '';
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = [[xs[i], ys[j], v[j][i]], [xs[i + 1], ys[j], v[j][i + 1]], [xs[i + 1], ys[j + 1], v[j + 1][i + 1]], [xs[i], ys[j + 1], v[j + 1][i]]];
    const pts = [];
    for (let e = 0; e < 4; e++) { const a = c[e], b = c[(e + 1) % 4];
      if ((a[2] < level) !== (b[2] < level)) { const u = (level - a[2]) / (b[2] - a[2]); pts.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]); } }
    for (let k = 0; k + 1 < pts.length; k += 2)
      d += `M${B.X(pts[k][0]).toFixed(1)},${B.Y(pts[k][1]).toFixed(1)}L${B.X(pts[k + 1][0]).toFixed(1)},${B.Y(pts[k + 1][1]).toFixed(1)}`;
  }
  return d;
}
const stroke = (g, d, st = {}) => g.el('path', paint(st, { d, fill: 'none', stroke: C.ink, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
// a plain axis frame: the two axes from the corner, ticks, and names at the ends
function frameAxes(P, o = {}) {
  const B = P.B, ox = o.ox ?? B.xlo, oy = o.oy ?? B.ylo;
  P.g.arrow([B.X(B.xlo), B.Y(oy)], [B.X(B.xhi) + 14, B.Y(oy)]);
  P.g.arrow([B.X(ox), B.Y(B.ylo)], [B.X(ox), B.Y(B.yhi) - 14]);
  for (const v of o.xt ?? []) P.g.text([B.X(v), B.Y(oy) + 20], o.xf ? o.xf(v) : minus(v));
  for (const v of o.yt ?? []) P.g.text([B.X(ox) - 7, B.Y(v) + 5], o.yf ? o.yf(v) : minus(v), { anchor: 'end' });
  const k = o.key ?? 'ax';
  if (o.names) {
    P.g.label(k + 'x', o.names[0], [B.X(B.xhi) + 12, B.Y(oy) + 6], 't', { color: '#444', opacity: o.opacity ?? 1 });
    // o.yLeft puts the vertical axis's name to the left of its tip, clear of labels at the top of the plot
    P.g.label(k + 'y', o.names[1], o.yLeft ? [B.X(ox) - 8, B.Y(B.yhi) - 6] : [B.X(ox) + 8, B.Y(B.yhi) - 14], o.yLeft ? 'r' : 'l', { color: '#444', opacity: o.opacity ?? 1 });
  }
}
// the unit square with the four XOR inputs, labelled by their targets
function xorSquare(P, targets, o = {}) {
  frameAxes(P, { ox: P.B.xlo, oy: P.B.ylo, xt: [0, 1], yt: [0, 1], names: ['$x_1$', '$x_2$'], key: o.key || 'sq', yLeft: true });
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b], k) => {
    const t = targets[k];
    P.dot([a, b], { r: 9, color: CLS(t > 0) });
    // labels outside the square: above the points at x2 = 1, below those at x2 = 0
    if (o.labels !== false) P.label((o.key || 'sq') + 't' + k, o.lab ? o.lab(k) : `$${neg(t)}$`, [a, b], b ? 'b' : 't',
      { dy: b ? -14 : 14, color: CLS(t > 0) });
  });
}

// ---------------------------------------------------------------- slide 2: where the features come from
FIGS.pipe0 = {
  size: [500, 560],
  draw(g, p) {
    const box = (x, y, w, h, st = {}) => g.el('rect', Object.assign({ x, y, width: w, height: h, rx: 8, fill: '#f1f1f1', stroke: '#888', 'stroke-width': 1.5 }, st));
    [['Tomorrow', 60, 120], ['it', 192, 60], ['will', 264, 70]].forEach(([w, x, wd], i) => { box(x, 6, wd, 40); g.label('w' + i, w, [x + wd / 2, 26], 'c'); });
    g.label('ctx', sm('context $w_{1:t-1}$', 20), [346, 26], 'l', { color: '#555' });
    g.arrow([229, 50], [229, 80], { color: '#666', w: 2 });
    g.el('rect', { x: 8, y: 86, width: 484, height: 250, rx: 14, fill: C.postC, 'fill-opacity': 0.07, stroke: C.postC, 'stroke-width': 2.5, 'stroke-dasharray': '9 6' });
    g.net({ layers: [3, 4, 4, 3], box: [40, 112, 300, 170], r: 15, key: 'nn', node: l => l === 3 ? { role: 'hid' } : {}, head: 7, edgeW: 1.5 });
    g.label('nin', sm('token<br>vectors'), [55, 296], 'c', { color: '#555' });
    g.label('nhd', sm('hidden layers'), [190, 296], 'c', { color: '#555' });
    g.label('phi', sm('features $\\bphi$', 20), [326, 296], 'c', { color: '#333' });
    g.label('nnl', 'neural network', [418, 160], 'c', { color: '#8f5f00' });
    g.label('nnl2', sm('this lecture'), [418, 190], 'c', { color: '#8f5f00' });
    g.arrow([325, 340], [325, 372], { color: '#666', w: 2 });
    g.el('rect', { x: 8, y: 378, width: 484, height: 176, rx: 14, fill: 'none', stroke: C.ink, 'stroke-width': 2.5, 'stroke-dasharray': '9 6' });
    g.label('sr', sm('softmax regression (32-3)', 20), [478, 398], 'r', { color: C.ink });
    g.label('lin', sm('$\\bz=\\bW\\bphi+\\bb$, softmax', 20), [30, 398], 'l', { color: '#333' });
    const P = g.plot(box2d(60, 430, 380, 80, 0.4, 4.6, 0, 0.5)), toks = ['rain', 'be', 'snow', 'clear'];
    const z = [2.1, 1.7, 0.7, -0.4], e = z.map(Math.exp), s = e.reduce((a, b) => a + b, 0);
    P.line([0.4, 0], [4.6, 0], { color: C.axis });
    P.bars([1, 2, 3, 4], e.map(v => v / s), { color: 'pred', width: 0.55 });
    toks.forEach((w, i) => P.label('t' + i, sm(w), [i + 1, 0], 't', { dy: 4, color: '#333' }));
    g.label('pp', sm('$p(w_t\\mid w_{1:t-1})$', 20), [478, 432], 'r', { color: C.pred });
  }
};

// ---------------------------------------------------------------- feature engineering: waves (slide 5)
// The example of chat_files/part4-deck-scripts/feature_engineering_example.py (seed 20261020), points
// from data.js: two waves of each class, then for 100 training waves per class the raw samples x_17 and
// x_30 and the features (|X_2|, |X_3|), each pair with the logistic regression line fitted on it
// (data.js waves.lines, from deck_numbers.py).  st: 0 the waves, 1 also the raw pair, 2 also the features.
FIGS.waves = {
  size: [510, 560],
  draw(g, p) {
    const Wv = DATA.waves, st = p.st ?? 2;
    // two waves of each class, each with the sinusoid at its class's frequency fitted from its samples
    // (amplitude and phase of the Fourier coefficient): the noisy samples thin, the fit thick
    [[Wv.ex0, 'brown', 20, 2, 'class 0: 2 cycles per second'], [Wv.ex1, 'teal', 270, 3, 'class 1: 3 cycles per second']].forEach(([ex, col, x0, f, name], k) => {
      ex.forEach((w, j) => {
        const P = g.plot(box2d(x0, 34 + j * 74, 220, 64, 0, 1, -2.6, 2.6));
        let re = 0, im = 0;
        w.forEach((v, i) => { re += v * Math.cos(2 * Math.PI * f * i / 64); im -= v * Math.sin(2 * Math.PI * f * i / 64); });
        const A = 2 * Math.hypot(re, im) / 64, ph = Math.atan2(im, re);
        P.line([0, 0], [1, 0], { stroke: '#ddd', 'stroke-width': 1 });
        P.path(w.map((v, i) => [i / 64, clamp(v, -2.6, 2.6)]), { stroke: C[col], 'stroke-width': 1.3, opacity: 0.5 });
        P.curve(t => A * Math.cos(2 * Math.PI * f * t + ph), { color: C[col], w: 2.8, from: 0, to: 63 / 64 });
      });
      g.label('wn' + k, sm(name), [x0 + 110, 26], 'b', { color: C[col] });
    });
    g.label('wt', sm('each panel: one second, 64 samples; thick: the fitted sinusoid', 16), [250, 186], 't', { color: '#666' });
    // the same model, logistic regression, fitted on two features each: its decision line (probability 1/2)
    const scat = (x0, pts0, pts1, lo, hi, names, key, line, op) => {
      const B = box2d(x0, 250, 210, 210, lo, hi, lo, hi), P = g.plot(B);
      g.group({ opacity: op }, () => {
        frameAxes(P, { ox: lo, oy: lo, key, names, opacity: op });
        [[pts0, 'brown'], [pts1, 'teal']].forEach(([pts, col]) => pts.forEach(q =>
          P.dot([clamp(q[0], lo, hi), clamp(q[1], lo, hi)], { r: 3.6, color: col, outline: false, 'fill-opacity': 0.7 })));
        const ends = lineInBox(line[0], line[1], line[2], lo, hi);
        if (ends) P.line(ends[0], ends[1], { color: 'ink', w: 3 });
      });
      const ends = lineInBox(line[0], line[1], line[2], lo, hi);
      if (ends) { const [lo2, hi2] = ends[0][1] < ends[1][1] ? ends : [ends[1], ends[0]];
        P.label(key + 'l', sm('$p=\\tfrac12$'), [lo2[0] + 0.78 * (hi2[0] - lo2[0]), lo2[1] + 0.78 * (hi2[1] - lo2[1])], 'l', { dx: 8, opacity: op }); }
      return P;
    };
    const op1 = clamp(st), op2 = clamp(st - 1), L = Wv.lines;
    scat(30, Wv.raw0, Wv.raw1, -3, 3, ['$x_{17}$', '$x_{30}$'], 'rw', L.raw, op1);
    g.label('rc', sm('on two raw samples:<br>53.5% training, 48.2% new'), [135, 498], 't', { color: '#444', opacity: op1 });
    scat(285, Wv.feat0, Wv.feat1, 0, 1.6, ['$|X_2|$', '$|X_3|$'], 'ft', L.feat, op2);
    g.label('fc', sm('on two amplitudes:<br>100% training, 100% new'), [390, 498], 't', { color: '#444', opacity: op2 });
  }
};

// ---------------------------------------------------------------- slide 6: hand-designed and learned features, 1980 to 2012
// To scale; hand-designed features above the axis (ink), learned ones below (amber).  Each label sits at its
// marker, its stem the leader: it starts at the marker, or ends at it near the right edge.  An ending label is
// placed by its measured width, not by a right anchor (a right-anchored label near the right edge of a figure
// placed directly in the body makes Chrome shrink every printed page).  Two dates for one item: two stems
// joined by a bar.  st: 1 the hand-designed side, 2 also the learned side.
const TLX = y => 60 + (y - 1980) * 34.4, TLY = 150;
// field icons, 22 x 16 px with the top-left corner at (x, y): mk(tag, attrs) draws one SVG element
const FIELD = {
  speech(mk, x, y, col) { let d = ''; [0, 3, -5, 7, -7, 5, -3, 2, 0].forEach((v, i) => { d += (i ? 'L' : 'M') + (x + i * 2.75).toFixed(1) + ',' + (y + 8 - v).toFixed(1); });
    mk('path', { d, fill: 'none', stroke: col, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }); },
  image(mk, x, y, col) { mk('rect', { x: x + 0.5, y: y + 0.5, width: 21, height: 15, rx: 1.5, fill: 'none', stroke: col, 'stroke-width': 1.6 });
    mk('path', { d: `M${x + 2},${y + 14}L${x + 8},${y + 6}L${x + 12},${y + 10}L${x + 15},${y + 8}L${x + 20},${y + 14}Z`, fill: col, 'fill-opacity': 0.5, stroke: 'none' });
    mk('circle', { cx: x + 16, cy: y + 4.5, r: 1.8, fill: col }); },
  text(mk, x, y, col) { [[2, 20], [6.5, 20], [11, 13]].forEach(([dy, w]) => mk('line', { x1: x + 1, y1: y + dy + 1.5, x2: x + 1 + w, y2: y + dy + 1.5, stroke: col, 'stroke-width': 1.8, 'stroke-linecap': 'round' })); }
};
Object.assign(ICONS, Object.fromEntries(['speech', 'image', 'text'].map(f => ['field-' + f, svg => FIELD[f]((t, a) => el(svg, t, a), 1, 1, '#444')])));
FIGS.timeline = {
  size: [1200, 300],
  draw(g, p) {
    const st = p.st ?? 2, dn = clamp(st - 1), am = '#8f5f00', mk = (t, a) => g.el(t, a);
    g.arrow([TLX(1978), TLY], [TLX(2013.5), TLY], { color: '#666', w: 2 });
    for (const y of [1980, 1990, 2000, 2010]) {
      g.line([TLX(y), TLY - 5], [TLX(y), TLY + 5], { stroke: '#666', 'stroke-width': 1.5 });
      g.text([TLX(y) + 4, TLY + 19], y, { size: 15, color: '#666', anchor: 'start' });
    }
    // an item: stems from the axis at each year to height y2, joined by a bar when there are two; its field
    // icon and label at the stem's end, beginning at the first marker or ending at the last
    const item = (key, years, y2, s, col, op, o = {}) => {
      const xs = years.map(TLX), up = y2 < TLY, end = !!o.end;
      g.group({ opacity: op }, () => {
        xs.forEach(x => g.line([x, TLY], [x, y2], { stroke: col, 'stroke-width': 1.6 }));
        if (xs.length > 1) g.line([xs[0], y2], [xs[xs.length - 1], y2], { stroke: col, 'stroke-width': 1.6 });
        xs.forEach(x => g.el('circle', { cx: x, cy: TLY, r: 5.5, fill: col, stroke: '#fff', 'stroke-width': 1.5 }));
      });
      const d = g.root.querySelector(`:scope > .lab[data-k="${key}"]`), w = d && d.offsetWidth ? d.offsetWidth : 0;
      const h = d && d.offsetHeight ? d.offsetHeight : 21;
      const icon = o.field ? 26 : 0, x0 = end ? xs[xs.length - 1] - w - icon : xs[0] + 4;
      const yl = up ? y2 - 3 : y2 + 3;
      // the icon beside the label's first line
      if (o.field) g.group({ opacity: op }, () => FIELD[o.field](mk, x0, (up ? yl - h : yl) + 2, col));
      g.label(key, sm(s, 18), [x0 + icon, yl], up ? 'bl' : 'tl', { color: col, opacity: op });
    };
    // above: hand-designed
    item('mf', [1980], 84, '<b>1980</b> mel-frequency cepstral coefficients (speech),<br>the best of the representations<br>Davis and Mermelstein compared', C.ink, 1, { field: 'speech' });
    g.line([TLX(1980), TLY - 22], [TLX(2012), TLY - 22], { stroke: '#999', 'stroke-dasharray': '6 5', 'stroke-width': 1.5 });
    FIELD.text(mk, TLX(1980) + 8, TLY - 44, C.ink);
    g.label('tx', sm('<b>text, throughout:</b> counts of words and n-grams (Sec. 1.3)', 18), [TLX(1980) + 34, TLY - 25], 'bl', { color: C.ink });
    item('si', [1999, 2004], 70, '<b>1999, 2004</b> SIFT (Lowe): features<br>“invariant to image scale and rotation”', C.ink, 1, { field: 'image' });
    item('ho', [2005], 118, '<b>2005</b> HOG (Dalal and Triggs),<br>with a linear SVM', C.ink, 1, { field: 'image' });
    // below: learned (backpropagation, GPUs and ReLU are general methods: no field icon)
    item('cn', [1989, 1998], 172, '<b>1989, 1998</b> convolutional networks<br>read digits from pixels (LeCun et al.)', am, dn, { field: 'image' });
    item('bp', [1986], 240, '<b>1986</b> backpropagation learns features<br>(Rumelhart, Hinton, Williams)', am, dn);
    item('gp', [2009], 172, '<b>2009</b> GPUs: deep belief network<br>training up to 70 times faster than<br>a dual-core CPU (Raina et al.)', am, dn, { end: true });
    item('re', [2010], 247, '<b>2010</b> ReLU (Nair and Hinton)', am, dn, { end: true });
    item('ax', [2012], 275, '<b>2012</b> AlexNet', am, dn, { end: true, field: 'image' });
  }
};

// ---------------------------------------------------------------- slide 7: XOR
FIGS.xor = {
  size: [560, 420],
  draw(g, p) {
    const P = g.plot(box2d(130, 40, 300, 320, -0.25, 1.3, -0.4, 1.3));
    xorSquare(P, [0, 1, 1, 0], { lab: k => `$\\mathrm{XOR}=${[0, 1, 1, 0][k]}$` });
    const f = p.fail ?? 0;
    P.g.el('circle', { cx: P.X(1), cy: P.Y(1), r: 17, fill: 'none', stroke: C.rose, 'stroke-width': 3, opacity: f });
    P.label('ff', '$f(1,1)=2$', [1, 1], 'l', { dx: 24, color: 'rose', opacity: f });
  }
};

// ---------------------------------------------------------------- slide 8: no line separates the ellipse
const ELLK = [[4, -2], [-2, 4]];      // x1^2 + x1 x2 + x2^2 = 3 as a covariance contour
const E25 = DATA.ell25.in.map(q => [q, 1]).concat(DATA.ell25.out.map(q => [q, 0]));
FIGS.ellLine = {
  size: [480, 500],
  draw(g, p) {
    const B = box2d(40, 50, 400, 400, -3, 3, -3, 3), P = g.plot(B);
    const t = p.th * Math.PI / 180, a = Math.cos(t), b = Math.sin(t), c = p.b;
    const half = clipHalf([[-3, -3], [3, -3], [3, 3], [-3, 3]], a, b, c);
    if (half.length) P.path(half, { close: true, fill: C.teal, 'fill-opacity': 0.12, stroke: 'none' });
    P.axes({ grid: false, ticks: [-2, 2] });
    P.ellipse(ELLK, { stroke: '#888', 'stroke-dasharray': '7 5', 'stroke-width': 2 });
    // the line a x1 + b x2 + c = 0 across the box
    const ends = lineInBox(a, b, c, -3, 3);
    if (ends) P.line(ends[0], ends[1], { color: 'ink', w: 3.5 });
    let wrong = 0;
    E25.forEach(([q, y]) => {
      const bad = (a * q[0] + b * q[1] + c > 0) !== (y === 1);
      if (bad) { wrong++; P.g.el('circle', { cx: P.X(q[0]), cy: P.Y(q[1]), r: 12, fill: 'none', stroke: C.rose, 'stroke-width': 2.5 }); }
      P.dot(q, { r: 7, color: CLS(y) });
    });
    g.label('cnt', `misclassified: <b>${wrong}</b> of 25`, [40, 20], 'l', { color: 'rose' });
    g.label('k1', sm('shaded: predicted class 1'), [440, 478], 'r', { color: C.teal });
  }
};

// ---------------------------------------------------------------- slide 9: XOR in the features h1 = x1 + x2, h2 = x1 x2
FIGS.xorFeat = {
  size: [500, 570],
  draw(g, p) {
    g.net({ layers: [2, 2, 1], key: 'xn', r: 26,
      at: (l, i) => [[[110, 34], [390, 34]], [[110, 150], [390, 150]], [[250, 250]]][l][i],
      label: (l, i) => [['$x_1$', '$x_2$'], ['$+$', '$\\times$'], ['$\\hat y$']][l][i],
      weight: (l, i) => l === 1 ? { s: i ? '$-2$' : '$+1$', t: 0.5, side: i ? 1 : 1, color: C.ink } : null });
    g.label('h1', '$h_1$', [72, 150], 'r'); g.label('h2', '$h_2$', [428, 150], 'l');
    const P = g.plot(box2d(80, 320, 340, 210, -0.3, 2.5, -0.3, 1.5)), lv = p.lv ?? 0;
    frameAxes(P, { ox: -0.3, oy: -0.3, xt: [0, 1, 2], yt: [0, 1], names: ['$h_1$', '$h_2$'], key: 'hp' });
    P.g.group({ opacity: lv }, () => {
      P.line([-0.3, -0.15], [2.5, 1.25], { color: 'pred', w: 2.5, dash: true });
      P.line([0.7, -0.15], [2.5, 0.75], { color: 'pred', w: 2.5, dash: true });
    });
    P.label('l0', '$\\hat y=0$', [2.5, 1.25], 'l', { dx: 6, color: 'pred', opacity: lv });
    P.label('l1', '$\\hat y=1$', [2.5, 0.75], 'l', { dx: 6, color: 'pred', opacity: lv });
    [[0, 0, 0], [1, 0, 1], [2, 1, 0]].forEach(([a, b, t]) => P.dot([a, b], { r: 9, color: CLS(t) }));
    P.label('p0', sm('$(0,0)$'), [0, 0], 'tr', { dx: -8, dy: 4, color: 'brown' });
    P.label('p1', sm('$(0,1)$ and $(1,0)$'), [1, 0], 't', { dy: 8, color: 'teal' });
    P.label('p2', sm('$(1,1)$'), [2, 1], 'b', { dy: -14, color: 'brown' });
  }
};

// ---------------------------------------------------------------- slide 10: the ellipse in three dimensions
// Points h = (x1^2, x1 x2, x2^2) of the 25 ellipse points, and the plane h1 + h2 + h3 = 3 clipped to the
// box [0, 5] x [-4, 4] x [0, 5].  The view: azimuth az and elevation el in degrees, screen right
// (-sin az, cos az, 0).  az = -26.565, el = -24.095 looks along (2, -1, -1), which lies in the plane, so
// the plane is seen edge-on and no two axes overlap.
const H3 = E25.map(([q, y]) => [[q[0] * q[0], q[0] * q[1], q[1] * q[1]], y]);
const BOX3 = [[0, 5], [-4, 4], [0, 5]];
function planeInBox() {
  const pts = [], corners = [];
  for (const a of BOX3[0]) for (const b of BOX3[1]) for (const c of BOX3[2]) corners.push([a, b, c]);
  const f = q => q[0] + q[1] + q[2] - 3;
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
    const A = corners[i], Bq = corners[j];
    if (A.filter((v, k) => v !== Bq[k]).length !== 1) continue;
    const fa = f(A), fb = f(Bq);
    if ((fa < 0) !== (fb < 0)) { const u = fa / (fa - fb); pts.push(A.map((v, k) => v + u * (Bq[k] - v))); }
  }
  const cen = pts.reduce((s, q) => s.map((v, k) => v + q[k] / pts.length), [0, 0, 0]);
  const e1 = [1, -1, 0].map(v => v / Math.SQRT2), e2 = [1, 1, -2].map(v => v / Math.sqrt(6));
  const dt = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ang = q => { const d = q.map((v, k) => v - cen[k]); return Math.atan2(dt(d, e2), dt(d, e1)); };
  return pts.sort((a, b) => ang(a) - ang(b));
}
const PLANE3 = planeInBox();
FIGS.ell3d = {
  size: [500, 540],
  draw(g, p) {
    const az = p.az * Math.PI / 180, el = p.el * Math.PI / 180, S = 52, cx = 250, cy = 280;
    const rt = [-Math.sin(az), Math.cos(az), 0], up = [-Math.sin(el) * Math.cos(az), -Math.sin(el) * Math.sin(az), Math.cos(el)];
    const view = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
    const dt = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], c0 = [2.5, 0, 2.5];
    const pr = q => { const d = q.map((v, k) => v - c0[k]); return [cx + S * dt(d, rt), cy - S * dt(d, up)]; };
    // the three axes along the box edges through the corner (0, -4, 0)
    const O = [0, -4, 0];
    [[[5, -4, 0], '$h_1=x_1^2$'], [[0, 4, 0], '$h_2=x_1x_2$'], [[0, -4, 5], '$h_3=x_2^2$']].forEach(([q, s], k) => {
      const [x1, y1] = pr(O), [x2, y2] = pr(q), L = Math.hypot(x2 - x1, y2 - y1) || 1;
      g.arrow([x1, y1], [x2, y2], { color: C.axis, w: 1.5 });
      g.label('ax' + k, sm(s, 20), [x2 + 30 * (x2 - x1) / L, y2 + 22 * (y2 - y1) / L], 'c', { color: '#444' });
    });
    // the box, faintly
    const [X, Yb, Z] = BOX3, cn = [];
    for (const u of X) for (const v of Yb) for (const w of Z) cn.push([u, v, w]);
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++)
      if (cn[i].filter((v, k) => v !== cn[j][k]).length === 1) g.line(pr(cn[i]), pr(cn[j]), { stroke: '#d8d8d8', 'stroke-width': 1 });
    // points behind the plane (as seen) first, then the plane, then the points in front
    const side = q => q[0] + q[1] + q[2] - 3, nd = dt(view, [1, 1, 1]);
    const behind = H3.filter(([q]) => side(q) * nd < 0), front = H3.filter(([q]) => side(q) * nd >= 0);
    const dot = ([q, y]) => { const [x, yy] = pr(q); g.el('circle', { cx: x, cy: yy, r: 7.5, fill: C[CLS(y)], stroke: '#fff', 'stroke-width': 1.5 }); };
    behind.forEach(dot);
    const poly = PLANE3.map(pr);
    g.path(poly, { close: true, fill: C.mle, 'fill-opacity': 0.16, stroke: C.mle, 'stroke-width': 2 });
    front.forEach(dot);
    g.el('rect', { x: 14, y: 516, width: 22, height: 14, fill: C.mle, 'fill-opacity': 0.25, stroke: C.mle });
    g.label('pl', sm('the plane $h_1+h_2+h_3=3$', 20), [44, 523], 'l', { color: C.mle });
  }
};

// ---------------------------------------------------------------- slide 11: two views of a linear network
FIGS.collapse = {
  size: [520, 420],
  draw(g, p) {
    g.net({ layers: [2, 2, 1], key: 'ex', r: 24,
      at: (l, i) => [[[70, 40], [230, 40]], [[70, 190], [230, 190]], [[150, 340]]][l][i],
      label: (l, i) => [['$x_1$', '$x_2$'], ['$h_1$', '$h_2$'], ['$\\hat y$']][l][i],
      weight: (l, i, j) => l === 0 ? (i === j ? { s: `$A_{${j + 1}${i + 1}}$`, t: 0.5, side: i ? -1 : 1, fs: 18 }
        : { s: `$A_{${j + 1}${i + 1}}$`, t: 0.24, side: 1, fs: 18 }) : { s: `$w_${i + 1}$`, t: 0.45, side: i ? -1 : 1, fs: 18 } });
    g.label('ext', sm('expanded', 20), [150, 404], 'c', { color: '#555' });
    g.net({ layers: [1, 1, 1], key: 'cp', r: 24,
      at: l => [[400, 40], [400, 190], [400, 340]][l],
      label: l => ['$\\bx$', '$\\bh$', '$\\hat y$'][l],
      weight: l => ({ s: l ? '$\\bw$' : '$\\bA,\\bc$', t: 0.5, fs: 20 }) });
    g.label('cpt', sm('compact', 20), [400, 404], 'c', { color: '#555' });
    g.label('cph', sm('$\\bh=\\bA\\bx+\\bc$'), [434, 190], 'l');
    g.label('cpy', sm('$\\hat y=\\bw^T\\bh+d$'), [434, 340], 'l');
  }
};

// ---------------------------------------------------------------- slide 12: one neuron, ReLU and sigmoid
FIGS.act = {
  size: [540, 560],
  draw(g, p) {
    g.net({ layers: [2, 1, 1], key: 'nr', r: 26,
      at: (l, i) => [[[70, 50], [70, 210]], [[270, 130]], [[460, 130]]][l][i],
      label: (l, i) => [['$x_1$', '$x_2$'], ['$z$'], ['$a$']][l][i],
      node: l => l === 2 ? { role: 'hid' } : {},
      weight: (l, i) => l === 0 ? { s: `$w_${i + 1}$`, t: 0.5 } : { s: '$g$', t: 0.5, fs: 24 } });
    g.label('nb', sm('$z=\\bw^T\\bx+b$', 20), [270, 172], 't');
    g.label('na', sm('$a=g(z)$', 20), [460, 172], 't');
    const pr = p.pr ?? 0;
    g.label('px1', sm('$2$', 20), [34, 50], 'r', { color: C.prior, opacity: pr });
    g.label('px2', sm('$-1$', 20), [34, 210], 'r', { color: C.prior, opacity: pr });
    g.label('pz', sm('$0$', 20), [270, 90], 'b', { color: C.prior, opacity: pr });
    const plot = (x0, f, name, yt, key) => {
      const P = g.plot(box2d(x0, 320, 210, 190, -4, 4, -0.2, yt[yt.length - 1] * 1.08));
      frameAxes(P, { ox: 0, oy: 0, xt: [-4, 4], yt, key, names: ['$z$', ''] });
      P.curve(f, { color: 'postC', w: 3.5, from: -4, to: 4 });
      g.label(key + 't', name, [x0 + 105, 302], 'b', { color: '#333' });
      P.dot([0, f(0)], { r: 6, color: 'prior', opacity: pr });
    };
    plot(30, relu, '$\\relu(z)=\\max(0,z)$', [2, 4], 'pr');
    plot(300, sigm, '$\\sigma(z)=\\dfrac{1}{1+e^{-z}}$', [0.5, 1], 'ps');
  }
};

// ---------------------------------------------------------------- slide 13: ReLU solves XOR
FIGS.reluXor = {
  size: [520, 570],
  draw(g, p) {
    g.net({ layers: [2, 2, 1], key: 'rx', r: 26,
      at: (l, i) => [[[130, 34], [390, 34]], [[130, 160], [390, 160]], [[260, 264]]][l][i],
      label: (l, i) => [['$x_1$', '$x_2$'], ['$h_1$', '$h_2$'], ['$\\hat y$']][l][i],
      weight: (l, i, j) => l === 0 ? (i === j ? { s: '$2$', t: 0.5, side: i ? -1 : 1, color: C.ink } : { s: '$2$', t: 0.22, side: 1, color: C.ink })
        : { s: i ? '$-3$' : '$+1$', t: 0.5, side: i ? -1 : 1, color: C.ink },
      bias: (l, i) => l === 1 ? ['$b_1=-1$', '$b_2=-3$'][i] : null });
    const P = g.plot(box2d(150, 326, 220, 230, -0.2, 1.15, -0.32, 1.15));
    P.rect([0, 0], [1, 1], { color: '#f4f4f4' });
    // where each unit turns on: 2 x1 + 2 x2 = 1 and 2 x1 + 2 x2 = 3
    P.line([-0.15, 0.65], [0.65, -0.15], { color: 'postC', w: 2.5, dash: true });
    P.line([0.35, 1.15], [1.15, 0.35], { color: 'postC', w: 2.5, dash: true });
    P.label('on1', sm('$h_1$ turns on'), [-0.15, 0.65], 'r', { dx: -6, color: '#8f5f00' });
    P.label('on2', sm('$h_2$ turns on'), [1.15, 0.35], 'l', { dx: 6, dy: 6, color: '#8f5f00' });
    xorSquare(P, [0, 1, 1, 0], { key: 'rq', lab: k => `$\\hat y=${[0, 1, 1, 0][k]}$` });
  }
};

// ---------------------------------------------------------------- slide 14: a 3-4-3-2 network
FIGS.mlp = {
  size: [560, 470],
  draw(g, p) {
    const cols = [60, 210, 360, 510];
    g.net({ layers: [3, 4, 3, 2], key: 'm', r: 22, box: [38, 40, 494, 340],
      label: (l, i) => l === 0 ? `$x_${i + 1}$` : l === 3 ? `$\\hat y_${i + 1}$` : '' });
    ['input', 'layer 1', 'layer 2', 'layer 3'].forEach((s, k) => g.label('c' + k, sm(s, 20), [cols[k], 410], 'c', { color: '#555' }));
    ['$\\bx=\\bh^{(0)}$', '$\\bh^{(1)}$', '$\\bh^{(2)}$', '$\\hat\\by=\\bh^{(3)}$'].forEach((s, k) =>
      g.label('h' + k, sm(s, 20), [cols[k], 446], 'c', { color: '#333' }));
    ['$\\bW^{(1)},\\bb^{(1)}$', '$\\bW^{(2)},\\bb^{(2)}$', '$\\bW^{(3)},\\bb^{(3)}$'].forEach((s, k) =>
      g.label('wl' + k, sm(s, 18), [(cols[k] + cols[k + 1]) / 2, 14], 'c', { color: '#333' }));
  }
};

// ---------------------------------------------------------------- slides 15 and 16: 5-10-10-3
FIGS.count = {
  size: [520, 520],
  draw(g, p) {
    const cols = [40, 190, 340, 480], st = p.st ?? 0;
    g.net({ layers: [5, 10, 10, 3], key: 'c', r: 12, box: [28, 20, 464, 400], gap: 40, head: 6, edgeW: 1, edgeColor: '#aaa' });
    ['5', '10', '10', '3'].forEach((s, k) => g.label('n' + k, sm(s, 22), [cols[k], 440], 'c', { color: '#333' }));
    ['60', '110', '33'].forEach((s, k) =>
      g.label('pc' + k, sm(s + ' parameters', 20), [(cols[k] + cols[k + 1]) / 2, 486], 'c', { color: C.prior, opacity: clamp(st - k) }));
  }
};

// ---------------------------------------------------------------- slides 17 to 19: the bipolar XOR network
// W = [[2, 2], [2, 2]], b = (-1, -3), w = (2, -6), d = -1
const BX = { W: [[2, 2], [2, 2]], b: [-1, -3], w: [2, -6], d: -1 };
function bxFwd(x) {
  const z = BX.W.map((r, i) => r[0] * x[0] + r[1] * x[1] + BX.b[i]), h = z.map(relu);
  return { z, h, y: BX.w[0] * h[0] + BX.w[1] * h[1] + BX.d };
}
const colv = v => `\\begin{pmatrix}${v.map(neg).join('\\\\')}\\end{pmatrix}`;
function bxNet(g, x, st, key) {
  const F = bxFwd(x), off = F.h.map(v => v === 0);
  const values = [{ l: 1, i: 0, s: `$z_1=${neg(F.z[0])}$`, at: 'r', dx: -4, dy: -22, stage: 1, color: C.prior },
    { l: 1, i: 1, s: `$z_2=${neg(F.z[1])}$`, at: 'r', dx: -4, dy: 22, stage: 1, color: C.prior }];
  off.forEach((o, i) => { if (o) values.push({ l: 1, i, s: sm('off', 18), at: i ? 'b' : 't', stage: 2, color: C.rose }); });
  g.net({ layers: [2, 2, 1], key, r: 25, stage: st,
    at: (l, i) => [[[70, 60], [70, 230]], [[260, 60], [260, 230]], [[440, 145]]][l][i],
    label: (l, i) => l === 0 ? `$${x[i]}$` : l === 1 ? (st >= 2 ? `$${neg(F.h[i])}$` : '') : (st >= 3 ? `$${neg(F.y)}$` : ''),
    node: (l, i) => l === 1 && off[i] && st >= 2 ? { dash: true, fo: 0.08 } : {},
    weight: (l, i, j) => l === 0 ? { s: '$2$', t: i === j ? 0.5 : 0.28, side: i === j ? (i ? -1 : 1) : 1, color: C.ink }
      : { s: i ? '$-6$' : '$2$', t: 0.5, side: i ? -1 : 1, color: C.ink },
    // offsets in the gap between the hidden units (b1 below h1, b2 above h2, where Farzad placed them) and
    // above the output: the left sides carry the incoming edges
    bias: (l, i) => l === 1 ? { s: `$b_${i + 1}=${BX.b[i]}$`, at: i ? 't' : 'b', dx: 14 } : l === 2 ? { s: '$d=-1$', at: 't' } : null,
    values });
  g.label(key + 'xl', sm('$\\bx$'), [70, 20], 'c', { color: '#555' });
  return F;
}
FIGS.fwd = {
  size: [520, 560],
  draw(g, p) {
    const st = p.st ?? 0, x = p.x ?? [0, 1], F = bxNet(g, x, st, 'f');
    // the pipeline: x -> Wx + b -> z -> ReLU -> h -> w^T h + d -> yhat
    const y0 = 400, bx = (cx, s, k, on) => {
      g.el('rect', { x: cx - 46, y: y0 - 26, width: 92, height: 52, rx: 8, fill: '#f1f1f1', stroke: '#888', 'stroke-width': 1.5 });
      g.label('op' + k, sm(s, 18), [cx, y0], 'c');
    };
    const vec = (cx, s, k, op) => g.label('pv' + k, s, [cx, y0], 'c', { color: C.prior, opacity: op });
    vec(28, `$${colv(x)}$`, 0, 1);
    bx(112, '$\\bW\\bx+\\bb$', 0); vec(198, `$${colv(F.z)}$`, 1, clamp(st));
    bx(282, '$\\relu$', 1); vec(366, `$${colv(F.h)}$`, 2, clamp(st - 1));
    bx(452, '$\\bw^T\\bh+d$', 2);
    g.label('pv3', `$${neg(F.y)}$`, [452, y0 + 64], 'c', { color: C.prior, opacity: clamp(st - 2) });
    [[52, 66], [158, 172], [224, 236], [328, 340], [390, 406]].forEach(([a, b]) => g.arrow([a, y0], [b, y0], { color: '#666', w: 2 }));
    g.arrow([452, y0 + 28], [452, y0 + 48], { color: '#666', w: 2 });
    ['$\\bx$', '$\\bz$', '$\\bh$'].forEach((s, k) => g.label('pn' + k, sm(s), [[28, 198, 366][k], y0 - 58], 'c', { color: '#555' }));
  }
};
FIGS.trace = {
  size: [520, 330],
  draw(g, p) { bxNet(g, [1, 1], p.st ?? 0, 't'); }
};
// slide 19: what each unit contributes over the unit square, w_i h_i + d/2, and their sum
FIGS.contrib = {
  size: [1080, 290],
  draw(g, p) {
    const parts = [
      ['$w_1h_1+d/2$', (a, b) => 2 * relu(2 * a + 2 * b - 1) - 0.5],
      ['$w_2h_2+d/2$', (a, b) => -6 * relu(2 * a + 2 * b - 3) - 0.5],
      ['$\\hat y=w_1h_1+w_2h_2+d$', (a, b) => bxFwd([a, b]).y]];
    parts.forEach(([name, f], k) => {
      const x0 = 40 + k * 360, B = box2d(x0, 40, 210, 210, -0.1, 1.1, -0.1, 1.1), P = g.plot(B);
      raster(g, B, 'contrib' + k, (a, b) => diverge(f(a, b) / 3, 0.7), 110, 110);
      if (k === 2) stroke(g, contourD(B, f, 0), { color: 'ink', w: 3 });
      frameAxes(P, { ox: -0.1, oy: -0.1, xt: [0, 1], yt: [0, 1], key: 'c' + k });
      [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b], j) => {
        P.dot([a, b], { r: 7, color: CLS(j === 1 || j === 2) });
        P.label(`v${k}-${j}`, sm('$' + neg(+f(a, b).toFixed(1)) + '$', 17), [a, b], (b ? 't' : 'b') + (a ? 'r' : 'l'), { dx: a ? -10 : 10, dy: b ? 10 : -10, color: '#222' });
      });
      g.label('t' + k, name, [x0 + 105, 30], 'b', { color: '#333' });
      g.label('xa' + k, sm('$x_1$'), [x0 + 228, 250], 'l', { color: '#444' });
      g.label('ya' + k, sm('$x_2$'), [x0 - 10, 30], 'r', { color: '#444' });
    });
  }
};

// ---------------------------------------------------------------- slide 20: many hinges make any curve
// Least-squares output weights for k ReLU units with hinges at 0, 1/k, ..., (k-1)/k, fitted on 1001
// equally spaced points to the bump exp(-(x - 1/2)^2 / (2 * 0.15^2)); k = 2^m.
const BUMP = x => Math.exp(-((x - 0.5) ** 2) / (2 * 0.15 ** 2));
const HX = Array.from({ length: 1001 }, (_, i) => i / 1000);
function solve(A, b) {   // Gaussian elimination with partial pivoting
  const n = b.length, M = A.map((r, i) => r.concat(b[i]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  return x;
}
const HFIT = {};
function hingeFit(k) {
  if (HFIT[k]) return HFIT[k];
  const ts = Array.from({ length: k }, (_, j) => j / k), feat = x => [1].concat(ts.map(t => relu(x - t)));
  const m = k + 1, A = Array.from({ length: m }, () => new Array(m).fill(0)), b = new Array(m).fill(0);
  HX.forEach(x => { const f = feat(x), y = BUMP(x); for (let i = 0; i < m; i++) { b[i] += f[i] * y; for (let j = 0; j < m; j++) A[i][j] += f[i] * f[j]; } });
  const c = solve(A, b), fn = x => feat(x).reduce((s, v, i) => s + v * c[i], 0);
  const err = HX.reduce((e, x) => Math.max(e, Math.abs(fn(x) - BUMP(x))), 0);
  return (HFIT[k] = { ts, c, fn, err });
}
FIGS.hinge = {
  size: [540, 430],
  draw(g, p) {
    const k = 2 ** Math.round(p.m), F = hingeFit(k), P = g.plot(box2d(56, 60, 440, 300, 0, 1, -0.2, 1.15));
    frameAxes(P, { ox: 0, oy: 0, xt: [0.5, 1], yt: [0.5, 1], names: ['$x$', ''], key: 'hx' });
    P.curve(BUMP, { color: C.mle, w: 3, dash: true, from: 0, to: 1 });
    P.curve(F.fn, { color: 'like', w: 3.5, from: 0, to: 1, n: 400 });
    F.ts.forEach((t, j) => P.line([t, -0.2], [t, -0.12], { color: 'postC', w: 3 }));
    g.label('ro', `$k=${k}$ unit${k > 1 ? 's' : ''}: largest error ${f3(F.err)}`, [276, 30], 'c', { color: C.like });
    P.label('tg', sm('target'), [0.62, BUMP(0.62)], 'l', { dx: 14, dy: -8, color: C.mle });
    g.label('hk', sm('hinge positions'), [56, 400], 'l', { color: '#8f5f00' });
    const sec = g.root.closest('section'), out = sec && sec.querySelector('.v-k');
    if (out && out.textContent !== String(k)) out.textContent = String(k);
  }
};

// ---------------------------------------------------------------- slide 22: the ellipse with 2, 3 and 4 hidden units
const EX = DATA.ellnets.X;
const ELLC = {};
const netLogit = n => (a, b) => n.w.reduce((s, w, j) => s + w * relu(n.W[j][0] * a + n.W[j][1] * b + n.b[j]), n.d);
FIGS.ellFit = {
  size: [1200, 330],
  draw(g, p) {
    const panels = [['n0h2', 'y0', '2 hidden units', '84%'], ['n0h3', 'y0', '3 hidden units', '96%'],
      ['n0h4', 'y0', '4 hidden units', '99%'], ['n20h4', 'y20', '4 units, 20% labels flipped', '79%']];
    panels.forEach(([nk, yk, name, acc], k) => g.group({ opacity: k === 3 ? p.nz ?? 1 : 1 }, () => {
      const x0 = 12 + k * 300, B = box2d(x0, 40, 260, 260, -3.2, 3.2, -3.2, 3.2), P = g.plot(B), f = netLogit(DATA.ellnets[nk]);
      const op = k === 3 ? p.nz ?? 1 : 1;
      raster(g, B, 'ell' + k, (a, b) => diverge(2 * sigm(f(a, b)) - 1, 0.45), 130, 130);
      const Y = DATA.ellnets[yk];
      EX.forEach((q, i) => g.el('circle', { cx: P.X(q[0]), cy: P.Y(q[1]), r: 2.3, fill: C[CLS(Y[i])], 'fill-opacity': 0.85 }));
      P.ellipse(ELLK, { stroke: '#333', 'stroke-dasharray': '3 4', 'stroke-width': 1.8 });
      if (!ELLC[nk]) ELLC[nk] = contourD(B, f, 0, 130, 130);
      stroke(g, ELLC[nk], { color: 'ink', w: 3 });
      g.el('rect', { x: B.x0, y: B.y0, width: B.W, height: B.H, fill: 'none', stroke: '#999', 'stroke-width': 1 });
      g.label('t' + k, sm(name, 20), [x0 + 130, 30], 'b', { color: '#333', opacity: op });
      g.label('a' + k, sm('training accuracy ' + acc, 20), [x0 + 130, 306], 't', { color: '#333', opacity: op });
    }));
  }
};

// ---------------------------------------------------------------- slide 23: stacking layers, two spirals
// data.js spirals (deck_numbers.py): 400 points and the 2-16-16-1 network's weights after 0, 300, 1000 and
// 5000 steps of gradient descent.  st: 0 to 3, the snapshot shown.
const SPS = DATA.spirals, SPT = ['0', '300', '1000', '5000'], SPC = {};
const spLogit = Q => (a, b) => {
  let h = [a, b];
  Q.W.forEach((W, l) => { h = W.map((r, j) => r.reduce((s, w, i) => s + w * h[i], Q.b[l][j])); if (l < Q.W.length - 1) h = h.map(relu); });
  return h[0];
};
FIGS.spiral = {
  size: [620, 510],
  draw(g, p) {
    const st = Math.round(clamp(p.st ?? 3, 0, 3)), key = SPT[st], Q = SPS.snaps[key], f = spLogit(Q);
    // the architecture, small: each layer's weights and offsets above the edges into it (its input side), as on slide 14
    const cols = [18, 92, 166, 240];
    g.net({ layers: [2, 16, 16, 1], key: 'sn', r: 7, box: [11, 70, 236, 370], gap: 23, arrows: false, edgeW: 0.5, edgeColor: '#c4c4c4' });
    ['$\\bW^{(1)},\\bb^{(1)}$', '$\\bW^{(2)},\\bb^{(2)}$', '$\\bW^{(3)},\\bb^{(3)}$'].forEach((s, k) =>
      g.label('sw' + k, sm(s, 15), [(cols[k] + cols[k + 1]) / 2, 52], 'c', { color: '#333' }));
    [['2', 'inputs'], ['16', 'ReLU'], ['16', 'ReLU'], ['1', 'sigmoid']].forEach(([n, s], k) =>
      g.label('sc' + k, `<div style="text-align:center;font-size:16px">${n}<br>${s}</div>`, [cols[k], 462], 't', { color: k === 1 || k === 2 ? '#8f5f00' : '#333' }));
    // the regions: predicted probability of class 1, the p = 1/2 boundary, the data
    const B = box2d(270, 80, 330, 330, -3.6, 3.6, -3.6, 3.6), P = g.plot(B);
    raster(g, B, 'sp' + key, (a, b) => diverge(2 * sigm(f(a, b)) - 1, 0.5), 150, 150);
    if (!SPC[key]) SPC[key] = contourD(B, f, 0, 150, 150);
    stroke(g, SPC[key], { color: 'ink', w: 2.5 });
    SPS.X.forEach((q, i) => g.el('circle', { cx: P.X(q[0]), cy: P.Y(q[1]), r: 3, fill: C[CLS(SPS.y[i])], stroke: '#fff', 'stroke-width': 0.6 }));
    g.el('rect', { x: B.x0, y: B.y0, width: B.W, height: B.H, fill: 'none', stroke: '#999', 'stroke-width': 1 });
    g.label('st', sm(`after ${Number(key).toLocaleString('en-US')} gradient-descent steps<br>training accuracy ${Math.round(100 * Q.acc)}%`, 18), [B.x0, 72], 'bl', { color: '#333' });
    g.label('sx', sm('$x_1$'), [B.x0 + B.W + 8, B.y0 + B.H], 'l', { color: '#444' });
    g.label('sy', sm('$x_2$'), [B.x0 - 6, B.y0 + 10], 'r', { color: '#444' });
  }
};

// ================================================================ part 2: backpropagation
// The running example (L16): a 2-2-1 ReLU network, x = (1, 2), y = 1, squared loss.
const BP = { w11: 2, w12: 1, w21: 1, w22: -1, b1: -1, b2: 0, v1: 1, v2: 2, d: 0 };
const BPK = ['w11', 'w12', 'w21', 'w22', 'b1', 'b2', 'v1', 'v2', 'd'];
function bp221(p, x, y) {
  const z1 = p.w11 * x[0] + p.w12 * x[1] + p.b1, z2 = p.w21 * x[0] + p.w22 * x[1] + p.b2;
  const h1 = relu(z1), h2 = relu(z2), yh = p.v1 * h1 + p.v2 * h2 + p.d, L = (yh - y) ** 2, gy = 2 * (yh - y);
  const g1 = gy * p.v1 * (z1 > 0), g2 = gy * p.v2 * (z2 > 0);
  return { z1, z2, h1, h2, yh, L, grad: [g1 * x[0], g1 * x[1], g2 * x[0], g2 * x[1], g1, g2, gy * h1, gy * h2, gy] };
}

// ---------------------------------------------------------------- slide 25: the weights are buried
FIGS.buried = {
  size: [560, 400],
  draw(g, p) {
    const nb = g.net({ layers: [2, 2, 1], key: 'b', r: 26,
      at: (l, i) => [[[60, 90], [60, 290]], [[250, 90], [250, 290]], [[400, 190]]][l][i],
      label: (l, i) => [['$x_1$', '$x_2$'], ['$h_1$', '$h_2$'], ['$\\hat y$']][l][i],
      weight: (l, i, j) => l === 0 ? (i === j ? { s: `$w_{${j + 1}${i + 1}}$`, t: 0.5, side: i ? -1 : 1 } : { s: `$w_{${j + 1}${i + 1}}$`, t: 0.25, side: i ? -1 : 1 })
        : { s: `$v_${i + 1}$`, t: 0.5, side: i ? -1 : 1 },
      bias: (l, i) => l === 1 ? `$b_${i + 1}$` : l === 2 ? '$d$' : null });
    // the loss
    g.el('circle', { cx: 510, cy: 190, r: 26, fill: '#fbe9ef', stroke: C.rose, 'stroke-width': 2 });
    g.label('L', '$\\cL$', [510, 190], 'c', { color: C.rose });
    g.arrow([428, 190], [482, 190], { color: '#777', w: 2 });
    g.el('rect', { x: 488, y: 300, width: 44, height: 32, rx: 6, fill: '#f1f1f1', stroke: '#777', 'stroke-width': 1.5 });
    g.label('y', '$y$', [510, 316], 'c');
    g.arrow([510, 298], [510, 218], { color: '#777', w: 2 });
    g.label('in', sm('input', 20), [60, 370], 'c', { color: '#555' }); g.label('hd', sm('hidden', 20), [250, 370], 'c', { color: '#555' });
    g.label('ou', sm('output', 20), [400, 370], 'c', { color: '#555' });
  }
};

// ---------------------------------------------------------------- slide 26: partial derivatives of z = u v
FIGS.impact = {
  size: [520, 330],
  draw(g, p) {
    g.cgraph({ key: 'im', stage: p.st, fs: 20, r: 24,
      nodes: { u: { at: [80, 80], kind: 'data', label: '$u$', w: 50 }, v: { at: [80, 250], kind: 'data', label: '$v$', w: 50 },
        m: { at: [270, 165], kind: 'op', label: '$\\times$' } },
      edges: [{ from: 'u', to: 'm', fwd: '$5$', bwd: '$1$', fs: 1, bs: 2 }, { from: 'v', to: 'm', fwd: '$1$', bwd: '$5$', fs: 1, bs: 2 },
        { from: 'm', to: [470, 165], fwd: '$z=5$', bwd: '$1$', fs: 1, bs: 2 }] });
    g.label('k1', sm('above: values', 18), [500, 280], 'r', { color: C.prior });
    g.label('k2', sm('below: partial derivatives', 18), [500, 306], 'r', { color: C.rose, opacity: clamp((p.st ?? 2) - 1) });
  }
};

// ---------------------------------------------------------------- slides 27 and 28: building blocks
// One block: inputs from the left into node `op` at (cx, cy), the output to the right.  ins: [[fwd, bwd], ...]
function block(g, key, cx, cy, op, ins, out, o = {}) {
  const span = o.span ?? 150, dy = o.dy ?? 46, n = ins.length, nodes = { m: { at: [cx, cy], kind: o.kind || 'op', label: op } };
  const edges = ins.map(([f, b], k) => ({ from: [cx - span, n === 1 ? cy : cy + (k ? dy : -dy)], to: 'm', fwd: f, bwd: b, pos: 0.42 }));
  edges.push({ from: 'm', to: [cx + span * 0.85, cy], fwd: out[0], bwd: out[1], pos: 0.55 });
  g.cgraph({ key, nodes, edges, fs: o.fs ?? 18, r: o.r ?? 20, opacity: o.opacity });
}
function blocksFig(rows, size) {
  return {
    size,
    draw(g, p) {
      const st = p.st ?? rows.length, H = (size[1] - 40) / rows.length;
      g.label('hg', '<b>General</b>', [560, 14], 'c', { color: '#333' });
      g.label('he', '<b>Example</b>', [960, 14], 'c', { color: '#333' });
      rows.forEach((r, k) => {
        const cy = 40 + H * (k + 0.5), op = clamp(st - k);
        g.label('n' + k, r.name, [0, cy - 16], 'l', { opacity: op });
        g.label('r' + k, sm(r.rule, 20), [0, cy + 20], 'l', { color: '#444', opacity: op });
        block(g, 'g' + k, 600, cy, r.op, r.gen[0], r.gen[1], { opacity: op, kind: r.kind });
        (r.ex || []).forEach((e, j) => block(g, `e${k}-${j}`, r.ex.length > 1 ? 880 + j * 220 : 1000, cy, r.op, e[0], e[1],
          { opacity: op, kind: r.kind, span: r.ex.length > 1 ? 95 : 150 }));
        (r.exl || []).forEach((s, j) => g.label(`x${k}-${j}`, sm(s, 18), [880 + j * 220, cy - 46], 'c', { color: '#555', opacity: op }));
        if (k) g.line([0, 40 + H * k], [size[0], 40 + H * k], { stroke: '#e4e4e4', 'stroke-width': 1 });
      });
    }
  };
}
FIGS.blocksA = blocksFig([
  { name: '<b>1. Addition</b> $z=u+v$', rule: 'passes the message to both inputs', op: '$+$',
    gen: [[['$u$', '$1$'], ['$v$', '$1$']], ['$z$', '$1$']], ex: [[[['$u=3$', '$1$'], ['$v=2$', '$1$']], ['$z=5$', '$1$']]] },
  { name: '<b>2. Multiplication</b> $z=uv$', rule: 'sends each input the other input', op: '$\\times$',
    gen: [[['$u$', '$v$'], ['$v$', '$u$']], ['$z$', '$1$']], ex: [[[['$u=3$', '$4$'], ['$v=4$', '$3$']], ['$z=12$', '$1$']]] },
  { name: '<b>3. Negation</b> $z=-u$', rule: 'flips the sign of the message', op: '$-$',
    gen: [[['$u$', '$-1$']], ['$z$', '$1$']], ex: [[[['$u=3$', '$-1$']], ['$z=-3$', '$1$']]] }
], [1200, 500]);
FIGS.blocksB = blocksFig([
  { name: '<b>4. ReLU</b> $z=\\max(0,u)$', rule: 'a gate: passes the message if $u>0$, blocks it if $u\\le0$', op: sm('ReLU', 15), kind: 'fn',
    gen: [[['$u$', '$1$ or $0$']], ['$z$', '$1$']], ex: [[[['$u=3$', '$1$']], ['$z=3$', '$1$']], [[['$u=-2$', '$0$']], ['$z=0$', '$1$']]], exl: ['on: $u=3$', 'off: $u=-2$'] },
  { name: '<b>5. Sigmoid</b> $z=\\sigma(u)$', rule: 'scales the message by $\\sigma(u)(1-\\sigma(u))$', op: '$\\sigma$', kind: 'fn',
    gen: [[['$u$', '$z(1-z)$']], ['$z$', '$1$']], ex: [[[['$u=0$', '$0.25$']], ['$z=0.5$', '$1$']]] },
  { name: '<b>6. Squaring</b> $z=u^2$', rule: 'scales the message by $2u$', op: '$(\\cdot)^2$', kind: 'fn',
    gen: [[['$u$', '$2u$']], ['$z$', '$1$']], ex: [[[['$u=3$', '$6$']], ['$z=9$', '$1$']]] },
  { name: '<b>Any incoming message</b> $c$', rule: 'scales every outgoing message by $c$', op: '$\\times$',
    gen: [[['$u$', '$c\\,v$'], ['$v$', '$c\\,u$']], ['$z$', '$c$']], ex: [[[['$u=3$', '$8$'], ['$v=4$', '$6$']], ['$z=12$', '$2$']]] }
], [1200, 515]);

// ---------------------------------------------------------------- slide 29: chaining blocks
FIGS.chain = {
  size: [600, 470],
  draw(g, p) {
    const st = p.st ?? 4;
    g.label('c1', '<b>Linear:</b> $v=3u$, then $z=2v$', [10, 22], 'l');
    g.cgraph({ key: 'ca', stage: st, fs: 20, r: 22,
      nodes: { a: { at: [230, 120], kind: 'op', label: '$\\times3$', r: 26 }, b: { at: [430, 120], kind: 'op', label: '$\\times2$', r: 26 } },
      edges: [{ from: [70, 120], to: 'a', fwd: '$u$', bwd: '$6$', fs: 0, bs: 2 }, { from: 'a', to: 'b', fwd: '$v$', bwd: '$2$', fs: 0, bs: 1 },
        { from: 'b', to: [580, 120], fwd: '$z$', bwd: '$1$', fs: 0, bs: 1 }] });
    g.label('c2', '<b>Nonlinear:</b> $s=u^2$, then $z=-s$, at $u=3$', [10, 262], 'l', { opacity: clamp(st - 2) });
    g.cgraph({ key: 'cb', stage: st - 2, fs: 20, r: 22, opacity: clamp(st - 2),
      nodes: { a: { at: [230, 360], kind: 'fn', label: '$(\\cdot)^2$' }, b: { at: [430, 360], kind: 'op', label: '$-$', r: 26 } },
      edges: [{ from: [70, 360], to: 'a', fwd: '$u=3$', bwd: '$-6$', fs: 0, bs: 2 }, { from: 'a', to: 'b', fwd: '$s=9$', bwd: '$-1$', fs: 0, bs: 1 },
        { from: 'b', to: [580, 360], fwd: '$z=-9$', bwd: '$1$', fs: 0, bs: 1 }] });
  }
};
// slide 30: branching, z = u (a + b)
FIGS.branch = {
  size: [560, 420],
  draw(g, p) {
    g.cgraph({ key: 'br', stage: p.st, fs: 20, r: 24,
      nodes: { u: { at: [70, 70], kind: 'data', label: '$u=5$', w: 76 }, a: { at: [70, 240], kind: 'data', label: '$a=3$', w: 76 },
        b: { at: [70, 360], kind: 'data', label: '$b=1$', w: 76 }, s: { at: [260, 300], kind: 'op', label: '$+$' }, m: { at: [400, 190], kind: 'op', label: '$\\times$' } },
      edges: [{ from: 'u', to: 'm', fwd: '$5$', bwd: '$4$', fs: 1, bs: 2 }, { from: 'a', to: 's', fwd: '$3$', bwd: '$5$', fs: 1, bs: 3, pos: 0.35 },
        { from: 'b', to: 's', fwd: '$1$', bwd: '$5$', fs: 1, bs: 3, side: -1, pos: 0.35 }, { from: 's', to: 'm', fwd: '$v=4$', bwd: '$5$', fs: 1, bs: 2 },
        { from: 'm', to: [540, 190], fwd: '$z=20$', bwd: '$1$', fs: 1, bs: 2 }] });
  }
};

// ---------------------------------------------------------------- slide 31: backpropagation in the full network
// Intro to ML's L16 frame 24, node for node: TikZ coordinates mapped to pixels.
const FX = x => 34 + x * 56.5, FY = y => 260 - y * 58;
const FN = (x, y, kind, label, w) => ({ at: [FX(x), FY(y)], kind, label, w });
const FULLN = {
  x1: FN(0.23, 0.60, 'data', '$x_1=1$', 70), x2: FN(0.23, -0.20, 'data', '$x_2=2$', 70),
  w11: FN(0.42, 3.80, 'param', '$w_{11}=2$', 82), w12: FN(3.60, 0.60, 'param', '$w_{12}=1$', 82), w21: FN(3.60, -0.20, 'param', '$w_{21}=1$', 82),
  w22: FN(0.13, -3.73, 'param', '$w_{22}=-1$', 92), b1: FN(6.33, 1.35, 'param', '$b_1=-1$', 80), b2: FN(6.05, -1.23, 'param', '$b_2=0$', 70),
  v1: FN(9.50, 3.50, 'param', '$v_1=1$', 70), v2: FN(9.74, -3.55, 'param', '$v_2=2$', 70), d: FN(12.49, 2.55, 'param', '$d=0$', 62),
  m1: FN(3.26, 3.88, 'op', '$\\times$'), m2: FN(4.77, 2.77, 'op', '$\\times$'), a1: FN(7.30, 3.70, 'op', '$+$'),
  r1: FN(8.40, 1.43, 'fn', sm('ReLU', 14)), m5: FN(10.84, 1.48, 'op', '$\\times$'),
  m3: FN(4.60, -2.40, 'op', '$\\times$'), m4: FN(3.33, -3.80, 'op', '$\\times$'), a2: FN(7.08, -3.33, 'op', '$+$'),
  r2: FN(8.50, -1.23, 'fn', sm('ReLU', 14)), m6: FN(11.09, -1.25, 'op', '$\\times$'),
  a3: FN(13.91, -0.03, 'op', '$+$'), ng: FN(16.04, -1.65, 'op', '$-$'), ae: FN(16.00, 0.00, 'op', '$+$'),
  sq: FN(18.00, 0.00, 'fn', '$(\\cdot)^2$'), yt: FN(16.06, -3.30, 'data', '$y=1$', 56)
};
// [from, to, forward, backward, backward stage, pos]: stage 2 the output layer, 3 the hidden values
// through the gates, 4 the first-layer parameters
const FULLE = [
  ['w11', 'm1', '2', '4', 4], ['w12', 'm2', '1', '8', 4], ['w21', 'm3', '1', '0', 4], ['w22', 'm4', '-1', '0', 4],
  ['x1', 'm1', '1', null, 0, 0.3], ['x2', 'm2', '2', null, 0, 0.3], ['x1', 'm3', '1', null, 0, 0.3], ['x2', 'm4', '2', null, 0, 0.3],
  ['m1', 'a1', '2', '4', 4, 0.3], ['m2', 'a1', '2', '4', 4], ['b1', 'a1', '-1', '4', 4],
  ['m3', 'a2', '1', '0', 4], ['m4', 'a2', '-2', '0', 4, 0.3], ['b2', 'a2', '0', '0', 4, 0.62],
  ['a1', 'r1', 'z_1=3', '4', 3], ['a2', 'r2', 'z_2=-1', '0', 3, 0.8],
  ['r1', 'm5', 'h_1=3', '4', 3], ['r2', 'm6', 'h_2=0', '8', 3],
  ['v1', 'm5', '1', '12', 2], ['v2', 'm6', '2', '0', 2],
  ['m5', 'a3', '3', '4', 2, 0.4], ['m6', 'a3', '0', '4', 2, 0.4], ['d', 'a3', '0', '4', 2],
  ['a3', 'ae', '\\hat y=3', '4', 2], ['yt', 'ng', '1', null, 0], ['ng', 'ae', '-1', '4', 2],
  ['ae', 'sq', 'e=2', '4', 2], ['sq', [FX(20), FY(0)], '\\cL=4', '1', 2]
];
FIGS.full = {
  size: [1200, 500],
  draw(g, p) {
    const m = s => s == null ? null : '$' + s.replace(/(^|=)-/g, '$1-') + '$';
    g.cgraph({ key: 'fu', stage: p.st, fs: 17, r: 17, off: 6, nodes: FULLN,
      edges: FULLE.map(([a, b, f, w, bs, pos]) => ({ from: a, to: b, fwd: m(f), bwd: m(w), fs: 1, bs, pos: pos ?? 0.5 })) });
    // left-anchored: a label anchored at its right end beside a figure placed directly in the body
    // widens the printed page in Chrome, which then shrinks every page
    g.label('k1', sm('above each edge: forward value', 18), [860, 30], 'l', { color: C.prior, opacity: clamp(p.st ?? 1) });
    g.label('k2', sm('below: backward message $\\partial\\cL/\\partial(\\cdot)$', 18), [860, 56], 'l', { color: C.rose, opacity: clamp((p.st ?? 1) - 1) });
  }
};

// ================================================================ part 3: training that works
// ---------------------------------------------------------------- slide 34: one gradient step, loss against eta
const BPG = bp221(BP, [1, 2], 1).grad;
const stepLoss = eta => { const q = {}; BPK.forEach((k, i) => { q[k] = BP[k] - eta * BPG[i]; }); return bp221(q, [1, 2], 1); };
const etaOf = le => +(10 ** le).toPrecision(2);
FIGS.step = {
  size: [560, 470],
  draw(g, p) {
    const eta = etaOf(p.le), S = stepLoss(eta), B = box2d(70, 70, 440, 300, -3, 0, 0, 6), P = g.plot(B);
    frameAxes(P, { ox: -3, oy: 0, xt: [-3, -2, -1, 0], xf: v => ['0.001', '0.01', '0.1', '1'][v + 3], yt: [2, 4, 6], key: 'st' });
    g.label('xn', '$\\eta$ (log scale)', [B.X(-1.5), B.Y(0) + 44], 'c', { color: '#444' });
    g.label('yn', sm('loss after one step', 20), [B.X(-3) - 10, B.Y(6) - 24], 'l', { color: '#444' });
    P.line([-3, 4], [0, 4], { stroke: '#bbb', 'stroke-dasharray': '4 4', 'stroke-width': 1.5 });
    P.label('l4', sm('before: 4'), [-3, 4], 'bl', { dx: 6, dy: -4, color: '#777' });
    P.curve(le => Math.max(0, 4 - 256 * 10 ** le), { color: C.mle, w: 2.5, dash: true, from: -3, to: Math.log10(4 / 256), n: 120 });
    P.label('lin', sm('dashed: first order'), [-2.97, 0.4], 'l', { color: C.mle });
    P.curve(le => stepLoss(10 ** le).L, { color: 'rose', w: 3.5, from: -3, to: 0, n: 400 });
    const yv = Math.min(S.L, 6);
    P.line([Math.log10(eta), 0], [Math.log10(eta), yv], { stroke: C.rose, 'stroke-dasharray': '3 4', 'stroke-width': 1.5 });
    if (S.L <= 6) P.dot([Math.log10(eta), S.L], { r: 7, color: 'rose' });
    else P.g.arrow([B.X(Math.log10(eta)), B.Y(5.2)], [B.X(Math.log10(eta)), B.Y(6) - 4], { color: C.rose, w: 2.5, head: 12 });
    g.label('ro', `$\\eta=${eta}$: loss ${f2(S.L)}, $h_1=${f2(S.h1)}$, $h_2=${f2(S.h2)}$`, [290, 14], 'c', { color: C.rose });
    const sec = g.root.closest('section'), out = sec && sec.querySelector('.v-eta');
    if (out && out.textContent !== String(eta)) out.textContent = String(eta);
  }
};

// ---------------------------------------------------------------- slide 36: the training loop
FIGS.loop = {
  size: [460, 420],
  draw(g, p) {
    const box = (key, x, y, s, fill, stroke) => { g.el('rect', { x: x - 80, y: y - 26, width: 160, height: 52, rx: 10, fill, stroke, 'stroke-width': 2 });
      g.label(key, s, [x, y], 'c'); };
    box('i', 230, 40, 'initialize $\\btheta$', '#f1f1f1', '#777');
    g.arrow([230, 68], [230, 104], { color: '#666', w: 2 });
    box('f', 230, 132, 'forward', '#e3ecf7', C.prior);
    g.arrow([230, 160], [230, 196], { color: '#666', w: 2 });
    box('l', 230, 224, 'loss $\\cL$', '#fbe9ef', C.rose);
    g.arrow([230, 252], [230, 288], { color: '#666', w: 2 });
    box('b', 230, 316, 'backward', '#fbe9ef', C.rose);
    g.arrow([230, 344], [230, 376], { color: '#666', w: 2 });
    box('u', 230, 396 - 2, 'update $\\btheta$', '#f1f1f1', '#777');
    g.path([[310, 394], [400, 394], [400, 132], [318, 132]], { stroke: '#666', 'stroke-width': 2 });
    g.el('path', { d: arrowHeadD(330, 132, 312, 132, 11), fill: '#666' });
    g.label('rp', sm('next batch', 18), [408, 262], 'l', { color: '#555' });
  }
};

// ---------------------------------------------------------------- slides 37 and 38: 6,000 images in batches of 200, 5 epochs
FIGS.epochs = {
  size: [1080, 300],
  draw(g, p) {
    const st = p.st ?? 0, x0 = 120, W = 900, h = 30, nb = 30, bw = W / nb;
    for (let e = 0; e < 5; e++) {
      const y = 30 + e * 52, op = e === 0 ? 1 : clamp(st - 1);
      g.el('rect', { x: x0, y, width: W, height: h, rx: 4, fill: C.prior, 'fill-opacity': 0.12, stroke: C.prior, 'stroke-width': 1.5, opacity: op });
      for (let b = 1; b < nb; b++) g.line([x0 + b * bw, y], [x0 + b * bw, y + h], { stroke: C.prior, 'stroke-width': 1, opacity: e === 0 ? clamp(st) : op });
      g.label('e' + e, sm(`epoch ${e + 1}`, 20), [x0 - 12, y + h / 2], 'r', { color: '#444', opacity: e === 0 ? clamp(st - 1) : op });
    }
    g.label('all', sm('all 6,000 images', 20), [x0 + W / 2, 30 + h / 2], 'c', { color: '#333', opacity: 1 - clamp(st) });
    g.label('bt', sm('one batch of 200 images: one iteration', 20), [x0 + bw / 2, 30 + h + 6], 'tl', { dx: -bw / 2, color: C.prior, opacity: clamp(st) - clamp(st - 1) });
  }
};

// ---------------------------------------------------------------- slide 39: minibatch gradient estimates
FIGS.mbest = {
  size: [580, 400],
  draw(g, p) {
    const M = DATA.minibatch, B = box2d(90, 40, 460, 300, -7, 9, 0, 3.6), P = g.plot(B), rnd = mulberry32(36);
    frameAxes(P, { ox: -7, oy: 0, xt: [-6, -3, 0, 3, 6, 9], key: 'mb' });
    g.label('xn', sm('estimate of $\\partial\\cL/\\partial d$', 20), [B.X(1), B.Y(0) + 44], 'c', { color: '#444' });
    P.line([M.full, 0], [M.full, 3.6], { color: 'ink', w: 2.5 });
    P.label('fu', sm(`full data: ${M.full}`), [M.full, 3.6], 'b', { dy: -4 });
    ['1', '4', '16'].forEach((b, k) => {
      const yc = 3 - k, sd = M.sd / Math.sqrt(+b), op = clamp((p.st ?? 3) - k);
      P.g.group({ opacity: op }, () => {
        P.rect([M.full - sd, yc - 0.32], [M.full + sd, yc + 0.32], { color: C.rose, 'fill-opacity': 0.1 });
        M[b].forEach(v => P.dot([v, yc + (rnd() - 0.5) * 0.45], { r: 4.5, color: 'rose', outline: false, 'fill-opacity': 0.75 }));
      });
      g.label('bl' + k, sm(`$B=${b}$`, 22), [B.X(-7) - 12, B.Y(yc)], 'r', { opacity: op });
      g.label('sd' + k, sm(`sd ${f2(sd)}`, 18), [B.X(9) + 8, B.Y(yc)], 'l', { color: C.rose, opacity: op });
    });
  }
};

// ---------------------------------------------------------------- slide 40: activation scale through 10 ReLU layers
// The plan's simulation (width 100, input 1000 x 100 standard normal), its run at n sigma^2 = 2; the same
// weights scaled give every n sigma^2 = a exactly: layer l's activations scale by (a / 2)^(l / 2).
const INIT2 = DATA.init_sd2;
FIGS.init = {
  size: [560, 470],
  draw(g, p) {
    const a = p.a, B = box2d(80, 84, 430, 320, 0.5, 10.5, -2, 2), P = g.plot(B);
    frameAxes(P, { ox: 0.5, oy: -2, xt: [1, 2, 4, 6, 8, 10], yt: [-2, -1, 0, 1, 2], yf: v => ['0.01', '0.1', '1', '10', '100'][v + 2], key: 'in' });
    g.label('xn', sm('layer', 20), [B.X(5.5), B.Y(-2) + 44], 'c', { color: '#444' });
    g.label('yn', sm('activation standard deviation (log scale)', 20), [B.X(0.5) - 10, B.Y(2) - 26], 'l', { color: '#444' });
    for (const [aa, col] of [[1, '#bbb'], [2, '#bbb'], [4, '#bbb']]) if (Math.abs(aa - a) > 1e-6)
      P.path(INIT2.map((s, l) => [l + 1, Math.log10(s * (aa / 2) ** ((l + 1) / 2))]), { stroke: col, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
    const pts = INIT2.map((s, l) => [l + 1, Math.log10(s * (a / 2) ** ((l + 1) / 2))]);
    P.path(pts.map(q => [q[0], clamp(q[1], -2, 2)]), { stroke: C.postC, 'stroke-width': 3.5 });
    pts.forEach(q => { if (q[1] >= -2 && q[1] <= 2) P.dot(q, { r: 5.5, color: 'postC' }); });
    const last = INIT2[9] * (a / 2) ** 5;
    g.label('ro', `$n\\sigma^2=${fmt(a, 2)}$: layer-10 standard deviation ${last < 0.1 ? f3(last) : f2(last)}`, [295, 14], 'c', { color: '#8f5f00' });
  }
};

// ---------------------------------------------------------------- slide 42: three fixes, small pictures
FIGS.esFig = {
  size: [330, 170],
  draw(g, p) {
    const P = g.plot(box2d(20, 20, 290, 120, 0, 10, 0, 1));
    frameAxes(P, { key: 'es' });
    P.curve(t => 0.85 * Math.exp(-t / 2.2) + 0.05, { color: C.prior, w: 2.5, from: 0, to: 10 });
    P.curve(t => 0.8 * Math.exp(-t / 2.2) + 0.012 * (t - 3) ** 2 + 0.18, { color: C.rose, w: 2.5, from: 0, to: 10 });
    P.line([3.6, 0], [3.6, 0.95], { color: 'like', w: 2, dash: true });
    P.label('st', sm('stop'), [3.6, 0.95], 'l', { dx: 4, color: C.like });
    P.label('tr', sm('train'), [9.6, 0.1], 'b', { dy: -2, color: C.prior });
    P.label('va', sm('validation'), [9.6, 0.62], 'b', { dy: -4, color: C.rose });
    g.label('ep', sm('epochs (illustrative)', 16), [165, 160], 'c', { color: '#666' });
  }
};
FIGS.dropFig = {
  size: [330, 170],
  draw(g, p) {
    const off = { '1-1': 1, '1-3': 1, '2-0': 1, '2-2': 1 };
    g.net({ layers: [3, 4, 4, 1], key: 'do', r: 11, box: [20, 8, 290, 150], head: 6, edgeW: 1.2,
      node: (l, i) => off[`${l}-${i}`] ? { cross: true, opacity: 0.45 } : {},
      edge: (l, i, j) => (off[`${l}-${i}`] || off[`${l + 1}-${j}`]) ? { hide: true } : {} });
  }
};
FIGS.wdFig = {
  size: [330, 170],
  draw(g, p) {
    const P = g.plot(box2d(20, 20, 290, 120, -3, 3, 0, 0.45));
    frameAxes(P, { ox: 0, oy: 0, key: 'wd' });
    P.density(x => phi(x, 0, 1), { color: 'prior', w: 2.5, from: -3, to: 3 });
    P.label('pr', sm('prior $\\cN(0,\\lambda^{-1})$'), [1.1, phi(1.1, 0, 1)], 'l', { dx: 8, color: C.prior });
    g.label('th', sm('$\\theta_k$', 18), [312, 140], 'l', { color: '#444' });
  }
};

// ---------------------------------------------------------------- slide 43: double descent (schematic)
FIGS.ddesc = {
  size: [560, 420],
  draw(g, p) {
    const B = box2d(60, 40, 460, 290, 0, 10, 0, 1), P = g.plot(B), T = 4;
    frameAxes(P, { key: 'dd' });
    g.label('xn', sm('model size (parameters)', 20), [B.X(5), B.Y(0) + 30], 'c', { color: '#444' });
    g.label('yn', sm('error', 20), [B.X(0) - 8, B.Y(1) - 18], 'l', { color: '#444' });
    P.rect([T - 0.6, 0], [T + 0.6, 1], { color: C.rose, 'fill-opacity': 0.08 });
    const test = m => (m < T ? 0.33 + 0.22 * (m / 1.8 - 1) ** 2 : 0.12 + 0.539 * Math.exp(-(m - T) / 1.4)) + 0.22 * Math.exp(-(((m - T) / 0.5) ** 2));
    const train = m => m < T ? 0.5 * (1 - m / T) ** 1.5 : 0;
    P.curve(train, { color: C.prior, w: 3, from: 0.2, to: 10 });
    P.curve(test, { color: C.rose, w: 3.5, from: 0.2, to: 10, n: 400 });
    P.label('te', sm('test error'), [8.6, test(8.6)], 'b', { dy: -8, color: C.rose });
    P.label('tr', sm('training error'), [2.2, train(2.2)], 'tr', { dx: -8, dy: 8, color: C.prior });
    P.label('it', sm('interpolation<br>threshold'), [T + 0.65, 0.97], 'tl', { color: C.rose });
    P.label('cl', sm('classical regime'), [1.8, 0.92], 'c', { color: '#555' });
    P.label('mo', sm('large models'), [8.6, 0.6], 'c', { color: '#555' });
    g.label('cite', sm('schematic, after Nakkiran et al., ICLR 2020', 16), [520, 404], 'r', { color: '#666' });
  }
};

// ---------------------------------------------------------------- slides 44 and 45: calibration
FIGS.calib = {
  size: [480, 470],
  draw(g, p) {
    const B = box2d(70, 40, 370, 370, 0, 1, 0, 1), P = g.plot(B), st = p.st ?? 2;
    frameAxes(P, { xt: [0, 0.5, 1], yt: [0.5, 1], key: 'ca' });
    g.label('xn', sm('confidence of the prediction', 20), [B.X(0.5), B.Y(0) + 44], 'c', { color: '#444' });
    g.label('yn', sm('fraction correct', 20), [B.X(0) - 8, B.Y(1) - 18], 'l', { color: '#444' });
    P.line([0, 0], [1, 1], { stroke: '#999', 'stroke-dasharray': '6 5', 'stroke-width': 2 });
    P.label('di', sm('calibrated'), [0.18, 0.18], 'tl', { dx: 6, dy: 4, color: '#777' });
    [[0.5, 0.45], [0.9, 0.6]].forEach(([c, a], k) => P.g.group({ opacity: clamp(st - k) }, () => {
      P.rect([c - 0.05, 0], [c + 0.05, a], { color: C.pred, 'fill-opacity': 0.55 });
      P.rect([c - 0.05, Math.min(a, c)], [c + 0.05, Math.max(a, c)], { color: C.rose, 'fill-opacity': 0.25 });
    }));
    P.label('g1', sm('gap 0.05'), [0.5, 0.5], 'b', { dy: -6, color: C.rose, opacity: clamp(st) });
    P.label('g2', sm('gap 0.3'), [0.9, 0.9], 'b', { dy: -6, color: C.rose, opacity: clamp(st - 1) });
  }
};
FIGS.logloss = {
  size: [520, 440],
  draw(g, p) {
    const pp = 0.7, B = box2d(70, 40, 400, 320, 0, 1, 0, 1.6), P = g.plot(B);
    const E = q => -(pp * Math.log(q) + (1 - pp) * Math.log(1 - q)), H = E(pp);
    frameAxes(P, { xt: [0.5, 0.7, 0.9, 1], yt: [0.5, 1, 1.5], key: 'll' });
    g.label('xn', sm('predicted probability $q$ of $y=1$', 20), [B.X(0.5), B.Y(0) + 44], 'c', { color: '#444' });
    g.label('yn', sm('expected loss (nats), $p=0.7$', 20), [B.X(0) - 8, B.Y(1.6) - 18], 'l', { color: '#444' });
    P.area(E, { color: C.rose, fo: 0.15, base: H, from: 0.05, to: 0.97 });
    P.line([0, H], [1, H], { stroke: C.mle, 'stroke-dasharray': '6 5', 'stroke-width': 2 });
    P.label('h', sm('$H(p)$'), [0.02, H], 'bl', { dy: -4, color: C.mle });
    P.curve(E, { color: C.rose, w: 3.5, from: 0.05, to: 0.97 });
    P.label('d', sm('$D(p\\,\\|\\,q)$'), [0.3, (E(0.3) + H) / 2 - 0.04], 'c', { color: C.rose });
    [0.5, 0.7, 0.9].forEach((q, k) => { P.dot([q, E(q)], { r: 6.5, color: 'rose' }); P.label('v' + k, sm(f3(E(q))), [q, E(q)], 'b', { dy: -10, color: C.rose }); });
  }
};

// ---------------------------------------------------------------- summary icons
Object.assign(ICONS, {
  feat(svg) {
    const xs = [14, 55, 96], ys = [[22, 46], [14, 34, 54], [34]];
    ys[0].forEach(a => ys[1].forEach(b => el(svg, 'line', { x1: xs[0], y1: a, x2: xs[1], y2: b, stroke: '#999', 'stroke-width': 1.2 })));
    ys[1].forEach(b => el(svg, 'line', { x1: xs[1], y1: b, x2: xs[2], y2: 34, stroke: '#999', 'stroke-width': 1.2 }));
    ys.forEach((col, k) => col.forEach(y => el(svg, 'circle', { cx: xs[k], cy: y, r: 7, fill: k === 1 ? '#f2dfb3' : k === 2 ? '#c7e3c7' : '#fff',
      stroke: k === 1 ? '#8f5f00' : k === 2 ? '#005c1e' : C.ink, 'stroke-width': 1.6 })));
  },
  graph(svg) {
    el(svg, 'line', { x1: 10, y1: 32, x2: 90, y2: 32, stroke: '#555', 'stroke-width': 2 });
    [32, 70].forEach(x => el(svg, 'circle', { cx: x, cy: 32, r: 10, fill: '#fff', stroke: C.ink, 'stroke-width': 2 }));
    el(svg, 'text', { x: 52, y: 22, 'text-anchor': 'middle', 'font-size': 13, fill: C.prior }).textContent = '3';
    el(svg, 'text', { x: 52, y: 52, 'text-anchor': 'middle', 'font-size': 13, fill: C.rose }).textContent = '4';
    el(svg, 'path', { d: arrowHeadD(80, 32, 100, 32, 9), fill: '#555' });
  },
  train(svg) {
    let d = '';
    for (let i = 0; i <= 40; i++) { const t = i / 40; d += (i ? 'L' : 'M') + (8 + 94 * t).toFixed(1) + ',' + (56 - 46 * Math.exp(-4 * t) - 4).toFixed(1); }
    el(svg, 'line', { x1: 6, y1: 58, x2: 104, y2: 58, stroke: C.axis, 'stroke-width': 1.5 });
    el(svg, 'path', { d, fill: 'none', stroke: C.rose, 'stroke-width': 3 });
  },
  calib(svg) {
    el(svg, 'line', { x1: 10, y1: 58, x2: 100, y2: 58, stroke: C.axis, 'stroke-width': 1.5 });
    el(svg, 'line', { x1: 10, y1: 58, x2: 70, y2: 6, stroke: '#999', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' });
    [[30, 18], [52, 36], [74, 50]].forEach(([x, h]) => el(svg, 'rect', { x: x - 8, y: 58 - h, width: 16, height: h, fill: C.pred, 'fill-opacity': 0.55, stroke: C.pred }));
  }
});
