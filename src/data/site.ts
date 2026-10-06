import type { IconName } from '../components/ui/Icon.astro';
import { PRODUCT_IDS, PRODUCTS, type ProductId } from './products';
import { SOLUTIONS } from './solutions';

export const SITE = {
  name: 'Aldente AI',
  url: 'https://aldenteai.com',
  tagline: 'Your AI Chief of Staff with eyes.',
  description:
    'Aldo sees every restaurant through your cameras, catches order errors before they leave, and runs the daily checks your team gives it, right in Slack.',
  email: 'support@aldenteai.com',
  /** Shown as written; dialled from `phoneHref` (E.164). */
  phone: '+1 (818) 974-1857',
  phoneHref: 'tel:+18189741857',
  linkedin: 'https://www.linkedin.com/company/101904373/',
  calendly: 'https://calendly.com/aldenteai/30min',
} as const;

export const LINKS = {
  demo: '/demo',
  cookies: '/cookies',
  pricing: '/pricing',
  /** "See Aldo in action": the Aldo page's live Slack demo (the section with id="aldo"). */
  seeAldo: '/aldo#aldo',
  security: '/security',
  company: '/company',
  privacy: '/privacy',
  terms: '/terms',
} as const;

/**
 * Orders-verified figure. The site shows `label` until PUBLIC_STATS_ENDPOINT is set;
 * then a live counter rebases on the endpoint's total and ticks at `perDay`
 * (200 locations at about 200 checked orders a day each). 2M+ is the company's figure
 * for the website, 2026-10-05.
 */
export const COUNTER = {
  label: '2M+',
  base: 2_000_000,
  baseTime: '2026-10-05T00:00:00Z',
  perDay: 40_000,
  endpoint: import.meta.env.PUBLIC_STATS_ENDPOINT ?? '',
} as const;

export interface NavItem {
  label: string;
  href: string;
}

/** A link in the header menus. */
export interface NavLink extends NavItem {
  /** One line under the label in a dropdown or the mobile menu. */
  note?: string;
  /** Icon beside the label (solutions). */
  icon?: IconName;
  /** The product this link opens, so the header can show its pill, icon or Aldo's avatar. */
  product?: ProductId;
}

/** A header dropdown: a label that opens a list of links. */
export interface NavMenu {
  label: string;
  items: NavLink[];
}

/** A top-level header entry: a direct link or a dropdown. */
export type NavGroup = NavLink | NavMenu;

/** True when a header entry is a dropdown. */
export const isNavMenu = (group: NavGroup): group is NavMenu => 'items' in group;

const productLink = (product: ProductId): NavLink => {
  const { name, href, note, icon } = PRODUCTS[product];
  return { label: name, href, note, product, ...(icon ? { icon } : {}) };
};

/** Menu notes and icons for the solution pages, restating each page's description in src/data/solutions.ts. */
const SOLUTION_NAV: Record<string, { note: string; icon: IconName }> = {
  operations: { note: 'Queues, staffing gaps and weekly patterns', icon: 'gauge' },
  hr: { note: 'Departure clips and missing clock-outs', icon: 'user-check' },
  delivery: { note: 'Checked bags and refund disputes', icon: 'truck' },
};

/**
 * The header: Product · Solutions · Security · Pricing · Company. The mobile menu uses the same groups.
 * Product links carry their ProductId; solution links carry an icon. Every entry has a note or is a direct link.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Product',
    items: PRODUCT_IDS.map(productLink),
  },
  {
    label: 'Solutions',
    items: SOLUTIONS.map((solution) => ({
      label: solution.name,
      href: `/solutions/${solution.slug}`,
      ...SOLUTION_NAV[solution.slug],
    })),
  },
  { label: 'Security', href: LINKS.security },
  { label: 'Pricing', href: LINKS.pricing },
  { label: 'Company', href: LINKS.company },
];

export const FOOTER: { title: string; links: NavItem[] }[] = [
  {
    title: 'Product',
    links: [...PRODUCT_IDS.map((id) => ({ label: PRODUCTS[id].name, href: PRODUCTS[id].href })), { label: 'Pricing', href: LINKS.pricing }],
  },
  {
    title: 'Solutions',
    links: SOLUTIONS.map((solution) => ({ label: solution.name, href: `/solutions/${solution.slug}` })),
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: LINKS.company },
      { label: 'Security', href: LINKS.security },
      { label: 'Book a demo', href: LINKS.demo },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: LINKS.privacy },
      { label: 'Terms of use', href: LINKS.terms },
      { label: 'Cookie policy', href: LINKS.cookies },
    ],
  },
];
