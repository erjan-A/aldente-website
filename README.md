# aldenteai.com

The Aldente AI website. A static [Astro](https://astro.build) build: plain HTML, CSS, JS and images in `dist/`. No database, no server code, no secrets.

## Build

Node 22.12+ (`.nvmrc`).

```sh
npm ci
npm run verify   # optional: type check, tests, build, browser tests (first run: npx playwright install chromium)
npm run build    # → dist/
```

## Deploy with Firebase Hosting

This is how aldenteai.com runs (Firebase Hosting behind Cloudflare).

```sh
npm ci && npm run build
firebase deploy --only hosting
```

`firebase.json` carries the security headers, the redirects, clean URLs and caching, so a deploy brings them along and nothing is set by hand. It holds the same rules as `deploy/nginx`; a test keeps the two equal. Change a header in `deploy/nginx/snippets/aldente-headers.conf` and in `firebase.json` together.

## Deploy with nginx

nginx 1.25.1+ (for older versions, see the top of `deploy/nginx/aldenteai.com.conf`).

1. Upload the build: `rsync -a --delete dist/ server:/var/www/aldenteai.com/dist/`
2. On the server, from a copy of this repo:

   ```sh
   sudo cp deploy/nginx/snippets/aldente-*.conf /etc/nginx/snippets/
   sudo cp deploy/nginx/aldenteai.com.conf /etc/nginx/sites-available/aldenteai.com
   sudo ln -s /etc/nginx/sites-available/aldenteai.com /etc/nginx/sites-enabled/aldenteai.com
   sudo mkdir -p /var/www/letsencrypt
   ```

3. HTTPS: on first setup there is no certificate yet, so comment out the two `listen 443` server blocks, then:

   ```sh
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot certonly --webroot -w /var/www/letsencrypt -d aldenteai.com -d www.aldenteai.com
   ```

   Restore the two blocks and run `sudo nginx -t && sudo systemctl reload nginx` again. Using another CA? Change the `ssl_certificate` lines.

## Or deploy with Docker

```sh
docker build -t aldente-website .
docker run -d --name aldente-website -p 8080:80 --restart unless-stopped aldente-website
```

The container serves plain HTTP on port 8080 with the same nginx rules. Put it behind the server's HTTPS proxy, and redirect `www` and `http://` to `https://aldenteai.com` there.

## The game (Order Up: Night Shift)

The site ships the game: `/play` in English, `/play/ru` in Russian. A deploy of the site is all it needs.

- A browser that asks for Russian before English is sent from `/play` to `/play/ru` (`public/play/lang.js`). `/play?lang=en` keeps English, `/play?lang=ru` asks for Russian.
- The game's source is its own repo, `erjan-A/order-up-night-shift`. After a change there, build it (`./build.sh`) and bring it in:

  ```sh
  npm run game:sync -- ../order-up-night-shift/play
  npm run verify
  ```

  `tools/game/sync.mjs` rewrites the two pages for this site's Content-Security-Policy (scripts in files, fonts served from `/play/fonts`) and copies the art and the sound. Do not copy the game repo's `play/` folder to the server by hand: its pages use inline scripts, which the policy refuses.
- Game visits and events count in the site's Umami site (`public/play/track.js`), on the production hosts only.
- A popup announces the game on every page but `/demo`, once per visit, until the end of 22 November 2026 (US west coast). It stops by itself. The dates and the text are in `src/data/promo.ts`; set `PROMO` to `null` afterwards.

## Check

```sh
sh deploy/smoke-test.sh https://aldenteai.com   # or http://localhost:8080 for the container
```

It checks every page, redirect, the 404, security headers, caching and compression, and exits non-zero on any failure. Then open `/demo` and confirm the Calendly calendar loads.

## Good to know

- **Video:** Safari and iPhones play a video only from byte ranges. The host must answer a `Range` request for `/media/*.mp4` with `206`, uncompressed and with `Content-Length` (nginx does this by default; a CDN that compresses `.mp4` does not). The smoke test checks it. Where a host answers `200`, the page turns on `public/clip-sw.js`, which serves the ranges itself; keep that file at the site root.
- **DNS:** A/AAAA records for `aldenteai.com` and `www.aldenteai.com` point to the server.
- **Updates:** rebuild and upload `dist/` again (or rebuild the image). If a file in `deploy/nginx/` changed in the release (new redirects, a new host in the CSP), copy the snippets again and reload nginx, as in the first install; then run the smoke test. Pages revalidate on every visit; hashed files in `/_astro/` are cached for a year.
- **Security headers** live in `deploy/nginx/snippets/aldente-headers.conf`. The CSP allows scripts from Umami, RB2B, LinkedIn and Cloudflare, frames from Calendly, requests and images to any https host, and pictures a page draws itself (the game's share card); after changing it, run `npm run verify`.
- **HSTS** is off. Turn it on once HTTPS works for both hostnames (instructions in `aldenteai.com.conf`).
