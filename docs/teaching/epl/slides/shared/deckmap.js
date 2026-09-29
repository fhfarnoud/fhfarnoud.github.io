// The deck's mind map as a slide: the layout of the localtools viewer's
// slide map (ui_slidemap.py, D-129/D-130), drawn from thumbnails so that it
// prints and works on the web without the viewer.
//
// A map slide is <section data-slide="map"> holding
//   <div class="fig mapfig" data-fig="deckmap" data-init='{"a":A,"b":B,"t":1}'>
// The first map slide is the outline: it carries the (hidden) ol.toc whose
// links name the sections. Later map slides are transitions between sections
// and are not drawn on the map. The camera parameter t runs 0 -> 1 -> 2:
// section A (-1 = the title and the slides before the outline), the whole
// map, section B. A slide entered forward starts at t = 0 (FIGS.enter) and
// pulls back to the whole map; one click (data-set t:2) zooms into B.
//
// Layout as in the viewer: the title and the slides before the outline in a
// column; the sections in a row under the last of them, each head slide over
// a block of its slides read across and then down; every slide moved by its
// own data-map="dx,dy" plus its parent's. Thumbnails: img/thumbs/<n>.jpg,
// n the slide number, written by shared/make_thumbs.py from the built PDF.
(function () {
  const W = 1280, H = 720, VT = 420, VE = 1250, VK = 300, SG = 520, VG = 110, HG = 140;
  const PAL = ['#2354A8', '#008000', '#B30000', '#762A83', '#087F80', '#CC8800', '#B33362', '#A0521B'];
  const TRUNK = '#3b3a36';
  let M = null;

  const norm = t => String(t || '').replace(/\s+/g, ' ').trim();
  function readMap(s) {
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(s.getAttribute('data-map') || '');
    return m ? [+m[1], +m[2]] : null;
  }
  function wrap(label) {
    if (!label) return [];
    const lines = [''];
    label.split(' ').forEach(w => { const l = lines[lines.length - 1];
      if (l && (l + ' ' + w).length > 26) lines.push(w); else lines[lines.length - 1] = l ? l + ' ' + w : w; });
    return lines;
  }

  // The tree and every slide's place, from the deck as written (built once,
  // before reveal clones slides for printing).
  function model() {
    if (M) return M;
    const all = [...document.querySelectorAll('.slides > section')], n = all.length, ids = {};
    all.forEach((s, i) => { if (s.id) ids[s.id] = i; });
    const isMap = s => s.dataset.slide === 'map';
    const O = all.findIndex((s, i) => i > 0 && isMap(s));
    const labels = {}, starts = [];
    all[O].querySelectorAll('a[href^="#/"]').forEach(a => {
      const id = decodeURIComponent(a.getAttribute('href').slice(2));
      if (id in ids && !(ids[id] in labels)) { labels[ids[id]] = norm(a.textContent); starts.push(ids[id]); }
    });
    starts.sort((a, b) => a - b);
    const parent = all.map(() => -1), pre = [], heads = [], drawn = [0];
    for (let p = 1; p < O; p++) { pre.push(p); drawn.push(p); }
    const hub = pre.length ? pre[pre.length - 1] : 0;
    parent[O] = 0;
    let head = null;
    for (let j = 1; j < n; j++) {
      if (j < O) { parent[j] = j === 1 ? 0 : j - 1; continue; }
      if (j === O || isMap(all[j])) continue;
      drawn.push(j);
      if (starts.includes(j)) { head = { slide: j, label: labels[j], kids: [] }; heads.push(head); parent[j] = hub; continue; }
      if (!head) { head = { slide: -1, label: '', kids: [], lead: true }; heads.push(head); }
      head.kids.push(j); parent[j] = head.slide >= 0 ? head.slide : hub;
    }
    let k = 0;
    heads.forEach(h => { h.colour = h.lead ? '#8f8577' : PAL[(k++) % PAL.length]; h.num = h.lead ? 0 : k; });
    const colour = {};
    heads.forEach(h => { if (h.slide >= 0) colour[h.slide] = h.colour; h.kids.forEach(c => { colour[c] = h.colour; }); });

    // base places
    const b = all.map(() => [0, 0]);
    pre.forEach((i, q) => { b[i] = [0, (q + 1) * (H + VT)]; });
    const oy = pre.length * (H + VT); b[O] = [0, oy];
    const hy = oy + H + VE;
    const blocks = heads.map(h => {
      const kk = h.kids.length, cols = kk ? Math.max(1, Math.ceil(Math.sqrt(kk * 0.8))) : 1;
      const inner = cols * (W + HG) - HG;
      return { h, cols, w: Math.max(W, inner), inner };
    });
    let x = W / 2 - (blocks.reduce((a, bk) => a + bk.w + SG, 0) - SG) / 2;
    blocks.forEach(bk => {
      const h = bk.h, hx = x + (bk.w - W) / 2, ky = hy + (h.slide >= 0 ? H + VK : 0), kx = x + (bk.w - bk.inner) / 2;
      h.at = [hx, hy];
      if (h.slide >= 0) b[h.slide] = [hx, hy];
      h.kids.forEach((c, j) => { b[c] = [kx + (j % bk.cols) * (W + HG), ky + Math.floor(j / bk.cols) * (H + VG)]; });
      x += bk.w + SG;
    });
    // offsets: a slide's own plus its parent's
    const eff = [];
    const off = i => {
      if (eff[i]) return eff[i];
      const o = readMap(all[i]) || [0, 0], p = parent[i], po = p >= 0 ? off(p) : [0, 0];
      return (eff[i] = [o[0] + po[0], o[1] + po[1]]);
    };
    heads.forEach(h => { if (h.slide < 0) { const o = off(hub); h.at = [h.at[0] + o[0], h.at[1] + o[1]]; } });
    const pos = b.map((p, i) => { const o = off(i); return [p[0] + o[0], p[1] + o[1]]; });
    const thumbs = all.map((s, i) => `img/thumbs/${i + 1}.jpg`);
    return (M = { n, O, pre, hub, heads, colour, pos, drawn, thumbs });
  }

  // camera rectangles, in map units
  function boundsOf(ix, labels) {
    const m = model(), r = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    ix.forEach(i => { const p = m.pos[i];
      r.x0 = Math.min(r.x0, p[0]); r.y0 = Math.min(r.y0, p[1]); r.x1 = Math.max(r.x1, p[0] + W); r.y1 = Math.max(r.y1, p[1] + H); });
    if (labels) r.y0 -= 420;   // the branch labels above the sections
    return r;
  }
  function rectOf(g) {
    const m = model();
    if (g === 'all') return boundsOf(m.drawn, true);
    if (g < 0 || !m.heads[g]) return boundsOf([0].concat(m.pre), false);
    const h = m.heads[g];
    return boundsOf((h.slide >= 0 ? [h.slide] : []).concat(h.kids), true);
  }
  // a rectangle as a 16:9 view (centre, width), with a margin
  function view(r, pad = 1.08) {
    let w = (r.x1 - r.x0) * pad, h = (r.y1 - r.y0) * pad;
    if (w / h > W / H) h = w * H / W; else w = h * W / H;
    return { cx: (r.x0 + r.x1) / 2, cy: (r.y0 + r.y1) / 2, w };
  }
  function lerpView(A, B, u) {
    return { cx: A.cx + (B.cx - A.cx) * u, cy: A.cy + (B.cy - A.cy) * u, w: Math.exp(Math.log(A.w) + (Math.log(B.w) - Math.log(A.w)) * u) };
  }

  function drawMap(svg) {
    const m = model(), NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
    // edges and labels, then the boxes around slides, then the slides, then the numbers;
    // the three decoration layers fade with the zoom (deco)
    const gl = mk('g', { class: 'deco' }), gb = mk('g', { class: 'deco' }), gs = mk('g', {}), gn = mk('g', { class: 'deco' });
    const curve = (sx, sy, ex, ey, col, w, op) => { const my = (sy + ey) / 2;
      mk('path', { d: `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}`, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-opacity': op }, gl);
      return t => { const u = 1 - t; return [u * u * u * sx + 3 * u * u * t * sx + 3 * u * t * t * ex + t * t * t * ex, u * u * u * sy + 3 * u * u * t * my + 3 * u * t * t * my + t * t * t * ey]; }; };
    const hcurve = (sx, sy, ex, ey, col, w, op) => { const mx = (sx + ex) / 2;
      mk('path', { d: `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-opacity': op }, gl);
      return t => { const u = 1 - t; return [u * u * u * sx + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * ex, u * u * u * sy + 3 * u * u * t * sy + 3 * u * t * t * ey + t * t * t * ey]; }; };
    const link = (a, b, col, w, op) => {
      const top = b.top == null ? b.y : b.top;
      if (top >= a.y + a.h + 80) return curve(a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, top, col, w, op);
      const right = b.x + b.w / 2 >= a.x + a.w / 2;
      return hcurve(right ? a.x + a.w : a.x, a.y + a.h / 2, right ? b.x : b.x + b.w, b.y + b.h / 2, col, w, op);
    };
    const box = p => ({ x: p[0], y: p[1], w: W, h: H });
    const chain = [0].concat(m.pre);
    for (let q = 1; q < chain.length; q++) link(box(m.pos[chain[q - 1]]), box(m.pos[chain[q]]), TRUNK, 30, 0.85);
    const ob = box(m.pos[m.hub]);
    m.heads.forEach(h => {
      const hp = h.slide >= 0 ? m.pos[h.slide] : h.at, lines = wrap(h.label), lh = lines.length ? 60 + lines.length * 104 : 0;
      const hb = h.slide >= 0 ? box(hp) : { x: hp[0], y: hp[1] - lh, w: W, h: lh };
      hb.top = hp[1] - lh - 30;
      const at = link(ob, hb, h.colour, 30, 0.85);
      lines.forEach((line, k) => {
        mk('text', { x: hp[0] + W / 2, y: hp[1] - 60 - (lines.length - 1 - k) * 104, 'text-anchor': 'middle', fill: h.colour,
          'font-size': 92, 'font-weight': 700, 'font-family': 'system-ui,-apple-system,sans-serif' }, gl).textContent = line; });
      if (h.num) { const c = at(0.7);
        mk('circle', { cx: c[0], cy: c[1], r: 78, fill: h.colour, stroke: '#fff', 'stroke-width': 10 }, gl);
        mk('text', { x: c[0], y: c[1] + 34, 'text-anchor': 'middle', fill: '#fff', 'font-size': 96, 'font-weight': 800,
          'font-family': 'system-ui,-apple-system,sans-serif' }, gl).textContent = String(h.num); }
      const from = h.slide >= 0 ? box(m.pos[h.slide]) : { x: hp[0], y: hp[1] - lh, w: W, h: lh - 30 };
      h.kids.forEach(c => link(from, box(m.pos[c]), h.colour, 10, 0.6));
    });
    // slides: thumbnail, outline by role, slide number
    m.drawn.forEach(i => {
      const [x, y] = m.pos[i], trunk = i === 0 || m.pre.includes(i), head = m.heads.some(h => h.slide === i);
      const col = trunk ? TRUNK : m.colour[i] || '#888', sw = trunk ? 22 : head ? 18 : 7;
      mk('rect', { x, y, width: W, height: H, fill: 'none', stroke: col, 'stroke-width': 2 * sw }, gb);
      const g = mk('g', { class: 'mapslide-thumb', 'data-n': i + 1 }, gs);
      mk('rect', { x, y, width: W, height: H, fill: '#fff' }, g);
      mk('image', { href: m.thumbs[i], x, y, width: W, height: H, preserveAspectRatio: 'xMidYMid meet' }, g);
      mk('rect', { x: x + 16, y: y + H - 72, width: 22 + 26 * String(i + 1).length, height: 56, rx: 10, fill: 'rgba(40,36,33,.78)' }, gn);
      mk('text', { x: x + 27, y: y + H - 29, fill: '#fff', 'font-size': 40, 'font-weight': 600, 'font-family': 'system-ui,-apple-system,sans-serif' }, gn).textContent = String(i + 1);
    });
    return gb;
  }
  // The edges, boxes and numbers belong to the map: seen from a single slide
  // they are gone, and they fade in as the view widens (fully by 2.5 slides).
  function showView(svg, v) {
    const h = v.w * H / W;
    svg.setAttribute('viewBox', `${v.cx - v.w / 2} ${v.cy - h / 2} ${v.w} ${h}`);
    const op = String(clamp((v.w / W - 1.15) / (2.5 - 1.15)));
    svg.querySelectorAll('.deco').forEach(g => { g.style.opacity = op; });
  }

  // printing waits until every thumbnail is in the cache (deck.js DECK_WAITS)
  let preloaded = false;
  function preload() {
    if (preloaded) return; preloaded = true;
    const m = model();
    (window.DECK_WAITS = window.DECK_WAITS || []).push(Promise.all(m.drawn.map(i => new Promise(res => {
      const im = new Image(); im.onload = im.onerror = res; im.src = m.thumbs[i]; }))));
  }

  // Escape (or O) opens the map over the deck: out of the current slide to
  // the whole map; Escape again flies back in, a click on a slide flies into
  // it and goes there. Inside the localtools viewer, whose own slide map
  // owns Escape, the deck leaves the key alone.
  let ov = null, busy = false;
  const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const setView = showView;
  function slideView(i) { const p = model().pos[i]; return view({ x0: p[0], y0: p[1], x1: p[0] + W, y1: p[1] + H }, 1); }
  function fly(svg, A, B, ms, done) {
    const t0 = performance.now();
    const step = now => { const u = Math.min(1, (now - t0) / ms); setView(svg, lerpView(A, B, ease(u)));
      if (u < 1) requestAnimationFrame(step); else if (done) done(); };
    requestAnimationFrame(step);
  }
  function here() { const m = model(), i = Reveal.getIndices().h; return m.drawn.includes(i) ? i : -1; }
  function openMap() {
    if (ov || busy) return;
    const m = model(), cur = here(), all = view(rectOf('all'));
    ov = document.createElement('div'); ov.className = 'deckmap-overlay';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet'); ov.appendChild(svg);
    const gb = drawMap(svg);
    if (cur >= 0) { const p = m.pos[cur];
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      for (const [k, v] of Object.entries({ x: p[0] - 60, y: p[1] - 60, width: W + 120, height: H + 120, rx: 30, fill: 'none', stroke: 'rgba(189,93,58,.75)', 'stroke-width': 56 })) r.setAttribute(k, v);
      gb.appendChild(r); }
    svg.addEventListener('click', e => { const g = e.target.closest('.mapslide-thumb'); if (g) closeMap(+g.dataset.n - 1); });
    document.body.appendChild(ov);
    busy = true;
    const A = cur >= 0 ? slideView(cur) : all;
    setView(svg, A); requestAnimationFrame(() => ov.classList.add('on'));
    fly(svg, A, all, 900, () => { busy = false; });
  }
  function closeMap(to) {
    if (!ov || busy) return;
    const svg = ov.querySelector('svg'), m = model(), cur = here(), go = to == null ? cur : to;
    const vb = svg.getAttribute('viewBox').split(' ').map(Number), A = { cx: vb[0] + vb[2] / 2, cy: vb[1] + vb[3] / 2, w: vb[2] };
    const finish = () => { if (to != null) Reveal.slide(to); ov.remove(); ov = null; busy = false; };
    busy = true;
    if (go >= 0 && m.drawn.includes(go)) fly(svg, A, slideView(go), 700, finish); else finish();
  }
  if (!PRINT && !document.getElementById('html-page')) {
    document.addEventListener('keydown', e => {
      if (!ov) return;
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape' || e.key === 'o' || e.key === 'O') closeMap();
    }, true);
    const bind = () => Reveal.configure({ keyboard: Object.assign({}, Reveal.getConfig().keyboard, { 27: openMap, 79: openMap }) });
    const rv = document.querySelector('.reveal');
    if (window.Reveal && Reveal.isReady && Reveal.isReady()) bind(); else if (rv) rv.addEventListener('ready', bind);
  }

  // Stepping forward off a map slide flies from the map's current view into
  // the next slide's thumbnail, which then fades into the slide itself (the
  // thumbnail shows the slide's final state).
  if (!PRINT) {
    const rv = document.querySelector('.reveal');
    if (rv) rv.addEventListener('slidechanged', e => {
      const prev = e.previousSlide, cur = e.currentSlide;
      if (!prev || prev.dataset.slide !== 'map' || cur.dataset.slide === 'map') return;
      const i = Reveal.getIndices(cur).h, src = prev.querySelector('.mapfig svg');
      if (Reveal.getIndices(prev).h !== i - 1 || !model().drawn.includes(i) || !src) return;
      const box = document.createElement('div'), svg = src.cloneNode(true);
      box.className = 'mapfig mapzoom'; box.style.width = W + 'px'; box.style.height = H + 'px'; box.appendChild(svg); cur.appendChild(box);
      // no cross-fade on this step: the copy replaces the map at once
      prev.style.transition = cur.style.transition = 'none';
      const vb = svg.getAttribute('viewBox').split(' ').map(Number);
      fly(svg, { cx: vb[0] + vb[2] / 2, cy: vb[1] + vb[3] / 2, w: vb[2] }, slideView(i), 900, () => {
        prev.style.transition = cur.style.transition = '';
        box.classList.add('out'); setTimeout(() => box.remove(), 350); });
    });
  }

  FIGS.deckmap = {
    duration: 1600,
    enter: { t: 0 },
    init(root) {
      preload();
      const svg = newSvg(root, W, H);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      drawMap(svg);
      if (!PRINT) svg.addEventListener('click', e => {
        const g = e.target.closest('.mapslide-thumb');
        if (g && window.Reveal) Reveal.slide(+g.dataset.n - 1);
      });
    },
    render(root, p) {
      const A = view(rectOf(p.a)), O = view(rectOf('all')), B = view(rectOf(p.b)), t = clamp(p.t, 0, 2);
      showView(root.querySelector('svg'), t <= 1 ? lerpView(A, O, t) : lerpView(O, B, t - 1));
    }
  };
})();
