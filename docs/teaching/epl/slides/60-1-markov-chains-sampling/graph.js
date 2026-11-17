// Graph rendering from the course Graphical Models I deck.
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
  const a = Math.max(0.95, (0.28 + 0.3 * 0.8) * pt) * (o.headscale ?? 1);     // the stealth' arrow's unit
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
      labs.push([`${key}e${i}`, txt(`<span style="color:${e.color || '#000'}">${e.lab}</span>`, fs), [x + sx * gp, y + sy * gp], anc]);
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
    g.el('path', { d, fill: 'none', stroke: e.color || '#000', 'stroke-width': e.w || lw });
    if (arrow) g.el('path', { d: e._head, fill: e.color || '#000', stroke: e.color || '#000', 'stroke-width': e.w || lw * 0.8, 'stroke-linejoin': 'round' });
  });
  for (const id in N) {
    const n = N[id], [cx, cy] = P(n.at), r = R(n) * s;
    if (!n.plain) {
      g.el('circle', { cx, cy, r, fill: n.hatch ? '#fff' : n.fill || o.fill || '#fff', stroke: 'none' });
      if (n.hatch) g.el('path', { d: hatchD(cx, cy, r, o.hstep ?? 7.5), stroke: n.hatch, 'stroke-width': 1, fill: 'none' });
      g.el('circle', { cx, cy, r, fill: 'none', stroke: n.color || '#000', 'stroke-width': lw });
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

