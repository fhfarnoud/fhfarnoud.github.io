// Figures of the Chapter 4 deck.  Each FIGS entry draws from one parameter
// object (see ../shared/deck.js); x1 is horizontal and x2 vertical throughout.

Object.assign(MACROS, {
  '\\bX': '\\boldsymbol{X}', '\\bZ': '\\boldsymbol{Z}', '\\bY': '\\boldsymbol{Y}', '\\bx': '\\boldsymbol{x}',
  '\\bz': '\\boldsymbol{z}', '\\bq': '\\boldsymbol{q}', '\\bu': '\\boldsymbol{u}', '\\by': '\\boldsymbol{y}', '\\be': '\\boldsymbol{e}', '\\mU': '\\mathsf{U}', '\\ba': '\\boldsymbol{a}',
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
const MP = frame2d(40, 20, 470, 4.5), MX = [2, 1.5], M0 = 1, BV = [-3, 1];   // BV: the shift b, (x1, x2)
FIGS.mean = {
  duration: 1300, size: [580, 540],
  draw(g, p) {
    const P = g.plot(MP), at = (h, v) => [M0 + h + p.b * BV[0], M0 + v + p.b * BV[1]];   // shifted by b as p.b runs 0 -> 1
    P.axes({ grid: 4, ticks: [-4, -2, 2, 4] });
    P.cloud(PTS.map(([z, w]) => at(z, 0.5 * z + S75 * w)));
    const m = at(0, 0), x = at(...MX), bo = clamp(p.b * 4), moved = p.b > 0.5;
    P.vec([M0, M0], m, { color: '#666', w: 2, head: 12, gap: 9, dash: '6 5', opacity: bo });
    P.vec(m, x, { color: 'teal', gap: 8, opacity: p.mu });
    P.dot(x, { color: 'teal', opacity: p.mu });
    P.dot(m, { r: 8, opacity: p.mu });
    P.label('mu', moved ? '$\\bmu+\\bb$' : '$\\bmu$', m, moved ? 'tr' : 'tl', { dx: moved ? -12 : 12, dy: 6, opacity: p.mu });
    P.label('x', moved ? '$\\bx+\\bb$' : '$\\bx$', x, 'l', { dx: 12, color: 'teal', opacity: p.mu });
    P.label('dev', '$\\bx-\\bmu$', mid(m, x), 'tl', { dx: 12, dy: 6, color: 'teal', opacity: p.mu });
    P.label('b', '$\\bb$', mid([M0, M0], m), 't', { dy: 10, color: '#555', opacity: bo });
  }
};

// ---------------------------------------------------------------- quadrant products
const QP = frame2d(40, 20, 450, 3.2);
FIGS.quad = {
  duration: 2400, size: [560, 560],
  draw(g, p) {
    const P = g.plot(QP), R = QP.R, pts = corrPts(0.5), m = Math.round(p.k * pts.length);
    for (const [sx, sy] of [[1, 1], [-1, -1], [-1, 1], [1, -1]])
      P.rect([0, 0], [sx * R, sy * R], { color: sx * sy > 0 ? 'teal' : 'rose', fo: 0.1 * p.q, stroke: null });
    P.axes();
    // the first m points on the plot are coloured by the sign of x1 x2
    const pr = pts.map(([a, b]) => a * b), done = pr.slice(0, m), np = done.filter(v => v > 0).length, on = m > 0 ? 1 : 0;
    P.cloud(pts, { each: (i, [a, b]) => i < m && Math.abs(a) <= R && Math.abs(b) <= R
      ? { color: pr[i] > 0 ? 'teal' : 'rose', fo: 0.85, r: 3 } : null });
    for (const [k, x, y, pos] of [['s1', 2.6, 2.8, 1], ['s2', -2.6, -2.8, 1], ['s3', -2.6, 2.8, 0], ['s4', 2.6, -2.8, 0]])
      P.label(k, pos ? '$+$' : '$-$', [x, y], 'c', { color: pos ? 'teal' : 'rose', opacity: p.q });
    P.label('cnt', `products $x_1x_2$: <span style="color:${C.teal}">${np} positive</span>, <span style="color:${C.rose}">${m - np} negative</span>`,
      [-R, -R], 'tl', { dy: 34, color: '#333', opacity: on });
    P.label('avg', `average product: ${m ? fmt(done.reduce((s, v) => s + v, 0) / m) : ''}`, [-R, -R], 'tl', { dy: 66, color: '#333', opacity: on });
  }
};

// ---------------------------------------------------------------- die counts
// s = 0, 1, 2 fixes X1 = 6, 2, 10.  The other five counts are one illustrative
// draw given X1: the remaining 36 - X1 rolls land on faces 2 to 6 with
// probability 1/5 each, so their average is exactly (36 - X1)/5 (the amber line).
const DX1 = [6, 2, 10], DREST = [[5, 8, 8, 3, 6], [7, 6, 8, 3, 10], [7, 5, 4, 8, 2]];
const DB = box2d(70, 50, 440, 400, 0.4, 6.6, 0, 12);
FIGS.dice = {
  duration: 1000, size: [620, 520],
  draw(g, p) {
    const P = g.plot(DB), i0 = Math.min(Math.floor(p.s), 2), i1 = Math.min(i0 + 1, 2), u = p.s - i0;
    const x1 = lerp(DX1[i0], DX1[i1], u), rest = DREST[i0].map((v, j) => lerp(v, DREST[i1][j], u));
    const h = [x1, ...rest], faces = [1, 2, 3, 4, 5, 6], k = Math.round(x1);
    g.group({}, () => {
      for (let v = 0; v <= 12; v += 2) {
        P.line([0.4, v], [6.6, v], { color: C.grid, w: null });
        P.text([0.4, v], v, { anchor: 'end', dx: -8, dy: 5 });
      }
      P.line([0.4, 0], [6.6, 0], { color: C.axis });
      P.line([0.4, 0], [0.4, 12], { color: C.axis });
      for (const i of faces) P.text([i, 0], i, { dy: 22, size: 18, color: '#333' });
    });
    P.bars([1], [x1], { color: 'like' });
    P.bars(faces.slice(1), rest);
    P.line([0.4, 6], [6.6, 6], { w: 2, dash: '7 5' });
    P.line([1.5, (36 - x1) / 5], [6.6, (36 - x1) / 5], { color: 'postC', w: 3, dash: '10 6' });
    P.label('face', 'die face $i$', [3.5, 0], 't', { dy: 34, color: '#444' });
    P.label('cnt', 'count $X_i$', [0.4, 12], 'l', { dx: -50, dy: -26, color: '#444' });
    P.label('mean', '$\\E[X_i]=6$', [6.6, 6], 'l', { dx: 6 });
    h.forEach((v, j) => P.label('v' + j, '' + Math.round(v), [j + 1, v], 'b', { dy: -4, color: j ? 'prior' : 'like' }));
    P.label('batch', `$X_1=${k}$: faces 2 to 6 share $${36 - k}$ rolls,<br>on average $${fmt((36 - k) / 5, 1)}$ each`,
      [3.5, 12], 'b', { dy: -6, color: '#333' });
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
  duration: 1400, size: [560, 560],
  draw(g, p) {
    const P = g.plot(LP), R = LP.R, m = ([h, v]) => linMap(h, v, p.a, p.b);
    P.axes();
    P.cloud(PTS.map(m));
    for (const [r, w] of [[1, 2.5], [2, 2]])   // the images of the circles r = 1, 2
      P.param(t => m([r * Math.cos(t), r * Math.sin(t)]), { from: 0, to: 2 * Math.PI, n: 120, color: 'prior', w });
    const x = m(LDEV);
    P.vec([0, 0], x, { color: 'teal', gap: 8 });
    P.dot(x, { color: 'teal' });
    // Covariance of the mapped cloud, M M^T, shown in (x1, x2) order.
    const sx = lerp(1, Math.sqrt(1.5), p.a), sy = lerp(1, Math.sqrt(0.5), p.a), t = p.b * Math.PI / 4;
    const c = Math.cos(t), s = Math.sin(t);
    const hh = sx * sx * c * c + sy * sy * s * s, vv = sx * sx * s * s + sy * sy * c * c, hv = (sx * sx - sy * sy) * s * c;
    P.label('K', `$\\cov=\\begin{pmatrix}${fmt(hh)}&${fmt(hv)}\\\\${fmt(hv)}&${fmt(vv)}\\end{pmatrix}$`,
      [-R, R], 'tl', { dx: 8, dy: 8 });
    // The map in (x1, x2) order: x1' = sx c x1 - sy s x2, x2' = sx s x1 + sy c x2.
    P.label('A', `$\\mA=\\begin{pmatrix}${fmt(sx * c)}&${fmt(-sy * s)}\\\\${fmt(sx * s)}&${fmt(sy * c)}\\end{pmatrix}$`,
      [R, -R], 'br', { dx: -8, dy: -8, color: 'teal', opacity: clamp(4 * Math.max(p.a, p.b)) });
  }
};

// ---------------------------------------------------------------- prime and odd faces
// Pixel coordinates of a 440 x 300 layout, scaled by VK.  VE: the two ellipses (cx, cy,
// rx, ry); VLENS: their overlap, the arc of each inside the other, in angle order.
const VK = 1.2, VE = [[165, 140, 125, 105], [275, 140, 125, 105]].map(E => E.map(v => v * VK));
const VLENS = (() => {
  const inside = (E, x, y) => ((x - E[0]) / E[2]) ** 2 + ((y - E[1]) / E[3]) ** 2 <= 1, lens = [];
  for (let i = 0; i < 720; i++) {
    const t = i / 720 * 2 * Math.PI;
    for (const [E, F] of [[VE[0], VE[1]], [VE[1], VE[0]]]) {
      const x = E[0] + E[2] * Math.cos(t), y = E[1] + E[3] * Math.sin(t);
      if (inside(F, x, y)) lens.push([x, y]);
    }
  }
  return lens.sort((a, b) => Math.atan2(a[1] - 140 * VK, a[0] - 220 * VK) - Math.atan2(b[1] - 140 * VK, b[0] - 220 * VK));
})();
FIGS.venn = {
  size: [440 * VK, 300 * VK],
  draw(g, p) {
    VE.forEach(([cx, cy, rx, ry], j) => { const c = j ? C.brown : C.teal;
      g.el('ellipse', { cx, cy, rx, ry, fill: c, 'fill-opacity': 0.1, stroke: c, 'stroke-width': 2.5 }); });
    g.path(VLENS, { close: true, fill: 'postC', fo: 0.4 * (p.hl || 0), color: 'none', w: null });
    for (const [key, s, x, y] of [['f2', '2', 95, 140], ['f1', '1', 345, 140], ['f3', '3', 220, 105], ['f5', '5', 220, 175]])
      g.label(key, `$${s}$`, [x * VK, y * VK], 'c');
    g.label('pr', 'prime', [110 * VK, 22 * VK], 'c', { color: 'teal' });
    g.label('od', 'odd', [330 * VK, 22 * VK], 'c', { color: 'brown' });
    g.label('no', '$4$ and $6$ count in neither', [220 * VK, 272 * VK], 'c', { color: '#444' });
  }
};

// ---------------------------------------------------------------- projections
const PP = frame2d(30, 20, 370, 3.2), PD = box2d(470, 110, 250, 250, -4.5, 4.5, 0, 0.62);
FIGS.proj = {
  duration: 1300, size: [760, 440],
  draw(g, p) {
    const al = p.al * Math.PI / 180, sc = p.sc ?? 1, ch = Math.cos(al), cv = Math.sin(al);
    // The dashed line is a fixed ruler for a^T x, in the units of the density panel.  To keep
    // it fixed, the plane zooms in as |a| grows (range R0/|a|): the cloud spreads along the
    // ruler as the histogram widens.  The arrow keeps its size and shows the direction of a.
    const R = PP.R / sc, P = g.plot(frame2d(PP.x0, PP.y0, PP.S, R)), B = g.plot(PD), pts = corrPts(0.5);
    const tk = R > 2.5 ? 2 : R > 1.2 ? 1 : 0.5;
    P.axes({ grid: Math.floor(R), ticks: [tk, 2 * tk].filter(v => v < R - 0.3).flatMap(v => [-v, v]) });
    P.cloud(pts, { fo: 0.2 });
    P.ellipse(0.5, { so: 0.7 });
    P.ellipse(0.5, { r: 2, so: 0.7, opacity: R > 2.1 ? 1 : 0 });   // hidden once it no longer fits the zoomed plot
    P.line([-R * ch, -R * cv], [R * ch, R * cv], { dash: '7 5' });
    const t0 = 2 * ch, foot = [t0 * ch, t0 * cv], shown = 2 < R - 0.1 ? 1 : 0;   // the point (x1, x2) = (2, 0) and its foot on the line
    P.line([2, 0], foot, { color: 'brown', w: 2, dash: '4 4', opacity: shown });
    P.dot([2, 0], { r: 5, color: 'brown', outline: false, opacity: shown });
    P.dot(foot, { r: 5, color: 'brown', outline: false, opacity: shown });
    P.vec([0, 0], [ch / sc, cv / sc], { color: 'teal', w: 4 });   // the direction of a, a constant size on screen
    // the ruler (shown when p.ax): a^T x = v sits at distance v/|a|, a fixed place on screen
    const nh = -cv * 0.1 / sc, nv = ch * 0.1 / sc;
    [-3, -2, -1, 1, 2, 3].forEach((v, k) => {
      const tt = v / sc, on = p.ax ?? 0;
      P.line([tt * ch - nh, tt * cv - nv], [tt * ch + nh, tt * cv + nv], { w: 2, opacity: on });
      P.label('tl' + k, minus(v), [tt * ch + 2.6 * nh, tt * cv + 2.6 * nv], 'c', { opacity: on });
    });
    // density panel for a^T x
    g.group({}, () => {
      for (const v of [-4, -2, 0, 2, 4]) {
        g.line(B.px([v, 0]), [B.X(v), B.Y(0) + 6], { color: C.axis, w: null });
        B.text([v, 0], minus(v), { dy: 24 });
      }
      g.arrow(B.px([-4.5, 0]), [B.X(4.5) + 14, B.Y(0)]);
    });
    // histogram of a^T x over the 400 points
    const a1 = sc * ch, a2 = sc * cv, v = sc * sc * (1 + 0.5 * Math.sin(2 * al)), cnt = new Array(18).fill(0);
    pts.forEach(([x1, x2]) => { const b = Math.floor((a1 * x1 + a2 * x2 + 4.5) / 0.5); if (b >= 0 && b < 18) cnt[b]++; });
    cnt.forEach((c, i) => { const d = Math.min(c / (pts.length * 0.5), 0.62);
      g.el('rect', { x: B.X(-4.5 + 0.5 * i) + 1, width: B.X(0.5) - B.X(0) - 2, y: B.Y(d), height: B.Y(0) - B.Y(d), fill: C.prior, 'fill-opacity': 0.18 }); });
    B.curve(t => Math.min(phi(t, 0, v), 0.62), { n: 180, color: 'prior', w: 3 });
    P.label('a', p.ax ? '$\\ba/\\|\\ba\\|$' : '$\\ba$', [ch / (2 * sc), cv / (2 * sc)], 'c', { dx: (p.ax ? 34 : 20) * cv, dy: (p.ax ? 34 : 20) * ch, color: 'teal' });   // beside the arrow's middle, on the side away from the ticks
    B.label('px', '$\\ba^T\\bx$', [0, 0], 't', { dy: 40, color: '#444' });
    B.label('py', '<span class="cap">density; bars: the 400 dots</span>', [-4.5, 0.62], 'l', { dy: -60, color: '#555' });
    B.label('av', `$\\ba=(${fmt(a1)},\\,${fmt(a2)})^T$`, [-4.5, 0.62], 'l', { dy: -30, color: 'teal' });
    B.label('var', `$\\ba^T\\mK\\ba=${fmt(v)}$`, [0, Math.min(phi(0, 0, v), 0.62)], 'bl', { dx: 12, dy: -4, color: 'prior' });
  }
};

// ---------------------------------------------------------------- three tilts
FIGS.tilt3 = {
  size: [1110, 300],
  draw(g, p) {
    [-0.5, 0, 0.5].forEach((rho, j) => {
      const P = g.plot(frame2d(20 + j * 380, 10, 270, 3.2));
      g.group({}, () => {
        P.line([-3.2, 0], [3.2, 0], { color: C.axis, w: null });
        P.line([0, -3.2], [0, 3.2], { color: C.axis, w: null });
        corrPts(rho).forEach(q => P.dot(q, { r: 2, color: 'prior', fo: 0.3, outline: false }));
        P.ellipse(rho);
        P.ellipse(rho, { r: 2 });
      });
      P.label('n' + j, 'ABC'[j], [-3.2, 3.2], 'tl', { dx: -4, dy: 4 });
      P.label('x' + j, '$x_1$', [3.2, 0], 'l', { dx: 6, color: '#444' });
      P.label('y' + j, '$x_2$', [0, 3.2], 'tl', { dx: 6, dy: 2, color: '#444' });
      P.label('r' + j, `$\\rho=${rho}$`, [0, -3.2], 't', { dy: 6, color: 'post', opacity: p.rev });
    });
  }
};

// ---------------------------------------------------------------- rho sweeps, marginals fixed
// The marginals: X1's 34 px above the plot, X2's 30 px to its right, 180 px per unit of density.
const TL = frame2d(40, 120, 380, 3.2), TLT = box2d(TL.x0, TL.y0 - 34 - 180, TL.S, 180, -3.2, 3.2, 0, 1),
  TLS = box2d(TL.x0 + TL.S + 30, TL.y0, 180, TL.S, 0, 1, -3.2, 3.2);
FIGS.tilt = {
  duration: 1300, size: [640, 540],
  draw(g, p) {
    const P = g.plot(TL), R = TL.R, bell = P.steps({}, -R, R, 120).map(t => [t, phi(t, 0, 1)]);
    P.axes();
    P.cloud(corrPts(p.rho));
    P.ellipse(p.rho);
    P.ellipse(p.rho, { r: 2 });
    const st = { close: true, fill: 'prior', fo: 0.12, color: 'prior', w: 2.5 };
    g.plot(TLT).path([...bell, [R, 0], [-R, 0]], st);
    g.plot(TLS).path([...bell.map(([t, d]) => [d, t]), [0, -R], [0, R]], st);
    P.label('m1', '<span class="cap">marginal of $X_1$</span>', [R * 0.4, R], 'l', { dy: -80, color: 'prior' });
    P.label('m2', '<span class="cap">marginal of $X_2$</span>', [R, -R], 'tl', { dx: 40, dy: 14, color: 'prior' });
    P.label('mn', 'both $\\cN(0,1)$', [R, -R], 'tl', { dx: 40, dy: 40, color: 'prior' });
    P.label('K', `$\\mK=\\begin{pmatrix}1&${fmt(p.rho)}\\\\${fmt(p.rho)}&1\\end{pmatrix}$`, [-R, R], 'tl', { dx: 6, dy: 8 });
  }
};

// ---------------------------------------------------------------- distance from the mean, 1-D then 2-D
// d = 0: the 1-D density with x in standard deviations from the mean, marked at
// z = 0..3 with its value relative to the peak, e^{-z^2/2}; d = 1: the running
// model's Mahalanobis ellipses Delta = 1, 2, 3.
const G1 = box2d(40, 60, 470, 380, -3.6, 3.6, 0, 0.55), G2 = frame2d(40, 20, 470, 4.2);
FIGS.dist = {
  duration: 1200, size: [580, 540],
  draw(g, p) {
    const A = g.plot(G1), B = g.plot(G2), a = 1 - p.d, b = p.d, f = x => phi(x, 0, 1);
    A.density(f, { color: 'prior', opacity: a });
    g.arrow(A.px([-3.6, 0]), [A.X(3.6) + 16, A.Y(0)], { opacity: a });
    for (let k = -3; k <= 3; k++) {
      g.line([A.X(k), A.Y(0)], [A.X(k), A.Y(0) + 6], { color: C.axis, opacity: a });
      const s = k === 0 ? '\\mu' : `\\mu${k > 0 ? '+' : '-'}${Math.abs(k) > 1 ? Math.abs(k) : ''}\\sigma`;
      A.label('t' + k, `<span class="cap">$${s}$</span>`, [k, 0], 't', { dy: 10, color: '#555', opacity: a });
    }
    [0, 1, 2, 3].forEach(z => {
      A.line([z, 0], [z, f(z)], { color: 'prior', w: 1.5, dash: '6 5', opacity: a });
      A.dot([z, f(z)], { color: 'prior', r: 6, opacity: a });
      A.label('r' + z, ['$1$', '$0.61$', '$0.14$', '$0.011$'][z], [z, f(z)], 'bl', { dx: 7, dy: -7, color: 'prior', opacity: a });
    });
    A.label('xn', '$x$', [3.6, 0], 't', { dx: 10, dy: 8, color: '#444', opacity: a });
    A.label('rel', '<span class="cap">relative to the peak: $e^{-z^2/2}$</span>', [-3.6, 0.48], 'tl', { color: '#555', opacity: a });
    B.axes({ ticks: [], opacity: b });
    B.cloud(corrPts(0.5), { fo: 0.2, opacity: b });
    for (const r of [1, 2, 3]) {
      B.ellipse(0.5, { r, w: 2.5, opacity: b });
      B.label('D' + r, `$\\Delta=${r}$`, [r / 2, r], 'b', { dy: -3, color: 'prior', opacity: b });   // above the ellipse's highest point
    }
    B.dot([0, 0], { r: 6, opacity: b });
    B.label('mu', '$\\bmu$', [0, 0], 'tl', { dx: 8, dy: 4, opacity: b });
  }
};

// ---------------------------------------------------------------- a diagonal covariance
// K = diag(1.5^2, 0.5^2): the point x - mu = (1.5, 1) is one standard deviation
// out along x1 and two along x2, so Delta^2 = 1 + 4 = 5.
const DG = frame2d(40, 20, 470, 3.7), DGS = [1.5, 0.5], DGX = [1.5, 1];
FIGS.diag = {
  size: [580, 540],
  draw(g) {
    const P = g.plot(DG), K = [[DGS[0] ** 2, 0], [0, DGS[1] ** 2]], tk = { color: C.axis, w: 1.5 };
    P.axes({ ticks: [] });
    P.cloud(PTS.map(([z, w]) => [DGS[0] * z, DGS[1] * w]), { fo: 0.22 });
    for (const r of [1, 2]) {
      P.ellipse(K, { r });
      P.label('D' + r, `$\\Delta=${r}$`, [-r * DGS[0] * Math.SQRT1_2, -r * DGS[1] * Math.SQRT1_2], 'tr', { dx: -2, dy: 2, color: 'prior' });
    }
    // the axes in standard deviations: ticks at sigma and 2 sigma
    for (const k of [1, 2]) {
      g.line(P.px([k * DGS[0], 0]), [P.X(k * DGS[0]), P.Y(0) + 7], tk);
      g.line(P.px([0, k * DGS[1]]), [P.X(0) - 7, P.Y(k * DGS[1])], tk);
      P.label('tx' + k, `$${k > 1 ? k : ''}\\sigma_1$`, [k * DGS[0], 0], 'tl', { dx: 4, dy: 6, color: '#555' });
      P.label('ty' + k, `$${k > 1 ? k : ''}\\sigma_2$`, [0, k * DGS[1]], 'br', { dx: -6, dy: -3, color: '#555' });
    }
    P.line(DGX, [0, DGX[1]], { color: '#888', w: 1.5, dash: '5 4' });
    P.vec([0, 0], [DGX[0], 0], { color: 'teal', w: 3 });
    P.vec([DGX[0], 0], DGX, { color: 'brown', w: 3, head: 10, gap: 7 });
    P.dot([0, 0], { r: 6 });
    P.dot(DGX);
    P.label('x', '$\\bx$', DGX, 'bl', { dx: 8, dy: -6 });
    P.label('mu', '$\\bmu$', [0, 0], 'tr', { dx: -6, dy: 22 });
    P.label('d2', '$\\Delta^2=1^2+2^2=5$', [0.3, -3.1], 'l');
  }
};

// ---------------------------------------------------------------- principal directions
// th = 0: the diagonal covariance diag(1.5, 0.5); th = 1: the same picture turned
// by 45 degrees, which is the running model (eigenvectors (1,1)/sqrt2 and
// (-1,1)/sqrt2, eigenvalues 1.5 and 0.5).  The point has principal coordinates
// y = (1.5, 0.5), so Delta^2 = 1.5^2/1.5 + 0.5^2/0.5 = 2 in both states.
const PR = frame2d(40, 20, 470, 3.2), PY = [1.5, 0.5];
const PRPTS = corrPts(0.5).map(([a, b]) => [(a + b) / Math.SQRT2, (b - a) / Math.SQRT2]);   // the running cloud in principal coordinates
FIGS.princ = {
  duration: 1600, size: [580, 540],
  draw(g, p) {
    const P = g.plot(PR), R = PR.R, f = p.th * Math.PI / 4, c = Math.cos(f), s = Math.sin(f), on = p.th > 0.5;
    const rot = ([a, b]) => [a * c - b * s, a * s + b * c];
    const K = [[1.5 * c * c + 0.5 * s * s, s * c], [s * c, 1.5 * s * s + 0.5 * c * c]];
    P.axes({ ticks: [] });
    P.cloud(PRPTS.map(rot), { fo: 0.22 });
    P.line(rot([-R, 0]), rot([R, 0]), { color: '#888', dash: '6 5' });
    P.line(rot([0, -R]), rot([0, R]), { color: '#888', dash: '6 5' });
    for (const r of [1, 2]) P.ellipse(K, { r });
    const x = rot(PY), f1 = rot([PY[0], 0]);
    P.vec([0, 0], f1, { color: 'teal', w: 3 });
    P.vec(f1, x, { color: 'brown', w: 3, head: 10, gap: 7 });
    P.dot([0, 0], { r: 6 });
    P.dot(x);
    P.label('v1', on ? '$\\bu_1$: $\\lambda_1=1.5$' : '$\\sigma_1^2=1.5$', rot([2.7, 0]), on ? 'br' : 'b', { dy: -6, color: '#555' });
    P.label('v2', on ? '$\\bu_2$: $\\lambda_2=0.5$' : '$\\sigma_2^2=0.5$', rot([0, 2.3]), on ? 'tr' : 'l', { dx: on ? -4 : 8, dy: on ? 4 : 0, color: '#555' });
    P.label('c1', on ? '$y_1=1.5$' : '$x_1=1.5$', rot([0.9, 0]), 'tl', { dx: 4, dy: 6, color: 'teal' });
    P.label('c2', on ? '$y_2=0.5$' : '$x_2=0.5$', mid(f1, x), on ? 'l' : 'r', { dx: on ? 12 : -10, dy: on ? 4 : 0, color: 'brown' });
    P.label('x', '$\\bx$', x, 'bl', { dx: 8, dy: -6 });
    P.label('mu', '$\\bmu$', [0, 0], 'tr', { dx: -6, dy: 6 });
    P.label('d2', '$\\Delta^2=\\tfrac{1.5^2}{1.5}+\\tfrac{0.5^2}{0.5}=2$', [0.3, -2.7], 'l');
    P.label('turn', '<span class="cap">running model: the diagonal case turned by $45^\\circ$</span>', [-R, R], 'tl', { color: '#555', opacity: clamp((p.th - 0.8) / 0.2) });
  }
};

// ---------------------------------------------------------------- which point is more unusual
const HP = frame2d(40, 20, 470, 5.2), DA = Math.sqrt(16 / 3), DBd = 4;
FIGS.maha = {
  duration: 1400, size: [580, 540],
  draw(g, p) {
    const P = g.plot(HP), r = Math.max(p.r, 0.01), on = p.r > 0.01 ? 1 : 0;
    P.axes({ grid: 5, ticks: [-4, -2, 2, 4] });
    P.ellipse(0.5, { so: 0.8 });
    P.ellipse(0.5, { r: 2, so: 0.8 });
    P.dot([0, 0], { r: Math.sqrt(8) * HP.k, fill: 'none', stroke: '#777', w: 1.8, dash: '7 5' });
    P.ellipse(0.5, { r: r * DA, color: 'teal', fill: 'teal', fo: 0.06, w: 3, opacity: on });
    P.ellipse(0.5, { r: r * DBd, color: 'rose', fill: 'rose', fo: 0.05, w: 3, opacity: on });
    P.dot([2, 2], { r: 8, color: 'teal' });
    P.dot([-2, 2], { r: 8, color: 'rose' });
    P.label('A', 'A', [2, 2], 'bl', { dx: 12, dy: -6, color: 'teal' });
    P.label('B', 'B', [-2, 2], 'br', { dx: -12, dy: -6, color: 'rose' });
    P.label('eu', '<span class="cap">Euclidean distance $\\sqrt8$</span>', [0, -Math.sqrt(8)], 'tl', { dx: 6, dy: 4, color: '#555' });
  }
};

// ---------------------------------------------------------------- density contours
// ---------------------------------------------------------------- whitening
const WP = frame2d(40, 20, 470, 5.2);
function whiten(h, v, r, s) {
  const t = -r * Math.PI / 4, x = h * Math.cos(t) - v * Math.sin(t), y = h * Math.sin(t) + v * Math.cos(t);
  return [x * lerp(1, 1 / Math.sqrt(1.5), s), y * lerp(1, 1 / Math.sqrt(0.5), s)];
}
FIGS.white = {
  duration: 1500, size: [580, 540],
  draw(g, p) {
    const P = g.plot(WP), m = ([h, v]) => whiten(h, v, p.r, p.s), fade = clamp((p.s - 0.8) / 0.2);
    P.axes({ grid: 5, ticks: [-4, -2, 2, 4], names: p.s > 0.5 ? ['$z_1$', '$z_2$'] : ['$x_1$', '$x_2$'] });
    P.cloud(corrPts(0.5).map(m), { r: 2.4, fo: 0.25 });
    const ring = (r, st) => P.param(t => {   // Mahalanobis-r contour of the running model, mapped
      const u = r * Math.sqrt(1.5) * Math.cos(t), w = r * Math.sqrt(0.5) * Math.sin(t);
      return m([(u - w) / Math.SQRT2, (u + w) / Math.SQRT2]);
    }, Object.assign({ from: 0, to: 2 * Math.PI, n: 120 }, st));
    ring(1, { color: 'prior' });
    ring(2, { color: 'prior' });
    ring(DA, { color: 'teal', w: 3 });
    ring(DBd, { color: 'rose', w: 3 });
    const a = m([2, 2]), b = m([-2, 2]);
    P.dot(a, { r: 8, color: 'teal' });
    P.dot(b, { r: 8, color: 'rose' });
    P.label('A', 'A', a, 'bl', { dx: 10, dy: -8, color: 'teal' });
    P.label('B', 'B', b, 'br', { dx: -10, dy: -8, color: 'rose' });
    P.label('na', '$\\|\\bz_A\\|=2.31$', [2.4, -4.5], 'l', { color: 'teal', opacity: fade });
    P.label('nb', '$\\|\\bz_B\\|=4$', b, 'bl', { dx: 14, dy: -12, color: 'rose', opacity: fade });
  }
};

// ---------------------------------------------------------------- zero covariance
const ZG = frame2d(20, 10, 290, 3.2);
FIGS.zg = {
  duration: 1200, size: [560, 310],
  draw(g, p) {
    const P = g.plot(ZG), x = p.x * 2;   // the slice at x1 = 2x, so both panels move together
    P.axes();
    P.cloud(corrPts(0), { each: (i, [z]) => p.on && Math.abs(z - x) < 0.1 ? { color: 'post', fo: 0.95, r: 3.6 } : null });
    P.ellipse(0);
    P.ellipse(0, { r: 2 });
    P.line([x, -3.2], [x, 3.2], { color: 'like', w: 3.5, opacity: p.on });
    P.label('c', `$X_2\\mid X_1=${fmt(x, 1)}$<br>$\\sim\\cN(0,1)$`, [3.2, 1.4], 'l', { dx: 34, color: 'post', opacity: p.on });
    P.label('c2', '<span class="cap">the same for every $x_1$</span>', [3.2, 0.1], 'l', { dx: 34, color: 'post', opacity: p.on });
  }
};
const ZU = box2d(30, 20, 300, 250, -1.2, 1.2, -0.25, 1.25);
const ZX = (() => { const r = mulberry32(2026); return Array.from({ length: 70 }, () => 2 * r() - 1); })();
FIGS.zu = {
  duration: 1200, size: [560, 310],
  draw(g, p) {
    const P = g.plot(ZU);
    P.axes({ step: 0.5, xt: [-1, 1], yt: [1], names: ['$x$', '$y$'] });
    P.curve(x => x * x, { from: -1, to: 1, n: 80, color: 'prior', w: 2, so: 0.6 });
    ZX.forEach(x => P.dot([x, x * x], { r: 3.2, color: 'prior', fo: 0.45, outline: false }));
    P.line([p.x, -0.25], [p.x, 1.25], { color: 'like', w: 3.5, opacity: p.on });
    P.dot([p.x, p.x * p.x], { r: 8, color: 'post', opacity: p.on });
    P.label('c', `$Y\\mid X=${fmt(p.x, 1)}$<br>equals $${fmt(Math.round(p.x * 10) ** 2 / 100)}$`, [1.2, 0.85], 'l', { dx: 30, color: 'post', opacity: p.on });
    P.label('c2', '<span class="cap">exactly, with no spread</span>', [1.2, 0.5], 'l', { dx: 30, color: 'post', opacity: p.on });
  }
};

// ---------------------------------------------------------------- four samples (ML)
// Samples (x1, x2) = (1,-1), (1,1), (2,2), (4,2): mean (2, 1), K_mle = [[1.5, 1], [1, 1.5]].
const FP = box2d(50, 20, 380, 380, -0.5, 4.5, -1.5, 3.5), F4 = [[1, -1], [1, 1], [2, 2], [4, 2]];   // (x1, x2)
const FC = [2, 1];
function fourBase(P) {
  P.axes({ xt: [2, 4], yt: [2] });
  F4.forEach(q => P.dot(q, { r: 8, color: 'like' }));
}
const fitEllipse = (P, st) => P.ellipse([[1.5, 1], [1, 1.5]], Object.assign({ at: FC, color: 'mle', fill: 'mle', fo: 0.08, w: 3 }, st));
FIGS.mle4 = {
  duration: 1000, size: [480, 440],
  draw(g, p) {
    const P = g.plot(FP);
    fourBase(P);
    fitEllipse(P, { opacity: p.e });
    g.group({ opacity: p.c }, () => {
      F4.forEach(q => P.line(FC, q, { color: 'mle', w: 1.8, dash: '6 5' }));
      P.dot(FC, { r: 8, color: 'mle' });
    });
    P.label('xb', '$\\bar\\bx$', FC, 'tl', { dx: 12, dy: 2, color: '#555', opacity: p.c });
    P.label('cf', '<span class="cap">$\\Delta=1$ for $\\hat\\mK_{\\mle}$</span>', [2.75, 0.15], 'bl', { color: '#555', opacity: p.e });
  }
};
// Residual colours, shared with the text of the outer-product slide.
const RC = ['#087F80', '#B33362', '#A0521B', '#6A3D9A'];
FIGS.outer = {
  duration: 900, size: [480, 440],
  draw(g, p) {
    const P = g.plot(FP);
    fourBase(P);
    fitEllipse(P, { opacity: p.e });
    // residuals in (x1, x2), in the text's order
    [[-1, -2], [-1, 0], [0, 1], [2, 1]].forEach(([h, v], i) =>
      P.vec(FC, [FC[0] + h, FC[1] + v], { color: RC[i], gap: 9, opacity: clamp(p.k - i) }));
    P.dot(FC, { r: 8, color: 'mle' });
    P.label('xb', '$\\bar\\bx$', FC, 'tl', { dx: 14, dy: 4, color: '#555' });
    P.label('cf', '<span class="cap">$\\Delta=1$ for $\\hat\\mK_{\\mle}$</span>', [2.75, 0.15], 'bl', { color: '#555', opacity: p.e });
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
  duration: 1000, size: [480, 440],
  draw(g, p) {
    const P = g.plot(FP);
    fourBase(P);
    fitEllipse(P);
    P.ellipse([[2, 4 / 3], [4 / 3, 2]], { at: FC, color: 'teal', w: 3, dash: true, opacity: p.u });
    P.dot(FC, { r: 8, color: 'mle' });
    // leaders: ML to its bottom-right minor-axis point, unbiased to its top-left one
    P.line([3, -0.55], [2.5, 0.5], { color: 'mle', w: 1.2 });
    P.line([0.6, 2.75], [2 - Math.sqrt(1 / 3), 1 + Math.sqrt(1 / 3)], { color: 'teal', w: 1.2, opacity: p.u });
    P.label('xb', '$\\bar\\bx$', FC, 'tl', { dx: 12, dy: 2, color: '#555' });
    P.label('ml', 'divide by $n$', [3, -0.55], 'tl', { dx: -20, dy: 2, color: 'mle' });
    P.label('un', 'divide by $n-1$', [0.6, 2.75], 'b', { dy: -4, color: 'teal', opacity: p.u });
  }
};

// ---------------------------------------------------------------- Bayesian mean
const BY = box2d(60, 20, 460, 460, -2.6, 4.6, -2.6, 4.6);
// Posterior after data of weight u: prior N(0, diag(1,4)), data precision diag(u/4, u), data mean (2,2).
function post2(u) {
  const p1 = 1 + u / 4, p2 = 0.25 + u;
  return { m1: u / 4 * 2 / p1, m2: u * 2 / p2, v1: 1 / p1, v2: 1 / p2 };
}
// The prior, the data mean with covariance K, and the posterior at weight u1 (opacity on) with
// the trail of its mean from weight u0 in n steps; returns that posterior.
function bayesBase(P, K, u0, u1, n, on) {
  const q = post2(u1);
  P.axes({ xt: [2, 4], yt: [2, 4], names: ['$\\theta_1$', '$\\theta_2$'] });
  P.line([0, 0], [2, 2], { color: '#888', w: 1.8, dash: '6 5' });
  P.ellipse([[1, 0], [0, 4]], { fill: 'prior', fo: 0.07, w: 3 });
  P.dot([0, 0], { color: 'prior' });
  P.ellipse(K, { at: [2, 2], color: 'like', fill: 'like', fo: 0.07, w: 3 });
  P.dot([2, 2], { color: 'like' });
  P.path(P.steps({}, u0, u1, n).map(u => { const t = post2(u); return [t.m1, t.m2]; }),
    { color: 'post', w: 2.5, dash: '2 5', cap: 'round', opacity: on });
  P.ellipse([[q.v1, 0], [0, q.v2]], { at: [q.m1, q.m2], color: 'post', fill: 'post', fo: 0.1, w: 3.5, opacity: on });
  P.dot([q.m1, q.m2], { r: 8, color: 'post', opacity: on });
  P.label('pr', 'prior', [0, -2], 'tr', { dx: -6, dy: 6, color: 'prior' });
  return q;
}
FIGS.bayes = {
  duration: 2200, size: [580, 520],
  draw(g, p) {
    const P = g.plot(BY), q = bayesBase(P, [[4, 0], [0, 1]], 0, p.w, 60, clamp(p.w * 4));
    P.label('dm', 'data mean', [2, 3], 'b', { dy: -6, color: 'like' });
    P.label('po', 'posterior', [q.m1, q.m2 + Math.sqrt(q.v2)], 'br', { dx: -12, dy: -6, color: 'post', opacity: clamp((p.w - 0.8) / 0.2) });
  }
};
FIGS.bayesn = {
  duration: 1600, size: [580, 520],
  draw(g, p) {
    const P = g.plot(BY), n = p.n, q = bayesBase(P, [[4 / n, 0], [0, 1 / n]], 1, n, 80, 1);
    P.label('dm', 'data mean, $\\mK/n$', [2, 2 + 1 / Math.sqrt(n)], 'b', { dy: -6, color: 'like' });
    P.label('nn', `$n=${fmt(n, 0)}$: $\\hat\\btheta_n=(${fmt(q.m1)},\\,${fmt(q.m2)})^T$`, [4.6, -2.5], 'br', { color: 'post' });
  }
};

// ---------------------------------------------------------------- conditioning (from the 30-3-conditioning pilot)
// Conditioning slides: the cloud with a vertical slice at x1, and the conditional
// density of X2 on a side axis that shares the cloud's vertical x2 scale.
const CP = frame2d(34, 30, 390, 3.2), SX0 = CP.X(3.2) + 44, SW = 165;   // density 1.0 = SW px
const CS = box2d(SX0, CP.Y(3.2), SW, CP.S, 0, 1, -3.2, 3.2);   // the side axis: density across, x2 as in CP
FIGS.cond = {
  size: [760, 480],
  draw(g, p) {
    const P = g.plot(CP), S = g.plot(CS), R = CP.R, m = p.rho * p.x1, v = 1 - p.rho * p.rho, pk = phi(m, m, v);
    P.axes();
    P.cloud(corrPts(p.rho), { each: (i, [z]) => Math.abs(z - p.x1) < 0.1 ? { color: 'post', fo: 0.95, r: 3.6 } : null });
    P.ellipse(p.rho);
    P.ellipse(p.rho, { r: 2 });
    P.line([p.x1, -R], [p.x1, R], { color: 'like', w: 3.5 });
    g.line(P.px([p.x1, m]), [S.X(pk), P.Y(m)], { color: 'post', dash: '6 5' });
    P.dot([p.x1, m], { color: 'post' });
    g.group({}, () => {   // the side axis: density across, x2 shared with the cloud
      S.line([0, -R], [0, R], { color: C.axis });
      g.arrow(S.px([0, -R]), [S.X(1) + 26, S.Y(-R)]);
      for (const t of [0.5, 1]) {
        g.line([S.X(t), S.Y(-R)], [S.X(t), S.Y(-R) + 6], { color: C.axis, w: null });
        S.text([t, -R], t, { dy: 24 });
      }
    });
    S.param(t => [phi(t, 0, 1), t], { from: -R, to: R, n: 160, color: 'prior', w: 2.5, dash: '8 6' });
    const curve = S.steps({}, -R, R, 200).map(t => [phi(t, m, v), t]);
    S.path([[0, -R], ...curve, [0, R]], { close: true, fill: 'post', fo: 0.15, color: 'none', w: null });
    S.path(curve, { color: 'post', w: 3 });
    // the marginal's label sits on the side away from the conditional's peak
    const side = m > -0.25 ? -1 : 1, fade = clamp(Math.abs(m + 0.25) / 0.2);
    g.line([S.X(0) + 62, P.Y(side * 2.35)], S.px([phi(1.6, 0, 1), side * 1.6]), { color: 'prior', w: 1.2, opacity: fade });
    S.label('dens', 'density', [1, -R], 'l', { dx: 32, color: '#444' });
    P.label('slice', `$x_1=${fmt(p.x1)}$`, [p.x1, -R], 't', { dy: 8, color: 'like' });
    S.label('cond', `<span class="cap">conditional</span><br>$\\mathcal N(${fmt(m)},\\,${fmt(v)})$`, [pk, m], 'l', { dx: 12, color: 'post' });
    S.label('marg', '<span class="cap">marginal</span> $\\mathcal N(0,1)$', [0, side * 2.35], 'l', { dx: 66, color: 'prior', opacity: fade });
  }
};

// The conditional mean leaves a trail as x1 sweeps from -2.5.
const TP = frame2d(34, 30, 520, 3.2), TRHO = 0.5, TS = Math.sqrt(1 - TRHO * TRHO), TX0 = -2.5;
FIGS.trace = {
  enter: { x1: -2.5 },
  duration: 1100, size: [700, 600],
  draw(g, p) {
    const P = g.plot(TP), R = TP.R, x = p.x1, fin = p.fin;
    P.axes();
    P.cloud(corrPts(TRHO), { fo: 0.22 });
    P.ellipse(TRHO, { so: 0.7 });
    P.ellipse(TRHO, { r: 2, so: 0.7 });
    P.area(t => TRHO * t + TS, { from: TX0, to: x, n: 60, base: t => TRHO * t - TS, color: 'post', fo: 0.14 });
    P.line([x, -R], [x, R], { color: 'like', w: 3.5, opacity: 1 - fin });
    P.line([TX0, TRHO * TX0], [x, TRHO * x], { color: 'post', w: 4, cap: 'round' });
    P.dot([x, TRHO * x], { r: 8, color: 'post', opacity: 1 - fin });
    const bx = P.X(2.5) + 16, top = P.Y(TRHO * 2.5 + TS), bot = P.Y(TRHO * 2.5 - TS);   // the band's width at x1 = 2.5
    g.group({ opacity: fin }, () => {
      g.line([bx, top], [bx, bot], { color: 'post', w: 2 });
      for (const y of [top, bot]) g.line([bx - 6, y], [bx + 6, y], { color: 'post', w: 2 });
    });
    P.label('slice', `$x_1=${fmt(x)}$`, [x, -R], 't', { dy: 8, color: 'like', opacity: 1 - fin });
    P.label('line', '$\\E[X_2\\mid X_1=x_1]=\\rho x_1$', [2.5, TRHO * 2.5 + TS], 'br', { dx: 4, dy: -10, color: 'post', opacity: fin });
    P.label('band', '$\\pm0.866$', [2.5, TRHO * 2.5], 'l', { dx: 28, color: 'post', opacity: fin });
  }
};

// Reverse the prediction on a denser sample (1500 points, seed 7, bands of half-width
// 0.2: the x1 ~ 2 band averages x2 = 1.13 and the x2 ~ 1 band x1 = 0.52).  Highlight
// the band x1 ~ 2, mark E[X2 | X1 = 2] = 1; then the band x2 ~ 1 and E[X1 | X2 = 1] = 0.5.
const RP = frame2d(96, 30, 460, 3.2), RB = 0.2, RPTS = normals(7, 1500).map(([z, w]) => [z, 0.5 * z + S75 * w])
  .filter(([x1, x2]) => Math.abs(x1) < RP.R && Math.abs(x2) < RP.R);   // (x1, x2), those on the plot
FIGS.rev = {
  duration: 1200, size: [700, 540],
  draw(g, p) {
    const P = g.plot(RP), R = RP.R, a = clamp(2 * p.L), b = clamp(2 * p.L - 1);
    const hb = p.hb ?? 0, hv = p.v * (1 - hb), hh = hb;   // band weights: the x1 band fades as the x2 band lights up
    P.axes();
    P.cloud(RPTS, { each: (i, [x1, x2]) => {
      const t = Math.max((Math.abs(x1 - 2) < RB) * hv, (Math.abs(x2 - 1) < RB) * hh);
      return { color: t > 0.5 ? 'teal' : 'prior', fo: 0.2 + 0.75 * t, r: 2.2 + 1.2 * t };
    } });
    P.ellipse(0.5, { so: 0.7 });
    P.ellipse(0.5, { r: 2, so: 0.7 });
    P.line([2, -R], [2, R], { color: 'like', w: 3, opacity: p.v });
    P.line([-R, 1], [R, 1], { color: 'like', w: 3, opacity: p.h });
    // red: x2 = 0.5 x1 from (-R, -R/2); amber: x1 = 0.5 x2 from (-R/2, -R)
    P.line([-R, -R / 2], [-R + 2 * R * a, -R / 2 + R * a], { color: 'post', w: 3.5, cap: 'round', opacity: a > 0 ? 1 : 0 });
    P.line([-R / 2, -R], [-R / 2 + R * b, -R + 2 * R * b], { color: 'postC', w: 3.5, cap: 'round', opacity: b > 0 ? 1 : 0 });
    P.dot([2, 1], { r: 8, color: 'post', opacity: p.d1 });
    P.dot([0.5, 1], { r: 8, color: 'postC', opacity: p.d2 });
    P.label('vs', '$x_1=2$', [2, -R], 't', { dy: 8, color: 'like', opacity: p.v });
    P.label('hs', '$x_2=1$', [-R, 1], 'r', { dx: -8, color: 'like', opacity: p.h });
    P.label('l1', '$x_2=0.5\\,x_1$', [R, R / 2], 'l', { dx: 8, color: 'post', opacity: clamp((a - 0.8) / 0.2) });
    P.label('l2', '$x_1=0.5\\,x_2$', [R / 2, R], 'b', { dy: -6, color: 'postC', opacity: clamp((b - 0.8) / 0.2) });
  }
};

// Mother (horizontal) and daughter (vertical) heights in cm, the same distribution
// for both: the two conditional-mean lines and the SD line (the diagonal), all
// through the means (163, 163).
const MD = { mm: 163, sm: 6, dm: 163, sd: 6, rho: 0.5 },
  MB = box2d(62, 40, 360, 396, 144, 184, 142, 186);
const mdDau = m => MD.dm + MD.rho * MD.sd / MD.sm * (m - MD.mm);     // E[D | M=m]
const mdMom = d => MD.mm + MD.rho * MD.sm / MD.sd * (d - MD.dm);     // E[M | D=d]
const mdSD = m => MD.dm + (m - MD.mm) * MD.sd / MD.sm;               // SD line: d - 163 = m - 163
FIGS.ms = {
  duration: 1200, size: [565, 480],
  draw(g, p) {
    const P = g.plot(MB), B = MB, a = clamp(p.L1), b = clamp(p.L2);
    const m1 = lerp(B.xlo, B.xhi, a), d2 = lerp(B.ylo, B.yhi, b), c = MD.rho * MD.sm * MD.sd;
    P.axes({ step: 10, ox: B.xlo, oy: B.ylo, xt: [150, 160, 170, 180], yt: [150, 160, 170, 180], names: ['$m$', '$d$'] });
    P.cloud(corrPts(MD.rho).map(([z, x]) => [MD.mm + MD.sm * z, MD.dm + MD.sd * x])
      .filter(([m, d]) => m > B.xlo && m < B.xhi && d > B.ylo && d < B.yhi), { fo: 0.25 });
    for (const r of [1, 2]) P.ellipse([[MD.sm ** 2, c], [c, MD.sd ** 2]], { r, at: [MD.mm, MD.dm], so: 0.7 });
    P.line([B.xlo, mdSD(B.xlo)], [B.xhi, mdSD(B.xhi)], { color: '#555', w: 2.5, dash: '8 6', opacity: p.sd });
    P.line([175, B.ylo], [175, B.yhi], { color: 'like', w: 3, opacity: clamp(3 * a) });
    P.line([B.xlo, 169], [B.xhi, 169], { color: 'like', w: 3, opacity: clamp(3 * b) });
    P.line([B.xlo, mdDau(B.xlo)], [m1, mdDau(m1)], { color: 'post', w: 3.5, cap: 'round', opacity: a > 0 ? 1 : 0 });
    P.line([mdMom(B.ylo), B.ylo], [mdMom(d2), d2], { color: 'postC', w: 3.5, cap: 'round', opacity: b > 0 ? 1 : 0 });
    P.dot([175, 169], { r: 8, color: 'post', opacity: clamp((a - 0.75) / 0.15) });
    P.dot([166, 169], { r: 8, color: 'postC', opacity: clamp((b - 0.6) / 0.15) });
    P.dot([MD.mm, MD.dm], { r: 4, outline: false });
    P.label('vs', '$m=175$', [175, B.ylo], 'br', { dx: -6, dy: -6, color: 'like', opacity: clamp(3 * a) });
    P.label('hs', '$d=169$', [B.xlo, 169], 'bl', { dx: 6, dy: -6, color: 'like', opacity: clamp(3 * b) });
    P.label('l1', '$\\E[D\\mid M=m]$', [B.xhi, mdDau(B.xhi)], 'l', { dx: 8, color: 'post', opacity: clamp((a - 0.8) / 0.2) });
    P.label('l2', '$\\E[M\\mid D=d]$', [mdMom(B.yhi), B.yhi], 'b', { dy: -6, color: 'postC', opacity: clamp((b - 0.8) / 0.2) });
    P.label('sdl', 'SD line', [B.xhi, mdSD(B.xhi)], 'l', { dx: 8, color: '#555', opacity: p.sd });
  }
};

// Terminology timeline: the least-squares thread (teal) and Galton's word (brown)
// meet at Yule 1897.  Years across, 10 px each; vertically, px above the time axis.
const TMB = box2d(60, 0, 1000, 150, 1800, 1900, -75, 75);
FIGS.terms = {
  size: [1150, 150],
  draw(g) {
    const P = g.plot(TMB);
    P.line([1795, 0], [1905, 0], { color: C.axis });
    for (const y of [1800, 1850, 1900]) {
      P.line([y, 5], [y, -5], { color: C.axis });
      P.text([y, 0], y, { dy: 22, size: 15, color: '#777' });
    }
    P.path([[1805, 18], [1890, 18], [1897, 0]], { color: 'teal', w: 4, join: 'round' });
    P.path([[1877, -18], [1890, -18], [1897, 0]], { color: 'brown', w: 4, join: 'round' });
    for (const y of [1805, 1809]) P.dot([y, 18], { color: 'teal' });
    for (const y of [1877, 1886]) P.dot([y, -18], { color: 'brown' });
    P.dot([1897, 0], { r: 9 });
    P.label('ls', 'Least squares: Legendre 1805, Gauss 1809', [1805, 30], 'bl', { dx: -8, color: 'teal' });
    P.label('g77', 'Galton 1877, seeds: &ldquo;reversion&rdquo;', [1877, -30], 'tr', { dx: 8, color: 'brown' });
    P.label('g86', 'Galton 1886, heights: &ldquo;regression&rdquo;', [1886, -30], 'tl', { dx: -8, color: 'brown' });
    P.label('yule', 'Yule 1897: regression lines by least squares', [1897, 30], 'br', { dx: 16 });
  }
};

// Density of the running model against Mahalanobis distance: c exp(-Delta^2 / 2),
// c = 1 / (2 pi |K|^(1/2)), |K| = 0.75; the Delta = 1, 2 contours and points A, B marked.
const DPB = box2d(80, 20, 420, 300, 0, 4.6, 0, 0.2), DPC = 1 / (2 * Math.PI * Math.sqrt(0.75));
const dpf = D => DPC * Math.exp(-D * D / 2);
FIGS.dprof = {
  size: [560, 400],
  draw(g) {
    const P = g.plot(DPB);
    g.group({}, () => {
      for (const v of [0.05, 0.1, 0.15, 0.2]) P.line([0, v], [4.6, v], { color: C.grid, w: null });
      g.arrow(P.px([0, 0]), [P.X(4.6) + 16, P.Y(0)]);
      g.arrow(P.px([0, 0]), [P.X(0), P.Y(0.2) - 16]);
      for (const v of [0, 1, 2, 3, 4]) P.text([v, 0], v, { dy: 22 });
      for (const v of [0.05, 0.1, 0.15]) P.text([0, v], v, { anchor: 'end', dx: -8, dy: 5 });
    });
    P.label('ax', '$\\Delta$', [4.6, 0], 't', { dx: 10, dy: 8, color: '#444' });
    P.label('ay', 'density', [0, 0.2], 'l', { dx: 8, dy: -14, color: '#444' });
    P.path([...P.steps({}, 0, 4.6, 200).map(D => [D, dpf(D)]), [4.6, 0], [0, 0]], { close: true, fill: 'prior', fo: 0.1, color: 'none', w: null });
    P.curve(dpf, { color: 'prior', w: 3 });
    for (const D of [1, 2]) {
      P.line([D, 0], [D, dpf(D)], { color: 'prior', dash: '5 4' });
      P.label('c' + D, `$\\Delta=${D}$`, [D, dpf(D) / 2], 'r', { dx: -6, color: 'prior' });
    }
    P.label('ttl', '$p_{\\bX}(\\bx)=\\frac{1}{2\\pi\\sqrt{0.75}}\\,e^{-\\Delta^2/2}$', [2.3, 0.17], 'l', { color: 'prior' });
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
