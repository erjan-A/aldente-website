import { describe, expect, it } from 'vitest';
import { activeEntry, isCurrentPage, isWithin, linkPath, pagePath } from './paths';

describe('pagePath', () => {
  it('gives the clean address for built .html pages', () => {
    expect(pagePath('/aldo.html')).toBe('/aldo');
    expect(pagePath('/solutions/hr.html')).toBe('/solutions/hr');
    expect(pagePath('/index.html')).toBe('/');
  });

  it('leaves clean addresses as they are', () => {
    expect(pagePath('/aldo')).toBe('/aldo');
    expect(pagePath('/aldo/')).toBe('/aldo');
    expect(pagePath('/')).toBe('/');
  });
});

describe('linkPath', () => {
  it('drops the query and the hash of an internal link', () => {
    expect(linkPath('/aldo#aldo')).toBe('/aldo');
    expect(linkPath('/demo?plan=starter')).toBe('/demo');
    expect(linkPath('/solutions/hr.html')).toBe('/solutions/hr');
  });

  it('gives no path for links that leave the page tree', () => {
    expect(linkPath('#schedule')).toBe('');
    expect(linkPath('https://aldenteai.com/aldo')).toBe('');
    expect(linkPath('mailto:support@aldenteai.com')).toBe('');
  });
});

describe('isCurrentPage', () => {
  it('matches the same page whatever the build or the link adds', () => {
    expect(isCurrentPage('/pricing.html', '/pricing')).toBe(true);
    expect(isCurrentPage('/aldo', '/aldo#aldo')).toBe(true);
    expect(isCurrentPage('/', '/')).toBe(true);
  });

  it('does not match a different page or a parent', () => {
    expect(isCurrentPage('/solutions/hr', '/solutions/delivery')).toBe(false);
    expect(isCurrentPage('/solutions/hr', '/solutions')).toBe(false);
    expect(isCurrentPage('/aldo', '#schedule')).toBe(false);
  });
});

describe('isWithin', () => {
  it('holds the page itself and the pages under it', () => {
    expect(isWithin('/company', '/company')).toBe(true);
    expect(isWithin('/company/team.html', '/company')).toBe(true);
  });

  it('does not treat a shared prefix or the home page as a parent', () => {
    expect(isWithin('/companyx', '/company')).toBe(false);
    expect(isWithin('/pricing', '/')).toBe(false);
    expect(isWithin('/', '/')).toBe(true);
  });
});

describe('activeEntry', () => {
  // Product · Solutions · Security · Pricing · Company, as the header lists them.
  const entries = [
    ['/aldo', '/order-verification', '/analytics'],
    ['/solutions/operations', '/solutions/hr', '/solutions/delivery'],
    ['/security'],
    ['/pricing'],
    ['/company'],
  ];

  it('marks the group that holds a child page', () => {
    expect(activeEntry('/order-verification', entries)).toBe(0);
    expect(activeEntry('/solutions/hr.html', entries)).toBe(1);
  });

  it('marks a direct link on its own page', () => {
    expect(activeEntry('/pricing', entries)).toBe(3);
    expect(activeEntry('/company/', entries)).toBe(4);
  });

  it('marks nothing on pages outside the header', () => {
    expect(activeEntry('/', entries)).toBe(-1);
    expect(activeEntry('/demo', entries)).toBe(-1);
    expect(activeEntry('/cookies', entries)).toBe(-1);
  });
});
