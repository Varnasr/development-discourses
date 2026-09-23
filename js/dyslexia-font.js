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
 *
 * How it looks: set these on the script tag (data-accent, data-radius, ...) or
 * in the site's own stylesheet, pointing them at the site's tokens so they
 * track its themes.
 *     --dys-accent        colour of the button when the switch is on
 *     --dys-radius        corner radius (default 8px; 0 for a square house style)
 *     --dys-border-width  default 1px
 *     --dys-idle-border   default currentColor
 *     --dys-idle-opacity  default .72
 *     --dys-font          label typeface (default system-ui)
 *     --dys-min-size      minimum touch target (default 44px)
 *     --dys-surface/--dys-fg   ground and ink for the fixed corner variant
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

  // Per-site look, read off the script tag:
  //   data-accent="var(--accent)"  data-radius="0"  data-font="'JetBrains Mono',monospace"
  // A site with a stylesheet can set the same custom properties there instead;
  // these attributes exist because several of these sites carry their CSS
  // inline, per page, with no shared file to put a rule in. Pointing the
  // attribute at the site's own token rather than a literal colour is what
  // makes the button follow that site into dark mode: a var() resolves where it
  // is used, so whatever --accent means on the page is what the button gets.
  function opt(name) {
    var v = self && self.getAttribute('data-' + name);
    if (!v) return '';
    // These values are written straight into a stylesheet, so nothing that could
    // close a declaration or open a rule is allowed through. Colours, lengths,
    // font stacks and var() references all survive this; a semicolon, a brace,
    // an @rule or a backslash escape does not.
    if (v.length > 120 || /[;{}@\\<>]/.test(v)) return '';
    return v;
  }

  function face(weight, style, file) {
    return '@font-face{font-family:"OpenDyslexic";font-weight:' + weight + ';font-style:' + style +
      ';font-display:swap;src:url("' + DIR + file + '") format("woff2")}';
  }

  function styles() {
    var vars = '';
    [['accent', '--dys-accent'], ['radius', '--dys-radius'], ['font', '--dys-font'],
     ['border-width', '--dys-border-width'], ['idle-border', '--dys-idle-border'],
     ['idle-opacity', '--dys-idle-opacity'], ['surface', '--dys-surface'], ['fg', '--dys-fg']
    ].forEach(function (pair) {
      var v = opt(pair[0]);
      if (v) vars += pair[1] + ':' + v + ';';
    });
    // Scoped to the button, not :root, so a site's own token namespace is left
    // alone. The site's stylesheet can still set these on :root and they will
    // inherit in; anything given on the tag wins, being on the element itself.
    var scoped = vars ? '#dys-font-btn{' + vars + '}' : '';

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
      // The control itself. Every value a site is likely to care about is a
      // custom property with a neutral fallback, so a site themes the button by
      // setting --dys-accent (and friends) in its own stylesheet rather than
      // fighting this rule on specificity. Point --dys-accent at the site's own
      // accent token and dark mode follows for free, because a var() is resolved
      // where it is used, not where it is declared.
      // 44px, not 32. This button is a reading aid, so the people most likely
      // to reach for it are the ones a small target costs most; WCAG 2.2's
      // Target Size (Minimum), 2.5.8, puts the floor at 24px and the older
      // 2.5.5 at 44. It was 36x32 on every site using this script. Override
      // with --dys-min-size if a host genuinely needs it smaller.
      + '#dys-font-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;'
      + 'min-width:var(--dys-min-size,44px);min-height:var(--dys-min-size,44px);padding:0 12px;cursor:pointer;'
      + 'border-radius:var(--dys-radius,8px);'
      + 'border:var(--dys-border-width,1px) solid var(--dys-idle-border,currentColor);'
      + 'background:transparent;color:inherit;'
      + 'font:700 13px/1 var(--dys-font,system-ui,sans-serif);'
      // Idle opacity defaults to 1, not .72. The paragraph below argues that
      // leaving the ink alone is the one version that cannot go wrong, because
      // it is the ink the site already chose for that bar -- and then took 28%
      // off it, which undoes exactly that guarantee. Measured on
      // pinpointventures, --color-text #4b5563 is 6.41:1 on the header and the
      // composite at .72 is #7d858f, 3.73:1. A control that exists so people who
      // find text hard to read can read it should not be the dimmest thing on
      // the page. The idle/on distinction rides on the border and the wash, which
      // it already did. --dys-idle-opacity is still there for a site whose bar
      // has the headroom to spend.
      + 'letter-spacing:.02em;opacity:var(--dys-idle-opacity,1)}'
      // "On" is the site's accent as outline and a wash of itself, with the
      // label left at whatever ink the bar around it already uses. Two earlier
      // shapes were worse. A filled button needs an ink that clears 4.5:1
      // against whatever the accent happens to be, and these sites swap their
      // accent between themes (someperspective goes from #b4530e to #fb923c,
      // where white is fine on the first and fails on the second). Putting the
      // accent in the label instead moves the problem rather than solving it:
      // measured across the sites, Democracy by Design's --blue came out at
      // 3.34:1 and How India Lives' #0EA5E9 at 2.77:1 in light mode. Leaving
      // the ink alone is the one version that cannot go wrong, because it is
      // the ink the site already chose for that bar. State does not rest on
      // colour anyway: when the switch is on the label is set in OpenDyslexic,
      // and aria-pressed carries it for anyone who cannot see either.
      + '#dys-font-btn[aria-pressed="true"]{opacity:1;'
      + 'border-color:var(--dys-accent,#0EA5E9);'
      + 'background:color-mix(in srgb,var(--dys-accent,#0EA5E9) 16%,transparent)}'
      + '#dys-font-btn.dys-fixed{position:fixed;left:16px;bottom:16px;z-index:9990;'
      + 'background:var(--dys-surface,Canvas);color:var(--dys-fg,CanvasText);'
      + 'box-shadow:0 2px 10px rgba(0,0,0,.18);opacity:.92}'
      // Declared after the plain fixed background so a browser without
      // color-mix drops this line and keeps a solid one rather than going
      // transparent over the page.
      + '#dys-font-btn.dys-fixed[aria-pressed="true"]{'
      + 'background:color-mix(in srgb,var(--dys-accent,#0EA5E9) 16%,var(--dys-surface,Canvas))}'
      + scoped;
  }

  // Deliberately short. An earlier version fell back to the page <header>, which
  // put the button at the left edge of a hero banner on three of these sites --
  // present, and reading as debris. A site either names a home for it with
  // data-dyslexia-slot, or has a theme control to sit beside, or gets the fixed
  // corner button, which at least lands somewhere predictable.
  function host() {
    var el = document.querySelector('[data-dyslexia-slot]');
    if (el) return el;
    el = document.querySelector('.theme-selector,.theme-toggle,.theme-switch,'
      + '.theme-btn-group,.theme-toggle-group,.themebar');
    if (!el) return null;
    // On several of these sites .theme-toggle is the <button> itself rather
    // than a container. A button inside a button is invalid markup and the
    // parser moves it out anyway, so take the row it sits in.
    if (/^(BUTTON|A|INPUT|LABEL|SELECT)$/.test(el.tagName)) return el.parentElement;
    return el;
  }

  // Where in the slot the button lands. Default is the end of the row, which is
  // where it has always gone. A site that wants it somewhere else names an
  // element to sit in front of: data-dyslexia-before="#docsLink" on the slot.
  // Opt-in on purpose -- this file is shared across nine pages and a change to
  // the default would move the button on all of them.
  function place(h, b) {
    var sel = h.getAttribute && h.getAttribute('data-dyslexia-before');
    var ref = sel ? h.querySelector(sel) : null;
    if (ref && ref.parentElement === h) h.insertBefore(b, ref);
    else h.appendChild(b);
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
    if (h) { place(h, b); return; }

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
      place(late, b);
      mo.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
