// Keep the live marker in the same viewBox as the Matplotlib SVG background.
(() => {
  const plot = document.querySelector('#bradley-terry .bt-plot');
  if (!plot) return;
  const controls = plot.querySelector('.bt-controls');
  const frame = plot.querySelector('.bt-plot-frame');
  const point = plot.querySelector('.bt-live-point');
  const guides = plot.querySelector('.bt-live-guides');
  const label = plot.querySelector('.bt-live-label');
  const difference = plot.querySelector('.bt-difference');
  const probability = plot.querySelector('.bt-probability');
  const rewards = { a: 1, b: 0 };
  const axes = { left: 72.576, right: 391.104, top: 14.04, bottom: 224.64 };
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const format = (value, digits) => (Math.abs(value) < 1e-10 ? 0 : value)
    .toFixed(digits).replace('-', '−');

  function render() {
    const delta = rewards.a - rewards.b;
    const p = 1 / (1 + Math.exp(-delta));
    const x = axes.left + (delta + 4) / 8 * (axes.right - axes.left);
    const y = axes.bottom - p * (axes.bottom - axes.top);
    point.setAttribute('cx', x);
    point.setAttribute('cy', y);
    guides.setAttribute('d', `M${x},${axes.bottom} V${y} H${axes.left}`);

    const labelWidth = 94;
    const labelX = clamp(x + 12 + labelWidth > axes.right ? x - labelWidth - 12 : x + 12,
      axes.left + 3, axes.right - labelWidth - 3);
    const labelY = clamp(p > .8 ? y + 12 : y - 28, axes.top + 3, axes.bottom - 26);
    label.setAttribute('transform', `translate(${labelX},${labelY})`);
    label.querySelector('text').textContent = `P = ${p.toFixed(3)}`;
    difference.value = format(delta, 1);
    probability.value = p.toFixed(3);
    frame.setAttribute('aria-label', `Reward rA ${format(rewards.a, 1)}, reward rB ${format(rewards.b, 1)}, reward difference ${format(delta, 1)}, preference probability ${p.toFixed(3)}.`);
  }

  controls.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      if (!Number.isFinite(input.valueAsNumber)) return;
      const value = clamp(input.valueAsNumber, -2, 2);
      rewards[input.dataset.reward] = Math.round(value * 10) / 10;
      controls.querySelectorAll(`input[data-reward="${input.dataset.reward}"]`).forEach(peer => {
        // Avoid resetting the cursor while a number is being typed.
        if (peer !== input || value !== input.valueAsNumber) peer.value = rewards[input.dataset.reward].toFixed(1);
      });
      render();
    });
    input.addEventListener('change', () => { input.value = rewards[input.dataset.reward].toFixed(1); });
  });
  // Arrow keys adjust the focused score without advancing the presentation.
  controls.addEventListener('keydown', event => event.stopPropagation());
  controls.addEventListener('pointerdown', event => event.stopPropagation());
  render();
})();
