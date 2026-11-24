// Use the Sampling II footer, counting only lecture content.
slideLabel = slide => slide?.dataset.contentNumber
  ? [slide.dataset.contentNumber, '/', document.querySelectorAll('[data-content-number]').length]
  : [''];

document.querySelectorAll('.slides > section > notes').forEach(notes => {
  const narration = document.createElement('narration');
  const say = document.createElement('say');
  say.textContent = notes.textContent;
  narration.appendChild(say);
  notes.after(narration);
});

startDeck();
