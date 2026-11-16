import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join } from 'node:path';
import { expect, test } from './fixtures';

/**
 * Safari on a host that does not answer byte ranges. This is what aldenteai.com did on 2026-11-16: every .mp4
 * came back whole, with no length, under a Content-Security-Policy without `media-src blob:`. Safari showed a
 * broken player; Chrome played. The stand-in server below behaves the same way, and the clips must play.
 *
 * Runs in the Safari engine only: `npm run test:e2e:browsers`.
 */
const CSP =
  "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

let server: Server;
let origin = '';

test.beforeAll(async () => {
  const root = join(process.cwd(), 'dist');
  server = createServer((request, response) => {
    let file = join(root, decodeURIComponent(new URL(request.url ?? '/', 'http://host').pathname));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      response.writeHead(404, { 'content-security-policy': CSP });
      return response.end();
    }
    const headers: Record<string, string> = { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'content-security-policy': CSP, 'cache-control': 'no-cache' };
    // A clip: the Range header is ignored and no length is sent.
    if (extname(file) !== '.mp4') headers['content-length'] = String(statSync(file).size);
    response.writeHead(200, headers);
    createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  origin = `http://localhost:${(server.address() as AddressInfo).port}`;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.describe('Clips in Safari on a host without byte ranges', () => {
  test.skip(({ browserName }) => browserName !== 'webkit', 'Only Safari needs byte ranges to play a video.');

  test('the hero clip plays on the first visit, and the watch video plays when opened', async ({ page }) => {
    await page.goto(`${origin}/`);
    const hero = page.locator('.hm__video').first();
    await expect.poll(() => hero.evaluate((video: HTMLVideoElement) => video.currentTime), { timeout: 15_000 }).toBeGreaterThan(0.5);
    await expect(hero).not.toHaveAttribute('data-still', '');

    await page.locator('[data-watch]').first().click();
    const watch = page.locator('.watch__video');
    await expect.poll(() => watch.evaluate((video: HTMLVideoElement) => video.currentTime), { timeout: 15_000 }).toBeGreaterThan(0.5);
    expect(await watch.evaluate((video: HTMLVideoElement) => video.error)).toBeNull();
  });
});
