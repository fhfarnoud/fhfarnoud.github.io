/* Figures built on the Sampling decks' Scene, axes, covariance, and math-label utilities. */
const EM_DEMOS = (() => {
  const componentColors = [C.prior, C.post];
  const mixtureColors = [[35, 84, 168], [179, 0, 0]];
  const fixed = (value, digits = 3) => value.toFixed(digits).replace('-', '−');
  const mixColor = gamma => 'rgb(' + mixtureColors[0].map((a, i) => Math.round(lerp(a, mixtureColors[1][i], gamma))).join(',') + ')';
  const responsibilityGradient = 'linear-gradient(90deg in srgb, ' + mixColor(0) + ', ' + mixColor(1) + ')';
  const stateByPanel = new WeakMap();
  let clipNumber = 0;

  function figure(name, width, height, render) {
    FIGS[name] = {
      init(root) {
        const svg = newSvg(root, width, height);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', root.dataset.description || name.replace(/([a-z])([A-Z])/g, '$1 $2'));
        root.dataset.clip = 'em-plot-' + ++clipNumber;
      },
      render(root, params) {
        const svg = root.querySelector('svg');
        svg.replaceChildren();
        render(root, svg, params);
      }
    };
  }

  function plot(root, svg, bounds, { xt, yt, names }) {
    const grid = el(svg, 'g');
    xt.forEach(x => el(grid, 'line', {
      x1: bounds.X(x), x2: bounds.X(x), y1: bounds.y0, y2: bounds.y0 + bounds.H, stroke: C.grid
    }));
    yt.forEach(y => el(grid, 'line', {
      x1: bounds.x0, x2: bounds.x0 + bounds.W, y1: bounds.Y(y), y2: bounds.Y(y), stroke: C.grid
    }));
    const scene = new Scene(root, 0, 0, el(svg, 'g'));
    scene.begin();
    scene.plot(bounds).axes({
      xt, yt, names: ['', names?.[1] ?? '$x_2$'], ox: bounds.xlo, oy: bounds.ylo, grid: false
    });
    scene.end();
    const xName = names?.[0] ?? '$x_1$';
    if (xName) label(root, 'x-axis', xName, bounds.x0 + bounds.W + 19, bounds.y0 + bounds.H - 5, 'l', C.ink);
    const id = root.dataset.clip;
    const clip = el(el(svg, 'defs'), 'clipPath', { id });
    el(clip, 'rect', { x: bounds.x0 - 1, y: bounds.y0 - 1, width: bounds.W + 2, height: bounds.H + 2 });
    return el(svg, 'g', { 'clip-path': 'url(#' + id + ')' });
  }

  function line(marks, bounds, points, color, width = 2.5, dash = '', opacity = 1) {
    el(marks, 'path', {
      d: pathOf(points.map(([x, y]) => [bounds.X(x), bounds.Y(y)])),
      fill: 'none', stroke: color, 'stroke-width': width, 'stroke-dasharray': dash, opacity
    });
  }
  function symbol(marks, bounds, [x, y], color, radius, shape = 'circle', border = '#fff') {
    const cx = bounds.X(x), cy = bounds.Y(y);
    if (shape === 'circle') {
      el(marks, 'circle', { cx, cy, r: radius, fill: color, stroke: border, 'stroke-width': 1.1 });
    } else {
      const [r, h] = [radius, radius * 0.85];
      const offsets = shape === 'triangle' ? [[0, -r], [r, h], [-r, h]] : [[0, -r], [r, 0], [0, r], [-r, 0]];
      el(marks, 'polygon', {
        points: offsets.map(([dx, dy]) => [cx + dx, cy + dy].join(',')).join(' '),
        fill: color, stroke: border, 'stroke-width': 1.4
      });
    }
  }
  function cross(marks, bounds, [x, y], color) {
    const cx = bounds.X(x), cy = bounds.Y(y);
    const d = 'M' + (cx - 6) + ',' + (cy - 6) + 'l12,12m0,-12l-12,12';
    el(marks, 'path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 5 });
    el(marks, 'path', { d, fill: 'none', stroke: color, 'stroke-width': 2.8 });
  }
  function contours(marks, bounds, components, previous) {
    if (previous) previous.forEach(({ mean, cov }, k) => {
      el(marks, 'path', {
        d: covEllipse(bounds, ...cov, 2, ...mean), fill: 'none',
        stroke: componentColors[k], 'stroke-width': 1.7, 'stroke-dasharray': '5 5', opacity: 0.45
      });
      line(marks, bounds, [mean, components[k].mean], componentColors[k], 2, '5 5', 0.7);
    });
    components.forEach(({ mean, cov }, k) => {
      for (const radius of [2, 1]) {
        el(marks, 'path', {
          d: covEllipse(bounds, ...cov, radius, ...mean), fill: 'none',
          stroke: componentColors[k], 'stroke-width': radius === 1 ? 2.4 : 1.7, opacity: radius === 1 ? 0.9 : 0.65
        });
      }
      cross(marks, bounds, mean, componentColors[k]);
    });
  }
  function scatter(root, svg, { labels = false, weights, components, previous } = {}) {
    const width = Number(svg.getAttribute('width'));
    const height = Number(svg.getAttribute('height'));
    // Preserve the aspect ratio of data coordinates so ellipse tilt stays meaningful.
    const xRange = 13.2, yRange = 7.7;
    const scale = Math.min((width - 94) / xRange, (height - 70) / yRange);
    const bounds = box2d((width - xRange * scale) / 2 - 5, 27, xRange * scale, yRange * scale, -6.6, 6.6, -3.7, 4);
    const marks = plot(root, svg, bounds, { xt: [-6, -4, -2, 0, 2, 4, 6], yt: [-3, -2, -1, 0, 1, 2, 3] });
    scatterPoints(marks, bounds, labels, weights);
    if (components) contours(marks, bounds, components, previous);
  }
  function scatterPoints(marks, bounds, labels, weights) {
    EM.labeled.forEach(({ xy, label }, index) => {
      const color = weights ? mixColor(weights[index][1]) : labels ? componentColors[label] : '#73727a';
      symbol(marks, bounds, xy, color, labels ? 4.5 : 3.8, labels && label === 1 ? 'triangle' : 'circle');
    });
  }

  figure('labelCloud', 550, 370, (root, svg) => scatter(root, svg));

  figure('labeledFitCloud', 568, 375, (root, svg, { labels, fit }) => {
    const components = labels && fit ? EM.labeledFit : null;
    scatter(root, svg, { labels, components });
    const panel = root.parentElement;
    toggle(panel.querySelector('[data-action="labels"]'), labels, 'Show True Labels', 'Hide True Labels');
    panel.querySelector('[data-status]').textContent = labels ? '● Class 0     ▲ Class 1' : 'Labels hidden';
    panel.querySelector('[data-fit-legend]').hidden = !components;
  });

  figure('signalLikelihood', 530, 300, (root, svg, { x, noiseVariance, showMLE }) => {
    const estimate = Math.max(0, x ** 2 - noiseVariance);
    const score = theta => EM.scalar.observed(theta, x, noiseVariance);
    const xTick = Math.ceil((1.5 * estimate + 4) / 5);
    const xMax = 5 * xTick;
    const peak = score(estimate);
    const min = Math.min(score(0), score(xMax));
    const yUnit = 10 ** Math.floor(Math.log10((peak - min) / 4));
    const yTick = Math.ceil((peak - min) / (4 * yUnit)) * yUnit;
    const firstY = Math.floor(min / yTick), lastY = Math.floor(peak / yTick);
    const bounds = box2d(64, 37, 420, 226, 0, xMax, firstY * yTick, (lastY + 1.5) * yTick);
    const marks = plot(root, svg, bounds, {
      xt: Array.from({ length: 6 }, (_, i) => i * xTick),
      yt: Array.from({ length: lastY - firstY + 2 }, (_, i) => Number(fmt((firstY + i) * yTick))),
      names: ['$\\theta$', '$\\ell(\\theta)$']
    });
    const samples = Array.from({ length: 241 }, (_, i) => xMax * i / 240);
    samples.push(estimate);
    samples.sort((a, b) => a - b);
    line(marks, bounds, samples.map(theta => [theta, score(theta)]), C.like, 3.1);

    if (showMLE) {
      if (estimate > 0) line(marks, bounds, [[estimate, bounds.ylo], [estimate, peak]], C.pred, 1.5, '5 5', 0.65);
      symbol(svg, bounds, [estimate, peak], C.pred, 6, 'diamond');
    }
    const marker = '$\\hat\\theta_{\\mathrm{ML}}=' + fmt(estimate) + '$' + (estimate === 0 ? ' (boundary)' : '');
    label(root, 'mle', marker, bounds.X(estimate) + 12, bounds.Y(peak) - 7, 'bl', C.pred, showMLE);
  });

  const scalarStart = { t: 0, theta: 1 };
  function drawScalarBound(root, svg, { stage = 4, iteration }, bounds, { title, detail = false, mle, commitUpdate = false }) {
    const { scalar } = EM, { theta } = iteration || scalarStart;
    const next = iteration ? iteration.next : scalar.update(theta);
    const posterior = iteration ? iteration.posterior : scalar.posterior(theta);
    const bound = candidate => scalar.boundFromPosterior(candidate, posterior);
    const marks = plot(root, svg, bounds, {
      xt: detail ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6],
      yt: detail ? [-2.5, -2.4, -2.3, -2.2, -2.1] : mle === undefined ? [-3.5, -3, -2.5, -2] : [-3, -2.8, -2.6, -2.4, -2.2],
      names: ['$\\theta$', title]
    });
    if (mle !== undefined) {
      line(marks, bounds, [[mle, bounds.ylo], [mle, bounds.yhi]], C.mle, 1.4, '5 5', 0.48);
      label(root, 'mle-reference', '$\\hat\\theta_{\\mathrm{ML}}=' + mle + '$',
        bounds.X(mle), bounds.y0 - 5, 'b', C.mle);
    }
    const grid = Array.from({ length: 300 }, (_, i) => bounds.xhi * (i + 1) / 300);
    const likelihoodGrid = mle === undefined ? grid : [0, ...grid];
    line(marks, bounds, likelihoodGrid.map(x => [x, scalar.observed(x)]), C.like, 2.8);
    if (stage >= 1) line(marks, bounds, grid.map(x => [x, bound(x)]), C.pred, 2.6);

    const contact = scalar.observed(theta), score = next === null ? null : scalar.observed(next);
    const current = commitUpdate ? next : theta;
    const currentScore = commitUpdate ? score : contact;
    const showCurrent = stage >= 2 || iteration;
    if (showCurrent) line(marks, bounds, [[current, bounds.ylo], [current, currentScore]], C.prior, 1.7, '5 4', 0.7);
    let currentRadius = 5.5;
    let currentFill = C.prior;
    let currentBorder = '#fff';
    if (stage >= 3) {
      const maximum = bound(next);
      if (commitUpdate) {
        if (Math.abs(bounds.X(next) - bounds.X(theta)) > 17) {
          const trace = Array.from({ length: 21 }, (_, i) => {
            const at = lerp(theta, next, i / 20);
            return [at, bound(at)];
          });
          line(marks, bounds, trace, C.pred, 6, '', 0.38);
          symbol(marks, bounds, [theta, contact], '#fff', 4.5, 'circle', C.prior);
        }
        if (Math.abs(bounds.Y(score) - bounds.Y(maximum)) < 13) {
          currentRadius = 9;
          currentFill = 'none';
          currentBorder = C.prior;
        }
      } else {
        line(marks, bounds, [[next, bounds.ylo], [next, maximum]], C.rose, 1.7, '5 4', 0.7);
        if (Math.abs(theta - next) < 0.035) {
          currentRadius = 9;
          currentFill = 'none';
          currentBorder = C.prior;
        }
      }
      if (stage >= 4) {
        line(marks, bounds, [[next, maximum], [next, score]], C.like, 2, '3 3');
        if (!commitUpdate) symbol(marks, bounds, [next, score], '#fff', 5, 'circle', C.like);
      }
      symbol(marks, bounds, [next, maximum], C.rose, 6.5, 'diamond');
    }
    if (showCurrent) symbol(marks, bounds, [current, currentScore], currentFill, currentRadius, 'circle', currentBorder);
  }
  figure('scalarBoundIntro', 650, 314, (root, svg, params) =>
    drawScalarBound(root, svg, params, box2d(78, 32, 520, 237, 0, 6, -3.55, -1.95),
      { title: 'Log-likelihood' }));
  FIGS.scalarBoundIntro.duration = 1;
  figure('scalarBoundTight', 412, 207, (root, svg, params) =>
    drawScalarBound(root, svg, params, box2d(62, 28, 313, 142, 0, 4, -2.5, -2.05),
      { title: 'Log-likelihood', detail: true }));

  function scalarState(panel) {
    if (!stateByPanel.has(panel)) {
      stateByPanel.set(panel, { history: [scalarStart], anchor: scalarStart, posterior: null, phase: 'initial' });
    }
    return stateByPanel.get(panel);
  }
  function scalarExpectation(state) {
    state.anchor = state.history.at(-1);
    state.posterior = EM.scalar.posterior(state.anchor.theta);
    state.phase = 'e';
  }
  function scalarMaximization(state) {
    const theta = EM.scalar.maximize(state.posterior);
    state.history.push({ t: state.anchor.t + 1, theta });
    // Reserve the first row and keep at most three recent estimates.
    if (state.history.length > 4) state.history.splice(1, 1);
    state.phase = 'm';
  }
  function renderScalarHistory(body, history) {
    const current = history.at(-1);
    if (body.lastElementChild?.dataset.iteration === String(current.t)) return;
    body.replaceChildren();
    for (const entry of history) {
      if (entry === history[1] && entry.t > 1) {
        const notice = body.insertRow().insertCell();
        notice.colSpan = 3;
        notice.textContent = '⋯';
        notice.setAttribute('aria-label', 'Earlier iterations omitted');
      }
      const row = body.insertRow();
      row.dataset.iteration = entry.t;
      if (entry === current) row.setAttribute('aria-current', 'true');
      const header = document.createElement('th');
      header.scope = 'row';
      header.textContent = entry.t;
      row.appendChild(header);
      row.insertCell().textContent = fixed(entry.theta, 6);
      row.insertCell().textContent = fixed(EM.scalar.observed(entry.theta), 7);
    }
  }
  figure('scalarBound', 680, 366, (root, svg) => {
    const panel = root.closest('[data-demo="scalar"]');
    const { history, anchor, posterior, phase } = scalarState(panel);
    const commitUpdate = phase === 'm';
    const iteration = { theta: anchor.theta, posterior, next: commitUpdate ? history.at(-1).theta : null };
    const stage = { initial: 0, e: 2, m: 4 }[phase];
    drawScalarBound(root, svg, { stage, iteration }, box2d(83, 39, 545, 284, 0, 6, -3.05, -2.03),
      { title: 'Log-likelihood / bound', mle: 3, commitUpdate });

    const steps = {
      initial: 'Start at the initial estimate. Next: E-Step.',
      e: 'Construct the lower bound while holding the parameter estimate fixed.',
      m: 'Maximize the lower bound and update the parameter estimate.'
    };
    panel.dataset.phase = phase;
    panel.querySelector('[data-action="e"]').disabled = phase === 'e';
    panel.querySelector('[data-action="m"]').disabled = phase !== 'e';
    panel.querySelector('[data-status]').textContent = steps[phase];
    renderScalarHistory(panel.querySelector('.em-scalar-table tbody'), history);
  });

  function scalarAlgorithmState(panel) {
    if (!stateByPanel.has(panel)) {
      stateByPanel.set(panel, { ...scalarStart, posterior: null, next: null });
    }
    return stateByPanel.get(panel);
  }
  // Keep the bound anchored at the old estimate until the following E-step.
  function scalarAlgorithmStep(state) {
    if (state.posterior && state.next === null) {
      state.next = EM.scalar.maximize(state.posterior);
      return;
    }
    if (state.next !== null) {
      state.theta = state.next;
      state.next = null;
      state.t++;
    }
    state.posterior = EM.scalar.posterior(state.theta);
  }
  figure('scalarBoundAlgorithm', 626, 298, (root, svg) => {
    const panel = root.closest('[data-demo="scalar-algorithm"]');
    const iteration = scalarAlgorithmState(panel);
    const { t, theta, posterior, next } = iteration;
    const phase = next !== null ? 'm' : posterior ? 'e' : 'initial';
    const stage = { initial: 0, e: 2, m: 4 }[phase];
    drawScalarBound(root, svg, { iteration, stage },
      box2d(77, 32, 500, 235, 0, 4, -2.5, -2.05), { title: 'Log-likelihood', detail: true });

    panel.dataset.phase = phase;
    panel.querySelectorAll('[data-em-step]').forEach(step => {
      if (step.dataset.emStep === phase) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    const stepName = { initial: 'Next: Expectation step', e: 'Expectation step', m: 'Maximization step' };
    panel.querySelector('[data-status]').textContent = 'Iteration ' + t + '  ·  ' + stepName[phase];
    panel.querySelector('[data-parameters]').textContent =
      'Current θ = ' + fixed(theta) + (next !== null ? '  ·  Updated θ = ' + fixed(next) : '');
    const likelihood = 'Observed log-likelihood  ' + fixed(EM.scalar.observed(theta), 5);
    panel.querySelector('[data-detail]').textContent =
      likelihood + (next !== null ? ' → ' + fixed(EM.scalar.observed(next), 5) : '');
  });

  figure('estepGraph', 552, 130, (root, svg, { coupled }) => {
    const positions = [70, 207, 345, 482];
    const hidden = 51, observed = 106, radius = 20;
    const edge = '#5a5267';
    if (coupled) {
      positions.slice(1).forEach((x, i) => {
        arrow(svg, positions[i] + radius, hidden, x - radius - 1, hidden, edge, 1.7, 10);
      });
      // Route the longer dependencies above the hidden row to keep the observation arrows clear.
      [[2, 1, 10], [3, -22, 5]].forEach(([target, bend, inset]) => {
        const startX = positions[0] + inset, endX = positions[target] - inset;
        const endY = hidden - Math.sqrt(radius ** 2 - inset ** 2) - 1;
        const center = (startX + endX) / 2;
        el(svg, 'path', {
          d: 'M' + startX + ',' + endY + ' Q' + center + ',' + bend + ' ' + endX + ',' + endY,
          fill: 'none', stroke: edge, 'stroke-width': 1.7
        });
        el(svg, 'path', { d: arrowHeadD(center, bend, endX, endY, 10), fill: edge });
      });
    }
    positions.forEach((x, i) => {
      arrow(svg, x, hidden + radius, x, observed - radius - 1, C.ink, 1.7, 9);
      el(svg, 'circle', { cx: x, cy: hidden, r: radius, fill: '#fff', stroke: C.ink, 'stroke-width': 1.6 });
      el(svg, 'circle', { cx: x, cy: observed, r: radius, fill: '#e6e6e6', stroke: C.ink, 'stroke-width': 1.6 });
      label(root, 'hidden-' + i, '$Y_' + (i + 1) + '$', x, hidden, 'c');
      label(root, 'observed-' + i, '$\\mathbf X_' + (i + 1) + '$', x, observed, 'c');
    });
  });

  let viDensities;
  figure('viPosterior', 560, 164, (root, svg, { approximate }) => {
    const { posterior, gaussian } = viDensities ??= EM.variationalExample();
    const bounds = box2d(51, 25, 480, 98, -4.5, 4.5, 0, 0.8);
    const marks = plot(root, svg, bounds, {
      xt: [-4, -2, 0, 2, 4], yt: [0, 0.2, 0.4, 0.6, 0.8], names: ['', 'Probability density']
    });
    label(root, 'hidden-axis', 'Hidden variable ($y$)', bounds.x0 + bounds.W / 2, 145, 't');
    const grid = Array.from({ length: 361 }, (_, i) => lerp(bounds.xlo, bounds.xhi, i / 360));
    const q = approximate ? gaussian : posterior;
    line(marks, bounds, grid.map(y => [y, posterior(y)]), C.prior, 3.6);
    line(marks, bounds, grid.map(y => [y, q(y)]), C.postC, 2.5, '8 5');
  });

  function gmmState(panel) {
    if (!stateByPanel.has(panel)) stateByPanel.set(panel, EM.gmm());
    return stateByPanel.get(panel);
  }
  function likelihoodPlot(root, svg, traces, bounds, steps) {
    const yt = Array.from({ length: Math.ceil((bounds.yhi - bounds.ylo) / 40) + 1 }, (_, i) => 40 * (Math.ceil(bounds.ylo / 40) + i));
    const marks = plot(root, svg, bounds, {
      xt: steps, yt: yt.filter(v => v >= bounds.ylo && v <= bounds.yhi), names: ['', '']
    });
    label(root, 'iteration', 'Iteration', bounds.x0 + bounds.W / 2, bounds.y0 + bounds.H + 34, 't', C.ink);
    traces.forEach(({ values, color, dash }) => {
      const series = values.map((y, x) => [x, y]);
      line(marks, bounds, series, color, 2.6, dash);
      symbol(marks, bounds, series.at(-1), color, 4.6);
    });
  }
  figure('mixtureCloud', 730, 431, (root, svg) => {
    const state = gmmState(root.closest('[data-demo]'));
    scatter(root, svg, {
      labels: state.labels, weights: state.weights, components: state.components,
      previous: state.phase === 'm' ? state.previous : null
    });
  });
  figure('mixtureHistory', 442, 214, (root, svg) => {
    const { history } = gmmState(root.closest('[data-demo]'));
    const maxT = Math.max(10, Math.ceil((history.length - 1) / 10) * 10);
    const lower = 40 * Math.floor((history[0] - 10) / 40);
    likelihoodPlot(root, svg, [{ values: history, color: C.like }],
      box2d(62, 10, 328, 158, 0, maxT, lower, -560), [0, maxT / 2, maxT]);
  });
  const comparison = [0, 1, 3].map((start, k) => {
    const state = EM.gmm(start);
    for (let i = 0; i < 35 && !state.error; i++) EM.iterate(state);
    return { values: state.history, color: [C.prior, C.teal, C.pred][k], dash: ['', '8 5', '3 4'][k] };
  });
  figure('startComparison', 582, 255, (root, svg) => {
    likelihoodPlot(root, svg, comparison, box2d(64, 32, 472, 178, 0, 35, -840, -560), [0, 5, 10, 15, 20, 25, 30, 35]);
    label(root, 'observed', 'Observed log-likelihood', 71, 15, 'l', C.ink);
  });

  const collapseIndex = 133;
  const collapseMean = EM.data[collapseIndex];
  const collapseWeight = 0.02;
  // Equal responsibilities give the single-Gaussian MLE over all observations.
  const [wholeDataFit] = EM.maximize(EM.data, EM.data.map(() => [0.5, 0.5]));
  const broadComponent = { ...wholeDataFit, weight: 1 - collapseWeight };
  const collapseNumber = value => (value >= 0.01 && value < 1000 ? fixed(value) : value.toExponential(2))
    .replace('e-', 'e−').replace('e+', 'e');

  figure('componentCollapse', 582, 233, (root, svg, { logSigma }) => {
    const sigma = 10 ** logSigma, variance = sigma ** 2;
    const shrinkingComponent = { weight: collapseWeight, mean: collapseMean, cov: [variance, 0, variance] };
    const components = [broadComponent, shrinkingComponent];
    const { weights, likelihood } = EM.infer(EM.data, components);

    // Use equal scales so the isotropic covariance contours are circles.
    const bounds = box2d(126, 16, 330, 204, -5.5, 5.5, -3.4, 3.4);
    const marks = plot(root, svg, bounds, { xt: [-4, -2, 0, 2, 4], yt: [-3, -2, -1, 0, 1, 2, 3] });
    scatterPoints(marks, bounds, false, weights);
    contours(marks, bounds, components);
    symbol(marks, bounds, collapseMean, mixColor(weights[collapseIndex][1]), 4.5, 'circle', C.ink);
    label(root, 'collapse-observation', '$\\mathbf{x}_j$', bounds.X(collapseMean[0]) + 12,
      bounds.Y(collapseMean[1]) - 12, 'bl', C.ink);

    const panel = root.closest('[data-collapse]');
    panel.querySelector('[data-collapse-sigma]').textContent = collapseNumber(sigma);
    panel.querySelector('[data-collapse-det]').textContent = collapseNumber(variance ** 2);
    panel.querySelector('[data-collapse-density]').textContent = collapseNumber(1 / (2 * Math.PI * variance));
    panel.querySelector('[data-collapse-likelihood]').textContent = fixed(likelihood, 2);
    panel.querySelector('input[type=range]').setAttribute('aria-valuetext', collapseNumber(sigma));
  });

  const redraw = panel => panel.querySelectorAll('.fig[data-fig]').forEach(root => FIGS[root.dataset.fig].render(root, stateFor(root)));
  function toggle(button, selected, off, on) {
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? on : off;
  }
  function showStatus(panel) {
    const state = gmmState(panel);
    const { phase, iteration, history, start, error } = state;
    state.components.forEach(({ weight, mean, cov: [a, b, c] }, k) => {
      panel.querySelector('[data-parameter-value="' + k + '-weight"]').textContent = fixed(weight);
      panel.querySelector('[data-parameter-value="' + k + '-mean"]').textContent = '(' + mean.map(v => fixed(v, 2)).join(', ') + ')';
      panel.querySelector('[data-parameter-value="' + k + '-cov"]').innerHTML =
        '<span class="em-matrix"><span>' + [a, b, b, c].map(v => '<span>' + fixed(v, 2) + '</span>').join('') + '</span></span>';
    });
    const active = panel.dataset.running === 'true';
    const atLimit = iteration >= 100;
    panel.querySelector('[data-action="e"]').disabled = active || phase === 'e' || !!error || atLimit;
    panel.querySelector('[data-action="m"]').disabled = active || phase !== 'e' || !!error || atLimit;
    panel.querySelector('[data-action="step"]').disabled = active || !!error || atLimit;
    panel.querySelector('[data-action="run"]').disabled = !!error || atLimit;
    toggle(panel.querySelector('[data-action="run"]'), active, 'Run', 'Pause');
    toggle(panel.querySelector('[data-action="labels"]'), state.labels, 'Show True Labels', 'Hide True Labels');
    panel.querySelector('[data-responsibility-legend]').hidden = state.labels;
    panel.querySelector('[data-label-legend]').hidden = !state.labels;
    panel.querySelector('[data-label-color-note]').hidden = !state.weights;
    panel.dataset.phase = phase;
    const progress = error || (atLimit ? '100-iteration display limit reached.' : {
      initial: state.labels ? 'Ready for the E-step.' : 'Ready for the E-step. Point colors are neutral.',
      e: 'E-step: Update responsibilities while holding parameters fixed.',
      m: 'M-step: Update parameters while holding responsibilities fixed.'
    }[phase]);
    panel.querySelector('[data-status]').textContent =
      'Start ' + (start + 1) + '  ·  Iteration ' + iteration + '  ·  ' + progress;
    const delta = iteration ? '  ·   Gain ' + fixed(history.at(-1) - history.at(-2), 4) : '';
    panel.querySelector('[data-detail]').textContent = 'Observed log-likelihood  ' + fixed(history.at(-1), 4) + delta;
  }
  let timer = null;
  let running = null;
  function stop() {
    clearInterval(timer);
    timer = null;
    if (!running) return;
    running.dataset.running = 'false';
    showStatus(running);
    running = null;
  }
  function gmmAction(panel, action) {
    const state = gmmState(panel);
    if (action === 'reset' || action === 'start') {
      stop();
      stateByPanel.set(panel, EM.gmm(action === 'reset' ? 0 : (state.start + 1) % EM.starts));
    } else if (action === 'labels') state.labels = !state.labels;
    else if (action === 'e') EM.expectation(state);
    else if (action === 'm') EM.maximization(state);
    else if (action === 'step') EM.iterate(state);
    else if (action === 'run') {
      if (running) stop();
      else {
        running = panel;
        panel.dataset.running = 'true';
        timer = setInterval(() => {
          if (state.phase === 'e') EM.maximization(state);
          else EM.expectation(state);
          if (state.error || state.iteration >= 100) stop();
          redraw(panel);
          showStatus(panel);
        }, 105);
      }
    }
    redraw(panel);
    showStatus(panel);
  }

  document.querySelectorAll('[data-collapse]').forEach(panel => {
    panel.style.setProperty('--em-responsibility-gradient', responsibilityGradient);
  });
  document.querySelectorAll('[data-demo="gmm"]').forEach(panel => {
    panel.style.setProperty('--em-responsibility-gradient', responsibilityGradient);
    showStatus(panel);
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    const section = button?.closest('section');
    if (!section?.matches('.slides > section')) return;
    const action = button.dataset.action, panel = button.closest('[data-demo]');
    if (panel?.dataset.demo === 'gmm') gmmAction(panel, action);
    else if (panel?.dataset.demo === 'scalar-algorithm') {
      const state = scalarAlgorithmState(panel);
      if (action === 'reset') stateByPanel.delete(panel);
      else if (action === 'batch') {
        // If the current E-step is already done, its M-step completes the first iteration.
        for (let i = 0; i < 5; i++) {
          if (!state.posterior || state.next !== null) scalarAlgorithmStep(state);
          scalarAlgorithmStep(state);
        }
      } else scalarAlgorithmStep(state);
      redraw(panel);
    } else if (panel?.dataset.demo === 'scalar') {
      const state = scalarState(panel);
      if (action === 'reset') stateByPanel.delete(panel);
      else if (action === 'e' && state.phase !== 'e') scalarExpectation(state);
      else if (action === 'm' && state.phase === 'e') scalarMaximization(state);
      else if (action === 'batch') {
        for (let i = 0; i < 5; i++) {
          if (state.phase !== 'e') scalarExpectation(state);
          scalarMaximization(state);
        }
      }
      redraw(panel);
    } else if (action === 'labels' && section.id === 'missing-labels') {
      const root = section.querySelector('[data-fig="labeledFitCloud"]');
      const state = live.get(root);
      state.user = { ...state.user, labels: button.getAttribute('aria-pressed') !== 'true' };
      show(root);
    }
  });
  Reveal.on('slidechanged', stop);
  return { stop };
})();
