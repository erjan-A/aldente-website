// Worst-case contrast of the hero's text against what is really painted behind it (ground, glow and all).
import { chromium } from '@playwright/test';
import sharp from 'sharp';
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [name, w, h] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(process.argv[2] || 'http://localhost:4399/');
  await p.evaluate(() => document.querySelector('cookie-consent')?.remove());
  const els = await p.evaluate(() => ['.hero .pill', '.hero__title', '.hero__title span', '.hero__lead', '.hero .btn--secondary'].map((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); const c = getComputedStyle(e).color.match(/[\d.]+/g).map(Number); const inset = s.endsWith('.pill') ? 4 : 0; return { s, x: Math.max(0, Math.floor(r.x)) + inset, y: Math.floor(r.y) + inset, w: Math.floor(r.width) - 2 * inset, h: Math.floor(r.height) - 2 * inset, c }; }));
  await p.addStyleTag({ content: '.hero__copy > *, .hero__copy * { color: transparent !important; } .hero .btn { visibility: hidden !important; }' });
  const all = Object.fromEntries(els.map((e) => [e.s, []]));
  for (let t = 0; t < 6; t++) {
    await p.waitForTimeout(t === 0 ? 2500 : 1500);
    const png = await p.screenshot();
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const k = info.width / w;
    for (const e of els) {
      const a = e.c[3] ?? 1;
      for (let y = e.y; y < e.y + e.h; y += 2) for (let x = e.x; x < Math.min(w, e.x + e.w); x += 2) {
        const i = (Math.floor(y * k) * info.width + Math.floor(x * k)) * info.channels;
        const bg = [data[i], data[i + 1], data[i + 2]];
        const fg = e.c.slice(0, 3).map((c, n) => c * a + bg[n] * (1 - a));
        const [l1, l2] = [lum(...fg), lum(...bg)].sort((m, n) => n - m);
        all[e.s].push((l1 + 0.05) / (l2 + 0.05));
      }
    }
  }
  console.log(name, Object.entries(all).map(([s, v]) => { v.sort((m, n) => m - n); return `${s.replace('.hero', '').trim()}: ${v[Math.floor(v.length * 0.02)].toFixed(2)} (min ${v[0].toFixed(2)})`; }).join(' | '));
  await p.close();
}
await b.close();
