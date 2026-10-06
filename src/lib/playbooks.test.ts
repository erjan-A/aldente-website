import { describe, expect, it } from 'vitest';
import { filterByTeam, graphSteps, teamsOf, type Playbook } from './playbooks';

const playbooks: Playbook[] = [
  {
    id: 'clock-outs',
    team: 'HR',
    title: 'Missing clock-outs',
    say: 'After each closing shift, find missing clock-outs.',
    trigger: 'After each closing shift',
    condition: 'A clock-out is missing',
    action: 'Find the departure clip',
    destination: '#hr-ops',
    result: 'A case summary with the clip.',
  },
  {
    id: 'queues',
    team: 'Operations',
    title: 'Long queues',
    say: 'When a line lasts more than five minutes, alert the district manager.',
    trigger: 'A queue forms',
    condition: 'Longer than 5 minutes',
    action: 'Attach the camera view',
    destination: 'District manager',
    result: 'An alert with the frame.',
  },
  {
    id: 'monday',
    team: 'Operations',
    title: 'Monday lunch review',
    say: 'Every Monday, compare last week.',
    trigger: 'Every Monday, 8:00',
    condition: 'Always',
    action: 'Rank lunch peaks',
    destination: '#ops-leads',
    result: 'A ranked summary.',
  },
];

describe('filterByTeam', () => {
  it('returns everything for All', () => {
    expect(filterByTeam(playbooks, 'All')).toHaveLength(3);
  });

  it('returns only the chosen team', () => {
    expect(filterByTeam(playbooks, 'Operations').map((p) => p.id)).toEqual(['queues', 'monday']);
  });

  it('returns an empty list for a team with no Playbooks', () => {
    expect(filterByTeam(playbooks, 'Catering')).toEqual([]);
  });
});

describe('teamsOf', () => {
  it('lists unique teams in first-seen order, led by All', () => {
    expect(teamsOf(playbooks)).toEqual(['All', 'HR', 'Operations']);
  });
});

describe('graphSteps', () => {
  it('turns a Playbook into When, If, Then and Send to steps', () => {
    expect(graphSteps(playbooks[1]!)).toEqual([
      { kind: 'when', label: 'When', value: 'A queue forms' },
      { kind: 'if', label: 'If', value: 'Longer than 5 minutes' },
      { kind: 'then', label: 'Then', value: 'Attach the camera view' },
      { kind: 'send', label: 'Send to', value: 'District manager' },
    ]);
  });
});
