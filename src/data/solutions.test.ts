import { describe, expect, it } from 'vitest';
import { PLAYBOOKS } from './playbooks';
import { SOLUTIONS, solutionPlaybook } from './solutions';

describe('SOLUTIONS', () => {
  it('gives every solution page a hero Playbook from its own team', () => {
    for (const solution of SOLUTIONS) {
      const playbook = solutionPlaybook(solution);
      expect(PLAYBOOKS).toContain(playbook);
      expect(playbook.team).toBe(solution.team);
    }
  });

  it('names who asks for it, with initials for the Slack avatar', () => {
    for (const { asker } of SOLUTIONS) {
      expect(asker.role).not.toBe('');
      expect(asker.initials).toMatch(/^[A-Z]{2}$/);
      expect(asker.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('fails loudly on an unknown Playbook id', () => {
    const broken = { ...SOLUTIONS[0]!, playbook: 'no-such-playbook' };
    expect(() => solutionPlaybook(broken)).toThrow(/no-such-playbook/);
  });

  it('keeps slugs unique', () => {
    const slugs = SOLUTIONS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
