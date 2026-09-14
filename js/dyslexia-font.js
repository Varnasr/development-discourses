/* Dyslexia-friendly reading font — self-contained, no dependencies.
 *
 * Drop-in: <script src="/js/dyslexia-font.js" defer></script>
 * Fonts:   /fonts/opendyslexic-{400,700}[-italic].woff2
 *          Override the directory with data-fonts="/assets/fonts/" on the tag.
 *
 * OpenDyslexic by Abbie Gonzalez (font version 0.920, packaged as
 * @fontsource/opendyslexic 5.3.0 -- that 5.3.0 is the npm package, not the
 * typeface), SIL Open Font License 1.1 (licence text
 * ships beside the woff2 files). Latin only: the face has no Indic glyphs, so
 * text in Devanagari, Bengali, Tamil, Telugu, Gujarati, Odia or Kannada falls
 * through to the stack below it and is unaffected by the switch.
 *
 * Nothing downloads until a reader turns it on. A browser fetches a @font-face
 * only once a rule using that family matches a rendered element, and the only
 * such rules here sit under html.dyslexic-font.
 *
 * The spacing is the half with the better evidence. Zorzi et al. (PNAS 109(28),
 * 2012) found extra letter spacing raised reading speed and halved errors in
 * Italian and French children with dyslexia, with no training and no change of
 * typeface; the British Dyslexia Association style guide asks for 1.5 line
 * spacing, wider word spacing and ragged-right text. The typeface trials are
 * weaker (Kuster et al., Annals of Dyslexia, 2018, found Dyslexie gave no
 * benefit over Arial), so the font is offered and the spacing is applied.
 *
 * Where the button goes: an element carrying data-dyslexia-slot, else a theme
 * control if the site has one, else a small fixed button in the bottom-left
 * corner. Give a site's nav bar data-dyslexia-slot and the button joins it.
 */
(function () {
  'use strict';
  if (window.__dyslexiaFont) return;
  window.__dyslexiaFont = true;

  var KEY = 'reading-font';
  var CLS = 'dyslexic-font';
  var root = document.documentElement;
  // Resolved against this script's own URL, not the site root: several of these
  // sites are served from a project subpath (varnasr.github.io/<repo>/), where an
  // absolute /fonts/ points at the wrong host directory. Put the script in
  // <root>/js/ (or assets/js/) and the fonts in the sibling fonts/ directory and
  // this is right at any page depth, on a subpath or an apex domain alike.
  var self = document.currentScript;
  var DIR = (self && self.getAttribute('data-fonts'))
    || (self && self.src && new URL('../fonts/', self.src).href)
    || '/fonts/';

  function on() { try { return localStorage.getItem(KEY) === 'opendyslexic'; } catch (e) { return false; } }

  // Applied here, at parse time, rather than on DOMContentLoaded: a reader who
  // has chosen the font should not watch each page render in the default one.
  if (on()) root.classList.add(CLS);

  function face(weight, style, file) {
    return '@font-face{font-family:"OpenDyslexic";font-weight:' + weight + ';font-style:' + style +
      ';font-display:swap;src:url("' + DIR + file + '") format("woff2")}';
  }

  function styles() {
    return face(400, 'normal', 'opendyslexic-400.woff2')
      + face(700, 'normal', 'opendyslexic-700.woff2')
      + face(400, 'italic', 'opendyslexic-400-italic.woff2')
      + face(700, 'italic', 'opendyslexic-700-italic.woff2')
      + 'html.' + CLS + ',html.' + CLS + ' *{font-family:"OpenDyslexic",Verdana,Tahoma,sans-serif!important}'
      // Code and data keep their monospace: column alignment is the point of it.
      + 'html.' + CLS + ' code,html.' + CLS + ' pre,html.' + CLS + ' kbd,html.' + CLS + ' samp{'
      + 'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important}'
      // Spacing, scoped to running text so controls keep their measured layout.
      + 'html.' + CLS + ' p,html.' + CLS + ' li,html.' + CLS + ' dd,html.' + CLS + ' dt,'
      + 'html.' + CLS + ' blockquote,html.' + CLS + ' figcaption,html.' + CLS + ' td,html.' + CLS + ' th{'
      + 'line-height:1.7!important;letter-spacing:.04em!important;word-spacing:.16em!important}'
      + 'html.' + CLS + ' p,html.' + CLS + ' li,html.' + CLS + ' blockquote{text-align:left!important}'
      // The control itself. Neutral enough to sit in any bar; the fixed
      // fallback carries its own background so it reads on any ground.
      + '#dys-font-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;'
      + 'min-width:36px;height:32px;padding:0 10px;border-radius:8px;cursor:pointer;'
      + 'border:1px solid currentColor;background:transparent;color:inherit;'
      + 'font:700 13px/1 system-ui,sans-serif;letter-spacing:.02em;opacity:.75}'
      + '#dys-font-btn:hover,#dys-font-btn:focus-visible{opacity:1}'
      + '#dys-font-btn[aria-pressed="true"]{background:#0EA5E9;border-color:#0EA5E9;color:#fff;opacity:1}'
      + '#dys-font-btn.dys-fixed{position:fixed;left:16px;bottom:16px;z-index:9990;'
      + 'background:Canvas;color:CanvasText;box-shadow:0 2px 10px rgba(0,0,0,.18);opacity:.92}';
  }

  // Deliberately short. An earlier version fell back to the page <header>, which
  // put the button at the left edge of a hero banner on three of these sites --
  // present, and reading as debris. A site either names a home for it with
  // data-dyslexia-slot, or has a theme control to sit beside, or gets the fixed
  // corner button, which at least lands somewhere predictable.
  function host() {
    return document.querySelector('[data-dyslexia-slot]')
      || document.querySelector('.theme-selector,.theme-toggle,.theme-switch,.theme-btn-group')
      || null;
  }

  function init() {
    if (document.getElementById('dys-font-btn')) return;
    var st = document.createElement('style');
    st.id = 'dys-font-style';
    st.textContent = styles();
    document.head.appendChild(st);

    var b = document.createElement('button');
    b.id = 'dys-font-btn';
    b.type = 'button';
    // The label says what it does. "OpenDyslexic" names a typeface a reader has
    // no reason to have heard of.
    b.setAttribute('aria-label', 'Dyslexia-friendly font');
    b.innerHTML = '<span aria-hidden="true">Aa</span>';

    function sync() {
      var isOn = root.classList.contains(CLS);
      b.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      b.title = isOn ? 'Dyslexia-friendly font: on' : 'Dyslexia-friendly font';
    }
    b.addEventListener('click', function () {
      var isOn = !root.classList.contains(CLS);
      root.classList.toggle(CLS, isOn);
      try { localStorage.setItem(KEY, isOn ? 'opendyslexic' : 'default'); } catch (e) {}
      sync();
    });
    sync();

    var h = host();
    if (h) { h.appendChild(b); return; }

    // No home yet. Two of these sites build their masthead from JavaScript after
    // this runs, so a slot that does not exist at DOMContentLoaded may exist a
    // moment later. Place the fixed button now -- the control is never missing --
    // and move it into the bar if one turns up. Three seconds, then stop
    // watching: a site that has not built its chrome by then does not have one.
    b.className = 'dys-fixed';
    document.body.appendChild(b);
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function () {
      var late = host();
      if (!late || late.contains(b)) return;
      b.className = '';
      late.appendChild(b);
      mo.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
