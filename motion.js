/* ── Laika Motion System — v1 ───────────────────────────────────────────
   Shared motion primitives for laikacampus.com.
   Tokens live in motion.css. This file handles behaviour only.

   Primitives:
     Reveal       — .reveal elements fade+rise into view on scroll (~20%
                    threshold, ease-out-expo, 500ms, one-shot)
     Stagger group — [data-stagger="N"] parent triggers children N ms apart
     CountUp      — [data-counter] animates 0→target on scroll (~1.2s)
     Parallax     — #hero-h1 subtle vertical shift on scroll
     SmoothScroll — anchor links with hash hrefs

   Reduced-motion guard is baked in centrally: every primitive checks
   window.matchMedia('prefers-reduced-motion') before doing any movement.
   Content is always readable; animation is progressive enhancement only.
   ─────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ── OS preference check ────────────────────────────────────────────── */
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Reveal ─────────────────────────────────────────────────────────── */
  /* One-shot: element is unobserved after first intersection.            */
  function initReveal() {
    var elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    if (reducedMotion) {
      elements.forEach(function (el) { el.classList.add('on'); });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('on');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -16px 0px' });

    elements.forEach(function (el) { obs.observe(el); });
  }

  /* ── Stagger groups ─────────────────────────────────────────────────── */
  /* [data-stagger="N"] on a parent; N = ms between children (default 80)  */
  /* Children must have class="reveal" to participate.                    */
  function initStaggerGroups() {
    var groups = document.querySelectorAll('[data-stagger]');
    if (!groups.length) return;

    if (reducedMotion) {
      groups.forEach(function (group) {
        group.querySelectorAll('.reveal').forEach(function (el) {
          el.classList.add('on');
        });
      });
      return;
    }

    groups.forEach(function (group) {
      var children = Array.from(group.querySelectorAll('.reveal'));
      var interval = parseInt(group.dataset.stagger || '80', 10);

      var obs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          children.forEach(function (el, i) {
            setTimeout(function () { el.classList.add('on'); }, i * interval);
          });
          obs.disconnect();
        }
      }, { threshold: 0.2 });

      obs.observe(group);
    });
  }

  /* ── CountUp ────────────────────────────────────────────────────────── */
  /* [data-counter="30"] [data-suffix="s"] [data-duration="1200"]        */
  /* [data-decimal="1"] for one decimal place (e.g. 4.5M)                */
  function easeOutQuad(t) { return t * (2 - t); }

  function fmt(val, decimal, suffix) {
    return (decimal > 0 ? val.toFixed(decimal) : Math.round(val)) + suffix;
  }

  function runCounter(el) {
    var target  = parseFloat(el.dataset.counter);
    var suffix  = el.dataset.suffix  || '';
    var dur     = parseInt(el.dataset.duration || '1200', 10);
    var decimal = parseInt(el.dataset.decimal  || '0', 10);

    if (reducedMotion) {
      el.textContent = fmt(target, decimal, suffix);
      return;
    }

    var start = performance.now();
    function step(now) {
      var progress = Math.min((now - start) / dur, 1);
      el.textContent = fmt(easeOutQuad(progress) * target, decimal, suffix);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target, decimal, suffix);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var elements = document.querySelectorAll('[data-counter]');
    if (!elements.length) return;

    if (reducedMotion) {
      elements.forEach(function (el) {
        var target  = parseFloat(el.dataset.counter);
        var suffix  = el.dataset.suffix  || '';
        var decimal = parseInt(el.dataset.decimal || '0', 10);
        el.textContent = fmt(target, decimal, suffix);
      });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    elements.forEach(function (el) { obs.observe(el); });
  }

  /* ── Parallax ───────────────────────────────────────────────────────── */
  /* Subtle vertical shift on the hero headline only.                    */
  function initParallax() {
    if (reducedMotion) return;
    var heroH1 = document.getElementById('hero-h1');
    if (!heroH1) return;
    window.addEventListener('scroll', function () {
      heroH1.style.transform = 'translateY(' + (window.scrollY * 0.12) + 'px)';
    }, { passive: true });
  }

  /* ── Nav scroll state ──────────────────────────────────────────────── */
  function initNavScroll() {
    var nav = document.querySelector('nav');
    if (!nav) return;
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ── Lenis smooth scroll ───────────────────────────────────────────── */
  /* Matches Swarm's config: duration 0.9, exponential easing.          */
  function initLenis() {
    if (reducedMotion) return;
    if (typeof Lenis === 'undefined') return;

    var lenis = new Lenis({
      duration: 0.9,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.2
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    /* Wire anchor links through Lenis */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target);
        }
      });
    });
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    initStaggerGroups();
    initCounters();
    initParallax();
    initNavScroll();
    initLenis();
  });
}());
