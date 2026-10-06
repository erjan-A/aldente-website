import type { IconName } from '../components/ui/Icon.astro';

export type ProductId = 'aldo' | 'verify' | 'vision';

export interface Product {
  /** Exact product name: "Aldo", "Aldente Verify", "Aldente Vision". */
  name: string;
  /** What it is, in two or three words. */
  does: string;
  /** One line for menus and product choosers. */
  note: string;
  href: string;
  /** Lucide icon; Aldo has none and shows its Slack avatar instead. */
  icon?: IconName;
}

/** The three products. Names come from here, so nav, pills, pricing and copy stay in step. */
export const PRODUCTS: Record<ProductId, Product> = {
  aldo: { name: 'Aldo', does: 'AI Chief of Staff', note: 'AI Chief of Staff in Slack', href: '/aldo' },
  verify: {
    name: 'Aldente Verify',
    does: 'Order verification',
    note: 'Order checks at the packing station',
    href: '/order-verification',
    icon: 'check-check',
  },
  vision: {
    name: 'Aldente Vision',
    does: 'Camera AI',
    note: 'Events, triggers and analytics from your cameras',
    href: '/analytics',
    icon: 'eye',
  },
};

/** Display order wherever all three appear. */
export const PRODUCT_IDS: readonly ProductId[] = ['aldo', 'verify', 'vision'];
