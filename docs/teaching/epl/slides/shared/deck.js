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
// The running cloud: (z, w) iid N(0,1); x2 = z, x1 = rho z + sqrt(1-rho^2) w.
const PTS = normals(20260924, 400);

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
// Grid, arrowed axes, tick labels, and axis names (x2 horizontal, x1 vertical
// unless o.names says otherwise).
function axes(root, svg, P, o = {}) {
  const g = el(svg, 'g'), R = P.R, G = o.grid ?? 3, ticks = o.ticks ?? [-2, 2];
  const [nx, ny] = o.names ?? ['$x_2$', '$x_1$'];
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
  label(root, 'ax2', nx, P.X(R) + 10, P.Y(0) + 8, 't', '#444');
  label(root, 'ax1', ny, P.X(0) + 8, P.Y(R) - 14, 'l', '#444');
  return g;
}
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

const FIGS = {};    // name -> { init(root), render(root, p), duration?, linear?, enter? }
const ICONS = {};   // name -> function(svg), for <svg class="icon" data-icon="name">

// "n / N", with N counted before reveal wraps the slides into print pages.
let NSLIDES = 0;
function slideLabel(slide) { return [slide ? slide.dataset.n : '', '/', NSLIDES]; }

// State = data-init, then the data-set of each visible fragment in order.
function stateFor(root) {
  const p = JSON.parse(root.dataset.init || '{}');
  const slide = root.closest('section');
  [...slide.querySelectorAll('.fragment.visible[data-set]')]
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
async function startDeck(opts = {}) {
  if (PRINT) document.documentElement.classList.add('deck-print');
  document.querySelectorAll('.slides > section').forEach((sec, i) => { sec.dataset.n = i + 1; });
  NSLIDES = document.querySelectorAll('.slides > section').length;
  // \htmlClass tags symbols that a figure moves (the exponents on 22-4's Exp(theta) slide)
  renderMathInElement(document.querySelector('.slides'), { macros: MACROS, throwOnError: false,
    trust: ctx => ctx.command === '\\htmlClass',
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '$', right: '$', display: false }] });
  document.querySelectorAll('svg.bells').forEach(bells);
  document.querySelectorAll('svg.icon').forEach(svg => ICONS[svg.dataset.icon](svg));
  // Build every figure once, in its slide's initial state, before reveal
  // clones slides for printing: clones then carry the SVG and labels.
  document.querySelectorAll('.fig[data-fig]').forEach(root => { FIGS[root.dataset.fig].init(root); show(root); });
  if (!PRINT) wireKnobs();
  await document.fonts.ready;

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
