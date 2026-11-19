(() => {
  const truth = [-1, 2];
  const start = [-1.6, 1.1];
  const tau = 0.12;
  const observationCount = 1000;
  const summaryMinDraws = 1000;
  const sigmoid = z => 1 / (1 + Math.exp(-z));
  const trueProbability = x => sigmoid(truth[0] + truth[1] * x);
  const dataRandom = mulberry32(20261119);
  // Retain the original 60 outcomes and add observations with the same RNG stream.
  const observations = Array.from({ length: 60 }, (_, i) => {
    const x = -2 + 4 * i / 59;
    return [x, Number(dataRandom() < trueProbability(x))];
  });
  const additionalCount = observationCount - observations.length;
  for (let i = 0; i < additionalCount; i++) {
    const x = -2 + 4 * i / (additionalCount - 1);
    observations.push([x, Number(dataRandom() < trueProbability(x))]);
  }

  function logPosterior([intercept, slope]) {
    let logQ = -(intercept ** 2 + slope ** 2) / 50;
    for (const [x, y] of observations) {
      const z = intercept + slope * x;
      // y*z - softplus(z), stable even when a probability rounds to 0 or 1.
      logQ += y * z - Math.max(z, 0) - Math.log1p(Math.exp(-Math.abs(z)));
    }
    return logQ;
  }

  function createChain() {
    const random = mulberry32(121);
    const samples = [];
    const acceptedSamples = [];
    const rejected = [];
    let current = start;
    let logQ = logPosterior(current);
    let phase = 0;
    let move;
    let acceptedCount = 0;
    let sumIntercept = 0;
    let sumSlope = 0;

    function advance() {
      if (phase === 0 || phase === 4) {
        const radius = Math.sqrt(-2 * Math.log(1 - random()));
        const angle = 2 * Math.PI * random();
        const proposal = [
          current[0] + tau * radius * Math.cos(angle),
          current[1] + tau * radius * Math.sin(angle)
        ];
        move = { from: current, proposal };
        phase = 1;
      } else if (phase === 1) {
        move.logQ = logPosterior(move.proposal);
        move.logAlpha = Math.min(0, move.logQ - logQ);
        phase = 2;
      } else if (phase === 2) {
        move.u = 1 - random();
        move.accepted = Math.log(move.u) <= move.logAlpha;
        phase = 3;
      } else {
        if (move.accepted) {
          current = move.proposal;
          logQ = move.logQ;
          acceptedCount++;
          acceptedSamples.push(current);
        } else rejected.push(move.proposal);
        samples.push(current);
        sumIntercept += current[0];
        sumSlope += current[1];
        phase = 4;
      }
    }

    function iterate() {
      do { advance(); } while (phase !== 4);
    }

    return {
      advance,
      iterate,
      run(n) { for (let i = 0; i < n; i++) iterate(); },
      view() {
        const n = samples.length;
        const mean = n ? [sumIntercept / n, sumSlope / n] : null;
        return { current, samples, acceptedSamples, rejected, phase, move, acceptedCount, mean };
      }
    };
  }

  function figure(root, width, height, description) {
    root.replaceChildren();
    return el(root, 'svg', {
      width, height, viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': description
    });
  }

  function line(svg, x1, y1, x2, y2, color, style = {}) {
    el(svg, 'line', { x1, y1, x2, y2, stroke: color, ...style });
  }

  function text(svg, x, y, value, style = {}) {
    el(svg, 'text', { x, y, fill: '#444', 'font-size': 17, 'text-anchor': 'middle', ...style }).textContent = value;
  }

  function renderData(root) {
    if (root.firstElementChild) return;
    const svg = figure(root, 704, 100, 'Binary outcomes and the true sigmoid probability');
    const box = box2d(57, 9, 605, 62, -2.06, 2.06, -0.10, 1.10);
    axesBox(root, svg, box, {
      ox: box.xlo, oy: box.ylo, xt: [-2, -1, 0, 1, 2], yt: [0, 1], names: ['', '']
    });
    const scene = new Scene(root, 0, 0, el(svg, 'g'));
    scene.begin();
    const plot = scene.plot(box);
    plot.curve(trueProbability, { from: -2, to: 2, color: C.pred });
    plot.cloud(observations, { r: 1.8, color: C.like, fo: 0.25 });
    scene.trim();
    text(svg, 688, 91, 'x');
    text(svg, 24, 12, 'y');
  }

  // Fixed axes and persistent spatial thinning keep recorded dots stationary.
  const posteriorBounds = [-1.75, -0.25, 1, 3];
  let contourPaths;

  function drawPosteriorContours(svg, box) {
    if (!contourPaths) {
      // Evaluate the fixed target once, then interpolate each level on the grid edges.
      const size = 64;
      const grid = Array.from({ length: size + 1 }, (_, j) =>
        Array.from({ length: size + 1 }, (_, i) => {
          const x = lerp(box.xlo, box.xhi, i / size), y = lerp(box.ylo, box.yhi, j / size);
          return [box.X(x), box.Y(y), logPosterior([x, y])];
        })
      );
      const peak = Math.max(...grid.flat().map(point => point[2]));
      contourPaths = [8, 4.5, 2, 0.5].map(drop => {
        const level = peak - drop;
        let d = '';
        for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
          const corners = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]];
          const crossings = [];
          for (let k = 0; k < 4; k++) {
            const [x, y, a] = corners[k], [xNext, yNext, b] = corners[(k + 1) % 4];
            if ((a < level) === (b < level)) continue;
            const fraction = (level - a) / (b - a);
            crossings.push([lerp(x, xNext, fraction), lerp(y, yNext, fraction)]);
          }
          for (let k = 0; k + 1 < crossings.length; k += 2) d += pathOf(crossings.slice(k, k + 2));
        }
        return d;
      });
    }
    contourPaths.forEach((d, i) => el(svg, 'path', {
      d, fill: 'none', stroke: C.pred, 'stroke-width': 1.8, 'stroke-linecap': 'round',
      'stroke-opacity': 0.36 + i * 0.16, 'data-posterior-contour': i + 1
    }));
  }

  function drawSampleDots(svg, box, samples) {
    const columns = 44;
    const rows = 56;
    const representatives = new Map();
    let outside = 0;

    for (const [intercept, slope] of samples) {
      const column = Math.floor((intercept - box.xlo) / (box.xhi - box.xlo) * columns);
      const row = Math.floor((slope - box.ylo) / (box.yhi - box.ylo) * rows);
      if (column < 0 || column >= columns || row < 0 || row >= rows) {
        outside++;
        continue;
      }
      const key = row * columns + column;
      // Keep the first actual sample at each location. Later batches add dots
      // without replacing previously displayed samples or drawing huge clouds.
      if (!representatives.has(key)) representatives.set(key, [intercept, slope]);
    }

    const dots = el(svg, 'g', { 'data-sample-dots': representatives.size, 'data-outside': outside });
    for (const [intercept, slope] of representatives.values()) {
      el(dots, 'circle', {
        cx: box.X(intercept),
        cy: box.Y(slope),
        r: 2.8,
        fill: C.like,
        'fill-opacity': 0.8,
        'data-sample': [intercept, slope].join(',')
      });
    }
    if (outside) text(svg, box.x0 + box.W - 6, box.y0 + 20,
      outside + ' accepted outside view', { 'text-anchor': 'end', 'font-size': 15 });
  }

  function drawRejections(svg, box, rejected) {
    let d = '';
    const r = 2.4;
    for (const [intercept, slope] of rejected) {
      if (intercept < box.xlo || intercept > box.xhi || slope < box.ylo || slope > box.yhi) continue;
      const x = box.X(intercept), y = box.Y(slope);
      d += pathOf([[x - r, y - r], [x + r, y + r]]) + pathOf([[x - r, y + r], [x + r, y - r]]);
    }
    if (d) el(svg, 'path', {
      d, fill: 'none', stroke: C.post, 'stroke-width': 1,
      'stroke-opacity': Math.min(0.52, 7 / Math.sqrt(rejected.length)), 'data-rejections': rejected.length
    });
  }

  function histogram(samples, axis, low, high) {
    const binWidth = 0.05;
    const counts = Array(Math.round((high - low) / binWidth)).fill(0);
    for (const point of samples) {
      const i = Math.floor((point[axis] - low) / binWidth);
      if (i >= 0 && i < counts.length) counts[i]++;
    }
    const densities = counts.map(count => samples.length ? count / (samples.length * binWidth) : 0);
    const max = Math.max(1, Math.ceil(2 * Math.max(...densities)) / 2);
    return { counts, densities, max };
  }

  function drawMarginals(svg, box, samples) {
    const left = box.x0, top = box.y0, bottom = top + box.H, right = left + box.W;
    const xBase = top - 15, yBase = right + 14;
    const topHeight = 38, sideWidth = 110;
    const intercept = histogram(samples, 0, box.xlo, box.xhi);
    const slope = histogram(samples, 1, box.ylo, box.yhi);
    const bars = { fill: C.like, 'fill-opacity': 0.25, stroke: C.like, 'stroke-opacity': 0.65 };
    const guide = { 'stroke-width': 2, 'stroke-dasharray': '5 4' };

    const topBars = el(svg, 'g', { 'data-marginal': 'intercept' });
    const xWidth = box.W / intercept.counts.length;
    intercept.densities.forEach((density, i) => {
      const height = topHeight * density / intercept.max;
      el(topBars, 'rect', {
        x: left + i * xWidth + 0.4, y: xBase - height,
        width: xWidth - 0.8, height, 'data-count': intercept.counts[i], ...bars
      });
    });
    line(svg, left, xBase, right, xBase, C.axis);
    line(svg, left, xBase - topHeight, left, xBase, C.axis);
    text(svg, left, xBase - topHeight - 7, 'Density', { 'text-anchor': 'start' });
    text(svg, right, xBase - topHeight - 7, 'Intercept β₀', { 'text-anchor': 'end' });
    for (const level of [0, intercept.max / 2, intercept.max]) {
      const y = xBase - topHeight * level / intercept.max;
      line(svg, left - 5, y, left, y, C.axis);
      text(svg, left - 8, y + 5, fmt(level), { 'text-anchor': 'end' });
    }
    line(svg, box.X(truth[0]), xBase - topHeight, box.X(truth[0]), xBase, C.pred, guide);

    const sideBars = el(svg, 'g', { 'data-marginal': 'slope' });
    const yWidth = box.H / slope.counts.length;
    slope.densities.forEach((density, i) => {
      el(sideBars, 'rect', {
        x: yBase, y: bottom - (i + 1) * yWidth + 0.4,
        width: sideWidth * density / slope.max, height: yWidth - 0.8,
        'data-count': slope.counts[i], ...bars
      });
    });
    text(svg, yBase + sideWidth / 2, top - 9, 'Slope β₁');
    line(svg, yBase, top, yBase, bottom, C.axis);
    line(svg, yBase, bottom, yBase + sideWidth, bottom, C.axis);
    for (const level of [0, slope.max / 2, slope.max]) {
      const x = yBase + sideWidth * level / slope.max;
      line(svg, x, bottom, x, bottom + 5, C.axis);
      text(svg, x, bottom + 23, fmt(level));
    }
    text(svg, yBase + sideWidth / 2, bottom + 45, 'Density');
    line(svg, yBase, box.Y(truth[1]), yBase + sideWidth, box.Y(truth[1]), C.pred, guide);
  }

  function ticks(lo, hi) {
    const step = (hi - lo) <= 2 ? 0.5 : Math.max(1, Math.round((hi - lo) / 5));
    const values = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) values.push(v);
    return values;
  }

  function jointAxes(svg, box) {
    const left = box.x0, top = box.y0, bottom = top + box.H, right = left + box.W;
    for (const value of ticks(box.xlo, box.xhi)) {
      const x = box.X(value);
      line(svg, x, top, x, bottom, C.grid);
      line(svg, x, bottom, x, bottom + 5, C.axis);
      text(svg, x, bottom + 23, minus(value));
    }
    for (const value of ticks(box.ylo, box.yhi)) {
      const y = box.Y(value);
      line(svg, left, y, right, y, C.grid);
      line(svg, left - 5, y, left, y, C.axis);
      text(svg, left - 10, y + 5, minus(value), { 'text-anchor': 'end' });
    }
    line(svg, left, top, left, bottom, C.axis);
    line(svg, left, bottom, right, bottom, C.axis);
    text(svg, left + box.W / 2, bottom + 45, 'Intercept β₀', { 'font-size': 19 });
    const y = top + box.H / 2;
    text(svg, 17, y, 'Slope β₁', { 'font-size': 19, transform: 'rotate(-90 17 ' + y + ')' });
  }

  function renderSamples(root, state, stage) {
    const description = stage >= 3 ? 'Joint posterior and Metropolis draws, with marginal histograms' : 'Joint posterior for intercept and slope, with the true parameter marked';
    const svg = figure(root, 704, 337, description);
    const box = box2d(57, 73, 500, 217, ...posteriorBounds);
    jointAxes(svg, box);
    drawPosteriorContours(svg, box);
    if (stage >= 3) drawMarginals(svg, box, state.samples);

    if (stage >= 2) drawChain(svg, root, box, state);
    const tx = box.X(truth[0]), ty = box.Y(truth[1]);
    line(svg, tx - 6, ty - 6, tx + 6, ty + 6, C.pred, { 'stroke-width': 3 });
    line(svg, tx - 6, ty + 6, tx + 6, ty - 6, C.pred, { 'stroke-width': 3 });
  }

  function drawChain(svg, root, box, { current, samples, acceptedSamples, rejected, phase, move }) {
    drawRejections(svg, box, rejected);
    drawSampleDots(svg, box, acceptedSamples);
    const scene = new Scene(root, 0, 0, el(svg, 'g'));
    scene.begin();
    const plot = scene.plot(box);
    const early = samples.slice(0, 10);
    if (early.length) {
      plot.path([start, ...early], { color: C.teal, w: 1.7, opacity: 0.72 });
      plot.cloud(early, { r: 3.2, color: C.teal, fo: 0.78 });
    }
    scene.trim();

    if (move) {
      const x = box.X(move.proposal[0]), y = box.Y(move.proposal[1]);
      const wasRejected = phase === 4 && !move.accepted;
      const color = wasRejected ? C.post : C.postC;
      line(svg, box.X(move.from[0]), box.Y(move.from[1]), x, y, color, { 'stroke-width': 2, 'stroke-dasharray': '4 3' });
      el(svg, 'path', {
        d: wasRejected ? pathOf([[x - 6, y - 6], [x + 6, y + 6]]) + pathOf([[x - 6, y + 6], [x + 6, y - 6]])
          : pathOf([[x, y - 9], [x + 9, y], [x, y + 9], [x - 9, y]]) + 'Z',
        fill: 'none', stroke: color,
        'stroke-width': 2.5, 'data-proposal': move.proposal.join(',')
      });
    }
    el(svg, 'circle', {
      cx: box.X(current[0]), cy: box.Y(current[1]), r: 5.5, fill: C.prior,
      stroke: '#fff', 'stroke-width': 1.4, 'data-current': current.join(',')
    });
  }

  function quantile(sorted, probability) {
    const position = (sorted.length - 1) * probability;
    const i = Math.floor(position);
    return lerp(sorted[i], sorted[Math.ceil(position)], position - i);
  }

  function renderSummary(section, { samples, mean }) {
    const ready = samples.length >= summaryMinDraws;
    const intervals = ready && [0, 1].map(axis => {
      const values = samples.map(point => point[axis]).sort((a, b) => a - b);
      return [quantile(values, 0.025), quantile(values, 0.975)];
    });
    const number = value => value.toFixed(2).replace('-', '−');
    section.querySelectorAll('[data-mean]').forEach((cell, axis) => {
      cell.textContent = ready ? number(mean[axis]) : '—';
    });
    section.querySelectorAll('[data-interval]').forEach((cell, axis) => {
      cell.textContent = intervals ? '[' + intervals[axis].map(number).join(', ') + ']' : '—';
    });
    section.querySelector('[data-summary-note]').textContent = ready
      ? 'Includes initial draws. Check mixing before interpreting.'
      : 'Collect ' + summaryMinDraws.toLocaleString() + ' draws for a summary. Check mixing before interpreting.';
  }

  function renderStatus(section, { samples, phase, move, acceptedCount }) {
    const n = samples.length;
    const rate = n ? Math.round(100 * acceptedCount / n) + '%' : '—';
    let detail = 'Ready';
    if (move && phase !== 4) detail = 'Proposed move';
    if (phase === 4) detail = move.accepted ? 'Accepted and moved' : 'Rejected and stayed';
    const count = n.toLocaleString() + (n === 1 ? ' draw' : ' draws');
    section.querySelector('.logistic-readout').textContent = count + ' · Acceptance ' + rate + ' · ' + detail;
  }

  const section = document.getElementById('logistic');
  const controls = section.querySelector('.logistic-controls');
  const runButton = controls.querySelector('[data-action="run"]');
  let chain = createChain();
  let root;
  let running = false;
  let timer;

  const rendered = new WeakMap();
  FIGS.logisticData = { init() {}, render: renderData };
  FIGS.logisticMetropolis = {
    init(node) { root = node; },
    render(node) {
      const { stage = 1 } = stateFor(node);
      const state = chain.view();
      const previous = rendered.get(node);
      const n = state.samples.length;
      if (previous?.stage === stage && previous.phase === state.phase && previous.move === state.move && previous.n === n) return;
      const owner = node.closest('section');
      renderSamples(node, state, stage);
      renderStatus(owner, state);
      if (stage >= 3 && (previous?.n !== n || previous.stage < 3)) renderSummary(owner, state);
      rendered.set(node, { stage, phase: state.phase, move: state.move, n });
    }
  };

  function redraw() {
    runButton.textContent = running ? 'Pause' : 'Run';
    runButton.setAttribute('aria-pressed', String(running));
    controls.querySelectorAll('[data-action="step"], [data-action="batch"]')
      .forEach(button => { button.disabled = running; });
    FIGS.logisticMetropolis.render(root);
  }

  function stop() {
    clearTimeout(timer);
    running = false;
    redraw();
  }

  function runFrame() {
    if (chain.view().phase === 0 || chain.view().phase === 4) chain.advance();
    redraw();
    timer = setTimeout(() => {
      chain.iterate();
      redraw();
      timer = setTimeout(runFrame, 170);
    }, 280);
  }

  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    event.stopPropagation();
    const { stage = 1 } = stateFor(root);
    if (stage < 2 || (stage < 3 && button.dataset.action === 'batch')) return;

    if (button.dataset.action === 'run') {
      if (running) stop();
      else {
        running = true;
        runFrame();
      }
      return;
    }
    if (button.dataset.action === 'reset') {
      chain = createChain();
      stop();
      return;
    }
    if (running) return;

    if (button.dataset.action === 'step') chain.iterate();
    if (button.dataset.action === 'batch') chain.run(Number(button.dataset.count));
    redraw();
  });

  controls.addEventListener('keydown', event => {
    if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
  });
  Reveal.on('slidechanged', event => {
    if (running && event.previousSlide === section) stop();
  });
  Reveal.on('fragmenthidden', () => {
    if (running && Reveal.getCurrentSlide() === section && (stateFor(root).stage ?? 1) < 2) stop();
  });
})();
