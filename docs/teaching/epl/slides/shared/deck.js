// Shared engine of the PML HTML decks (reveal.js 5 + KaTeX + SVG in plain JS).
// Load after reveal.js, katex.min.js and auto-render.min.js; the deck then
// registers its figures in FIGS (and icons in ICONS) and calls startDeck().
//
// Print states.  A figure (.fig[data-fig]) draws itself from a parameter
// object: its data-init, overridden in fragment order by the data-set JSON of
// every *visible* fragment on its slide.  Presenting, a fragment step tweens
// the parameters to the new state; printing (?print-pdf), each cloned page is
// drawn directly in its own state.  Nothing else about a figure is stored.

const PRINT = /print-pdf/i.test(location.search);
const MACROS = { '\\E': '\\operatorname{\\mathbb{E}}', '\\cN': '\\mathcal{N}' };
const C = { prior: '#2354A8', like: '#008000', post: '#B30000', postC: '#CC8800',
  pred: '#762A83', mle: '#616161', teal: '#087F80', rose: '#B33362', brown: '#A0521B',
  grid: '#ececec', axis: '#8a8a8a', ink: '#222' };
const NS = 'http://www.w3.org/2000/svg';

function el(parent, tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e); return e;
}
function attr(e, attrs) { for (const k in attrs) e.setAttribute(k, attrs[k]); }
const $ = (root, cls) => root.querySelector('.' + cls);
const $$ = (root, cls) => root.querySelectorAll('.' + cls);
const fmt = (v, d = 2) => { let s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
  if (d > 0) s = s.replace(/\.?0+$/, '');   // trailing zeros of the decimals only
  return s === '-0' ? '0' : s; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const phi = (x, m, v) => Math.exp(-(x - m) * (x - m) / (2 * v)) / Math.sqrt(2 * Math.PI * v);
const minus = v => v < 0 ? '−' + -v : '' + v;

// Text with $math$ segments, rendered by KaTeX.
function rich(s) {
  return s.split('$').map((part, i) => i % 2
    ? katex.renderToString(part, { macros: MACROS, throwOnError: false }) : part).join('');
}
const ANCHOR = { l: 'translate(0,-50%)', r: 'translate(-100%,-50%)', t: 'translate(-50%,0)',
  b: 'translate(-50%,-100%)', c: 'translate(-50%,-50%)', bl: 'translate(0,-100%)',
  br: 'translate(-100%,-100%)', tl: 'translate(0,0)', tr: 'translate(-100%,0)' };
// A label's offset from its computed place, set by dragging it in the
// localtools viewer: the figure's data-nudge='{"key":[dx,dy]}'.
function nudge(root, key) {
  const f = root.closest('.fig[data-fig]') || root, s = f.dataset.nudge || '';
  if (f._nudgeSrc !== s) {
    try { f._nudge = s ? JSON.parse(s) : {}; } catch (e) { f._nudge = {}; }
    if (!f._nudge || typeof f._nudge !== 'object') f._nudge = {};
    f._nudgeSrc = s;
  }
  // a hand edit that is not two numbers leaves the label where it was computed
  const v = f._nudge[key];
  return Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) ? v : [0, 0];
}
// An HTML label over the figure, in the SVG's pixel coordinates.
function label(root, key, s, x, y, anchor = 'l', color = C.ink, opacity = 1) {
  const [dx, dy] = nudge(root, key);
  x += dx; y += dy;
  let d = root.querySelector(`.lab[data-k="${key}"]`);
  if (!d) { d = document.createElement('div'); d.className = 'lab'; d.dataset.k = key; root.appendChild(d); }
  if (d.dataset.s !== s) { d.innerHTML = rich(s); d.dataset.s = s; }
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.transform = ANCHOR[anchor];
  d.style.color = color; d.style.opacity = opacity;
  d.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
}

// Fixed seeded samples, so the HTML and the PDF show the same points.
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function normals(seed, n) {   // n pairs of iid N(0,1), Box-Muller
  const rnd = mulberry32(seed), out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(-2 * Math.log(Math.max(rnd(), 1e-12))), t = 2 * Math.PI * rnd();
    out.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return out;
}
// The running cloud: (z, w) iid N(0,1); x1 = z, x2 = rho z + sqrt(1-rho^2) w.
const PTS = normals(20260924, 400);
const corrPts = rho => PTS.map(([z, w]) => [z, rho * z + Math.sqrt(1 - rho * rho) * w]);

