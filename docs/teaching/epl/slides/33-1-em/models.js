// Scalar Example 7.1 and the two-component, full-covariance Gaussian mixture.
const EM = (() => {
  const logTwoPi = Math.log(2 * Math.PI);
  const logNormal = (x, mean, variance) =>
    -0.5 * (logTwoPi + Math.log(variance) + (x - mean) ** 2 / variance);
  const scalar = {
    observed: (theta, x = 2, noiseVariance = 1) => logNormal(x, 0, theta + noiseVariance),
    posterior(theta) {
      const gain = theta / (theta + 1);
      return { mean: 2 * gain, variance: gain };
    },
    update(theta) {
      return scalar.maximize(scalar.posterior(theta));
    },
    maximize({ mean, variance }) {
      return mean ** 2 + variance;
    },
    bound(theta, current) {
      return scalar.boundFromPosterior(theta, scalar.posterior(current));
    },
    boundFromPosterior(theta, { mean, variance }) {
      const signal = -0.5 * (logTwoPi + Math.log(theta) + (mean ** 2 + variance) / theta);
      const noise = -0.5 * (logTwoPi + (2 - mean) ** 2 + variance);
      const entropy = 0.5 * (1 + logTwoPi + Math.log(variance));
      return signal + noise + entropy;
    }
  };

  // A seeded recreation of the two-cloud setup in Fig. 7.1. The fitting
  // code receives coordinates alone. Ground truth is used only by the views.
  const truth = [
    { mean: [-2.35, -0.35], cov: [1.05, 0.63, 0.95] },
    { mean: [1.75, 0.75], cov: [1.08, -0.62, 0.94] }
  ];
  const labeled = truth.flatMap(({ mean, cov: [a, b, c] }, label) =>
    normals(20261124 + label, label ? 96 : 84).map(([u, v]) => ({
      label,
      xy: [mean[0] + Math.sqrt(a) * u, mean[1] + b / Math.sqrt(a) * u + Math.sqrt(c - b * b / a) * v]
    }))
  );
  const data = labeled.map(({ xy }) => xy);
  const starts = [
    [[-0.85, 1.30], [0.75, -0.95]],
    [[-2.3, 0.0], [-1.65, 0.90]],
    [[-2.6, -0.80], [2.25, 1.05]],
    [[-0.25, -0.45], [-0.25, -0.45]]
  ];
  function initial(index = 0) {
    return starts[index].map(mean => ({ weight: 0.5, mean, cov: [2.6, 0, 1.65] }));
  }

  function logDensity([x, y], { mean: [mx, my], cov: [a, b, c] }) {
    const dx = x - mx, dy = y - my;
    const determinant = a * c - b * b;
    const distance = (c * dx * dx - 2 * b * dx * dy + a * dy * dy) / determinant;
    return -logTwoPi - 0.5 * (Math.log(determinant) + distance);
  }
  function infer(points, components) {
    let likelihood = 0;
    const weights = points.map(point => {
      const [a, b] = components.map(component => Math.log(component.weight) + logDensity(point, component));
      const max = Math.max(a, b);
      const first = Math.exp(a - max), second = Math.exp(b - max), normalizer = first + second;
      likelihood += max + Math.log(normalizer);
      return [first / normalizer, second / normalizer];
    });
    return { weights, likelihood };
  }
  function maximize(points, weights) {
    const components = [0, 1].map(k => {
      const mass = weights.reduce((sum, w) => sum + w[k], 0);
      if (!(mass > 1e-10)) return null;
      const mean = [0, 0], cov = [0, 0, 0];
      points.forEach(([x, y], i) => {
        mean[0] += weights[i][k] * x / mass;
        mean[1] += weights[i][k] * y / mass;
      });
      points.forEach(([x, y], i) => {
        const dx = x - mean[0], dy = y - mean[1], w = weights[i][k] / mass;
        cov[0] += w * dx * dx;
        cov[1] += w * dx * dy;
        cov[2] += w * dy * dy;
      });
      const [a, b, c] = cov;
      const smallestEigenvalue = 2 * (a * c - b * b) / (a + c + Math.hypot(a - c, 2 * b));
      if (!(smallestEigenvalue > 1e-6)) return null;
      return { weight: mass / points.length, mean, cov };
    });
    return components.every(Boolean) ? components : null;
  }
  // With observed labels, the Gaussian MLE uses hard assignment weights.
  const labeledFit = maximize(data, labeled.map(({ label }) => [1 - label, label]));

  function gmm(start = 0) {
    return {
      start, iteration: 0, components: initial(start), previous: null, weights: null,
      phase: 'initial', labels: false, error: '', history: [infer(data, initial(start)).likelihood]
    };
  }
  function expectation(state) {
    state.weights = infer(data, state.components).weights;
    state.phase = 'e';
  }
  function maximization(state) {
    const candidate = maximize(data, state.weights);
    if (!candidate) {
      state.error = 'Stopped at a near-singular covariance or negligible component weight. Try another start.';
      return;
    }
    const score = infer(data, candidate).likelihood;
    if (!Number.isFinite(score) || score < state.history.at(-1) - 1e-8) {
      state.error = 'Stopped after a numerical failure. Try another start.';
      return;
    }
    state.previous = state.components;
    state.components = candidate;
    state.iteration++;
    state.phase = 'm';
    state.history.push(score);
  }
  function iterate(state) {
    if (state.phase !== 'e') expectation(state);
    maximization(state);
  }

  function variationalExample() {
    const logPosterior = y => {
      const left = Math.log(0.65) + logNormal(y, -1.8, 0.55 ** 2);
      const right = Math.log(0.35) + logNormal(y, 1.8, 0.65 ** 2);
      const max = Math.max(left, right);
      return max + Math.log(Math.exp(left - max) + Math.exp(right - max));
    };
    // Integrate E_q[log p] in standard-normal coordinates and use the exact Gaussian entropy.
    const dz = 0.05;
    const nodes = Array.from({ length: 320 }, (_, i) => {
      const z = -8 + (i + 0.5) * dz;
      return [z, dz * phi(z, 0, 1)];
    });
    const divergence = (mean, logSd) => {
      const sd = Math.exp(logSd);
      const expectedLogPosterior = nodes.reduce((sum, [z, weight]) =>
        sum + weight * logPosterior(mean + sd * z), 0);
      return -0.5 * (1 + logTwoPi) - logSd - expectedLogPosterior;
    };

    const directions = [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => [a, b])).filter(([a, b]) => a || b);
    // Start near both modes and between them because reverse KL can have multiple local minima.
    const candidates = [-1.8, 0, 1.8].flatMap(start => [0.55, 1.2, 2].map(sd => {
      let best = [start, Math.log(sd), divergence(start, Math.log(sd))];
      for (let step = 0.5; step > 1e-5;) {
        const [mean, logSd] = best;
        let improved = best;
        for (const [a, b] of directions) {
          const x = mean + a * step, s = logSd + b * step;
          const value = divergence(x, s);
          if (value < improved[2]) improved = [x, s, value];
        }
        if (improved === best) step *= 0.5;
        best = improved;
      }
      return best;
    }));
    candidates.sort((a, b) => a[2] - b[2]);
    const [mean, logSd] = candidates[0];
    return {
      posterior: y => Math.exp(logPosterior(y)),
      gaussian: y => phi(y, mean, Math.exp(2 * logSd))
    };
  }

  return { scalar, data, labeled, labeledFit, initial, infer, maximize, gmm, expectation, maximization, iterate,
    variationalExample, starts: starts.length };
})();
