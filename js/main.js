/* Le Vietnam Pau — interactions */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Horaires : [jour (0 = dimanche)] -> créneaux en minutes */
  const HOURS = {
    0: [], 1: [],
    2: [[720, 840]], 3: [[720, 840]], 4: [[720, 840]],
    5: [[720, 840], [1110, 1290]], 6: [[720, 840], [1110, 1290]]
  };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const fmt = m => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;

  function parisNow() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, min: +get('hour') * 60 + +get('minute') };
  }

  function updateStatus() {
    const { day, min } = parisNow();
    const el = $('[data-status]'), txt = $('[data-status-text]');
    const today = HOURS[day];
    const open = today.find(([a, b]) => min >= a && min < b);
    if (open) {
      el.classList.add('is-open');
      txt.textContent = `Ouvert maintenant, jusqu'à ${fmt(open[1])}`;
    } else {
      el.classList.remove('is-open');
      const later = today.find(([a]) => a > min);
      if (later) txt.textContent = `Fermé pour le moment, ouverture à ${fmt(later[0])}`;
      else {
        let d = (day + 1) % 7, n = 1;
        while (!HOURS[d].length && n < 7) { d = (d + 1) % 7; n++; }
        txt.textContent = `Fermé, réouverture ${n === 1 ? 'demain' : DAYS[d]} à ${fmt(HOURS[d][0][0])}`;
      }
    }
    $$('[data-hours] tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === day));
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* Navigation */
  const nav = $('.nav');
  const toggle = $('.nav-toggle');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    toggle.textContent = open ? 'Fermer' : 'Menu';
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#nav-links a').forEach(a => a.addEventListener('click', () => {
    if (nav.classList.contains('is-open')) toggle.click();
  }));

  const sections = $$('main section[id]');
  const navLinks = $$('#nav-links a');
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => navIO.observe(s));

  /* Défilement : progression, plateau, bandeau, barre de navigation */
  const bar = $('.progress span');
  const spin = $('[data-spin] svg');
  const ticker = $('[data-ticker]');
  if (ticker) ticker.innerHTML += ticker.innerHTML; // boucle continue
  let lastY = scrollY, tickX = 0, tickDir = -1, ticking = false;
  /* Rotation du plateau : on rattrape la position cible en douceur, image par image */
  let rotTarget = scrollY * 0.12, rotNow = rotTarget, rotRunning = false;
  function spinStep() {
    rotNow += (rotTarget - rotNow) * 0.1;
    if (Math.abs(rotTarget - rotNow) < 0.02) { rotNow = rotTarget; rotRunning = false; }
    spin.style.transform = `rotate(${rotNow.toFixed(3)}deg)`;
    if (rotRunning) requestAnimationFrame(spinStep);
  }
  if (!reduce && spin) spin.style.transform = `rotate(${rotNow}deg)`;

  function onScroll() {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? y / max : 0);
    nav.classList.toggle('is-scrolled', y > 40);
    if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > lastY && y > 500);
    if (!reduce && spin) { rotTarget = y * 0.12; if (!rotRunning) { rotRunning = true; requestAnimationFrame(spinStep); } }
    tickDir = y >= lastY ? -1 : 1;
    lastY = y;
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* Le bandeau avance tout seul et change de sens selon le défilement */
  if (ticker && !reduce) {
    let speed = 0.5;
    (function loop() {
      const half = ticker.scrollWidth / 2;
      tickX += tickDir * speed;
      if (tickX <= -half) tickX += half;
      if (tickX > 0) tickX -= half;
      ticker.style.transform = `translateX(${tickX}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* Apparitions au défilement */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); } });
  }, { threshold: 0.15 });
  $$('.reveal').forEach(el => {
    const sibs = $$(':scope > .reveal', el.parentElement);
    el.style.setProperty('--d', `${sibs.indexOf(el) * 0.08}s`);
    revealIO.observe(el);
  });

  /* Plateau : survol de la légende ou des plats */
  const svg = $('.plateau svg');
  function light(name) {
    svg.classList.toggle('has-lit', !!name);
    $$('.plateau [data-dish]').forEach(el => el.classList.toggle('is-lit', !!name && el.dataset.dish === name));
  }
  $$('.plateau [data-dish]').forEach(el => {
    el.addEventListener('mouseenter', () => light(el.dataset.dish));
    el.addEventListener('mouseleave', () => light(null));
    el.addEventListener('click', () => light(el.classList.contains('is-lit') ? null : el.dataset.dish));
  });

  /* Carte : onglets (un jeu d'onglets par carte) */
  function setupTabs(list) {
    const tabs = $$('.tab', list);
    const ink = $('.tab-ink', list);
    const moveInk = tab => {
      if (!tab || !tab.offsetWidth) return;
      ink.style.width = tab.offsetWidth + 'px';
      ink.style.transform = `translateX(${tab.offsetLeft}px)`;
    };
    function select(tab, focus) {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        panel.hidden = !on;
        if (on) $$('.item', panel).forEach((it, i) => { it.classList.remove('enter'); void it.offsetWidth; it.style.setProperty('--i', i); it.classList.add('enter'); });
      });
      moveInk(tab);
      list.scrollTo({ left: tab.offsetLeft - list.clientWidth / 2 + tab.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
      if (focus) tab.focus();
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
      });
    });
    const refresh = () => moveInk($('.tab[aria-selected="true"]', list));
    refresh();
    addEventListener('resize', refresh);
    if (document.fonts) document.fonts.ready.then(refresh);
    return refresh;
  }
  const refreshers = $$('.tabs').map(setupTabs);

  /* Carte : bascule « Sur place » / « À emporter » */
  const carte = $('#carte');
  const modeBtns = $$('[data-mode-btn]');
  function setMode(mode) {
    carte.dataset.mode = mode;
    modeBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.modeBtn === mode));
    $$('[data-mode-panel]').forEach(p => { p.hidden = p.dataset.modePanel !== mode; });
    refreshers.forEach(r => r());
  }
  modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.modeBtn)));
  function fromHash(scroll) {
    const h = location.hash;
    if (h === '#a-emporter' || h === '#sur-place') {
      setMode(h === '#a-emporter' ? 'emporter' : 'place');
      if (scroll) carte.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    } else if (!scroll && matchMedia('(max-width: 1024px), (hover: none) and (pointer: coarse)').matches) {
      // Sur mobile et tablette, la carte s'ouvre directement sur « À emporter »
      setMode('emporter');
    }
  }
  $$('a[href="#a-emporter"], a[href="#sur-place"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    try { history.replaceState(null, '', a.getAttribute('href')); } catch (_) {}
    setMode(a.getAttribute('href') === '#a-emporter' ? 'emporter' : 'place');
    carte.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));
  addEventListener('hashchange', () => fromHash(true));
  fromHash(false);

  /* Photos facultatives : affichées seulement si le fichier existe */
  $$('img[data-optional]').forEach(img => {
    const ok = () => img.parentElement.classList.add('has-photo');
    const ko = () => img.remove();
    if (img.complete) (img.naturalWidth ? ok : ko)(); else { img.addEventListener('load', ok); img.addEventListener('error', ko); }
  });

  /* PDF des cartes : boutons masqués si le fichier est absent */
  $$('[data-optional-link]').forEach(a => {
    a.hidden = true;
    fetch(a.getAttribute('href'), { method: 'HEAD' }).then(r => { if (r.ok) a.hidden = false; }).catch(() => {});
  });

  /* Inclinaison des vignettes au survol */
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  const yr = $('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
