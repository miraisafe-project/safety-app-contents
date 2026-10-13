(() => {
  'use strict';

  // Move the existing controls, rather than visually reordering or duplicating
  // them, so the mobile reading and keyboard order follows the page layout.
  const heroContent = document.querySelector('.hero-content');
  const heroCopy = heroContent?.querySelector('.hero-copy');
  const heroActions = heroCopy?.querySelector('.actions');
  if (heroContent && heroCopy && heroActions) {
    const mobileHero = window.matchMedia('(max-width: 640px)');
    const placeHeroActions = () => {
      const parent = mobileHero.matches ? heroContent : heroCopy;
      if (heroActions.parentElement === parent) return;
      const focusedControl = heroActions.contains(document.activeElement)
        ? document.activeElement
        : null;
      parent.append(heroActions);
      focusedControl?.focus({ preventScroll: true });
    };
    placeHeroActions();
    mobileHero.addEventListener('change', placeHeroActions);
  }

  const config = window.MIRAI_SAFE_CONFIG || {};
  document.querySelectorAll('[data-config-link]').forEach((link) => {
    const destination = config[link.dataset.configLink];
    if (destination) link.href = destination;
  });

  document.querySelectorAll('[data-external]').forEach((link) => {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const label = link.getAttribute('aria-label') || link.textContent.trim();
    link.setAttribute('aria-label', `${label}（新しいタブで開きます）`);
  });

  // Only the document's scroll range is used; nested scrollers are not targets.
  const scrollRoot = document.scrollingElement;
  const scrollHint = document.createElement('button');
  scrollHint.type = 'button';
  scrollHint.className = 'scroll-hint';
  scrollHint.hidden = true;
  scrollHint.setAttribute('aria-label', '下へスクロール');
  scrollHint.innerHTML = '<svg viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 7 7 7 7-7M5 15l7 7 7-7"/></svg>';
  document.body.append(scrollHint);

  let scrollUpdatePending = false;
  const updateScrollHint = () => {
    scrollUpdatePending = false;
    const remaining = scrollRoot.scrollHeight - scrollRoot.clientHeight - scrollRoot.scrollTop;
    scrollHint.hidden = remaining <= 8 || document.body.classList.contains('menu-open');
    if (scrollHint.hidden) return;
    // Keep the small overlay away from nearby controls where space permits.
    scrollHint.style.transform = '';
    const bounds = scrollHint.getBoundingClientRect();
    const controls = [...document.querySelectorAll('a[href], button:not(.scroll-hint), input, textarea, select')]
      .map(element => element.getBoundingClientRect())
      .filter(rect => rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight);
    const offset = [0, -56, 56, -112, 112, -168, 168].find(shift => {
      const top = bounds.top + shift;
      const bottom = bounds.bottom + shift;
      return top >= innerHeight * .5 && bottom <= innerHeight - 16
        && controls.every(rect => bounds.right <= rect.left || bounds.left >= rect.right || bottom <= rect.top || top >= rect.bottom);
    });
    if (offset) scrollHint.style.transform = `translateY(${offset}px)`;
  };
  const scheduleScrollHint = () => {
    if (scrollUpdatePending) return;
    scrollUpdatePending = true;
    requestAnimationFrame(updateScrollHint);
  };
  scrollHint.addEventListener('click', () => {
    const maximum = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
    const distance = Math.max(160, scrollRoot.clientHeight * .65);
    window.scrollTo({
      top: Math.min(maximum, scrollRoot.scrollTop + distance),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  });
  window.addEventListener('scroll', scheduleScrollHint, { passive: true });
  window.addEventListener('resize', scheduleScrollHint, { passive: true });
  window.addEventListener('pageshow', scheduleScrollHint);
  window.addEventListener('load', scheduleScrollHint);
  window.visualViewport?.addEventListener('resize', scheduleScrollHint, { passive: true });
  const scrollSizeObserver = new ResizeObserver(scheduleScrollHint);
  scrollSizeObserver.observe(document.body);
  scrollSizeObserver.observe(document.documentElement);
  document.fonts?.ready.then(scheduleScrollHint);
  document.fonts?.addEventListener('loadingdone', scheduleScrollHint);
  scheduleScrollHint();

  const menu = document.querySelector('[data-menu]');
  const openButton = document.querySelector('[data-menu-open]');
  const closeButton = document.querySelector('[data-menu-close]');
  if (!menu || !openButton || !closeButton) return;

  let previousFocus = null;
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const closeMenu = (afterClose) => {
    menu.classList.remove('is-open');
    openButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    scheduleScrollHint();
    window.setTimeout(() => {
      menu.hidden = true;
      if (typeof afterClose === 'function') {
        afterClose();
      } else {
        previousFocus?.focus();
      }
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
  };

  const openMenu = () => {
    previousFocus = document.activeElement;
    menu.hidden = false;
    document.body.classList.add('menu-open');
    scheduleScrollHint();
    openButton.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      menu.classList.add('is-open');
      closeButton.focus();
    });
  };

  openButton.addEventListener('click', openMenu);
  closeButton.addEventListener('click', closeMenu);
  menu.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (link?.matches('[data-demo-section-link]')
        && !event.defaultPrevented && event.button === 0
        && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      // Navigate only after the menu has closed; do not restore focus and
      // inadvertently scroll back to the menu opener after anchor navigation.
      closeMenu(() => window.location.assign(link.href));
    } else if (event.target === menu || link) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (menu.hidden) return;
    if (event.key === 'Escape') {
      closeMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...menu.querySelectorAll(focusableSelector)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const header = document.querySelector('[data-header]');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 16);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
})();
