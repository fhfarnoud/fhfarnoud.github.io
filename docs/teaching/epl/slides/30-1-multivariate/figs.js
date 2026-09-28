// Figures of the Chapter 4 deck.  Each FIGS entry draws from one parameter
// object (see ../shared/deck.js); x2 is horizontal and x1 vertical throughout.

Object.assign(MACROS, {
  '\\bX': '\\boldsymbol{X}', '\\bZ': '\\boldsymbol{Z}', '\\bY': '\\boldsymbol{Y}', '\\bx': '\\boldsymbol{x}',
  '\\bz': '\\boldsymbol{z}', '\\bq': '\\boldsymbol{q}', '\\ba': '\\boldsymbol{a}',
  '\\bb': '\\boldsymbol{b}', '\\bmu': '\\boldsymbol{\\mu}', '\\btheta': '\\boldsymbol{\\theta}',
  '\\bTheta': '\\boldsymbol{\\Theta}', '\\bzero': '\\boldsymbol{0}', '\\bone': '\\boldsymbol{1}',
  '\\mK': '\\mathsf{K}', '\\mA': '\\mathsf{A}', '\\mS': '\\mathsf{S}', '\\mI': '\\mathsf{I}',
  '\\mQ': '\\mathsf{Q}', '\\mW': '\\mathsf{W}', '\\cov': '\\operatorname{Cov}', '\\var': '\\operatorname{Var}',
  '\\uni': '\\operatorname{Uni}', '\\mle': '\\mathrm{mle}',
  // ## is a literal # inside a KaTeX macro
  '\\cpr': '\\textcolor{##2354A8}{#1}', '\\clk': '\\textcolor{##008000}{#1}',
  '\\cpo': '\\textcolor{##B30000}{#1}', '\\cml': '\\textcolor{##616161}{#1}'
});
const S75 = Math.sqrt(0.75);

// A plot of [xlo,xhi] x [ylo,yhi], W x H pixels at (x0, y0).
function box2d(x0, y0, W, H, xlo, xhi, ylo, yhi) {
  return { x0, y0, W, H, xlo, xhi, ylo, yhi,
    X: x => x0 + (x - xlo) / (xhi - xlo) * W, Y: y => y0 + (yhi - y) / (yhi - ylo) * H };
}
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
  const [nx, ny] = o.names ?? ['$x_2$', '$x_1$'];
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
const pathOf = pts => pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('');

// ---------------------------------------------------------------- outline
FIGS.outline = {
  init(root) {
    const svg = newSvg(root, 400, 400), P = frame2d(20, 20, 360, 3.2);
    axes(root, svg, P, { ticks: [] });
    cloud(svg); placeCloud(root, P, 0.5, 2);
    for (const r of [1, 2]) el(svg, 'path', { d: ellipse(P, 0.5, r), fill: 'none', stroke: C.prior, 'stroke-width': 2 });
    el(svg, 'line', { x1: P.X(2), x2: P.X(2), y1: P.Y(-3.2), y2: P.Y(3.2), stroke: C.like, 'stroke-width': 3.5 });
    el(svg, 'circle', { cx: P.X(2), cy: P.Y(1), r: 7, fill: C.post, stroke: '#fff', 'stroke-width': 1.5 });
  },
  render() {}
};

// ---------------------------------------------------------------- the mean locates the cloud
// This slide's cloud is centred at mu = (1, 1), not at the origin (the standardized
// model comes later); MX is the realization's deviation from mu, (x1, x2).
const MP = frame2d(40, 20, 470, 4.5), MX = [1.5, 2], M0 = 1, BV = [1, -3];   // BV: the shift b, (x1, x2)
FIGS.mean = {
  duration: 1300,
  init(root) {
    const svg = newSvg(root, 580, 540), P = MP;
    axes(root, svg, P, { grid: 4, ticks: [-4, -2, 2, 4] });
    cloud(svg);
    el(svg, 'line', { class: 'bl', stroke: '#666', 'stroke-width': 2, 'stroke-dasharray': '6 5' });
    el(svg, 'path', { class: 'bh', fill: '#666', stroke: '#666', 'stroke-width': 2, 'stroke-linejoin': 'round' });
    el(svg, 'path', { class: 'dev', stroke: C.teal, 'stroke-width': 3.5, fill: C.teal, 'stroke-linejoin': 'round' });
    el(svg, 'circle', { class: 'xdot', r: 7, fill: C.teal, stroke: '#fff', 'stroke-width': 1.5 });
    el(svg, 'circle', { class: 'mdot', r: 8, fill: C.ink, stroke: '#fff', 'stroke-width': 1.5 });
  },
  render(root, p) {
    const P = MP, b = p.b;
    $$(root, 'pt').forEach((c, i) => {
      const [z, w] = PTS[i], h = M0 + z + b * BV[1], v = M0 + 0.5 * z + S75 * w + b * BV[0];
      attr(c, { cx: P.X(h), cy: P.Y(v), fill: C.prior, 'fill-opacity': Math.abs(h) > P.R || Math.abs(v) > P.R ? 0 : 0.3 });
    });
    const mx = P.X(M0 + b * BV[1]), my = P.Y(M0 + b * BV[0]), xx = P.X(M0 + MX[1] + b * BV[1]), xy = P.Y(M0 + MX[0] + b * BV[0]);
    attr($(root, 'mdot'), { cx: mx, cy: my, opacity: p.mu });
    attr($(root, 'xdot'), { cx: xx, cy: xy, opacity: p.mu });
    attr($(root, 'dev'), { d: vecD(mx, my, xx, xy, 14, 3.5, 8), opacity: p.mu });
    const bo = clamp(b * 4), bv = vecParts(P.X(M0), P.Y(M0), mx, my, 12, 2, 9);
    attr($(root, 'bl'), { x1: P.X(M0), y1: P.Y(M0), x2: bv.bx, y2: bv.by, opacity: bo });
    attr($(root, 'bh'), { d: bv.head, opacity: bo });
    const moved = b > 0.5;
    label(root, 'mu', moved ? '$\\bmu+\\bb$' : '$\\bmu$', moved ? mx - 12 : mx + 12, my + 6, moved ? 'tr' : 'tl', C.ink, p.mu);
    label(root, 'x', moved ? '$\\bx+\\bb$' : '$\\bx$', xx + 12, xy, 'l', C.teal, p.mu);
    label(root, 'dev', '$\\bx-\\bmu$', (mx + xx) / 2 + 12, (my + xy) / 2 + 6, 'tl', C.teal, p.mu);
    label(root, 'b', '$\\bb$', P.X(M0 + b * BV[1] / 2), P.Y(M0 + b * BV[0] / 2) + 10, 't', '#555', bo);
  }
};

// ---------------------------------------------------------------- quadrant products
const QP = frame2d(40, 20, 450, 3.2);
FIGS.quad = {
  duration: 2400,
  init(root) {
    const svg = newSvg(root, 560, 560), P = QP, R = P.R;
    for (const [sx, sy] of [[1, 1], [-1, -1], [-1, 1], [1, -1]]) {
      const pos = sx * sy > 0;
      el(svg, 'rect', { class: 'qr', x: Math.min(P.X(0), P.X(sx * R)), y: Math.min(P.Y(0), P.Y(sy * R)),
        width: P.S / 2, height: P.S / 2, fill: pos ? C.teal : C.rose });
    }
    axes(root, svg, P);
    cloud(svg); placeCloud(root, P, 0.5);
  },
  render(root, p) {
    const P = QP, N = PTS.length, m = Math.round(p.k * N);
    $$(root, 'qr').forEach(r => attr(r, { 'fill-opacity': 0.1 * p.q }));
    let sum = 0, np = 0;
    $$(root, 'pt').forEach((c, i) => {
      const [z, w] = PTS[i], x1 = 0.5 * z + S75 * w, pr = x1 * z;
      if (i < m) { sum += pr; np += pr > 0; }
      const out = Math.abs(z) > P.R || Math.abs(x1) > P.R;
      attr(c, out ? { 'fill-opacity': 0 } : i < m ? { fill: pr > 0 ? C.teal : C.rose, 'fill-opacity': 0.85, r: 3 } : { fill: C.prior, 'fill-opacity': 0.3, r: 2.6 });
    });
    for (const [k, x, y, pos] of [['s1', 2.6, 2.8, 1], ['s2', -2.6, -2.8, 1], ['s3', -2.6, 2.8, 0], ['s4', 2.6, -2.8, 0]])
      label(root, k, pos ? '$+$' : '$-$', P.X(x), P.Y(y), 'c', pos ? C.teal : C.rose, p.q);
    const on = m > 0 ? 1 : 0;
    label(root, 'cnt', `products $x_1x_2$: <span style="color:${C.teal}">${np} positive</span>, <span style="color:${C.rose}">${m - np} negative</span>`,
      P.X(-P.R), P.Y(-P.R) + 34, 'tl', '#333', on);
    label(root, 'avg', `average product: ${m ? fmt(sum / m) : ''}`, P.X(-P.R), P.Y(-P.R) + 62, 'tl', '#333', on);
  }
};

