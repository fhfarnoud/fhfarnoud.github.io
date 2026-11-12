// Figures of the Graphical Models II deck (parameter estimation and inference),
// redrawn from the six TikZ pictures of src/40-GMs-Slides-2.tex, plus two that are not in it
// (the animation of "Plate Notation" and the chain of "Elimination order matters").  Every node
// sits at its TikZ coordinate (the old "below left of" placement puts a node
// at node distance d along the diagonal, d / sqrt 2 across and down), each
// curved edge is TikZ's out/in curve (control points 0.3915 of the chord
// from each end, looseness 1).  Each picture is drawn at U px per TikZ cm
// (k times its \scalebox factor), chosen so that it takes about the share of
// the slide it takes on its source page; node radii, line widths and
// arrowheads scale with U.  Labels do not: a label in the body size of the
// picture (11pt) is 26 px, one step below the body's math, and smaller sizes
// scale from it but never go under 22 px, the deck's smallest text.  Each FIGS
// entry draws from one parameter object (see ../shared/deck.js).

Object.assign(MACROS, {
  // Beamer sets \text in math in the sans-serif text font
  '\\text': '\\textsf{#1}',
  '\\pa': '\\text{pa}', '\\mb': '\\text{mb}', '\\cD': '\\mathcal{D}', '\\cN': '\\mathcal{N}',
  '\\btheta': '\\boldsymbol{\\theta}', '\\bx': '\\mathbf{x}', '\\argmax': '\\operatorname*{arg\\,max}',
  // from "Inference: What and Why?" on: the query in red, the evidence in green, messages in blue
  // (.qry, .evd and .msg in index.html)
  '\\qry': '\\htmlClass{qry}{#1}', '\\evd': '\\htmlClass{evd}{#1}', '\\msg': '\\htmlClass{msg}{#1}'
});

// The colours of the roles.  An observed node (data, evidence) is hatched in a light tint of the
// evidence green, with an outline of it; the query node has a red outline and label on a light
// red fill; messages are blue; the edges from the parameters are gray.  The math takes the same
// colours from .evd, .qry and .msg in index.html.
const ROLE = {
  evd: '#0A8A3A', evdHatch: '#93CBA7',
  qry: '#C62828', qryFill: '#F8DEDE',
  msg: '#1F5FD1',
  param: '#777777'
};
const QRY = { fill: ROLE.qryFill, stroke: ROLE.qry, lc: ROLE.qry };   // the query node's style
const CM = 28.45;        // pt per cm

