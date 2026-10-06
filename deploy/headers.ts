import { readFileSync } from 'node:fs';

/**
 * The security headers in deploy/nginx/snippets/aldente-headers.conf, as { name: value }. Tests use it to
 * check the policy and to run every page under it in a real browser, so what ships is what was tested.
 */
export function securityHeaders(): Record<string, string> {
  const text = readFileSync(new URL('./nginx/snippets/aldente-headers.conf', import.meta.url), 'utf8');
  const headers: Record<string, string> = {};
  for (const match of text.matchAll(/^\s*add_header\s+([\w-]+)\s+"([^"]*)"\s+always;/gm)) {
    headers[match[1]!] = match[2]!;
  }
  return headers;
}