// ---------------------------------------------------------------- die counts
const DSAMP = [[4, 7, 8, 5, 6, 6], [5, 9, 10, 3, 2, 7], [6, 5, 7, 7, 6, 5], [3, 6, 9, 8, 3, 7]];
const DB = box2d(70, 50, 440, 400, 0.4, 6.6, 0, 12);
FIGS.dice = {
  duration: 1000,
  init(root) {
    const svg = newSvg(root, 620, 520), B = DB;
    const g = el(svg, 'g');
    for (let v = 0; v <= 12; v += 2) {
      el(g, 'line', { x1: B.X(0.4), x2: B.X(6.6), y1: B.Y(v), y2: B.Y(v), stroke: C.grid });
      el(g, 'text', { x: B.X(0.4) - 8, y: B.Y(v) + 5, 'text-anchor': 'end', 'font-size': 16, fill: '#555' }).textContent = v;
    }
    el(g, 'line', { x1: B.X(0.4), x2: B.X(6.6), y1: B.Y(0), y2: B.Y(0), stroke: C.axis, 'stroke-width': 1.5 });
    el(g, 'line', { x1: B.X(0.4), x2: B.X(0.4), y1: B.Y(0), y2: B.Y(12), stroke: C.axis, 'stroke-width': 1.5 });
    for (let i = 1; i <= 6; i++) {
      el(svg, 'rect', { class: 'bar', x: B.X(i - 0.32), width: B.X(0.64) - B.X(0), fill: C.prior, 'fill-opacity': 0.55, stroke: C.prior, 'stroke-width': 1.5 });
      el(g, 'text', { x: B.X(i), y: B.Y(0) + 22, 'text-anchor': 'middle', 'font-size': 18, fill: '#333' }).textContent = i;
    }
    el(svg, 'line', { x1: B.X(0.4), x2: B.X(6.6), y1: B.Y(6), y2: B.Y(6), stroke: C.ink, 'stroke-width': 2, 'stroke-dasharray': '7 5' });
    label(root, 'face', 'die face $i$', B.X(3.5), B.Y(0) + 34, 't', '#444');
    label(root, 'cnt', 'count $X_i$', B.X(0.4) - 50, B.Y(12) - 26, 'l', '#444');
    label(root, 'mean', '$\\E[X_i]=6$', B.X(6.6) + 6, B.Y(6), 'l', C.ink);
  },
  render(root, p) {
    const B = DB, i0 = Math.min(Math.floor(p.s), 3), i1 = Math.min(i0 + 1, 3), u = p.s - i0;
    const h = DSAMP[i0].map((v, j) => lerp(v, DSAMP[i1][j], u));
    $$(root, 'bar').forEach((r, j) => attr(r, { y: B.Y(h[j]), height: B.Y(0) - B.Y(h[j]) }));
    h.forEach((v, j) => label(root, 'v' + j, '' + Math.round(v), B.X(j + 1), B.Y(v) - 4, 'b', C.prior));
    label(root, 'batch', `batch ${Math.round(p.s) + 1} of 36 rolls: total $${h.reduce((a, b) => a + b, 0).toFixed(0)}$`,
      B.X(3.5), B.Y(12) - 18, 'c', '#333');
  }
};

// ---------------------------------------------------------------- a linear map
const LP = frame2d(40, 20, 450, 3.2), LDEV = [1.3, 0.8];   // highlighted point (h, v) of the round cloud
function linMap(h, v, a, b) {
  const sx = lerp(1, Math.sqrt(1.5), a), sy = lerp(1, Math.sqrt(0.5), a), t = b * Math.PI / 4;
  const x = sx * h, y = sy * v;
  return [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)];
}
FIGS.lin = {
  duration: 1400,
  init(root) {
    const svg = newSvg(root, 560, 560), P = LP;
    axes(root, svg, P);
    cloud(svg);
    el(svg, 'path', { class: 'c1', fill: 'none', stroke: C.prior, 'stroke-width': 2.5 });
    el(svg, 'path', { class: 'c2', fill: 'none', stroke: C.prior, 'stroke-width': 2 });
    el(svg, 'path', { class: 'dev', stroke: C.teal, 'stroke-width': 3.5, fill: C.teal, 'stroke-linejoin': 'round' });
    el(svg, 'circle', { class: 'xdot', r: 7, fill: C.teal, stroke: '#fff', 'stroke-width': 1.5 });
  },
  render(root, p) {
    const P = LP, m = (h, v) => linMap(h, v, p.a, p.b);
    $$(root, 'pt').forEach((c, i) => {
      const [h, v] = m(PTS[i][0], PTS[i][1]);
      attr(c, { cx: P.X(h), cy: P.Y(v), fill: C.prior, 'fill-opacity': Math.abs(h) > P.R || Math.abs(v) > P.R ? 0 : 0.3 });
    });
    for (const [k, r] of [['c1', 1], ['c2', 2]]) {
      const pts = [];
      for (let i = 0; i <= 120; i++) { const t = i / 120 * 2 * Math.PI, [h, v] = m(r * Math.cos(t), r * Math.sin(t)); pts.push([P.X(h), P.Y(v)]); }
      attr($(root, k), { d: pathOf(pts) });
    }
    const [dh, dv] = m(LDEV[0], LDEV[1]);
    attr($(root, 'dev'), { d: vecD(P.X(0), P.Y(0), P.X(dh), P.Y(dv), 14, 3.5, 8) });
    attr($(root, 'xdot'), { cx: P.X(dh), cy: P.Y(dv) });
    // Covariance of the mapped cloud, M M^T, shown in (x1, x2) order.
    const sx = lerp(1, Math.sqrt(1.5), p.a), sy = lerp(1, Math.sqrt(0.5), p.a), t = p.b * Math.PI / 4;
    const c = Math.cos(t), s = Math.sin(t);
    const hh = sx * sx * c * c + sy * sy * s * s, vv = sx * sx * s * s + sy * sy * c * c, hv = (sx * sx - sy * sy) * s * c;
    label(root, 'K', `$\\cov=\\begin{pmatrix}${fmt(vv)}&${fmt(hv)}\\\\${fmt(hv)}&${fmt(hh)}\\end{pmatrix}$`,
      P.X(-P.R) + 8, P.Y(P.R) + 8, 'tl', C.ink);
    // The map in (x1, x2) order: x1' = sy c x1 + sx s x2, x2' = -sy s x1 + sx c x2.
    label(root, 'A', `$\\mA=\\begin{pmatrix}${fmt(sy * c)}&${fmt(sx * s)}\\\\${fmt(-sy * s)}&${fmt(sx * c)}\\end{pmatrix}$`,
      P.X(P.R) - 8, P.Y(-P.R) - 8, 'br', C.teal, clamp(4 * Math.max(p.a, p.b)));
  }
};

// ---------------------------------------------------------------- prime and odd faces
FIGS.venn = {
  init(root) {
    const k = 1.2, svg = newSvg(root, 440 * k, 300 * k);
    const E1 = [165, 140, 125, 105].map(v => v * k), E2 = [275, 140, 125, 105].map(v => v * k);   // cx, cy, rx, ry
    const inside = (E, x, y) => ((x - E[0]) / E[2]) ** 2 + ((y - E[1]) / E[3]) ** 2 <= 1;
    const lens = [];
    for (let i = 0; i < 720; i++) {
      const t = i / 720 * 2 * Math.PI;
      for (const [E, F] of [[E1, E2], [E2, E1]]) {
        const x = E[0] + E[2] * Math.cos(t), y = E[1] + E[3] * Math.sin(t);
        if (inside(F, x, y)) lens.push([x, y]);
      }
    }
    lens.sort((a, b) => Math.atan2(a[1] - 140 * k, a[0] - 220 * k) - Math.atan2(b[1] - 140 * k, b[0] - 220 * k));
    el(svg, 'ellipse', { cx: E1[0], cy: E1[1], rx: E1[2], ry: E1[3], fill: C.teal, 'fill-opacity': 0.1, stroke: C.teal, 'stroke-width': 2.5 });
    el(svg, 'ellipse', { cx: E2[0], cy: E2[1], rx: E2[2], ry: E2[3], fill: C.brown, 'fill-opacity': 0.1, stroke: C.brown, 'stroke-width': 2.5 });
    el(svg, 'path', { class: 'lens', d: pathOf(lens) + 'Z', fill: C.postC, stroke: 'none' });
    for (const [key, s, x, y] of [['f2', '2', 95, 140], ['f1', '1', 345, 140], ['f3', '3', 220, 105], ['f5', '5', 220, 175]])
      label(root, key, `$${s}$`, x * k, y * k, 'c', C.ink);
    label(root, 'pr', 'prime', 110 * k, 22 * k, 'c', C.teal);
    label(root, 'od', 'odd', 330 * k, 22 * k, 'c', C.brown);
    label(root, 'no', '$4$ and $6$ count in neither', 220 * k, 272 * k, 'c', '#444');
  },
  render(root, p) { attr($(root, 'lens'), { 'fill-opacity': 0.4 * (p.hl || 0) }); }
};

