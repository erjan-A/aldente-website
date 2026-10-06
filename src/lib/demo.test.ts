import { describe, expect, it } from 'vitest';
import { DEMO_PLANS, demoIntent, isDemoPlan, keepNames, titleParts } from './demo';

const ALL = ['', ...DEMO_PLANS];

describe('demoIntent', () => {
  it('defaults to a general demo', () => {
    expect(demoIntent('')).toEqual({
      plan: '',
      title: 'See Aldo on your restaurants.',
      muted: 'on your restaurants.',
      lead: expect.stringContaining('30 minutes'),
    });
  });

  it('knows the plans the site links to', () => {
    expect(DEMO_PLANS).toEqual(['starter', 'vision', 'verification', 'enterprise']);
    for (const plan of DEMO_PLANS) expect(demoIntent(`?plan=${plan}`).plan).toBe(plan);
    expect(isDemoPlan('vision')).toBe(true);
    expect(isDemoPlan('')).toBe(false);
    expect(isDemoPlan(null)).toBe(false);
  });

  it('frames Aldo as coming with Aldente Verify and Aldente Vision', () => {
    const intent = demoIntent('?plan=starter');
    expect(intent.plan).toBe('starter');
    expect(intent.title).toBe('Get Aldo with Aldente Verify or Vision.');
    expect(intent.lead).toBe('Aldo comes with both products. Pick a time and we’ll show you Aldo in Slack with questions like yours.');
  });

  it('has its own page for Aldente Vision', () => {
    expect(demoIntent('?plan=vision').title).toBe('See Aldente Vision on your cameras.');
  });

  it('promises only what a 30-minute intro call can show', () => {
    for (const plan of ALL) {
      const { lead } = demoIntent(`?plan=${plan}`);
      expect(lead, plan).not.toMatch(/trained on|sample of your menu|your own (camera|menu)/i);
    }
  });

  it('uses the exact product names', () => {
    for (const plan of ALL) {
      const { title, lead } = demoIntent(`?plan=${plan}`);
      for (const text of [title, lead]) expect(text, plan).not.toMatch(/\bVerify\b(?<!Aldente Verify)|Aldente (?!Verify|Vision)\w/);
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
    expect(keepNames('Get Aldo with Aldente Verify or Aldente Vision.')).toBe('Get Aldo with Aldente\u00a0Verify or Aldente\u00a0Vision.');
    expect(keepNames('See Aldo on your restaurants.')).toBe('See Aldo on your restaurants.');
  });

  it('splits every heading into a claim and a muted ending, as on every page hero', () => {
    for (const plan of ALL) {
      const intent = demoIntent(`?plan=${plan}`);
      const { claim, muted } = titleParts(intent);
      expect(muted, plan).not.toBe('');
      expect(`${claim} ${muted}`, plan).toBe(intent.title);
    }
    expect(titleParts(demoIntent('?plan=vision'))).toEqual({ claim: 'See Aldente Vision', muted: 'on your cameras.' });
  });

  it('keeps the whole heading as the claim when the muted part does not end it', () => {
    expect(titleParts({ title: 'Talk to us.', muted: 'elsewhere.' })).toEqual({ claim: 'Talk to us.', muted: '' });
    expect(titleParts({ title: 'Talk to us.', muted: '' })).toEqual({ claim: 'Talk to us.', muted: '' });
  });
});