// A graphical-model drawing in TikZ coordinates (cm, y up), on the scene g.
//   o.s     the picture's \scalebox factor; o.box [xmin, ymin, xmax, ymax] in cm
//   o.k     px per TikZ cm at scale 1 (75); o.lab the px size of an 11pt label (26), o.minfs the
//           smallest label (22)
// node(key, [x, y], r, label, st): a circle of radius r cm; st.fill, st.stroke,
//   st.obs (hatched, green outline: the obs style), st.fs (label size in pt, 11), st.lc (label colour)
// edge(a, b, st), bend(a, b, out, in, st): arrows between nodes (st.color,
//   st.lw in pt, st.arrow false for a plain line), as TikZ's -> with stealth'
//   and shorten >=1pt; bend leaves a at angle out and enters b at angle in.
function gm(g, o) {
  const s = o.s, U = (o.k ?? 75) * s, [x0, , , y1] = o.box, pad = o.pad ?? 4;
  const pt = v => v * U / CM;                         // TikZ pt (unscaled) -> px
  const P = ([x, y]) => [pad + (x - x0) * U, pad + (y1 - y) * U];
  const op = o.opacity ?? 1;
  const fsOf = size => (Math.max(o.minfs ?? 22, size / 11 * (o.lab ?? 26)) / 1.05).toFixed(1);   // .fig .lab .katex is 1.05em
  const lab = (key, s2, at, anchor, st = {}) => g.label(key, `<span style="font-size:${fsOf(st.fs ?? 11)}px">${s2}</span>`,
    at, anchor, { color: st.color || '#000', opacity: (st.opacity ?? 1) * op });
  // stealth' for line width w pt: unit a = 0.28pt + 0.3 w, tip at the end point
  function head(tip, [ux, uy], w, col, opa) {
    const a = pt(0.28 + 0.3 * w), Q = (x, y) => `${(tip[0] + x * ux - y * uy).toFixed(2)},${(tip[1] + x * uy + y * ux).toFixed(2)}`;
    const d = `M${Q(0, 0)} C${Q(-2.5 * a, 0.5 * a)} ${Q(-5 * a, 1.5 * a)} ${Q(-8 * a, 3.25 * a)} ` +
      `C${Q(-5 * a, a)} ${Q(-5 * a, -a)} ${Q(-8 * a, -3.25 * a)} C${Q(-5 * a, -1.5 * a)} ${Q(-2.5 * a, -0.5 * a)} ${Q(0, 0)}Z`;
    g.el('path', { d, fill: col, stroke: col, 'stroke-width': pt(w), 'stroke-linejoin': 'round', opacity: opa });
    return 5 * a;   // the shaft ends this far behind the tip, inside the head
  }
  const N = {};
  return {
    U, P, pt, lab, head,
    node(key, at, r, label, st = {}) {
      const [cx, cy] = P(at), R = r * U;
      N[key] = { at, r, c: [cx, cy], R };
      const lw = pt(st.lw ?? 0.8), stroke = st.obs ? ROLE.evd : st.stroke || '#000';
      g.el('circle', { cx, cy, r: R, fill: st.fill || '#fff', stroke: 'none', opacity: op });
      if (st.obs) {   // pattern=north west lines: lines along NW-SE every 3pt / sqrt 2, 0.4pt wide (pattern space, unscaled)
        const sp = 2.12 / (CM * s) * U, w = Math.max(0.6, 0.4 / (CM * s) * U);
        let d = '';
        for (let c = -Math.floor(R / sp) * sp; c < R; c += sp) {
          const h = Math.sqrt(Math.max(0, R * R - c * c)), mx = cx + c / Math.SQRT2, my = cy - c / Math.SQRT2;
          d += `M${(mx - h / Math.SQRT2).toFixed(2)},${(my - h / Math.SQRT2).toFixed(2)}L${(mx + h / Math.SQRT2).toFixed(2)},${(my + h / Math.SQRT2).toFixed(2)}`;
        }
        g.el('path', { d, stroke: ROLE.evdHatch, 'stroke-width': w.toFixed(2), fill: 'none', opacity: op });
      }
      g.el('circle', { cx, cy, r: R, fill: 'none', stroke, 'stroke-width': lw, opacity: op });
      if (label) lab('n-' + key, label, [cx, cy], 'c', { fs: st.fs, color: st.lc });
      return N[key];
    },
    // the point on node k's border at angle deg (TikZ: counter-clockwise from east)
    border(k, deg) {
      const n = N[k], t = deg * Math.PI / 180;
      return [n.c[0] + n.R * Math.cos(t), n.c[1] - n.R * Math.sin(t)];
    },
    edge(a, b, st = {}) {
      const A = N[a], B = N[b], dx = B.c[0] - A.c[0], dy = B.c[1] - A.c[1], L = Math.hypot(dx, dy), u = [dx / L, dy / L];
      const p = [A.c[0] + u[0] * A.R, A.c[1] + u[1] * A.R], q = [B.c[0] - u[0] * B.R, B.c[1] - u[1] * B.R];
      this.arrow(p, q, st);
    },
    // a straight arrow from p to q (px), shortened by st.s0 / st.s1 pt at its ends (shorten >=1pt by default)
    arrow(p, q, st = {}) {
      const col = st.color || '#000', w = st.lw ?? 0.8, opa = (st.opacity ?? 1) * op;
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), u = [dx / L, dy / L];
      const s0 = pt(st.s0 ?? 0), s1 = pt(st.s1 ?? 1);
      const a = [p[0] + u[0] * s0, p[1] + u[1] * s0], tip = [q[0] - u[0] * s1, q[1] - u[1] * s1];
      const back = st.arrow === false ? 0 : head(tip, u, w, col, opa);
      g.el('line', { x1: a[0], y1: a[1], x2: tip[0] - u[0] * back, y2: tip[1] - u[1] * back, stroke: col, 'stroke-width': pt(w), opacity: opa });
    },
    bend(a, b, out, inn, st = {}) {
      const col = st.color || '#000', w = st.lw ?? 0.8, opa = (st.opacity ?? 1) * op;
      const p = this.border(a, out), q = this.border(b, inn), d = 0.3915 * Math.hypot(q[0] - p[0], q[1] - p[1]);
      const to = deg => [Math.cos(deg * Math.PI / 180), -Math.sin(deg * Math.PI / 180)];
      const [ox, oy] = to(out), [ix, iy] = to(inn);
      // the end, 1pt short along the final tangent (from the second control point into b)
      const s1 = pt(1), tip = [q[0] + ix * s1, q[1] + iy * s1], u = [-ix, -iy];
      const back = head(tip, u, w, col, opa) * 0.8;
      const e = [tip[0] + ix * back, tip[1] + iy * back];
      const c1 = [p[0] + ox * d, p[1] + oy * d], c2 = [q[0] + ix * d, q[1] + iy * d];
      const f = v => v.map(z => z.toFixed(2)).join(',');
      g.el('path', { d: `M${f(p)} C${f(c1)} ${f(c2)} ${f(e)}`, fill: 'none', stroke: col, 'stroke-width': pt(w), opacity: opa });
    },
    // a rectangle node of the given size (cm) centred at c, drawn thick
    rect(c, wcm, hcm, st = {}) {
      const [cx, cy] = P(c);
      g.el('rect', { x: cx - wcm * U / 2, y: cy - hcm * U / 2, width: wcm * U, height: hcm * U, fill: 'none',
        stroke: st.color || '#000', 'stroke-width': pt(st.lw ?? 0.8), opacity: op });
    }
  };
}
// a figure's size from its box (cm) and scale
const gmSize = (box, s, k = 75, pad = 4) => [Math.ceil((box[2] - box[0]) * k * s + 2 * pad), Math.ceil((box[3] - box[1]) * k * s + 2 * pad)];
const D45 = d => d / Math.SQRT2;      // "below left of" at node distance d: d / sqrt 2 across and down

