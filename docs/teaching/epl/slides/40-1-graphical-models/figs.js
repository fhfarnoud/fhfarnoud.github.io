// Figures of Graphical Models I (Part 6), redrawn from the TikZ pictures of
// src/40-GMs-Slides.tex: the same nodes at the same coordinates (TikZ cm, y up,
// times the picture's \scalebox), the same edges, directions, bends, loops,
// labels, fills and hatched (observed) nodes, each picture taking the share of
// the slide's width it takes on its Beamer page.  No overlay of this deck
// changes a picture, so every figure is drawn in one state.

Object.assign(MACROS, {
  '\\pa': '\\text{pa}', '\\mb': '\\text{mb}', '\\ber': '\\text{Ber}',
  '\\independent': '\\perp\\!\\!\\!\\perp', '\\bx': '{\\boldsymbol{x}}', '\\bm': '\\boldsymbol'
});

// ---------------------------------------------------------------- TikZ graphs
const CM_PT = 28.4527;   // TeX points per cm
const K = 100;           // px per TikZ cm at \scalebox 1: the slide's 1280 px over the Beamer page's 12.8 cm
// xcolor mixes with white: yellow!30, gray!20, gray!30, blue!20, blue!30, red!30
// (xcolor's gray is 50% black, so gray!20 is 90% white)
const XC = { y30: '#FFFFB3', g20: '#E6E6E6', g30: '#D9D9D9', b20: '#CCCCFF', b30: '#B3B3FF', r30: '#FFB3B3' };
// TikZ loop styles: out and in angles
const LOOP = { above: [105, 75], left: [195, 165], right: [15, -15], below: [285, 255] };
// TikZ label placements: the HTML anchor, the screen direction of the gap, the border angle
const PLACE = { above: ['b', 0, -1, 90], below: ['t', 0, 1, 270], left: ['r', -1, 0, 180], right: ['l', 1, 0, 0],
  'above left': ['br', -1, -1, 135], 'above right': ['bl', 1, -1, 45],
  'below left': ['tr', -1, 1, 225], 'below right': ['tl', 1, 1, 315] };

// A graph figure.  o.nodes: { id: { at: [x, y] (cm), d: diameter (cm), tex: label ($...$ is KaTeX),
// em: an emoji, es: its size in pt, fill, hatch: the colour of north-west lines (an observed node),
// plain: an undrawn text node } }; o.edges: [{ a, b, bend: degrees (+ left, - right), loop: 'left' |
// 'above' | 'right', lab, pos: a TikZ placement (none: TikZ's auto, left of the path) }];
// o.labels: [{ n, s, pos, gap (cm) }] text beside a node, as \node[pos=gap of n]; o.texts: [{ at, s,
// anchor }] text at a TikZ point; o.s px per cm; o.dir false for undirected edges; o.pad the margin
// around the nodes [left, top, right, bottom] in cm, room for labels and loops.  A node with fit
// is a circle TikZ sizes by its text: d is its diameter at 11 pt, scaled to the label's size here,
// and min its minimum size.
function graphFig(o) {
  const N = o.nodes, s = o.s;
  const tp = s / CM_PT;                                   // px per TeX point, in this picture
  // the picture's text, 11 pt at its scale, kept between 22 px and the body's 27 px
  o.fs = o.fs ?? Math.min(27, Math.max(22, 11 * tp));
  const fit = o.fs / (11 * tp);
  o.R = n => (n.fit ? Math.max(n.min ?? 0, n.d * fit) : n.d ?? 0.8) / 2;
  const R = o.R;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const k in N) {
    const n = N[k], r = R(n);
    x0 = Math.min(x0, n.at[0] - r); x1 = Math.max(x1, n.at[0] + r);
    y0 = Math.min(y0, n.at[1] - r); y1 = Math.max(y1, n.at[1] + r);
  }
  const [pl, pt, pr, pb] = o.pad || [0.15, 0.15, 0.15, 0.15];
  const ox = (pl - x0) * s, oy = (y1 + pt) * s;
  return { size: [Math.ceil((x1 - x0 + pl + pr) * s), Math.ceil((y1 - y0 + pt + pb) * s)],
    draw(g) { drawGraph(g, o, ox, oy); } };
}

// north-west lines (TikZ's pattern: "\" on the screen, 3 pt tiles of the page, so lines 2.1 pt
// apart, 7.5 px on the slide, whatever the picture's scale) inside a circle
function hatchD(cx, cy, r, step) {
  let d = '';
  const q = Math.SQRT1_2;
  for (let c = -r + step / 2; c < r; c += step) {
    const h = Math.sqrt(r * r - c * c), mx = cx + c * q, my = cy - c * q;
    d += `M${(mx - h * q).toFixed(1)},${(my - h * q).toFixed(1)}L${(mx + h * q).toFixed(1)},${(my + h * q).toFixed(1)}`;
  }
  return d;
}

