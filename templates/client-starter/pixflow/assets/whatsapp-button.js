/**
 * Floating WhatsApp button.
 *
 * The number is only ever used inside the wa.me href, built at
 * runtime — it is never written into the page as visible text, so it
 * cannot be scraped from the rendered HTML or seen by a visitor
 * inspecting the page copy.
 */
(function () {
  // Digits only, with country code, no spaces or symbols.
  var WHATSAPP_NUMBER = '16472622832';
  var DEFAULT_MESSAGE = 'Hi! I found your site and I have a question.';

  function init() {
    var link = document.createElement('a');
    link.href =
      'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(DEFAULT_MESSAGE);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Chat with us on WhatsApp');
    link.id = 'wa-float-btn';

    link.innerHTML =
      '<svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" aria-hidden="true">' +
      '<path d="M16.001 2.667c-7.363 0-13.334 5.97-13.334 13.333 0 2.353.615 4.66 1.784 6.686L2.7 29.333l6.79-1.78a13.27 13.27 0 0 0 6.51 1.71h.006c7.363 0 13.333-5.97 13.333-13.333 0-3.562-1.387-6.912-3.906-9.431a13.246 13.246 0 0 0-9.432-3.833zm0 24.4a11.04 11.04 0 0 1-5.63-1.542l-.404-.24-4.03 1.057 1.077-3.928-.263-.403a11.05 11.05 0 0 1-1.7-5.884c0-6.11 4.972-11.083 11.084-11.083 2.96 0 5.744 1.154 7.838 3.25a11.014 11.014 0 0 1 3.245 7.834c0 6.112-4.972 11.084-11.083 11.084l-.134-.145zm6.075-8.294c-.333-.167-1.97-.972-2.275-1.083-.305-.111-.527-.167-.75.167-.222.333-.86 1.083-1.055 1.305-.194.222-.388.25-.72.083-.334-.167-1.408-.519-2.682-1.654-.991-.884-1.661-1.977-1.856-2.31-.194-.333-.02-.514.146-.68.15-.15.334-.389.5-.583.167-.195.222-.334.334-.556.111-.223.055-.417-.028-.584-.083-.167-.75-1.806-1.028-2.473-.27-.65-.545-.562-.75-.573l-.638-.011c-.222 0-.583.083-.888.417-.305.333-1.166 1.14-1.166 2.778s1.194 3.222 1.361 3.445c.167.222 2.35 3.588 5.694 5.032.796.343 1.417.548 1.902.702.799.254 1.526.218 2.101.132.641-.095 1.97-.805 2.248-1.583.278-.778.278-1.445.194-1.583-.084-.14-.306-.223-.639-.39z"/>' +
      '</svg>';

    var style = document.createElement('style');
    style.textContent =
      '#wa-float-btn{position:fixed;right:20px;bottom:20px;z-index:999;width:56px;height:56px;' +
      'border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;' +
      'justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.22);transition:transform 0.2s ease, box-shadow 0.2s ease;}' +
      '#wa-float-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,0.28);}' +
      '@media (prefers-reduced-motion: reduce){#wa-float-btn{transition:none;}#wa-float-btn:hover{transform:none;}}' +
      '@media (max-width:480px){#wa-float-btn{right:16px;bottom:16px;width:50px;height:50px;}}';

    document.head.appendChild(style);
    document.body.appendChild(link);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