// Slide "Parameter Estimation: The Big Picture": the model graph (\scalebox{0.75}, node distance 2cm, min size 0.8cm)
const BOX_BIG = [-0.42, -2.42, 2.92, 0.42];
FIGS.biggraph = {
  size: gmSize(BOX_BIG, 0.75, 95),
  draw(g) {
    const G = gm(g, { s: 0.75, k: 95, box: BOX_BIG });
    G.node('T', [0, 0], 0.4, '$T$');
    G.node('C', [2.5, 0], 0.4, '$C$');
    G.node('A', [0, -2], 0.4, '$A$');
    G.node('B', [2.5, -2], 0.4, '$B$');
    G.edge('T', 'A'); G.edge('T', 'B'); G.edge('C', 'B');
  }
};

// Slide "Bayesian Parameter Estimation" (\scalebox{0.7}, node distance 3cm): parameters as parents
const d3 = D45(3);
const BOX_BAYES = [-d3 - 0.42, -d3 - 0.42, 5.75, 1.45];
FIGS.bayesparams = {
  size: gmSize(BOX_BAYES, 0.7, 100),
  draw(g) {
    const G = gm(g, { s: 0.7, k: 100, box: BOX_BAYES });
    const tT = [4, 1], tB = [4, -d3 + 1], tA = [4, (tT[1] + tB[1]) / 2];
    G.node('T', [0, 0], 0.4, '$T$');
    G.node('A', [-d3, -d3], 0.4, '$A$');
    G.node('B', [d3, -d3], 0.4, '$B$');
    G.edge('T', 'B'); G.edge('T', 'A');
    G.node('tT', tT, 0.43, '$\\theta_T$');
    G.node('tB', tB, 0.43, '$\\btheta_B$');
    G.node('tA', tA, 0.43, '$\\btheta_A$');
    // label=right: the label's west side at the node's east, plus its inner sep (0.3333em)
    const isep = G.pt(11 / 3);
    for (const [k, s2] of [['tT', '$p(\\theta_T)$'], ['tA', '$p(\\btheta_A)$'], ['tB', '$p(\\btheta_B)$']]) {
      const [x, y] = G.border(k, 0);
      G.lab('p-' + k, s2, [x + isep, y], 'l');
    }
    G.bend('tT', 'T', 180, 0, { color: ROLE.param });
    G.bend('tB', 'B', 180, 90, { color: ROLE.param });
    G.bend('tA', 'A', 180, 0, { color: ROLE.param });
  }
};

