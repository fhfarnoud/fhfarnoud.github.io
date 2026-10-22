// Figures of the tokens, embeddings and transformers deck (Part 4, lecture 2).
// Each FIGS entry is a scene, { size, draw(g, p) } (see ../shared/deck.js); the
// numbers it prints are computed here from the toy inputs, and they reproduce
// the deck's verified numbers (reports/part4-slides-plan.md, "Verified numbers").
//
// Deck-local helpers that later decks may want in shared/deck.js:
//   chip, monoText, tokenRow   token chips in a monospace face
//   boxNode, upArrow           labelled boxes and arrows for block diagrams
//   barPanel                   a bar chart with its value labels (32-3's, generalised)
//   heatGrid                   a matrix of weights as shaded cells, with a mask
//   vstrip                     a vector drawn as a strip of cells
//   tag                        a numbered circle in a map branch's colour

Object.assign(MACROS, {
  '\\bx': '\\mathbf{x}', '\\bh': '\\mathbf{h}', '\\bu': '\\mathbf{u}', '\\bv': '\\mathbf{v}',
  '\\bq': '\\mathbf{q}', '\\bk': '\\mathbf{k}', '\\be': '\\mathbf{e}', '\\bc': '\\mathbf{c}',
  '\\bz': '\\mathbf{z}', '\\bp': '\\mathbf{p}', '\\bphi': '\\boldsymbol{\\phi}', '\\balpha': '\\boldsymbol{\\alpha}', '\\Var': '\\operatorname{Var}',
  '\\mW': '\\mathbf{W}', '\\mQ': '\\mathbf{Q}', '\\mK': '\\mathbf{K}', '\\mI': '\\mathbf{I}',
  '\\cL': '\\mathcal{L}', '\\cV': '\\mathcal{V}', '\\bbR': '\\mathbb{R}',
  '\\PMI': '\\operatorname{PMI}', '\\softmax': '\\operatorname{softmax}',
  // role colours (## is a literal # inside a KaTeX macro): query, key, value, attention weight,
  // model probability, loss
  '\\cq': '\\textcolor{##B30000}{#1}', '\\ck': '\\textcolor{##2354A8}{#1}', '\\cv': '\\textcolor{##008000}{#1}',
  '\\cat': '\\textcolor{##087F80}{#1}', '\\cpd': '\\textcolor{##762A83}{#1}', '\\cro': '\\textcolor{##B33362}{#1}'
});

// ---------------------------------------------------------------- shared bits
const PAL = ['#2354A8', '#008000', '#B30000', '#762A83'];   // the map's branch colours (deckmap.js)
const MONO = "Menlo, 'DejaVu Sans Mono', Consolas, monospace";
const neg = s => String(s).replace(/^-/, '−');
const f2 = v => neg((Math.abs(v) < 0.005 ? 0 : v).toFixed(2));
const f3 = v => neg((Math.abs(v) < 0.0005 ? 0 : v).toFixed(3));
const softmax = z => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const wsum = (w, V) => V[0].map((_, k) => V.reduce((s, v, j) => s + w[j] * v[k], 0));
const sm = (t, px = 18) => `<span style="font-size:${px}px">${t}</span>`;
const halo = { stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' };

// A token: a rounded box from x to x + w, centred vertically on y.
function chip(g, x, y, w, h, st = {}) {
  return g.el('rect', paint(st, { x, y: y - h / 2, width: w, height: h, rx: 7,
    fill: '#f4f2ee', stroke: '#8a8478', 'stroke-width': 1.5 }));
}
// Monospace SVG text centred on (x, y); a space shows as ␣.
function monoText(g, [x, y], s, size = 22, st = {}) {
  return g.text([x, y + 0.35 * size], s.replace(/ /g, '␣'), Object.assign({ size, color: C.ink, 'font-family': MONO }, st));
}
// A row of token chips starting at x, gap px apart; returns the right end.
function tokenRow(g, x, y, toks, o = {}) {
  const size = o.size || 20, cw = 0.602 * size, pad = o.pad ?? 9, gap = o.gap ?? 6, h = o.h || 38;
  toks.forEach((t, i) => {
    const w = t.length * cw + 2 * pad, st = (o.style && o.style(i)) || {};
    chip(g, x, y, w, h, st);
    monoText(g, [x + w / 2, y], t, size, { color: st.text || C.ink });
    x += w + gap;
  });
  return x - gap;
}
// A labelled box for a block diagram (label in KaTeX/HTML, centred).
function boxNode(g, key, x, y, w, h, s, st = {}) {
  const { lab, ...rest } = st;
  g.el('rect', paint(rest, { x, y, width: w, height: h, rx: 9, fill: '#f1f1f1', stroke: '#888', 'stroke-width': 1.5 }));
  g.label(key, s, [x + w / 2, y + h / 2], 'c', Object.assign({ color: C.ink }, lab || {}));
}
const upArrow = (g, x, y1, y2, st = {}) => g.arrow([x, y1], [x, y2], Object.assign({ color: '#666', w: 2 }, st));
// A vector as a strip of n cells (vertical unless o.horizontal), shades from vals in [0, 1].
function vstrip(g, x, y, vals, o = {}) {
  const c = o.cell || 16, col = colorOf(o.color || 'pred');
  vals.forEach((v, i) => g.el('rect', { x: o.horizontal ? x + i * c : x, y: o.horizontal ? y : y + i * c, width: c, height: c,
    fill: col, 'fill-opacity': (0.12 + 0.75 * v) * (o.opacity ?? 1), stroke: '#fff', 'stroke-width': 1.5, opacity: o.opacity ?? 1 }));
}
// A numbered circle in branch k's colour, as an HTML label (a pointer can ring it).
const tag = (g, key, k, at, opacity = 1) => g.label(key, `<span class="partno" style="background:${PAL[k - 1]}">${k}</span>`, at, 'c', { opacity });
// Bars with value labels, as in 32-3's softmax figures: names under the bars, a
// title above, values above each bar (o.lab), o.color the bars' role colour.
function barPanel(g, B, names, hs, o) {
  const P = g.plot(B), xs = hs.map((_, i) => i + 1), op = o.opacity ?? 1, col = o.color || 'pred';
  g.group({ opacity: op }, () => {
    P.line([B.xlo, o.base ?? 0], [B.xhi, o.base ?? 0], { color: C.axis, w: 1.5 });
    P.line([B.xlo, B.ylo], [B.xlo, B.yhi], { color: C.axis, w: 1.5 });
    for (const v of o.yt || []) P.text([B.xlo, v], neg(v), { anchor: 'end', dx: -7, dy: 5 });
    if (o.ghost) P.bars(xs, o.ghost, { color: col, width: o.width || 0.62, base: o.base ?? 0, 'fill-opacity': 0, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.6 });
    P.bars(xs, hs.map(h => clamp(h, B.ylo, B.yhi)), { color: col, width: o.width || 0.62, base: o.base ?? 0, 'fill-opacity': o.fo ?? 0.55 });
  });
  names.forEach((n, i) => P.label(o.key + 'n' + i, n, [i + 1, B.ylo], 't', { dy: 8, color: '#333', opacity: op }));
  if (o.lab) hs.forEach((h, i) => P.label(o.key + 'v' + i, o.lab(h, i), [i + 1, clamp(Math.max(h, o.base ?? 0, o.ghost ? o.ghost[i] : -Infinity), B.ylo, B.yhi)], 'b',
    { dy: -5, color: col, opacity: op }));
  if (o.title) P.label(o.key + 't', o.title, [B.xlo, B.yhi], 'bl', { dy: -8, color: '#333', opacity: op });
}
// A matrix of values as cells shaded in `color` (teal: attention weights); o.shade maps
// a value to [0, 1] (default: the value itself), masked cells (mask(i, j) true) turn
// gray with opacity o.maskOpacity; values printed to 2 decimals at o.size px.
function heatGrid(g, key, x0, y0, cell, M, rows, cols, o = {}) {
  const col = colorOf(o.color || 'teal'), mk = o.mask || (() => false), mo = o.maskOpacity ?? 0;
  const shade = o.shade || (v => v), size = o.size || 20, op = o.opacity ?? 1;
  g.group({ opacity: op }, () => M.forEach((r, i) => r.forEach((v, j) => {
    const x = x0 + j * cell, y = y0 + i * cell, masked = mk(i, j), s = clamp(shade(v));
    g.el('rect', { x, y, width: cell, height: cell, fill: col, 'fill-opacity': 0.05 + 0.85 * s, stroke: '#fff', 'stroke-width': 2 });
    if (masked) g.el('rect', { x, y, width: cell, height: cell, fill: '#cfcfcf', 'fill-opacity': mo, stroke: '#fff', 'stroke-width': 2 });
    const txt = masked && mo > 0.5 ? '0' : f2(v);
    g.text([x + cell / 2, y + cell / 2 + 0.35 * size], txt, { size, color: s > 0.55 && !(masked && mo > 0.5) ? '#fff' : '#333' });
  })));
  rows.forEach((s, i) => g.label(key + 'r' + i, s, [x0 - 10, y0 + (i + 0.5) * cell], 'r', { color: '#333', opacity: op }));
  cols.forEach((s, j) => g.label(key + 'c' + j, sm(s, o.colSize || 19), [x0 + (j + 0.5) * cell, y0 - 8], 'b', { color: '#333', opacity: op }));
}
// Token chips that wrap at maxW; returns the y of the last row.
function tokenWrap(g, x0, y, toks, maxW, o = {}) {
  const size = o.size || 19, cw = 0.602 * size, pad = 7, gap = 5, h = 34, dy = o.dy || 44;
  let x = x0;
  toks.forEach(t => {
    const w = t.length * cw + 2 * pad;
    if (x + w > x0 + maxW) { x = x0; y += dy; }
    chip(g, x, y, w, h, o.style || {});
    monoText(g, [x + w / 2, y], t, size);
    x += w + gap;
  });
  return y;
}

// Labels for scattered points that avoid one another: for each item [key, text, x, y]
// (pixels), try six places around the point and keep the first whose estimated box
// clears the labels placed before it and every point. Returns [key, text, at, anchor].
function placeLabels(items, o = {}) {
  const px = o.size || 16, cw = 0.56 * px, h = px + 2, r = o.r || 7, boxes = [];
  const pts = (o.obstacles || items.map(([, , x, y]) => [x, y])).map(([x, y]) => [x - r, y - r, x + r, y + r]);
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  return items.map(([key, s, x, y]) => {
    const w = String(s).replace(/<[^>]+>/g, '').length * cw + 4;
    const cand = [['l', 8, -9], ['r', -8, -9], ['l', 8, 10], ['r', -8, 10], ['b', 0, -10], ['t', 0, 10], ['l', 8, -26], ['r', -8, 26],
      ['l', 12, 28], ['r', -12, -28], ['l', 14, -44], ['r', -14, 44], ['b', 0, -28], ['t', 0, 28]];
    for (const [an, dx, dy] of cand) {
      const X = x + dx, Y = y + dy;
      const b = an === 'l' ? [X, Y - h / 2, X + w, Y + h / 2] : an === 'r' ? [X - w, Y - h / 2, X, Y + h / 2]
        : an === 'b' ? [X - w / 2, Y - h, X + w / 2, Y] : [X - w / 2, Y, X + w / 2, Y + h];
      if (!boxes.some(q => hit(q, b)) && !pts.some(q => hit(q, b))) { boxes.push(b); return [key, s, [X, Y], an]; }
    }
    return [key, s, [x + 8, y - 9], 'l'];
  });
}

// ---------------------------------------------------------------- slide 2: from text to features
// The context goes in as tokens (1), each becomes a vector (2), attention layers mix
// them (3), and the last layer gives the next-token distribution (4). The tokens and the
// probabilities are SmolLM2-135M-Instruct's (chat_files/part4-deck-scripts/deckB/smol_demos.py).
const OPEN_P = [['be', 0.5229], ['come', 0.0292], ['take', 0.0276], ['have', 0.0196]];
FIGS.opening = {
  size: [560, 576],
  draw(g, p) {
    const toks = ['Tom', 'orrow', ' it', ' will'], cx = [120, 222, 324, 426];
    toks.forEach((t, i) => { const w = t.length * 12 + 18; chip(g, cx[i] - w / 2, 34, w, 42); monoText(g, [cx[i], 34], t, 20); });
    const tn = p.n ?? 1;
    tag(g, 't1', 1, [30, 34], tn);
    cx.forEach((x, i) => { upArrow(g, x, 58, 86); vstrip(g, x - 9, 92, [0.2 + 0.2 * i, 0.7, 0.4, 0.9 - 0.2 * i], { color: 'prior', cell: 18 }); });
    tag(g, 't2', 2, [30, 128], tn);
    cx.forEach(x => upArrow(g, x, 166, 196));
    g.el('rect', { x: 70, y: 200, width: 410, height: 120, rx: 12, fill: '#e7e4ee', stroke: '#463C7D', 'stroke-width': 2 });
    for (const [a, b] of [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]])
      g.path([[cx[a], 222], [(cx[a] + cx[b]) / 2, 222 + 16 * (b - a)], [cx[b], 222]], { color: '#463C7D', w: 1.5, opacity: 0.4 });
    g.label('q', '<span style="font-size:44px;color:#463C7D">?</span>', [272, 280], 'c');
    tag(g, 't3', 3, [30, 260], tn);
    g.label('xl', sm('$\\times L$ layers', 19), [474, 312], 'br', { color: '#463C7D' });
    upArrow(g, 426, 322, 350);
    vstrip(g, 417, 354, [0.6, 0.3, 0.85, 0.5], { color: 'pred', cell: 18 });
    g.label('phi', '$\\bphi(w_{1:t-1})$', [406, 390], 'r', { color: '#333' });
    upArrow(g, 426, 428, 446);
    const B = box2d(290, 450, 220, 70, 0.4, 4.6, 0, 0.6), P = g.plot(B);
    P.line([0.4, 0], [4.6, 0], { color: C.axis });
    P.bars([1, 2, 3, 4], OPEN_P.map(q => q[1]), { color: 'pred', width: 0.6 });
    OPEN_P.forEach(([w, q], i) => {
      P.label('b' + i, sm(w, 17), [i + 1, 0], 't', { dy: 3, color: '#333' });
      P.label('bv' + i, sm(f2(q), 16), [i + 1, q], 'b', { dy: -3, color: C.pred });
    });
    g.label('pw', sm('softmax: $p(w_t\\mid w_{1:t-1})$', 19), [278, 496], 'r', { color: '#333' });
    tag(g, 't4', 4, [30, 496], tn);
    g.path([[516, 496], [540, 496], [540, 34], [498, 34]], { color: '#666', w: 2, dash: '6 5' });
    g.arrow([504, 34], [488, 34], { color: '#666', w: 2 });
    g.label('loop', sm('sample,<br>append', 17), [532, 410], 'r', { color: '#555' });
    // the caption in the free lower-left corner, one label per line
    [`SmolLM2-135M-Instruct, a small open`, `language model: its 4 most probable`, `next tokens, of 49,152; <span style="font-family:${MONO}">␣</span> is a space`]
      .forEach((t, i) => g.label('cap' + i, sm(t, 16), [0, 530 + 21 * i], 'l', { color: '#666' }));
  }
};

