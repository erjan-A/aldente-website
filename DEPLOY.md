# Deploying aldenteai.com

The site is static: `npm run build` produces `dist/` (HTML, CSS, a little JS, images, sitemap). The server only has to serve those files with the rules in `deploy/nginx/`. There is no database, no server-side code and no secret.

Two ways to run it; pick one.

## Option A: nginx on the server

1. **Build** (on a build machine or CI with Node 22.12+):

   ```sh
   npm ci
   npm run verify   # optional but recommended: type check, tests, build, browser tests
   npm run build    # → dist/
   ```

2. **Upload** the contents of `dist/` to `/var/www/aldenteai.com/dist/` (for example `rsync -a --delete dist/ server:/var/www/aldenteai.com/dist/`).

3. **Configure nginx** (1.25.1+; on older versions see the comment at the top of `aldenteai.com.conf`):

   ```sh
   sudo cp deploy/nginx/snippets/aldente-*.conf /etc/nginx/snippets/
   sudo cp deploy/nginx/aldenteai.com.conf /etc/nginx/sites-available/aldenteai.com
   sudo ln -s /etc/nginx/sites-available/aldenteai.com /etc/nginx/sites-enabled/aldenteai.com
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. **TLS:** the config expects Let's Encrypt certificates at `/etc/letsencrypt/live/aldenteai.com/` covering `aldenteai.com` and `www.aldenteai.com` (for example `sudo certbot certonly --webroot -w /var/www/letsencrypt -d aldenteai.com -d www.aldenteai.com`). Change the two `ssl_certificate` lines if you use another CA. Until the certificate exists, comment out the two `listen 443` server blocks so nginx can start and certbot can complete its challenge over HTTP.

## Option B: Docker

```sh
docker build -t aldente-website .
docker run -d --name aldente-website -p 8080:80 --restart unless-stopped aldente-website
sh deploy/smoke-test.sh http://localhost:8080
```

The image builds the site and serves it with the same nginx rules on plain HTTP. Put it behind the server's HTTPS reverse proxy. The proxy terminates TLS for `aldenteai.com` and redirects `www.aldenteai.com` and `http://` to `https://aldenteai.com`, as `deploy/nginx/aldenteai.com.conf` does.

## What the server config does

- **Clean addresses:** `/aldo` serves `aldo.html`; `/aldo.html`, `/aldo/` and `/index.html` redirect (301) to the clean form; `/about` and `/careers` (old site) redirect to `/company`.
- **Canonical host:** `http://` and `www.` redirect to `https://aldenteai.com`. Canonical tags, the sitemap and `robots.txt` all use that address.
- **404:** unknown addresses return status 404 with the site's own page.
- **Caching:** `/_astro/*` (fingerprinted files) is cached for a year; pages and `public/` files are revalidated on every visit, so a deploy shows at once.
- **Compression:** gzip for HTML, CSS, JS, SVG, XML and JSON.
- **Security headers** on every response: Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy. The CSP allows only the site itself, Plausible (`https://plausible.io`) and Calendly's frame (`https://calendly.com`). The browser tests run every page under this exact header file, so if you change the CSP, run `npm run verify`.
- **HSTS** is off. Turn it on once HTTPS works for both hostnames (see the comment in `aldenteai.com.conf`).

## After deploying: check from outside

```sh
sh deploy/smoke-test.sh https://aldenteai.com
```

It checks every page, the clean-URL and old-address redirects, the 404, security headers, caching, compression, and the `www` and `http` redirects. It needs only `curl` and exits non-zero on any failure.

Then, by hand:

1. Open `/demo`: the Calendly calendar should load inside the page. Book and cancel a test slot.
2. Open the site in a private window: the cookie banner appears; "Reject all" and "Accept all" both close it.
3. Share `https://aldenteai.com` in Slack or LinkedIn: the preview shows the title and `og.jpg`.
4. Submit `https://aldenteai.com/sitemap-index.xml` in Google Search Console.

## Before launch (owner's checklist)

- **Plausible:** create a site for `aldenteai.com` in Plausible and add the goals "CTA click", "Demo view", "Time selected", "Demo booked" with the custom properties `label`, `section`, `path`, `plan`. Until the site exists in Plausible, events are discarded; nothing else breaks.
- **Calendly:** add the qualifying questions (role, number of locations, POS, products of interest) in the event's settings.
- **Legal:** have counsel review `/privacy` and `/terms` and add the company's legal entity details.
- **DNS:** `aldenteai.com` and `www.aldenteai.com` point to the server (A/AAAA records). Lower the TTL a day before switching from the old site.

## Updating the site later

Change the code, run `npm run verify`, build, and upload `dist/` again (or rebuild the Docker image). Fingerprinted assets get new names, so old cached files never mix with new pages.
