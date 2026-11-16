import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The design system, enforced: every stylesheet in src/ takes its type sizes, weights and radii from the
 * tokens in src/styles/global.css, and the site's own layout sits on the 4px spacing grid. DESIGN.md states
 * the rules in words; this file fails when a component drifts from them.
 *
 * Two kinds of code are exempt, each from one rule only:
 *   - Slack replicas (components/slack, styles/slack.css) copy Slack's own sizes, weights and colours.
 *   - Product mock-ups (drawings of the product's screens) keep the product's own dense spacing. Their text
 *     still comes from the scale (--step-mock, --step-mock-s).
 */
const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** The CSS of a file: the whole file for .css, the <style> blocks for .astro. Comments removed. */
function cssOf(path: string): string {
  const text = readFileSync(path, 'utf8');
  const css = path.endsWith('.css') ? text : [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

const files = walk(SRC)
  .filter((path) => /\.(astro|css)$/.test(path))
  .map((path) => ({ name: relative(SRC, path), css: cssOf(path) }));

const isSlack = (name: string) => name.startsWith('components/slack/') || name === 'styles/slack.css';

/** The site's own layout: shared components, chrome, pages, and the home page's sections. */
const isLayout = (name: string) =>
  /^(components\/(ui|site|pricing)\/|pages\/|layouts\/|styles\/global\.css$)/.test(name) ||
  /^components\/home\/(Hero|HeroMedia|LogoBand|ProofBar|Problem|Calculator|Results|Cta|CaseStudy|Voices)\.astro$/.test(name);

function declarations(css: string, property: RegExp): string[] {
  return [...css.matchAll(new RegExp(`(?<![-\\w])(?:${property.source})\\s*:\\s*([^;{}]+);`, 'g'))].map((m) => m[1]!.trim());
}

const tokens = new Set([...readFileSync(join(SRC, 'styles/global.css'), 'utf8').matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]));

describe('design system', () => {
  it('every type size is a step of the scale', () => {
    const allowed = /^(var\(--step-[\w-]+\)|min\(var\(--step-[\w-]+\), [\d.]+vw\)|inherit|1em|100%)$/;
    const drift = files
      .filter((f) => !isSlack(f.name))
      .flatMap((f) => declarations(f.css, /font-size/).filter((v) => !allowed.test(v)).map((v) => `${f.name}: font-size: ${v}`));
    expect(drift).toEqual([]);
  });

  it('only the four weights are used: 400 body, 500 secondary, 600 labels and controls, 700 headings', () => {
    const drift = files
      .filter((f) => !isSlack(f.name))
      .flatMap((f) => declarations(f.css, /font-weight/).filter((v) => !/^(400|500|600|700|inherit)$/.test(v)).map((v) => `${f.name}: font-weight: ${v}`));
    expect(drift).toEqual([]);
  });

  it('one family for text, the mono face only through its token', () => {
    const drift = files
      .filter((f) => !isSlack(f.name))
      .flatMap((f) => declarations(f.css, /font-family/).filter((v) => !/^(var\(--font(-mono)?\)|inherit)$/.test(v)).map((v) => `${f.name}: font-family: ${v}`));
    expect(drift).toEqual([]);
  });

  it('every corner radius is a radius token (or a circle, or the outer radius minus its padding)', () => {
    const inner = /^calc\(var\(--radius-[\w-]+\) - (\d+px|var\(--[\w-]+\))\)$/;
    const part = /^(var\(--radius-[\w-]+\)|50%|0|inherit)$/;
    const ok = (value: string) => inner.test(value) || value.split(/\s+/).every((p) => part.test(p));
    const drift = files
      .filter((f) => !isSlack(f.name))
      .flatMap((f) => declarations(f.css, /border(?:-[a-z]+){0,2}-radius/).filter((v) => !ok(v)).map((v) => `${f.name}: border-radius: ${v}`));
    expect(drift).toEqual([]);
  });

  it('the site’s own layout sits on the 4px grid (1px and 2px are for hairlines and nudges)', () => {
    const drift = files
      .filter((f) => isLayout(f.name))
      .flatMap((f) =>
        declarations(f.css, /(?:padding|margin|gap|row-gap|column-gap)(?:-[a-z-]+)?/)
          // Offsets that centre or overlap things are computed (negative values, calc), not picked from the grid.
          .filter((v) => !v.includes('calc(') && !/(^|\s)-\d/.test(v))
          .filter((v) => [...v.replace(/clamp\([^)]*\)/g, (c) => c.replace(/[\d.]+(vw|rem)/g, '')).matchAll(/(?<![\w.#-])(\d+(?:\.\d+)?)px/g)].some((m) => ![1, 2].includes(Number(m[1])) && Number(m[1]) % 4 !== 0))
          .map((v) => `${f.name}: ${v}`),
      );
    expect(drift).toEqual([]);
  });

  it('the site’s own layout takes its colours from tokens (plain black and white may carry an alpha)', () => {
    // Shadows, backdrops, masks and washes are neutral: black or white, with or without an alpha.
    const neutral = /^(#000|#fff|#000000|#ffffff|rgb\((0 0 0|255 255 255)( \/ [\d.]+)?\))$/i;
    const drift = files
      .filter((f) => isLayout(f.name) && f.name !== 'styles/global.css')
      .flatMap((f) => [...f.css.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)].map((m) => m[0]).filter((c) => !neutral.test(c)).map((c) => `${f.name}: ${c}`));
    expect(drift).toEqual([]);
  });

  it('the accent and the green are written once, in the tokens: no copy of their values in a component', () => {
    // A tint of either is color-mix(in srgb, var(--accent) 12%, transparent), so a change of the token reaches it.
    const copy = /#e05634|#b52c0b|#4fbf85|#147a43|224,? 86,? 52|79,? 191,? 133/i;
    const drift = files.filter((f) => f.name !== 'styles/global.css' && !isSlack(f.name) && copy.test(f.css)).map((f) => f.name);
    expect(drift).toEqual([]);
  });

  it('a gradient keeps a plain shape: no min(), max(), calc() or clamp() before its first colour stop', () => {
    // Chromium accepts no math function in a gradient's size or position and drops the whole declaration,
    // silently: the page then looks different in Chrome and in Safari.
    const drift = files.flatMap((f) =>
      [...f.css.matchAll(/(?:radial|conic|linear)-gradient\(([^,;{}]*)/g)].filter((m) => /\b(min|max|calc|clamp)\(/.test(m[1]!)).map((m) => `${f.name}: ${m[0]}`),
    );
    expect(drift).toEqual([]);
  });

  it('boxed surfaces are the Card component, not hand-made boxes', () => {
    // A rule that draws a card by hand: the card edge, a card radius and a card fill together.
    // The few that stay are listed with the reason; a new one fails here.
    const allowed: Record<string, string> = {
      'components/ui/Card.astro .card': 'the Card itself',
      'components/site/WatchDialog.astro .watch': 'a <dialog>, which Card cannot render',
      'components/site/Header.astro .nav__card': 'the header menu popover, positioned by the header',
      'components/pricing/PlanGrid.astro .plan': 'plan cards share their rows through subgrid',
      'components/pricing/PlanGrid.astro .aldo-incl': 'a strip whose padding lines up with the plan cards above it',
      'components/home/CaseStudy.astro .case__quote': 'a two-column grid',
      'pages/playbooks.astro .abilities__grid': 'a ruled grid of cells, not a card',
    };
    const found = files
      .filter((f) => isLayout(f.name))
      .flatMap((f) =>
        [...f.css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
          .filter(([, , body]) => /border:\s*1px solid var\(--(card-line|line-card)/.test(body!) && /border-radius:\s*var\(--radius-(m|l|xl)\)/.test(body!) && /background:\s*var\(--(card|surface|bg|paper-card)\b/.test(body!))
          .map(([, selector]) => `${f.name} ${selector!.trim().split('\n').pop()!.trim()}`),
      );
    expect(found.filter((box) => !(box in allowed))).toEqual([]);
    // The list holds no entry that no longer exists.
    expect(Object.keys(allowed).filter((box) => !found.includes(box) && box !== 'components/ui/Card.astro .card')).toEqual([]);
  });

  it('icons take their stroke from their size, never from the caller', () => {
    const callers = walk(SRC)
      .filter((path) => path.endsWith('.astro') && !path.endsWith('ui/Icon.astro'))
      .filter((path) => /<Icon\b[^>]*strokeWidth/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path));
    expect(callers).toEqual([]);
  });

  it('every token a component reads is defined', () => {
    const local = /^--(fg|fg-2|fg-3|fg-accent|card|card-line|tag-bg|tag-fg|tone-bg)$/;
    const missing = new Set<string>();
    for (const f of files) {
      const own = new Set([...f.css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
      for (const m of f.css.matchAll(/var\((--(?:step|radius|font|card-pad|section|gutter|container|header)[\w-]*)/g)) {
        if (!tokens.has(m[1]) && !own.has(m[1]) && !local.test(m[1]!)) missing.add(`${f.name}: ${m[1]}`);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