function drawGraph(g, o, ox, oy) {
  const N = o.nodes, s = o.s, key = o.key || 'g', deg = Math.PI / 180;
  const P = ([x, y]) => [ox + x * s, oy - y * s];
  const R = o.R, fs = o.fs;
  const pt = s / CM_PT;                                   // px per TeX point, in this picture
  const lw = o.lw ?? Math.max(1.5, 0.8 * pt);             // thick
  const a = Math.max(0.95, (0.28 + 0.3 * 0.8) * pt);     // the stealth' arrow's unit
  const on = (n, t) => [n.at[0] + R(n) * Math.cos(t), n.at[1] + R(n) * Math.sin(t)];
  const along = (p, t, d) => [p[0] + d * Math.cos(t), p[1] + d * Math.sin(t)];
  const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const txt = (h, size) => `<span style="font-size:${size}px">${h}</span>`;
  const labs = [];
  (o.edges || []).forEach((e, i) => {
    const A = N[e.a], B = N[e.b ?? e.a], arrow = e.dir ?? o.dir ?? true;
    let S, E, c1 = null, c2 = null;
    if (e.loop) {
      const [to, ti] = LOOP[e.loop].map(v => v * deg);
      S = on(A, to); E = on(A, ti);
      const D = Math.max(8 * 0.3915 * dist(S, E), 0.5);  // looseness 8, min distance 5 mm
      c1 = along(S, to, D); c2 = along(E, ti, D);
    } else {
      const th = Math.atan2(B.at[1] - A.at[1], B.at[0] - A.at[0]), b = (e.bend || 0) * deg;
      S = on(A, th + b); E = on(B, th + Math.PI - b);
      if (b) { const D = 0.3915 * dist(S, E); c1 = along(S, th + b, D); c2 = along(E, th + Math.PI - b, D); }
    }
    if (e.lab != null) {
      // the label at the middle of the path; without a placement, on its left (TikZ's auto)
      const m = c1 ? [(S[0] + 3 * c1[0] + 3 * c2[0] + E[0]) / 8, (S[1] + 3 * c1[1] + 3 * c2[1] + E[1]) / 8]
        : [(S[0] + E[0]) / 2, (S[1] + E[1]) / 2];
      let pos = e.pos;
      if (!pos) {
        const t = c1 ? [E[0] - S[0] + c2[0] - c1[0], E[1] - S[1] + c2[1] - c1[1]] : [E[0] - S[0], E[1] - S[1]];
        const nx = -t[1], ny = t[0];
        pos = Math.abs(nx) >= Math.abs(ny) ? (nx < 0 ? 'left' : 'right') : (ny > 0 ? 'above' : 'below');
      }
      // the gap: the label node's inner sep (0.333 em, 0.13 cm), less the room the HTML box leaves above and below
      const [anc, sx, sy] = PLACE[pos], [x, y] = P(m), gp = e.gap ?? (sy ? 0.04 : 0.11) * s;
      labs.push([`${key}e${i}`, txt(e.lab, fs), [x + sx * gp, y + sy * gp], anc]);
    }
    let p0 = P(S), p1 = P(E), k1 = c1 && P(c1), k2 = c2 && P(c2);
    if (arrow) {
      const from = k2 || p0, L = dist(from, p1), u = [(p1[0] - from[0]) / L, (p1[1] - from[1]) / L];
      const tip = [p1[0] - u[0] * pt, p1[1] - u[1] * pt];   // shorten >=1pt
      const back = [tip[0] - u[0] * 4 * a, tip[1] - u[1] * 4 * a];
      if (k2) k2 = [k2[0] + back[0] - p1[0], k2[1] + back[1] - p1[1]];
      p1 = back;
      const Q = (x, y) => `${(tip[0] + u[0] * (x - 5) * a - u[1] * y * a).toFixed(2)},${(tip[1] + u[1] * (x - 5) * a + u[0] * y * a).toFixed(2)}`;
      e._head = `M${Q(5, 0)}C${Q(3.5, 0.5)} ${Q(-1, 1.5)} ${Q(-3, 4)}L${Q(-1, 0)}L${Q(-3, -4)}C${Q(-1, -1.5)} ${Q(3.5, -0.5)} ${Q(5, 0)}Z`;
    }
    const d = k1 ? `M${p0[0].toFixed(2)},${p0[1].toFixed(2)}C${k1[0].toFixed(2)},${k1[1].toFixed(2)} ${k2[0].toFixed(2)},${k2[1].toFixed(2)} ${p1[0].toFixed(2)},${p1[1].toFixed(2)}`
      : `M${p0[0].toFixed(2)},${p0[1].toFixed(2)}L${p1[0].toFixed(2)},${p1[1].toFixed(2)}`;
    g.el('path', { d, fill: 'none', stroke: '#000', 'stroke-width': lw });
    if (arrow) g.el('path', { d: e._head, fill: '#000', stroke: '#000', 'stroke-width': lw * 0.8, 'stroke-linejoin': 'round' });
  });
  for (const id in N) {
    const n = N[id], [cx, cy] = P(n.at), r = R(n) * s;
    if (!n.plain) {
      g.el('circle', { cx, cy, r, fill: n.hatch ? '#fff' : n.fill || o.fill || '#fff', stroke: 'none' });
      if (n.hatch) g.el('path', { d: hatchD(cx, cy, r, o.hstep ?? 7.5), stroke: n.hatch, 'stroke-width': 1, fill: 'none' });
      g.el('circle', { cx, cy, r, fill: 'none', stroke: '#000', 'stroke-width': lw });
    }
    const h = n.em ? `<span class="nd em" style="font-size:${(n.es * pt * (o.emk ?? 1.12)).toFixed(1)}px">${n.em}</span>`
      : `<span class="nd" style="font-size:${n.fs ?? fs}px">${n.tex}</span>`;
    labs.push([`${key}n-${id}`, h, [cx + (n.dx || 0), cy + (n.dy || 0)], 'c']);
  }
  (o.labels || []).forEach((l, i) => {
    const n = N[l.n], [anc, sx, sy, ang] = PLACE[l.pos], diag = sx && sy;
    const b = on(n, ang * deg), gap = l.gap ?? 0;
    // \node[pos=gap of n]: the label's facing anchor at n's border point, gap away (both ways
    // for a diagonal), its text an inner sep (0.333 em) further on
    const isep = diag ? 0.13 : 0.1;
    const q = [b[0] + sx * (gap + isep), b[1] - sy * (gap + isep)];
    labs.push([`${key}l${i}`, txt(l.s, l.fs ?? fs), P(q), anc]);
  });
  (o.texts || []).forEach((t, i) => labs.push([`${key}t${i}`, txt(t.s, t.fs ?? fs), P(t.at), t.anchor || 'c']));
  labs.forEach(([k, h, at, anc]) => g.label(k, h, at, anc));
}

// ---------------------------------------------------------------- the deck's pictures
const xs = (k, min) => ({ tex: `$${k}$`, d: 0.73, fit: true, min });
const sq4 = (s, edges) => graphFig({ s, key: 'q', pad: [0.1, 0.1, 0.1, 0.1],
  nodes: { x1: { at: [0, 0], ...xs('x_1', 0.1) }, x2: { at: [2.5, 0], ...xs('x_2', 0.1) },
    x3: { at: [0, -2.5], ...xs('x_3', 0.1) }, x4: { at: [2.5, -2.5], ...xs('x_4', 0.1) } },
  edges: edges.map(([a, b]) => ({ a, b })) });

// Slide 5: the four-node Bayesian network
FIGS.bn4 = sq4(K * 0.8, [['x1', 'x2'], ['x1', 'x3'], ['x1', 'x4'], ['x3', 'x4']]);
// Slide 6: the complete graph, and the network with the edge x2 -> x3 and x2 -> x4 removed
FIGS.complete = sq4(K * 0.7, [['x1', 'x2'], ['x1', 'x3'], ['x2', 'x3'], ['x1', 'x4'], ['x2', 'x4'], ['x3', 'x4']]);
FIGS.bnsmall = sq4(K * 0.7, [['x1', 'x2'], ['x1', 'x3'], ['x1', 'x4'], ['x3', 'x4']]);