// ---------------------------------------------------------------- slide 5: byte pair encoding
// Four words with their counts; four merges, each the most frequent adjacent pair.
// m runs 0 -> 4 (one merge per build step); between whole values the merging pair slides together.
const BPE_W = [['low', 5], ['lower', 2], ['newest', 6], ['widest', 3]];
const BPE_M = [['e', 's'], ['es', 't'], ['l', 'o'], ['lo', 'w']];
const BPE_SEG = (() => {   // BPE_SEG[k][r]: the tokens of word r after k merges
  let seg = BPE_W.map(([w]) => w.split('')); const out = [seg];
  for (const [a, b] of BPE_M) {
    seg = seg.map(s => { const o = []; for (let i = 0; i < s.length; i++) {
      if (i + 1 < s.length && s[i] === a && s[i + 1] === b) { o.push(a + b); i++; } else o.push(s[i]); } return o; });
    out.push(seg);
  }
  return out;
})();
FIGS.bpe = {
  size: [440, 430], duration: 900,
  draw(g, p) {
    const m = clamp(p.m, 0, 4), k = Math.min(3, Math.floor(m)), u = m - k, cw = 30, G = 14, x0 = 150, size = 24;
    BPE_W.forEach(([w, n], r) => {
      const y = 44 + r * 78, A = BPE_SEG[k][r], Bn = BPE_SEG[k + 1][r];
      const starts = s => { const out = new Set(); let i = 0; s.forEach(t => { out.add(i); i += t.length; }); return out; };
      const sa = starts(A), sb = starts(Bn);
      // the left edge of character i: boundaries before it push it right, a vanishing one by (1 - u)
      const xl = i => { let x = x0 + i * cw; for (let b = 1; b <= i; b++) if (sa.has(b)) x += G * (sb.has(b) ? 1 : 1 - u); return x; };
      g.label('wl' + r, `${w} $\\times${n}$`, [x0 - 22, y], 'r', { color: '#333' });
      const segs = u > 0.999 ? Bn : A, kk = u > 0.999 ? k + 1 : k;
      let i = 0;
      segs.forEach(t => {
        const isNew = kk > 0 && t === BPE_M[kk - 1].join(''), hl = isNew ? clamp(1 - (m - kk) * 1.5) : 0;
        g.el('rect', { x: xl(i) - 3, y: y - 23, width: xl(i + t.length - 1) + cw - xl(i) + 6, height: 46, rx: 8,
          fill: hl > 0.01 ? C.postC : '#f4f2ee', 'fill-opacity': hl > 0.01 ? 0.12 + 0.18 * hl : 1,
          stroke: hl > 0.01 ? C.postC : '#8a8478', 'stroke-width': 1.5 + 1.5 * hl });
        for (let c = 0; c < t.length; c++) monoText(g, [xl(i + c) + cw / 2, y], t[c], size);
        i += t.length;
      });
    });
    // the tokens added so far
    g.label('nt', 'tokens added:', [8, 384], 'l', { color: '#555' });
    let x = 168;
    BPE_M.forEach(([a, b], j) => {
      const t = a + b, w = t.length * 0.602 * 22 + 18, op = clamp(m - j);
      g.group({ opacity: op }, () => { chip(g, x, 384, w, 40, { fill: C.postC, fo: 0.15, stroke: C.postC }); monoText(g, [x + w / 2, 384], t, 22); });
      x += w + 10;
    });
  }
};

// ---------------------------------------------------------------- slide 6: tokenizing new text
// The merges learned on slide 5's corpus, applied in order to a word the corpus does not contain
// (lowest) and to one whose pairs were never merged (newer). k: rows of lowest shown; n: newer shown.
function bpeApply(word, k) {
  let seg = word.split('');
  for (const [a, b] of BPE_M.slice(0, k)) {
    const o = []; for (let i = 0; i < seg.length; i++) {
      if (i + 1 < seg.length && seg[i] === a && seg[i + 1] === b) { o.push(a + b); i++; } else o.push(seg[i]); }
    seg = o;
  }
  return seg;
}
FIGS.bpeApply = {
  size: [560, 470],
  draw(g, p) {
    const k = p.k ?? 4, n = p.n ?? 1, x0 = 210;
    const mono = t => `<span style="font-family:${MONO}">${t}</span>`;
    const lab = ['characters', ...BPE_M.map(([a, b], j) => `merge ${j + 1}: ${mono(a)} + ${mono(b)}`)];
    g.label('wt', '<b>lowest</b>', [x0, 18], 'l', { color: '#333' });
    for (let r = 0; r <= 4; r++) {
      const y = 62 + r * 60, op = clamp(k - r + 1);
      g.group({ opacity: op }, () => {
        g.label('ml' + r, sm(lab[r], 17), [x0 - 16, y], 'r', { color: '#555', opacity: op });
        const seg = bpeApply('lowest', r), fresh = r > 0 ? BPE_M[r - 1].join('') : null;
        tokenRow(g, x0, y, seg, { size: 20, style: i => seg[i] === fresh ? { fill: C.postC, fo: 0.15, stroke: C.postC } : {} });
      });
    }
    g.group({ opacity: clamp(n) }, () => {
      g.label('wn', '<b>newer</b>', [x0, 384], 'l', { color: '#333', opacity: clamp(n) });
      g.label('mn', sm('all four merges', 17), [x0 - 16, 428], 'r', { color: '#555', opacity: clamp(n) });
      tokenRow(g, x0, 428, bpeApply('newer', 4), { size: 20 });
    });
  }
};

// ---------------------------------------------------------------- slide 7: tokenization in practice
// Splits by SmolLM2's tokenizer (HuggingFaceTB/SmolLM2-135M-Instruct, 49,152 tokens), computed in Python.
const TOK_A = ['The', ' spring', ' season', ' blooms', '.'];
// 'Strawberry' with no space before it, as at the start of a sentence, is St + raw + berry
const TOK_B = [[' strawberry'], [' Straw', 'berry'], ['St', 'raw', 'berry'], [' unbelie', 'v', 'ably'], [' ', '1', '2', '3', '4', '5', '6', '7', '8']];
FIGS.toks = {
  size: [560, 470],
  draw(g, p) {
    const r = p.r ?? 0, soft = { fill: '#e9eef7', stroke: C.prior };
    g.label('ha', sm('common words: one token each', 19), [0, 22], 'l', { color: '#555' });
    tokenRow(g, 0, 64, TOK_A, { size: 19, style: () => soft });
    g.label('ab', sm('5 tokens, 25 bytes', 19), [0, 104], 'l', { color: C.prior, opacity: r >= 2 ? 1 : 0 });
    g.group({ opacity: r >= 1 ? 1 : 0 }, () => {
      TOK_B.forEach((t, i) => tokenRow(g, 0, 186 + i * 52, t, { size: 19, gap: 5, style: () => soft }));
    });
    g.label('hb', sm('the cut follows the counts, not the word’s parts', 19), [0, 148], 'l', { color: '#555', opacity: r >= 1 ? 1 : 0 });
    // left-anchored: a label anchored at its right end in a body figure shrinks every printed page
    ['1 token', '2 tokens', '3 tokens', '3 tokens', '9 tokens'].forEach((s, i) =>
      g.label('nb' + i, sm(s, 19), [470, 186 + i * 52], 'l', { color: '#555', opacity: r >= 1 ? 1 : 0 }));
    g.label('cap', sm(`SmolLM2’s tokenizer (49,152 tokens); <span style="font-family:${MONO}">␣</span> is a space`, 17), [0, 446], 'l', { color: '#666' });
  }
};

