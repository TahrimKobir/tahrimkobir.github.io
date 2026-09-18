/* motion.js — optional. The page is fully usable without it.
   Load with: <script src="motion.js" defer></script>

   Also add this to <head>, before the stylesheet, so revealed
   elements never flash in and back out:
   <script>document.documentElement.classList.add('js')</script>
*/
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Reveal on scroll ------------------------------------ */
  var targets = document.querySelectorAll('[data-reveal]');

  if (calm || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target); // reveal once, never re-run
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* --- Navbar state ---------------------------------------- */
  var nav = document.querySelector('.navbar');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- Mobile nav ------------------------------------------ */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  /* --- Pointer light on cards ------------------------------ */
  if (!calm && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });
  }

  /* --- Stat count-up ---------------------------------------
     Put the final value in data-count and leave the element
     empty: <span class="stat-num" data-count="12" data-suffix="+"></span>
  */
  var counters = document.querySelectorAll('[data-count]');

  function countUp(el) {
    var end = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';
    var decimals = (el.dataset.count.split('.')[1] || '').length;

    if (calm) { el.textContent = end.toFixed(decimals) + suffix; return; }

    var start = performance.now();
    var run = function (now) {
      var p = Math.min((now - start) / 1100, 1);
      var eased = 1 - Math.pow(1 - p, 4); // matches the CSS easing
      el.textContent = (end * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  if ('IntersectionObserver' in window) {
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