// Slides 7 and 8: the traffic network with emoji nodes
const D45 = Math.SQRT1_2;
const trafficFig = (s, nd, d, tlab) => graphFig({ s, key: 'tr', fill: XC.y30, pad: [0.15, 0.1, 0.15, 0.82],
  nodes: { T: { at: [0, 0], d, em: '🚗', es: 24 }, A: { at: [-nd * D45, -nd * D45], d, em: '👩', es: 24 },
    B: { at: [nd * D45, -nd * D45], d, em: '👨', es: 24 }, C: { at: [2 * nd * D45, 0], d, em: '👦', es: 24 } },
  edges: [{ a: 'T', b: 'A' }, { a: 'T', b: 'B' }, { a: 'C', b: 'B' }],
  labels: [{ n: 'T', s: '$T$', pos: tlab, gap: 0.1 }, { n: 'A', s: '$A$', pos: 'below', gap: 0.1 },
    { n: 'B', s: '$B$', pos: 'below', gap: 0.1 }, { n: 'C', s: '$C$', pos: 'below', gap: 0.1 }] });
FIGS.traffic = trafficFig(K * 0.7, 2, 1.22, 'left');
FIGS.traffic8 = trafficFig(K * 0.6, 2.5, 1.4, 'below');

// Slide 10: information as water on the three structures and on a collider with a child W, the
// node in question unobserved (left) and observed (right).  A timed story plays in all eight panels
// at once: a stream leaves X with droplets riding in it, at speed V.  An observed chain or fork node
// is a dam: the stream stops at its wall and piles up there, rippling.  At a collider the stream
// pours out through an unobserved Y (and its unobserved child), its droplets fading as they fall;
// an observed Y or an observed child, with a dam at its bottom, fills with water and sends the
// stream back up to Z.  Z fills when the stream reaches it.  The scene holds, fades and starts
// again, from the beginning each time the slide is entered.  Print shows the completed state.
{
  const s = K * 0.52, d = 0.74, gap = 1.75, low = 0.85, kid = 1.35, r = d * s / 2, drop = 28;
  const WATER = '#2E86DE', WET = '#D4E9FA', DAM = '#8B5A2B';
  const V = 115, GD = 15, DR = 3.2, POOL = 0.7, HOLD = 1.6, FADE = 0.6, RIP = 0.75;
  const PW = 2 * gap * s + d * s + 8, CG = 34, HH = 30, RL = 26, RG = 8;
  const RH = [RL + 2 * r + 4, RL + 2 * r + 4, RL + low * s + 2 * r + drop + 4, RL + (low + kid) * s + 2 * r + drop + 4];
  const W = 2 * PW + CG, H = HH + RH.reduce((a, b) => a + b) + 3 * RG;
  const kinds = [['Chain', [['X', 'Y'], ['Y', 'Z']]], ['Fork', [['Y', 'X'], ['Y', 'Z']]],
    ['Collider', [['X', 'Y'], ['Z', 'Y']]], ['Collider with a child $W$', [['X', 'Y'], ['Z', 'Y'], ['Y', 'W']]]];
  const txt = (h, size) => `<span style="font-size:${size}px">${h}</span>`;
  const clamp01 = u => Math.max(0, Math.min(1, u));
  // a polyline's cumulative lengths, and its point at arc length u
  const cumOf = pts => pts.reduce((c, q, i) => (c.push(i ? c[i - 1] + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0), c), []);
  const at = (pts, cum, u) => {
    let i = 1;
    while (i < pts.length - 1 && cum[i] < u) i++;
    const f = (u - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return [pts[i - 1][0] + f * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1])];
  };
  // the stream's head: V per second, waiting POOL seconds where a pool fills
  const frontAt = (a, t) => {
    const u = V * t;
    if (a.pauseAt == null || u < a.pauseAt) return Math.min(u, a.L);
    return Math.min(Math.max(a.pauseAt, u - V * POOL), a.L);
  };
  const tEnd = a => (a.L + (a.pauseAt == null ? 0 : V * POOL)) / V;
  let T = 0;   // one cycle, set by the slowest panel
  const segPath = (cx, cy, lv) => {   // the part of a node's disc below the level lv
    const dy = Math.max(-r, Math.min(r, lv - cy)), dx = Math.sqrt(Math.max(0, r * r - dy * dy));
    if (dx < 0.5) return 'M0,0';
    return `M${(cx - dx).toFixed(1)},${lv.toFixed(1)}A${r},${r} 0 ${dy < 0 ? 1 : 0} 0 ${(cx + dx).toFixed(1)},${lv.toFixed(1)}Z`;
  };
  function update(panels, t) {
    const op = t > T - FADE ? clamp01((T - t) / FADE) : 1;
    for (const a of panels) {
      const front = frontAt(a, t);
      a.body.setAttribute('stroke-dasharray', `${front.toFixed(1)} ${a.L + 60}`);
      a.body.setAttribute('stroke-opacity', 0.25 * op);
      a.core.setAttribute('stroke-dasharray', `${front.toFixed(1)} ${a.L + 60}`);
      a.core.setAttribute('stroke-opacity', 0.35 * op);
      const phase = (V * t) % GD;
      a.drops.forEach((e, j) => {
        const u = phase + j * GD;
        let o = u <= front - 2 ? op : 0;
        if (o && a.outlet != null && u > a.outlet) o *= clamp01(1 - (u - a.outlet) / (a.L - a.outlet));
        if (o) { const [px, py] = at(a.pts, a.cum, u); e.setAttribute('cx', px.toFixed(1)); e.setAttribute('cy', py.toFixed(1)); }
        e.setAttribute('opacity', o.toFixed(2));
      });
      if (a.zwet) a.zwet.setAttribute('opacity', (clamp01((front - (a.L - r)) / r) * op).toFixed(2));
      if (a.npool) {   // the observed node fills from its bottom to just above its middle
        const f = clamp01((t - a.pauseAt / V) / POOL);
        a.npool.setAttribute('d', segPath(a.bot[0], a.bot[1], a.bot[1] + r - f * 1.15 * r));
        a.npool.setAttribute('fill-opacity', 0.35 * op);
      }
      if (a.dpool) {   // water piling up against the dam, with ripples off the wall
        const ta = a.L / V, f = clamp01((t - ta) / 0.8), [wx, wy] = a.wall;
        a.dpool.setAttribute('d', f > 0.02 ? `M${wx},${wy - 16 * f}A${22 * f},${16 * f} 0 0 0 ${wx},${wy + 16 * f}Z` : 'M0,0');
        a.dpool.setAttribute('fill-opacity', 0.3 * op);
        const q = t > ta ? ((t - ta) % RIP) / RIP : -1;
        a.ripple.setAttribute('r', q < 0 ? 0 : (3 + 15 * q).toFixed(1));
        a.ripple.setAttribute('opacity', q < 0 ? 0 : ((1 - q) * 0.7 * op).toFixed(2));
      }
    }
  }
  function run(root) {
    if (root._flowRun) return;
    root._flowRun = true;
    let t0 = 0, was = false;
    const tick = now => {
      if (!root.isConnected) { root._flowRun = false; return; }
      const on = !!root.closest('section.present');
      if (on && !was) t0 = now;
      was = on;
      if (on && root._flow) update(root._flow, ((now - t0) / 1000) % T);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  FIGS.flow = { size: [Math.ceil(W), Math.ceil(H)], draw(g) {
    const panels = [];
    let top = HH;
    ['Unobserved', 'Observed'].forEach((h, col) =>
      g.label(`wh${col}`, txt(h, 22), [col * (PW + CG) + PW / 2, HH - 6], 'b'));
    kinds.forEach(([name, edges], row) => {
      const v = row >= 2, child = row === 3;
      g.label(`wr${row}`, txt(`<b>${name}</b>`, 20), [0, top + RL / 2 - 4], 'l', { color: '#463C7D' });
      [false, true].forEach((obs, col) => {
        const key = `w${row}${col}`, wet = !obs !== v;
        const nodes = { X: { at: [0, 0], tex: '$X$', d, fill: WET },
          Y: { at: [gap, v ? -low : 0], tex: '$Y$', d, hatch: obs && !child ? XC.b30 : null },
          Z: { at: [2 * gap, 0], tex: '$Z$', d } };
        if (child) nodes.W = { at: [gap, -low - kid], tex: '$W$', d, hatch: obs ? XC.b30 : null };
        // two passes: the nodes' fills first, then the water over them, then the edges, outlines and
        // hatching over the water, so the water is seen to run through a node
        const pass = (nd, es) => { const o = { s, key, pad: [0, 0, 0, 0], fs: 22, nodes: nd, edges: es }; graphFig(o); return o; };
        const map = f => Object.fromEntries(Object.entries(nodes).map(([k, n]) => [k, { ...n, hatch: null, ...f(n) }]));
        const ox = col * (PW + CG) + 4 + r, oy = top + RL + r + 2;
        drawGraph(g, pass(map(() => ({})), []), ox, oy);
        const P = ([x, y]) => [ox + x * s, oy - y * s];
        const [x, y, z] = ['X', 'Y', 'Z'].map(k => P(nodes[k].at));
        const below = q => [q[0], q[1] + r + drop];
        const bot = v && (child ? P(nodes.W.at) : y);   // a collider's bottom node: Y, or its child W
        const a = { bot };
        if (!v) a.pts = obs ? [x, [y[0] - r - 10, y[1]]] : [x, y, z];
        else if (obs) a.pts = [x, [y[0] - 5, y[1]], [bot[0] - 5, bot[1] + r - 6], [bot[0] + 5, bot[1] + r - 6], [y[0] + 5, y[1]], z];
        else a.pts = child ? [x, y, bot, below(bot)] : [x, y, below(y)];
        a.cum = cumOf(a.pts); a.L = a.cum[a.cum.length - 1];
        if (v && obs) a.pauseAt = a.cum[2];
        if (v && !obs) a.outlet = a.cum[a.cum.length - 2] + r;
        if (wet) a.zwet = g.el('circle', { cx: z[0], cy: z[1], r: r - 1, fill: WET, opacity: 0 });
        if (v && obs) a.npool = g.el('path', { d: 'M0,0', fill: WATER, 'fill-opacity': 0, stroke: 'none' });
        const wj = { stroke: WATER, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': `0 ${a.L + 60}` };
        a.body = g.path(a.pts, { ...wj, 'stroke-width': 16, 'stroke-opacity': 0 });
        a.core = g.path(a.pts, { ...wj, 'stroke-width': 6, 'stroke-opacity': 0 });
        a.drops = Array.from({ length: Math.ceil(a.L / GD) + 1 }, () => g.el('circle', { cx: x[0], cy: x[1], r: DR, fill: WATER, opacity: 0 }));
        if (!v && obs) {   // the dam, the water piling up against it, and its ripple
          const wx = y[0] - r - 7;
          a.wall = [wx - 1, y[1]];
          a.dpool = g.el('path', { d: 'M0,0', fill: WATER, 'fill-opacity': 0, stroke: 'none' });
          a.ripple = g.el('circle', { cx: wx - 2, cy: y[1], r: 0, fill: 'none', stroke: WATER, 'stroke-width': 1.5, opacity: 0 });
          g.el('rect', { x: wx - 1, y: y[1] - 20, width: 8, height: 40, rx: 2, fill: DAM });
        }
        if (v && obs) g.el('rect', { x: bot[0] - 20, y: bot[1] + r - 1, width: 40, height: 8, rx: 2, fill: DAM });
        drawGraph(g, pass(map(() => ({ fill: 'none' })), edges.map(([a, b]) => ({ a, b }))), ox, oy);
        for (const k in nodes) if (nodes[k].hatch) {
          const [cx, cy] = P(nodes[k].at);
          g.el('path', { d: hatchD(cx, cy, r, 7.5), stroke: nodes[k].hatch, 'stroke-width': 1, fill: 'none' });
        }
        panels.push(a);
      });
      top += RH[row] + RG;
    });
    T = Math.max(...panels.map(tEnd)) + HOLD + FADE;
    g.root._flow = panels;
    if (PRINT) update(panels, T - FADE - 0.05);
    else { update(panels, 0); run(g.root); }
  } };
}

// Slides 11 and 12: the traffic network as letters; on 12, B is observed
const dsepFig = obs => graphFig({ s: K * 0.7, key: 'ds',
  nodes: { T: { at: [0, 0], tex: '$T$' }, A: { at: [-2.5 * D45, -2.5 * D45], tex: '$A$' },
    B: { at: [2.5 * D45, -2.5 * D45], tex: '$B$', hatch: obs ? XC.b30 : null }, C: { at: [5 * D45, 0], tex: '$C$' } },
  edges: [{ a: 'T', b: 'A' }, { a: 'T', b: 'B' }, { a: 'C', b: 'B' }] });
FIGS.dsep = dsepFig(false);
FIGS.dsepB = dsepFig(true);

// Slide 13: the five-node network
FIGS.complex = graphFig({ s: K * 0.65, key: 'cx',
  nodes: { A: { at: [0, 0], tex: '$A$', d: 0.7 }, B: { at: [2, 0], tex: '$B$', d: 0.7 }, C: { at: [0, -2], tex: '$C$', d: 0.7 },
    D: { at: [2, -2], tex: '$D$', d: 0.7 }, E: { at: [4, -2], tex: '$E$', d: 0.7 } },
  edges: [{ a: 'A', b: 'C' }, { a: 'B', b: 'D' }, { a: 'C', b: 'D' }, { a: 'D', b: 'E' }] });

// Slide 14: the causal health model (circles sized by their words, as TikZ draws them), beside
// the questions and as tall as their column, since above them the questions would not fit
{
  const w = d => ({ d, fit: true, min: 1 });
  FIGS.health = graphFig({ s: K * 0.9, key: 'hm',
    nodes: { G: { at: [0, 0], tex: 'Genes', ...w(1.31) }, S: { at: [2.5, 0], tex: 'Smoking', ...w(1.74) },
      C: { at: [0, -2], tex: 'Cancer', ...w(1.49) }, X: { at: [2.5, -2], tex: 'X-ray', ...w(1.31) },
      D: { at: [0, -4], tex: 'Dyspnea', ...w(1.74) } },
    edges: [{ a: 'G', b: 'C' }, { a: 'S', b: 'C' }, { a: 'C', b: 'X' }, { a: 'C', b: 'D' }] });
}

// Slide 15: a Markov blanket (parents, children and the co-parent gray, X blue)
{
  const d = 1.8, h = d * D45;
  FIGS.blanket = graphFig({ s: K * 0.8, key: 'mb',
    nodes: { p1: { at: [0, 0], ...xs('p_1', 0.7), fill: XC.g20 }, p2: { at: [d, 0], ...xs('p_2', 0.7), fill: XC.g20 },
      X: { at: [h, -h], tex: '$X$', d: 0.7, fill: XC.b20 }, c1: { at: [0, -2 * h], ...xs('c_1', 0.7), fill: XC.g20 },
      c2: { at: [2 * h, -2 * h], ...xs('c_2', 0.7), fill: XC.g20 }, s: { at: [h + d, -h], tex: '$s$', d: 0.7, fill: XC.g20 },
      o1: { at: [-d, 0], ...xs('o_1', 0.7) }, o2: { at: [2 * d, 0], ...xs('o_2', 0.7) },
      d1: { at: [-d, -2 * h], ...xs('d_1', 0.7) }, d2: { at: [2 * h + d, -2 * h], ...xs('d_2', 0.7) } },
    edges: [['o1', 'p1'], ['o2', 'p2'], ['c1', 'd1'], ['c2', 'd2'], ['p1', 'X'], ['p2', 'X'], ['X', 'c1'],
      ['X', 'c2'], ['s', 'c2']].map(([a, b]) => ({ a, b })) });
}

// Slide 16: the chain x1 -> x2 -> x3 -> x4 -> ...
FIGS.chain = graphFig({ s: K, key: 'ch', pad: [0.1, 0.1, 0.05, 0.1],
  nodes: { x1: { at: [0, 0], tex: '$x_1$' }, x2: { at: [2, 0], tex: '$x_2$' }, x3: { at: [4, 0], tex: '$x_3$' },
    x4: { at: [6, 0], tex: '$x_4$' }, dots: { at: [8, 0], tex: '$\\cdots$', plain: true, d: 0.62 } },
  edges: [['x1', 'x2'], ['x2', 'x3'], ['x3', 'x4'], ['x4', 'dots']].map(([a, b]) => ({ a, b })) });

// Slide 17: the weather chain's state transition graph and, at (4, 1), its matrix: an HTML table,
// since KaTeX has no metrics for emoji.  At 0.8 of the source's scale: the slide is full
{
  const SU = '☀️', CL = '☁️', RA = '🌧️', em = s => `<span class="me">${s}</span>`;
  const row = (h, vs) => `<tr><th>${em(h)}</th>${vs.map(v => `<td>$${v}$</td>`).join('')}</tr>`;
  const matrix = `<table class="wxm"><tr><th></th><td>${em(SU)}</td><td>${em(CL)}</td><td>${em(RA)}</td></tr>` +
    row(SU, ['0.7', '0.2', '0.1']) + row(CL, ['0.3', '0.4', '0.3']) + row(RA, ['0.2', '0.3', '0.5']) + '</table>';
  FIGS.weather = graphFig({ s: K * 0.8, key: 'wx', fill: XC.y30, pad: [1.05, 0.95, 5.45, 0.72],
    nodes: { c: { at: [0, 2], em: CL, es: 16, d: 0.79 }, s: { at: [-1.5, 0], em: SU, es: 16, d: 0.79 },
      r: { at: [1.5, 0], em: RA, es: 16, d: 0.79 } },
    edges: [{ a: 's', b: 'c', bend: 30, lab: '0.2', pos: 'above left' }, { a: 'c', b: 's', lab: '0.3', pos: 'below right' },
      { a: 'c', b: 'r', bend: 30, lab: '0.3', pos: 'above right' }, { a: 'r', b: 'c', lab: '0.3', pos: 'below left' },
      { a: 's', b: 'r', bend: -30, lab: '0.1', pos: 'below' }, { a: 'r', b: 's', lab: '0.2', pos: 'above' },
      { a: 's', loop: 'left', lab: '0.7' }, { a: 'c', loop: 'above', lab: '0.4' }, { a: 'r', loop: 'right', lab: '0.5' }],
    texts: [{ at: [4.1, 1], anchor: 'l', s: matrix }] });
}

// Slide 18: the hidden Markov model (observed x gray)
FIGS.hmm = graphFig({ s: K * 0.8, key: 'hmm',
  nodes: Object.fromEntries([1, 2, 3, 4].flatMap(t => [[`z${t}`, { at: [2 * (t - 1), 0], tex: `$z_${t}$` }],
    [`x${t}`, { at: [2 * (t - 1), -2], tex: `$x_${t}$`, fill: XC.g30 }]])),
  edges: [['z1', 'z2'], ['z2', 'z3'], ['z3', 'z4'], ['z1', 'x1'], ['z2', 'x2'], ['z3', 'x3'], ['z4', 'x4']].map(([a, b]) => ({ a, b })) });

// Slide 30: denoising a 64 x 48 black-and-white picture (black -1, white +1, as in the notes) with
// iterated conditional modes on the energy of slide 29, alpha = 0 and beta = 1, the four nearest
// pixels as neighbours.  The noise is horizontal scratches: a fixed sequence of runs of 8 to 20
// pixels in random rows (mulberry32 seed 7), each pixel of a run flipped; the noise level p keeps
// the first runs of the sequence that together flip a fraction p of the pixels, so raising p only
// adds scratches.  Each sweep visits the pixels in its own fixed random order (seed 1000 + sweep
// number), so that a scratch shrinks from its ends over several sweeps (in raster order a scratch
// is erased in one pass).  k counts sweeps; a fractional k stops part-way through a sweep.  The
// estimate shows the pixels the current sweep has changed in red.  The pictures are drawn on a
// canvas, five screen pixels per image pixel, and placed as SVG images.
const DN = (() => {
  const w = 64, h = 48, n = w * h, truth = new Int8Array(n);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const dx = c - 31.5, dy = r - 23.5, R = Math.hypot(dx, dy), a = Math.atan2(dy, dx) * 180 / Math.PI;
    const ring = R > 17.5 && R < 21.5;
    const eye = Math.hypot(c - 24, r - 17) < 3.2 || Math.hypot(c - 39, r - 17) < 3.2;
    const mouth = R > 9 && R < 12.2 && a > 25 && a < 155;
    const brow = r === 12 && ((c >= 21 && c <= 27) || (c >= 36 && c <= 42));
    truth[r * w + c] = ring || eye || mouth || brow ? -1 : 1;
  }
  // first[i]: the index of the first scratch covering pixel i; cov[m]: pixels the first m scratches cover
  const rnd = mulberry32(7), first = new Int32Array(n).fill(1 << 30), cov = [0];
  for (let j = 0, got = 0; got < 0.4 * n; j++) {
    const len = 8 + Math.floor(rnd() * 13), r = Math.floor(rnd() * h), c0 = Math.floor(rnd() * (w - len + 1));
    for (let c = c0; c < c0 + len; c++) { const i = r * w + c; if (first[i] > j) { first[i] = j; got++; } }
    cov.push(got);
  }
  const observe = p => {
    let m = 0;
    while (cov[m] < p * n - 1e-9) m++;
    return Int8Array.from(truth, (t, i) => first[i] < m ? -t : t);
  };
  const perms = [];
  const perm = s => {
    if (!perms[s]) {
      const r = mulberry32(1000 + s), o = Int32Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = o[i]; o[i] = o[j]; o[j] = t; }
      perms[s] = o;
    }
    return perms[s];
  };
  // x after k sweeps from x = y, with the pixels the current sweep has changed and their number
  function icm(y, zeta, k, beta = 1) {
    const x = Int8Array.from(y), m = Math.round(k * n), changed = new Uint8Array(n);
    let nch = 0;
    for (let t = 0; t < m; t++) {
      const s = Math.floor(t / n), j = t - s * n, i = perm(s)[j], r = (i / w) | 0, c = i - r * w;
      if (j === 0) { changed.fill(0); nch = 0; }
      let q = 0;
      if (c > 0) q += x[i - 1]; if (c < w - 1) q += x[i + 1];
      if (r > 0) q += x[i - w]; if (r < h - 1) q += x[i + w];
      const f = beta * q + zeta * y[i], v = f > 0 ? 1 : f < 0 ? -1 : x[i];
      if (v !== x[i]) { x[i] = v; changed[i] = 1; nch++; }
    }
    return { x, changed, nch };
  }
  const wrong = x => x.reduce((a, v, i) => a + (v !== truth[i]), 0);
  return { w, h, n, truth, observe, icm, wrong };
})();
{
  const cell = 3.75, PX = 5, IW = DN.w * cell, IH = DN.h * cell, GAP = 56, TOP = 30;
  const W = 3 * IW + 2 * GAP, H = TOP + IH + 62;
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const urls = new Map();
  // a picture as a PNG data URL; pixels marked in `red` are drawn dark red (now black) or light red (now white)
  const url = (x, red) => {
    const key = x.join('') + (red ? red.join('') : '');
    if (urls.has(key)) return urls.get(key);
    canvas.width = DN.w * PX; canvas.height = DN.h * PX;
    const cx = canvas.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < DN.n; i++) {
      const hot = red && red[i];
      if (x[i] > 0 && !hot) continue;
      cx.fillStyle = hot ? (x[i] < 0 ? '#C62828' : '#F4A3A3') : '#222';
      cx.fillRect((i % DN.w) * PX, ((i / DN.w) | 0) * PX, PX, PX);
    }
    const u = canvas.toDataURL('image/png');
    if (urls.size > 400) urls.clear();
    urls.set(key, u);
    return u;
  };
  const pct = x => (100 * DN.wrong(x) / DN.n).toFixed(1) + '%';
  const txt = (h, size = 20) => `<span style="font-size:${size}px">${h}</span>`;
  // about 0.8 s a sweep, so that a run of sweeps plays one sweep at a time
  FIGS.icm = { size: [W, H], linear: true, duration: (a, b) => Math.min(8000, Math.max(1200, 800 * Math.abs((b.k ?? 0) - (a.k ?? 0)))),
    draw(g, p) {
    const y = DN.observe(p.p), k = Math.max(0, p.k), { x, changed, nch } = DN.icm(y, p.zeta, k);
    const sweep = Math.ceil(Math.round(k * DN.n) / DN.n);
    [[DN.truth, 'True image'], [y, 'Observed $y$'], [x, 'Estimate $x$']].forEach(([img, title], j) => {
      const x0 = j * (IW + GAP);
      g.label(`ic${j}`, txt(title, 22), [x0 + IW / 2, TOP - 8], 'b');
      g.el('image', { x: x0, y: TOP, width: IW, height: IH, href: url(img, j === 2 && sweep ? changed : null), preserveAspectRatio: 'none' });
      g.el('rect', { x: x0, y: TOP, width: IW, height: IH, fill: 'none', stroke: '#888', 'stroke-width': 1 });
    });
    g.label('icy', txt(`$p = ${p.p.toFixed(2)}$: ${pct(y)} of pixels flipped,<br>in horizontal scratches 8 to 20 pixels long`), [IW + GAP + IW / 2, TOP + IH + 8], 't');
    g.label('icx', txt(`$\\zeta = ${p.zeta.toFixed(1)}$: ${pct(x)} wrong` + (sweep ? `<br>sweep ${sweep}: <span style="color:#C62828">${nch} changed</span>` : '')),
      [2 * (IW + GAP) + IW / 2, TOP + IH + 8], 't');
  } };
}

