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
// node in question unobserved (left) and observed (right).  The water runs from X along the path,
// through the nodes and under the edges, as dashes that the CSS class "flow" moves (print keeps them
// still).  An observed chain or fork node is a dam; at a collider the water pours out through an
// unobserved Y (and its unobserved child), and pools in an observed Y or an observed child, whose dam
// at its bottom sends it back up to Z.  Z turns blue when the water reaches it.
{
  const s = K * 0.52, d = 0.74, gap = 1.75, low = 0.85, kid = 1.35, r = d * s / 2, drop = 28;
  const WATER = '#2E86DE', WET = '#D4E9FA', DAM = '#8B5A2B';
  const PW = 2 * gap * s + d * s + 8, CG = 34, HH = 30, RL = 26, RG = 8;
  const RH = [RL + 2 * r + 4, RL + 2 * r + 4, RL + low * s + 2 * r + drop + 4, RL + (low + kid) * s + 2 * r + drop + 4];
  const W = 2 * PW + CG, H = HH + RH.reduce((a, b) => a + b) + 3 * RG;
  const kinds = [['Chain', [['X', 'Y'], ['Y', 'Z']]], ['Fork', [['Y', 'X'], ['Y', 'Z']]],
    ['Collider', [['X', 'Y'], ['Z', 'Y']]], ['Collider with a child $W$', [['X', 'Y'], ['Z', 'Y'], ['Y', 'W']]]];
  const txt = (h, size) => `<span style="font-size:${size}px">${h}</span>`;
  FIGS.flow = { size: [Math.ceil(W), Math.ceil(H)], draw(g) {
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
          Z: { at: [2 * gap, 0], tex: '$Z$', d, fill: wet ? WET : '#fff' } };
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
        let pts;
        if (!v) pts = obs ? [x, [y[0] - r - 10, y[1]]] : [x, y, z];
        else if (obs) {     // down to the dam at the bottom of the observed node and back up to Z
          const foot = bot[1] + r - 6;
          pts = [x, [y[0] - 5, y[1]], [bot[0] - 5, foot], [bot[0] + 5, foot], [y[0] + 5, y[1]], z];
          const lv = bot[1] - 0.15 * r, dx = Math.sqrt(r * r - (lv - bot[1]) ** 2);
          g.el('path', { d: `M${bot[0] - dx},${lv}A${r},${r} 0 1 0 ${bot[0] + dx},${lv}Z`, fill: WATER, 'fill-opacity': 0.35, stroke: 'none' });
        } else pts = child ? [x, y, bot, below(bot)] : [x, y, below(y)];
        const wj = { stroke: WATER, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
        g.path(pts, { ...wj, 'stroke-width': 16, 'stroke-opacity': 0.22 });
        g.path(pts, { ...wj, cls: 'flow', 'stroke-width': 6 });
        if (!v && obs) {   // the dam, and the water standing against it
          const wx = y[0] - r - 7;
          g.el('path', { d: `M${wx - 20},${y[1]}a20,13 0 0 0 20,13v-13z`, fill: WATER, 'fill-opacity': 0.3, stroke: 'none' });
          g.el('rect', { x: wx - 1, y: y[1] - 20, width: 8, height: 40, rx: 2, fill: DAM });
        }
        if (v && obs) g.el('rect', { x: bot[0] - 20, y: bot[1] + r - 1, width: 40, height: 8, rx: 2, fill: DAM });
        drawGraph(g, pass(map(() => ({ fill: 'none' })), edges.map(([a, b]) => ({ a, b }))), ox, oy);
        for (const k in nodes) if (nodes[k].hatch) {
          const [cx, cy] = P(nodes[k].at);
          g.el('path', { d: hatchD(cx, cy, r, 7.5), stroke: nodes[k].hatch, 'stroke-width': 1, fill: 'none' });
        }
      });
      top += RH[row] + RG;
    });
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

