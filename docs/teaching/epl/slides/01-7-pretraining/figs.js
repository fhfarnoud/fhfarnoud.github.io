// Lecture 3, section 1. Uses the unmodified shared SVG scene/parameter engine.
// All token distributions are illustrative; no pretrained model is loaded.
Object.assign(MACROS, {
  '\\cL': '\\mathcal{L}', '\\cD': '\\mathcal{D}',
  '\\btheta': '\\boldsymbol{\\theta}'
});

const MONO = "Menlo, 'DejaVu Sans Mono', Consolas, monospace";
const small = (s, n = 20) => `<span style="font-size:${n}px">${s}</span>`;

function token(g, key, x, y, text, o = {}) {
  const w = o.w || 82, h = o.h || 36;
  g.el('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 6,
    fill: o.fill || '#f4f2ee', stroke: o.color || '#a29b90', 'stroke-width': o.active ? 2.5 : 1.2,
    opacity: o.opacity ?? 1 });
  g.text([x, y + 7], text, { size: o.size || 21, color: o.color || C.ink,
    'font-family': MONO, opacity: o.opacity ?? 1 });
}

function box(g, key, x, y, w, h, title, subtitle, color, opacity = 1) {
  g.el('rect', { x, y, width: w, height: h, rx: 9, fill: color,
    'fill-opacity': .055, stroke: color, 'stroke-width': 2, opacity });
  g.label(key, title, [x + w / 2, y + h / 2 - 13], 'c', { color, opacity });
  g.label(key + 's', small(subtitle), [x + w / 2, y + h / 2 + 22], 'c', { color: '#555', opacity });
}

FIGS.pretrainBridge = {
  size: [510, 510],
  draw(g, p) {
    const a = clamp(p.phase), b = clamp(p.phase - 1);
    g.label('corpus-title', 'Text corpus', [255, 20], 'c', { color: C.prior });
    ['The cat sat .', 'Rain fell overnight .', 'Plants need light .'].forEach((s, i) =>
      g.text([255, 64 + i * 30], s, { size: 22, color: C.ink, 'font-family': MONO }));
    g.arrow([255, 141], [255, 181], { color: C.prior, w: 2.5 });
    box(g, 'training', 45, 192, 420, 126, 'Pretraining',
      'transformer + likelihood + optimizer', C.postC);
    g.label('params', '$\\theta_0\\;\\longrightarrow\\;\\widehat\\theta$', [255, 352], 'c', { color: C.postC, opacity: .25 + .75 * a });
    g.arrow([255, 378], [255, 412], { color: C.like, w: 2.5, opacity: .18 + .82 * b });
    box(g, 'trained', 45, 423, 420, 82, 'Pretrained language model',
      '$p_{\\widehat\\theta}(w_t\\mid w_{<t})$', C.like, .18 + .82 * b);
  }
};

// One fixed sentence and a normalized toy distribution at each position.
const WORDS = ['The', 'cat', 'sat', '.'];
const VOCAB = ['The', 'cat', 'sat', '.', 'slept'];
const PROBS = [
  [.60, .10, .10, .10, .10],
  [.10, .55, .15, .10, .10],
  [.05, .05, .30, .10, .50],
  [.05, .05, .10, .70, .10]
];
FIGS.tokenLoss = {
  size: [540, 490],
  draw(g, p) {
    const t = Math.max(1, Math.min(4, Math.round(p.pos))), i = t - 1;
    const xs = [172, 270, 368, 466], input = ['<bos>', 'The', 'cat', 'sat'];
    g.label('input', small('input', 19), [23, 38], 'l', { color: '#555' });
    g.label('target', small('target', 19), [23, 97], 'l', { color: C.like });
    xs.forEach((x, j) => {
      token(g, 'in' + j, x, 38, input[j], { w: 88, color: j <= i ? C.prior : '#bbb', opacity: j <= i ? 1 : .35, active: j === i });
      g.arrow([x, 61], [x, 72], { color: j === i ? C.like : '#bbb', w: 1.5 });
      token(g, 'out' + j, x, 97, WORDS[j], { w: 88, color: j === i ? C.like : '#aaa', fill: j === i ? '#edf5ed' : '#f4f2ee', active: j === i });
    });
    g.label('tokens-note', small('Illustrative word tokens; <code>&lt;bos&gt;</code> marks the start.', 17), [278, 137], 'c', { color: '#666' });
    const prefix = i === 0 ? '\\text{<bos>}' : `\\text{${WORDS.slice(0, i).join(' ')}}`;
    g.label('conditional', `$p_\\theta(\\,\\cdot\\mid ${prefix})$`, [290, 184], 'c', { color: C.pred });
    const B = box2d(73, 230, 430, 155, .5, 5.5, 0, 1), P = g.plot(B), prob = PROBS[i];
    P.line([.5, 0], [.5, 1], { color: C.axis });
    P.line([.5, 0], [5.5, 0], { color: C.axis });
    [0, .5, 1].forEach(v => P.text([.5, v], String(v), { anchor: 'end', dx: -8, dy: 5 }));
    prob.forEach((v, j) => {
      const color = j === i ? C.like : C.pred;
      P.bars([j + 1], [v], { color, width: .55 });
      P.text([j + 1, v], v.toFixed(2), { dy: -9, color, size: 19 });
      P.text([j + 1, 0], VOCAB[j], { dy: 26, size: 19, color, 'font-family': MONO });
    });
    g.label('one-loss', `$t=${t}:\\quad -\\log ${prob[i].toFixed(2)}=${(-Math.log(prob[i])).toFixed(2)}\\;\\text{nats}$`, [287, 446], 'c', { color: C.rose });
    g.label('example', small('Green: the observed target. Probabilities are illustrative.', 17), [285, 480], 'c', { color: '#666' });
  }
};

