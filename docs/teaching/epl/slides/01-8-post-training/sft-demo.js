// Mount the optional NUS chat only on the first click. Preserve its iframe
// and browser-loaded model when temporarily hiding the demonstration.
(() => {
  const slide = document.getElementById('why-fine-tune');
  const trigger = slide.querySelector('.try-demo');
  const overlay = document.getElementById('sft-live-overlay');
  const close = overlay.querySelector('.sft-live-close');
  const copy = overlay.querySelector('.sft-live-copy');
  const prompt = 'Give me three ideas for a weekend in Singapore.';
  let frame = null;
  function hide() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (Reveal.getCurrentSlide() === slide) trigger.focus({ preventScroll: true });
  }
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', () => {
    if (!frame) {
      frame = document.createElement('iframe');
      frame.title = 'NUS live comparison: GPT-2 Small and instruction-tuned LaMini-GPT';
      frame.allow = 'fullscreen; clipboard-write';
      frame.allowFullscreen = true;
      frame.src = 'https://costa-nus.github.io/CEG5305_GenAI/part2/lecture-2/demos/chat/?model=gpt2';
      overlay.querySelector('.sft-live-frame').append(frame);
    }
    overlay.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    close.focus({ preventScroll: true });
  });
  close.addEventListener('click', hide);
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      copy.textContent = 'Prompt copied';
      setTimeout(() => { copy.textContent = 'Copy prompt'; }, 1800);
    } catch {
      window.prompt('Copy this prompt into the demo:', prompt);
    }
  });
  overlay.addEventListener('click', event => { if (event.target === overlay) hide(); });
  // Capture parent-page shortcuts so builds stay fixed while the demo is open.
  // Keys inside the cross-origin chat stay within that page. Close stays outside.
  window.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); hide(); }
    if (event.key === 'Tab') {
      const controls = [...overlay.querySelectorAll('button, a, iframe')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    event.stopImmediatePropagation();
  }, true);
  Reveal.on('slidechanged', () => { if (Reveal.getCurrentSlide() !== slide) hide(); });
})();