// ---------------------------------------------------------------- projections
const PP = frame2d(30, 20, 370, 3.2), PD = box2d(470, 110, 250, 250, -4.5, 4.5, 0, 0.62);
FIGS.proj = {
  duration: 1300,
  init(root) {
    const svg = newSvg(root, 760, 440), P = PP, B = PD;
    axes(root, svg, P);
    cloud(svg); placeCloud(root, P, 0.5);
    $$(root, 'pt').forEach(c => attr(c, { 'fill-opacity': 0.2 }));
    for (const r of [1, 2]) el(svg, 'path', { d: ellipse(P, 0.5, r), fill: 'none', stroke: C.prior, 'stroke-width': 2, 'stroke-opacity': 0.7 });
    el(svg, 'line', { class: 'dir', stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '7 5' });
    el(svg, 'line', { class: 'perp', stroke: C.brown, 'stroke-width': 2, 'stroke-dasharray': '4 4' });
    el(svg, 'circle', { cx: P.X(2), cy: P.Y(0), r: 5, fill: C.brown });
    el(svg, 'circle', { class: 'foot', r: 5, fill: C.brown });
    el(svg, 'path', { class: 'avec', stroke: C.teal, 'stroke-width': 4, fill: C.teal, 'stroke-linejoin': 'round' });
    // ticks of a^T x along the dashed line (shown when p.ax): a^T x = v sits at distance v / |a|
    for (let k = 0; k < 4; k++) el(svg, 'line', { class: 'tk' + k, stroke: C.ink, 'stroke-width': 2 });
    // density panel for a^T x
    const g = el(svg, 'g');
    for (const v of [-4, -2, 0, 2, 4]) {
      el(g, 'line', { x1: B.X(v), x2: B.X(v), y1: B.Y(0), y2: B.Y(0) + 6, stroke: C.axis });
      el(g, 'text', { x: B.X(v), y: B.Y(0) + 24, 'text-anchor': 'middle', 'font-size': 16, fill: '#555' }).textContent = minus(v);
    }
    for (let i = 0; i < 18; i++) el(svg, 'rect', { class: 'hb', x: B.X(-4.5 + 0.5 * i) + 1, width: B.X(0.5) - B.X(0) - 2, fill: C.prior, 'fill-opacity': 0.18 });
    el(svg, 'path', { class: 'bell', fill: 'none', stroke: C.prior, 'stroke-width': 3 });
    arrow(g, B.X(-4.5), B.Y(0), B.X(4.5) + 14, B.Y(0), C.axis);
    label(root, 'px', '$\\ba^T\\bx$', B.X(0), B.Y(0) + 40, 't', '#444');
    label(root, 'py', '<span class="cap">density; bars: the 400 dots</span>', B.X(-4.5), B.Y(0.62) - 60, 'l', '#555');
  },
  render(root, p) {
    const P = PP, B = PD, al = p.al * Math.PI / 180, sc = p.sc ?? 1, ch = Math.cos(al), cv = Math.sin(al), R = P.R;
    attr($(root, 'dir'), { x1: P.X(-R * ch), y1: P.Y(-R * cv), x2: P.X(R * ch), y2: P.Y(R * cv) });
    attr($(root, 'avec'), { d: vecD(P.X(0), P.Y(0), P.X(ch), P.Y(cv), 14, 4) });   // the direction of a, unit length
    [-4, -2, 2, 4].forEach((v, k) => {
      const t = v / sc, on = (p.ax ?? 0) * (Math.abs(t) < R - 0.2 ? 1 : 0), nh = -cv * 0.1, nv = ch * 0.1;
      attr($(root, 'tk' + k), { x1: P.X(t * ch - nh), y1: P.Y(t * cv - nv), x2: P.X(t * ch + nh), y2: P.Y(t * cv + nv), opacity: on });
      label(root, 'tl' + k, minus(v), P.X(t * ch + 2.6 * nh), P.Y(t * cv + 2.6 * nv), 'c', C.ink, on);
    });
    const t0 = 2 * ch;   // the point (x2, x1) = (2, 0) and its foot on the line
    attr($(root, 'foot'), { cx: P.X(t0 * ch), cy: P.Y(t0 * cv) });
    attr($(root, 'perp'), { x1: P.X(2), y1: P.Y(0), x2: P.X(t0 * ch), y2: P.Y(t0 * cv) });
    const a1 = sc * cv, a2 = sc * ch, v = sc * sc * (1 + 0.5 * Math.sin(2 * al));
    if (p.ax ?? 0) label(root, 'a', '$\\ba/\\|\\ba\\|$', P.X(ch + 0.12 * cv), P.Y(cv - 0.28 * ch), 'tl', C.teal);   // opposite side from the ticks
    else label(root, 'a', '$\\ba$', P.X(1.3 * ch), P.Y(1.3 * cv), 'c', C.teal);
    // histogram of a^T x over the 400 points
    const cnt = new Array(18).fill(0);
    PTS.forEach(([z, w]) => { const t = a1 * (0.5 * z + S75 * w) + a2 * z, b = Math.floor((t + 4.5) / 0.5); if (b >= 0 && b < 18) cnt[b]++; });
    $$(root, 'hb').forEach((r, i) => { const d = Math.min(cnt[i] / (PTS.length * 0.5), 0.62); attr(r, { y: B.Y(d), height: B.Y(0) - B.Y(d) }); });
    let d = '';
    for (let i = 0; i <= 180; i++) { const t = -4.5 + 9 * i / 180; d += (i ? 'L' : 'M') + B.X(t).toFixed(1) + ',' + B.Y(Math.min(phi(t, 0, v), 0.62)).toFixed(1); }
    attr($(root, 'bell'), { d });
    label(root, 'av', `$\\ba=(${fmt(a1)},\\,${fmt(a2)})^T$`, B.X(-4.5), B.Y(0.62) - 30, 'l', C.teal);
    label(root, 'var', `$\\ba^T\\mK\\ba=${fmt(v)}$`, B.X(0) + 12, B.Y(Math.min(phi(0, 0, v), 0.62)) - 4, 'bl', C.prior);
  }
};

// ---------------------------------------------------------------- three tilts
FIGS.tilt3 = {
  init(root) {
    const svg = newSvg(root, 1110, 300), rhos = [-0.5, 0, 0.5], s = 270;
    rhos.forEach((rho, j) => {
      const P = frame2d(20 + j * 380, 10, s, 3.2), g = el(svg, 'g');
      el(g, 'line', { x1: P.X(-3.2), x2: P.X(3.2), y1: P.Y(0), y2: P.Y(0), stroke: C.axis });
      el(g, 'line', { y1: P.Y(-3.2), y2: P.Y(3.2), x1: P.X(0), x2: P.X(0), stroke: C.axis });
      const sq = Math.sqrt(1 - rho * rho);
      PTS.forEach(([z, w]) => el(g, 'circle', { cx: P.X(z), cy: P.Y(rho * z + sq * w), r: 2, fill: C.prior, 'fill-opacity': 0.3 }));
      for (const r of [1, 2]) el(g, 'path', { d: ellipse(P, rho, r), fill: 'none', stroke: C.prior, 'stroke-width': 2 });
      label(root, 'n' + j, 'ABC'[j], P.X(-3.2) - 4, P.Y(3.2) + 4, 'tl', C.ink);
      label(root, 'x' + j, '$x_2$', P.X(3.2) + 6, P.Y(0), 'l', '#444');
      label(root, 'y' + j, '$x_1$', P.X(0) + 6, P.Y(3.2) + 2, 'tl', '#444');
      label(root, 'r' + j, `$\\rho=${rho}$`, P.X(0), P.Y(-3.2) + 6, 't', C.post, 0);
    });
  },
  render(root, p) { [0, 1, 2].forEach(j => { const d = root.querySelector(`.lab[data-k="r${j}"]`); if (d) { d.style.opacity = p.rev; d.style.visibility = p.rev ? 'visible' : 'hidden'; } }); }
};

// ---------------------------------------------------------------- rho sweeps, marginals fixed
const TL = frame2d(40, 120, 380, 3.2);
FIGS.tilt = {
  duration: 1300,
  init(root) {
    const svg = newSvg(root, 640, 540), P = TL, R = P.R;
    axes(root, svg, P);
    cloud(svg);
    el(svg, 'path', { class: 'c1', fill: 'none', stroke: C.prior, 'stroke-width': 2 });
    el(svg, 'path', { class: 'c2', fill: 'none', stroke: C.prior, 'stroke-width': 2 });
    // marginal of X2 above the plot, marginal of X1 to its right
    let top = '', side = '';
    for (let i = 0; i <= 120; i++) {
      const t = -R + 2 * R * i / 120;
      top += (i ? 'L' : 'M') + P.X(t).toFixed(1) + ',' + (P.Y(R) - 34 - 180 * phi(t, 0, 1)).toFixed(1);
      side += (i ? 'L' : 'M') + (P.X(R) + 30 + 180 * phi(t, 0, 1)).toFixed(1) + ',' + P.Y(t).toFixed(1);
    }
    el(svg, 'path', { d: top + `L${P.X(R)},${P.Y(R) - 34}L${P.X(-R)},${P.Y(R) - 34}Z`, fill: C.prior, 'fill-opacity': 0.12, stroke: C.prior, 'stroke-width': 2.5 });
    el(svg, 'path', { d: side + `L${P.X(R) + 30},${P.Y(-R)}L${P.X(R) + 30},${P.Y(R)}Z`, fill: C.prior, 'fill-opacity': 0.12, stroke: C.prior, 'stroke-width': 2.5 });
    label(root, 'm2', '<span class="cap">marginal of $X_2$</span>', P.X(R * 0.4), P.Y(R) - 80, 'l', C.prior);
    label(root, 'm1', '<span class="cap">marginal of $X_1$</span>', P.X(R) + 40, P.Y(-R) + 14, 'tl', C.prior);
    label(root, 'mn', 'both $\\cN(0,1)$', P.X(R) + 40, P.Y(-R) + 40, 'tl', C.prior);
  },
  render(root, p) {
    const P = TL;
    placeCloud(root, P, p.rho);
    attr($(root, 'c1'), { d: ellipse(P, p.rho, 1) });
    attr($(root, 'c2'), { d: ellipse(P, p.rho, 2) });
    label(root, 'K', `$\\mK=\\begin{pmatrix}1&${fmt(p.rho)}\\\\${fmt(p.rho)}&1\\end{pmatrix}$`, P.X(-P.R) + 6, P.Y(P.R) + 8, 'tl', C.ink);
  }
};

