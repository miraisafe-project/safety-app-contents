import {loadDefaultJapaneseParser} from 'budoux';
import {prepare, TARGETS, eligible, textNodes, chooseBreaks} from '../typography/core.mjs';

const parser = loadDefaultJapaneseParser(), signatures = new WeakMap(), widths = new WeakMap();
const evaluations = new WeakMap();
let fontEpoch = 0;
let pausedWidth = null;
const mode = new URL(location.href).searchParams.get('jp-wrap') || 'evaluate';
document.documentElement.dataset.wrapMode = mode;
const stats = {prepared: 0, evaluated: 0, reverted: 0, milliseconds: 0, maxPassMilliseconds: 0};
const pilot = 'body.home-page .home-app-intro, body.home-page .home-purpose, body.home-page .explore, body.home-page .contact-copy, [data-wrap-evaluate]';
function reset(el) {
  el.classList.remove('jp-evaluated');
  for (const marker of el.querySelectorAll('wbr[data-jp-selected]')) marker.removeAttribute('data-jp-selected');
}
function evaluate(el) {
  reset(el);
  if (pausedWidth === innerWidth) return;
  if (!CSS.supports('contain', 'inline-size')) return;
  if (!['evaluate', 'evaluate-all'].includes(mode) || !el.matches('p, .tile-copy > span') || (mode !== 'evaluate-all' && !el.closest(pilot)) || el.querySelector('a, ruby, br, code') || el.textContent.length > 600) return;
  const style = getComputedStyle(el), width = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  if (width < 80 || !el.getClientRects().length) return;
  const points = [{offset: 0, kind: 'author'}], groups = []; let cursor = 0;
  function walk(node) {
    if (node.nodeType === 3) cursor += node.textContent.length;
    else if (node.nodeType === 1) {
      const start = cursor;
      if (node.matches('wbr')) points.push({offset: cursor, kind: node.hasAttribute('data-wrap-priority') ? 'author' : 'phrase'});
      for (const child of node.childNodes) walk(child);
      if (node.hasAttribute('data-wrap-group')) groups.push({start, end: cursor});
    }
  }
  walk(el);
  for (const group of groups) points.push({offset: group.start, kind: 'author'}, {offset: group.end, kind: 'author'});
  points.push({offset: cursor, kind: 'author'});
  const text = el.textContent;
  const unique = [...new Map(points.map(p => [p.offset, p])).values()].sort((a, b) => a.offset - b.offset);
  if (unique.length > 180) return;
  const clone = el.cloneNode(true);
  clone.removeAttribute('id');
  for (const child of clone.querySelectorAll('[id]')) child.removeAttribute('id');
  Object.assign(clone.style, {position: 'absolute', left: '0', top: '0', width: 'max-content', maxWidth: 'none', minWidth: '0', whiteSpace: 'nowrap', textWrap: 'nowrap', visibility: 'hidden', pointerEvents: 'none'});
  clone.setAttribute('aria-hidden', 'true');
  for (const group of clone.querySelectorAll('[data-wrap-group]')) Object.assign(group.style, {display: 'inline', width: 'auto', maxWidth: 'none'});
  // A clipped measuring box avoids transient page overflow in WebKit as well.
  const box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  Object.assign(box.style, {position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', overflow: 'hidden', contain: 'strict', visibility: 'hidden', pointerEvents: 'none'});
  box.append(clone); el.parentNode.append(box);
  try {
    const nodes = textNodes(clone), range = document.createRange();
    function endpoint(offset) {
      for (const node of nodes) { if (offset <= node.length) return [node, offset]; offset -= node.length; }
      return [nodes.at(-1), nodes.at(-1).length];
    }
    function x(offset) { range.setStart(nodes[0], 0); range.setEnd(...endpoint(offset)); return range.getBoundingClientRect().width; }
    for (const p of unique) { p.x = x(p.offset); if (/[、。！？；]/u.test(text[p.offset - 1] || '')) p.kind = 'punctuation'; }
    for (const g of groups) g.width = x(g.end) - x(g.start);
    const cuts = chooseBreaks(unique, width, groups);
    if (cuts === null) return;
    // WBRs carry no text: selection, search and screen-reader text stay unchanged.
    const chosen = new Set(cuts); let offset = 0;
    function select(node) {
      if (node.nodeType === 3) offset += node.length;
      else if (node.nodeType === 1) { if (node.matches('wbr') && chosen.has(offset)) node.setAttribute('data-jp-selected', ''); for (const c of node.childNodes) select(c); }
    }
    select(el); el.classList.add('jp-evaluated');
    if (el.scrollWidth > el.clientWidth + 1) { reset(el); stats.reverted++; return; }
    // Font metrics and inline boxes can differ slightly between engines. If a
    // planned segment still wraps, do not force an emergency split mid-word.
    const actual = document.createRange();
    for (const node of textNodes(el)) {
      if (!node.textContent.trim()) continue;
      actual.selectNodeContents(node);
      const centers = [...actual.getClientRects()].filter(r => r.width > .1).map(r => r.y + r.height / 2);
      if (centers.length && Math.max(...centers) - Math.min(...centers) > parseFloat(style.lineHeight) * .65) {
        reset(el); stats.reverted++; return;
      }
    }
    stats.evaluated++;
  } finally { box.remove(); }
}
let frame = 0;
let resizeTimer = 0;
function scheduleResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(schedule, 120); }
const observed = new WeakSet();
const resize = new ResizeObserver(entries => {
  let changed = false;
  for (const {target, contentRect} of entries) if (Math.abs((widths.get(target) ?? -1) - contentRect.width) > .5) { widths.set(target, contentRect.width); changed = true; }
  if (changed) scheduleResize();
});
function refresh() {
  const start = performance.now();
  // Measure the fallback layout first. Old selected runs must not impose their
  // wide-screen min-content width on a newly narrowed automatic grid track.
  for (const el of document.querySelectorAll('.jp-evaluated')) el.classList.remove('jp-evaluated');
  // Remove old size constraints before measuring a narrower container. Otherwise
  // a formerly fitting inline-block can inflate an automatic grid track.
  for (const group of document.querySelectorAll('[data-jp-group-fit]')) group.removeAttribute('data-jp-group-fit');
  for (const el of document.querySelectorAll(TARGETS)) {
    if (!eligible(el)) continue;
    const text = el.textContent;
    if (signatures.get(el) !== text) {
      if (!el.hasAttribute('data-jp-ready') || signatures.has(el)) {
        // A minimal root makes the same shared prepare() function usable on one block.
        prepare({querySelectorAll: () => [el]}, parser); stats.prepared++;
      }
      signatures.set(el, text);
    }
    if (!observed.has(el)) { resize.observe(el); observed.add(el); }
    if (mode !== 'css' && mode !== 'off') for (const group of el.querySelectorAll('[data-wrap-group]')) {
      const range = document.createRange(); let used = 0;
      for (const node of textNodes(group)) { range.selectNodeContents(node); for (const rect of range.getClientRects()) used += rect.width; }
      if (used <= el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight) - 1) group.setAttribute('data-jp-group-fit', '');
    }
    const computed = getComputedStyle(el);
    const key = `${text}|${el.clientWidth}|${innerWidth}|${computed.font}|${computed.letterSpacing}|${fontEpoch}`;
    const cached = evaluations.get(el);
    if (cached?.key !== key) {
      try { evaluate(el); } catch { reset(el); stats.reverted++; }
      evaluations.set(el, {key, active: el.classList.contains('jp-evaluated')});
    } else if (cached.active) el.classList.add('jp-evaluated');
  }
  // Some engines retain inline overflow outside an element's own scrollWidth.
  // If the page-wide check fails, keep the stable BudouX layout at this width.
  if (['evaluate', 'evaluate-all'].includes(mode) && document.documentElement.scrollWidth > innerWidth + 1) {
    for (const el of document.querySelectorAll('.jp-evaluated')) { reset(el); evaluations.delete(el); stats.reverted++; }
    pausedWidth = innerWidth;
  }
  const elapsed = performance.now() - start;
  stats.milliseconds += elapsed;
  stats.maxPassMilliseconds = Math.max(stats.maxPassMilliseconds, elapsed);
}
function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; refresh(); }); }
// Wait for fonts before measuring. Static BudouX candidates remain visible throughout.
Promise.resolve(document.fonts?.ready).then(schedule);
document.fonts?.addEventListener('loadingdone', () => { fontEpoch++; schedule(); });
window.addEventListener('resize', scheduleResize, {passive: true});
document.addEventListener('website:content', schedule);
// Covers future dynamic copy too; marker-only mutations do not change text signatures.
const mutation = new MutationObserver(records => {
  if (records.some(r => r.type === 'characterData' || [...r.addedNodes].some(n => n.nodeType === 3 || (n.nodeType === 1 && !n.matches('wbr, [aria-hidden="true"]'))))) schedule();
});
mutation.observe(document.querySelector('main'), {subtree: true, childList: true, characterData: true});
window.MiraiTypography = {refresh: schedule, stats, mode};
