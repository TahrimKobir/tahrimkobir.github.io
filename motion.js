/* motion.js — drives the interactive half of the motion layer.
   The page works fully without it.

   In <head>, before the stylesheet:
     <script>document.documentElement.classList.add('js')</script>
   Before </body>:
     <script src="motion.js" defer></script>
*/
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Split headings into masked words ---------- */
  document.querySelectorAll('[data-split]').forEach(function (el) {
    if (el.children.length) return;                 // leave mixed markup alone
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (word, i) {
      var mask = document.createElement('span');
      mask.className = 'w';
      var inner = document.createElement('span');
      inner.style.setProperty('--wi', i);
      inner.textContent = word;
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('[data-reveal], [data-split]');

  if (calm || !hasIO) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);                 // reveal once, never replay
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Navbar: stuck state + progress fallback ---------- */
  var nav = document.querySelector('.navbar');
  var toTop = document.querySelector('.back-to-top');
  var supportsScrollTimeline = CSS.supports('animation-timeline', 'scroll()');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (nav) nav.classList.toggle('is-stuck', y > 12);
      if (toTop) toTop.classList.toggle('is-on', y > window.innerHeight * 0.6);

      if (nav && !supportsScrollTimeline) {          // Safari / Firefox
        var max = document.documentElement.scrollHeight - window.innerHeight;
        nav.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
      }
      ticking = false;
    });
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (toTop) {
    toTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Gliding nav pill + scroll-spy ---------- */
  var navList = document.querySelector('.nav-links');
  var navItems = navList ? Array.prototype.slice.call(navList.querySelectorAll('a')) : [];

  if (navList && navItems.length) {
    var pill = document.createElement('span');
    pill.className = 'nav-indicator';
    navList.appendChild(pill);

    var current = navItems.find(function (a) { return a.getAttribute('aria-current') === 'page'; }) || navItems[0];

    function moveTo(link) {
      if (!link || window.innerWidth <= 768) return;
      var r = link.getBoundingClientRect();
      var p = navList.getBoundingClientRect();
      pill.style.setProperty('--x', (r.left - p.left) + 'px');
      pill.style.setProperty('--w', r.width + 'px');
      pill.style.setProperty('--h', r.height + 'px');
      pill.classList.add('is-on');
    }

    requestAnimationFrame(function () { moveTo(current); });
    window.addEventListener('resize', function () { moveTo(current); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { moveTo(current); });
    }

    if (fine) {
      navItems.forEach(function (link) {
        link.addEventListener('pointerenter', function () { moveTo(link); });
        link.addEventListener('focus', function () { moveTo(link); });
      });
      navList.addEventListener('pointerleave', function () { moveTo(current); });
    }

    /* Scroll-spy: the pill follows the section you're reading. */
    var sections = navItems
      .map(function (a) {
        var id = (a.getAttribute('href') || '').replace(/^#/, '');
        return id ? document.getElementById(id) : null;
      })
      .filter(Boolean);

    if (hasIO && sections.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var match = navItems.find(function (a) {
            return a.getAttribute('href') === '#' + entry.target.id;
          });
          if (!match || match === current) return;
          navItems.forEach(function (a) { a.removeAttribute('aria-current'); });
          match.setAttribute('aria-current', 'page');
          current = match;
          moveTo(current);
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (s) { spy.observe(s); });
    }
  }

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && navList) {
    toggle.addEventListener('click', function () {
      var open = navList.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    navList.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      navList.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  /* ---------- Card pointer light + tilt ---------- */
  if (!calm && fine) {
    document.querySelectorAll('.card').forEach(function (card) {
      var queued = false, ev = null;

      card.addEventListener('pointermove', function (e) {
        ev = e;
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var px = (ev.clientX - r.left) / r.width;
          var py = (ev.clientY - r.top) / r.height;
          card.style.setProperty('--mx', (px * 100).toFixed(2) + '%');
          card.style.setProperty('--my', (py * 100).toFixed(2) + '%');
          card.style.setProperty('--rx', ((px - 0.5) * 7).toFixed(2));   // max ~3.5deg
          card.style.setProperty('--ry', ((0.5 - py) * 7).toFixed(2));
          queued = false;
        });
      });

      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', 0);
        card.style.setProperty('--ry', 0);
      });
    });
  }

  /* ---------- Stat count-up ----------
     <span class="stat-num" data-count="3.94"></span>
     <span class="stat-num" data-count="412" data-suffix="+"></span>
  */
  function countUp(el) {
    var raw = el.dataset.count;
    var end = parseFloat(raw);
    var suffix = el.dataset.suffix || '';
    var decimals = (raw.split('.')[1] || '').length;

    if (calm) { el.textContent = end.toFixed(decimals) + suffix; return; }

    var t0 = performance.now();
    (function step(now) {
      var p = Math.min((now - t0) / 1400, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (end * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  var counters = document.querySelectorAll('[data-count]');
  if (hasIO) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        co.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  } else {
    counters.forEach(countUp);
  }
})();
