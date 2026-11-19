import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANALYTICS } from '../../src/data/analytics';
import { SITE } from '../../src/data/site';
import { securityHeaders } from '../../deploy/headers';

// Order Up: Night Shift at /play and /play/ru. The pages are the game's own documents, brought in from the
// game repo by tools/game/sync.mjs; these tests hold what the site needs from them.
const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const has = (path: string) => existsSync(new URL(path, root));

const PAGES = [
  { lang: 'en', url: `${SITE.url}/play`, file: 'src/game/en.html', route: 'src/pages/play.astro' },
  { lang: 'ru', url: `${SITE.url}/play/ru`, file: 'src/game/ru.html', route: 'src/pages/play/ru.astro' },
] as const;

const scriptsOf = (html: string) => [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]!.match(/\ssrc="([^"]+)"/)?.[1] ?? 'inline');

describe('Order Up on the site', () => {
  for (const page of PAGES) {
    describe(page.url, () => {
      const html = read(page.file);

      it('is a whole document in its language, served as it is', () => {
        expect(html.startsWith('<!doctype html>')).toBe(true);
        expect(html).toContain(`<html lang="${page.lang}">`);
        expect(read(page.route)).toContain(`'../${'../'.repeat(page.route.split('/').length - 3)}game/${page.lang}.html?raw'`);
      });

      it('runs only scripts kept in files under /play: the policy refuses any written into a page', () => {
        const expected = [...(page.lang === 'en' ? ['/play/lang.js'] : []), '/play/track.js', `/play/game.${page.lang}.js`];
        expect(scriptsOf(html)).toEqual(expected);
        for (const src of expected) expect(has(`public${src}`), src).toBe(true);
        // No handler written into a tag either.
        expect(html.replace(/<style>[\s\S]*?<\/style>/g, '')).not.toMatch(/<[^>]+\son[a-z]+\s*=/i);
      });

      it('loads nothing from another site: fonts and styles come from /play', () => {
        const outside = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]!).filter((href) => !href.startsWith(SITE.url));
        expect(outside).toEqual([]);
        expect(html).toContain('<link rel="stylesheet" href="/play/fonts.css">');
        expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
      });

      it('names its own address, the other language and the site’s icon', () => {
        expect(html).toContain(`<link rel="canonical" href="${page.url}">`);
        for (const other of PAGES) expect(html).toContain(`<link rel="alternate" hreflang="${other.lang}" href="${other.url}">`);
        expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${SITE.url}/play">`);
        expect(html).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
        expect(html).toContain(`<meta property="og:image" content="${SITE.url}/play/og.jpg">`);
        expect(html).toContain(`<meta property="og:locale" content="${page.lang === 'en' ? 'en_US' : 'ru_RU'}">`);
      });

      it('was built for this address: the share text and the demo link point at aldenteai.com', () => {
        const script = read(`public/play/game.${page.lang}.js`);
        expect(script).toContain(`const GAME_URL = '${page.url}';`);
        expect(script).toContain(`const DEMO_URL = '${SITE.url}/demo?utm_source=game`);
        // Every file the game asks for is shipped with the site.
        const asked = [...script.matchAll(/'(\/play\/[\w./-]+)'/g)].map((m) => m[1]!);
        expect(asked.sort()).toEqual(['/play/cafe.mp3', '/play/splash-4x5.webp', '/play/splash-9x16.webp']);
        for (const path of [...asked, '/play/og.jpg']) expect(has(`public${path}`), path).toBe(true);
      });
    });
  }

  it('carries the game’s fonts itself, so no visitor’s address goes to Google', () => {
    const css = read('public/play/fonts.css');
    const files = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]!);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/^\/play\/fonts\/[\w-]+\.woff2$/);
      expect(has(`public${file}`), file).toBe(true);
    }
    // The faces each edition's styles name.
    for (const family of ['Anton', 'Barlow', 'Tilt Neon', 'Geist Mono', 'Golos Text', 'Sofia Sans Extra Condensed']) {
      expect(css, family).toContain(`font-family: '${family}';`);
    }
    expect(has('public/play/fonts/LICENSE.txt')).toBe(true);
  });

  it('counts game visits in the site’s own Umami site, on the production hosts only', () => {
    const track = read('public/play/track.js');
    expect(track).toContain(`'${ANALYTICS.script}'`);
    expect(track).toContain(`'${ANALYTICS.websiteId}'`);
    expect(track).toContain(`'${ANALYTICS.endpoint}'`);
    for (const host of ANALYTICS.hosts) expect(track).toContain(`'${host}'`);
  });

  it('shows the share card: the policy lets a page show a picture it has just drawn', () => {
    const csp = securityHeaders()['Content-Security-Policy']!;
    expect(csp).toMatch(/img-src 'self' data: blob: https:;/);
  });
});
