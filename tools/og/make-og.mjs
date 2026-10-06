// Usage: node tools/og/make-og.mjs [out.jpg]  (renders tools/og/og.html to public/og.jpg, the 1200x630 share image)
import { createRequire } from 'node:module';
import { statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = new URL('./', import.meta.url);
const site = new URL('../../', here);
// Playwright comes from the site's own node_modules, so this works from any working directory.
const require = createRequire(new URL('package.json', site));
const { chromium } = require('@playwright/test');

const template = new URL('og.html', here);
const out = process.argv[2] ?? fileURLToPath(new URL('public/og.jpg', site));
const MAX_BYTES = 150 * 1024;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(fileURLToPath(template)).href);
  await page.evaluate(() => document.fonts.ready);
  const problems = await page.evaluate(async () => {
    const issues = [];
    await Promise.all([...document.images].map((img) => img.decode().catch(() => issues.push(`image failed: ${img.src}`))));
    if (![...document.fonts].some((f) => f.family.replace(/['"]/g, '') === 'Onest' && f.status === 'loaded'))
      issues.push('Onest did not load');
    // Every text block must sit inside the 64px safe area (the camera console may bleed off the edge).
    for (const el of document.querySelectorAll('.copy > *, .slack')) {
      const r = el.getBoundingClientRect();
      if (r.left < 64 || r.top < 64 || r.right > 1200 - 64 || r.bottom > 630 - 64)
        issues.push(`outside safe area: ${el.className || el.tagName}`);
    }
    return issues;
  });
  if (problems.length) throw new Error(problems.join('\n'));
  await page.screenshot({ path: out, type: 'jpeg', quality: 85 });
} finally {
  await browser.close();
}

const { size } = statSync(out);
console.log(`wrote ${out} (${Math.round(size / 1024)} KB)`);
if (size > MAX_BYTES) {
  console.error(`share image is over ${MAX_BYTES / 1024} KB`);
  process.exitCode = 1;
}
