// Figures of the Graphical Models II deck (parameter estimation and inference),
// redrawn from the six TikZ pictures of src/40-GMs-Slides-2.tex, plus some that are not in it
// (the animation of "Plate Notation", the chain of "Elimination order matters" and the five
// figures of the BN, MRF and factor graph slides, at the end).  Every node
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

// =====================================================================================================
// BEGIN factor-graph slides: "Moralization: From a BN to an MRF", "Factor Graphs", "From a BN to a
// Factor Graph", "Moral Graph vs. Factor Graph: Which Is a Tree?", "Variable Elimination as Messages
// on the Factor Graph".  The traffic network of "Inference: What and Why?" at its coordinates (R, T,
// C, B, node distance 2.5cm), its moral graph, its factor graph, and the triangle T, C, B under two
// factorizations.  A factor node is a small filled black square, its function as its label.  The edge
// moralization adds and the highlights are orange (FG_EMPH), none of the three role colours; the
// query, the evidence and the messages take ROLE and QRY.
Object.assign(MACROS, { '\\independent': '\\perp\\!\\!\\!\\perp' });
const FG_EMPH = '#E07800';
const FGX = { R: [-2.5, 0], T: [0, 0], C: [2 * d25, 0], B: [d25, -d25] };      // the traffic network (cm)
// its factor nodes: p(T|R) on R - T, nearer R (room for its message to T), p(B|T,C) at the centroid of
// T, C, B, p(R) and p(C) above R and C
const FGF = { fR: [-2.5, 1.1], fT: [-1.5, 0], fC: [2 * d25, 1.1], fB: [d25, -d25 / 3] };
const FG_SQ = 0.24;                                                          // a factor square's side (cm)
const fgLerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