// Slides 22, 24 and 26: the friendship network
const FRIENDS = { 1: [[0, 0], '🧑'], 2: [[2, 0], '👩'], 3: [[2, -2], '👨'], 4: [[0, -2], '🧔'], 5: [[3.5, -1], '👴'] };
const FEDGES = [[1, 2], [2, 3], [3, 4], [4, 1], [3, 5], [2, 5]];
const friendsFig = (s, fill, labels) => graphFig({ s, key: 'fr', dir: false, pad: labels ? [0.36, 0.47, 0.47, 0.47] : undefined,
  nodes: Object.fromEntries(Object.entries(FRIENDS).map(([k, [at, em]]) => [k, { at, em, es: 20, d: 0.99, ...fill(+k) }])),
  edges: FEDGES.map(([a, b]) => ({ a, b })),
  labels: labels ? [[1, 'above left'], [2, 'above right'], [3, 'below right'], [4, 'below left'], [5, 'right']]
    .map(([n, pos]) => ({ n, s: `$x_${n}$`, pos, gap: -0.05 })) : [] });
FIGS.friends = friendsFig(K * 0.9, () => ({ fill: XC.y30 }), true);
FIGS.friendsObs = friendsFig(K * 0.7, k => k === 2 || k === 4 ? { hatch: XC.b30 } : { fill: XC.y30 }, true);
// Slide 24: two configurations of the network, all agreeing (left) and alternating (right)
{
  const off = 7.35, nodes = {};
  for (const [k, [at, em]] of Object.entries(FRIENDS)) {
    nodes[k] = { at, em, es: 20, d: 0.99, fill: XC.b30 };
    nodes[k + 'b'] = { at: [at[0] + off, at[1]], em, es: 20, d: 0.99, fill: +k === 2 || +k === 4 ? XC.r30 : XC.b30 };
  }
  FIGS.configs = graphFig({ s: K * 0.55, key: 'cf', dir: false, pad: [0.15, 0.1, 0.7, 1.1], nodes,
    edges: FEDGES.flatMap(([a, b]) => [{ a, b }, { a: a + 'b', b: b + 'b' }]),
    texts: [{ at: [2, -2.95], anchor: 't', s: 'All agree: $1 \\cdot 1 \\cdot 1 \\cdot 1 = 1$' },
      { at: [2 + off, -2.95], anchor: 't', s: 'Alternating: $0.5^3 \\cdot 0.3 = 0.0375$' }] });
}

