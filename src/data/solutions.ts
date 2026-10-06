import type { Playbook, TeamFilter } from '../lib/playbooks';
import { PLAYBOOKS } from './playbooks';

/** Who asks Aldo for the hero Playbook, drawn as a Slack sender. */
export interface Asker {
  role: string;
  initials: string;
  /** Slack avatar colour. */
  color: string;
}

export interface Solution {
  slug: string;
  name: string;
  title: string;
  muted: string;
  lead: string;
  description: string;
  team: TeamFilter;
  /** Id of the Playbook shown in the hero (src/data/playbooks.ts). One of this team's. */
  playbook: string;
  asker: Asker;
  points: { title: string; text: string }[];
}

export const SOLUTIONS: Solution[] = [
  {
    slug: 'operations',
    name: 'Operations',
    title: 'Run every location',
    muted: 'like you’re standing in it.',
    lead: 'District and regional managers get the queues, the empty stations and the weekly patterns in Slack, with the camera view to act on.',
    description:
      'Aldo gives district and regional managers live queues, staffing gaps and weekly patterns across every location, in Slack.',
    team: 'Operations',
    // Long queues opens the Playbooks section below, so the hero shows the empty-station check.
    playbook: 'unattended-counter',
    asker: { role: 'District manager', initials: 'DM', color: '#2b6cb0' },
    points: [
      { title: 'Act on the right store', text: 'Long queues and empty counters go to the nearest manager with the frame attached.' },
      { title: 'Compare locations', text: 'Peak-hour heatmaps and leaderboards show where to send help and what to copy.' },
      { title: 'Monday, already done', text: 'Aldo sends the weekly lunch-peak review before your first meeting.' },
    ],
  },
  {
    slug: 'hr',
    name: 'HR',
    title: 'Find the clip',
    muted: 'without watching the footage.',
    lead: 'Ask Aldo when someone left, attach the departure clip to the case and close missing clock-outs the same day.',
    description: 'Aldo finds departure clips for missing clock-outs and incidents, and prepares HR case summaries in Slack.',
    team: 'HR',
    playbook: 'missing-clock-outs',
    asker: { role: 'HR manager', initials: 'HR', color: '#805ad5' },
    points: [
      {
        title: 'Missing clock-outs, closed',
        text: 'After each closing shift, Aldo matches clock-outs against departures and flags the gaps.',
      },
      { title: 'Evidence for every case', text: 'Ask for the moment you need and get the clip, the time and the location.' },
      { title: 'Hours back every week', text: 'No more driving to the store to scrub through footage.' },
    ],
  },
  {
    slug: 'delivery',
    name: 'Delivery',
    title: 'Stop paying',
    muted: 'for orders you packed right.',
    lead: 'Verify every bag, keep the evidence and let Aldente dispute delivery refunds for you.',
    description: 'Aldente Verify checks every delivery bag, saves the evidence and disputes refunds with Uber Eats, DoorDash and Grubhub.',
    team: 'Orders',
    playbook: 'refund-evidence',
    asker: { role: 'Area manager', initials: 'AM', color: '#2b6cb0' },
    points: [
      { title: 'Fewer wrong orders', text: '87% fewer order errors at one location of a regional chain.' },
      { title: 'Refunds answered with video', text: 'Every claim gets the packing clip from the moment the bag was sealed.' },
      { title: 'Catering, counted', text: 'Trays are checked against the order and the handover is logged.' },
    ],
  },
];

/** The Playbook a solution page shows in its hero. Throws at build time if the id is unknown. */
export function solutionPlaybook(solution: Solution, playbooks: readonly Playbook[] = PLAYBOOKS): Playbook {
  const playbook = playbooks.find((p) => p.id === solution.playbook);
  if (!playbook) throw new Error(`Unknown Playbook "${solution.playbook}" for /solutions/${solution.slug}`);
  return playbook;
}
