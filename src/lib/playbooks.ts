export type Team = 'HR' | 'Operations' | 'Orders' | 'Dining room' | 'Catering';
export type TeamFilter = Team | 'All';

export interface Playbook {
  id: string;
  team: Team;
  title: string;
  /** The sentence a manager would say to Aldo. */
  say: string;
  trigger: string;
  condition: string;
  action: string;
  destination: string;
  /** What the team receives. */
  result: string;
}

export type StepKind = 'when' | 'if' | 'then' | 'send';

export interface GraphStep {
  kind: StepKind;
  label: string;
  value: string;
}

export function filterByTeam(playbooks: readonly Playbook[], team: TeamFilter): Playbook[] {
  return team === 'All' ? [...playbooks] : playbooks.filter((p) => p.team === team);
}

export function teamsOf(playbooks: readonly Playbook[]): TeamFilter[] {
  return ['All', ...new Set(playbooks.map((p) => p.team))];
}

export function graphSteps(playbook: Playbook): GraphStep[] {
  return [
    { kind: 'when', label: 'When', value: playbook.trigger },
    { kind: 'if', label: 'If', value: playbook.condition },
    { kind: 'then', label: 'Then', value: playbook.action },
    { kind: 'send', label: 'Send to', value: playbook.destination },
  ];
}