// ---------------------------------------------------------------- which point is more unusual
const HP = frame2d(40, 20, 470, 5.2), DA = Math.sqrt(16 / 3), DBd = 4;
function mahaBase(root, svg, P) {
  axes(root, svg, P, { grid: 5, ticks: [-4, -2, 2, 4] });
  for (const r of [1, 2]) el(svg, 'path', { d: ellipse(P, 0.5, r), fill: 'none', stroke: C.prior, 'stroke-width': 2, 'stroke-opacity': 0.8 });
}
FIGS.maha = {
  duration: 1400,
  init(root) {
    const svg = newSvg(root, 580, 540), P = HP;
    mahaBase(root, svg, P);
    el(svg, 'circle', { cx: P.X(0), cy: P.Y(0), r: Math.sqrt(8) * P.k, fill: 'none', stroke: '#777', 'stroke-width': 1.8, 'stroke-dasharray': '7 5' });
    el(svg, 'path', { class: 'ea', fill: C.teal, 'fill-opacity': 0.06, stroke: C.teal, 'stroke-width': 3 });
    el(svg, 'path', { class: 'eb', fill: C.rose, 'fill-opacity': 0.05, stroke: C.rose, 'stroke-width': 3 });
    el(svg, 'circle', { cx: P.X(2), cy: P.Y(2), r: 8, fill: C.teal, stroke: '#fff', 'stroke-width': 1.5 });
    el(svg, 'circle', { cx: P.X(-2), cy: P.Y(2), r: 8, fill: C.rose, stroke: '#fff', 'stroke-width': 1.5 });
    label(root, 'A', 'A', P.X(2) + 12, P.Y(2) - 6, 'bl', C.teal);
    label(root, 'B', 'B', P.X(-2) - 12, P.Y(2) - 6, 'br', C.rose);
    label(root, 'eu', '<span class="cap">Euclidean distance $\\sqrt8$</span>', P.X(0), P.Y(-Math.sqrt(8)) + 8, 't', '#555');
  },
  render(root, p) {
    const P = HP;
    attr($(root, 'ea'), { d: ellipse(P, 0.5, Math.max(p.r, 0.01) * DA), opacity: p.r > 0.01 ? 1 : 0 });
    attr($(root, 'eb'), { d: ellipse(P, 0.5, Math.max(p.r, 0.01) * DBd), opacity: p.r > 0.01 ? 1 : 0 });
    label(root, 'la', '$\\Delta_A^2=16/3$', P.X(3.3), P.Y(1.1), 'l', C.teal, clamp((p.r - 0.8) / 0.2) * (p.num || 0));
    label(root, 'lb', '$\\Delta_B^2=16$', P.X(-4.9), P.Y(4.1), 'l', C.rose, clamp((p.r - 0.8) / 0.2) * (p.num || 0));
  }
};

// ---------------------------------------------------------------- density contours
FIGS.dens = {
  init(root) {
    const svg = newSvg(root, 400, 400), P = frame2d(20, 20, 350, 3.2);
    axes(root, svg, P, { ticks: [] });
    for (const r of [3, 2.5, 2, 1.5, 1, 0.5]) el(svg, 'path', { d: ellipse(P, 0.5, r), fill: C.prior, 'fill-opacity': 0.13, stroke: C.prior, 'stroke-width': r % 1 ? 0.8 : 2 });
    el(svg, 'circle', { cx: P.X(0), cy: P.Y(0), r: 5, fill: C.ink });
    label(root, 'd1', '$\\Delta=1$', P.X(0.6) + 4, P.Y(-0.6), 'l', C.prior);
    label(root, 'd2', '$\\Delta=2$', P.X(1.2) + 6, P.Y(-1.2), 'l', C.prior);
    label(root, 'mu', '$\\bmu$', P.X(0) - 8, P.Y(0) + 4, 'tr', C.ink);
  },
  render() {}
};

// ---------------------------------------------------------------- whitening
const WP = frame2d(40, 20, 470, 5.2);
function whiten(h, v, r, s) {
  const t = -r * Math.PI / 4, x = h * Math.cos(t) - v * Math.sin(t), y = h * Math.sin(t) + v * Math.cos(t);
  return [x * lerp(1, 1 / Math.sqrt(1.5), s), y * lerp(1, 1 / Math.sqrt(0.5), s)];
}
FIGS.white = {
  duration: 1500,
  init(root) {
    const svg = newSvg(root, 580, 540), P = WP;
    axes(root, svg, P, { grid: 5, ticks: [-4, -2, 2, 4] });
    cloud(svg);
    for (const k of ['c1', 'c2']) el(svg, 'path', { class: k, fill: 'none', stroke: C.prior, 'stroke-width': 2 });
    el(svg, 'path', { class: 'ea', fill: 'none', stroke: C.teal, 'stroke-width': 3 });
    el(svg, 'path', { class: 'eb', fill: 'none', stroke: C.rose, 'stroke-width': 3 });
    el(svg, 'circle', { class: 'pa', r: 8, fill: C.teal, stroke: '#fff', 'stroke-width': 1.5 });
    el(svg, 'circle', { class: 'pb', r: 8, fill: C.rose, stroke: '#fff', 'stroke-width': 1.5 });
  },
  render(root, p) {
    const P = WP, m = (h, v) => whiten(h, v, p.r, p.s), R = P.R;
    $$(root, 'pt').forEach((c, i) => {
      const [z, w] = PTS[i], [h, v] = m(z, 0.5 * z + S75 * w);
      attr(c, { cx: P.X(h), cy: P.Y(v), fill: C.prior, 'fill-opacity': Math.abs(h) > R || Math.abs(v) > R ? 0 : 0.25, r: 2.4 });
    });
    const ring = (rr) => {   // Mahalanobis-rr contour of the running model, mapped
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const t = i / 120 * 2 * Math.PI, u = rr * Math.sqrt(1.5) * Math.cos(t), w = rr * Math.sqrt(0.5) * Math.sin(t);
        const [h, v] = m((u - w) / Math.SQRT2, (u + w) / Math.SQRT2); pts.push([P.X(h), P.Y(v)]);
      }
      return pathOf(pts);
    };
    attr($(root, 'c1'), { d: ring(1) }); attr($(root, 'c2'), { d: ring(2) });
    attr($(root, 'ea'), { d: ring(DA) }); attr($(root, 'eb'), { d: ring(DBd) });
    const [ah, av] = m(2, 2), [bh, bv] = m(-2, 2);
    attr($(root, 'pa'), { cx: P.X(ah), cy: P.Y(av) }); attr($(root, 'pb'), { cx: P.X(bh), cy: P.Y(bv) });
    label(root, 'A', 'A', P.X(ah) + 10, P.Y(av) - 8, 'bl', C.teal);
    label(root, 'B', 'B', P.X(bh) - 10, P.Y(bv) - 8, 'br', C.rose);
    const z = p.s > 0.5;
    label(root, 'ax2', z ? '$z_1$' : '$x_2$', P.X(R) + 10, P.Y(0) + 8, 't', '#444');
    label(root, 'ax1', z ? '$z_2$' : '$x_1$', P.X(0) + 8, P.Y(R) - 14, 'l', '#444');
    label(root, 'na', '$\\|\\bz_A\\|=2.31$', P.X(2.4), P.Y(-4.5), 'l', C.teal, clamp((p.s - 0.8) / 0.2));
    label(root, 'nb', '$\\|\\bz_B\\|=4$', P.X(bh) + 14, P.Y(bv) - 12, 'bl', C.rose, clamp((p.s - 0.8) / 0.2));
  }
};

// ---------------------------------------------------------------- zero covariance
const ZG = frame2d(20, 10, 290, 3.2);
FIGS.zg = {
  duration: 1200,
  init(root) {
    const svg = newSvg(root, 560, 310), P = ZG;
    axes(root, svg, P);
    cloud(svg);
    for (const r of [1, 2]) el(svg, 'path', { d: ellipse(P, 0, r), fill: 'none', stroke: C.prior, 'stroke-width': 2 });
    el(svg, 'line', { class: 'slice', y1: P.Y(-3.2), y2: P.Y(3.2), stroke: C.like, 'stroke-width': 3.5 });
  },
  render(root, p) {
    const P = ZG, x = p.x * 2;   // the slice at x2 = 2x, so both panels move together
    placeCloud(root, P, 0, p.on ? x : null);
    attr($(root, 'slice'), { x1: P.X(x), x2: P.X(x), opacity: p.on });
    label(root, 'c', `$X_1\\mid X_2=${fmt(x, 1)}$<br>$\\sim\\cN(0,1)$`, P.X(3.2) + 34, P.Y(1.4), 'l', C.post, p.on);
    label(root, 'c2', '<span class="cap">the same for every $x_2$</span>', P.X(3.2) + 34, P.Y(0.1), 'l', C.post, p.on);
  }
};
const ZU = box2d(30, 20, 300, 250, -1.2, 1.2, -0.25, 1.25);
const ZX = (() => { const r = mulberry32(2026); return Array.from({ length: 70 }, () => 2 * r() - 1); })();
FIGS.zu = {
  duration: 1200,
  init(root) {
    const svg = newSvg(root, 560, 310), B = ZU;
    axesBox(root, svg, B, { step: 0.5, xt: [-1, 1], yt: [1], names: ['$x$', '$y$'] });
    let d = '';
    for (let i = 0; i <= 80; i++) { const x = -1 + 2 * i / 80; d += (i ? 'L' : 'M') + B.X(x).toFixed(1) + ',' + B.Y(x * x).toFixed(1); }
    el(svg, 'path', { d, fill: 'none', stroke: C.prior, 'stroke-width': 2, 'stroke-opacity': 0.6 });
    ZX.forEach(x => el(svg, 'circle', { cx: B.X(x), cy: B.Y(x * x), r: 3.2, fill: C.prior, 'fill-opacity': 0.45 }));
    el(svg, 'line', { class: 'slice', y1: B.Y(-0.25), y2: B.Y(1.25), stroke: C.like, 'stroke-width': 3.5 });
    el(svg, 'circle', { class: 'dot', r: 8, fill: C.post, stroke: '#fff', 'stroke-width': 1.5 });
  },
  render(root, p) {
    const B = ZU;
    attr($(root, 'slice'), { x1: B.X(p.x), x2: B.X(p.x), opacity: p.on });
    attr($(root, 'dot'), { cx: B.X(p.x), cy: B.Y(p.x * p.x), opacity: p.on });
    label(root, 'c', `$Y\\mid X=${fmt(p.x, 1)}$<br>equals $${fmt(Math.round(p.x * 10) ** 2 / 100)}$`, B.X(1.2) + 30, B.Y(0.85), 'l', C.post, p.on);
    label(root, 'c2', '<span class="cap">exactly, with no spread</span>', B.X(1.2) + 30, B.Y(0.5), 'l', C.post, p.on);
  }
};

