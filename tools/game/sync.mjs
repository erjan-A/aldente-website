#!/usr/bin/env node
/**
 * Brings Order Up: Night Shift into the site, so one deploy of the site ships the game too.
 *
 *   npm run game:sync -- <the game repo's play/ folder>
 *
 * The game repo (erjan-A/order-up-night-shift) builds two self-contained pages with inline scripts and Google
 * Fonts. The site's Content-Security-Policy allows neither, so each page is rewritten here, and only here:
 *
 * - the game's script moves to a file of its own (public/play/game.en.js, game.ru.js);
 * - the game's Umami loader gives way to public/play/track.js, which also keeps the first events;
 * - Google Fonts are copied to public/play/fonts and declared in public/play/fonts.css;
 * - the head gains the favicon, the language alternates and the link-preview locale;
 * - the English page gains public/play/lang.js, which sends a Russian-speaking browser to /play/ru.
 *
 * The pages land in src/game/ (src/pages/play.astro and src/pages/play/ru.astro serve them as they are), the
 * art and sound in public/play/, and the link-preview art once more in src/assets/images/game-banner.jpg,
 * where the site's popup (PromoPopup) takes it from. Everything written here is committed; the build needs no game repo.
 * Run it again after every change to the game. It fails loudly when the game's pages change shape.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ORIGIN = 'https://aldenteai.com';
const PAGES = [
  { lang: 'en', source: 'index.html', url: `${ORIGIN}/play`, locale: 'en_US' },
  { lang: 'ru', source: 'ru/index.html', url: `${ORIGIN}/play/ru`, locale: 'ru_RU' },
];
const ASSETS = ['cafe.mp3', 'og.jpg', 'splash-4x5.webp', 'splash-9x16.webp'];
const OG_SIZE = { width: 1200, height: 630 };
/** Google answers with woff2 and per-script subsets only to a browser it knows. */
const BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const from = process.argv[2];
if (!from || !existsSync(join(from, 'index.html'))) {
  console.error("usage: npm run game:sync -- <the game repo's play/ folder>");
  process.exit(1);
}
const out = { pages: join(SITE, 'src/game'), play: join(SITE, 'public/play') };
mkdirSync(out.pages, { recursive: true });
mkdirSync(join(out.play, 'fonts'), { recursive: true });

function fail(message) {
  console.error(`game:sync: ${message}`);
  process.exit(1);
}

/** Replaces the one place `pattern` matches; anything else means the game's page changed shape. */
function swap(html, pattern, replacement, what) {
  const found = html.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) ?? [];
  if (found.length !== 1) fail(`expected one ${what}, found ${found.length}`);
  return html.replace(pattern, replacement);
}

/* ---------- fonts: the files Google would have served, from our own address ---------- */

const fontLinks = [];

async function fonts() {
  const sheet = join(out.play, 'fonts.css');
  const stamp = `/* Copies of ${fontLinks.join(' and ')} */`;
  if (existsSync(sheet) && readFileSync(sheet, 'utf8').startsWith(stamp)) return 'kept';

  const faces = new Map();
  for (const link of fontLinks) {
    const response = await fetch(link, { headers: { 'User-Agent': BROWSER } });
    if (!response.ok) fail(`Google Fonts answered ${response.status} for ${link}`);
    const css = await response.text();
    for (const [, subset, body] of css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([^}]*)\}/g)) {
      const read = (name) => body.match(new RegExp(`${name}: ([^;]+);`))?.[1].trim();
      const url = body.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1];
      if (!url) fail(`a font face without a woff2 file in ${link}: ${body}`);
      const face = { subset, url, family: read('font-family').replace(/['"]/g, ''), style: read('font-style'), weight: read('font-weight'), range: read('unicode-range') };
      // The two pages share faces (Tilt Neon, Geist Mono): one rule each.
      faces.set([face.family, face.style, face.weight, face.subset].join('|'), face);
    }
  }
  if (!faces.size) fail('no font faces found in the Google Fonts stylesheets');

  // One file can serve several weights of a variable font: it is saved once, under a name that says which.
  const weights = new Map();
  for (const face of faces.values()) weights.set(face.url, [...(weights.get(face.url) ?? []), face.weight.replace(/\s+/g, '-')]);
  const fileOf = (face) =>
    `${face.family.toLowerCase().replace(/\s+/g, '-')}-${face.subset}-${face.style}-${[...new Set(weights.get(face.url))].join('_')}.woff2`;

  for (const old of readdirSync(join(out.play, 'fonts'))) if (old.endsWith('.woff2')) rmSync(join(out.play, 'fonts', old));
  const saved = new Set();
  for (const face of faces.values()) {
    const file = fileOf(face);
    if (saved.has(file)) continue;
    const response = await fetch(face.url);
    if (!response.ok) fail(`Google Fonts answered ${response.status} for ${face.url}`);
    writeFileSync(join(out.play, 'fonts', file), Buffer.from(await response.arrayBuffer()));
    saved.add(file);
  }

  const rules = [...faces.values()].map(
    (face) =>
      `/* ${face.subset} */\n@font-face {\n  font-family: '${face.family}';\n  font-style: ${face.style};\n  font-weight: ${face.weight};\n  font-display: swap;\n  src: url(/play/fonts/${fileOf(face)}) format('woff2');\n  unicode-range: ${face.range};\n}`,
  );
  writeFileSync(
    sheet,
    `${stamp}\n/* Written by tools/game/sync.mjs. The fonts are under the SIL Open Font License (see fonts/LICENSE.txt). */\n${rules.join('\n')}\n`,
  );
  return `${saved.size} files`;
}