// The plate pictures (node distance 2.5cm): observed nodes in a plate, the parameters to the right.
const d25 = D45(2.5);
function plate(G, o) {
  G.node('T', [0, 0], o.r, '$T_i$', { obs: true });
  G.node('A', [-d25, -d25], o.r, '$A_i$', { obs: true });
  G.node('B', [d25, -d25], o.r, '$B_i$', { obs: true });
  G.rect([0, -1.125], o.w, 3.75);
  G.edge('T', 'B'); G.edge('T', 'A');
  // the count inside the plate's bottom-right corner
  const [x, y] = G.P([o.w / 2, -3]), ins = G.pt(4);
  G.lab('plate-n', o.n, [x - ins, y - ins], 'br');
}
// Slide "Plate Notation" (not in the source): three samples, each a copy of T, A, B (observed),
// under the shared parameters.  Each parameter's edges run down from it to a trunk of their own
// height and branch down into the nodes it governs, so no edge passes through a node and each
// enters its node from above.  On the click (c from 0 to 1) the copies slide onto the middle one,
// the trunks shrink to nothing and the nine edges become three straight ones, the labels T_1,
// T_2, T_3 become T_i, and a plate with the count 3 is drawn around the copy that is left: the
// picture of the next slide, with the parameters above the plate.
const BOX_PLATE3 = [-7.75, -3.15, 7.75, 3.45];
FIGS.platedemo = {
  size: gmSize(BOX_PLATE3, 0.54, 92),
  duration: 2400,
  draw(g, p) {
    const G = gm(g, { s: 0.54, k: 92, box: BOX_PLATE3 });
    const cl = v => Math.max(0, Math.min(1, v)), c = cl(p.c ?? 0);
    const u = cl(c / 0.65), m = u * u * (3 - 2 * u);              // the slide
    const lb = cl((c - 0.45) / 0.3), w = cl((c - 0.65) / 0.35);    // the labels, then the plate
    const DX = 5.3, r = 0.43, rt = 0.45, tY = 2.9, U = G.U;
    const trunk = { A: 2.1, T: 1.7, B: 1.3 };                      // the trunks' heights (cm)
    const th = { T: [0, tY], A: [-d25, tY], B: [d25, tY] };
    const copy = x => ({ T: [x, 0], A: [x - d25, -d25], B: [x + d25, -d25] });
    const copies = [-DX, DX, 0].map(x => copy(x * (1 - m)));       // the middle copy last, on top
    const ids = [1, 3, 2];
    // a parameter's edge: down from the parameter at a to the trunk height h, across, and down
    // into the node at b, entering it from above (centres in cm, radii in cm)
    const wire = (a, ra, b, rb, h) => {
      const [ax, ay] = G.P(a), [bx, by] = G.P(b), hy = G.P([0, h])[1], col = ROLE.param, lw = G.pt(0.8);
      const tip = by - rb * U - G.pt(1), back = G.head([bx, tip], [0, 1], 0.8, col, 1), y0 = ay + ra * U;
      const span = Math.abs(bx - ax), s = Math.sign(bx - ax), q = Math.min(0.3 * U, span / 2);
      const f = v => v.toFixed(2);
      const d = span < 0.5 ? `M${f(ax)},${f(y0)}L${f(bx)},${f(tip - back)}`
        : `M${f(ax)},${f(y0)}L${f(ax)},${f(hy - q)}Q${f(ax)},${f(hy)} ${f(ax + s * q)},${f(hy)}` +
          `L${f(bx - s * q)},${f(hy)}Q${f(bx)},${f(hy)} ${f(bx)},${f(hy + q)}L${f(bx)},${f(tip - back)}`;
      g.el('path', { d, fill: 'none', stroke: col, 'stroke-width': lw });
    };
    // an arrow between two circles given by their centres (cm) and radii (cm)
    const link = (a, ra, b, rb, st) => {
      const A = G.P(a), B = G.P(b), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
      if (L < (ra + rb) * U + 2) return;
      G.arrow([A[0] + dx / L * ra * U, A[1] + dy / L * ra * U], [B[0] - dx / L * rb * U, B[1] - dy / L * rb * U], st);
    };
    for (const k of ['A', 'T', 'B']) for (const cp of copies) wire(th[k], rt, cp[k], r, trunk[k]);
    for (const cp of copies) { link(cp.T, r, cp.A, r); link(cp.T, r, cp.B, r); }
    copies.forEach((cp, j) => {
      for (const k of ['T', 'A', 'B']) {
        G.node(`${k}${j}`, cp[k], r, null, { obs: true });
        G.lab(`l${k}${j}`, `$${k}_${ids[j]}$`, G.P(cp[k]), 'c', { opacity: 1 - lb });
      }
    });
    for (const k of ['T', 'A', 'B']) G.lab(`l${k}i`, `$${k}_i$`, G.P(copies[2][k]), 'c', { opacity: lb });
    G.node('tT', th.T, rt, '$\\theta_T$');
    G.node('tA', th.A, rt, '$\\btheta_A$');
    G.node('tB', th.B, rt, '$\\btheta_B$');
    // the plate, as on the next slide: 5 cm by 3.75 cm around the copy, its count in the bottom-right corner
    const [x0, y0] = G.P([-2.5, 0.75]);
    g.el('rect', { x: x0, y: y0, width: 5 * U, height: 3.75 * U, fill: 'none', stroke: '#000', 'stroke-width': G.pt(0.8), opacity: w });
    const [x1, y1] = G.P([2.5, -3]), ins = G.pt(4);
    G.lab('plate-3', '$3$', [x1 - ins, y1 - ins], 'br', { opacity: w });
  }
};
// Slide "Posterior Distribution" (\scalebox{0.65})
const BOX_POST = [-2.55, -3.1, 4.5, 1.5];
FIGS.posterior = {
  size: gmSize(BOX_POST, 0.65, 92),
  draw(g) {
    const G = gm(g, { s: 0.65, k: 92, box: BOX_POST });
    plate(G, { r: 0.43, w: 5, n: '$N$' });
    const tT = [4, 1], tB = [4, -d25 + 1], tA = [4, (tT[1] + tB[1]) / 2];
    G.node('tT', tT, 0.45, '$\\theta_T$');
    G.node('tB', tB, 0.45, '$\\btheta_B$');
    G.node('tA', tA, 0.45, '$\\btheta_A$');
    G.bend('tT', 'T', 180, 0, { color: ROLE.param });
    G.bend('tB', 'B', 180, 90, { color: ROLE.param });
    G.bend('tA', 'A', 180, 0, { color: ROLE.param });
  }
};