// ---------------------------------------------------------------- slide 9: perplexity per word
// One excerpt of The Canterville Ghost as the two tokenizers cut it (bits_per_byte.py).
const BPB_S = [' Mr', '.', ' Hi', 'ram', ' B', '.', ' Ot', 'is', ',', ' the', ' American', ' Minister', ',', ' bought', ' Can', 'ter', 'ville', ' Chase', ','];
const BPB_G = [' Mr', '.', ' Hir', 'am', ' B', '.', ' Ot', 'is', ',', ' the', ' American', ' Minister', ',', ' bought', ' Canter', 'ville', ' Chase', ','];
FIGS.bpb = {
  size: [470, 470],
  draw(g, p) {
    const soft = { fill: '#e9eef7', stroke: C.prior };
    g.label('ha', sm(`SmolLM2’s tokenizer: ${BPB_S.length} tokens`, 19), [0, 22], 'l', { color: '#333' });
    const y1 = tokenWrap(g, 0, 66, BPB_S, 466, { style: soft });
    g.label('hb', sm(`GPT-2’s tokenizer: ${BPB_G.length} tokens`, 19), [0, y1 + 60], 'l', { color: '#333' });
    const y2 = tokenWrap(g, 0, y1 + 104, BPB_G, 466, { style: soft });
    g.label('cap', sm(`the same excerpt of <i>The Canterville Ghost</i>; <span style="font-family:${MONO}">␣</span> is a space`, 16), [0, y2 + 42], 'l', { color: '#666' });
  }
};

// ---------------------------------------------------------------- slide 11: words as symbols
// One-hot vectors: a definition, drawn.
FIGS.onehot = {
  size: [520, 330],
  draw(g, p) {
    const oh = p.oh ?? 0, words = [['cat', 3], ['kitten', 8], ['truck', 12]], n = 14, c = 24;
    g.group({ opacity: oh }, () => words.forEach(([w, at], r) => {
      const y = 40 + r * 64;
      for (let i = 0; i < n; i++) g.el('rect', { x: 150 + i * c, y, width: c, height: c, fill: i === at ? C.ink : '#fff', stroke: '#999', 'stroke-width': 1 });
    }));
    words.forEach(([w], r) => g.label('oh' + r, `$\\be_{\\text{${w}}}$`, [136, 52 + r * 64], 'r', { opacity: oh }));
    g.label('ohv', sm('positions $1,\\dots,V$ (part of the vector shown)', 17), [486, 222], 'r', { color: '#666', opacity: oh });
    g.label('ohd', '$\\langle\\be_{\\text{cat}},\\be_{\\text{kitten}}\\rangle=\\langle\\be_{\\text{cat}},\\be_{\\text{truck}}\\rangle=0$', [300, 280], 'c', { opacity: oh });
  }
};

// ---------------------------------------------------------------- slide 12: cosine similarity from "cat"
// Real GloVe vectors (D = 100): the cosine of cat's vector with four others (glove_figs.py).
FIGS.catcos = {
  size: [480, 330],
  draw(g, p) {
    const op = p.pt ?? 1, B = box2d(110, 50, 300, 220, 0, 1, 0.4, 4.6), P = g.plot(B);
    const col = { dog: 'teal', kitten: 'teal', car: 'brown', truck: 'brown' };
    g.group({ opacity: op }, () => {
      P.line([0, 0.4], [0, 4.6], { color: C.axis, w: 1.5 });
      P.line([0, 0.4], [1, 0.4], { color: C.axis, w: 1.5 });
      for (const v of [0, 0.5, 1]) P.text([v, 0.4], String(v), { dy: 20 });
      GCAT.forEach(([w, c], i) => P.rect([0, 4 - i - 0.32], [c, 4 - i + 0.32], { color: colorOf(col[w]), opacity: 0.6 }));
    });
    GCAT.forEach(([w, c], i) => {
      P.label('w' + i, w, [0, 4 - i], 'r', { dx: -10, color: colorOf(col[w]), opacity: op });
      P.label('c' + i, sm(f2(c), 18), [c, 4 - i], 'l', { dx: 8, color: '#333', opacity: op });
    });
    P.label('t', sm('cosine similarity with “cat”, learned word vectors ($D=100$)', 18), [0, 4.6], 'bl', { dx: -100, dy: -12, color: '#333', opacity: op });
  }
};

// ---------------------------------------------------------------- slides 13 and 14: five vectors
const U5 = [[3, 1], [4, 3], [0.5, -1.5], [1.5, -2], [-3, -1]];
const U5C = ['prior', 'teal', 'brown', 'postC', 'like'];
const U5L = [[10, 14, 'l'], [8, -8, 'l'], [0, 12, 't'], [8, 14, 'l'], [-10, 12, 'r']];
FIGS.five = {
  size: [480, 400],
  draw(g, p) {
    const B = box2d(36, 24, 405, 315, -4, 5, -3, 4), P = g.plot(B);
    for (let v = -3.5; v <= 4.5; v += 1) P.line([v, -3], [v, 4], { color: '#f4f4f4', w: 1 });
    for (let v = -2.5; v <= 3.5; v += 1) P.line([-4, v], [5, v], { color: '#f4f4f4', w: 1 });
    P.axes({ xt: [-4, -2, 2, 4], yt: [-2, 2, 4], names: ['', ''] });
    const ang = (v, r, col, key, lab) => {   // the angle from the x-axis direction of v1 to v2, as an arc
      const [a, b] = v, t1 = Math.atan2(a[1], a[0]), t2 = Math.atan2(b[1], b[0]);
      const pts = []; for (let i = 0; i <= 30; i++) { const t = t1 + (t2 - t1) * i / 30; pts.push([r * Math.cos(t), r * Math.sin(t)]); }
      P.path(pts, { color: col, w: 3, opacity: p.c });
    };
    ang([U5[0], U5[1]], 1.6, C.rose);
    ang([U5[2], U5[3]], 0.9, C.rose);
    g.label('same', sm('equal angles', 18), [B.X(2.4), B.Y(-1.1)], 'l', { color: C.rose, opacity: p.c });
    U5.forEach((u, i) => {
      P.vec([0, 0], u, { color: U5C[i] });
      const [dx, dy, an] = U5L[i];
      P.label('u' + i, `$\\bu_${i + 1}$`, u, an, { dx, dy, color: U5C[i] });
    });
  }
};

// ---------------------------------------------------------------- slide 15: CBOW
FIGS.cbow = {
  size: [540, 420],
  draw(g, p) {
    // the sentence, with the blank and its window of two words on each side
    const sent = ['The', 'store', 'bought', '?', 'from', 'grocery', 'wholesalers'], inWin = k => k >= 1 && k <= 5 && k !== 3;
    let x = 4;
    sent.forEach((w, k) => {
      const wd = k === 3 ? 46 : w.length * 8.6 + 14;
      if (inWin(k)) chip(g, x, 22, wd, 34, { fill: '#e9eef7', stroke: C.prior });
      if (k === 3) chip(g, x, 22, wd, 34, { fill: C.postC, fo: 0.18, stroke: C.postC, 'stroke-width': 2 });
      g.label('s' + k, sm(k === 3 ? '<b>?</b>' : w, 17), [x + wd / 2, 22], 'c', { color: inWin(k) || k === 3 ? C.ink : '#777' });
      x += wd + 8;
    });
    g.label('win', sm('context: the two words on each side of the blank, in its sentence', 16), [4, 62], 'l', { color: '#666' });
    const Y = 50, ctx = ['store', 'bought', 'from', 'grocery'], cy = [70, 150, 230, 310].map(v => v + Y), cc = 190 + Y;
    ctx.forEach((w, i) => {
      chip(g, 10, cy[i], 120, 40, { fill: '#e9eef7', stroke: C.prior });
      g.label('c' + i, w, [70, cy[i]], 'c');
      g.arrow([132, cy[i]], [228 - 22 * Math.cos(Math.atan2(cc - cy[i], 98)), cc - 34 * Math.sin(Math.atan2(cc - cy[i], 98))], { color: '#666', w: 2 });
      g.label('cv' + i, sm('$\\bc$', 18), [158, cy[i] + (cc - cy[i]) * 0.25 - 12], 'c', { color: C.prior });
    });
    g.el('circle', { cx: 262, cy: cc, r: 34, fill: '#eef6ee', stroke: '#2e7d32', 'stroke-width': 2 });
    g.label('avg', 'avg', [262, cc], 'c');
    g.arrow([297, cc], [338, cc], { color: '#666', w: 2 });
    g.label('h', '$\\bh$', [318, cc - 18], 'c');
    boxNode(g, 'sc', 342, cc - 34, 186, 68, sm('scores $\\langle\\bu_w,\\bh\\rangle$,<br>softmax', 19), { fill: '#f3eef6', stroke: C.pred });
    g.arrow([435, cc + 36], [435, cc + 90], { color: '#666', w: 2 });
    chip(g, 372, cc + 116, 126, 44, { fill: C.postC, fo: 0.18, stroke: C.postC, 'stroke-width': 2 });
    g.label('out', '<b>oranges?</b>', [435, cc + 116], 'c');
    g.label('pr', sm('$p(w\\mid\\text{context})$', 18), [435, cc + 166], 'c', { color: C.pred });
  }
};

