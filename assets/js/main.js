(() => {
  'use strict';

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

  const menu = document.querySelector('[data-menu]');
  const openButton = document.querySelector('[data-menu-open]');
  const closeButton = document.querySelector('[data-menu-close]');
  if (!menu || !openButton || !closeButton) return;

  let previousFocus = null;
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const closeMenu = () => {
    menu.classList.remove('is-open');
    openButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    window.setTimeout(() => {
      menu.hidden = true;
      previousFocus?.focus();
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
  };

  const openMenu = () => {
    previousFocus = document.activeElement;
    menu.hidden = false;
    document.body.classList.add('menu-open');
    openButton.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      menu.classList.add('is-open');
      closeButton.focus();
    });
  };

  openButton.addEventListener('click', openMenu);
  closeButton.addEventListener('click', closeMenu);
  menu.addEventListener('click', (event) => {
    if (event.target === menu || event.target.closest('a')) closeMenu();
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
