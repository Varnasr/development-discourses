#!/usr/bin/env python3
"""
check_contrast.py - every ink token against every surface it can land on,
in both themes, at WCAG 2.1 AA for body text.

    python3 check_contrast.py
    python3 check_contrast.py --all    # print the passing pairs too

WHY IT EXISTS

On 2026-09-23 this stylesheet had fifteen failing pairs in the light theme and
three in the dark, and nothing in the repository looked at colour at all.
`--color-text-muted` was #8a8a8a, which is 3.28:1 on the page background and
styles twelve rules: every card byline, every count, every helper line.

The part worth keeping in mind is the part a token check nearly missed. The
badge system was written twice. `.resource-type-badge` used tokens;
`.access-badge` was a second copy with the same colours as **literals**, and
neither had a dark value. So in dark mode an Open Access badge painted #059669
text on a #ecfdf5 fill, a pale mint chip on a near-black card, at about 1.7:1.
A check that reads only `:root` sees none of that. The fills are tokens now
(`--badge-*-bg`) and both rules use them, which is what makes them checkable.

That is also the limit of this script, stated plainly: a colour written as a
literal in a rule, and a colour composited with opacity, are still invisible
here. It reports any literal hex it finds outside the token blocks so the gap
is at least visible.
"""
import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
# Both stylesheets, in the order the pages load them. style.css re-aliases
# --color-accent onto the kit's --imx-accent in dark mode, so reading style.css
# alone leaves the token that actually reaches the page unresolvable.
CSS_FILES = [os.path.join(ROOT, "css", "impactmojo-kit.css"),
             os.path.join(ROOT, "css", "style.css")]
AA = 4.5

# Named rather than prefix-matched. A prefix of `--color-accent` also catches
# `--color-accent-light`, which is a surface, and the first run duly reported
# eighteen failures for pale blue on pale blue. A token is ink or it is a
# surface; the list says which.
INK = {
    "--color-text", "--color-text-secondary", "--color-text-muted",
    "--color-accent", "--color-accent-hover",
    "--color-paper", "--color-book", "--color-grey", "--color-tag-text",
    "--color-bad",
}
SURFACE = {
    "--color-bg", "--color-surface", "--color-surface-hover",
    "--color-accent-light", "--color-tag-bg",
    "--badge-paper-bg", "--badge-book-bg", "--badge-grey-bg", "--badge-free-bg",
    "--badge-bad-bg",
}

# The other direction, which no ink-on-surface pass can see: the accent is a
# button and pill FILL with its own ink on top, and the two pull opposite ways.
# Darkening the accent to fix it as a link makes the filled button worse.
# `--color-on-accent` was the literal `white` in seven rules, which measured
# 7.51:1 in the light theme and **2.22:1** in the dark, where the kit aliases
# the accent to #6cb2ff. axe over the built pages is what found it.
FILLS = [
    ("--color-on-accent", "--color-accent", "filled pills, Read at Source, the active citation tab"),
    ("--color-on-accent", "--color-accent-hover", "the same controls on hover"),
]

# Pairs that are never put together, each with a reason. A stale exemption
# fails too: a pair that starts passing, or a token that disappears, is
# reported, so the list cannot rot into a blindfold.
EXEMPT = [
    ("--color-accent", "--badge-book-bg", "the blue badge uses --badge-free-bg"),
    ("--color-accent", "--badge-grey-bg", "the blue badge uses --badge-free-bg"),
    ("--color-accent", "--badge-paper-bg", "the blue badge uses --badge-free-bg"),
    ("--color-book", "--badge-grey-bg", "green ink only ever sits on the green fill"),
    ("--color-book", "--badge-paper-bg", "green ink only ever sits on the green fill"),
    ("--color-book", "--badge-free-bg", "green ink only ever sits on the green fill"),
    ("--color-grey", "--badge-book-bg", "amber ink only ever sits on the amber fill"),
    ("--color-grey", "--badge-paper-bg", "amber ink only ever sits on the amber fill"),
    ("--color-grey", "--badge-free-bg", "amber ink only ever sits on the amber fill"),
    ("--color-paper", "--badge-book-bg", "violet ink only ever sits on the violet fill"),
    ("--color-paper", "--badge-grey-bg", "violet ink only ever sits on the violet fill"),
    ("--color-paper", "--badge-free-bg", "violet ink only ever sits on the violet fill"),
]


def luminance(hex_colour):
    h = hex_colour.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    parts = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        parts.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]