// ---------------------------------------------------------------- slide 16: the context vectors in three dimensions
// The four context vectors, their average h (h = 1) and the two output vectors (u = 1) as arrows from
// the origin, under a rotatable view: azimuth az and elevation el in degrees, screen right
// (-sin az, cos az, 0), as in the neural-networks deck's ell3d. The default view az = -44, el = 32
// keeps every tip apart (the closest pair, grocery and u_oranges, is 0.141 apart in three dimensions).
const CTX3 = [['store', [0.4, 0.5, 0.3]], ['bought', [0.2, 0.1, 0.3]], ['from', [0.1, 0.1, 0.1]], ['grocery', [0.8, 0.6, 0.2]]];
// The CBOW vectors under a rotatable view: azimuth az and elevation el in degrees, screen right
// (-sin az, cos az, 0), as in the neural-networks deck's ell3d. o: S, cx, cy, W, H; c (the four context
// vectors in CTX3's order), u (u_oranges, u_laptops), h; oh, ou: opacities of h and of the output
// vectors; op: of everything; tr: trails {c, u, h} of earlier tips; lab: label placement per word.
function ctx3dDraw(g, p, o) {
  const az = p.az * Math.PI / 180, el = p.el * Math.PI / 180, { S, cx, cy, W, H } = o, op = o.op ?? 1;
  const rt = [-Math.sin(az), Math.cos(az), 0], up = [-Math.sin(el) * Math.cos(az), -Math.sin(el) * Math.sin(az), Math.cos(el)];
  const dt = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const pr = q => [cx + S * dt(q, rt), cy - S * dt(q, up)], O = pr([0, 0, 0]);
  // keep a label's untransformed box inside the figure (w: its approximate width)
  const bgs = s => o.bg ? `<span style="background:rgba(255,255,255,0.85);padding:0 2px">${s}</span>` : s;
  const lab = (key, s, at, an, st, w) => g.label(key, bgs(s), [clamp(at[0], 4, W - w - 4), clamp(at[1], 12, H - 12)], an,
    Object.assign({}, st, { opacity: (st.opacity ?? 1) * op }));
  g.group({ opacity: op }, () => {
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(e => g.arrow(O, pr(e), { color: C.axis, w: 1.5 }));
    if (o.ghost) {
      const gs = o.ghost, go = o.ghostOp ?? 0.3;
      gs.c.forEach(v => g.arrow(O, pr(v), { color: C.prior, w: 2, opacity: go }));
      gs.u.forEach((v, i) => g.arrow(O, pr(v), { color: C[['like', 'rose'][i]], w: 2, opacity: go }));
      const hg = pr(gs.h); g.el('circle', { cx: hg[0], cy: hg[1], r: 6, fill: C.ink, opacity: go });
    }
    if (o.tr) {
      o.tr.c.forEach(path => g.path(path.map(pr), { color: C.prior, w: 1.5, opacity: 0.35 }));
      o.tr.u.forEach((path, i) => g.path(path.map(pr), { color: C[['like', 'rose'][i]], w: 1.5, opacity: 0.35 }));
      g.path(o.tr.h.map(pr), { color: C.ink, w: 1.2, opacity: 0.3, dash: '3 3' });
    }
  });
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((e, k) => {
    const [x, y] = pr(e), L = Math.hypot(x - O[0], y - O[1]) || 1;
    lab('ax' + k, sm(`dim ${k + 1}`, 17), [x + 24 * (x - O[0]) / L - 20, y + 16 * (y - O[1]) / L], 'l', { color: '#555' }, 48);
  });
  // the context vectors
  CTX3.forEach(([w], i) => {
    const t = pr(o.c[i]), [an, dx, dy, how] = o.lab[w];
    g.group({ opacity: op }, () => g.arrow(O, t, { color: C.prior, w: 2.5 }));
    if (how === 'leader' || how === 'leaderTip') {
      const at = how === 'leader' ? [O[0] + dx, O[1] + dy] : [t[0] + dx, t[1] + dy];
      g.group({ opacity: op }, () => g.line(t, [at[0] + 18, at[1] - 10], { stroke: C.prior, 'stroke-width': 1, opacity: 0.7 }));
      lab('cv' + i, sm(w, 18), at, 'l', { color: C.prior }, 40);
    } else lab('cv' + i, sm(how === 'bg' ? `<span style="background:rgba(255,255,255,0.85)">${w}</span>` : w, 18), [t[0] + dx, t[1] + dy], an, { color: C.prior }, 70);
  });
  // their average h
  const ht = pr(o.h), oh = (o.oh ?? 1);
  g.group({ opacity: oh * op }, () => {
    let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5.4 : 12;
      d += (i ? 'L' : 'M') + (ht[0] + r * Math.cos(a)).toFixed(1) + ',' + (ht[1] + r * Math.sin(a)).toFixed(1); }
    g.el('path', { d: d + 'Z', fill: C.ink, stroke: '#fff', 'stroke-width': 1.2 });
  });
  lab('hl', '$\\bh$', [ht[0] + 14, ht[1] + 6], 'l', { color: C.ink, opacity: oh }, 20);
  // the output vectors
  const ou = o.ou ?? 1;
  (o.ulab || [['oranges', 'like', 'b', 0, -10], ['laptops', 'rose', 'l', 8, 0]]).forEach(([w, c, an, dx, dy], i) => {
    const t = pr(o.u[i]);
    g.group({ opacity: ou * op }, () => g.arrow(O, t, { color: C[c], w: 2.5 }));
    lab('uv' + i, sm(`$\\bu_{\\text{${w}}}$`, 18), [t[0] + dx, t[1] + dy], an, { color: C[c], opacity: ou }, 90);
  });
}
FIGS.ctx3d = {
  size: [520, 500],
  draw(g, p) {
    ctx3dDraw(g, p, { S: 360, cx: 80, cy: 330, W: 520, H: 500, c: CTX3.map(x => x[1]), u: [[0.7, 0.5, 0.2], [0.1, 0.2, 0.9]],
      h: [0.375, 0.325, 0.225], oh: clamp(p.h ?? 1), ou: clamp(p.u ?? 1),
      lab: { store: ['l', 8, 0], bought: ['b', 0, -10], from: ['l', -40, 46, 'leader'], grocery: ['l', 8, 0] } });
  }
};

// ---------------------------------------------------------------- slide 17: the worked example's softmax
const CBOW_C = [[0.2, 0.1, 0.3], [0.1, 0.1, 0.1], [0.8, 0.6, 0.2], [0.4, 0.5, 0.3]];
const CBOW_H = CBOW_C[0].map((_, k) => CBOW_C.reduce((s, c) => s + c[k], 0) / 4);
const CBOW_U = [[0.7, 0.5, 0.2], [0.1, 0.2, 0.9]];
const CBOW_S = CBOW_U.map(u => dot(u, CBOW_H)), CBOW_P = softmax(CBOW_S);
const SB1 = box2d(56, 46, 170, 230, 0.4, 2.6, 0, 0.6), SB2 = box2d(350, 46, 170, 230, 0.4, 2.6, 0, 1);
FIGS.cbowp = {
  size: [540, 340],
  draw(g, p) {
    const names = ['oranges', 'laptops'].map(w => sm(w, 18)), st = p.st ?? 0;
    barPanel(g, SB1, names, CBOW_S, { key: 's', yt: [0, 0.5], title: 'scores $\\langle\\bu_w,\\bh\\rangle$', lab: v => f3(v), opacity: st >= 1 ? 1 : 0 });
    g.arrow([SB1.x0 + SB1.W + 18, 160], [SB2.x0 - 40, 160], { color: '#666', w: 2, opacity: st >= 2 ? 1 : 0 });
    g.label('smx', sm('softmax', 18), [(SB1.x0 + SB1.W + SB2.x0 - 22) / 2, 156], 'b', { color: '#555', opacity: st >= 2 ? 1 : 0 });
    barPanel(g, SB2, names, CBOW_P, { key: 'p', yt: [0, 0.5, 1], title: 'probabilities', lab: v => f3(v), opacity: st >= 2 ? 1 : 0 });
  }
};

// ---------------------------------------------------------------- slide 20: one step in three dimensions
// Gradient descent on slide 16's toy (full softmax over the two words, eta = 0.5), as deckB_numbers.py
// repeats it, keeping every vector; CBOW_RUN[t] = { c, u, h } at step t, the context
// vectors in CTX3's order (store, bought, from, grocery; CBOW_C holds bought, from, grocery, store).
const CBOW_RUN = (() => {
  const idx = [3, 0, 1, 2];
  let c = CBOW_C.map(r => r.slice()), u = CBOW_U.map(r => r.slice()); const out = [];
  for (let t = 0; t <= 20; t++) {
    const h = [0, 1, 2].map(k => c.reduce((s, r) => s + r[k], 0) / c.length), pr = softmax(u.map(v => dot(v, h)));
    out.push({ c: idx.map(i => c[i].slice()), u: u.map(v => v.slice()), h });
    const err = [pr[0] - 1, pr[1]], gh = [0, 1, 2].map(k => err[0] * u[0][k] + err[1] * u[1][k]);
    u = u.map((v, w) => v.map((x, k) => x - 0.5 * err[w] * h[k]));
    c = c.map(r => r.map((x, k) => x - 0.5 * gh[k] / c.length));
  }
  return out;
})();
// Slide 20: one step at slide 16's scale and view; s1 runs 0 -> 1 from step 0 to step 1, the step-0
// vectors staying behind faintly.
FIGS.ctx3dstep = {
  size: [520, 500],
  draw(g, p) {
    const s1 = clamp(p.s1 ?? 0), R0 = CBOW_RUN[0], R1 = CBOW_RUN[1], mix = (a, b) => a.map((v, k) => lerp(v, b[k], s1));
    ctx3dDraw(g, p, { S: 350, cx: 76, cy: 330, W: 520, H: 500, c: R0.c.map((v, i) => mix(v, R1.c[i])), u: R0.u.map((v, i) => mix(v, R1.u[i])),
      h: mix(R0.h, R1.h), ghost: R0, ghostOp: 0.3 * s1, bg: true,
      lab: { store: ['l', 8, 0], bought: ['b', 0, -10], from: ['l', -40, 46, 'leader'], grocery: ['l', 8, 0] } });
    g.label('st', sm(s1 < 0.5 ? "step 0: slide 16's vectors" : 'step 1; faint: step 0', 18), [6, 488], 'l', { color: '#555' });
  }
};

