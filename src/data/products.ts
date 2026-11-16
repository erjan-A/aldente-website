import type { IconName } from '../components/ui/Icon.astro';

export type ProductId = 'verify' | 'dispute' | 'tab' | 'playbooks';

export interface Product {
  /** Exact product name: "Aldente Verify", "Aldente Dispute", "Aldente Tab", "Aldente Playbooks". */
  name: string;
  /** The short name for tight places (the home page's contents list). */
  short: string;
  /** What it is, in two or three words. */
  does: string;
  /** One line for menus and product choosers. */
  note: string;
  href: string;
  /** Lucide icon. */
  icon: IconName;
}

/**
 * The four products. Names come from here, so nav, pills, pricing and copy stay in step.
 * Aldente Playbooks is the former Aldo and Aldente Vision as one product: the cameras a restaurant already has,
 * read by vision AI, with answers, alerts and recurring checks in Slack. "Aldo" stays as the name of the
 * assistant that answers there; it is no longer a product.
 */
export const PRODUCTS: Record<ProductId, Product> = {
  verify: {
    name: 'Aldente Verify',
    short: 'Verify',
    does: 'Order check',
    note: 'Every order checked at the packing station',
    href: '/order-verification',
    icon: 'check-check',
  },
  dispute: {
    name: 'Aldente Dispute',
    short: 'Dispute',
    does: 'Refund evidence',
    note: 'An evidence pack for every refund claim',
    href: '/order-verification#dispute',
    icon: 'shield-check',
  },
  tab: {
    name: 'Aldente Tab',
    short: 'Tab',
    does: 'Line ring-up',
    note: 'Orders rung up while staff build them',
    href: '/tab',
    icon: 'list-plus',
  },
  playbooks: {
    name: 'Aldente Playbooks',
    short: 'Playbooks',
    does: 'Checks in Slack',
    note: 'Ask in Slack; your cameras answer, every shift',
    href: '/playbooks',
    icon: 'repeat',
  },
};

/** Display order wherever all four appear: the three at the counter, then the one in Slack. */
export const PRODUCT_IDS: readonly ProductId[] = ['verify', 'dispute', 'tab', 'playbooks'];
