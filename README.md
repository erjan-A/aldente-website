# aldenteai.com

The Aldente AI website. A static [Astro](https://astro.build) build: plain HTML, CSS, JS and images in `dist/`. No database, no server code, no secrets.

## Build

Node 22.12+ (`.nvmrc`).

```sh
npm ci
npm run verify   # optional: type check, tests, build, browser tests (first run: npx playwright install chromium)
npm run build    # → dist/
```

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

## Check

```sh
sh deploy/smoke-test.sh https://aldenteai.com   # or http://localhost:8080 for the container
```

It checks every page, redirect, the 404, security headers, caching and compression, and exits non-zero on any failure. Then open `/demo` and confirm the Calendly calendar loads.

## Good to know

- **DNS:** A/AAAA records for `aldenteai.com` and `www.aldenteai.com` point to the server.
- **Updates:** rebuild and upload `dist/` again (or rebuild the image). Pages revalidate on every visit; hashed files in `/_astro/` are cached for a year.
- **Security headers** live in `deploy/nginx/snippets/aldente-headers.conf`. The CSP allows only Plausible and Calendly; after changing it, run `npm run verify`.
- **HSTS** is off. Turn it on once HTTPS works for both hostnames (instructions in `aldenteai.com.conf`).