/* ---------- pages ---------- */

function page({ lang, source, url, locale }) {
  let html = readFileSync(join(from, source), 'utf8');

  // Fonts from our own address.
  html = swap(html, /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n?/, '', 'Google Fonts preconnect');
  html = swap(html, /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\n?/, '', 'gstatic preconnect');
  html = swap(
    html,
    /<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)">/,
    (_, link) => {
      fontLinks.push(link.replace(/&amp;/g, '&'));
      return '<link rel="stylesheet" href="/play/fonts.css">';
    },
    'Google Fonts stylesheet',
  );

  // Scripts in files of their own: the policy runs none that is written into a page.
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 2 || !scripts[0][1].includes('cloud.umami.is') || !scripts[1][1].includes('GAME_URL')) {
    fail(`${source}: expected the Umami loader and the game script, found ${scripts.length} inline scripts`);
  }
  if (!scripts[1][1].includes(`const GAME_URL = '${url}';`)) fail(`${source}: the game was not built for ${url}`);
  writeFileSync(join(out.play, `game.${lang}.js`), `${scripts[1][1].trim()}\n`);
  html = html.replace(scripts[0][0], '<script src="/play/track.js"></script>');
  html = html.replace(scripts[1][0], `<script src="/play/game.${lang}.js"></script>`);

  // The head: the address in the other language, the site's icon, the preview's language and size.
  if (lang === 'en') html = swap(html, /<meta charset="utf-8">\n/, '<meta charset="utf-8">\n<script src="/play/lang.js"></script>\n', 'charset line');
  const other = PAGES.find((p) => p.lang !== lang);
  html = swap(
    html,
    new RegExp(`<link rel="canonical" href="${url}">\n`),
    [
      `<link rel="canonical" href="${url}">`,
      ...PAGES.map((p) => `<link rel="alternate" hreflang="${p.lang}" href="${p.url}">`),
      `<link rel="alternate" hreflang="x-default" href="${PAGES[0].url}">`,
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
      '<meta property="og:site_name" content="Aldente AI">',
      `<meta property="og:locale" content="${locale}">`,
      `<meta property="og:locale:alternate" content="${other.locale}">`,
      '',
    ].join('\n'),
    'canonical link',
  );
  html = swap(
    html,
    /(<meta property="og:image" content="[^"]+">)\n/,
    `$1\n<meta property="og:image:width" content="${OG_SIZE.width}">\n<meta property="og:image:height" content="${OG_SIZE.height}">\n`,
    'link-preview image',
  );

  // What the policy would refuse must not be left in the page.
  if (/<script(?![^>]*\ssrc=)/.test(html)) fail(`${source}: an inline script is left`);
  if (/<[^>]+\son[a-z]+\s*=/i.test(html.replace(/<style>[\s\S]*?<\/style>/g, ''))) fail(`${source}: an inline event handler is left`);
  for (const [, address] of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https?:\/\/[^"]+)"/g)) {
    if (!address.startsWith(ORIGIN)) fail(`${source}: loads ${address} from another site`);
  }
  writeFileSync(join(out.pages, `${lang}.html`), html);
  return html;
}

const built = PAGES.map(page);
for (const asset of ASSETS) {
  if (!existsSync(join(from, asset))) fail(`${asset} is missing from ${from}`);
  copyFileSync(join(from, asset), join(out.play, asset));
}
copyFileSync(join(from, 'og.jpg'), join(SITE, 'src/assets/images/game-banner.jpg'));
const fontState = await fonts();

// Every file a page asks for from /play is there.
for (const [i, html] of built.entries()) {
  const script = readFileSync(join(out.play, `game.${PAGES[i].lang}.js`), 'utf8');
  for (const [, path] of `${html}\n${script}`.matchAll(/["'(](\/play\/[\w./-]+\.\w+)["')]/g)) {
    if (!existsSync(join(SITE, 'public', path))) fail(`${PAGES[i].source} asks for ${path}, which is not in public/`);
  }
}

const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12);
for (const { lang } of PAGES) console.log(`${lang}: src/game/${lang}.html ${hash(join(out.pages, `${lang}.html`))}, public/play/game.${lang}.js ${hash(join(out.play, `game.${lang}.js`))}`);
console.log(`assets: ${ASSETS.join(', ')}; fonts: ${fontState}`);