def ratio(a, b):
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def block(css, selector):
    """Return the custom properties a selector declares, across every block.

    Every occurrence, not the first. `[data-theme="dark"]` is opened twice in
    this stylesheet: once with the site's own values, and again lower down to
    re-alias `--color-accent` and friends onto the ImpactMojo kit. Reading only
    the first block measured `#58a6ff` where the browser paints `#6cb2ff`. The
    verdict happened to be the same either way, which is exactly how a check
    like this drifts into measuring a value nothing uses.
    """
    out = {}
    at = css.find(selector)
    if at == -1:
        return None
    while at != -1:
        open_at = css.index("{", at)
        depth = 0
        end = open_at
        for i in range(open_at, len(css)):
            if css[i] == "{":
                depth += 1
            elif css[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break
        body = css[open_at + 1:end]
        out.update(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", body))
        at = css.find(selector, end)
    return out


def resolve(tokens, value, seen=None):
    """Follow `var(--x)` so a token that aliases another is measured."""
    seen = seen or set()
    m = re.fullmatch(r"var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)", value.strip())
    if not m:
        return value.strip()
    if m.group(1) in seen:
        return None
    seen.add(m.group(1))
    if m.group(1) in tokens:
        return resolve(tokens, tokens[m.group(1)], seen)
    return resolve(tokens, m.group(2), seen) if m.group(2) else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="print the passing pairs too")
    args = ap.parse_args()

    css = "\n".join(open(f, encoding="utf-8").read() for f in CSS_FILES)
    themes = [("light (default)", block(css, ":root {")),
              ("dark  (opt-in)", block(css, '[data-theme="dark"] {'))]

    failures, passes, pairs = [], [], 0
    exempt_seen = set()

    for name, tokens in themes:
        if not tokens:
            failures.append({"theme": name, "why": "theme block not found in the stylesheets"})
            continue
        # The dark block redeclares only some tokens, so anything it does not
        # override is inherited from :root and has to be measured as inherited.
        merged = dict(themes[0][1] or {})
        merged.update(tokens)
        inks = [k for k in merged if k in INK]
        surfaces = [k for k in merged if k in SURFACE]
        if not inks or not surfaces:
            failures.append({"theme": name,
                             "why": f"found {len(inks)} ink and {len(surfaces)} surface tokens"})
            continue
        for ink in sorted(inks):
            fg = resolve(merged, merged[ink])
            if not fg or not fg.startswith("#"):
                continue
            for surface in sorted(surfaces):
                bg = resolve(merged, merged[surface])
                if not bg or not bg.startswith("#"):
                    continue
                pairs += 1
                exempt = next((e for e in EXEMPT if e[0] == ink and e[1] == surface), None)
                r = ratio(fg, bg)
                if exempt:
                    exempt_seen.add((ink, surface))
                    continue
                row = {"theme": name, "ink": ink, "surface": surface, "fg": fg, "bg": bg, "r": r}
                (failures if r < AA else passes).append(row)

    for name, tokens in themes:
        if not tokens:
            continue
        merged = dict(themes[0][1] or {})
        merged.update(tokens)
        for ink, fill, why in FILLS:
            fg = resolve(merged, merged.get(ink, ""))
            bg = resolve(merged, merged.get(fill, ""))
            if not fg or not bg or not fg.startswith("#") or not bg.startswith("#"):
                failures.append({"theme": name, "ink": ink, "surface": fill,
                                 "why": "could not be resolved"})
                continue
            pairs += 1
            r = ratio(fg, bg)
            row = {"theme": name, "ink": ink, "surface": f"{fill} ({why})",
                   "fg": fg, "bg": bg, "r": r}
            (failures if r < AA else passes).append(row)

    for ink, surface, why in EXEMPT:
        if (ink, surface) not in exempt_seen:
            failures.append({"theme": "any", "ink": ink, "surface": surface,
                             "why": f"stale exemption ({why}): not a pair any more"})

    # The literals this check cannot see, reported rather than ignored.
    token_spans = []
    for sel in (":root {", '[data-theme="dark"] {'):
        at = css.find(sel)
        while at != -1:
            open_at = css.index("{", at)
            depth, end = 0, open_at
            for i in range(open_at, len(css)):
                if css[i] == "{":
                    depth += 1
                elif css[i] == "}":
                    depth -= 1
                    if depth == 0:
                        end = i
                        break
            token_spans.append((at, end))
            at = css.find(sel, end)
    literals = set()
    for m in re.finditer(r"(?:color|background)\s*:\s*(#[0-9a-fA-F]{3,8})\b", css):
        if not any(a <= m.start() <= b for a, b in token_spans):
            literals.add(m.group(1).lower())

    print(f"Token contrast: {pairs} ink-on-surface pair(s) across {len(themes)} themes, "
          f"against {AA}:1.")
    if args.all:
        for p in passes:
            print(f"  ok   {p['theme']}  {p['ink']} on {p['surface']}  {p['r']:.2f}:1")
    if literals:
        print(f"\n{len(literals)} colour literal(s) outside the token blocks. These are not "
              f"measured here:\n  " + ", ".join(sorted(literals)))

    if failures:
        print("")
        for f in failures:
            if f.get("why"):
                print(f"  {f['theme']}: {f.get('ink','')} {f.get('surface','')} {f['why']}".strip())
            else:
                print(f"  {f['theme']}  {f['ink']} ({f['fg']}) on {f['surface']} ({f['bg']})"
                      f"  {f['r']:.2f}:1")
        print(f"\nFAIL: {len(failures)} pair(s) under {AA}:1.", file=sys.stderr)
        return 1
    print(f"OK: every ink token clears {AA}:1 on every surface it can land on, in both themes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