// ---------------------------------------------------------------- slides 21 and 22: CBOW from a random start on a toy corpus
// CBT (data.js, from cbow_toy.py): the six content words' context vectors after each epoch, the
// average loss per blank and the mean within- and across-group cosines per epoch. The 3D figure
// draws each context vector at length 1 (cosine compares directions), with the trail of its
// direction from epoch 0; when a group's three tips lie within 40 px, their labels stack at the group's tip.
// The default view az = -150, el = 33 keeps the six start directions at least 0.38 apart.
const TOYG = [[0, 1, 2], [3, 4, 5]], TOYC = ['postC', 'teal'];
FIGS.toy3d = {
  size: [700, 520],
  draw(g, p) {
    const E = CBT.traj.length - 1, e = Math.round(clamp(p.e ?? 0, 0, E));
    const az = p.az * Math.PI / 180, el = p.el * Math.PI / 180, S = 270, cx = 350, cy = 300, W = 700, H = 520;
    const rt = [-Math.sin(az), Math.cos(az), 0], up = [-Math.sin(el) * Math.cos(az), -Math.sin(el) * Math.sin(az), Math.cos(el)];
    const dt = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const pr = q => [cx + S * dt(q, rt), cy - S * dt(q, up)], O = pr([0, 0, 0]);
    const unit = v => { const n = Math.hypot(...v) || 1; return v.map(x => x / n); };
    const bg = s => `<span style="background:rgba(255,255,255,0.85);padding:0 2px">${s}</span>`;
    const lab = (key, s, at, an, st, w) => g.label(key, bg(s), [clamp(at[0], 4, W - w - 4), clamp(at[1], 12, H - 12)], an, st);
    const out = (t, d) => { const L = Math.hypot(t[0] - O[0], t[1] - O[1]) || 1; return [t[0] + d * (t[0] - O[0]) / L, t[1] + d * (t[1] - O[1]) / L]; };
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((v, k) => {
      const t = pr(v);
      g.arrow(O, t, { color: C.axis, w: 1.5 });
      lab('ax' + k, sm(`dim ${k + 1}`, 17), out(t, 22), 'c', { color: '#555' }, 48);
    });
    const tips = CBT.words.map((w, k) => pr(unit(CBT.traj[e][k])));
    CBT.words.forEach((w, k) => {
      const col = C[TOYC[k < 3 ? 0 : 1]];
      g.path(CBT.traj.slice(0, e + 1).map(T => pr(unit(T[k]))), { color: col, w: 1.5, opacity: 0.35 });
      g.arrow(O, tips[k], { color: col, w: 2.5 });
    });
    TOYG.forEach((grp, gi) => {
      const col = C[TOYC[gi]], pts = grp.map(k => tips[k]);
      const spread = Math.max(...pts.flatMap(a => pts.map(b => Math.hypot(a[0] - b[0], a[1] - b[1])))), merged = spread < 40;
      const mean = [0, 1].map(i => pts.reduce((s, q) => s + q[i], 0) / 3), atg = out(mean, 14);
      // merged: the three names stacked at the group's tip; otherwise each at its own tip
      grp.forEach((k, j) => { const at = merged ? [atg[0], atg[1] + 20 * j] : out(tips[k], 12);
        lab('w' + k, sm(CBT.words[k], 18), at, at[0] >= O[0] ? 'l' : 'r', { color: col }, 70); });
    });
    g.label('ep', sm(`epoch ${e}`, 20), [6, 505], 'l', { color: '#555' });
  }
};
// Slide 22: the same run's average loss per blank, and the mean cosines within and across the two groups,
// per epoch; s (0 to the last epoch) is the epoch reached, v fades the figure in.
const TB1 = box2d(56, 52, 180, 230, 0, 60, 0, 3.2), TB2 = box2d(320, 52, 180, 230, 0, 60, -1, 1);
FIGS.toycurves = {
  size: [520, 360], duration: 2200, linear: true,
  draw(g, p) {
    const vis = clamp(p.v ?? 1), E = CBT.loss.length - 1, s = clamp(p.s ?? E, 0, E), n = Math.floor(s);
    const pts = arr => arr.slice(0, n + 1).map((v, t) => [t, v]);
    g.group({ opacity: vis }, () => {
      for (const [B, yt] of [[TB1, [0, 1, 2, 3]], [TB2, [-1, 0, 1]]]) {
        const P = g.plot(B);
        P.line([0, B.ylo], [E, B.ylo], { color: C.axis, w: 1.5 }); P.line([0, B.ylo], [0, B.yhi], { color: C.axis, w: 1.5 });
        if (B.ylo < 0) P.line([0, 0], [E, 0], { color: C.grid, w: 1.5 });
        for (const v of yt) P.text([0, v], neg(v), { anchor: 'end', dx: -7, dy: 5 });
        for (const v of [0, 30, 60]) P.text([v, B.ylo], String(v), { dy: 20 });
      }
      const P1 = g.plot(TB1), P2 = g.plot(TB2);
      P1.path(pts(CBT.loss), { color: C.pred, w: 3 }); P1.dot([n, CBT.loss[n]], { color: 'pred', r: 6 });
      P2.path(pts(CBT.within), { color: C.ink, w: 3 }); P2.dot([n, CBT.within[n]], { color: 'ink', r: 6 });
      P2.path(pts(CBT.across), { color: C.rose, w: 3 }); P2.dot([n, CBT.across[n]], { color: 'rose', r: 6 });
    });
    const P1 = g.plot(TB1), P2 = g.plot(TB2);
    P1.label('tl', sm('average loss per blank', 18), [0, 3.2], 'bl', { dy: -10, color: '#333', opacity: vis });
    P2.label('tc', sm('mean cosine', 18), [0, 1], 'bl', { dy: -10, color: '#333', opacity: vis });
    for (const [P, k] of [[P1, 'a'], [P2, 'b']]) P.label(k + 'x', sm('epoch', 17), [30, P === P1 ? 0 : -1], 't', { dy: 28, color: '#444', opacity: vis });
    P1.label('lv', sm(f3(CBT.loss[n]), 17), [n, CBT.loss[n]], n ? 'b' : 'l', { dx: n ? 0 : 10, dy: n ? -10 : 0, color: C.pred, opacity: vis });
    P2.label('wv', sm(`within: ${f3(CBT.within[n])}`, 17), [n, CBT.within[n]], n > 30 ? 'tr' : 'l', { dx: n > 30 ? -2 : 10, dy: n > 30 ? 10 : -12, color: C.ink, opacity: vis });
    P2.label('cv', sm(`across: ${f3(CBT.across[n])}`, 17), [n, CBT.across[n]], n > 30 ? 'tr' : 'l', { dx: n > 30 ? -2 : 10, dy: n > 30 ? 12 : 12, color: C.rose, opacity: vis });
  }
};


// ---------------------------------------------------------------- slide 23: skip-gram with negative sampling
FIGS.sgns = {
  size: [520, 300],
  draw(g, p) {
    const rows = [['grocery', 1], ['theorem', 0], ['violin', 0]];
    g.label('hw', sm('word', 18), [70, 24], 'c', { color: '#666' });
    g.label('hc', sm('context', 18), [230, 24], 'c', { color: '#666' });
    g.label('hl', sm('label', 18), [360, 24], 'c', { color: '#666' });
    rows.forEach(([c, y], i) => {
      const yy = 74 + i * 78, real = y === 1, col = real ? C.like : C.mle;
      chip(g, 12, yy, 116, 42, { fill: C.postC, fo: 0.15, stroke: C.postC });
      monoText(g, [70, yy], 'oranges', 19);
      chip(g, 166, yy, 128, 42, { fill: real ? '#eef6ee' : '#f1f1f1', stroke: col });
      monoText(g, [230, yy], c, 19);
      g.el('circle', { cx: 360, cy: yy, r: 19, fill: col });
      g.text([360, yy + 7], String(y), { size: 21, color: '#fff' });
      g.label('lb' + i, sm(real ? 'from the text' : 'random', 18), [392, yy], 'l', { color: col });
    });
    g.el('path', { d: 'M 456 108 L 464 108 L 464 254 L 456 254', fill: 'none', stroke: C.mle, 'stroke-width': 2 });
    g.label('k', sm('$k=2$', 18), [470, 181], 'l', { color: C.mle });
    g.label('cap', sm('illustrative pairs: the random contexts are drawn from the vocabulary', 16), [260, 282], 'c', { color: '#666' });
  }
};

// ---------------------------------------------------------------- slide 25: SGNS against PMI, computed
// Skip-gram with negative sampling (k = 5, window 2) trained on Jane Austen's Emma; 600 of the
// 3,584 word-context pairs seen at least 20 times (sgns_pmi.py), dot product against PMI - ln k.
const SGP_N = [['mr', 'knightley', 1.96, 2.16], ['frank', 'churchill', 3.37, 3.58], ['of', 'the', -0.41, -0.27]];
FIGS.sgnspmi = {
  size: [520, 470],
  draw(g, p) {
    const op = p.sp ?? 1, on = Math.min(op, p.nm ?? 1), P = g.plot(box2d(70, 30, 400, 360, -3.6, 5, -3.6, 5));
    g.group({ opacity: op }, () => {
      P.axes({ grid: false, xt: [-2, 2, 4], yt: [-2, 2, 4], names: ['', ''] });
      P.line([-3.6, -3.6], [5, 5], { color: C.mle, w: 2, dash: '7 5' });
      P.cloud(SGP, { r: 3, color: 'prior', fo: 0.35 });
    });
    SGP_N.forEach(([w, c, x, y]) => P.dot([x, y], { color: 'postC', r: 6, opacity: on }));
    P.label('xl', sm('$\\PMI(w,c)-\\ln k$, from the counts', 18), [5, -3.6], 'tr', { dy: 8, color: '#444', opacity: op });
    P.label('yl', sm('$\\langle\\bu_w,\\bc_c\\rangle$, after training', 18), [0, 5], 'l', { dx: 10, dy: 4, color: '#444', opacity: op });
    P.label('id', sm('equal', 17), [4.6, 4.6], 'l', { dx: 4, dy: 16, color: C.mle, opacity: op });
    // (frank, churchill) sits near the right edge: its label goes to the left of the dot, start-anchored
    SGP_N.forEach(([w, c, x, y], i) => P.label('nm' + i, sm(`(${w}, ${c})`, 17), [x, y], 'l', { dx: i === 1 ? -135 : 12, dy: i === 1 ? -20 : 14, color: '#8a5a00', opacity: on }));
  }
};

// ---------------------------------------------------------------- slide 30: a reader looks at a few words (illustrative)
FIGS.star = {
  size: [470, 360],
  draw(g, p) {
    const c = [220, 180], nb = [['season', 410, 70, 8], ['favorite', 370, 290, 5], ['is', 50, 100, 1.5], ['my', 90, 290, 1.5]];
    nb.forEach(([w, x, y, wd], i) => {
      const a = Math.atan2(y - c[1], x - c[0]), r0 = 46, r1 = 30;
      g.arrow([c[0] + r0 * Math.cos(a), c[1] + r0 * Math.sin(a)], [x - r1 * Math.cos(a), y - r1 * Math.sin(a)],
        { color: wd > 2 ? C.teal : '#aaa', w: wd, head: 10 + 1.4 * wd, opacity: p.a });
      g.label('n' + i, w, [x, y], 'c', { color: wd > 2 ? C.teal : '#888', opacity: p.a });
    });
    g.label('sp', '<b>spring</b>', c, 'c');
    g.label('cap', sm('a sketch of a reader, not of a model:<br>the thicker the arrow, the more attention', 16), [235, 358], 'b', { color: '#666', opacity: p.a });
  }
};

