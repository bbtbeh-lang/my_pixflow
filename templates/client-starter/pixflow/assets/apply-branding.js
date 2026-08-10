/**
 * apply-branding.js
 * Fetches admin-configured branding (colors, fonts) and overrides the
 * page's default CSS custom properties at runtime.
 *
 * Include this INSIDE <head>, right after the page's own :root <style>
 * block, so overrides win but don't wait on anything else. It fails
 * silently (keeping the hardcoded defaults) if the API is unreachable —
 * a broken/slow API must never break the page.
 *
 * Maps admin field IDs -> the CSS variable each page already defines.
 */
(function () {
  // Color fields map straight onto a CSS variable.
  var COLOR_FIELD_TO_VAR = {
    'st-color-ink': '--ink',
    'st-color-accent': '--accent',
    'st-color-bg': '--cream',   // pages call this var --cream, admin calls the field "Background"
    'st-color-white': '--white'
  };

  // Font fields hold a bare family name (e.g. "DM Sans") in the admin panel,
  // but pages expect a full stack with a fallback. Rebuild the stack instead
  // of overwriting it bare, so the fallback survives if the custom font
  // fails to load.
  var FONT_FIELD_TO_STACK = {
    'st-font-display': function (name) { return "'" + name + "', Georgia, serif"; },      // --font-serif
    'st-font-en': function (name) { return "'" + name + "', system-ui, sans-serif"; },     // --font-sans
    'st-font-fa': function (name) { return "'" + name + "', system-ui, sans-serif"; }      // --font-fa
  };
  var FONT_FIELD_TO_VAR = {
    'st-font-display': '--font-serif',
    'st-font-en': '--font-sans',
    'st-font-fa': '--font-fa'
  };

  fetch('/api/settings/public', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (settings) {
      if (!settings) return;
      var root = document.documentElement.style;

      Object.keys(COLOR_FIELD_TO_VAR).forEach(function (field) {
        var value = settings[field];
        if (value) root.setProperty(COLOR_FIELD_TO_VAR[field], value);
      });

      Object.keys(FONT_FIELD_TO_STACK).forEach(function (field) {
        var name = settings[field];
        if (name) root.setProperty(FONT_FIELD_TO_VAR[field], FONT_FIELD_TO_STACK[field](name));
      });
    })
    .catch(function () {
      // Network/API error: keep the page's hardcoded default colors/fonts.
    });
})();