// Drawing helpers on a gm() picture G (scene g): all positions in px unless named cm.
function fgKit(g, G) {
  const U = G.U, pt = G.pt, P = G.P;
  const K = {
    U, P, pt,
    // the point on the circle (centre c, radius R) toward q
    rim(c, R, q) { const dx = q[0] - c[0], dy = q[1] - c[1], L = Math.hypot(dx, dy) || 1; return [c[0] + dx / L * R, c[1] + dy / L * R]; },
    line(a, b, st = {}) {
      g.el('line', { x1: a[0].toFixed(2), y1: a[1].toFixed(2), x2: b[0].toFixed(2), y2: b[1].toFixed(2),
        stroke: st.color || '#000', 'stroke-width': pt(st.lw ?? 0.8), 'stroke-dasharray': st.dash || null,
        'stroke-linecap': st.cap || null, opacity: st.opacity ?? 1 });
    },
    // a polyline (px points) as a wide translucent band: a highlight under the marks drawn after it
    band(pts, st = {}) {
      const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(2) + ',' + q[1].toFixed(2)).join('') + (st.close ? 'Z' : '');
      g.el('path', { d, fill: 'none', stroke: st.color || FG_EMPH, 'stroke-width': (st.w ?? 0.3) * U,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-opacity': st.so ?? 0.3, opacity: st.opacity ?? 1 });
    },
    // the shaft from a to the circle (centre c, radius R), 1pt short of it, with a stealth' head of
    // opacity st.head (0: a plain line; the shaft then runs to the tip)
    arrowTo(a, c, R, st = {}) {
      const col = st.color || '#000', w = st.lw ?? 0.8, hop = st.head ?? 1, opa = st.opacity ?? 1;
      const q = K.rim(c, R, a), dx = q[0] - a[0], dy = q[1] - a[1], L = Math.hypot(dx, dy) || 1, u = [dx / L, dy / L];
      const s1 = pt(1) * hop, tip = [q[0] - u[0] * s1, q[1] - u[1] * s1];
      const back = G.head(tip, u, w, col, hop * opa);
      K.line(a, [tip[0] - u[0] * back * hop, tip[1] - u[1] * back * hop], { color: col, lw: w, opacity: opa });
    },
    // a factor node: a filled square of side FG_SQ cm centred at c (px), scaled by k
    square(c, st = {}) {
      const h = FG_SQ * U / 2 * (st.k ?? 1);
      g.el('rect', { x: (c[0] - h).toFixed(2), y: (c[1] - h).toFixed(2), width: (2 * h).toFixed(2), height: (2 * h).toFixed(2),
        fill: st.color || '#000', stroke: 'none', opacity: st.opacity ?? 1 });
    },
    // a variable node: role 'qry' (the deck's QRY), 'evd' (gm's obs style, the label green) or none
    node(key, at, r, label, role) {
      G.node(key, at, r, label, role === 'qry' ? QRY : role === 'evd' ? { obs: true, lc: ROLE.evd } : {});
    }
  };
  return K;
}

// The traffic network as a BN (f = 0) morphing into its factor graph (f = 1): the arrowheads fade,
// p(T|R) appears halfway along R - T, the middles of T -> B and C -> B are drawn into one point,
// p(B|T,C), and p(R), p(C) rise out of R and C.  o: f, mo (0 to 2: the moral graph's new edge T - C
// fades in, then the arrowheads fade out; only with f = 0), hlM (the cycle T, B, C highlighted),
// hlF (the factor node p(B|T,C) and its edges highlighted), q (T as the query), e (B = 1, evidence).
function fgTraffic(g, G, K, o = {}) {
  const f = clamp(o.f ?? 0), mo = o.mo ?? 0, U = K.U, P = K.P;
  const r = 0.4, rB = o.e ? 0.675 : 0.4;
  const c = k => P(FGX[k]), Rad = k => (k === 'B' ? rB : r) * U;
  const head = (1 - f) * (1 - clamp(mo - 1));
  const qB1 = P(fgLerp(fgLerp(FGX.T, FGX.B, 0.5), FGF.fB, f)), qB2 = P(fgLerp(fgLerp(FGX.C, FGX.B, 0.5), FGF.fB, f));
  const fR = P(fgLerp(FGX.R, FGF.fR, f)), fC = P(fgLerp(FGX.C, FGF.fC, f)), fT = P(FGF.fT), fB = P(FGF.fB);
  // highlights, under everything
  if (o.hlM != null) K.band([c('T'), c('B'), c('C')], { close: true, opacity: clamp(o.hlM) });
  if (o.hlF != null) { K.band([c('T'), fB, c('C')], { opacity: clamp(o.hlF) }); K.band([fB, c('B')], { opacity: clamp(o.hlF) }); }
  if (o.under) o.under();
  // the moral graph's new edge
  if (o.mo != null) {
    const a = K.rim(c('T'), Rad('T'), c('C')), b = K.rim(c('C'), Rad('C'), c('T'));
    K.line(a, b, { color: FG_EMPH, lw: 1.2, dash: `${(0.12 * U).toFixed(1)} ${(0.08 * U).toFixed(1)}`, opacity: o.moOp ?? (0.1 + 0.9 * clamp(mo)) });
  }
  // the edges; the factor graph's edges to p(R) and p(C) only while they are drawn
  if (f > 0.001) { K.line(c('R'), fR); K.line(c('C'), fC); }
  K.arrowTo(c('R'), c('T'), Rad('T'), { head });
  K.line(c('T'), qB1); K.arrowTo(qB1, c('B'), Rad('B'), { head });
  K.line(c('C'), qB2); K.arrowTo(qB2, c('B'), Rad('B'), { head });
  // the factor nodes; p(B|T,C) only once the two edges are nearly drawn into it
  const fo = clamp(f * 3), fbo = clamp((f - 0.5) / 0.4);
  for (const q of [fR, fC, fT]) K.square(q, { opacity: fo, k: 0.4 + 0.6 * f });
  K.square(fB, { opacity: fbo, k: 0.4 + 0.6 * fbo });
  // the variable nodes
  K.node('R', FGX.R, r, '$R$');
  K.node('T', FGX.T, r, '$T$', o.q ? 'qry' : null);
  K.node('C', FGX.C, r, '$C$');
  K.node('B', FGX.B, rB, o.e ? '$B{=}1$' : '$B$', o.e ? 'evd' : null);
  // the factors' labels: p(R) left of its square, p(C) right, p(T|R) below, p(B|T,C) below right
  const gap = K.pt(3) + FG_SQ * U / 2, st = { fs: 9, opacity: clamp(2 * f - 1) };
  G.lab('f-R', '$p(R)$', [fR[0] - gap, fR[1]], 'r', st);
  G.lab('f-C', '$p(C)$', [fC[0] + gap, fC[1]], 'l', st);
  G.lab('f-T', '$p(T|R)$', [fT[0], fT[1] + gap], 't', st);
  G.lab('f-B', '$p(B|T,C)$', [fB[0] + gap, fB[1] + K.pt(1)], 'tl', st);
}

// Slide "Moralization: From a BN to an MRF": mo = 0 the BN (the new edge covered), 1 the parents T, C
// of B married (dashed orange), 2 the directions dropped: the moral graph.
const BOX_FGM = [-2.95, -d25 - 0.45, 2 * d25 + 0.45, 0.45];
FIGS.fgmoral = {
  size: gmSize(BOX_FGM, 0.7, 100),
  draw(g, p) {
    const G = gm(g, { s: 0.7, k: 100, box: BOX_FGM }), K = fgKit(g, G);
    fgTraffic(g, G, K, { mo: p.mo ?? 0 });
  }
};

// Slide "Factor Graphs": the triangle T, C, B (c = 0, the same MRF graph for both) becomes a factor
// graph (c = 1).  v = 0, one potential psi(T,C,B): the middles of the three edges are drawn into the
// centroid, where the square appears; v = 1, three pairwise potentials: a square appears halfway
// along each edge.
const BOX_FGT = [-1.45, -d25 - 0.45, 2 * d25 + 1.6, 0.85];
FIGS.fgtri = {
  size: gmSize(BOX_FGT, 0.62, 100),
  duration: 1400,
  draw(g, p) {
    const s = 0.62, G = gm(g, { s, k: 100, box: BOX_FGT }), K = fgKit(g, G), P = K.P, U = K.U;
    const c = clamp(p.c ?? 0), r = 0.4, X = FGX;
    const mid = (a, b) => fgLerp(X[a], X[b], 0.5), cen = FGF.fB;
    const gap = K.pt(3) + FG_SQ * U / 2, st = { fs: 9, opacity: clamp(2 * c - 1) };
    if ((p.v ?? 0) === 0) {
      const sq = P(cen);
      for (const [a, b] of [['T', 'C'], ['T', 'B'], ['C', 'B']]) {
        const m = P(fgLerp(mid(a, b), cen, c));
        K.line(P(X[a]), m); K.line(m, P(X[b]));
      }
      const so = clamp((c - 0.5) / 0.4);   // the square once the three edges are nearly drawn into it
      K.square(sq, { opacity: so, k: 0.4 + 0.6 * so });
      for (const k of ['T', 'C', 'B']) K.node(k, X[k], r, `$${k}$`);
      G.lab('psi', '$\\psi(T,C,B)$', [sq[0] + gap, sq[1] + K.pt(1)], 'tl', st);
    } else {
      for (const [a, b] of [['T', 'C'], ['T', 'B'], ['C', 'B']]) K.line(P(X[a]), P(X[b]));
      const mTC = P(mid('T', 'C')), mTB = P(mid('T', 'B')), mCB = P(mid('C', 'B'));
      for (const q of [mTC, mTB, mCB]) K.square(q, { opacity: clamp(c * 3), k: 0.4 + 0.6 * c });
      for (const k of ['T', 'C', 'B']) K.node(k, X[k], r, `$${k}$`);
      G.lab('psiTC', '$\\psi(T,C)$', [mTC[0], mTC[1] - gap], 'b', st);
      // outside the triangle, a little below their squares, clear of the edges rising to T and C
      G.lab('psiTB', '$\\psi(T,B)$', [mTB[0] - gap, mTB[1] + K.pt(4)], 'r', st);
      G.lab('psiCB', '$\\psi(C,B)$', [mCB[0] + gap, mCB[1] + K.pt(4)], 'l', st);
    }
  }
};

// Slide "From a BN to a Factor Graph": the traffic network as a BN (f = 0) morphing into its factor
// graph (f = 1).
const BOX_FGB = [-3.75, -d25 - 0.5, 2 * d25 + 1.25, FGF.fR[1] + 0.3];
FIGS.fgbn = {
  size: gmSize(BOX_FGB, 0.7, 100),
  duration: 1600,
  draw(g, p) {
    const G = gm(g, { s: 0.7, k: 100, box: BOX_FGB }), K = fgKit(g, G);
    fgTraffic(g, G, K, { f: p.f ?? 0 });
  }
};

// Slide "Moral Graph vs. Factor Graph: Which Is a Tree?": v = 0 the moral graph (its cycle T, B, C
// highlighted from h = 1), v = 1 the factor graph (p(B|T,C) and its three edges highlighted from h = 2).
const BOX_FGCMP = [-3.75, -d25 - 0.5, 2 * d25 + 1.25, FGF.fR[1] + 0.3];
FIGS.fgcmp = {
  size: gmSize(BOX_FGCMP, 0.56, 100),
  draw(g, p) {
    const s = 0.56, G = gm(g, { s, k: 100, box: BOX_FGCMP }), K = fgKit(g, G), h = p.h ?? 0;
    if ((p.v ?? 0) === 0) fgTraffic(g, G, K, { mo: 2, moOp: 1, hlM: clamp(h) });
    else fgTraffic(g, G, K, { f: 1, hlF: clamp(h - 1) });
  }
};

// Slide "Variable Elimination as Messages on the Factor Graph": the factor graph with the query T and
// the evidence B = 1; the branch through p(T|R) and its message m_1(t) to T (ms = 1), then the branch
// through p(B|T,C) and m_2(t) (ms = 2).  Each branch is a light blue band; each message a blue arrow
// 0.2cm off its edge, 3pt short of its ends; before its step both are covered (10%), as on "Sum-Product
// Algorithm: Message Passing on Trees".
const BOX_FGS = [-3.75, -d25 - 0.8, 2 * d25 + 1.25, FGF.fR[1] + 0.3];
FIGS.fgmsg = {
  size: gmSize(BOX_FGS, 0.68, 100),
  draw(g, p) {
    const G = gm(g, { s: 0.68, k: 100, box: BOX_FGS }), K = fgKit(g, G), P = K.P, U = K.U;
    const o1 = 0.1 + 0.9 * clamp(p.ms ?? 0), o2 = 0.1 + 0.9 * clamp((p.ms ?? 0) - 1);
    const bands = () => {
      K.band([P(FGF.fR), P(FGX.R), P(FGF.fT)], { color: ROLE.msg, w: 1.05, so: 0.13, opacity: clamp(p.ms ?? 0) });
      K.band([P(FGF.fC), P(FGX.C), P(FGF.fB), P(FGX.B)], { color: ROLE.msg, w: 1.05, so: 0.13, opacity: clamp((p.ms ?? 0) - 1) });
    };
    fgTraffic(g, G, K, { f: 1, q: true, e: true, under: bands });
    // a message from the factor at a (cm) to T, 0.2cm off the edge on the side above it
    // (side 1: the traveller's left, -1: right; in px, y down)
    const msg = (a, key, s2, opa, anchor, side, lo) => {
      const A = P(a), T = P(FGX.T), dx = T[0] - A[0], dy = T[1] - A[1], L = Math.hypot(dx, dy), u = [dx / L, dy / L];
      const n = [side * u[1], -side * u[0]], sh = 0.2 * U;
      const p0 = [A[0] + u[0] * (FG_SQ * U / 2) + n[0] * sh, A[1] + u[1] * (FG_SQ * U / 2) + n[1] * sh];
      const p1 = [T[0] - u[0] * 0.4 * U + n[0] * sh, T[1] - u[1] * 0.4 * U + n[1] * sh];
      G.arrow(p0, p1, { color: ROLE.msg, lw: 1.2, s0: 3, s1: 3, opacity: opa });
      const m = [(p0[0] + p1[0]) / 2 + n[0] * K.pt(4), (p0[1] + p1[1]) / 2 + n[1] * K.pt(4)];
      G.lab(key, s2, [m[0] + (lo?.[0] ?? 0), m[1] + (lo?.[1] ?? 0)], anchor, { fs: 10, color: ROLE.msg, opacity: opa });
    };
    // the query's value t red inside the blue labels (figure labels are typeset without trust: \textcolor, not \qry)
    const t = `\\textcolor{${ROLE.qry}}{t}`;
    msg(FGF.fT, 'm1', `$m_1(${t})$`, o1, 'b', 1);
    msg(FGF.fB, 'm2', `$m_2(${t})$`, o2, 'bl', -1);
  }
};
// END factor-graph slides
// =====================================================================================================