// A square plot of [-R,R]^2; X maps the horizontal coordinate, Y the vertical.
function frame2d(x0, y0, S, R) {
  return { x0, y0, S, R, k: S / (2 * R), X: x => x0 + (x + R) / (2 * R) * S, Y: y => y0 + (R - y) / (2 * R) * S };
}
function arrow(g, x1, y1, x2, y2, color, w = 1.5, L = 10) {
  el(g, 'line', { x1, y1, x2, y2, stroke: color, 'stroke-width': w });
  const a = Math.atan2(y2 - y1, x2 - x1), s = 0.42;
  return el(g, 'path', { d: `M${x2},${y2} L${x2 - L * Math.cos(a - s)},${y2 - L * Math.sin(a - s)} L${x2 - L * Math.cos(a + s)},${y2 - L * Math.sin(a + s)} Z`, fill: color });
}
// Arrow as one path (line + head), for arrows that move: update with arrowD.
function arrowD(x1, y1, x2, y2, L = 12) {
  const a = Math.atan2(y2 - y1, x2 - x1), s = 0.42, len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return '';
  const h = Math.min(L, len * 0.6);
  return `M${x1},${y1}L${x2},${y2}M${x2},${y2}L${x2 - h * Math.cos(a - s)},${y2 - h * Math.sin(a - s)}` +
    `L${x2 - h * Math.cos(a + s)},${y2 - h * Math.sin(a + s)}Z`;
}
// Grid, arrowed axes, tick labels, and axis names (x1 horizontal, x2 vertical
// unless o.names says otherwise).
function axes(root, svg, P, o = {}) {
  const g = el(svg, 'g'), R = P.R, G = o.grid ?? 3, ticks = o.ticks ?? [-2, 2];
  const [nx, ny] = o.names ?? ['$x_1$', '$x_2$'];
  for (let i = -G; i <= G; i++) {
    el(g, 'line', { x1: P.X(i), x2: P.X(i), y1: P.Y(-R), y2: P.Y(R), stroke: C.grid });
    el(g, 'line', { y1: P.Y(i), y2: P.Y(i), x1: P.X(-R), x2: P.X(R), stroke: C.grid });
  }
  arrow(g, P.X(-R), P.Y(0), P.X(R) + 16, P.Y(0), C.axis);
  arrow(g, P.X(0), P.Y(-R), P.X(0), P.Y(R) - 16, C.axis);
  for (const v of ticks) {
    el(g, 'text', { x: P.X(v) + 4, y: P.Y(0) + 20, 'text-anchor': 'start', 'font-size': 16, fill: '#555' }).textContent = minus(v);
    el(g, 'text', { x: P.X(0) - 7, y: P.Y(v) + 5, 'text-anchor': 'end', 'font-size': 16, fill: '#555' }).textContent = minus(v);
  }
  label(root, 'axh', nx, P.X(R) + 10, P.Y(0) + 8, 't', '#444');
  label(root, 'axv', ny, P.X(0) + 8, P.Y(R) - 14, 'l', '#444');
  return g;
}
// A plot of [xlo,xhi] x [ylo,yhi], W x H pixels at (x0, y0).
function box2d(x0, y0, W, H, xlo, xhi, ylo, yhi) {
  return { x0, y0, W, H, xlo, xhi, ylo, yhi,
    X: x => x0 + (x - xlo) / (xhi - xlo) * W, Y: y => y0 + (yhi - y) / (yhi - ylo) * H };
}
// Axes of a box2d: grid every o.step, axes crossing at (o.ox, o.oy), ticks
// o.xt and o.yt, and axis names (x1 horizontal, x2 vertical by default).
function axesBox(root, svg, B, o = {}) {
  const g = el(svg, 'g'), step = o.step ?? 1;
  if (o.grid !== false) {
    for (let v = Math.ceil(B.xlo / step) * step; v <= B.xhi; v += step)
      el(g, 'line', { x1: B.X(v), x2: B.X(v), y1: B.Y(B.ylo), y2: B.Y(B.yhi), stroke: C.grid });
    for (let v = Math.ceil(B.ylo / step) * step; v <= B.yhi; v += step)
      el(g, 'line', { y1: B.Y(v), y2: B.Y(v), x1: B.X(B.xlo), x2: B.X(B.xhi), stroke: C.grid });
  }
  const ox = o.ox ?? 0, oy = o.oy ?? 0;
  arrow(g, B.X(B.xlo), B.Y(oy), B.X(B.xhi) + 16, B.Y(oy), C.axis);
  arrow(g, B.X(ox), B.Y(B.ylo), B.X(ox), B.Y(B.yhi) - 16, C.axis);
  for (const v of o.xt ?? []) el(g, 'text', { x: B.X(v), y: B.Y(oy) + 20, 'text-anchor': 'middle', 'font-size': 16, fill: '#555' }).textContent = minus(v);
  for (const v of o.yt ?? []) el(g, 'text', { x: B.X(ox) - 7, y: B.Y(v) + 5, 'text-anchor': 'end', 'font-size': 16, fill: '#555' }).textContent = minus(v);
  const [nx, ny] = o.names ?? ['$x_1$', '$x_2$'];
  label(root, 'bx', nx, B.X(B.xhi) + 10, B.Y(oy) + 8, 't', '#444');
  label(root, 'by', ny, B.X(ox) + 8, B.Y(B.yhi) - 14, 'l', '#444');
  return g;
}
// A vector arrow whose stroked tip lands exactly on (x2, y2), or `gap` px short
// of it (to touch the edge of a dot drawn there).  Draw it with
// 'stroke-linejoin': 'round' and stroke-width w.  Returns the full path d, the
// head alone, and the base (bx, by) where a separately drawn shaft should end.
function vecParts(x1, y1, x2, y2, L = 14, w = 3.5, gap = 0) {
  const len = Math.hypot(x2 - x1, y2 - y1), e = gap + w / 2;
  if (len - e < 2) return { d: '', head: '', bx: x1, by: y1 };
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len, a = Math.atan2(uy, ux), s = 0.42;
  const tx = x2 - ux * e, ty = y2 - uy * e, h = Math.min(L, (len - e) * 0.6);
  const bx = tx - ux * h * Math.cos(s), by = ty - uy * h * Math.cos(s);
  const head = `M${tx.toFixed(1)},${ty.toFixed(1)}L${(tx - h * Math.cos(a - s)).toFixed(1)},${(ty - h * Math.sin(a - s)).toFixed(1)}` +
    `L${(tx - h * Math.cos(a + s)).toFixed(1)},${(ty - h * Math.sin(a + s)).toFixed(1)}Z`;
  return { d: `M${x1.toFixed(1)},${y1.toFixed(1)}L${bx.toFixed(1)},${by.toFixed(1)}` + head, head, bx, by };
}
const vecD = (...a) => vecParts(...a).d;
// A polyline through [x, y] pixel points.
const pathOf = pts => pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('');
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
function cloud(svg, cls = 'pt', n = PTS.length) {
  const g = el(svg, 'g');
  for (let i = 0; i < n; i++) el(g, 'circle', { class: cls, r: 2.6 });
  return g;
}
function placeCloud(root, P, rho, hi = null) {
  const pts = $$(root, 'pt'), s = Math.sqrt(1 - rho * rho);
  pts.forEach((c, i) => {
    const [z, w] = PTS[i], near = hi !== null && Math.abs(z - hi) < 0.1;
    attr(c, { cx: P.X(z), cy: P.Y(rho * z + s * w), fill: near ? C.post : C.prior,
      'fill-opacity': near ? 0.95 : 0.3, r: near ? 3.6 : 2.6 });
  });
}
// Mahalanobis-r contour of the standardized Gaussian with correlation rho.
function ellipse(P, rho, r, cx = 0, cy = 0) {
  const a = r * Math.sqrt(1 + rho), b = r * Math.sqrt(Math.max(0, 1 - rho)); let d = '';
  for (let i = 0; i <= 120; i++) {
    const t = i / 120 * 2 * Math.PI, u = a * Math.cos(t), v = b * Math.sin(t);
    d += (i ? 'L' : 'M') + P.X(cx + (u - v) / Math.SQRT2).toFixed(1) + ',' + P.Y(cy + (u + v) / Math.SQRT2).toFixed(1);
  }
  return d;
}
// Contour {v : v^T S^-1 v = r^2} + (cx, cy) of a 2x2 covariance S = [[a,b],[b,c]],
// with a the variance of the horizontal coordinate.
function covEllipse(P, a, b, c, r = 1, cx = 0, cy = 0) {
  const tr = (a + c) / 2, dd = Math.sqrt(((a - c) / 2) ** 2 + b * b);
  const l1 = tr + dd, l2 = Math.max(0, tr - dd), th = 0.5 * Math.atan2(2 * b, a - c);
  let d = '';
  for (let i = 0; i <= 120; i++) {
    const t = i / 120 * 2 * Math.PI, u = r * Math.sqrt(l1) * Math.cos(t), v = r * Math.sqrt(l2) * Math.sin(t);
    d += (i ? 'L' : 'M') + P.X(cx + u * Math.cos(th) - v * Math.sin(th)).toFixed(1) + ',' +
      P.Y(cy + u * Math.sin(th) + v * Math.cos(th)).toFixed(1);
  }
  return d;
}
function newSvg(root, W, H) {
  const svg = el(root, 'svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  root.style.width = W + 'px'; root.style.height = H + 'px';
  return svg;
}
// A bell curve path over [-3,3] standard deviations, for small icons.
function bellPath(cx, sd, h, base, sx) {
  let d = '';
  for (let i = 0; i <= 50; i++) { const x = -3 + 6 * i / 50;
    d += (i ? 'L' : 'M') + (cx + x * sx).toFixed(1) + ',' + (base - h * Math.exp(-x * x / (2 * sd * sd))).toFixed(1); }
  return d;
}

// ---------------------------------------------------------------- figure scenes
// A figure may be one drawing function instead of init + render:
//
//   FIGS.name = { size: [W, H], draw(g, p) { const P = g.plot(box); P.axes(); P.dot([1, 1]); } }
//
// draw paints the whole picture from the state p, every frame: in pixels
// through the scene g, or in data coordinates through a plot P = g.plot(box)
// (box from frame2d or box2d).  The scene keeps the SVG elements and updates
// them in place, in call order (later marks on top); a mark not drawn in a
// frame is removed, and a label not drawn is hidden.  Every mark takes a
// style object whose defaults are the house style below; `color`, `fill` and
// `stroke` (the edge of a mark whose colour is its fill, null for none) take a
// role name of C (prior, like, post, ...) or any CSS colour, and a key with a
// hyphen ('stroke-linecap') passes through as an SVG attribute.
const STYLE = {
  curve: 3.5,           // width of a density's curve (a secondary curve: w 2.5)
  fill: 0.18,           // fill-opacity under a density
  dot: 7,               // radius of a marked point, drawn with a white 1.5 outline
  vec: [3.5, 14],       // width and head length of a vector
  contour: 2,           // width of an ellipse
  cloud: [2.6, 0.3],    // radius and fill-opacity of a cloud's dots
  dash: '9 6',          // dash: true
  tick: [16, '#555'],   // tick numbers: size and colour
  axisName: '#444'
};
const colorOf = c => C[c] || c;
// Style object -> SVG attributes, over `base`; `color` goes to colorAttr.
function paint(st, base, colorAttr = 'stroke') {
  const a = Object.assign({}, base);
  for (const k in st) {
    const v = st[k];
    if (k === 'color') a[colorAttr] = colorOf(v);
    else if (k === 'w') a['stroke-width'] = v;
    else if (k === 'dash') a['stroke-dasharray'] = v === true ? STYLE.dash : v;
    else if (k === 'fill') a.fill = colorOf(v);
    else if (k === 'stroke') a.stroke = v == null ? v : colorOf(v);
    else if (k === 'fo') a['fill-opacity'] = v;
    else if (k === 'so') a['stroke-opacity'] = v;
    else if (k === 'opacity') a.opacity = v;
    else if (k === 'cap') a['stroke-linecap'] = v;
    else if (k === 'join') a['stroke-linejoin'] = v;
    else if (k === 'cls') a.class = v;
    else if (k.includes('-') || k === 'transform') a[k] = v;
  }
  return a;
}
// The filled head of an axis arrow ending at (x2, y2), as arrow() draws it.
function arrowHeadD(x1, y1, x2, y2, L = 10) {
  const a = Math.atan2(y2 - y1, x2 - x1), s = 0.42;
  return `M${x2},${y2} L${x2 - L * Math.cos(a - s)},${y2 - L * Math.sin(a - s)} L${x2 - L * Math.cos(a + s)},${y2 - L * Math.sin(a + s)} Z`;
}

class Scene {
  constructor(root, W, H, svg) {
    this.root = root; this.W = W; this.H = H;
    this.svg = svg || newSvg(root, W, H);
  }
  begin() { this.at = [this.svg, 0]; this.shown = new Set(); }
  // Any SVG element, at the cursor: reused when the tag matches, else created there.
  el(tag, attrs) {
    const [par, i] = this.at;
    let e = par.children[i];
    if (!e || e.tagName !== tag) {
      e = document.createElementNS(NS, tag);
      par.insertBefore(e, par.children[i] || null);
    }
    for (const k of e._keys || []) if (attrs[k] == null) e.removeAttribute(k);
    const keys = [];
    for (const k in attrs) if (attrs[k] != null) { e.setAttribute(k, attrs[k]); keys.push(k); }
    e._keys = keys;
    this.at[1]++;
    return e;
  }
  // A <g>; the marks fn draws go into it.
  group(attrs, fn) {
    const e = this.el('g', attrs || {}), save = this.at;
    this.at = [e, 0];
    fn();
    this.trim();
    this.at = save;
    return e;
  }
  trim() { const [par, i] = this.at; while (par.children.length > i) par.lastElementChild.remove(); }
  end() {
    this.trim();
    this.root.querySelectorAll(':scope > .lab').forEach(d => {
      if (!this.shown.has(d.dataset.k)) { d.style.opacity = 0; d.style.visibility = 'hidden'; }
    });
  }
  // An HTML label (KaTeX in $…$) at pixel point [x, y]; st: color, opacity, dx, dy.
  label(key, s, [x, y], anchor = 'l', st = {}) {
    this.shown.add(key);
    label(this.root, key, s, x + (st.dx || 0), y + (st.dy || 0), anchor, colorOf(st.color || C.ink), st.opacity ?? 1);
  }
  // SVG text at pixel point [x, y], by default a tick number; st: anchor, size, color.
  text([x, y], s, st = {}) {
    const { color, anchor, size, ...rest } = st;
    const e = this.el('text', paint(rest, { x, y, 'text-anchor': anchor || 'middle',
      'font-size': size || STYLE.tick[0], fill: colorOf(color || STYLE.tick[1]) }));
    if (e.textContent !== String(s)) e.textContent = s;
    return e;
  }
  line([x1, y1], [x2, y2], st = {}) {
    return this.el('line', paint(st, { x1, y1, x2, y2, stroke: C.ink, 'stroke-width': 1.5 }));
  }
  path(pts, st = {}) {
    return this.el('path', paint(st, { d: pathOf(pts) + (st.close ? 'Z' : ''), fill: 'none', stroke: C.ink, 'stroke-width': 2 }));
  }
  // A thin arrow with a filled head, as the axes draw them (colour C.axis).
  arrow([x1, y1], [x2, y2], st = {}) {
    const { color, w, head, ...rest } = st, col = colorOf(color || C.axis);
    this.el('line', paint(rest, { x1, y1, x2, y2, stroke: col, 'stroke-width': w ?? 1.5 }));
    return this.el('path', paint(rest, { d: arrowHeadD(x1, y1, x2, y2, head ?? 10), fill: col }));
  }
  plot(B) { return new Plot(this, B); }
}

// Marks in the data coordinates of a frame2d or box2d.
class Plot {
  constructor(g, B) {
    this.g = g; this.B = B;
    this.xlo = B.xlo ?? -B.R; this.xhi = B.xhi ?? B.R;
    this.ylo = B.ylo ?? -B.R; this.yhi = B.yhi ?? B.R;
  }
  X(x) { return this.B.X(x); }
  Y(y) { return this.B.Y(y); }
  px([x, y]) { return [this.B.X(x), this.B.Y(y)]; }
  d(pts, close) { return pathOf(pts.map(q => this.px(q))) + (close ? 'Z' : ''); }
  // [from, to] in n steps
  steps(st, lo, hi, n) {
    const a = st.from ?? lo, b = st.to ?? hi, m = st.n ?? n, out = [];
    for (let i = 0; i <= m; i++) out.push(a + (b - a) * i / m);
    return out;
  }
  line(a, b, st = {}) { return this.g.line(this.px(a), this.px(b), st); }
  // A polyline through data points; st.close closes it.
  path(pts, st = {}) { return this.g.path(pts.map(q => this.px(q)), st); }
  arrow(a, b, st = {}) { return this.g.arrow(this.px(a), this.px(b), st); }
  // y = f(x) on [from, to]; the pen lifts where y is not finite or above the plot.
  curve(f, st = {}) {
    let d = '', pen = false;
    for (const x of this.steps(st, this.xlo, this.xhi, 200)) {
      const y = f(x);
      if (!Number.isFinite(y) || y > this.yhi) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + this.X(x).toFixed(1) + ',' + this.Y(Math.max(y, this.ylo)).toFixed(1); pen = true;
    }
    return this.g.el('path', paint(st, { d, fill: 'none', stroke: C.ink, 'stroke-width': STYLE.curve }));
  }
  // The curve t -> fn(t) = [x, y] for t in [from, to] (st.from, st.to required).
  param(fn, st = {}) {
    return this.path(this.steps(st, 0, 1, 200).map(fn), st);
  }
  // The region between y = f(x) and st.base (a number or a function; default
  // the bottom of the plot), cut at the top and bottom of the plot.
  area(f, st = {}) {
    const xs = this.steps(st, this.xlo, this.xhi, 200), cut = y => clamp(y, this.ylo, this.yhi);
    const base = typeof st.base === 'function' ? st.base : () => st.base ?? this.ylo;
    const pts = xs.map(x => [x, cut(f(x))]).concat(xs.slice().reverse().map(x => [x, cut(base(x))]));
    const { color, ...rest } = st;
    return this.g.el('path', paint(rest, { d: this.d(pts, true), fill: colorOf(color || C.ink),
      'fill-opacity': STYLE.fill, stroke: 'none' }));
  }
  // A density: the area under f, filled lightly, and its curve on top.
  density(f, st = {}) {
    const { fo, ...line } = st;
    this.area(f, { color: st.color, fo: fo ?? STYLE.fill, from: st.from, to: st.to, n: st.n, opacity: st.opacity });
    return this.curve(f, Object.assign({ join: 'round' }, line));
  }
  // A marked point: radius st.r, a white outline unless st.outline is false.
  dot(at, st = {}) {
    const [cx, cy] = this.px(at), { r, outline, ...rest } = st;
    return this.g.el('circle', paint(rest, Object.assign({ cx, cy, r: r ?? STYLE.dot, fill: C.ink },
      outline === false ? {} : { stroke: '#fff', 'stroke-width': 1.5 }), 'fill'));
  }
  // A vector from a to b: its tip lands on b, or st.gap px short of it (a dot
  // of that radius at b); st.dash draws the shaft dashed and the head solid.
  vec(a, b, st = {}) {
    const [x1, y1] = this.px(a), [x2, y2] = this.px(b), { w, head, gap, dash, color, ...rest } = st;
    const W = w ?? STYLE.vec[0], col = colorOf(color || C.ink);
    const v = vecParts(x1, y1, x2, y2, head ?? STYLE.vec[1], W, gap ?? 0);
    if (!dash) return this.g.el('path', paint(rest, { d: v.d, stroke: col, 'stroke-width': W, fill: col, 'stroke-linejoin': 'round' }));
    this.g.el('line', paint(rest, { x1, y1, x2: v.bx, y2: v.by, stroke: col, 'stroke-width': W,
      'stroke-dasharray': dash === true ? STYLE.dash : dash }));
    return this.g.el('path', paint(rest, { d: v.head, fill: col, stroke: col, 'stroke-width': W, 'stroke-linejoin': 'round' }));
  }
  // The Mahalanobis-r contour (st.r, default 1) of a Gaussian centred at st.at:
  // K is a correlation rho (unit variances) or a covariance [[a, b], [b, c]].
  ellipse(K, st = {}) {
    const { r = 1, at = [0, 0], ...rest } = st;
    const d = typeof K === 'number' ? ellipse(this.B, K, r, at[0], at[1])
      : covEllipse(this.B, K[0][0], K[0][1], K[1][1], r, at[0], at[1]);
    return this.g.el('path', paint(rest, { d, fill: 'none', stroke: C.prior, 'stroke-width': STYLE.contour }));
  }
  // Dots at data points (st.r, st.color, st.fo); st.each(i, [x, y]) may return
  // {r, color, fo} for one dot.  Dots outside the plot are hidden unless st.clip is false.
  cloud(pts, st = {}) {
    const r0 = st.r ?? STYLE.cloud[0], c0 = colorOf(st.color || C.prior), f0 = st.fo ?? STYLE.cloud[1];
    return this.g.group(st.opacity != null ? { opacity: st.opacity } : {}, () => pts.forEach((q, i) => {
      const o = st.each ? st.each(i, q) || {} : {};
      const out = st.clip !== false && (q[0] < this.xlo || q[0] > this.xhi || q[1] < this.ylo || q[1] > this.yhi);
      this.g.el('circle', { class: 'pt', r: o.r ?? r0, cx: this.X(q[0]), cy: this.Y(q[1]),
        fill: colorOf(o.color || c0), 'fill-opacity': out ? 0 : o.fo ?? f0 });
    }));
  }
  // Bars of heights hs centred at xs, st.width data units wide, from st.base (0).
  bars(xs, hs, st = {}) {
    const { width = 0.64, base = 0, color, ...rest } = st, col = colorOf(color || C.prior);
    return xs.map((x, i) => this.g.el('rect', paint(rest, { x: this.X(x - width / 2), width: this.X(width) - this.X(0),
      y: this.Y(Math.max(hs[i], base)), height: Math.abs(this.Y(base) - this.Y(hs[i])),
      fill: col, 'fill-opacity': 0.55, stroke: col, 'stroke-width': 1.5 })));
  }
  rect(a, b, st = {}) {
    const [x1, y1] = this.px(a), [x2, y2] = this.px(b), { color, ...rest } = st;
    return this.g.el('rect', paint(rest, { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1), fill: colorOf(color || C.ink), stroke: 'none' }));
  }
  text(at, s, st = {}) {
    const [x, y] = this.px(at);
    return this.g.text([x + (st.dx || 0), y + (st.dy || 0)], s, st);
  }
  label(key, s, at, anchor = 'l', st = {}) { this.g.label(key, s, this.px(at), anchor, st); }
  // Axes.  A square frame2d plot gets the centred cross of axes(): a grid at
  // the integers up to o.grid (3), ticks o.ticks ([-2, 2]) on both axes.  A
  // box2d plot gets axesBox(): a grid every o.step (1) unless o.grid is false,
  // axes crossing at (o.ox, o.oy) = (0, 0), ticks o.xt and o.yt.  Names o.names
  // (x1 across, x2 up); o.opacity fades them.
  axes(o = {}) {
    const g = this.g, B = this.B, grid = C.grid, ax = (x1, y1, x2, y2) => g.arrow([x1, y1], [x2, y2]);
    const [nx, ny] = o.names ?? ['$x_1$', '$x_2$'];
    const ga = o.opacity != null ? { opacity: o.opacity } : {}, la = { color: STYLE.axisName, opacity: o.opacity ?? 1 };
    if (B.R != null && B.xlo == null) {
      const R = B.R, G = o.grid ?? 3;
      g.group(ga, () => {
        for (let i = -G; i <= G; i++) {
          g.el('line', { x1: B.X(i), x2: B.X(i), y1: B.Y(-R), y2: B.Y(R), stroke: grid });
          g.el('line', { y1: B.Y(i), y2: B.Y(i), x1: B.X(-R), x2: B.X(R), stroke: grid });
        }
        ax(B.X(-R), B.Y(0), B.X(R) + 16, B.Y(0));
        ax(B.X(0), B.Y(-R), B.X(0), B.Y(R) - 16);
        for (const v of o.ticks ?? [-2, 2]) {
          g.text([B.X(v) + 4, B.Y(0) + 20], minus(v), { anchor: 'start' });
          g.text([B.X(0) - 7, B.Y(v) + 5], minus(v), { anchor: 'end' });
        }
      });
      g.label('axh', nx, [B.X(R) + 10, B.Y(0) + 8], 't', la);
      g.label('axv', ny, [B.X(0) + 8, B.Y(R) - 14], 'l', la);
      return;
    }
    const step = o.step ?? 1, ox = o.ox ?? 0, oy = o.oy ?? 0;
    g.group(ga, () => {
      if (o.grid !== false) {
        for (let v = Math.ceil(B.xlo / step) * step; v <= B.xhi; v += step)
          g.el('line', { x1: B.X(v), x2: B.X(v), y1: B.Y(B.ylo), y2: B.Y(B.yhi), stroke: grid });
        for (let v = Math.ceil(B.ylo / step) * step; v <= B.yhi; v += step)
          g.el('line', { y1: B.Y(v), y2: B.Y(v), x1: B.X(B.xlo), x2: B.X(B.xhi), stroke: grid });
      }
      ax(B.X(B.xlo), B.Y(oy), B.X(B.xhi) + 16, B.Y(oy));
      ax(B.X(ox), B.Y(B.ylo), B.X(ox), B.Y(B.yhi) - 16);
      for (const v of o.xt ?? []) g.text([B.X(v), B.Y(oy) + 20], minus(v));
      for (const v of o.yt ?? []) g.text([B.X(ox) - 7, B.Y(v) + 5], minus(v), { anchor: 'end' });
    });
    g.label('bx', nx, [B.X(B.xhi) + 10, B.Y(oy) + 8], 't', la);
    g.label('by', ny, [B.X(ox) + 8, B.Y(B.yhi) - 14], 'l', la);
  }
}
// A figure written as { size, draw }: the engine's init and render for it.
function sceneFig(f) {
  f.init = root => { root._scene = new Scene(root, f.size[0], f.size[1]); };
  f.render = (root, p) => {
    let g = root._scene;
    if (!g) {   // a print page's clone: its SVG came without the scene, so it is redrawn from nothing
      const svg = root.querySelector(':scope > svg');
      svg.replaceChildren();
      g = root._scene = new Scene(root, f.size[0], f.size[1], svg);
    }
    g.begin(); f.draw(g, p); g.end();
  };
}

