import type { IconName } from '../components/ui/Icon.astro';
import { PRODUCT_IDS, PRODUCTS, type ProductId } from './products';
import { SOLUTIONS } from './solutions';

export const SITE = {
  name: 'Aldente AI',
  url: 'https://aldenteai.com',
  tagline: 'Vision AI for every order.',
  description:
    'Aldente is vision AI for restaurant chains: every order checked before pickup, every refund claim answered with proof, and orders rung up while staff build them.',
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
  /** "See Aldo in action": the Playbooks page's live Slack demo (the section with id="aldo"). */
  seeAldo: '/playbooks#aldo',
  security: '/security',
  company: '/company',
  privacy: '/privacy',
  terms: '/terms',
} as const;

/** The line above the header on every page (AnnounceBar). One message at a time; set to null to remove the bar. */
/** The same sentence on every screen; below 768px it runs past as a news line. */
export const ANNOUNCEMENT: { text: string; cta: string; href: string } | null = {
  text: 'Our new product, Aldente Tab, is out. It added 8% more orders in the peak hour.',
  cta: 'Learn more',
  href: '/tab',
};

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

/** Each solution page in the header menu: its icon and one line on what the team gets. */
const SOLUTION_NAV: Record<string, { icon: IconName; note: string }> = {
  operations: { icon: 'gauge', note: 'Queues, empty stations and weekly patterns' },
  hr: { icon: 'user-check', note: 'Missing clock-outs closed the same day' },
  delivery: { icon: 'truck', note: 'Every bag verified, every claim with evidence' },
};

/**
 * The header: Products · Solutions · About us · Pricing (order set 2026-11-16). The mobile menu uses the same
 * groups. Product links carry their ProductId. Security is linked from the footer.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Products',
    items: PRODUCT_IDS.map(productLink),
  },
  {
    label: 'Solutions',
    items: SOLUTIONS.map((solution) => ({ label: solution.name, href: `/solutions/${solution.slug}`, ...SOLUTION_NAV[solution.slug] })),
  },
  { label: 'About us', href: LINKS.company },
  { label: 'Pricing', href: LINKS.pricing },
];

export const FOOTER: { title: string; links: (NavItem & { icon?: IconName })[] }[] = [
  {
    title: 'Products',
    links: [
      ...PRODUCT_IDS.map((id) => ({ label: PRODUCTS[id].name, href: PRODUCTS[id].href, icon: PRODUCTS[id].icon })),
    ],
  },
  {
    title: 'Solutions',
    links: SOLUTIONS.map((solution) => ({ label: solution.name, href: `/solutions/${solution.slug}` })),
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: LINKS.company },
      { label: 'Pricing', href: LINKS.pricing },
      { label: 'Security', href: LINKS.security },
      { label: 'Book a live demo', href: LINKS.demo },
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

/**
 * The home page's questions: what a buyer asks before booking, answered with what the product pages, the
 * pricing page and the Security page already state.
 */
export const HOME_FAQ: { q: string; a: string }[] = [
  {
    q: 'What do we need to install?',
    a: 'A camera on a stand at the packing station. It runs on Wi-Fi, and the hardware comes with the plan.',
  },
  {
    q: 'Does it work with our POS and delivery apps?',
    a: 'Yes. Aldente works with any POS system. Aldente Verify reads the ticket from the receipt under the camera or straight from your POS, and Aldente Dispute keeps every delivery-app claim in one list.',
  },
  {
    q: 'Do staff have to change how they pack?',
    a: 'No. Staff put the receipt under the camera and pack as they do today. Aldente shows what is missing before the bag is closed.',
  },
  {
    q: 'How long until a location is live?',
    a: 'Most locations are live within 2–3 weeks: install and connect in week one, go live in weeks two and three.',
  },
  { q: 'Can we start with one location?', a: 'Yes. Many chains start with one or two locations and roll out after the first results.' },
  {
    q: 'What happens to our footage?',
    a: 'Footage and records stay in your account and are used to run your workspace. Access follows roles, locations and regions, and you set how long footage is kept, per location.',
  },
];

