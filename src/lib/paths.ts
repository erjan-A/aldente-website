/** The clean address of a page, e.g. "/aldo" for the built "/aldo.html" and "/" for "/index.html". */
export function pagePath(pathname: string): string {
  const path = pathname
    .replace(/(^|\/)index\.html$/, '$1')
    .replace(/\.html$/, '')
    .replace(/\/+$/, '');
  return path || '/';
}

/**
 * The clean address an internal link opens: "/aldo#aldo" -> "/aldo", "/demo?plan=starter" -> "/demo".
 * Links that are not root-relative (a hash on the same page, another site, mailto) give "".
 */
export function linkPath(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return '';
  return pagePath(href.replace(/[?#].*$/, ''));
}

/** True when `href` opens the page at `pathname`. */
export function isCurrentPage(pathname: string, href: string): boolean {
  return linkPath(href) === pagePath(pathname);
}

/** True when the page at `pathname` is `href` or sits under it ("/company/team" under "/company"). Home has no children. */
export function isWithin(pathname: string, href: string): boolean {
  const page = pagePath(pathname);
  const link = linkPath(href);
  if (!link) return false;
  return page === link || (link !== '/' && page.startsWith(`${link}/`));
}

/**
 * Which top-level navigation entry holds the page: the index of the first entry with a link to it
 * (or to a page above it), or -1. Each entry lists its links: one for a direct link, several for a menu.
 */
export function activeEntry(pathname: string, entries: readonly (readonly string[])[]): number {
  return entries.findIndex((hrefs) => hrefs.some((href) => isWithin(pathname, href)));
}