// Slide "Predicting Future Outcomes" (\scalebox{0.55}): the plate, the parameters, and the next observation
const BOX_PRED = [-2.3, -3.1, 8.85, 1.5];
FIGS.predict = {
  size: gmSize(BOX_PRED, 0.55, 105),
  draw(g) {
    const G = gm(g, { s: 0.55, k: 105, box: BOX_PRED });
    plate(G, { r: 0.44, w: 4.5, n: '$n$' });
    const tT = [3, 1], tB = [3, -d25 + 1], tA = [3, (tT[1] + tB[1]) / 2];
    G.node('tT', tT, 0.46, '$\\theta_T$');
    G.node('tB', tB, 0.46, '$\\btheta_B$');
    G.node('tA', tA, 0.46, '$\\btheta_A$');
    G.bend('tT', 'T', 180, 0, { color: ROLE.param });
    G.bend('tB', 'B', 180, 90, { color: ROLE.param });
    G.bend('tA', 'A', 180, 0, { color: ROLE.param });
    const t1 = [6.5, 0];
    G.node('t1', t1, 0.55, '$T_{n+1}$', { fs: 9 });
    G.node('a1', [t1[0] - d25, -d25], 0.55, '$A_{n+1}$', { fs: 9 });
    G.node('b1', [t1[0] + d25, -d25], 0.55, '$B_{n+1}$', { fs: 9 });
    G.edge('t1', 'b1'); G.edge('t1', 'a1');
    G.bend('tT', 't1', 0, 180, { color: ROLE.param });
    G.bend('tB', 'b1', 0, 180, { color: ROLE.param });
    G.bend('tA', 'a1', 0, 90, { color: ROLE.param });
  }
};