const FIGS = {};    // name -> { init(root), render(root, p) } or { size, draw(g, p) }; duration?, linear?, enter?
const ICONS = {};   // name -> function(svg), for <svg class="icon" data-icon="name">

// "n / N", with N counted before reveal wraps the slides into print pages.
let NSLIDES = 0;
function slideLabel(slide) { return [slide ? slide.dataset.n : '', '/', NSLIDES].concat(slide && slide.dataset.drawerPage ? ['· derivation'] : []); }

// State = data-init, then the data-set of each visible fragment in order.
function stateFor(root) {
  const p = JSON.parse(root.dataset.init || '{}');
  const slide = root.closest('section');
  [...slide.querySelectorAll('.fragment.visible[data-set], .shown[data-set]')]
    .filter(f => !f.dataset.for || f.dataset.for === root.dataset.fig)
    .sort((a, b) => (+a.dataset.fragmentIndex || 0) - (+b.dataset.fragmentIndex || 0))
    .forEach(f => Object.assign(p, JSON.parse(f.dataset.set)));
  return p;
}
const live = new WeakMap();
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
function draw(root, p) {
  FIGS[root.dataset.fig].render(root, p);
  syncKnobs(root, p);
}
function show(root, from) {
  const fig = FIGS[root.dataset.fig], target = stateFor(root);
  let st = live.get(root);
  if (!st) { st = {}; live.set(root, st); }
  cancelAnimationFrame(st.raf);
  if (!from) { draw(root, target); st.p = target; return; }
  const t0 = performance.now(), D = fig.duration || 900;
  const step = now => {
    const u = clamp((now - t0) / D), e = fig.linear ? u : ease(u), p = {};
    for (const k in target) p[k] = typeof target[k] === 'number' && k in from
      ? from[k] + (target[k] - from[k]) * e : target[k];
    draw(root, p); st.p = p;
    if (u < 1) st.raf = requestAnimationFrame(step);
  };
  st.raf = requestAnimationFrame(step);
}
const figsIn = slide => slide ? slide.querySelectorAll('.fig[data-fig]') : [];

