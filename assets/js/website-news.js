(() => {
  'use strict';
  const root = new URL('../../', document.currentScript.src);
  const host = document.querySelector('[data-news-home], [data-news-list], [data-news-detail]');
  if (!host) return;
  const home = host.hasAttribute('data-news-home'), detail = host.hasAttribute('data-news-detail');
  const categories = ['アプリ', '活動情報', '公式サイト', '重要なお知らせ', 'その他'];
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const url = value => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try { const u = new URL(value, root); return u.protocol === 'https:' || (u.protocol === 'http:' && u.origin === location.origin) ? u : null; } catch { return null; }
  };
  const day = date => { const n = Date.parse(`${date}T00:00:00+09:00`); return Number.isFinite(n) ? n / 86400000 : NaN; };
  const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const dateText = date => date.replace(/-/g, '.');
  const badge = item => el('span', item.category, `news-category category-${categories.indexOf(item.category)}`);
  function link(label, value, cls) {
    const a = el('a', label, cls), u = url(value);
    if (!u) return el('span', label);
    a.href = u.href;
    if (u.origin !== location.origin) {
      a.target = '_blank'; a.rel = 'noopener noreferrer'; a.append(el('span', ' ↗', 'news-arrow'));
      a.setAttribute('aria-label', `${label}（新しいタブで開きます）`);
    }
    return a;
  }
  function row(item) {
    const destination = item.action === 'detail' ? `news/detail/?id=${encodeURIComponent(item.id)}` : item.url;
    const a = link('', destination, 'news-row');
    a.setAttribute('aria-label', `${dateText(item.date)} ${item.title}${url(destination)?.origin !== location.origin ? '（新しいタブで開きます）' : ''}`);
    a.replaceChildren();
    const time = el('time', dateText(item.date)); time.dateTime = item.date; a.append(time);
    if (!home) a.append(badge(item));
    a.append(el('span', item.title, 'news-row-title'));
    const age = day(today()) - day(item.date);
    if (!home && age >= 0 && age < 7) a.append(el('span', 'NEW', 'news-new'));
    const arrow = el('span', url(destination)?.origin !== location.origin ? '↗' : '→', 'news-arrow'); arrow.setAttribute('aria-hidden', 'true'); a.append(arrow);
    return a;
  }
  function renderArticle(item) {
    const crumb = el('nav', '', 'news-breadcrumb'); crumb.setAttribute('aria-label', 'パンくずリスト');
    crumb.append(link('ホーム', './'), el('span', ' ＞ '), link('お知らせ', 'news/'), el('span', ` ＞ ${item.title}`));
    const article = el('article', '', 'news-article'), meta = el('div', '', 'news-meta');
    const time = el('time', dateText(item.date)); time.dateTime = item.date; meta.append(time, badge(item));
    article.append(meta, el('h1', item.title));
    document.querySelector('.page-hero').hidden = true;
    document.title = `${item.title} | ミライセーフプロジェクト`;
    document.querySelector('link[rel=canonical]').href = new URL(`news/detail/?id=${encodeURIComponent(item.id)}`, root).href;
    document.querySelector('meta[property="og:title"]').content = item.title;
    document.querySelector('meta[property="og:url"]').content = document.querySelector('link[rel=canonical]').href;
    const content = el('div', '', 'news-body');
    for (const block of item.blocks || []) {
      if (block.type === 'paragraph' && typeof block.text === 'string') content.append(el('p', block.text));
      if (block.type === 'image' && url(block.src)) {
        const f = el('figure', '', 'news-figure'), button = el('button', '', 'news-image-zoom'), img = el('img');
        button.type = 'button'; button.setAttribute('data-image-zoom', ''); button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-label', `${block.alt || 'お知らせ画像'}を拡大表示`);
        img.src = url(block.src).href; img.alt = block.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
        if (block.width && block.height) { img.width = block.width; img.height = block.height; }
        button.append(img); f.append(button); if (block.caption) f.append(el('figcaption', block.caption)); content.append(f);
      }
      if ((block.type === 'link' || block.type === 'social') && url(block.url)) {
        const a = link(block.label || '関連ページ', block.url, block.type === 'social' ? 'news-social' : 'button button-primary news-related');
        if (block.type === 'social') {
          const icon = el('span', '', 'news-social-icon'); icon.setAttribute('aria-hidden', 'true');
          icon.innerHTML = block.service === 'x' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 3 20 21H15L4 3H9L20 21M20 3 4 21"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" fill="currentColor"/></svg>';
          a.prepend(icon); if (block.account) a.append(el('span', block.account, 'news-account'));
        }
        content.append(a);
      }
    }
    if (item.layout === 'text-image') {
      const nodes = [...content.children];
      const figures = nodes.filter(node => node.tagName === 'FIGURE');
      const text = nodes.filter(node => node.tagName !== 'FIGURE');
      if (figures.length && text.length) {
        const copy = el('div', '', 'news-split-copy'), media = el('div', '', 'news-split-media');
        copy.append(...text); media.append(...figures);
        content.classList.add('news-body--split');
        content.replaceChildren(copy, media);
      }
    }
    article.append(content, link('お知らせ一覧に戻る', 'news/', 'text-link')); host.append(crumb, article);
  }
  fetch(new URL('website/news/website_news.json', root), { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw Error('load'); return r.json(); })
    .then(data => {
      if (!Array.isArray(data.items)) throw Error('format');
      const ids = new Set();
      for (const item of data.items) {
        if (!item || typeof item.id !== 'string' || !/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id) || typeof item.title !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(day(item.date)) || !categories.includes(item.category) || !['detail', 'link'].includes(item.action) || (item.action === 'link' && !url(item.url)) || (item.blocks !== undefined && !Array.isArray(item.blocks))) throw Error('format');
        ids.add(item.id);
      }
      const items = data.items.filter(i => i.published === true && day(i.date) <= day(today())).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
      host.replaceChildren();
      if (detail) {
        const item = items.find(i => i.id === new URL(location.href).searchParams.get('id') && i.action === 'detail');
        if (item) renderArticle(item); else host.append(el('p', 'お知らせが見つかりません。'), link('お知らせ一覧に戻る', 'news/'));
        return;
      }
      if (!items.length) { host.append(el('p', '現在、お知らせはありません。')); return; }
      const pages = Math.ceil(items.length / 10), requested = Number(new URL(location.href).searchParams.get('page')) || 1;
      const page = Math.min(pages, Math.max(1, Math.trunc(requested)));
      const list = el('ul', '', 'news-rows');
      (home ? items.slice(0, 3) : items.slice((page - 1) * 10, page * 10)).forEach(item => { const li = el('li'); li.append(row(item)); list.append(li); }); host.append(list);
      if (!home && pages > 1) {
        const nav = el('nav', '', 'news-pagination'); nav.setAttribute('aria-label', 'お知らせのページ切り替え');
        for (let n = 1; n <= pages; n++) { const a = link(String(n), `news/?page=${n}`); if (n === page) a.setAttribute('aria-current', 'page'); nav.append(a); } host.append(nav);
      }
    }).catch(() => { host.replaceChildren(el('p', 'お知らせを読み込めませんでした。時間をおいて再度お試しください。')); });
})();
