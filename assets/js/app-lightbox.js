(() => {
  'use strict';
  const dialog = document.createElement('dialog');
  dialog.className = 'app-lightbox';
  dialog.setAttribute('aria-label', '画像の拡大表示');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'app-lightbox-close';
  close.setAttribute('aria-label', '拡大画像を閉じる');
  close.textContent = '×';
  const image = document.createElement('img');
  dialog.append(close, image);
  document.body.append(dialog);
  let source, position, previousStyle;
  document.addEventListener('click', event => {
    const trigger = event.target.closest('.feature-zoom, [data-image-zoom]');
    if (!trigger) return;
    if (dialog.open) return;
    source = trigger;
    const thumbnail = trigger.querySelector('img');
    image.src = thumbnail.currentSrc || thumbnail.src;
    image.alt = thumbnail.alt;
    position = { x: window.scrollX, y: window.scrollY };
    previousStyle = document.body.getAttribute('style');
    // Fixed positioning also locks the document on mobile browsers.
    Object.assign(document.body.style, { position: 'fixed', top: `-${position.y}px`, left: `-${position.x}px`, width: '100%', overflow: 'hidden' });
    dialog.showModal();
    close.focus({ preventScroll: true });
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      close.focus({ preventScroll: true });
    }
  });
  // The dialog fills the viewport; only the empty area dismisses it.
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    if (previousStyle === null) document.body.removeAttribute('style');
    else document.body.setAttribute('style', previousStyle);
    // Override smooth page scrolling for exact position restoration.
    window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
    source?.focus({ preventScroll: true });
  });
})();
