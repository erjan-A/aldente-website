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
    id: 'verification',
    name: 'Aldente Verify + Dispute',
    summary: 'For delivery and drive-thru accuracy, and evidence for every refund claim.',
    cta: { label: 'Book a live demo', href: `${LINKS.demo}?plan=verification` },
    features: [
      'Verification tablet and camera included',
      'Item and quantity checks against your POS',
      'Photo and clip for every order',
      'Aldente Dispute: an evidence pack for every delivery refund claim',
      'Accuracy dashboard by location',
    ],
    aldo: true,
    featured: true,
  },
  {
    id: 'vision',
    name: 'Aldente Playbooks',
    summary: 'For seeing what happens inside every location, and acting on it in Slack.',
    cta: { label: 'Book a live demo', href: `${LINKS.demo}?plan=vision` },
    features: [
      'Works with the IP cameras you already have',
      'Traffic, occupancy, queues and tables by hour',
      'Staff presence and repeat visits',
      'Heatmaps and leaderboards across locations',
      'Playbooks that alert the right person',
    ],
    aldo: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    summary: 'For chains with 50+ locations.',
    cta: { label: 'Talk to us', href: `${LINKS.demo}?plan=enterprise` },
    features: [
      'Every product across every location',
      'Custom integrations and SSO',
      'Security review and questionnaire support',
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

export const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: 'Is Aldo included?',
    a: 'Yes. Aldo, the assistant in Slack, comes with Aldente Verify and with Aldente Playbooks: questions in Slack, Telegram or WhatsApp, alerts and voice requests.',
  },
  { q: 'What counts as a location?', a: 'One restaurant with its own cameras and POS.' },
  {
    q: 'What’s a Playbook?',
    a: 'A saved task Aldo runs on a schedule or when something happens: what to check, when to run, and where to send the result.',
  },
  {
    q: 'Do I need new cameras?',
    a: 'Not for Aldente Playbooks. We work with most IP cameras. Aldente Verify includes a tablet with a camera for the packing station.',
  },
  {
    q: 'How long does setup take?',
    a: 'Most locations are live within 2–3 weeks. Once you’re a customer, Aldo connects to Slack in minutes.',
  },
  { q: 'Can we start with one location?', a: 'Yes. Many chains start with one or two locations and roll out after the first results.' },
  {
    q: 'What happens to our footage and records?',
    a: 'Your footage and records stay in your account and are used to run your workspace. They are encrypted at rest and in transit.',
  },
  { q: 'Is there a contract?', a: 'Plans are monthly per location. Enterprise plans can be annual.' },
];