// ---------------------------------------------------------------- four samples (ML)
// Samples (x1, x2) = (-1,1), (1,1), (2,2), (2,4): mean (1, 2), K_mle = [[1.5, 1], [1, 1.5]].
const FP = box2d(50, 20, 380, 380, -0.5, 4.5, -1.5, 3.5), F4 = [[1, -1], [1, 1], [2, 2], [4, 2]];   // (x2, x1)
const FC = [2, 1], fitEllipse = (B, r) => covEllipse(B, 1.5, 1, 1.5, r, FC[0], FC[1]);
function fourBase(root, svg, B) {
  axesBox(root, svg, B, { xt: [2, 4], yt: [2] });
  F4.forEach(([h, v]) => el(svg, 'circle', { cx: B.X(h), cy: B.Y(v), r: 8, fill: C.like, stroke: '#fff', 'stroke-width': 1.5 }));
}
FIGS.mle4 = {
  duration: 1000,
  init(root) {
    const svg = newSvg(root, 480, 440), B = FP;
    fourBase(root, svg, B);
    el(svg, 'path', { class: 'ell', d: fitEllipse(B, 1), fill: C.mle, 'fill-opacity': 0.08, stroke: C.mle, 'stroke-width': 3 });
    const g = el(svg, 'g', { class: 'ctr' });
    F4.forEach(([h, v]) => el(g, 'line', { x1: B.X(FC[0]), y1: B.Y(FC[1]), x2: B.X(h), y2: B.Y(v), stroke: C.mle, 'stroke-width': 1.8, 'stroke-dasharray': '6 5' }));
    el(g, 'circle', { cx: B.X(FC[0]), cy: B.Y(FC[1]), r: 8, fill: C.mle, stroke: '#fff', 'stroke-width': 1.5 });
  },
  render(root, p) {
    attr($(root, 'ctr'), { opacity: p.c });
    attr($(root, 'ell'), { opacity: p.e });
    label(root, 'xb', '$\\bar\\bx$', FP.X(FC[0]) + 12, FP.Y(FC[1]) + 2, 'tl', '#555', p.c);
    label(root, 'cf', '<span class="cap">$\\Delta=1$ for $\\hat\\mK_{\\mle}$</span>', FP.X(2.75), FP.Y(0.15), 'bl', '#555', p.e);
  }
};
// Residual colours, shared with the text of the outer-product slide.
const RC = ['#087F80', '#B33362', '#A0521B', '#6A3D9A'];
FIGS.outer = {
  duration: 900,
  init(root) {
    const svg = newSvg(root, 480, 440), B = FP;
    fourBase(root, svg, B);
    el(svg, 'path', { class: 'ell', d: fitEllipse(B, 1), fill: C.mle, 'fill-opacity': 0.08, stroke: C.mle, 'stroke-width': 3 });
    // residuals in (x2, x1), in the text's order
    [[-1, -2], [-1, 0], [0, 1], [2, 1]].forEach(([h, v], i) =>
      el(svg, 'path', { class: 'r' + i, d: vecD(B.X(FC[0]), B.Y(FC[1]), B.X(FC[0] + h), B.Y(FC[1] + v), 14, 3.5, 9),
        stroke: RC[i], fill: RC[i], 'stroke-width': 3.5, 'stroke-linejoin': 'round' }));
    el(svg, 'circle', { cx: B.X(FC[0]), cy: B.Y(FC[1]), r: 8, fill: C.mle, stroke: '#fff', 'stroke-width': 1.5 });
  },
  render(root, p) {
    for (let i = 0; i < 4; i++) attr($(root, 'r' + i), { opacity: clamp(p.k - i) });
    attr($(root, 'ell'), { opacity: p.e });
    label(root, 'xb', '$\\bar\\bx$', FP.X(FC[0]) + 14, FP.Y(FC[1]) + 4, 'tl', '#555');
    label(root, 'cf', '<span class="cap">$\\Delta=1$ for $\\hat\\mK_{\\mle}$</span>', FP.X(2.75), FP.Y(0.15), 'bl', '#555', p.e);
  }
};

// The four outer products (\htmlClass sN) fly into the average (\htmlClass dN);
// the glue (gA) fades in first and the result (gR) last.  One click runs f 0 -> 1.
FIGS.outfly = {
  duration: 3200, linear: true,
  init(root) {
    root.querySelectorAll('[class*="enclosing"]').forEach(e => { e.style.display = 'inline-block'; });
  },
  render(root, p) {
    if (!root.offsetWidth) return;
    const k = root.getBoundingClientRect().width / root.offsetWidth, f = p.f;
    $$(root, 'gA').forEach(g => { g.style.opacity = clamp(f / 0.1); });
    $$(root, 'gR').forEach(g => { g.style.opacity = clamp((f - 0.86) / 0.12); });
    for (let i = 1; i <= 4; i++) {
      const src = $(root, 's' + i), dst = $(root, 'd' + i);
      dst.style.transform = '';
      const a = src.getBoundingClientRect(), b = dst.getBoundingClientRect();
      const t = clamp((f - 0.08 - 0.16 * (i - 1)) / 0.3), u = ease(t);
      dst.style.transform = `translate(${((a.left - b.left) / k * (1 - u)).toFixed(1)}px,${((a.top - b.top) / k * (1 - u)).toFixed(1)}px)`;
      dst.style.opacity = t > 0 ? 1 : 0;
      src.style.textShadow = t > 0 && t < 1 ? `0 0 ${(10 * Math.sin(Math.PI * t)).toFixed(1)}px` : '';
    }
  }
};

// ML ellipse (divide by n) and the unbiased one (divide by n - 1 = 3): 4/3 K_mle.
FIGS.bias = {
  duration: 1000,
  init(root) {
    const svg = newSvg(root, 480, 440), B = FP;
    fourBase(root, svg, B);
    el(svg, 'path', { d: fitEllipse(B, 1), fill: C.mle, 'fill-opacity': 0.08, stroke: C.mle, 'stroke-width': 3 });
    el(svg, 'path', { class: 'unb', d: covEllipse(B, 2, 4 / 3, 2, 1, FC[0], FC[1]), fill: 'none', stroke: C.teal, 'stroke-width': 3, 'stroke-dasharray': '9 6' });
    el(svg, 'circle', { cx: B.X(FC[0]), cy: B.Y(FC[1]), r: 8, fill: C.mle, stroke: '#fff', 'stroke-width': 1.5 });
    // leaders: ML to its bottom-right minor-axis point, unbiased to its top-left one
    el(svg, 'line', { x1: B.X(3), y1: B.Y(-0.55), x2: B.X(2.5), y2: B.Y(0.5), stroke: C.mle, 'stroke-width': 1.2 });
    el(svg, 'line', { class: 'ul', x1: B.X(0.6), y1: B.Y(2.75), x2: B.X(2 - Math.sqrt(1 / 3)), y2: B.Y(1 + Math.sqrt(1 / 3)), stroke: C.teal, 'stroke-width': 1.2 });
    label(root, 'xb', '$\\bar\\bx$', B.X(FC[0]) + 12, B.Y(FC[1]) + 2, 'tl', '#555');
    label(root, 'ml', 'divide by $n$', B.X(3) - 20, B.Y(-0.55) + 2, 'tl', C.mle);
  },
  render(root, p) {
    attr($(root, 'unb'), { opacity: p.u }); attr($(root, 'ul'), { opacity: p.u });
    label(root, 'un', 'divide by $n-1$', FP.X(0.6), FP.Y(2.75) - 4, 'b', C.teal, p.u);
  }
};