// Slide 29: denoising a 64 x 48 black-and-white picture (black -1, white +1, as in the notes) with
// iterated conditional modes on the energy of slide 28, alpha = 0 and beta = 1, the four nearest
// pixels as neighbours.  Each pixel is flipped when its fixed uniform draw falls below the noise
// level p, so raising p only adds flips.  k counts sweeps in raster order; a fractional k stops
// part-way through a sweep, and a red line marks the row being visited.  The pictures are drawn on
// a canvas, five screen pixels per image pixel, and placed as SVG images.
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
  const rnd = mulberry32(7), U = Float64Array.from({ length: n }, () => rnd());
  const observe = p => Int8Array.from(truth, (t, i) => U[i] < p ? -t : t);
  function icm(y, zeta, k, beta = 1) {
    const x = Int8Array.from(y), m = Math.round(k * n);
    for (let t = 0; t < m; t++) {
      const i = t % n, r = (i / w) | 0, c = i - r * w;
      let s = 0;
      if (c > 0) s += x[i - 1]; if (c < w - 1) s += x[i + 1];
      if (r > 0) s += x[i - w]; if (r < h - 1) s += x[i + w];
      const f = beta * s + zeta * y[i];
      if (f > 0) x[i] = 1; else if (f < 0) x[i] = -1;
    }
    return x;
  }
  const wrong = x => x.reduce((a, v, i) => a + (v !== truth[i]), 0);
  return { w, h, n, truth, observe, icm, wrong };
})();
{
  const cell = 3.75, PX = 5, IW = DN.w * cell, IH = DN.h * cell, GAP = 56, TOP = 30;
  const W = 3 * IW + 2 * GAP, H = TOP + IH + 36;
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const urls = new Map();
  const url = x => {
    const key = x.join('');
    if (urls.has(key)) return urls.get(key);
    canvas.width = DN.w * PX; canvas.height = DN.h * PX;
    const cx = canvas.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, canvas.width, canvas.height);
    cx.fillStyle = '#222';
    for (let i = 0; i < DN.n; i++) if (x[i] < 0) cx.fillRect((i % DN.w) * PX, ((i / DN.w) | 0) * PX, PX, PX);
    const u = canvas.toDataURL('image/png');
    if (urls.size > 400) urls.clear();
    urls.set(key, u);
    return u;
  };
  const pct = x => (100 * DN.wrong(x) / DN.n).toFixed(1) + '%';
  const txt = (h, size = 20) => `<span style="font-size:${size}px">${h}</span>`;
  FIGS.icm = { size: [W, H], duration: 1600, linear: true, draw(g, p) {
    const y = DN.observe(p.p), k = Math.max(0, p.k), x = DN.icm(y, p.zeta, k);
    [[DN.truth, 'True image'], [y, 'Observed $y$'], [x, 'Estimate $x$']].forEach(([img, title], j) => {
      const x0 = j * (IW + GAP);
      g.label(`ic${j}`, txt(title, 22), [x0 + IW / 2, TOP - 8], 'b');
      g.el('image', { x: x0, y: TOP, width: IW, height: IH, href: url(img), preserveAspectRatio: 'none' });
      g.el('rect', { x: x0, y: TOP, width: IW, height: IH, fill: 'none', stroke: '#888', 'stroke-width': 1 });
    });
    const done = Math.round(k * DN.n), part = done % DN.n, sweeps = Math.floor(done / DN.n);
    if (part) {
      const ry = TOP + (Math.floor(part / DN.w) + 0.5) * cell;
      g.line([2 * (IW + GAP), ry], [3 * IW + 2 * GAP, ry], { stroke: '#D62728', 'stroke-width': 2 });
    }
    g.label('icy', txt(`$p = ${p.p.toFixed(2)}$: ${pct(y)} of pixels flipped`), [IW + GAP + IW / 2, TOP + IH + 8], 't');
    g.label('icx', txt(`$\\zeta = ${p.zeta.toFixed(1)}$, ${sweeps} sweep${sweeps === 1 ? '' : 's'}: ${pct(x)} wrong`),
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

// Slide 28: the denoising grid, true pixels x and observed pixels y (gray)
FIGS.denoise = graphFig({ s: K * 0.55, key: 'dn', dir: false,
  nodes: { x1: { at: [0, 1], ...xs('x_1', 0.7) }, x2: { at: [0, -1], ...xs('x_2', 0.7) }, x3: { at: [2, 1], ...xs('x_3', 0.7) },
    x4: { at: [2, -1], ...xs('x_4', 0.7) }, x5: { at: [4, 1], ...xs('x_5', 0.7) }, x6: { at: [4, -1], ...xs('x_6', 0.7) },
    y1: { at: [1, 2], ...xs('y_1', 0.7), fill: XC.g30 }, y2: { at: [1, 0], ...xs('y_2', 0.7), fill: XC.g30 },
    y3: { at: [3, 2], ...xs('y_3', 0.7), fill: XC.g30 }, y4: { at: [3, 0], ...xs('y_4', 0.7), fill: XC.g30 },
    y5: { at: [5, 2], ...xs('y_5', 0.7), fill: XC.g30 }, y6: { at: [5, 0], ...xs('y_6', 0.7), fill: XC.g30 } },
  edges: [['x1', 'x2'], ['x1', 'x3'], ['x2', 'x4'], ['x3', 'x4'], ['x3', 'x5'], ['x4', 'x6'], ['x5', 'x6'],
    ['x1', 'y1'], ['x2', 'y2'], ['x3', 'y3'], ['x4', 'y4'], ['x5', 'y5'], ['x6', 'y6']].map(([a, b]) => ({ a, b })) });