FIGS.teacherForcing = {
  size: [1200, 330],
  draw(g) {
    // Corpus targets supply the next training input; no model token is selected.
    g.label('train', small('TRAINING', 23), [20, 84], 'l', { color: C.prior });
    g.label('train-prefix-label', small('Input prefix', 22), [275, 32], 'c', { color: '#555' });
    g.label('train-probs-label', small('Predicted probabilities', 22), [590, 32], 'c', { color: '#555' });
    g.label('train-next-label', small('Next prefix: corpus tokens', 22), [1020, 32], 'c', { color: C.like });
    token(g, 'train-prefix', 275, 84, 'The cat', { w: 195, h: 44, size: 24, color: C.prior });
    g.arrow([387, 84], [414, 84], { color: C.prior, w: 2 });
    g.el('rect', { x: 427, y: 48, width: 326, height: 76, rx: 6,
      fill: '#f4f2ee', stroke: C.pred, 'stroke-width': 1.2 });
    g.label('train-probs', small('P(slept) = 0.50<br>P(sat) = 0.30', 23), [590, 85], 'c', { color: C.pred });
    token(g, 'train-next', 1020, 84, 'The cat sat', { w: 280, h: 44, size: 24, color: C.like, fill: '#edf5ed' });
    g.label('train-loss', small('Loss uses <b>P(sat) = 0.30</b>', 22), [577, 153], 'c', { color: C.rose });
    g.label('train-gold', small('actual token: <b>sat</b>', 22), [820, 153], 'c', { color: C.like });
    g.arrow([919, 153], [1020, 153], { color: C.like, w: 2 });
    g.arrow([1020, 153], [1020, 112], { color: C.like, w: 2 });
    g.line([20, 190], [1180, 190], { color: '#ddd' });
    g.label('gen', small('GENERATION', 23), [20, 274], 'l', { color: C.postC });
    g.label('gen-prefix-label', small('Input prefix', 22), [275, 225], 'c', { color: '#555' });
    g.label('gen-choice-label', small('Selected token<br><span style="font-size:16px">Most probable token (greedy decoding)</span>', 22), [590, 225], 'c', { color: '#555' });
    g.label('gen-next-label', small('Next prefix: selected tokens', 22), [1020, 225], 'c', { color: C.postC });
    token(g, 'gen-prefix', 275, 274, 'The cat', { w: 195, h: 44, size: 24, color: C.prior });
    g.arrow([387, 274], [502, 274], { color: C.prior, w: 2 });
    token(g, 'gen-choice', 590, 274, 'slept', { w: 145, h: 44, size: 24, color: C.postC });
    g.arrow([680, 274], [865, 274], { color: C.postC, w: 2.5 });
    token(g, 'gen-next', 1020, 274, 'The cat slept', { w: 280, h: 44, size: 24, color: C.postC, fill: '#fbf5e9' });
  }
};

FIGS.parallelTeacherForcing = {
  size: [540, 430],
  draw(g, p) {
    const opacity = clamp(p.phase);
    g.label('sequence', small('Known sequence: <b>The cat sat .</b>', 22), [275, 22], 'c', { color: C.prior });
    g.arrow([275, 44], [275, 67], { color: C.prior, w: 2 });
    // One enclosing model, one input sequence, three simultaneous position views.
    g.el('rect', { x: 20, y: 74, width: 510, height: 293, rx: 9,
      fill: C.postC, 'fill-opacity': .055, stroke: C.postC, 'stroke-width': 2 });
    g.label('pass', small('<b>ONE</b> masked transformer forward pass', 22), [275, 102], 'c', { color: C.postC });
    g.line([35, 126], [515, 126], { color: '#d5c8ad', w: 1 });
    g.label('prefix', small('Actual prefix', 20), [150, 151], 'c', { color: C.prior });
    g.label('target', small('Target next token', 20), [420, 151], 'c', { color: C.like });
    [['The','cat'],['The cat','sat'],['The cat sat','.']].forEach(([prefix,target],i)=>{
      const y = 198 + i * 59;
      token(g, 'prefix'+i, 150, y, prefix, { w: 225, h: 40, size: 22, color: C.prior });
      g.arrow([281, y], [347, y], { color: C.postC, w: 2.5, opacity });
      token(g, 'target'+i, 420, y, target, { w: 105, h: 40, size: 22, color: C.like, fill: '#edf5ed' });
    });
    g.label('views', small('Causal masking lets one forward pass predict<br>the next token at every position simultaneously.', 19), [275, 405], 'c', { color: '#555' });
  }
};