// ---------------------------------------------------------------- slides 31 to 33: attention as a weighted average
const WA = [
  { w: ['old', 'spring', 'couch', 'soft'], v: [[1, 0], [1, 1], [1, 3], [0, 2]] },
  { w: ['The', 'spring', 'season', 'blooms'], v: [[1, 0], [2, 1], [2, 3], [0, 2]] }
];
const ALPHA = [0.1, 0.1, 0.5, 0.3];   // given weights from "spring"
const WAL = [[[14, -16, 'l'], [12, 12, 'l'], [12, -2, 'l'], [0, -28, 'b']], [[14, -16, 'l'], [12, 12, 'l'], [12, -2, 'l'], [0, -28, 'b']]];
function wavgPlot(g, B, set, o) {
  const P = g.plot(B), S = WA[set], pt = o.pt ?? 1;
  // the axes frame the plot (crossing at -0.45), so no point or weight circle covers a tick
  P.axes({ xt: [0, 1, 2], yt: [0, 1, 2, 3], ox: -0.45, oy: -0.45, names: ['', ''], opacity: pt });
  S.v.forEach((v, j) => {
    P.dot(v, { r: Math.max(0.01, 40 * Math.sqrt(ALPHA[j])) * (o.r ?? 1), color: 'teal', fo: 0.2, stroke: C.teal, 'stroke-width': 1.5, opacity: o.w * pt });
    P.dot(v, { r: 6, color: j === 1 ? 'ink' : '#666', opacity: pt });
    const [dx, dy, an] = WAL[set][j];
    P.label(o.key + 'w' + j, S.w[j] + (o.w > 0.5 && o.showA ? sm(` ${f2(ALPHA[j])}`, 17) : ''), v, an, { dx, dy, color: j === 1 ? C.ink : '#444', opacity: pt });
  });
  return P;
}
const starD = (P, [x, y], r = 13) => {
  const [cx, cy] = P.px([x, y]); let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1); }
  return d + 'Z';
};
FIGS.wavg = {
  size: [470, 430], duration: 1200,
  draw(g, p) {
    const set = p.set ?? 0, B = box2d(40, 30, 380, 380, -0.6, 3.2, -0.6, 3.6);
    const P = wavgPlot(g, B, set, { key: 'a', w: p.w ?? 0, pt: p.pt ?? 1, showA: true });
    const vs = WA[set].v[1], vn = wsum(ALPHA, WA[set].v), n = clamp(p.n ?? 0), at = [lerp(vs[0], vn[0], n), lerp(vs[1], vn[1], n)];
    if (n > 0.01) {
      P.path([vs, at], { color: C.ink, w: 2, dash: '5 4', opacity: n });
      g.el('path', { d: starD(P, at, 15), fill: C.postC, stroke: '#fff', 'stroke-width': 1.5, opacity: n });
    }
    P.label('nv', `$\\bv^{\\text{new}}_{\\text{spring}}=(${f2(vn[0])},\\,${f2(vn[1])})$`, vn, 'l', { dx: 20, dy: 0, color: '#8a5a00', opacity: n > 0.98 ? 1 : 0 });
  }
};

// ---------------------------------------------------------------- slide 34: query, key and value with W = I
const QK_S = WA[1].v.map(v => dot(v, WA[1].v[1]));          // <q_spring, k_j> = (2, 5, 7, 2)
const QK_A = softmax(QK_S.map(s => s / Math.SQRT2));       // (0.022, 0.187, 0.768, 0.022)
const QK_N = wsum(QK_A, WA[1].v);                          // (1.93, 2.54)
const QB1 = box2d(80, 40, 420, 96, 0.4, 4.6, 0, 7.5), QB2 = box2d(80, 214, 420, 96, 0.4, 4.6, 0, 1);
FIGS.qkv = {
  size: [560, 576],
  draw(g, p) {
    const st = p.st ?? 0, names = WA[1].w.map(w => sm(w, 18)), o1 = st >= 1 ? 1 : 0, op = st >= 2 ? 1 : 0;
    barPanel(g, QB1, names, QK_S, { key: 's', color: 'mle', yt: [0, 5], width: 0.5, title: sm('scores $\\langle\\cq{\\bq}_{\\text{spring}},\\ck{\\bk}_j\\rangle$', 19), lab: v => String(v), opacity: o1 });
    upArrow(g, 290, 168, 196, { opacity: o1 });
    g.label('sm', sm('$\\div\\sqrt2$, softmax', 18), [302, 182], 'l', { color: '#555', opacity: o1 });
    barPanel(g, QB2, names, QK_A, { key: 'a', color: 'teal', yt: [0, 1], width: 0.5, title: sm('weights $\\cat{\\alpha}_{\\text{spring},j}$', 19), lab: v => f3(v), opacity: o1 });
    // the weighted average, against the given weights' result (dashed star)
    const B = box2d(170, 356, 240, 190, -0.4, 2.8, -0.4, 3.4), P = g.plot(B), gv = wsum(ALPHA, WA[1].v);
    g.group({ opacity: op }, () => {
      P.axes({ xt: [1, 2], yt: [1, 2, 3], names: ['', ''] });
      WA[1].v.forEach((v, j) => P.dot(v, { r: 5, color: j === 1 ? 'ink' : '#666' }));
      g.el('path', { d: starD(P, gv, 11), fill: 'none', stroke: C.postC, 'stroke-width': 2, 'stroke-dasharray': '4 3' });
      g.el('path', { d: starD(P, QK_N, 13), fill: C.postC, stroke: '#fff', 'stroke-width': 1.5 });
    });
    WA[1].w.forEach((w, j) => P.label('pw' + j, sm(w, 16), WA[1].v[j], j === 3 ? 'b' : 'l', { dx: j === 3 ? 0 : 9, dy: j === 3 ? -9 : j === 0 ? -12 : j === 2 ? -10 : 8, color: '#444', opacity: op }));
    P.label('nq', sm(`$(${f2(QK_N[0])},\\,${f2(QK_N[1])})$`, 18), QK_N, 'l', { dx: 14, dy: 12, color: '#8a5a00', opacity: op });
    g.label('ng', sm('solid star: these weights; dashed: slide 33’s', 16), [290, 566], 'c', { color: '#8a5a00', opacity: op });
  }
};

// ---------------------------------------------------------------- slide 36: why divide by sqrt(d)
// One seeded draw: a query and 16 keys with independent N(0, 1) coordinates, d = 64. Seed 20262337
// is a typical draw: its largest weight (key 12) is 0.924 unscaled and 0.226 scaled, near the medians over
// 2,000 seeds of this generator (0.925, 0.222; means 0.842 and 0.244).
// sc runs 0 (unscaled) -> 1 (divided by sqrt(d) = 8); the divisor moves from 1 to 8 between.
const SQ = (() => { const z = normals(20262337, 17 * 32).flat(), q = z.slice(0, 64), s = [];
  for (let j = 0; j < 16; j++) s.push(dot(q, z.slice(64 + 64 * j, 128 + 64 * j))); return s; })();
const SQB = box2d(66, 48, 380, 250, 0.3, 16.7, 0, 1);
FIGS.sqrtd = {
  size: [540, 380], duration: 1200,
  draw(g, p) {
    const sc = clamp(p.sc ?? 0), div = 1 + 7 * sc, a = softmax(SQ.map(s => s / div)), P = g.plot(SQB);
    const order = SQ.map((_, j) => j);
    P.line([0.3, 0], [16.7, 0], { color: C.axis, w: 1.5 });
    P.line([0.3, 0], [0.3, 1], { color: C.axis, w: 1.5 });
    for (const v of [0, 0.5, 1]) P.text([0.3, v], String(v), { anchor: 'end', dx: -7, dy: 5 });
    P.line([0.3, 1 / 16], [16.7, 1 / 16], { color: C.mle, w: 1.5, dash: '6 4' });
    P.label('u', sm('uniform,<br>$1/16$', 16), [16.7, 1 / 16], 'l', { dx: 8, color: C.mle });
    P.bars(order.map(j => j + 1), a, { color: 'teal', width: 0.66 });
    P.label('xl', sm('16 keys', 17), [8.5, 0], 't', { dy: 8, color: '#444' });
    P.label('yl', sm('attention weight', 17), [0.3, 1], 'bl', { dy: -10, color: '#444' });
    g.label('st', sc < 0.5 ? 'scores $\\langle\\bq_i,\\bk_j\\rangle$, unscaled' : 'scores $\\langle\\bq_i,\\bk_j\\rangle/\\sqrt{64}$', [96, 62], 'tl', { color: C.teal });
    g.label('cap', sm('one random draw, $d=64$', 16), [96, 96], 'tl', { color: '#666' });
  }
};

// ---------------------------------------------------------------- slide 35: the draw's scores
// The 16 scores of slide 36's draw on one axis, against one standard deviation sqrt(64) = 8;
// dots in rows so that close scores do not overlap.
FIGS.sqscore = {
  size: [540, 280],
  draw(g, p) {
    const op = clamp(p.v ?? 1), B = box2d(30, 40, 480, 160, -21, 21, 0, 1), P = g.plot(B);
    const rows = [], at = SQ.map((s, j) => [s, j]).sort((a, b) => a[0] - b[0]).map(([s]) => {
      let r = 0; while (rows[r] != null && s - rows[r] < 1.3) r++; rows[r] = s; return [s, r]; });
    g.group({ opacity: op }, () => {
      P.rect([-8, 0.08], [8, 0.92], { color: C.teal, opacity: 0.1 });
      P.line([-21, 0.25], [21, 0.25], { color: C.axis, w: 1.5 });
      for (const v of [-16, -8, 0, 8, 16]) { P.line([v, 0.22], [v, 0.28], { color: C.axis, w: 1.5 }); P.text([v, 0.25], neg(v), { dy: 24 }); }
      at.forEach(([s, r]) => P.dot([s, 0.36 + 0.13 * r], { color: 'teal', r: 6 }));
    });
    g.label('tt', sm('16 scores $\\langle\\bq_i,\\bk_j\\rangle$ of one random draw, $d=64$', 17), [30, 18], 'l', { color: '#333', opacity: op });
    g.label('sd', sm('shaded: within $\\pm\\sqrt{64}=\\pm8$, one standard deviation', 17), [30, 250], 'l', { color: C.teal, opacity: op });
  }
};

// ---------------------------------------------------------------- slide 39: the causal mask
const MASK_U = WA[1].v.map(x => softmax(WA[1].v.map(v => dot(v, x) / Math.SQRT2)));
const MASK_M = WA[1].v.map((x, i) => { const s = WA[1].v.map((v, j) => j <= i ? dot(v, x) / Math.SQRT2 : -Infinity); return softmax(s); });
FIGS.mask = {
  size: [540, 400], duration: 1000,
  draw(g, p) {
    const m = clamp(p.m ?? 0), M = MASK_U.map((r, i) => r.map((v, j) => lerp(v, MASK_M[i][j], m)));
    const x0 = 130, y0 = 70, cell = 74, w = WA[1].w;
    heatGrid(g, 'h', x0, y0, cell, M, w, w, { mask: (i, j) => j > i, maskOpacity: m });
    g.label('rl', sm('position $i$ (query)', 17), [x0 - 10, y0 + 4 * cell + 26], 'r', { color: '#666' });
    g.label('cl', sm('position $j$ (key)', 17), [x0 + 2 * cell, 20], 'c', { color: '#666' });
    const pr = clamp(p.pr ?? 0), nx = ['spring', 'season', 'blooms', '.'];
    nx.forEach((s, i) => {
      const y = y0 + (i + 0.5) * cell;
      g.arrow([x0 + 4 * cell + 10, y], [x0 + 4 * cell + 44, y], { color: C.pred, w: 2, opacity: pr });
      g.label('nx' + i, sm(s, 19), [x0 + 4 * cell + 52, y], 'l', { color: C.pred, opacity: pr });
    });
    g.label('nxl', sm('predicts', 17), [x0 + 4 * cell + 52, y0 - 8], 'bl', { color: C.pred, opacity: pr });
  }
};

