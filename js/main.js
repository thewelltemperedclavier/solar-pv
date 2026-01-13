// js/main.js

(function () {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu (shared across pages)
  const btn = document.getElementById("menuBtn");
  const menu = document.getElementById("mobileNav");
  if (!btn || !menu) return;

  btn.addEventListener("click", () => {
    const open = !menu.hasAttribute("hidden");
    if (open) {
      menu.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    } else {
      menu.removeAttribute("hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (menu.hasAttribute("hidden")) return;
    if (e.target === btn || menu.contains(e.target)) return;
    menu.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", "false");
  });

  // Close on anchor clicks (Method/Sources links)
  menu.querySelectorAll('a[href*="#"]').forEach((a) => {
    a.addEventListener("click", () => {
      menu.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    });
  });
})();

// Quick Guide: expand on click only (remove auto-expand on scroll)
(function(){
  const guideCard = document.querySelector('.card.quick-guide');
  if (!guideCard) return;

  const header = guideCard.querySelector('h3');
  const content = guideCard.querySelector('.guide-content');
  if (!header || !content) return;

  header.addEventListener('click', () => {
    guideCard.classList.toggle('expanded');
    if (guideCard.classList.contains('expanded')) {
      content.setAttribute('tabindex','-1');
    } else {
      content.removeAttribute('tabindex');
    }
  });
})();
