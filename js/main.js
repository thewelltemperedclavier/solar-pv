// js/main.js

(function () {
  'use strict';

  // ============================================
  // STICKY NAVBAR JS FALLBACK
  // ============================================
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    const stickyClass = 'is-sticky';
    const origOffset = siteHeader.offsetTop;
    window.addEventListener('scroll', function () {
      if (window.scrollY > origOffset) {
        siteHeader.classList.add(stickyClass);
      } else {
        siteHeader.classList.remove(stickyClass);
      }
    });
  }
  // FOOTER YEAR
  // ============================================
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ============================================
  // MOBILE MENU
  // ============================================
  const menuBtn = document.getElementById('menuBtn');
  const mobileNav = document.getElementById('mobileNav');
  
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      const isOpen = !mobileNav.hasAttribute('hidden');
      if (isOpen) {
        mobileNav.setAttribute('hidden', '');
        menuBtn.setAttribute('aria-expanded', 'false');
      } else {
        mobileNav.removeAttribute('hidden');
        menuBtn.setAttribute('aria-expanded', 'true');
      }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (mobileNav.hasAttribute('hidden')) return;
      if (e.target === menuBtn || mobileNav.contains(e.target)) return;
      mobileNav.setAttribute('hidden', '');
      menuBtn.setAttribute('aria-expanded', 'false');
    });

    // Close on anchor clicks
    mobileNav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        mobileNav.setAttribute('hidden', '');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ============================================
  // HERO MAP BACKGROUND IMAGE ONLY (no Mapbox)
  const heroMapEl = document.getElementById('heroMap');
  if (heroMapEl) {
    heroMapEl.style.backgroundImage = "url('assets/background.jpg')";
    heroMapEl.style.backgroundSize = 'cover';
    heroMapEl.style.backgroundPosition = 'center';
    heroMapEl.style.backgroundAttachment = 'fixed';
  }

  // ============================================
  // METRICS CALCULATION
  // ============================================
  async function loadMetrics() {
    // Set static metric values
    const capacityEl = document.getElementById('metricCapacity');
    const subsidyEl = document.getElementById('metricIncentive');
    const projectsEl = document.getElementById('metricInstallations');

    if (capacityEl) {
      capacityEl.textContent = '7.3 GW';
    }
    if (subsidyEl) {
      subsidyEl.textContent = '$33.5B';
    }
    if (projectsEl) {
      projectsEl.textContent = '2015–2025';
    }
  }

  function formatNumber(num, unit) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M' + (unit ? ' ' + unit : '');
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K' + (unit ? ' ' + unit : '');
    }
    return Math.round(num).toLocaleString() + (unit ? ' ' + unit : '');
  }

  function formatCurrency(num) {
    if (num >= 1000000000) {
      return '$' + (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return '$' + (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return '$' + (num / 1000).toFixed(1) + 'K';
    }
    return '$' + Math.round(num).toLocaleString();
  }

  // Load metrics on page load
  loadMetrics();

  // ============================================
  // FAQ ACCORDION
  // ============================================
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach((question) => {
    question.addEventListener('click', () => {
      const isExpanded = question.getAttribute('aria-expanded') === 'true';
      const answerId = question.getAttribute('aria-controls');
      const answer = document.getElementById(answerId);
      
      if (!answer) return;

      // Close all other FAQs
      faqQuestions.forEach((q) => {
        if (q !== question) {
          q.setAttribute('aria-expanded', 'false');
          const otherAnswerId = q.getAttribute('aria-controls');
          const otherAnswer = document.getElementById(otherAnswerId);
          if (otherAnswer) {
            otherAnswer.setAttribute('hidden', '');
          }
        }
      });

      // Toggle current FAQ
      if (isExpanded) {
        question.setAttribute('aria-expanded', 'false');
        answer.setAttribute('hidden', '');
      } else {
        question.setAttribute('aria-expanded', 'true');
        answer.removeAttribute('hidden');
      }
    });
  });

  // ============================================
  // SMOOTH SCROLL FOR ANCHOR LINKS
  // ============================================
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
})();
