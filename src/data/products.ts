import type { IconName } from '../components/ui/Icon.astro';

export type ProductId = 'aldo' | 'verify' | 'dispute' | 'vision';

export interface Product {
  /** Exact product name: "Aldo", "Aldente Verify", "Aldente Dispute", "Aldente Vision". */
  name: string;
  /** What it is, in two or three words. */
  does: string;
  /** One line for menus and product choosers. */
  note: string;
  href: string;
  /** Lucide icon; Aldo has none and shows its Slack avatar instead. */
  icon?: IconName;
}

/** The four products. Names come from here, so nav, pills, pricing and copy stay in step. */
export const PRODUCTS: Record<ProductId, Product> = {
  aldo: { name: 'Aldo', does: 'AI Chief of Staff', note: 'AI Chief of Staff in Slack', href: '/aldo' },
  verify: {
    name: 'Aldente Verify',
    does: 'Order verification',
    note: 'Order checks at the packing station',
    href: '/order-verification',
    icon: 'check-check',
  },
  dispute: {
    name: 'Aldente Dispute',
    does: 'Refund disputes',
    note: 'Refund claims answered with video proof',
    href: '/order-verification#dispute',
    icon: 'shield-check',
  },
  vision: {
    name: 'Aldente Vision',
    does: 'Camera AI',
    note: 'Events, triggers and analytics from your cameras',
    href: '/analytics',
    icon: 'eye',
  },
};

/** Display order wherever all four appear. */
export const PRODUCT_IDS: readonly ProductId[] = ['aldo', 'verify', 'dispute', 'vision'];
