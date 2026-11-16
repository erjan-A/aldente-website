import { describe, expect, it } from 'vitest';
import { PRODUCT_IDS, PRODUCTS } from './products';
import { ANNOUNCEMENT, FOOTER, LINKS, NAV_GROUPS, isNavMenu, type NavMenu } from './site';

const menu = (label: string) => NAV_GROUPS.find((g): g is NavMenu => isNavMenu(g) && g.label === label)!;

describe('NAV_GROUPS', () => {
  it('orders the header as Products, Solutions, About us, Pricing', () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Products', 'Solutions', 'About us', 'Pricing']);
    expect(NAV_GROUPS.map(isNavMenu)).toEqual([true, true, false, false]);
  });

  it('opens the three solution pages from the Solutions menu, each with an icon and a line', () => {
    const items = menu('Solutions').items;
    expect(items.map((i) => [i.label, i.href])).toEqual([
      ['Operations', '/solutions/operations'],
      ['HR', '/solutions/hr'],
      ['Delivery', '/solutions/delivery'],
    ]);
    expect(items.every((i) => i.icon && i.note)).toBe(true);
    // Security left the header; the footer still links it.
    expect(JSON.stringify(NAV_GROUPS)).not.toContain('/security');
    expect(FOOTER.flatMap((col) => col.links).map((l) => l.href)).toContain('/security');
  });

  it('links the four products by their exact names and carries the product id', () => {
    const items = menu('Products').items;
    expect(items.map((i) => i.product)).toEqual([...PRODUCT_IDS]);
    expect(items.map((i) => i.label)).toEqual(['Aldente Verify', 'Aldente Dispute', 'Aldente Tab', 'Aldente Playbooks']);
    expect(items.map((i) => i.href)).toEqual(['/order-verification', '/order-verification#dispute', '/tab', '/playbooks']);
    expect(items.map((i) => i.note)).toEqual(PRODUCT_IDS.map((id) => PRODUCTS[id].note));
    for (const id of PRODUCT_IDS) expect(PRODUCTS[id].icon, id).toBeTruthy();
  });

  it('has four products: Aldo and Aldente Vision are one, Aldente Playbooks', () => {
    expect([...PRODUCT_IDS]).toEqual(['verify', 'dispute', 'tab', 'playbooks']);
    expect(PRODUCT_IDS.map((id) => `${PRODUCTS[id].short}: ${PRODUCTS[id].does}`)).toEqual([
      'Verify: Order check',
      'Dispute: Refund evidence',
      'Tab: Line ring-up',
      'Playbooks: Checks in Slack',
    ]);
  });

  it('points direct links at their pages', () => {
    const direct = NAV_GROUPS.filter((g) => !isNavMenu(g));
    expect(direct.map((g) => ('href' in g ? g.href : null))).toEqual(['/company', '/pricing']);
  });
});

describe('LINKS', () => {
  it('lists every destination once; the retired "Get Aldo" link is gone', () => {
    expect(LINKS).toMatchObject({
      seeAldo: '/playbooks#aldo',
      security: '/security',
      company: '/company',
      privacy: '/privacy',
      terms: '/terms',
    });
    expect(LINKS).not.toHaveProperty('getAldo');
  });
});

describe('ANNOUNCEMENT', () => {
  it('says the new product, Aldente Tab, is out, and leads to its page', () => {
    expect(ANNOUNCEMENT).toEqual({
      text: 'Our new product, Aldente Tab, is out. It added 8% more orders in the peak hour.',
      cta: 'Learn more',
      href: '/tab',
    });
  });
});

describe('FOOTER', () => {
  it('links the products and solutions by their exact names', () => {
    expect(FOOTER[0]!.links.map((l) => l.label)).toEqual(['Aldente Verify', 'Aldente Dispute', 'Aldente Tab', 'Aldente Playbooks']);
    expect(FOOTER[0]!.links.map((l) => l.href)).toEqual(['/order-verification', '/order-verification#dispute', '/tab', '/playbooks']);
    expect(FOOTER[1]!.links).toEqual([
      { label: 'Operations', href: '/solutions/operations' },
      { label: 'HR', href: '/solutions/hr' },
      { label: 'Delivery', href: '/solutions/delivery' },
    ]);
    // Pricing sits with the company links.
    expect(FOOTER[2]!.links.map((l) => [l.label, l.href])).toEqual([
      ['About us', '/company'],
      ['Pricing', '/pricing'],
      ['Security', '/security'],
      ['Book a live demo', '/demo'],
    ]);
  });

  it('ends with a Legal column for privacy, terms and cookies', () => {
    expect(FOOTER.map((c) => c.title)).toEqual(['Products', 'Solutions', 'Company', 'Legal']);
    expect(FOOTER.at(-1)!.links).toEqual([
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of use', href: '/terms' },
      { label: 'Cookie policy', href: '/cookies' },
    ]);
  });
});
