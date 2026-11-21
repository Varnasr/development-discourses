/**
 * theme.js - the one colour-theme button, shared by every page.
 *
 * The button cycles device setting, then light, then dark. The choice is kept
 * under the same key the site has always used, `imx_theme`: 'light' or 'dark',
 * and no entry at all for the device setting. The inline script in each page's
 * <head> applies the saved choice before first paint; this file only runs the
 * button.
 */
(function () {
  'use strict';
  var KEY = 'imx_theme';
  var ORDER = ['system', 'light', 'dark'];
  var NAME = { system: 'Device setting', light: 'Light', dark: 'Dark' };
  var SHORT = { system: 'Device', light: 'Light', dark: 'Dark' };
  var root = document.documentElement;
  var btn = document.getElementById('themeToggle');
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function saved() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) {}
    return (v === 'light' || v === 'dark') ? v : 'system';
  }

  function apply(pref) {
    var dark = pref === 'dark' || (pref === 'system' && media && media.matches);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-theme-pref', pref);
    if (!btn) return;
    var next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    var label = 'Colour theme: ' + NAME[pref] + '. Switch to ' + NAME[next].toLowerCase();
    btn.setAttribute('data-mode', pref);
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    var text = btn.querySelector('.theme-toggle-text');
    if (text) text.textContent = SHORT[pref];
  }

  function store(pref) {
    try {
      if (pref === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, pref);
    } catch (e) {}
  }

  apply(saved());

  if (btn) {
    btn.addEventListener('click', function () {
      var next = ORDER[(ORDER.indexOf(saved()) + 1) % ORDER.length];
      store(next);
      apply(next);
    });
  }

  // Follow the device while the choice is "device setting", and follow a
  // change made in another tab.
  if (media && media.addEventListener) {
    media.addEventListener('change', function () { if (saved() === 'system') apply('system'); });
  }
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(saved()); });
})();
