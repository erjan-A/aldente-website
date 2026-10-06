import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANALYTICS } from '../../src/data/analytics';
import { SITE } from '../../src/data/site';
import { securityHeaders } from '../../deploy/headers';

// Server configuration in deploy/: nginx snippets shared by the host config and the Docker image.
const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

const site = read('deploy/nginx/snippets/aldente-site.conf');
const host = read('deploy/nginx/aldenteai.com.conf');
const docker = read('deploy/nginx/docker.conf');
const dockerfile = read('Dockerfile');
const headers = securityHeaders();

describe('server configuration', () => {
  it('sends the security headers the site needs, from one file', () => {
    expect(Object.keys(headers).sort()).toEqual(
      ['Content-Security-Policy', 'Permissions-Policy', 'Referrer-Policy', 'X-Content-Type-Options', 'X-Frame-Options'].sort(),
    );
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('lets the CSP load what the site uses: Plausible and Calendly’s scheduler, nothing else', () => {
    const csp = Object.fromEntries(
      headers['Content-Security-Policy']!.split(';').map((d) => {
        const [name, ...values] = d.trim().split(/\s+/);
        return [name, values];
      }),
    );
    const plausible = new URL(ANALYTICS.script).origin;
    const calendly = new URL(SITE.calendly).origin;
    expect(csp['default-src']).toEqual(["'self'"]);
    expect(csp['script-src']).toEqual(["'self'", plausible]);
    expect(csp['connect-src']).toEqual(["'self'", plausible]);
    expect(csp['frame-src']).toEqual([calendly]);
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
  });

  it('re-sends the headers in every location that sets its own (nginx drops inherited add_header there)', () => {
    const blocks = [...site.matchAll(/location[^{]*\{([^}]*)\}/g)].map((m) => m[1]!);
    for (const block of blocks.filter((b) => b.includes('add_header'))) {
      expect(block).toContain('include snippets/aldente-headers.conf;');
    }
  });

  it('serves clean URLs the way Astro builds them (name.html, no trailing slash)', () => {
    expect(site).toContain('try_files $uri $uri.html $uri/ =404;');
    expect(site).toContain('rewrite ^/(.+)/$ /$1 permanent;');
    // Redirects test the requested address, so nginx's internal index.html lookup for / can't loop.
    expect(site).toMatch(/if \(\$request_uri ~ "\^\/index\\\.html/);
    expect(site).not.toMatch(/location = \/index\.html/);
    expect(site).toContain('error_page 404 /404.html;');
  });

  it('redirects the old addresses to the company page', () => {
    expect(site).toMatch(/location = \/about \{\s*return 301 \/company;/);
    expect(site).toMatch(/location = \/careers \{\s*return 301 \/company;/);
  });

  it('caches the hashed build assets for a year and revalidates pages', () => {
    expect(site).toMatch(/location \/_astro\/ \{[^}]*max-age=31536000, immutable/);
    expect(site).toMatch(/location \/ \{[^}]*Cache-Control "no-cache"/);
  });

  it('sends www and plain HTTP to https://aldenteai.com, the site’s canonical address', () => {
    expect(SITE.url).toBe('https://aldenteai.com');
    expect(host.match(/return 301 https:\/\/aldenteai\.com\$request_uri;/g)).toHaveLength(2);
    expect(host).toContain('server_name www.aldenteai.com;');
    expect(host).toContain('include snippets/aldente-site.conf;');
  });

  it('builds the Docker image from the same rules', () => {
    expect(docker).toContain('include snippets/aldente-site.conf;');
    expect(dockerfile).toContain('COPY deploy/nginx/snippets/ /etc/nginx/snippets/');
    expect(dockerfile).toContain('RUN npm ci');
  });
});
