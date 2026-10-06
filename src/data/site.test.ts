import { describe, expect, it } from 'vitest';
import { PRODUCT_IDS, PRODUCTS } from './products';
import { FOOTER, LINKS, NAV_GROUPS, isNavMenu, type NavMenu } from './site';
import { SOLUTIONS } from './solutions';

const menu = (label: string) => NAV_GROUPS.find((g): g is NavMenu => isNavMenu(g) && g.label === label)!;

describe('NAV_GROUPS', () => {
  it('orders the header as Product, Solutions, Security, Pricing, Company', () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Product', 'Solutions', 'Security', 'Pricing', 'Company']);
    expect(NAV_GROUPS.map(isNavMenu)).toEqual([true, true, false, false, false]);
  });

  it('links the three products by their exact names and carries the product id', () => {
    const items = menu('Product').items;
    expect(items.map((i) => i.product)).toEqual([...PRODUCT_IDS]);
    expect(items.map((i) => i.label)).toEqual(['Aldo', 'Aldente Verify', 'Aldente Vision']);
    expect(items.map((i) => i.href)).toEqual(['/aldo', '/order-verification', '/analytics']);
    expect(items.map((i) => i.note)).toEqual(PRODUCT_IDS.map((id) => PRODUCTS[id].note));
    expect(items.find((i) => i.product === 'aldo')?.icon).toBeUndefined();
  });

  it('links every solution page with a note and an icon', () => {
    const items = menu('Solutions').items;
    expect(items.map((i) => i.href)).toEqual(SOLUTIONS.map((s) => `/solutions/${s.slug}`));
    expect(items.map((i) => i.label)).toEqual(['Operations', 'HR', 'Delivery']);
    for (const item of items) {
      expect(item.note).toBeTruthy();
      expect(item.icon).toBeTruthy();
    }
  });

  it('points direct links at their pages', () => {
    const direct = NAV_GROUPS.filter((g) => !isNavMenu(g));
    expect(direct.map((g) => ('href' in g ? g.href : null))).toEqual(['/security', '/pricing', '/company']);
  });
});

describe('LINKS', () => {
  it('lists every destination once; the retired "Get Aldo" link is gone', () => {
    expect(LINKS).toMatchObject({
      seeAldo: '/aldo#aldo',
      security: '/security',
      company: '/company',
      privacy: '/privacy',
      terms: '/terms',
    });
    expect(LINKS).not.toHaveProperty('getAldo');
  });
});

describe('FOOTER', () => {
  it('links the products and solutions by their exact names', () => {
    expect(FOOTER[0]!.links.map((l) => l.label)).toEqual(['Aldo', 'Aldente Verify', 'Aldente Vision', 'Pricing']);
    expect(FOOTER[0]!.links.map((l) => l.href)).toEqual(['/aldo', '/order-verification', '/analytics', '/pricing']);
    expect(FOOTER[1]!.links).toEqual([
      { label: 'Operations', href: '/solutions/operations' },
      { label: 'HR', href: '/solutions/hr' },
      { label: 'Delivery', href: '/solutions/delivery' },
    ]);
    expect(FOOTER[2]!.links.map((l) => l.href)).toEqual(['/company', '/security', '/demo']);
  });

  it('ends with a Legal column for privacy, terms and cookies', () => {
    expect(FOOTER.map((c) => c.title)).toEqual(['Product', 'Solutions', 'Company', 'Legal']);
    expect(FOOTER.at(-1)!.links).toEqual([
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of use', href: '/terms' },
      { label: 'Cookie policy', href: '/cookies' },
    ]);
  });
});
