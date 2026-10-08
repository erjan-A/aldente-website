/** How a chain starts with Aldente, as on the decks' closing slide: live in 2–3 weeks, rolled out after week 4. */
export const ROLLOUT = [
  {
    when: 'Week 1',
    title: 'Install and connect',
    text: 'Mount the verification tablet, connect your cameras and POS, and train Aldente on your menu.',
  },
  {
    when: 'Weeks 2–3',
    title: 'Go live',
    text: 'Tune accuracy, set up dispute workflows and alert routes, and give Aldo its first Playbooks.',
  },
  { when: 'Week 4', title: 'Roll out', text: 'Review the first results with your team and plan the next locations.' },
] as const;
