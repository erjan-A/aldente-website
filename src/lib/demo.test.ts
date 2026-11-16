import { describe, expect, it } from 'vitest';
import { DEMO_PLANS, demoIntent, isDemoPlan, keepNames, titleParts } from './demo';

const ALL = ['', ...DEMO_PLANS];

describe('demoIntent', () => {
  it('defaults to a general demo, naming Aldente: first-time visitors don’t know Aldo yet', () => {
    expect(demoIntent('')).toEqual({
      plan: '',
      title: 'See Aldente on your restaurants.',
      muted: 'on your restaurants.',
      lead: expect.stringContaining('30 minutes'),
    });
  });

  it('names Aldo only for visitors who came for the Slack side of Aldente Playbooks', () => {
    for (const plan of ALL.filter((p) => p !== 'starter')) {
      const { title, lead } = demoIntent(plan ? `?plan=${plan}` : '');
      expect(`${title} ${lead}`).not.toMatch(/\bAldo\b/);
    }
    expect(demoIntent('?plan=starter').lead).toMatch(/\bAldo\b/);
  });

  it('knows the plans the site links to', () => {
    expect(DEMO_PLANS).toEqual(['starter', 'vision', 'verification', 'enterprise']);
    for (const plan of DEMO_PLANS) expect(demoIntent(`?plan=${plan}`).plan).toBe(plan);
    expect(isDemoPlan('vision')).toBe(true);
    expect(isDemoPlan('')).toBe(false);
    expect(isDemoPlan(null)).toBe(false);
  });

  it('opens the Aldente Playbooks demo from both of its older plan names', () => {
    const slack = demoIntent('?plan=starter');
    expect(slack.plan).toBe('starter');
    expect(slack.title).toBe('See Aldente Playbooks in your Slack.');
    expect(slack.lead).toBe('30 minutes. We show Aldo in Slack with questions like yours, and how a first Playbook is set up.');
    expect(demoIntent('?plan=vision').title).toBe('See Aldente Playbooks on your cameras.');
  });

  it('no longer names the retired Aldente Vision', () => {
    for (const plan of ALL) {
      const { title, lead } = demoIntent(`?plan=${plan}`);
      expect(`${title} ${lead}`, plan).not.toMatch(/Aldente Vision/);
    }
  });

  it('promises only what a 30-minute intro call can show', () => {
    for (const plan of ALL) {
      const { lead } = demoIntent(`?plan=${plan}`);
      expect(lead, plan).not.toMatch(/trained on|sample of your menu|your own (camera|menu)/i);
    }
  });

  it('uses the exact product names ("Aldente" alone is the company)', () => {
    for (const plan of ALL) {
      const { title, lead } = demoIntent(`?plan=${plan}`);
      for (const text of [title, lead]) expect(text, plan).not.toMatch(/\bVerify\b(?<!Aldente Verify)|Aldente (?!Verify|Playbooks|Dispute)[A-Z]/);
    }
  });

  it('never mentions a price', () => {
    for (const plan of ALL) {
      const { lead } = demoIntent(`?plan=${plan}`);
      expect(lead).not.toMatch(/\$\d|free/i);
    }
  });

  it('ignores plans it does not know, including retired ones', () => {
    for (const plan of ['rockets', 'quote', 'bundle', 'pro', 'constructor', 'toString']) {
      expect(demoIntent(`?plan=${plan}`).plan).toBe('');
    }
  });

  it('keeps product names on one line', () => {
    expect(keepNames('Aldente Verify or Aldente Playbooks.')).toBe('Aldente\u00a0Verify or Aldente Playbooks.');
    expect(keepNames('See Aldo on your restaurants.')).toBe('See Aldo on your restaurants.');
  });

  it('splits every heading into a claim and a muted ending, as on every page hero', () => {
    for (const plan of ALL) {
      const intent = demoIntent(`?plan=${plan}`);
      const { claim, muted } = titleParts(intent);
      expect(muted, plan).not.toBe('');
      expect(`${claim} ${muted}`, plan).toBe(intent.title);
    }
    expect(titleParts(demoIntent('?plan=vision'))).toEqual({ claim: 'See Aldente Playbooks', muted: 'on your cameras.' });
  });

  it('keeps the whole heading as the claim when the muted part does not end it', () => {
    expect(titleParts({ title: 'Talk to us.', muted: 'elsewhere.' })).toEqual({ claim: 'Talk to us.', muted: '' });
    expect(titleParts({ title: 'Talk to us.', muted: '' })).toEqual({ claim: 'Talk to us.', muted: '' });
  });
});