// ---------------------------------------------------------------- slide 40: positions
FIGS.perm = {
  size: [510, 445], duration: 1000,
  draw(g, p) {
    const r = clamp(p.r ?? 0), w = WA[1].w;
    const row = (y, order, op, key) => {
      const xs = [70, 190, 320, 450];
      order.forEach((j, k) => {
        const x = xs[k], hgt = 110 * QK_A[j];
        g.el('rect', { x: x - 22, y: y - 34 - hgt, width: 44, height: hgt, fill: C.teal, 'fill-opacity': 0.55, stroke: C.teal, 'stroke-width': 1.5, opacity: op });
        g.text([x, y - 40 - hgt], f3(QK_A[j]), { size: 17, color: C.teal, opacity: op });
        chip(g, x - 52, y, 104, 40, { fill: j === 1 ? C.postC : '#f4f2ee', fo: j === 1 ? 0.18 : 1, stroke: j === 1 ? C.postC : '#8a8478', opacity: op });
        g.label(key + k, w[j], [x, y], 'c', { opacity: op });
      });
      g.label(key + 'n', sm(`new vector of “spring”: $(${f2(QK_N[0])},\\,${f2(QK_N[1])})$`, 19), [260, y + 40], 'c', { color: '#8a5a00', opacity: op });
    };
    row(176, [0, 1, 2, 3], 1, 'a');
    row(390, [3, 2, 1, 0], r, 'b');
    g.label('wt', sm('weights from “spring”', 17), [0, 22], 'l', { color: C.teal });
  }
};

// ---------------------------------------------------------------- slide 43: the transformer block
// Drawn bottom up: tokens, embeddings, L blocks (norm, masked attention, add; norm, MLP, add), output.
FIGS.block = {
  size: [500, 576],
  draw(g, p) {
    const x = 120, w = 260, cx = x + w / 2, pa = clamp(p.pa ?? 0);
    const plus = y => { g.el('circle', { cx, cy: y, r: 13, fill: '#fff', stroke: '#444', 'stroke-width': 1.8 });
      g.el('path', { d: `M${cx - 7},${y}H${cx + 7}M${cx},${y - 7}V${y + 7}`, stroke: '#444', 'stroke-width': 1.8 }); };
    g.label('out', '$p(w_{t+1}\\mid w_{1:t})$', [cx, 16], 'c', { color: C.pred });
    upArrow(g, cx, 58, 34);
    boxNode(g, 'fin', x, 60, w, 40, sm('norm, linear, softmax', 19), { fill: '#f3eef6', stroke: C.pred });
    upArrow(g, cx, 145, 104);
    g.el('rect', { x: x - 40, y: 136, width: w + 80, height: 352, rx: 14, fill: '#faf9fc', stroke: '#463C7D', 'stroke-width': 2, 'stroke-dasharray': '9 6' });
    g.label('L', '$\\times L$', [x + w + 48, 152], 'l', { color: '#463C7D' });
    plus(158);
    upArrow(g, cx, 196, 172);
    boxNode(g, 'mlp', x, 196, w, 42, sm('MLP at each position', 19), { fill: '#fff4e0', stroke: C.postC });
    upArrow(g, cx, 262, 240);
    boxNode(g, 'n2', x + 60, 262, w - 120, 26, sm('layer norm', 16), { fill: '#f1f1f1' });
    upArrow(g, cx, 305, 290);
    plus(318);
    upArrow(g, cx, 356, 332);
    boxNode(g, 'att', x, 356, w, 42, sm('masked multi-head attention', 19), { fill: '#e6f2f2', stroke: C.teal });
    upArrow(g, cx, 422, 400);
    boxNode(g, 'n1', x + 60, 422, w - 120, 26, sm('layer norm', 16), { fill: '#f1f1f1' });
    upArrow(g, cx, 500, 450);
    // residual connections: around each sublayer to its plus
    g.path([[cx, 470], [x - 18, 470], [x - 18, 318], [cx - 13, 318]], { color: '#444', w: 1.8 });
    g.path([[cx, 298], [x - 18, 298], [x - 18, 158], [cx - 13, 158]], { color: '#444', w: 1.8 });
    g.label('res', sm('residual', 16), [x - 24, 236], 'r', { color: '#444' });
    boxNode(g, 'emb', x, 502, w, 40, sm('embeddings + positions', 19), { fill: '#e9eef7', stroke: C.prior });
    upArrow(g, cx, 566, 546);
    g.label('tok', sm('tokens $w_{1:t}$', 18), [cx + 10, 566], 'l', { color: '#444' });
    // parameters per block
    g.label('pm', sm('$8d^2$', 21), [x + w + 50, 217], 'l', { color: '#8a5a00', opacity: pa });
    g.label('pa', sm('$4d^2$', 21), [x + w + 50, 377], 'l', { color: C.teal, opacity: pa });
  }
};

// ---------------------------------------------------------------- slide 44: the KV cache
// One layer: the cached keys and values, the new token's query, and its weights over the cache.
FIGS.kv = {
  size: [560, 430], duration: 1100,
  draw(g, p) {
    const s = clamp(p.s ?? 0), c = clamp(p.c ?? 1), words = ['Tomorrow', 'it', 'will', 'rain', 'today'], dx = 104, x0 = 62;
    const yv = 120, yk = 172, yq = 262, yw = 316, n = s > 0.5 ? 4 : 3;   // cached tokens; the new one is at index n
    words.forEach((w, j) => {
      if (j > n) return;
      const x = x0 + j * dx, isNew = j === n, op = j === 4 ? s : isNew ? c : 1;
      const kst = isNew ? { fill: '#fff', stroke: C.prior, 'stroke-dasharray': '5 4' } : { fill: C.prior, fo: 0.18, stroke: C.prior };
      const vst = isNew ? { fill: '#fff', stroke: C.like, 'stroke-dasharray': '5 4' } : { fill: C.like, fo: 0.18, stroke: C.like };
      g.group({ opacity: op }, () => {
        chip(g, x - 34, yv, 68, 42, vst); chip(g, x - 34, yk, 68, 42, kst);
      });
      g.label('v' + j, '$\\cv{\\bv}$', [x, yv], 'c', { opacity: op });
      g.label('k' + j, '$\\ck{\\bk}$', [x, yk], 'c', { opacity: op });
      g.label('w' + j, sm(w, 19), [x, yw], 'c', { opacity: op, color: isNew ? C.post : '#333' });
    });
    // the new token's query attends to every key so far, its own included
    const qx = x0 + n * dx;
    g.group({ opacity: c }, () => {
      for (let j = 0; j <= n; j++) g.path([[qx, yq - 22], [x0 + j * dx, yk + 22]], { color: C.teal, w: 2, opacity: 0.8 });
      chip(g, qx - 34, yq, 68, 42, { fill: '#fff', stroke: C.post, 'stroke-dasharray': '5 4' });
      g.el('rect', { x: x0 - 48, y: yv - 34, width: (n - 1) * dx + 96, height: yk - yv + 68, rx: 12, fill: 'none', stroke: '#463C7D', 'stroke-width': 2 });
    });
    g.label('qn', '$\\cq{\\bq}$', [qx, yq], 'c', { opacity: c });
    g.label('cache', 'KV cache', [x0 - 48, yv - 40], 'bl', { color: '#463C7D', opacity: c });
    g.label('new', sm('new token', 18), [qx, yv - 40], 'b', { color: C.post, opacity: c });
    g.label('lay', sm('one layer shown; every layer keeps its own cache', 17), [270, 380], 'c', { color: '#666', opacity: c });
  }
};

// ---------------------------------------------------------------- slide 45: long contexts
// One key with score 3 among n - 1 at -2: alpha = 1 / (1 + (n - 1) e^{-5}).
const dil = n => 1 / (1 + (n - 1) * Math.exp(-5));
const DLB = box2d(64, 40, 410, 260, 0, 4.3, 0, 1);
FIGS.dilute = {
  size: [500, 380],
  draw(g, p) {
    const P = g.plot(DLB);
    P.line([0, 0], [4.3, 0], { color: C.axis, w: 1.5 }); P.line([0, 0], [0, 1], { color: C.axis, w: 1.5 });
    for (const v of [0, 0.5, 1]) P.text([0, v], String(v), { anchor: 'end', dx: -7, dy: 5 });
    ['1', '10', '100', '1,000', '10,000'].forEach((s, k) => { P.line([k, 0], [k, -0.025], { color: C.axis }); P.text([k, 0], s, { dy: 22 }); });
    P.label('xl', sm('context length $n$ (log scale)', 17), [2.15, 0], 't', { dy: 34, color: '#444' });
    P.label('yl', sm('weight $\\alpha$ of the relevant key (toy scores: 3 against $-2$)', 17), [0, 1], 'bl', { dy: -10, color: '#444' });
    P.line([0, 0.5], [4.3, 0.5], { color: C.mle, w: 1.5, dash: '6 4', opacity: p.g ?? 0 });
    P.label('gl', sm('gap $\\ln(n-1)$: $\\alpha=\\tfrac12$', 17), [0.1, 0.5], 'tl', { dy: 6, color: C.mle, opacity: p.g ?? 0 });
    P.curve(L => dil(10 ** L), { color: 'teal', from: 0, to: 4.3 });
    [[1, 'r', -8, 16], [2, 'l', 10, 2], [3, 'l', 10, -10], [4, 'b', 0, -10]].forEach(([k, an, dx, dy]) => {
      const a = dil(10 ** k);
      P.dot([k, a], { color: 'teal', r: 7 });
      P.label('d' + k, sm(k < 4 ? f2(a) : f3(a), 18), [k, a], an, { dx, dy, color: C.teal });
    });
    if (p.ln != null && !PRINT) {
      const n = Math.round(10 ** p.ln), a = dil(n);
      P.dot([Math.log10(n), a], { color: 'ink', r: 6 });
      const out = g.root.closest('section')?.querySelector('.v-n');
      if (out) out.innerHTML = `$n=${n.toLocaleString('en-US').replace(/,/g, '{,}')}$, $\\alpha=${a.toPrecision(2)}$`.replace(/\$([^$]*)\$/g, (_, t) => katex.renderToString(t));
    }
  }
};

