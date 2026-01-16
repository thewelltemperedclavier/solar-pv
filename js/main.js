// js/main.js

(function () {
  'use strict';

  // ============================================
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
  // MAPBOX HERO MAP
  // ============================================
  const heroMapEl = document.getElementById('heroMap');
  if (heroMapEl && typeof mapboxgl !== 'undefined') {
    // IMPORTANT: Replace with your Mapbox access token
    // Get one at: https://account.mapbox.com/access-tokens/
    // Set your token here:
    mapboxgl.accessToken = 'pk.eyJ1IjoiYXdhc3NhZGExMjM0NSIsImEiOiJjbWlkeXljcjEwYzFrMmpwcmFjaGJhZWhlIn0.9HwDQ6mue3mPjDWwzJANUw';
    
    // If no token is set, use fallback
    if (mapboxgl.accessToken === 'YOUR_MAPBOX_ACCESS_TOKEN_HERE') {
      heroMapEl.style.background = 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)';
      console.warn('Mapbox token not configured. Please add your access token in js/main.js');
      return;
    }
    
    // Initialize map centered on California
    const map = new mapboxgl.Map({
      container: 'heroMap',
      style: 'mapbox://styles/mapbox/light-v11', // Light style for airy feel
      center: [-119.4179, 36.7783], // California center
      zoom: 5.5,
      pitch: 0,
      bearing: 0,
      interactive: false, // Lock interactions for visual-only
      attributionControl: false
    });

    // Add low saturation and light feel via CSS filter
    heroMapEl.style.filter = 'saturate(0.4) brightness(1.1)';

    // Optional: Add a subtle animation on load
    map.on('load', () => {
      // Map is ready
      heroMapEl.style.transition = 'filter 0.5s ease';
    });
  } else if (heroMapEl) {
    // Fallback if Mapbox fails to load
    heroMapEl.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)';
    console.warn('Mapbox GL JS not loaded. Using fallback background.');
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
