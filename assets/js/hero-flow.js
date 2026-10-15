(() => {
  'use strict';

  const group = document.querySelector('.hero-concept-group');
  const flow = group?.querySelector('.hero-step-flow');
  const panels = [...(group?.querySelectorAll('.concept-step') || [])];
  if (!flow || panels.length !== 3) return;

  const drawFlow = () => {
    const bounds = group.getBoundingClientRect();
    const width = window.innerWidth;
    if (!width || !bounds.height) return;
    const left = bounds.left + bounds.width / 2 - width / 2;
    const y = bounds.height / 2;
    const edges = panels.map(panel => {
      const rect = panel.getBoundingClientRect();
      return [rect.left - left, rect.right - left];
    });
    const tail = Math.min(24, bounds.height * .18);
    let d = `M 0 ${y - tail} C ${edges[0][0] * .4} ${y - tail} ${edges[0][0] * .6} ${y} ${edges[0][0]} ${y}`;
    edges.forEach(([, end], index) => {
      // Hidden inside each opaque panel, this part keeps the single path continuous.
      d += ` L ${end} ${y}`;
      if (index === edges.length - 1) return;
      const next = edges[index + 1][0];
      const gap = next - end;
      const middle = (end + next) / 2;
      const bend = Math.min(14, gap * .1) * (index === 0 ? 1 : -1);
      // Horizontal tangents at both connection nodes and the gentle crest/trough.
      d += ` C ${end + gap * .2} ${y} ${middle - gap * .2} ${y + bend} ${middle} ${y + bend}`;
      d += ` C ${middle + gap * .2} ${y + bend} ${next - gap * .2} ${y} ${next} ${y}`;
    });
    const end = edges[edges.length - 1][1];
    const remaining = width - end;
    d += ` C ${end + remaining * .4} ${y} ${end + remaining * .6} ${y + tail} ${width} ${y + tail}`;
    flow.setAttribute('viewBox', `0 0 ${width} ${bounds.height}`);
    flow.querySelector('path').setAttribute('d', d);
    flow.removeAttribute('hidden');
    group.classList.add('is-connected');
  };

  const observer = new ResizeObserver(drawFlow);
  observer.observe(group);
  panels.forEach(panel => observer.observe(panel));
  window.addEventListener('resize', drawFlow, { passive: true });
  window.addEventListener('pageshow', drawFlow);
  drawFlow();
})();
