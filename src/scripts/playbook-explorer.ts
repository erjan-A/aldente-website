import { graphSteps, type Playbook } from '../lib/playbooks';
import { define } from './define';

/** Team filter, Playbook list and the When → If → Then → Send to graph. */
export class PlaybookExplorer extends HTMLElement {
  connectedCallback(): void {
    this.addEventListener('click', this.onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick);
  }

  private get cards(): HTMLButtonElement[] {
    return [...this.querySelectorAll<HTMLButtonElement>('[data-playbook]')];
  }

  private onClick = (event: Event): void => {
    const target = event.target as Element;
    const filter = target.closest<HTMLButtonElement>('[data-filter]');
    if (filter) {
      this.filter(filter.dataset.filter ?? 'All');
      return;
    }
    const card = target.closest<HTMLButtonElement>('[data-playbook]');
    if (card) this.select(card);
  };

  filter(team: string): void {
    this.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.filter === team)),
    );
    this.querySelectorAll<HTMLElement>('[data-team]').forEach((item) => {
      item.hidden = team !== 'All' && item.dataset.team !== team;
    });

    const isVisible = (card: HTMLElement) => !card.closest<HTMLElement>('[data-team]')?.hidden;
    const current = this.cards.find((card) => card.getAttribute('aria-pressed') === 'true');
    if (!current || !isVisible(current)) {
      const first = this.cards.find(isVisible);
      if (first) this.select(first);
    }
  }

  select(card: HTMLButtonElement): void {
    const playbook = JSON.parse(card.dataset.playbook ?? '{}') as Playbook;
    this.cards.forEach((c) => c.setAttribute('aria-pressed', String(c === card)));

    const graph = this.querySelector<HTMLElement>('[data-graph]');
    if (!graph) return;
    const set = (selector: string, text: string) => {
      const el = graph.querySelector(selector);
      if (el) el.textContent = text;
    };
    set('[data-graph-title]', playbook.title);
    set('[data-graph-say]', playbook.say);
    set('[data-graph-result]', playbook.result);
    for (const step of graphSteps(playbook)) set(`[data-graph-step="${step.kind}"]`, step.value);

    // Replay the node-by-node light-up.
    graph.removeAttribute('data-run');
    void graph.offsetWidth;
    graph.setAttribute('data-run', '');
  }
}

define('playbook-explorer', PlaybookExplorer);