// Live sliders: <div class="knobs" data-for="FIG"><label>…<input type="range"
// data-param="rho" …><output></output></label></div>.  Moving one redraws the
// figure named in data-for (default: the slide's first figure) at the current
// state with that parameter replaced; the next fragment step takes over again.
function knobsFor(root) {
  const slide = root.closest('section');
  return [...slide.querySelectorAll('.knobs')].filter(k =>
    (k.dataset.for || (slide.querySelector('.fig[data-fig]') || {}).dataset?.fig) === root.dataset.fig);
}
function syncKnobs(root, p) {
  if (PRINT) return;
  for (const k of knobsFor(root)) k.querySelectorAll('input[data-param]').forEach(inp => {
    const v = p[inp.dataset.param];
    if (typeof v !== 'number' || document.activeElement === inp) return;
    inp.value = v;
    const out = inp.parentNode.querySelector('output');
    if (out) out.textContent = fmt(v, +(inp.dataset.digits ?? 2));
  });
}
function wireKnobs() {
  document.querySelectorAll('.knobs').forEach(k => {
    const slide = k.closest('section');
    const name = k.dataset.for || slide.querySelector('.fig[data-fig]').dataset.fig;
    const root = slide.querySelector(`.fig[data-fig="${name}"]`);
    k.querySelectorAll('input[data-param]').forEach(inp => {
      const out = inp.parentNode.querySelector('output');
      const upd = () => {
        const st = live.get(root) || {}; cancelAnimationFrame(st.raf);
        const p = Object.assign({}, st.p || stateFor(root), { [inp.dataset.param]: +inp.value });
        if (out) out.textContent = fmt(+inp.value, +(inp.dataset.digits ?? 2));
        FIGS[name].render(root, p); st.p = p; live.set(root, st);
      };
      inp.addEventListener('input', upd);
      // Arrow keys belong to the slider while it has focus, not to reveal.
      inp.addEventListener('keydown', e => e.stopPropagation());
    });
  });
}

