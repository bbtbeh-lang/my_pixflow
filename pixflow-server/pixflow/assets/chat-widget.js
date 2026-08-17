/**
 * Floating AI chat assistant.
 *
 * Answers basic visitor questions (packages, pricing, how ordering works)
 * using the /api/chat/message endpoint (see routes/chat.js + chat.js).
 * Bilingual: mirrors the page's current lang (English/Persian), matching
 * the site's existing .en/.fa toggle pattern.
 *
 * Self-contained, no dependencies — same style as whatsapp-button.js.
 */
(function () {
  var STRINGS = {
    en: {
      launcherLabel: 'Chat with Pixflow Assistant',
      title: 'Pixflow Assistant',
      subtitle: 'Ask about pricing, services, or how to get started',
      placeholder: 'Type a message…',
      send: 'Send',
      close: 'Close chat',
      greeting: "Hi! I'm Pixflow's assistant. Ask me about packages, pricing, or how to order — or I can point you to the right form.",
      thinking: '…',
      error: "Sorry, something went wrong. Please try the Contact form instead.",
    },
    fa: {
      launcherLabel: 'گفتگو با دستیار Pixflow',
      title: 'دستیار Pixflow',
      subtitle: 'دربارهٔ قیمت‌ها، خدمات، یا شروع کار بپرسید',
      placeholder: 'پیامی بنویسید…',
      send: 'ارسال',
      close: 'بستن گفتگو',
      greeting: 'سلام! من دستیار Pixflow هستم. دربارهٔ پکیج‌ها، قیمت‌ها، یا نحوهٔ سفارش بپرسید — یا می‌توانم شما را به فرم مناسب راهنمایی کنم.',
      thinking: '…',
      error: 'متأسفم، مشکلی پیش آمد. لطفاً از فرم تماس استفاده کنید.',
    },
  };

  function currentLang() {
    return document.documentElement.lang === 'fa' ? 'fa' : 'en';
  }

  function t(key) {
    return STRINGS[currentLang()][key];
  }

  var history = []; // { role: 'user'|'assistant', text }
  var isOpen = false;
  var isSending = false;

  var els = {};

  function buildStyles() {
    var style = document.createElement('style');
    style.textContent =
      '#pf-chat-launcher{position:fixed;left:20px;bottom:20px;z-index:999;width:56px;height:56px;' +
      'border-radius:50%;background:#111010;color:#fff;display:flex;align-items:center;justify-content:center;' +
      'box-shadow:0 4px 16px rgba(0,0,0,0.22);transition:transform 0.2s ease, box-shadow 0.2s ease;cursor:pointer;border:none;}' +
      '#pf-chat-launcher:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,0.28);}' +
      '#pf-chat-panel{position:fixed;left:20px;bottom:88px;z-index:999;width:min(360px, calc(100vw - 40px));' +
      'max-height:min(520px, calc(100vh - 140px));background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.22);' +
      'display:none;flex-direction:column;overflow:hidden;font-family:"DM Sans",system-ui,sans-serif;}' +
      '#pf-chat-panel.open{display:flex;}' +
      '#pf-chat-header{background:#111010;color:#fff;padding:16px 18px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}' +
      '#pf-chat-header .pf-chat-title{font-weight:700;font-size:0.95rem;margin:0;}' +
      '#pf-chat-header .pf-chat-subtitle{font-size:0.75rem;color:rgba(255,255,255,0.65);margin:2px 0 0;}' +
      '#pf-chat-close{background:none;border:none;color:#fff;font-size:1.25rem;line-height:1;cursor:pointer;padding:2px 6px;flex-shrink:0;}' +
      '#pf-chat-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#F0F3F8;min-height:200px;}' +
      '.pf-chat-msg{max-width:85%;padding:9px 13px;border-radius:12px;font-size:0.85rem;line-height:1.55;white-space:pre-wrap;}' +
      '.pf-chat-msg.user{align-self:flex-end;background:#4B3AA6;color:#fff;border-bottom-right-radius:3px;}' +
      '.pf-chat-msg.assistant{align-self:flex-start;background:#fff;color:#111010;border:1px solid rgba(20,30,60,0.08);border-bottom-left-radius:3px;}' +
      'html[lang="fa"] .pf-chat-msg{font-family:"Vazirmatn",system-ui,sans-serif;}' +
      'html[lang="fa"] .pf-chat-msg.user{align-self:flex-start;border-bottom-right-radius:12px;border-bottom-left-radius:3px;}' +
      'html[lang="fa"] .pf-chat-msg.assistant{align-self:flex-end;border-bottom-left-radius:12px;border-bottom-right-radius:3px;}' +
      '#pf-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(20,30,60,0.08);background:#fff;}' +
      '#pf-chat-input{flex:1;border:1.5px solid rgba(20,30,60,0.12);border-radius:8px;padding:10px 12px;font-size:0.85rem;' +
      'font-family:inherit;outline:none;resize:none;}' +
      '#pf-chat-input:focus{border-color:#4B3AA6;}' +
      '#pf-chat-send{background:#4B3AA6;color:#fff;border:none;border-radius:8px;padding:0 16px;font-size:0.8rem;font-weight:500;cursor:pointer;flex-shrink:0;}' +
      '#pf-chat-send:disabled{opacity:0.5;cursor:not-allowed;}' +
      '@media (prefers-reduced-motion: reduce){#pf-chat-launcher{transition:none;}#pf-chat-launcher:hover{transform:none;}}' +
      '@media (max-width:480px){#pf-chat-launcher{left:16px;bottom:16px;width:50px;height:50px;}' +
      '#pf-chat-panel{left:12px;bottom:78px;width:calc(100vw - 24px);}}';
    document.head.appendChild(style);
  }

  function buildLauncher() {
    var btn = document.createElement('button');
    btn.id = 'pf-chat-launcher';
    btn.type = 'button';
    btn.setAttribute('aria-label', t('launcherLabel'));
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
      '</svg>';
    btn.addEventListener('click', togglePanel);
    document.body.appendChild(btn);
    els.launcher = btn;
  }

  function buildPanel() {
    var panel = document.createElement('div');
    panel.id = 'pf-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', t('title'));

    panel.innerHTML =
      '<div id="pf-chat-header">' +
      '<div><p class="pf-chat-title"></p><p class="pf-chat-subtitle"></p></div>' +
      '<button id="pf-chat-close" type="button"></button>' +
      '</div>' +
      '<div id="pf-chat-messages"></div>' +
      '<form id="pf-chat-form">' +
      '<textarea id="pf-chat-input" rows="1"></textarea>' +
      '<button id="pf-chat-send" type="submit"></button>' +
      '</form>';

    document.body.appendChild(panel);

    els.panel = panel;
    els.title = panel.querySelector('.pf-chat-title');
    els.subtitle = panel.querySelector('.pf-chat-subtitle');
    els.closeBtn = panel.querySelector('#pf-chat-close');
    els.messages = panel.querySelector('#pf-chat-messages');
    els.form = panel.querySelector('#pf-chat-form');
    els.input = panel.querySelector('#pf-chat-input');
    els.sendBtn = panel.querySelector('#pf-chat-send');

    els.closeBtn.addEventListener('click', togglePanel);
    els.form.addEventListener('submit', onSubmit);
    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        els.form.requestSubmit();
      }
    });
  }

  function applyStrings() {
    els.title.textContent = t('title');
    els.subtitle.textContent = t('subtitle');
    els.closeBtn.setAttribute('aria-label', t('close'));
    els.closeBtn.textContent = '\u00D7';
    els.input.placeholder = t('placeholder');
    els.sendBtn.textContent = t('send');
    els.launcher.setAttribute('aria-label', t('launcherLabel'));
  }

  function addMessage(role, text) {
    var el = document.createElement('div');
    el.className = 'pf-chat-msg ' + role;
    el.textContent = text;
    els.messages.appendChild(el);
    els.messages.scrollTop = els.messages.scrollHeight;
    return el;
  }

  function togglePanel() {
    isOpen = !isOpen;
    els.panel.classList.toggle('open', isOpen);
    if (isOpen) {
      applyStrings();
      if (history.length === 0) {
        addMessage('assistant', t('greeting'));
      }
      els.input.focus();
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    var text = els.input.value.trim();
    if (!text || isSending) return;

    addMessage('user', text);
    history.push({ role: 'user', text: text });
    els.input.value = '';
    isSending = true;
    els.sendBtn.disabled = true;

    var thinkingEl = addMessage('assistant', t('thinking'));

    fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: history.slice(0, -1),
        lang: currentLang(),
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var reply = data && data.reply ? data.reply : t('error');
        thinkingEl.textContent = reply;
        history.push({ role: 'assistant', text: reply });
      })
      .catch(function () {
        thinkingEl.textContent = t('error');
      })
      .finally(function () {
        isSending = false;
        els.sendBtn.disabled = false;
        els.messages.scrollTop = els.messages.scrollHeight;
      });
  }

  function init() {
    buildStyles();
    buildLauncher();
    buildPanel();
    applyStrings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