// ---------------------------------------------------------------- slide 46: generation and temperature
// Logits (ln 2, 0, 0) for rain, snow, clear, as in 32-3's exercise; T = 10^lT.
const LN2 = Math.log(2);
const tempOf = lT => +(10 ** lT).toPrecision(2);
const GTB = box2d(80, 300, 380, 200, 0.4, 3.6, 0, 1);
FIGS.gen = {
  size: [540, 576], duration: 1100,
  draw(g, p) {
    // the loop: context -> model -> distribution -> sample -> append
    const ctx = ['Tomorrow', 'it', 'will'], ww = [112, 46, 58]; let x = 20;
    ctx.forEach((w, i) => { chip(g, x, 34, ww[i], 40); g.label('c' + i, sm(w, 19), [x + ww[i] / 2, 34], 'c'); x += ww[i] + 6; });
    const sx = x + 8, sw = 70, sp = clamp(p.sp ?? 0);
    g.group({ opacity: sp }, () => { chip(g, sx, 34, sw, 40, { fill: C.postC, fo: 0.18, stroke: C.postC }); });
    g.label('cn', sm('rain', 19), [sx + sw / 2, 34], 'c', { opacity: sp });
    upArrow(g, 120, 56, 92);
    boxNode(g, 'm', 30, 96, 180, 48, sm('transformer', 19), { fill: '#e7e4ee', stroke: '#463C7D' });
    g.group({ opacity: sp }, () => {
      g.arrow([212, 120], [262, 120], { color: '#666', w: 2 });
      g.path([[384, 120], [470, 120], [470, 34], [sx + sw + 14, 34]], { color: '#666', w: 2, dash: '6 5' });
      g.arrow([sx + sw + 16, 34], [sx + sw + 4, 34], { color: '#666', w: 2 });
    });
    g.label('pd', sm('$p(\\cdot\\mid w_{1:t-1})$', 18), [270, 120], 'l', { color: C.pred, opacity: sp });
    g.label('smp', sm('sample, append, repeat', 17), [500, 144], 'tr', { color: '#555', opacity: sp });
    // temperature
    const T = tempOf(p.lT ?? 0), q = softmax([LN2 / T, 0, 0]), op = clamp(p.tp ?? 0);
    barPanel(g, GTB, ['rain', 'snow', 'clear'], q, { key: 't', yt: [0, 0.5, 1], title: 'toy logits $(\\ln 2,0,0)$: $p_T(k)$', lab: v => f3(v).replace(/0+$/, '').replace(/\.$/, ''),
      ghost: Math.abs(T - 1) > 1e-9 ? softmax([LN2, 0, 0]) : null, opacity: op });
    g.label('T', `$T=${T === 0.5 ? '1/2' : T}$`, [GTB.x0 + GTB.W + 6, GTB.y0 + 4], 'tr', { color: C.pred, opacity: op });
    g.label('Tg', sm('dashed: $T=1$', 17), [GTB.x0 + GTB.W + 6, GTB.y0 + 38], 'tr', { color: '#666', opacity: op * (Math.abs(T - 1) > 1e-9 ? 1 : 0) });
  }
};

// ---------------------------------------------------------------- slide 26: GloVe groups and cities, computed
// Both panels: GloVe vectors (D = 100) on the first two principal components of the words
// shown (glove_figs.py). v: 0 the 32 words of four groups, 1 the 34 cities with their countries.
const GGRP = { animals: ['dog', 'cat', 'puppy', 'kitten', 'tiger', 'lion', 'elephant', 'horse'],
  vehicles: ['car', 'truck', 'plane', 'boat', 'bicycle', 'motorcycle', 'train', 'bus'],
  foods: ['pizza', 'bread', 'apple', 'pasta', 'banana', 'cheese', 'rice', 'soup'],
  countries: ['france', 'japan', 'italy', 'germany', 'spain', 'brazil', 'china', 'egypt'] };
const GGC = { animals: 'teal', vehicles: 'brown', foods: 'postC', countries: 'prior' };
const GCITY_LAB = ['paris', 'france', 'london', 'britain', 'tokyo', 'japan', 'beijing', 'china'];
FIGS.glovemap = {
  size: [640, 470], duration: 1000,
  draw(g, p) {
    const v = clamp(p.v ?? 0), oa = (1 - v) * clamp(p.a ?? 1), ob = v;
    // panel A
    const A = g.plot(box2d(30, 60, 560, 360, -4.2, 4.0, -3.6, 3.4));
    g.group({ opacity: oa }, () => A.axes({ grid: false, names: ['', ''] }));
    let k = 0;
    const items = [];
    for (const grp in GGRP) {
      GGRP[grp].forEach(w => { A.dot(GCL[w], { color: GGC[grp], r: 6, opacity: oa }); items.push(['a' + w, w, ...A.px(GCL[w]), grp]); });
      g.label('lg' + grp, sm(grp, 18), [70 + 140 * k++, 30], 'l', { color: GGC[grp], opacity: oa });
    }
    placeLabels(items.map(q => q.slice(0, 4))).forEach(([key, w, at, an], i) =>
      g.label(key, sm(w, 16), at, an, { color: GGC[items[i][4]], opacity: oa }));
    // panel B
    const Bp = g.plot(box2d(30, 60, 560, 360, -3.5, 4.0, -3.3, 3.4));
    g.group({ opacity: ob }, () => {
      Bp.axes({ grid: false, names: ['', ''] });
      GCITY.forEach(([c, n, eu, x1, y1, x2, y2]) => Bp.line([x1, y1], [x2, y2], { color: '#bbb', w: 1 }));
      GCITY.forEach(([c, n, eu, x1, y1, x2, y2]) => {
        Bp.dot([x1, y1], { color: eu ? 'teal' : 'brown', r: 5 });
        Bp.rect([x2 - 0.07, y2 - 0.08], [x2 + 0.07, y2 + 0.08], { color: eu ? C.teal : C.brown, fill: '#fff', stroke: eu ? C.teal : C.brown, 'stroke-width': 2 });
      });
    });
    const obs = GCITY.flatMap(([c, n, eu, x1, y1, x2, y2]) => [Bp.px([x1, y1]), Bp.px([x2, y2])]), col = {};
    const citems = GCITY.flatMap(([c, n, eu, x1, y1, x2, y2]) => { col[c] = col[n] = eu ? C.teal : C.brown;
      return [GCITY_LAB.includes(c) ? ['bc' + c, c, ...Bp.px([x1, y1])] : null, GCITY_LAB.includes(n) ? ['bn' + n, n, ...Bp.px([x2, y2])] : null].filter(Boolean); });
    placeLabels(citems, { obstacles: obs, r: 5 }).forEach(([key, w, at, an]) => g.label(key, sm(w, 16), at, an, { color: col[w], opacity: ob }));
    g.label('l1', sm('Europe', 18), [70, 30], 'l', { color: C.teal, opacity: ob });
    g.label('l2', sm('Asia', 18), [170, 30], 'l', { color: C.brown, opacity: ob });
    g.label('l3', sm('● city &nbsp; □ country, joined to its city', 18), [270, 30], 'l', { color: '#555', opacity: ob });
    g.label('pc', sm('the two directions along which these vectors vary most', 16), [310, 452], 'c', { color: '#666', opacity: Math.max(oa, ob) });
  }
};

// ---------------------------------------------------------------- slide 27: analogies, computed
// Cosine of each word's unit GloVe vector with u_king - u_man + u_woman (unit vectors, as gensim
// computes analogies), the six highest of 400,000 words (glove_figs.py).
FIGS.analogy = {
  size: [480, 380],
  draw(g, p) {
    const B = box2d(140, 56, 330, 270, 0, 1, 0.3, 6.7), P = g.plot(B);
    P.line([0, 0.3], [0, 6.7], { color: C.axis, w: 1.5 });
    P.line([0, 0.3], [1, 0.3], { color: C.axis, w: 1.5 });
    for (const v of [0, 0.5, 1]) P.text([v, 0.3], String(v), { dy: 20 });
    GAN.forEach(([w, c], i) => {
      const y = 6 - i, input = w === 'king';
      P.rect([0, y - 0.3], [c, y + 0.3], { color: input ? '#bdbdbd' : C.prior, opacity: input ? 1 : 0.6 });
      P.label('w' + i, input ? w + sm(' (input)', 15) : w, [0, y], 'r', { dx: -10, color: input ? '#888' : (w === 'queen' ? C.prior : '#333') });
      P.label('c' + i, sm(f3(c), 17), [c, y], 'l', { dx: 8, color: input ? '#888' : '#333' });
    });
    P.label('t', sm('cosine with $\\bu_{\\text{king}}-\\bu_{\\text{man}}+\\bu_{\\text{woman}}$ (unit vectors)', 18), [0, 6.7], 'bl', { dx: -120, dy: -14, color: '#333' });
  }
};

// ---------------------------------------------------------------- slide 41: contextual vectors, computed
// Cosine similarity of SmolLM2's vector at " spring" in six sentences, two per sense, after 0
// layers (the token embedding) and after 12 of its 30 layers (smol_demos.py).
const CTX12 = [[1, 0.96, 0.81, 0.79, 0.82, 0.81], [0.96, 1, 0.81, 0.78, 0.80, 0.80], [0.81, 0.81, 1, 0.92, 0.75, 0.75],
  [0.79, 0.78, 0.92, 1, 0.75, 0.74], [0.82, 0.80, 0.75, 0.75, 1, 0.97], [0.81, 0.80, 0.75, 0.74, 0.97, 1]];
const CTX0 = CTX12.map(r => r.map(() => 1));
const CTXL = ['C1', 'C2', 'S1', 'S2', 'W1', 'W2'];
FIGS.ctxvec = {
  size: [620, 350],
  draw(g, p) {
    const cell = 40, shade = v => (v - 0.7) / 0.3, o = { color: 'brown', shade, size: 15, colSize: 16 };
    heatGrid(g, 'a', 64, 80, cell, CTX0, CTXL, CTXL, o);
    heatGrid(g, 'b', 64 + 6 * cell + 72, 80, cell, CTX12, CTXL, CTXL, Object.assign({ opacity: p.r ?? 1 }, o));
    g.label('ta', sm('token embedding (0 layers)', 18), [64 + 3 * cell, 30], 'c', { color: '#333' });
    g.label('tb', sm('after 12 of the 30 layers', 18), [64 + 9 * cell + 72, 30], 'c', { color: '#333', opacity: p.r ?? 1 });
    g.label('cap', sm('cosine similarity of the vectors at “spring”; shading from 0.7 to 1', 16), [310, 338], 'c', { color: '#666' });
  }
};

// ---------------------------------------------------------------- summary icons
Object.assign(ICONS, {
  tok(svg) {
    [[14, 'low'], [58, 'est']].forEach(([x, t]) => {
      const w = t.length * 10 + 8;
      el(svg, 'rect', { x, y: 18, width: w, height: 28, rx: 6, fill: '#fbefd9', stroke: C.postC, 'stroke-width': 1.5 });
      el(svg, 'text', { x: x + w / 2, y: 37, 'text-anchor': 'middle', 'font-size': 15, 'font-family': MONO, fill: C.ink }).textContent = t;
    });
  },
  emb(svg) {
    el(svg, 'line', { x1: 10, y1: 56, x2: 104, y2: 56, stroke: C.axis, 'stroke-width': 1.5 });
    el(svg, 'line', { x1: 14, y1: 60, x2: 14, y2: 4, stroke: C.axis, 'stroke-width': 1.5 });
    [[78, 14, C.teal], [86, 24, C.teal], [44, 44, C.brown]].forEach(([x, y, c]) => {
      el(svg, 'line', { x1: 14, y1: 56, x2: x, y2: y, stroke: c, 'stroke-width': 2.5 });
      el(svg, 'circle', { cx: x, cy: y, r: 4, fill: c });
    });
  },
  att(svg) {
    for (let i = 0; i < 4; i++) for (let j = 0; j <= i; j++)
      el(svg, 'rect', { x: 30 + j * 14, y: 4 + i * 14, width: 13, height: 13, fill: C.teal, 'fill-opacity': j === i ? 0.85 : 0.25 + 0.15 * j });
  },
  tr(svg) {
    [44, 26, 8].forEach((y, i) => el(svg, 'rect', { x: 22, y, width: 70, height: 14, rx: 4, fill: i ? '#e6f2f2' : '#fff4e0', stroke: i ? C.teal : C.postC, 'stroke-width': 1.5 }));
    el(svg, 'text', { x: 98, y: 22, 'font-size': 14, fill: '#463C7D' }).textContent = '×L';
  }
});