// Title backdrop: faint prior and posterior bells, as \titlebells.
function bells(svg) {
  const bell = (c, sd, h, lo, hi, color) => {
    let d = '';
    for (let i = 0; i <= 160; i++) { const x = lo + (hi - lo) * i / 160;
      d += (i ? 'L' : 'M') + (x * 80).toFixed(1) + ',' + (720 - 80 * h * Math.exp(-((x - c) ** 2) / (2 * sd * sd))).toFixed(1); }
    el(svg, 'path', { d: d + `L${hi * 80},720L${lo * 80},720Z`, fill: color, 'fill-opacity': 0.09 });
    el(svg, 'path', { d, fill: 'none', stroke: color, 'stroke-opacity': 0.3, 'stroke-width': 2.5 });
  };
  bell(6.3, 2.4, 1.15, 0, 16, C.prior);
  bell(9.6, 0.95, 1.75, 4, 16, C.post);
}

// The slide `d` away from this one, at its final state: its last build step.
function toSlideEnd(d) {
  const h = Reveal.getIndices().h + d, slide = Reveal.getSlides()[h];
  if (!slide) return;
  let last = -1;
  slide.querySelectorAll('.fragment').forEach(f => {
    const i = +f.dataset.fragmentIndex; if (i > last) last = i; });
  Reveal.slide(h, 0, last >= 0 ? last : undefined);
}
// Vertical balance: a text column (a .col of a .row, or a .fbody without one)
// spreads over the body's height, its blocks moved apart by up to BAL_GAP
// each and the rest of the free height split above and below, and a figure
// beside a column is centred. Measured once, before reveal clones slides for
// printing; hidden build steps keep their space, so nothing moves on a click.
const BAL_GAP = 34;
function balance(sec) {
  const hidden = getComputedStyle(sec).display === 'none';
  if (hidden) sec.style.display = 'block';
  sec.querySelectorAll('.fbody').forEach(fb => {
    const row = fb.querySelector(':scope > .row');
    if (!row) { spread(fb); return; }
    const cols = [...row.children].filter(c => c.classList.contains('col'));
    if (!cols.length) return;
    [...row.children].forEach(c => { c.style.alignSelf = cols.includes(c) ? 'stretch' : 'center'; });
    cols.forEach(spread);
  });
  if (hidden) sec.style.display = '';
}
function spread(box) {
  // a display formula sits in auto-render's inline wrapper; its margins are on the inner block
  const kids = [...box.children].map(k => k.tagName === 'SPAN' && k.querySelector(':scope > .katex-display') || k)
    .filter(k => k.tagName !== 'ASIDE' && getComputedStyle(k).position !== 'absolute' && k.offsetHeight > 0);
  if (!kids.length) return;
  const top = box.getBoundingClientRect().top, last = kids[kids.length - 1];
  const used = last.getBoundingClientRect().bottom - top, free = box.clientHeight - used - 6;
  if (free < 24) return;
  // no extra space inside a sentence: after a lead-in ending in a colon, or
  // before a paragraph that goes on with the sentence (it starts lowercase)
  const leadIn = k => k.tagName === 'P' && /:\s*$/.test(k.textContent);
  const goesOn = k => k.firstChild && k.firstChild.nodeType === 3 && /^\s*[a-z]/.test(k.firstChild.data);
  const wide = kids.slice(0, -1).filter((k, j) => !leadIn(k) && !goesOn(kids[j + 1]));
  const g = Math.min(BAL_GAP, free / (wide.length + 2));
  wide.forEach(k => { k.style.marginBottom = (parseFloat(getComputedStyle(k).marginBottom) + g) + 'px'; });
  box.style.paddingTop = Math.floor((free - g * wide.length) / 2) + 'px';
  box.style.boxSizing = 'border-box';
}
// Derivation drawer: a slide's <div class="drawer"> gets a tab at the bottom
// right; the tab or the D key opens it, and D, Escape or leaving the slide
// closes it. In print, each such slide is followed by a copy of its final
// state with the drawer open, labelled "n / N · derivation".
function wireDrawers() {
  const secs = [...document.querySelectorAll('.slides > section')].filter(s => s.querySelector(':scope > .drawer'));
  if (PRINT) {
    secs.forEach(sec => {
      const c = sec.cloneNode(true);
      c.classList.add('drawer-open'); c.dataset.drawerPage = '1'; c.removeAttribute('id');
      c.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
      c.querySelectorAll('.fragment').forEach(f => { f.classList.remove('fragment'); f.classList.add('shown'); });
      c.querySelectorAll('aside.notes').forEach(a => a.remove());
      sec.after(c);
      c.querySelectorAll('.fig[data-fig]').forEach(root => { root.innerHTML = ''; FIGS[root.dataset.fig].init(root); draw(root, stateFor(root)); });
    });
    return;
  }
  const toggle = (sec, open) => {
    if (!sec || !sec.querySelector(':scope > .drawer')) return;
    open = open == null ? !sec.classList.contains('drawer-open') : open;
    sec.classList.toggle('drawer-open', open);
    sec.querySelector(':scope > .drawer-tab').textContent = open ? 'Close derivation \u25C2' : 'Derivation \u25B8';
  };
  secs.forEach(sec => {
    const tab = document.createElement('div');
    tab.className = 'drawer-tab'; tab.textContent = 'Derivation \u25B8';
    tab.addEventListener('click', e => { e.stopPropagation(); toggle(sec); });
    sec.appendChild(tab);
  });
  document.addEventListener('keydown', e => {
    const sec = window.Reveal && Reveal.getCurrentSlide();
    if (!sec || !sec.querySelector(':scope > .drawer') || e.metaKey || e.ctrlKey || e.altKey) return;
    // typing in a field (a comment box in the viewer) is not a shortcut
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === 'd' || e.key === 'D') toggle(sec);
    else if (e.key === 'Escape' && sec.classList.contains('drawer-open')) toggle(sec, false);
    else return;
    e.preventDefault(); e.stopPropagation();
  }, true);
  document.querySelector('.reveal').addEventListener('slidechanged', e => toggle(e.previousSlide, false));
}
// Slide markup.  A deck may write its slides in this vocabulary, which
// expandSlides() turns into the layout markup the rest of the engine and
// deck.css work on, before anything else runs:
//
//   <section><h2>Title</h2> … </section>   a frame: everything except the title,
//                                           <drawer> and <notes> is its body
//   <fig name="mean" init="mu=0 b=0">       a figure and its initial state
//   <column> … </column>                    a text column; figures and columns
//                                           next to each other form a row, and a
//                                           figure keeps the caption (p.caption)
//                                           and sliders written right after it
//   <block title="…">, <alertblock title="…">   blocks; class "small" sets the body small
//   <knob param="rho" min="-0.9" max="0.9" step="0.05" digits="2">$\rho$</knob>
//                                           a slider for the figure (for="name",
//                                           default: the slide's first figure);
//                                           consecutive knobs share one bar
//   pause, pause="b=1"                      on any element: it appears on the next
//                                           click, which also sets the figure state
//   <alert>, <drawer>, <notes>              \alert, the derivation drawer, speaker notes
//   <narration><say>…</say>…</narration>    spoken narration, one <say> per state (before
//                                           the first build step, then after each)
//
// A state is written "k=v k=v" (numbers, true/false, or words) or as JSON.
// A slide written directly in the layout markup is left as it is.
function stateAttr(s) {
  s = (s || '').trim();
  if (!s) return null;
  if (s[0] === '{') return s;
  const o = {};
  for (const kv of s.split(/[\s,]+/)) {
    const i = kv.indexOf('='), v = kv.slice(i + 1);
    let val; try { val = JSON.parse(v); } catch (e) { val = v; }
    o[kv.slice(0, i)] = val;
  }
  return JSON.stringify(o);
}
// e's attributes (less `drop`) and children on a new element; classes `cls` first.
function retag(e, tag, cls = '', drop = []) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const a of [...e.attributes]) {
    if (drop.includes(a.name)) continue;
    if (a.name === 'class') { if (a.value.trim()) n.classList.add(...a.value.trim().split(/\s+/)); }
    else n.setAttribute(a.name, a.value);
  }
  while (e.firstChild) n.appendChild(e.firstChild);
  e.replaceWith(n);
  return n;
}
function expandSlides(slides) {
  const all = sel => [...slides.querySelectorAll(sel)];
  all('fig').forEach(e => {
    const n = retag(e, 'div', 'fig', ['name', 'init']);
    n.dataset.fig = e.getAttribute('name');
    const s = stateAttr(e.getAttribute('init'));
    if (s) n.dataset.init = s;
  });
  all('knob').forEach(e => {
    if (!e.isConnected || e.parentNode.classList.contains('knobs')) return;
    const bar = document.createElement('div');
    bar.className = 'knobs';
    if (e.hasAttribute('for')) bar.dataset.for = e.getAttribute('for');
    e.before(bar);
    for (let k = e; k && k.tagName === 'KNOB';) {
      const next = k.nextElementSibling, label = document.createElement('label');
      while (k.firstChild) label.appendChild(k.firstChild);
      const inp = document.createElement('input');
      inp.type = 'range'; inp.dataset.param = k.getAttribute('param');
      if (k.hasAttribute('digits')) inp.dataset.digits = k.getAttribute('digits');
      for (const a of ['min', 'max', 'step']) inp.setAttribute(a, k.getAttribute(a));
      label.append(' ', inp, document.createElement('output'));
      if (bar.children.length) bar.append(' ');
      bar.appendChild(label); k.remove();
      k = next;
    }
  });
  all('block, alertblock').forEach(e => {
    const alert = e.tagName === 'ALERTBLOCK', title = e.getAttribute('title');
    const small = e.classList.contains('small');
    const n = retag(e, 'div', alert ? 'block alertblock' : 'block', ['title']);
    n.classList.remove('small');
    const bb = document.createElement('div');
    bb.className = small ? 'bb small' : 'bb';
    while (n.firstChild) bb.appendChild(n.firstChild);
    if (title != null) { const bt = document.createElement('div'); bt.className = 'bt'; bt.innerHTML = title; n.appendChild(bt); }
    n.appendChild(bb);
  });
  all('alert').forEach(e => retag(e, 'span', 'alert'));
  all('column').forEach(e => retag(e, 'div', 'col'));
  all('notes').forEach(e => retag(e, 'aside', 'notes'));
  all('narration').forEach(e => { retag(e, 'aside', 'narration').querySelectorAll('say').forEach(x => retag(x, 'p', 'say')); });
  all('drawer').forEach(e => {
    const n = retag(e, 'div', 'drawer'), dh = document.createElement('div');
    dh.className = 'dh'; dh.textContent = 'Derivation';
    n.prepend(dh);
  });
  slides.querySelectorAll(':scope > section').forEach(sec => {
    sec.classList.add('frame');
    const h = sec.querySelector(':scope > h2');
    if (!h) return;
    h.classList.add('frametitle');
    if (sec.querySelector(':scope > .fbody')) return;   // a body written out keeps its own layout
    const body = document.createElement('div');
    body.className = 'fbody';
    [...sec.childNodes].forEach(c => {
      if (c === h || c.nodeType === 1 && (c.matches('.drawer, aside.notes, aside.narration'))) return;
      body.appendChild(c);
    });
    h.after(body);
    rows(body);
  });
  all('[pause]').forEach(e => {
    e.classList.add('fragment');
    const s = stateAttr(e.getAttribute('pause'));
    if (s) e.dataset.set = s;
    e.removeAttribute('pause');
  });
}
// A run of figures and columns side by side becomes a row, each figure with
// the caption and sliders written right after it.
function rows(body) {
  const kids = [...body.children], isFig = k => k.matches('.fig'), isCol = k => k.matches('.col');
  const trails = k => k.matches('p.caption, .knobs');
  for (let i = 0; i < kids.length;) {
    if (!isFig(kids[i]) && !isCol(kids[i])) { i++; continue; }
    const items = [];
    let j = i;
    while (j < kids.length && (isFig(kids[j]) || isCol(kids[j]))) {
      const it = [kids[j++]];
      if (isFig(it[0])) while (j < kids.length && trails(kids[j])) it.push(kids[j++]);
      items.push(it);
    }
    if (items.length > 1 && items.some(it => isCol(it[0]))) {
      const row = document.createElement('div');
      row.className = 'row';
      kids[i].before(row);
      for (const it of items) {
        if (it.length === 1) { row.appendChild(it[0]); continue; }
        const g = document.createElement('div');
        row.appendChild(g); it.forEach(k => g.appendChild(k));
      }
    }
    i = j;
  }
}
// Narration: a slide's <narration> holds one <say> per state, before the first
// build step and then after each.  N, or the tab at the bottom right, starts
// it: the current state is spoken, the next step is taken when it ends, and it
// goes on into the next slide while that one is narrated too.  N or Escape
// stops it; moving by hand while it runs speaks the new state instead.  A state
// rendered by shared/narrate.py plays its audio file (narration/manifest.json,
// keyed by the SHA-1 of the text); any other is spoken by the browser's voice.
function wireNarration() {
  if (PRINT) return;
  const synth = window.speechSynthesis, tabs = [];
  let on = false, token = 0, voice = null, audio = null, files = {};
  fetch('narration/manifest.json').then(r => r.ok ? r.json() : null).then(m => { if (m) files = m.files || {}; }).catch(() => {});
  const pick = () => {
    const vs = synth ? synth.getVoices().filter(v => /^en[-_]/i.test(v.lang)) : [];
    for (const re of [/Premium/i, /Enhanced/i, /Google US English/i, /en[-_]US/i]) {
      const v = vs.find(v => re.test(v.name) || re.test(v.lang)); if (v) return v;
    }
    return vs[0] || null;
  };
  if (synth) { voice = pick(); synth.addEventListener('voiceschanged', () => { voice = pick(); }); }
  const says = sec => sec ? [...sec.querySelectorAll(':scope > aside.narration > .say')] : [];
  const stateOf = () => { const f = Reveal.getIndices().f; return f == null || f < 0 ? 0 : f + 1; };
  const label = () => tabs.forEach(t => { t.textContent = on ? 'Stop narration ■' : 'Narration ▸'; });
  const hush = () => { if (audio) { audio.pause(); audio = null; } if (synth) synth.cancel(); };
  const stop = () => { on = false; token++; hush(); label(); };
  const sha1 = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(t)))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const next = my => {
    if (my !== token || !on) return;
    if (Reveal.availableFragments().next) Reveal.nextFragment();
    else if (says(Reveal.getSlides()[Reveal.getIndices().h + 1]).length) Reveal.next();
    else stop();
  };
  const speak = async () => {
    const my = ++token; hush();
    if (!on) return;
    const say = says(Reveal.getCurrentSlide())[stateOf()];
    if (!say) { stop(); return; }
    const text = say.textContent.replace(/\s+/g, ' ').trim();
    const file = crypto.subtle ? files[await sha1(text)] : null;
    if (my !== token) return;
    if (file) {
      audio = new Audio('narration/' + file);
      audio.onended = () => next(my);
      audio.play().catch(() => stop());
      return;
    }
    if (!synth) { stop(); return; }
    // one utterance per sentence: Chrome drops long utterances part-way
    const parts = text.match(/[^.!?]+[.!?]*/g) || [];
    parts.forEach((txt, i) => {
      const u = new SpeechSynthesisUtterance(txt.trim());
      if (voice) u.voice = voice;
      u.rate = 0.97;
      if (i === parts.length - 1) u.onend = () => next(my);
      synth.speak(u);
    });
  };
  const toggle = () => { if (on) stop(); else { on = true; label(); speak(); } };
  document.querySelectorAll('.slides > section').forEach(sec => {
    if (!says(sec).length) return;
    const t = document.createElement('div');
    t.className = 'narr-tab';
    t.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    sec.appendChild(t); tabs.push(t);
  });
  label();
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, [contenteditable="true"]')) return;
    if (e.key === 'n' || e.key === 'N') toggle();
    else if (e.key === 'Escape' && on) stop();
    else return;
    e.preventDefault(); e.stopPropagation();
  }, true);
  ['slidechanged', 'fragmentshown', 'fragmenthidden'].forEach(ev => Reveal.on(ev, () => { if (on) speak(); }));
}
async function startDeck(opts = {}) {
  expandSlides(document.querySelector('.slides'));
  if (PRINT) document.documentElement.classList.add('deck-print');
  document.querySelectorAll('.slides > section').forEach((sec, i) => { sec.dataset.n = i + 1; });
  NSLIDES = document.querySelectorAll('.slides > section').length;
  // \htmlClass tags symbols that a figure moves (the exponents on 22-4's Exp(theta) slide)
  renderMathInElement(document.querySelector('.slides'), { macros: MACROS, throwOnError: false,
    trust: ctx => ctx.command === '\\htmlClass',
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '$', right: '$', display: false }] });
  document.querySelectorAll('svg.bells').forEach(bells);
  document.querySelectorAll('svg.icon').forEach(svg => ICONS[svg.dataset.icon](svg));
  Object.values(FIGS).forEach(f => { if (f.draw && !f.render) sceneFig(f); });
  // Build every figure once, in its slide's initial state, before reveal
  // clones slides for printing: clones then carry the SVG and labels.
  document.querySelectorAll('.fig[data-fig]').forEach(root => { FIGS[root.dataset.fig].init(root); show(root); });
  if (!PRINT) wireKnobs();
  await document.fonts.ready;
  document.querySelectorAll('.slides > section').forEach(balance);
  wireDrawers();
  wireNarration();

  Reveal.on('ready', () => { document.querySelectorAll('.fig[data-fig]').forEach(r => show(r));
    document.documentElement.dataset.deckReady = '1'; });
  Reveal.on('slidechanged', e => figsIn(e.currentSlide).forEach(root => {
    const fig = FIGS[root.dataset.fig], forward = !e.previousSlide ||
      Reveal.getIndices(e.previousSlide).h < Reveal.getIndices(e.currentSlide).h;
    const noSteps = !e.currentSlide.querySelector('.fragment.visible[data-set]');
    if (fig.enter && forward && noSteps) show(root, Object.assign(stateFor(root), fig.enter));
    else show(root);
  }));
  const step = () => figsIn(Reveal.getCurrentSlide()).forEach(root => show(root, (live.get(root) || {}).p));
  Reveal.on('fragmentshown', step);
  Reveal.on('fragmenthidden', step);
  // Printing: each page is a clone with its own set of visible fragments.
  Reveal.on('pdf-ready', () => {
    document.querySelectorAll('.pdf-page').forEach(page => {
      page.querySelectorAll('.fig[data-fig]').forEach(root => FIGS[root.dataset.fig].render(root, stateFor(root)));
      const n = page.querySelector('.slide-number-pdf');
      if (n) n.textContent = slideLabel(page.querySelector('section')).join(' ');
    });
    // images a figure asked for (the deck map's thumbnails) are loaded first
    Promise.all(window.DECK_WAITS || []).then(() => setTimeout(() =>
      requestAnimationFrame(() => { document.documentElement.dataset.printReady = '1'; }), 300));
  });

  Reveal.initialize(Object.assign({
    width: 1280, height: 720, margin: PRINT ? 0 : 0.02, minScale: 0.2, maxScale: 3,
    center: false, hash: true, controls: false, progress: false,
    slideNumber: slideLabel, showSlideNumber: 'all',
    transition: 'fade', transitionSpeed: 'fast', backgroundTransition: 'none',
    pdfSeparateFragments: true, pdfMaxPagesPerSlide: 1,
    // up/down move between slides, landing on each slide's final state (every
    // build step shown); left/right step through the current slide's
    // fragments and, past its last (first) step, go on to the next (previous)
    // slide; space and the page keys do the same, for a clicker
    keyboard: { 37: () => Reveal.prev(), 39: () => Reveal.next(),
      38: () => toSlideEnd(-1), 40: () => toSlideEnd(1) }
  }, opts.reveal || {}));
}