// Slide 28: a gas in gravity.  Molecules of mass m (teal) and 3m (brown) in a column of height 1
// (units where the light molecules' scale height k_B T / (m g) is 0.35 at T = 1), and beside it the
// fraction of each kind in ten height bands, with the Boltzmann probability of each band as a curve.  Live, each
// molecule flies freely under gravity and bounces off the walls; at random times, NU per second on
// average, a collision with the rest of the gas replaces its velocity by a draw from the Maxwell
// distribution, each component N(0, S T / m) (Andersen's heat bath), so the long-run height
// distribution is p(h) ∝ exp(-m g h / k_B T).  Molecules start spread uniformly when the slide is
// entered (the heavy ones again when they appear) and settle.
// Print shows a settled state: heights drawn from p(h) by stratified inverse CDF (seed 11).
{
  const CW = 170, CH = 360, X0 = 58, TOP = 46, HX = X0 + CW + 58, HW = 200, NB = 10, FMAX = 0.8;
  const BH = CH / NB, FLOOR = TOP + CH, R0 = 7, N = 160;
  const S = 0.2, H0 = 0.35, G = S / H0, NU = 1;   // S T / m: velocity variance; G: gravity; NU: collisions a second
  const SP = [{ m: 1, r: 4.5, color: C.teal, off: 4 }, { m: 3, r: 6.5, color: C.brown, off: 19 }];
  const W = HX + HW + 26, H = FLOOR + 64;
  const scale = (T, m) => H0 * T / m;                                   // scale height
  const band = (T, m, b) => { const a = scale(T, m), z = 1 - Math.exp(-1 / a);
    return (Math.exp(-b / NB / a) - Math.exp(-(b + 1) / NB / a)) / z; };
  const dens = (T, m, h) => { const a = scale(T, m); return Math.exp(-h / a) / a / (1 - Math.exp(-1 / a)); };
  const sample = (T, m, seed) => {   // stratified draws from p(h), x uniform
    const r = mulberry32(seed), a = scale(T, m), z = 1 - Math.exp(-1 / a), u = [];
    for (let i = 0; i < N; i++) u.push((i + r()) / N);
    return u.map(q => ({ x: r(), h: -a * Math.log(1 - q * z), vx: 0, vh: 0 }));
  };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  const spread = (T, m) => Array.from({ length: N }, () => {
    const sd = Math.sqrt(S * T / m);
    return { x: Math.random(), h: Math.random(), vx: sd * gauss(), vh: sd * gauss() };
  });
  const px = (q, r) => [X0 + R0 + q.x * (CW - 2 * R0), FLOOR - R0 - q.h * (CH - 2 * R0)];
  const txt = (h, size = 20) => `<span style="font-size:${size}px">${h}</span>`;
  // the bars of one kind from its molecules' heights
  const fracs = mols => { const c = new Array(NB).fill(0);
    for (const q of mols) c[Math.min(NB - 1, Math.floor(q.h * NB))]++;
    return c.map(k => k / mols.length); };
  const barW = f => Math.min(HW, f / FMAX * HW);
  const gasPaint = G0 => {
    SP.forEach((sp, k) => {
      G0.mols[k].forEach((q, i) => { const [cx, cy] = px(q); G0.dots[k][i].setAttribute('cx', cx.toFixed(1)); G0.dots[k][i].setAttribute('cy', cy.toFixed(1)); });
      fracs(G0.mols[k]).forEach((f, b) => G0.bars[k][b].setAttribute('width', barW(f).toFixed(1)));
    });
  };
  const gasStep = (G0, dt) => {
    SP.forEach((sp, k) => {
      const sd = Math.sqrt(S * G0.T / sp.m), pc = 1 - Math.exp(-NU * dt);
      for (const q of G0.mols[k]) {
        // free flight for dt, bouncing exactly where the parabola meets the floor or the ceiling
        let t = dt;
        for (let n = 0; n < 4 && t > 0; n++) {
          const h1 = q.h + q.vh * t - G * t * t / 2;
          if (h1 >= 0 && h1 <= 1) { q.h = h1; q.vh -= G * t; t = 0; break; }
          const tw = Math.min(t, Math.max(0, h1 < 0 ? (q.vh + Math.sqrt(q.vh * q.vh + 2 * G * q.h)) / G
            : (q.vh - Math.sqrt(Math.max(0, q.vh * q.vh - 2 * G * (1 - q.h)))) / G));
          q.h = h1 < 0 ? 0 : 1; q.vh = -(q.vh - G * tw); t -= tw;
        }
        q.x += q.vx * dt;
        if (q.x < 0) { q.x = -q.x; q.vx = -q.vx; } if (q.x > 1) { q.x = 2 - q.x; q.vx = -q.vx; }
        q.h = Math.min(1, Math.max(0, q.h)); q.x = Math.min(1, Math.max(0, q.x));
        if (Math.random() < pc) { q.vx = sd * gauss(); q.vh = sd * gauss(); }   // a collision
      }
    });
  };
  const gasRun = root => {
    if (root._gasRun) return;
    root._gasRun = true;
    let last = 0, was = false;
    const tick = now => {
      if (!root.isConnected) { root._gasRun = false; return; }
      const G0 = root._gas, on = !!root.closest('section.present');
      if (G0 && on) {
        if (!was) { G0.mols = SP.map(sp => spread(G0.T, sp.m)); last = now; }
        gasStep(G0, Math.min(1 / 30, (now - last) / 1000));
        gasPaint(G0);
      }
      was = on; last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  FIGS.gas = { size: [W, H], draw(g, p) {
    const T = p.T, hv = Math.max(0, Math.min(1, p.heavy ?? 0));
    let G0 = g.root._gas;
    if (!G0 || PRINT) G0 = g.root._gas = { mols: SP.map((sp, k) => sample(T, sp.m, 11 + k)), heavyOn: hv > 0 };
    if (!PRINT && hv > 0 && !G0.heavyOn) G0.mols[1] = spread(T, SP[1].m);   // the heavy kind appears spread out
    G0.heavyOn = hv > 0; G0.T = T;
    // the column, its height axis and gravity
    g.el('rect', { x: X0, y: TOP, width: CW, height: CH, fill: '#F7F7F7', stroke: '#777', 'stroke-width': 1.5 });
    g.line([X0 - 4, FLOOR], [X0 + CW + 4, FLOOR], { stroke: '#444', 'stroke-width': 4 });
    g.arrow([X0 - 26, FLOOR], [X0 - 26, TOP - 6]);
    g.label('gh', txt('$h$', 22), [X0 - 34, TOP + 4], 'r');
    g.text([X0 - 38, FLOOR + 6], '0', { anchor: 'middle' });
    g.arrow([X0 + CW + 30, TOP + 14], [X0 + CW + 30, TOP + 74], { color: C.ink, w: 2 });
    g.label('gg', txt('$g$', 22), [X0 + CW + 38, TOP + 44], 'l');
    // the molecules
    G0.dots = SP.map((sp, k) => G0.mols[k].map(q => { const [cx, cy] = px(q);
      return g.el('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: sp.r, fill: sp.color, 'fill-opacity': 0.8,
        stroke: '#fff', 'stroke-width': 0.8, opacity: k ? hv : 1 }); }));
    g.label('gl0', txt('mass $m$'), [X0 + 14, TOP - 22], 'l', { color: C.teal });
    g.el('circle', { cx: X0 + 4, cy: TOP - 22, r: SP[0].r, fill: C.teal });
    g.label('gl1', txt('mass $3m$'), [X0 + 124, TOP - 22], 'l', { color: C.brown, opacity: hv });
    g.el('circle', { cx: X0 + 114, cy: TOP - 22, r: SP[1].r, fill: C.brown, opacity: hv });
    // the bands: bars from the molecules, curves from the Boltzmann distribution
    for (let b = 1; b < NB; b++) g.line([HX, FLOOR - b * BH], [HX + HW, FLOOR - b * BH], { stroke: C.grid, 'stroke-width': 1 });
    G0.bars = SP.map((sp, k) => fracs(G0.mols[k]).map((f, b) => g.el('rect', { x: HX, y: (FLOOR - (b + 1) * BH + sp.off).toFixed(1),
      width: barW(f).toFixed(1), height: 13, fill: sp.color, 'fill-opacity': 0.55, opacity: k ? hv : 1 })));
    // the curve through each band's Boltzmann probability at the band's middle height:
    // the band [h - d/2, h + d/2] holds p(h) 2a sinh(d / 2a) of the molecules, a the scale height
    SP.forEach((sp, k) => {
      const a = scale(T, sp.m), d = 1 / NB, c = 2 * a * Math.sinh(d / 2 / a) / FMAX * HW, pts = [];
      for (let i = 0; i <= 80; i++) { const h = d / 2 + (1 - d) * i / 80; pts.push([HX + dens(T, sp.m, h) * c, FLOOR - h * CH]); }
      g.path(pts, { color: sp.color, w: 2.5, opacity: k ? hv : 1 });
    });
    g.line([HX, FLOOR], [HX, TOP], { stroke: C.axis, 'stroke-width': 1.5 });
    g.line([HX, FLOOR], [HX + HW, FLOOR], { stroke: C.axis, 'stroke-width': 1.5 });
    [0, 0.2, 0.4, 0.6, 0.8].forEach(f => {
      g.line([HX + f / FMAX * HW, FLOOR], [HX + f / FMAX * HW, FLOOR + 6], { stroke: C.axis, 'stroke-width': 1.5 });
      g.text([HX + f / FMAX * HW, FLOOR + 24], String(f));
    });
    g.label('gx', txt('fraction in each band', 19), [HX + HW / 2, FLOOR + 32], 't', { color: '#444' });
    if (!PRINT) gasRun(g.root);
  } };
}

// Slide 29: the denoising grid, true pixels x and observed pixels y (gray)
FIGS.denoise = graphFig({ s: K * 0.55, key: 'dn', dir: false,
  nodes: { x1: { at: [0, 1], ...xs('x_1', 0.7) }, x2: { at: [0, -1], ...xs('x_2', 0.7) }, x3: { at: [2, 1], ...xs('x_3', 0.7) },
    x4: { at: [2, -1], ...xs('x_4', 0.7) }, x5: { at: [4, 1], ...xs('x_5', 0.7) }, x6: { at: [4, -1], ...xs('x_6', 0.7) },
    y1: { at: [1, 2], ...xs('y_1', 0.7), fill: XC.g30 }, y2: { at: [1, 0], ...xs('y_2', 0.7), fill: XC.g30 },
    y3: { at: [3, 2], ...xs('y_3', 0.7), fill: XC.g30 }, y4: { at: [3, 0], ...xs('y_4', 0.7), fill: XC.g30 },
    y5: { at: [5, 2], ...xs('y_5', 0.7), fill: XC.g30 }, y6: { at: [5, 0], ...xs('y_6', 0.7), fill: XC.g30 } },
  edges: [['x1', 'x2'], ['x1', 'x3'], ['x2', 'x4'], ['x3', 'x4'], ['x3', 'x5'], ['x4', 'x6'], ['x5', 'x6'],
    ['x1', 'y1'], ['x2', 'y2'], ['x3', 'y3'], ['x4', 'y4'], ['x5', 'y5'], ['x6', 'y6']].map(([a, b]) => ({ a, b })) });