FIGS.pretrainPipeline = {
  size: [640, 520],
  draw(g, p) {
    const phase = Math.max(0, Math.min(2, Math.round(p.phase ?? 0)));
    const slide = g.root.closest('section');
    if (slide) slide.dataset.pipelineBuild = String(phase);
    const prep = phase === 0 ? 1 : .58;
    const train = phase === 0 ? .55 : 1;
    const repeat = phase === 2 ? 1 : 0;
    // Separate corpus preparation from the repeated minibatch operations.
    g.el('rect', { x: 10, y: 0, width: 620, height: 125, rx: 10,
      fill: '#edf2fa', stroke: C.prior, 'stroke-width': phase === 0 ? 2.5 : 1, opacity: prep });
    g.label('prep-title', small('<b>DATA PREPARATION</b> · before the training loop', 20), [320, 22], 'c', { color: C.prior, opacity: prep });
    [[160, 'Collect and clean text', 'quality filtering · deduplication'],
     [470, 'Tokenize and batch', 'token IDs → sequences → minibatches']].forEach(([x, title, detail], j) => {
      g.el('rect', { x: x - 142, y: 49, width: 284, height: 58, rx: 6,
        fill: '#fff', stroke: C.prior, 'stroke-width': 1, opacity: prep });
      g.label('prep'+j, small('<b>'+title+'</b>', 21), [x, 67], 'c', { color: C.prior, opacity: prep });
      g.label('prep-detail'+j, small(detail, 15), [x, 91], 'c', { color: '#444', opacity: prep });
    });
    g.arrow([305, 78], [322, 78], { color: C.prior, w: 2, opacity: prep });
    g.arrow([470, 108], [470, 137], { color: C.prior, w: 2 });
    g.el('rect', { x: 10, y: 140, width: 620, height: 321, rx: 10,
      fill: '#fcf8ef', stroke: C.postC, 'stroke-width': phase > 0 ? 2.5 : 1, opacity: train });
    g.label('loop-title', small('<b>TRAINING LOOP</b> · one minibatch at a time', 20), [310, 157], 'c', { color: C.postC, opacity: train });
    const steps = [
      [180, 60, '1. Forward pass', 'Predict next-token probabilities at every valid position.', C.pred],
      [252, 60, '2. Compute loss', 'Average cross-entropy against actual next tokens.', C.rose],
      [324, 106, '3. Backpropagate and update parameters', null, C.postC]
    ];
    steps.forEach(([y, height, title, detail, color], j) => {
      g.el('rect', { x: 35, y, width: 535, height, rx: 7,
        fill: '#fff', stroke: color, 'stroke-width': 1.5, opacity: train });
      g.label('step'+j, small('<b>'+title+'</b>', 22), [302, y + 19], 'c', { color, opacity: train });
      if (detail) g.label('detail'+j, small(detail, 18), [302, y + 43], 'c', { color: '#444', opacity: train });
      if (j < 2) g.arrow([302, y + height + 1], [302, y + height + 11], { color: C.postC, w: 2, head: 6, opacity: train });
    });
    g.label('update', small('$\\theta\\leftarrow\\theta-\\eta\\,\\nabla_\\theta\\mathcal L$', 24), [302, 377], 'c', { color: C.postC, opacity: train });
    g.label('optimizer', small('Ordinary gradient descent; AdamW uses a different rule.', 16), [302, 411], 'c', { color: '#555', opacity: train });
    // Return to prediction with the next minibatch, never to corpus collection.
    g.path([[570, 375], [606, 375], [606, 210], [580, 210]], { color: C.like, w: 3, opacity: repeat });
    g.arrow([591, 210], [572, 210], { color: C.like, w: 3, head: 9, opacity: repeat });
    g.label('repeat', small('<b>Repeat with the next minibatch</b> · updated $\\theta$', 19), [320, 447], 'c', { color: C.like, opacity: repeat });
    g.arrow([320, 462], [320, 478], { color: C.like, w: 2, head: 7, opacity: repeat });
    g.el('rect', { x: 142, y: 481, width: 356, height: 36, rx: 7,
      fill: '#edf5ed', stroke: C.like, 'stroke-width': 1.5, opacity: repeat });
    g.label('result', small('<b>Pretrained language model</b>', 23), [320, 499], 'c', { color: C.like, opacity: repeat });
  }
};
