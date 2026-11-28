// DOM-only candidate generation shared by the build and dynamic news renderer.
export const TARGETS = 'main p, main h1, main h2, main h3, main h4, main li, main dt, main dd, main figcaption, main .tile-copy > span, main .tile-copy strong, main .news-row-title';
const EXCLUDE = 'nav, button, .button, .text-link, .eyebrow, .concept-step, .app-feature-labels, .news-meta, .news-breadcrumb, .news-pagination, .zoom-hint, .figure-sources, .challenge-sources, .news-label, .contact-label, [data-wrap="off"], [contenteditable]';
export function textNodes(element) {
  const result = [];
  function walk(node) {
    if (node.nodeType === 3) result.push(node);
    else if (node.nodeType === 1) for (const child of node.childNodes) walk(child);
  }
  walk(element);
  return result;
}
export function eligible(element) {
  return !element.closest(EXCLUDE) && !element.querySelector('p, li, ruby, code, pre, br, button, input, textarea, time, .figure-sources, .zoom-hint, [data-wrap="off"]') && /[ぁ-んァ-ヶ一-龠]/u.test(element.textContent) && !/(https?:\/\/|[\w.+-]+@[\w.-]+\.)/u.test(element.textContent);
}
export function boundaries(text, parser) {
  let offset = 0;
  return parser.parse(text).slice(0, -1).map(part => (offset += part.length));
}
function annotatePlainText(el) {
  if (!el.hasAttribute('data-wrap-groups') && !el.hasAttribute('data-wrap-breaks-after')) return;
  for (const hint of el.querySelectorAll('[data-jp-hint]')) hint.replaceWith(...hint.childNodes);
  el.normalize();
  if (el.children.length) return; // Rich HTML uses authored span/WBR; never flatten it.
  const text = el.textContent, groups = [], breaks = new Set();
  function values(name) { try { const v = JSON.parse(el.getAttribute(name) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.length) : []; } catch { return []; } }
  for (const value of values('data-wrap-groups')) {
    const start = text.indexOf(value), end = start + value.length;
    if (start >= 0 && !groups.some(g => start < g.end && end > g.start)) groups.push({start, end});
  }
  for (const value of values('data-wrap-breaks-after')) { const start = text.indexOf(value); if (start >= 0) breaks.add(start + value.length); }
  const fragment = el.ownerDocument.createDocumentFragment();
  for (let i = 0; i < text.length;) {
    if (breaks.has(i)) { const w = el.ownerDocument.createElement('wbr'); w.setAttribute('data-wrap-priority', ''); w.setAttribute('data-jp-hint', ''); fragment.append(w); }
    const group = groups.find(g => g.start === i);
    if (group) { const span = el.ownerDocument.createElement('span'); span.setAttribute('data-wrap-group', ''); span.setAttribute('data-jp-hint', ''); span.textContent = text.slice(i, group.end); fragment.append(span); i = group.end; }
    else { const next = Math.min(...groups.filter(g => g.start > i).map(g => g.start), ...[...breaks].filter(n => n > i), text.length); fragment.append(el.ownerDocument.createTextNode(text.slice(i, next))); i = next; }
  }
  el.replaceChildren(fragment);
}
export function prepare(root, parser) {
  const blocks = [...root.querySelectorAll(TARGETS)];
  let count = 0;
  for (const el of blocks) {
    if (!eligible(el)) continue;
    // Idempotent even after text edits: remove only our own markers, not author WBRs.
    for (const marker of el.querySelectorAll('wbr[data-jp-auto]')) marker.remove();
    el.normalize();
    annotatePlainText(el);
    const nodes = textNodes(el), text = nodes.map(n => n.textContent).join('');
    const positions = new Set(boundaries(text, parser));
    for (const match of text.matchAll(/[、。！？；]/gu)) positions.add(match.index + match[0].length);
    let cursor = 0;
    function authorBoundaries(node) {
      if (node.nodeType === 3) cursor += node.textContent.length;
      else if (node.nodeType === 1) {
        const start = cursor;
        if (node.matches('wbr[data-wrap-priority]')) positions.add(cursor);
        for (const child of node.childNodes) authorBoundaries(child);
        if (node.hasAttribute('data-wrap-group')) { positions.add(start); positions.add(cursor); }
      }
    }
    authorBoundaries(el);
    // WBR is stronger than native kinsoku. Never generate an illegal boundary.
    for (const position of positions) if (/[、。，．！？）」』】〕〉》ーぁぃぅぇぉっゃゅょァィゥェォッャュョ]/u.test(text[position] || '') || /[（「『【〔〈《]/u.test(text[position - 1] || '')) positions.delete(position);
    // Author groups expose boundaries but keep the original text and inline elements.
    let base = 0;
    for (const node of nodes) {
      const value = node.textContent, fragment = el.ownerDocument.createDocumentFragment();
      let start = 0;
      for (let i = 1; i <= value.length; i++) {
        if (!positions.has(base + i) || base + i >= text.length) continue;
        fragment.append(el.ownerDocument.createTextNode(value.slice(start, i)));
        const wbr = el.ownerDocument.createElement('wbr');
        wbr.setAttribute('data-jp-auto', '');
        wbr.setAttribute('aria-hidden', 'true');
        fragment.append(wbr); start = i;
      }
      fragment.append(el.ownerDocument.createTextNode(value.slice(start)));
      node.replaceWith(fragment); base += value.length;
    }
    el.setAttribute('data-jp-ready', ''); count++;
  }
  return count;
}

// Whole-paragraph dynamic programming, independent of DOM and font measurement.
// Same line count as greedy phrase wrapping: preference cannot add gratuitous lines.
export function chooseBreaks(points, width, groups = []) {
  if (!Number.isFinite(width) || width <= 0 || points.length < 2) return null;
  const last = points.length - 1, safety = 1;
  let lines = 0, at = 0;
  while (at < last) {
    let next = at;
    for (let j = at + 1; j <= last && points[j].x - points[at].x <= width - safety; j++) next = j;
    if (next === at) return null; // A phrase is too wide: use normal emergency wrapping.
    at = next; lines++;
  }
  if (lines <= 1) return [];
  const dp = Array.from({length: lines + 1}, () => new Map());
  dp[0].set(0, {cost: 0});
  for (let line = 1; line <= lines; line++) for (const [i, prior] of dp[line - 1]) {
    for (let j = i + 1; j <= last; j++) {
      const used = points[j].x - points[i].x;
      if (used > width - safety) break;
      const end = j === last, empty = 1 - used / width;
      // Very sparse non-final lines are never preferred for punctuation alone.
      const ragged = end ? (used / width < .28 ? 80 : 0) : 34 * empty * empty + (empty > .38 ? 45 : 0);
      let cut = end ? 0 : ({punctuation: 0, author: 1, phrase: 5}[points[j].kind] ?? 25);
      for (const group of groups) if (group.start < points[j].offset && points[j].offset < group.end && group.width <= width - safety) cut += 150;
      const cost = prior.cost + ragged + cut;
      if (cost < (dp[line].get(j)?.cost ?? Infinity)) dp[line].set(j, {cost, prev: i});
    }
  }
  if (!dp[lines].has(last)) return null;
  const result = []; let j = last;
  for (let line = lines; line > 0; line--) { if (j !== last) result.unshift(points[j].offset); j = dp[line].get(j).prev; }
  return result;
}
