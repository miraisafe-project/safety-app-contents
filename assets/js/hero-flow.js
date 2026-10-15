(() => {
  'use strict';

  const group = document.querySelector('.hero-concept-group');
  const flow = group?.querySelector('.hero-step-flow');
  if (!flow) return;
  const panels = [...group.querySelectorAll('.concept-step')];
  // Read the one designed curve, rather than generating bends around the panels.
  // Its equally spaced x control points make x(t) linear across the viewport.
  const points = [...flow.querySelector('path').getAttribute('d').matchAll(/(-?\d+)\s+(-?\d+)/g)]
    .map(match => ({ x: Number(match[1]), y: Number(match[2]) }));

  const alignPanels = () => {
    const bounds = flow.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const scale = window.devicePixelRatio || 1;
    panels.forEach(panel => {
      const rect = panel.getBoundingClientRect();
      const t = (rect.left + rect.width / 2 - bounds.left) / bounds.width;
      const u = 1 - t;
      const y = u ** 3 * points[0].y + 3 * u ** 2 * t * points[1].y
        + 3 * u * t ** 2 * points[2].y + t ** 3 * points[3].y;
      const offset = (y / flow.viewBox.baseVal.height - .5) * bounds.height;
      // Snap to physical pixels to keep the existing text and icons crisp.
      panel.style.setProperty('--flow-offset', `${Math.round(offset * scale) / scale}px`);
    });
  };

  const observer = new ResizeObserver(alignPanels);
  observer.observe(group);
  window.addEventListener('resize', alignPanels, { passive: true });
  window.addEventListener('pageshow', alignPanels);
  alignPanels();
})();
