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
  scrollHint.disabled = true;
  scrollHint.inert = true;
  scrollHint.tabIndex = -1;
  scrollHint.setAttribute('aria-hidden', 'true');
  scrollHint.setAttribute('aria-label', '下へスクロール');
  scrollHint.innerHTML = '<svg viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 7 7 7 7-7M5 15l7 7 7-7"/></svg>';
  document.body.append(scrollHint);

  const hintHero = document.querySelector('.home-page .hero');
  let heroHintDismissed = false;
  let heroHintOffset = null;
  let hintOffset = 0;
  const showScrollHint = (visible) => {
    scrollHint.classList.toggle('is-visible', visible);
    scrollHint.disabled = !visible;
    scrollHint.inert = !visible;
    scrollHint.tabIndex = visible ? 0 : -1;
    scrollHint.setAttribute('aria-hidden', String(!visible));
    if (!visible && document.activeElement === scrollHint) scrollHint.blur();
  };
  let scrollUpdatePending = false;
  const updateScrollHint = () => {
    scrollUpdatePending = false;
    const remaining = scrollRoot.scrollHeight - scrollRoot.clientHeight - scrollRoot.scrollTop;
    const heroBounds = hintHero?.getBoundingClientRect();
    if (heroBounds) {
      // Even a fast scroll must not paint a fading plate over the next section.
      const plate = scrollHint.getBoundingClientRect();
      const clipBottom = Math.min(plate.height, Math.max(0, plate.bottom - heroBounds.bottom));
      scrollHint.style.clipPath = clipBottom ? `inset(0 0 ${clipBottom}px 0)` : '';
    }
    if (hintHero && window.scrollY <= 8) {
      heroHintDismissed = false;
      heroHintOffset = null;
    }
    // Hide once the next section enters view. A small dead band plus a latch
    // avoids flicker at the boundary and reappearance further down the page.
    if (heroBounds && window.scrollY > 8 && heroBounds.bottom < innerHeight + 16) {
      heroHintDismissed = true;
    }
    const menuVisible = document.querySelector('[data-menu]')?.hidden === false;
    if (remaining <= 8 || menuVisible || document.body.classList.contains('menu-open') || heroHintDismissed) {
      showScrollHint(false);
      return;
    }
    // Test the complete plate, not only the SVG; never keep an unsafe fallback.
    const bounds = scrollHint.getBoundingClientRect();
    const obstacles = [...document.querySelectorAll('a[href], button:not(.scroll-hint), input, textarea, select, .hero-copy, .hero-app-preview, .hero-concept')]
      .map(element => element.getBoundingClientRect())
      .filter(rect => rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight);
    const headerBottom = document.querySelector('[data-header]')?.getBoundingClientRect().bottom || 0;
    const offsets = heroHintOffset === null ? [0, -104, 104, -208, 208] : [heroHintOffset];
    const offset = offsets.find(shift => {
      const top = bounds.top - hintOffset + shift;
      const bottom = bounds.bottom - hintOffset + shift;
      return bounds.left >= 8 && bounds.right <= innerWidth - 8
        && top >= Math.max(innerHeight * .5, headerBottom + 16) && bottom <= innerHeight - 16
        && (!heroBounds || (top >= heroBounds.top + 16 && bottom <= heroBounds.bottom - 24))
        && obstacles.every(rect => bounds.right + 8 <= rect.left || bounds.left - 8 >= rect.right || bottom + 8 <= rect.top || top - 8 >= rect.bottom);
    });
    if (offset === undefined) {
      if (hintHero) heroHintDismissed = true;
      showScrollHint(false);
      return;
    }
    if (hintHero) heroHintOffset = offset;
    hintOffset = offset;
    scrollHint.style.transform = `translateY(${offset}px)`;
    scrollHint.style.clipPath = '';
    showScrollHint(true);
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
  window.addEventListener('resize', () => {
    heroHintDismissed = false;
    heroHintOffset = null;
    scheduleScrollHint();
  }, { passive: true });
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
      scheduleScrollHint();
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
