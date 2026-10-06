/** What the visitor came to the demo page for, from its query string (?plan=…). */
export interface DemoIntent {
  /** A known plan, or '' for the general demo. */
  plan: string;
  /** The full heading. */
  title: string;
  /** The end of the heading, drawn in the quieter ink like every page hero ("See Aldo" + "on your restaurants."). */
  muted: string;
  lead: string;
}

const DEFAULT: Omit<DemoIntent, 'plan'> = {
  title: 'See Aldo on your restaurants.',
  muted: 'on your restaurants.',
  lead: '30 minutes. We’ll show the workflows that matter to your team and estimate the result for your locations.',
};

/** Every plan the demo page knows (?plan=…). A plain list, so analytics can check plans without the copy. */
export const DEMO_PLANS = ['starter', 'vision', 'verification', 'enterprise'] as const;
export type DemoPlan = (typeof DEMO_PLANS)[number];

export const isDemoPlan = (plan: string | null | undefined): plan is DemoPlan => (DEMO_PLANS as readonly string[]).includes(plan ?? '');

const COPY: Record<DemoPlan, Omit<DemoIntent, 'plan'>> = {
  starter: {
    title: 'Get Aldo with Aldente Verify or Vision.',
    muted: 'with Aldente Verify or Vision.',
    lead: 'Aldo comes with both products. Pick a time and we’ll show you Aldo in Slack with questions like yours.',
  },
  vision: {
    title: 'See Aldente Vision on your cameras.',
    muted: 'on your cameras.',
    lead: '30 minutes on what Aldente Vision reads from the cameras you already have, with Aldo answering in Slack.',
  },
  verification: {
    title: 'See Aldente Verify on your menu.',
    muted: 'on your menu.',
    lead: '30 minutes on how Aldente Verify works at the packing station: the order check, the saved evidence and a refund dispute.',
  },
  enterprise: {
    title: 'Talk to us about your chain.',
    muted: 'about your chain.',
    lead: 'Volume plans, custom integrations, SSO and a dedicated team for groups with 50+ locations.',
  },
};

/** Keeps "Aldente Verify" and "Aldente Vision" on one line in headings (a no-break space inside the name). */
export const keepNames = (text: string): string => text.replace(/Aldente (Verify|Vision)/g, 'Aldente\u00a0$1');

/** The heading in two parts: the claim in full ink, then the muted ending. */
export function titleParts({ title, muted }: Pick<DemoIntent, 'title' | 'muted'>): { claim: string; muted: string } {
  if (!muted || !title.endsWith(muted)) return { claim: title, muted: '' };
  return { claim: title.slice(0, -muted.length).trimEnd(), muted };
}

export function demoIntent(search: string): DemoIntent {
  const plan = new URLSearchParams(search).get('plan');
  if (!isDemoPlan(plan)) return { plan: '', ...DEFAULT };
  return { plan, ...COPY[plan] };
}