// Slide "Inference: What and Why?" (\scalebox{0.7}, node distance 2.5cm, min size 0.8cm): query T, evidence B = 1
const BOX_INF = [-2.92, -d25 - 0.7, 2 * d25 + 0.42, 0.42];
FIGS.traffic = {
  size: gmSize(BOX_INF, 0.7, 100),
  draw(g) {
    const G = gm(g, { s: 0.7, k: 100, box: BOX_INF });
    G.node('T', [0, 0], 0.4, '$T$', QRY);
    G.node('R', [-2.5, 0], 0.4, '$R$');
    G.node('B', [d25, -d25], 0.675, '$B=1$', { obs: true, lc: ROLE.evd });
    G.node('C', [2 * d25, 0], 0.4, '$C$');
    G.edge('R', 'T'); G.edge('T', 'B'); G.edge('C', 'B');
  }
};

// Slide "Elimination order matters" (not in the source): the chain x1 -> x2 -> x3 -> x4, the query
// x4, in the size of the tree below (node distance 2cm)
const BOX_CHAIN = [-0.42, -0.42, 6.42, 0.42];
FIGS.chain = {
  size: gmSize(BOX_CHAIN, 0.6, 92),
  draw(g) {
    const G = gm(g, { s: 0.6, k: 92, box: BOX_CHAIN });
    for (let i = 1; i <= 4; i++) G.node('x' + i, [2 * (i - 1), 0], 0.4, `$x_${i}$`, i === 4 ? QRY : {});
    for (let i = 1; i < 4; i++) G.edge('x' + i, 'x' + (i + 1));
  }
};

// Slide "Sum-Product Algorithm: Message Passing on Trees" (\scalebox{0.6}): a tree MRF, and on the
// click (m = 1, the \pause inside the picture) the messages toward x4, blue, very thick, 0.2cm off
// their edges and 10pt short of the nodes; before it they are covered (10% opacity, as the deck's
// \setbeamercovered{transparent=10}).  "Reading the Sum-Product Messages" and
// "Reading the Max-Product Messages" show it again with init m = 1.
const BOX_TREE = [-0.42, -2.92, 7.92, 0.9];
FIGS.tree = {
  size: gmSize(BOX_TREE, 0.6, 92, 2),
  draw(g, p) {
    const G = gm(g, { s: 0.6, k: 92, pad: 2, box: BOX_TREE });
    const X = { 1: [0, 0], 3: [2.5, 0], 2: [2.5, -2.5], 4: [5, 0], 5: [7.5, 0] };
    for (const i of [1, 3, 2, 4, 5]) G.node('x' + i, X[i], 0.4, `$x_${i}$`, i === 4 ? QRY : {});
    for (const [a, b] of [[1, 3], [2, 3], [3, 4], [4, 5]]) G.edge('x' + a, 'x' + b, { arrow: false, s1: 0 });
    const o = 0.1 + 0.9 * clamp(p.m ?? 0), sh = 0.2 * G.U, isep = G.pt(10 / 3);
    const msg = (a, b, dx, dy, side, s2) => {
      const A = G.P(X[a]), B = G.P(X[b]), dX = B[0] - A[0], dY = B[1] - A[1], L = Math.hypot(dX, dY), u = [dX / L, dY / L];
      const R = 0.4 * G.U, p0 = [A[0] + u[0] * R + dx * sh, A[1] + u[1] * R - dy * sh], p1 = [B[0] - u[0] * R + dx * sh, B[1] - u[1] * R - dy * sh];
      G.arrow(p0, p1, { color: ROLE.msg, lw: 1.2, s0: 10, s1: 10, opacity: o });
      const m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
      if (side === 'above') G.lab(`m${a}${b}`, s2, [m[0], m[1] - isep], 'b', { fs: 10, color: ROLE.msg, opacity: o });
      else G.lab(`m${a}${b}`, s2, [m[0] + isep, m[1]], 'l', { fs: 10, color: ROLE.msg, opacity: o });
    };
    msg(1, 3, 0, 1, 'above', '$m_{1 \\to 3}(x_3)$');
    msg(2, 3, 1, 0, 'right', '$m_{2 \\to 3}(x_3)$');
    // the query x4 red inside the blue labels (figure labels are typeset without trust: \textcolor, not \qry)
    const x4 = `\\textcolor{${ROLE.qry}}{x_4}`;
    msg(3, 4, 0, 1, 'above', `$m_{3 \\to 4}(${x4})$`);
    msg(5, 4, 0, 1, 'above', `$m_{5 \\to 4}(${x4})$`);
  }
};
