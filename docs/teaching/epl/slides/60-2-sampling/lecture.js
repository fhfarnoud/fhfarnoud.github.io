slideLabel = slide => {
  if (!slide?.dataset.contentNumber) return [''];
  const total = document.querySelectorAll('.slides > section[data-content-number]').length;
  return [slide.dataset.contentNumber, '/', total];
};

document.querySelectorAll('.slides > section > notes').forEach(notes => {
  const narration = document.createElement('narration');
  const say = document.createElement('say');
  say.textContent = notes.textContent;
  narration.appendChild(say);
  notes.after(narration);
});

startDeck();