// ---------------------------------------------------------------- Bayesian mean
const BY = box2d(60, 20, 460, 460, -2.6, 4.6, -2.6, 4.6);
function bayesBase(root, svg, B) {
  axesBox(root, svg, B, { xt: [2, 4], yt: [2, 4], names: ['$\\theta_1$', '$\\theta_2$'] });
  el(svg, 'line', { x1: B.X(0), y1: B.Y(0), x2: B.X(2), y2: B.Y(2), stroke: '#888', 'stroke-width': 1.8, 'stroke-dasharray': '6 5' });
  el(svg, 'path', { d: covEllipse(B, 1, 0, 4), fill: C.prior, 'fill-opacity': 0.07, stroke: C.prior, 'stroke-width': 3 });
  el(svg, 'circle', { cx: B.X(0), cy: B.Y(0), r: 7, fill: C.prior, stroke: '#fff', 'stroke-width': 1.5 });
  el(svg, 'path', { class: 'dat', fill: C.like, 'fill-opacity': 0.07, stroke: C.like, 'stroke-width': 3 });
  el(svg, 'circle', { cx: B.X(2), cy: B.Y(2), r: 7, fill: C.like, stroke: '#fff', 'stroke-width': 1.5 });
  el(svg, 'path', { class: 'trail', fill: 'none', stroke: C.post, 'stroke-width': 2.5, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round' });
  el(svg, 'path', { class: 'post', fill: C.post, 'fill-opacity': 0.1, stroke: C.post, 'stroke-width': 3.5 });
  el(svg, 'circle', { class: 'pc', r: 8, fill: C.post, stroke: '#fff', 'stroke-width': 1.5 });
  label(root, 'pr', 'prior', B.X(0) - 12, B.Y(-2) - 12, 'r', C.prior);
}
// Posterior with prior N(0, diag(1,4)) and data precision diag(wn/4, wn), data mean (2,2).
function post2(prec1, prec2) {
  const p1 = 1 + prec1, p2 = 0.25 + prec2;
  return { m1: prec1 * 2 / p1, m2: prec2 * 2 / p2, v1: 1 / p1, v2: 1 / p2 };
}
function drawPost(root, B, q, trail, show) {
  attr($(root, 'post'), { d: covEllipse(B, q.v1, 0, q.v2, 1, q.m1, q.m2), opacity: show });
  attr($(root, 'pc'), { cx: B.X(q.m1), cy: B.Y(q.m2), opacity: show });
  attr($(root, 'trail'), { d: pathOf(trail.map(([a, b]) => [B.X(a), B.Y(b)])), opacity: show });
}
FIGS.bayes = {
  duration: 2200,
  init(root) {
    const svg = newSvg(root, 580, 520), B = BY;
    bayesBase(root, svg, B);
    attr($(root, 'dat'), { d: covEllipse(B, 4, 0, 1, 1, 2, 2) });
    label(root, 'dm', 'data mean', B.X(2), B.Y(3) - 6, 'b', C.like);
  },
  render(root, p) {
    const B = BY, w = p.w, tr = [];
    for (let i = 0; i <= 60; i++) { const u = w * i / 60, q = post2(u / 4, u); tr.push([q.m1, q.m2]); }
    const q = post2(w / 4, w), on = clamp(w * 4);
    drawPost(root, B, q, tr, on);
    label(root, 'po', 'posterior', B.X(q.m1) + 12, B.Y(q.m2 + Math.sqrt(q.v2)) - 6, 'bl', C.post, clamp((w - 0.8) / 0.2));
  }
};
FIGS.bayesn = {
  duration: 1600,
  init(root) {
    const svg = newSvg(root, 580, 520), B = BY;
    bayesBase(root, svg, B);
  },
  render(root, p) {
    const B = BY, n = p.n, tr = [];
    for (let i = 0; i <= 80; i++) { const m = 1 + (n - 1) * i / 80, q = post2(m / 4, m); tr.push([q.m1, q.m2]); }
    const q = post2(n / 4, n);
    attr($(root, 'dat'), { d: covEllipse(B, 4 / n, 0, 1 / n, 1, 2, 2) });
    drawPost(root, B, q, tr, 1);
    label(root, 'dm', 'data mean, $\\mK/n$', B.X(2), B.Y(2 + 1 / Math.sqrt(n)) - 6, 'b', C.like);
    label(root, 'nn', `$n=${fmt(n, 0)}$: $\\hat\\btheta_n=(${fmt(q.m1)},\\,${fmt(q.m2)})^T$`, B.X(4.6), B.Y(-2.5), 'br', C.post);
  }
};

// ---------------------------------------------------------------- pilot figures (30-3-conditioning), unchanged
// Conditioning slides: the cloud with a vertical slice at x2, and the conditional
// density of X1 on a side axis that shares the cloud's vertical x1 scale.
const CP = frame2d(34, 30, 390, 3.2), SX0 = CP.X(3.2) + 44, SW = 165;   // density 1.0 = SW px
FIGS.cond = {
  init(root) {
    const svg = newSvg(root, 760, 480), P = CP, R = P.R;
    axes(root, svg, P);
    cloud(svg);
    el(svg, 'path', { class: 'ct1', fill: 'none', stroke: C.prior, 'stroke-width': 2 });
    el(svg, 'path', { class: 'ct2', fill: 'none', stroke: C.prior, 'stroke-width': 2 });
    el(svg, 'line', { class: 'slice', y1: P.Y(-R), y2: P.Y(R), stroke: C.like, 'stroke-width': 3.5 });
    el(svg, 'line', { class: 'guide', stroke: C.post, 'stroke-width': 1.5, 'stroke-dasharray': '6 5' });
    el(svg, 'circle', { class: 'dot', r: 7, fill: C.post, stroke: '#fff', 'stroke-width': 1.5 });
    // side axis
    const g = el(svg, 'g');
    el(g, 'line', { x1: SX0, x2: SX0, y1: P.Y(-R), y2: P.Y(R), stroke: C.axis, 'stroke-width': 1.5 });
    arrow(g, SX0, P.Y(-R), SX0 + SW + 26, P.Y(-R), C.axis);
    for (const v of [0.5, 1]) {
      el(g, 'line', { x1: SX0 + v * SW, x2: SX0 + v * SW, y1: P.Y(-R), y2: P.Y(-R) + 6, stroke: C.axis });
      el(g, 'text', { x: SX0 + v * SW, y: P.Y(-R) + 24, 'text-anchor': 'middle', 'font-size': 16, fill: '#555' }).textContent = v;
    }
    let d = '';
    for (let i = 0; i <= 160; i++) { const t = -R + 2 * R * i / 160; d += (i ? 'L' : 'M') + (SX0 + phi(t, 0, 1) * SW).toFixed(1) + ',' + P.Y(t).toFixed(1); }
    el(svg, 'path', { d, fill: 'none', stroke: C.prior, 'stroke-width': 2.5, 'stroke-dasharray': '8 6' });
    el(svg, 'path', { class: 'cfill', fill: C.post, 'fill-opacity': 0.15, stroke: 'none' });
    el(svg, 'path', { class: 'cline', fill: 'none', stroke: C.post, 'stroke-width': 3 });
    el(svg, 'line', { class: 'lead', stroke: C.prior, 'stroke-width': 1.2 });
    label(root, 'dens', 'density', SX0 + SW + 32, P.Y(-R), 'l', '#444');
  },
  render(root, p) {
    const P = CP, R = P.R, m = p.rho * p.x2, v = 1 - p.rho * p.rho;
    placeCloud(root, P, p.rho, p.x2);
    attr($(root, 'ct1'), { d: ellipse(P, p.rho, 1) });
    attr($(root, 'ct2'), { d: ellipse(P, p.rho, 2) });
    attr($(root, 'slice'), { x1: P.X(p.x2), x2: P.X(p.x2) });
    attr($(root, 'dot'), { cx: P.X(p.x2), cy: P.Y(m) });
    const peak = SX0 + phi(m, m, v) * SW;
    attr($(root, 'guide'), { x1: P.X(p.x2), y1: P.Y(m), x2: peak, y2: P.Y(m) });
    let d = '';
    for (let i = 0; i <= 200; i++) { const t = -R + 2 * R * i / 200; d += (i ? 'L' : 'M') + (SX0 + phi(t, m, v) * SW).toFixed(1) + ',' + P.Y(t).toFixed(1); }
    attr($(root, 'cline'), { d });
    attr($(root, 'cfill'), { d: `M${SX0},${P.Y(-R)}` + d.replace(/^M/, 'L') + `L${SX0},${P.Y(R)}Z` });
    label(root, 'slice', `$x_2=${fmt(p.x2)}$`, P.X(p.x2), P.Y(-R) + 8, 't', C.like);
    label(root, 'cond', `<span class="cap">conditional</span><br>$\\mathcal N(${fmt(m)},\\,${fmt(v)})$`,
      peak + 12, P.Y(m), 'l', C.post);
    // The marginal's label sits on the side away from the conditional's peak.
    const side = m > -0.25 ? -1 : 1, fade = clamp(Math.abs(m + 0.25) / 0.2);
    const ty = P.Y(side * 2.35), cx = SX0 + phi(1.6, 0, 1) * SW, cy = P.Y(side * 1.6);
    attr($(root, 'lead'), { x1: SX0 + 62, y1: ty, x2: cx, y2: cy, opacity: fade });
    label(root, 'marg', '<span class="cap">marginal</span> $\\mathcal N(0,1)$', SX0 + 66, ty, 'l', C.prior, fade);
  }
};

// The conditional mean leaves a trail as x2 sweeps from -2.5.
const TP = frame2d(34, 30, 520, 3.2), TRHO = 0.5, TS = Math.sqrt(1 - TRHO * TRHO), TX0 = -2.5;
FIGS.trace = {
  enter: { x2: -2.5 },
  duration: 1100,
  init(root) {
    const svg = newSvg(root, 700, 600), P = TP;
    axes(root, svg, P);
    cloud(svg);
    placeCloud(root, P, TRHO);
    root.querySelectorAll('.pt').forEach(c => attr(c, { 'fill-opacity': 0.22 }));
    el(svg, 'path', { d: ellipse(P, TRHO, 1), fill: 'none', stroke: C.prior, 'stroke-width': 2, 'stroke-opacity': 0.7 });
    el(svg, 'path', { d: ellipse(P, TRHO, 2), fill: 'none', stroke: C.prior, 'stroke-width': 2, 'stroke-opacity': 0.7 });
    el(svg, 'path', { class: 'band', fill: C.post, 'fill-opacity': 0.14, stroke: 'none' });
    el(svg, 'line', { class: 'slice', y1: P.Y(-P.R), y2: P.Y(P.R), stroke: C.like, 'stroke-width': 3.5 });
    el(svg, 'line', { class: 'trail', stroke: C.post, 'stroke-width': 4, 'stroke-linecap': 'round' });
    el(svg, 'circle', { class: 'dot', r: 8, fill: C.post, stroke: '#fff', 'stroke-width': 1.5 });
    const g = el(svg, 'g', { class: 'bar' });
    const bx = P.X(2.5) + 16, top = P.Y(TRHO * 2.5 + TS), bot = P.Y(TRHO * 2.5 - TS);
    el(g, 'line', { x1: bx, x2: bx, y1: top, y2: bot, stroke: C.post, 'stroke-width': 2 });
    for (const y of [top, bot]) el(g, 'line', { x1: bx - 6, x2: bx + 6, y1: y, y2: y, stroke: C.post, 'stroke-width': 2 });
  },
  render(root, p) {
    const P = TP, x = p.x2, fin = p.fin;
    let up = '', lo = '';
    for (let i = 0; i <= 60; i++) {
      const t = TX0 + (x - TX0) * i / 60;
      up += (i ? 'L' : 'M') + P.X(t).toFixed(1) + ',' + P.Y(TRHO * t + TS).toFixed(1);
      lo = 'L' + P.X(t).toFixed(1) + ',' + P.Y(TRHO * t - TS).toFixed(1) + lo;
    }
    attr($(root, 'band'), { d: up + lo + 'Z' });
    attr($(root, 'trail'), { x1: P.X(TX0), y1: P.Y(TRHO * TX0), x2: P.X(x), y2: P.Y(TRHO * x) });
    attr($(root, 'slice'), { x1: P.X(x), x2: P.X(x), opacity: 1 - fin });
    attr($(root, 'dot'), { cx: P.X(x), cy: P.Y(TRHO * x), opacity: 1 - fin });
    attr($(root, 'bar'), { opacity: fin });
    label(root, 'slice', `$x_2=${fmt(x)}$`, P.X(x), P.Y(-P.R) + 8, 't', C.like, 1 - fin);
    label(root, 'line', '$\\E[X_1\\mid X_2=x_2]=\\rho x_2$', P.X(2.5) + 4, P.Y(TRHO * 2.5 + TS) - 10, 'br', C.post, fin);
    label(root, 'band', '$\\pm0.866$', P.X(2.5) + 28, P.Y(TRHO * 2.5), 'l', C.post, fin);
  }
};

// Reverse the prediction on a denser sample (1500 points, seed 7, bands of half-width
// 0.2: the x2 ~ 2 band averages x1 = 1.13 and the x1 ~ 1 band x2 = 0.52).  Highlight
// the band x2 ~ 2, mark E[X1 | X2 = 2] = 1; then the band x1 ~ 1 and E[X2 | X1 = 1] = 0.5.
const RP = frame2d(96, 30, 460, 3.2), RPTS = normals(7, 1500), RB = 0.2;
FIGS.rev = {
  duration: 1200,
  init(root) {
    const svg = newSvg(root, 700, 540), P = RP, R = P.R;
    axes(root, svg, P);
    const g = el(svg, 'g');
    RPTS.forEach(([z, w]) => {
      const x2 = z, x1 = 0.5 * z + S75 * w;
      if (Math.abs(x1) < R && Math.abs(x2) < R) el(g, 'circle', { class: 'rp', cx: P.X(x2), cy: P.Y(x1), r: 2.2, 'data-a': +(Math.abs(x2 - 2) < RB), 'data-b': +(Math.abs(x1 - 1) < RB) });
    });
    el(svg, 'path', { d: ellipse(P, 0.5, 1), fill: 'none', stroke: C.prior, 'stroke-width': 2, 'stroke-opacity': 0.7 });
    el(svg, 'path', { d: ellipse(P, 0.5, 2), fill: 'none', stroke: C.prior, 'stroke-width': 2, 'stroke-opacity': 0.7 });
    el(svg, 'line', { class: 'vs', x1: P.X(2), x2: P.X(2), y1: P.Y(-R), y2: P.Y(R), stroke: C.like, 'stroke-width': 3 });
    el(svg, 'line', { class: 'hs', x1: P.X(-R), x2: P.X(R), y1: P.Y(1), y2: P.Y(1), stroke: C.like, 'stroke-width': 3 });
    el(svg, 'line', { class: 'l1', stroke: C.post, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    el(svg, 'line', { class: 'l2', stroke: C.postC, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    el(svg, 'circle', { class: 'd1', cx: P.X(2), cy: P.Y(1), r: 8, fill: C.post, stroke: '#fff', 'stroke-width': 1.5 });
    el(svg, 'circle', { class: 'd2', cx: P.X(0.5), cy: P.Y(1), r: 8, fill: C.postC, stroke: '#fff', 'stroke-width': 1.5 });
  },
  render(root, p) {
    const P = RP, R = P.R, a = clamp(2 * p.L), b = clamp(2 * p.L - 1);
    const hb = p.hb ?? 0, hv = p.v * (1 - hb), hh = hb;   // band weights: the x2 band fades as the x1 band lights up
    root.querySelectorAll('.rp').forEach(c => {
      const t = Math.max(+c.dataset.a * hv, +c.dataset.b * hh);
      attr(c, { fill: t > 0.5 ? C.teal : C.prior, 'fill-opacity': (0.2 + 0.75 * t).toFixed(2), r: (2.2 + 1.2 * t).toFixed(2) });
    });
    attr($(root, 'vs'), { opacity: p.v });
    attr($(root, 'hs'), { opacity: p.h });
    attr($(root, 'd1'), { opacity: p.d1 });
    attr($(root, 'd2'), { opacity: p.d2 });
    label(root, 'vs', '$x_2=2$', P.X(2), P.Y(-R) + 8, 't', C.like, p.v);
    label(root, 'hs', '$x_1=1$', P.X(-R) - 8, P.Y(1), 'r', C.like, p.h);
    // red: x1 = 0.5 x2 from (-R, -R/2); amber: x1 = 2 x2 from (-R/2, -R)
    attr($(root, 'l1'), { x1: P.X(-R), y1: P.Y(-R / 2), x2: P.X(-R + 2 * R * a), y2: P.Y(-R / 2 + R * a), opacity: a > 0 ? 1 : 0 });
    attr($(root, 'l2'), { x1: P.X(-R / 2), y1: P.Y(-R), x2: P.X(-R / 2 + R * b), y2: P.Y(-R + 2 * R * b), opacity: b > 0 ? 1 : 0 });
    label(root, 'l1', '$x_1=0.5\\,x_2$', P.X(R) + 8, P.Y(R / 2), 'l', C.post, clamp((a - 0.8) / 0.2));
    label(root, 'l2', '$x_2=0.5\\,x_1$', P.X(R / 2), P.Y(R) - 6, 'b', C.postC, clamp((b - 0.8) / 0.2));
  }
};

// Mother (horizontal) and son (vertical) heights in cm: the two conditional-mean
// lines and the SD line, all through the means (163, 177).
const MS = { mm: 163, sm: 6, ms: 177, ss: 7, rho: 0.5 },
  MB = box2d(62, 40, 360, 396, 144, 184, 156, 200);
const msSon = m => MS.ms + MS.rho * MS.ss / MS.sm * (m - MS.mm);     // E[S | M=m]
const msMom = s => MS.mm + MS.rho * MS.sm / MS.ss * (s - MS.ms);     // E[M | S=s]
FIGS.ms = {
  duration: 1200,
  init(root) {
    const svg = newSvg(root, 565, 480), B = MB;
    axesBox(root, svg, B, { step: 10, ox: B.xlo, oy: B.ylo, xt: [150, 160, 170, 180],
      yt: [160, 170, 180, 190, 200], names: ['$m$', '$s$'] });
    const g = el(svg, 'g');
    PTS.forEach(([z, w]) => {
      const m = MS.mm + MS.sm * z, s = MS.ms + MS.ss * (MS.rho * z + S75 * w);
      if (m > B.xlo && m < B.xhi && s > B.ylo && s < B.yhi)
        el(g, 'circle', { cx: B.X(m), cy: B.Y(s), r: 2.6, fill: C.prior, 'fill-opacity': 0.25 });
    });
    const a = MS.sm ** 2, c = MS.ss ** 2, b = MS.rho * MS.sm * MS.ss;
    for (const r of [1, 2]) el(svg, 'path', { d: covEllipse(B, a, b, c, r, MS.mm, MS.ms), fill: 'none', stroke: C.prior, 'stroke-width': 2, 'stroke-opacity': 0.7 });
    // SD line s - 177 = (7/6)(m - 163), clipped to the box
    el(svg, 'line', { class: 'sdl', x1: B.X(MS.mm + (B.ylo - MS.ms) * MS.sm / MS.ss), y1: B.Y(B.ylo),
      x2: B.X(MS.mm + (B.yhi - MS.ms) * MS.sm / MS.ss), y2: B.Y(B.yhi), stroke: '#555', 'stroke-width': 2.5, 'stroke-dasharray': '8 6' });
    el(svg, 'line', { class: 'vs', x1: B.X(175), x2: B.X(175), y1: B.Y(B.ylo), y2: B.Y(B.yhi), stroke: C.like, 'stroke-width': 3 });
    el(svg, 'line', { class: 'hs', x1: B.X(B.xlo), x2: B.X(B.xhi), y1: B.Y(184), y2: B.Y(184), stroke: C.like, 'stroke-width': 3 });
    el(svg, 'line', { class: 'l1', stroke: C.post, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    el(svg, 'line', { class: 'l2', stroke: C.postC, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    el(svg, 'circle', { class: 'd1', cx: B.X(175), cy: B.Y(184), r: 8, fill: C.post, stroke: '#fff', 'stroke-width': 1.5 });
    el(svg, 'circle', { class: 'd2', cx: B.X(166), cy: B.Y(184), r: 8, fill: C.postC, stroke: '#fff', 'stroke-width': 1.5 });
    el(svg, 'circle', { cx: B.X(MS.mm), cy: B.Y(MS.ms), r: 4, fill: C.ink });
  },
  render(root, p) {
    const B = MB, a = clamp(p.L1), b = clamp(p.L2);
    const m1 = lerp(B.xlo, B.xhi, a), s2 = lerp(B.ylo, B.yhi, b);
    attr($(root, 'l1'), { x1: B.X(B.xlo), y1: B.Y(msSon(B.xlo)), x2: B.X(m1), y2: B.Y(msSon(m1)), opacity: a > 0 ? 1 : 0 });
    attr($(root, 'l2'), { x1: B.X(msMom(B.ylo)), y1: B.Y(B.ylo), x2: B.X(msMom(s2)), y2: B.Y(s2), opacity: b > 0 ? 1 : 0 });
    attr($(root, 'vs'), { opacity: clamp(3 * a) });
    attr($(root, 'd1'), { opacity: clamp((a - 0.75) / 0.15) });
    attr($(root, 'hs'), { opacity: clamp(3 * b) });
    attr($(root, 'd2'), { opacity: clamp((b - 0.6) / 0.15) });
    attr($(root, 'sdl'), { opacity: p.sd });
    label(root, 'vs', '$m=175$', B.X(175) - 6, B.Y(B.ylo) - 6, 'br', C.like, clamp(3 * a));
    label(root, 'hs', '$s=184$', B.X(B.xlo) + 6, B.Y(184) - 6, 'bl', C.like, clamp(3 * b));
    label(root, 'l1', '$\\E[S\\mid M=m]$', B.X(B.xhi) + 8, B.Y(msSon(B.xhi)), 'l', C.post, clamp((a - 0.8) / 0.2));
    label(root, 'l2', '$\\E[M\\mid S=s]$', B.X(msMom(B.yhi)), B.Y(B.yhi) - 6, 'b', C.postC, clamp((b - 0.8) / 0.2));
    label(root, 'sdl', 'SD line', B.X(MS.mm + (B.yhi - MS.ms) * MS.sm / MS.ss) + 8, B.Y(B.yhi), 'l', '#555', p.sd);
  }
};

// Terminology timeline: the least-squares thread (teal) and Galton's word (brown)
// meet at Yule 1897.
FIGS.terms = {
  init(root) {
    const svg = newSvg(root, 1150, 150), X = y => 60 + (y - 1800) * 10, A = 75;
    el(svg, 'line', { x1: X(1795), x2: X(1905), y1: A, y2: A, stroke: C.axis, 'stroke-width': 1.5 });
    for (const y of [1800, 1850, 1900]) {
      el(svg, 'line', { x1: X(y), x2: X(y), y1: A - 5, y2: A + 5, stroke: C.axis, 'stroke-width': 1.5 });
      el(svg, 'text', { x: X(y), y: A + 22, 'text-anchor': 'middle', 'font-size': 15, fill: '#777' }).textContent = y;
    }
    el(svg, 'path', { d: `M${X(1805)},${A - 18}L${X(1890)},${A - 18}L${X(1897)},${A}`, fill: 'none', stroke: C.teal, 'stroke-width': 4, 'stroke-linejoin': 'round' });
    el(svg, 'path', { d: `M${X(1877)},${A + 18}L${X(1890)},${A + 18}L${X(1897)},${A}`, fill: 'none', stroke: C.brown, 'stroke-width': 4, 'stroke-linejoin': 'round' });
    for (const y of [1805, 1809]) el(svg, 'circle', { cx: X(y), cy: A - 18, r: 7, fill: C.teal, stroke: '#fff', 'stroke-width': 1.5 });
    for (const y of [1877, 1886]) el(svg, 'circle', { cx: X(y), cy: A + 18, r: 7, fill: C.brown, stroke: '#fff', 'stroke-width': 1.5 });
    el(svg, 'circle', { cx: X(1897), cy: A, r: 9, fill: C.ink, stroke: '#fff', 'stroke-width': 1.5 });
    label(root, 'ls', 'Least squares: Legendre 1805, Gauss 1809', X(1805) - 8, A - 30, 'bl', C.teal);
    label(root, 'g77', 'Galton 1877, seeds: &ldquo;reversion&rdquo;', X(1877) + 8, A + 30, 'tr', C.brown);
    label(root, 'g86', 'Galton 1886, heights: &ldquo;regression&rdquo;', X(1886) - 8, A + 30, 'tl', C.brown);
    label(root, 'yule', 'Yule 1897: regression lines by least squares', X(1897) + 16, A - 30, 'br', C.ink);
  },
  render() {}
};

// Density of the running model against Mahalanobis distance: c exp(-Delta^2 / 2),
// c = 1 / (2 pi |K|^(1/2)), |K| = 0.75; the Delta = 1, 2 contours and points A, B marked.
const DPB = box2d(80, 20, 420, 300, 0, 4.6, 0, 0.2), DPC = 1 / (2 * Math.PI * Math.sqrt(0.75));
const dpf = D => DPC * Math.exp(-D * D / 2);
FIGS.dprof = {
  duration: 900,
  init(root) {
    const svg = newSvg(root, 560, 400), B = DPB, g = el(svg, 'g');
    for (const v of [0.05, 0.1, 0.15, 0.2]) el(g, 'line', { x1: B.X(0), x2: B.X(4.6), y1: B.Y(v), y2: B.Y(v), stroke: C.grid });
    arrow(g, B.X(0), B.Y(0), B.X(4.6) + 16, B.Y(0), C.axis);
    arrow(g, B.X(0), B.Y(0), B.X(0), B.Y(0.2) - 16, C.axis);
    for (const v of [0, 1, 2, 3, 4]) el(g, 'text', { x: B.X(v), y: B.Y(0) + 22, 'text-anchor': 'middle', 'font-size': 16, fill: '#555' }).textContent = v;
    for (const v of [0.05, 0.1, 0.15]) el(g, 'text', { x: B.X(0) - 8, y: B.Y(v) + 5, 'text-anchor': 'end', 'font-size': 16, fill: '#555' }).textContent = v;
    label(root, 'ax', '$\\Delta$', B.X(4.6) + 10, B.Y(0) + 8, 't', '#444');
    label(root, 'ay', 'density', B.X(0) + 8, B.Y(0.2) - 14, 'l', '#444');
    let d = '';
    for (let i = 0; i <= 200; i++) { const D = 4.6 * i / 200; d += (i ? 'L' : 'M') + B.X(D).toFixed(1) + ',' + B.Y(dpf(D)).toFixed(1); }
    el(svg, 'path', { d: d + `L${B.X(4.6)},${B.Y(0)}L${B.X(0)},${B.Y(0)}Z`, fill: C.prior, 'fill-opacity': 0.1, stroke: 'none' });
    el(svg, 'path', { d, fill: 'none', stroke: C.prior, 'stroke-width': 3 });
    for (const D of [1, 2]) {
      el(svg, 'line', { x1: B.X(D), x2: B.X(D), y1: B.Y(0), y2: B.Y(dpf(D)), stroke: C.prior, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' });
      label(root, 'c' + D, `$\\Delta=${D}$`, B.X(D) - 6, B.Y(dpf(D) / 2), 'r', C.prior);
    }
    el(svg, 'circle', { class: 'pa', cx: B.X(Math.sqrt(16 / 3)), cy: B.Y(dpf(Math.sqrt(16 / 3))), r: 7, fill: C.teal, stroke: '#fff', 'stroke-width': 1.5 });
    el(svg, 'circle', { class: 'pb', cx: B.X(4), cy: B.Y(dpf(4)), r: 7, fill: C.rose, stroke: '#fff', 'stroke-width': 1.5 });
    label(root, 'ttl', '$p_{\\bX}(\\bx)=\\frac{1}{2\\pi\\sqrt{0.75}}\\,e^{-\\Delta^2/2}$', B.X(2.3), B.Y(0.17), 'l', C.prior);
  },
  render(root, p) {
    const B = DPB;
    attr($(root, 'pa'), { opacity: p.ab }); attr($(root, 'pb'), { opacity: p.ab });
    label(root, 'la', 'A', B.X(Math.sqrt(16 / 3)) + 4, B.Y(dpf(Math.sqrt(16 / 3))) - 10, 'bl', C.teal, p.ab);
    label(root, 'lb', 'B', B.X(4), B.Y(dpf(4)) - 12, 'b', C.rose, p.ab);
  }
};

// ---------------------------------------------------------------- Summary icons
Object.assign(ICONS, {
  cov(svg) {
    el(svg, 'ellipse', { cx: 55, cy: 32, rx: 42, ry: 16, transform: 'rotate(-30 55 32)', fill: 'none', stroke: C.prior, 'stroke-width': 2.5 });
    el(svg, 'circle', { cx: 55, cy: 32, r: 4, fill: C.ink });
    el(svg, 'path', { d: vecD(55, 32, 84, 16, 9, 2.5), stroke: C.teal, fill: C.teal, 'stroke-width': 2.5, 'stroke-linejoin': 'round' });
  },
  maha(svg) {
    el(svg, 'ellipse', { cx: 55, cy: 32, rx: 42, ry: 16, transform: 'rotate(-30 55 32)', fill: 'none', stroke: C.prior, 'stroke-width': 2.5 });
    el(svg, 'circle', { cx: 80, cy: 18, r: 5, fill: C.teal });
    el(svg, 'circle', { cx: 38, cy: 8, r: 5, fill: C.rose });
  },
  slice(svg) {
    el(svg, 'ellipse', { cx: 50, cy: 32, rx: 40, ry: 17, transform: 'rotate(-30 50 32)', fill: 'none', stroke: C.prior, 'stroke-width': 2.5 });
    el(svg, 'line', { x1: 72, x2: 72, y1: 2, y2: 62, stroke: C.like, 'stroke-width': 3 });
    el(svg, 'circle', { cx: 72, cy: 22, r: 5, fill: C.post });
  },
  bayes(svg) {
    el(svg, 'ellipse', { cx: 22, cy: 38, rx: 10, ry: 20, fill: 'none', stroke: C.prior, 'stroke-width': 2.5 });
    el(svg, 'ellipse', { cx: 82, cy: 20, rx: 20, ry: 10, fill: 'none', stroke: C.like, 'stroke-width': 2.5 });
    el(svg, 'circle', { cx: 32, cy: 27, r: 9, fill: C.post, 'fill-opacity': 0.15, stroke: C.post, 'stroke-width': 2.5 });
  }
});
