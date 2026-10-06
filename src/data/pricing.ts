import { LINKS } from './site';

export interface Plan {
  id: 'vision' | 'verification' | 'enterprise';
  name: string;
  summary: string;
  cta: { label: string; href: string };
  features: string[];
  /** Aldo comes with the product. */
  aldo?: boolean;
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'vision',
    name: 'Aldente Vision',
    summary: 'For seeing what happens inside every location.',
    cta: { label: 'Book a demo', href: `${LINKS.demo}?plan=vision` },
    features: [
      'Works with the IP cameras you already have',
      'Traffic, occupancy, queues and tables by hour',
      'Staff presence and repeat visits',
      'Heatmaps and leaderboards across locations',
      'Rules that alert the right person',
    ],
    aldo: true,
  },
  {
    id: 'verification',
    name: 'Aldente Verify',
    summary: 'For delivery and drive-thru accuracy.',
    cta: { label: 'Book a demo', href: `${LINKS.demo}?plan=verification` },
    features: [
      'Verification tablet and camera included',
      'Item and quantity checks against your POS',
      'Photo and clip for every order',
      'Automatic delivery refund disputes',
      'Accuracy dashboard by location',
    ],
    aldo: true,
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    summary: 'For chains with 50+ locations.',
    cta: { label: 'Talk to us', href: `${LINKS.demo}?plan=enterprise` },
    features: [
      'Both products across every location',
      'Custom integrations and SSO',
      'SOC 2 Type II report and security review',
      'Dedicated success manager and SLA',
      'Rollout support across regions',
    ],
  },
];

/** What Aldo brings to either product. */
export const ALDO_INCLUDED = [
  'Questions in Slack, Telegram or WhatsApp',
  'Playbooks that run on a schedule or a trigger',
  'Alerts to the right person',
  'Voice requests',
  'Clips and frames in answers',
];

const Y = true;
const N = false;
export type Cell = boolean | string;

export const COMPARE: { feature: string; cells: [Cell, Cell, Cell] }[] = [
  { feature: 'Aldo in Slack, Telegram and WhatsApp', cells: [Y, Y, Y] },
  { feature: 'Playbooks and alerts', cells: [Y, Y, Y] },
  { feature: 'POS, HR and time-clock connections', cells: [Y, Y, Y] },
  { feature: 'Analytics on your existing cameras', cells: [Y, N, Y] },
  { feature: 'Clips and frames in answers', cells: [Y, 'Orders', Y] },
  { feature: 'Voice requests', cells: [Y, Y, Y] },
  { feature: 'Packing checks against the POS', cells: [N, Y, Y] },
  { feature: 'Verification tablet', cells: [N, 'Included', 'Included'] },
  { feature: 'Automatic refund disputes', cells: [N, Y, Y] },
  { feature: 'SSO and custom integrations', cells: [N, N, Y] },
  { feature: 'Dedicated success manager', cells: [N, N, Y] },
];

export const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: 'Is Aldo included?',
    a: 'Yes. Aldo comes with Aldente Verify and with Aldente Vision: questions in Slack, Telegram or WhatsApp, Playbooks, alerts and voice requests.',
  },
  { q: 'What counts as a location?', a: 'One restaurant with its own cameras and POS.' },
  {
    q: 'What’s a Playbook?',
    a: 'A saved task Aldo runs on a schedule or when something happens: what to check, when to run, and where to send the result.',
  },
  {
    q: 'Do I need new cameras?',
    a: 'Not for Aldo or Aldente Vision. We work with most IP cameras. Aldente Verify includes a tablet with a camera for the packing station.',
  },
  {
    q: 'How long does setup take?',
    a: 'Most locations are live within 30 days. Once you’re a customer, Aldo connects to Slack in minutes.',
  },
  { q: 'Can we start with one location?', a: 'Yes. Many chains start with one or two locations and roll out after the first results.' },
  {
    q: 'What happens to our footage and records?',
    a: 'Your footage and records stay in your account and are used to run your workspace. We’re SOC 2 Type II certified and GDPR compliant.',
  },
  { q: 'Is there a contract?', a: 'Plans are monthly per location. Enterprise plans can be annual.' },
];
