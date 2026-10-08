import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import Analytics from '../../src/components/home/Analytics.astro';
import Products from '../../src/components/home/Products.astro';
import SectionHeader from '../../src/components/ui/SectionHeader.astro';
import Playbooks from '../../src/components/home/Playbooks.astro';
import Voices from '../../src/components/home/Voices.astro';
import PlanGrid from '../../src/components/pricing/PlanGrid.astro';
import Header from '../../src/components/site/Header.astro';
import SlackMessage from '../../src/components/slack/SlackMessage.astro';
import SlackWindow from '../../src/components/slack/SlackWindow.astro';
import { PLAYBOOKS } from '../../src/data/playbooks';
import { FOOTER, NAV_GROUPS, isNavMenu } from '../../src/data/site';

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

// Astro renders in Node; happy-dom only parses the output.
const parser = new new Window().DOMParser();
const parse = (html: string) => parser.parseFromString(html, 'text/html') as unknown as Document;

describe('SlackWindow', () => {
  it('renders the channel list, the active channel and the composer', async () => {
    const html = await container.renderToString(SlackWindow, {
      props: { active: 'hr-ops', channels: ['ops-leads', 'hr-ops'] },
      slots: { default: '<p>message</p>' },
    });
    const doc = parse(html);
    expect(doc.querySelector('[data-slack-channel]')?.textContent).toBe('hr-ops');
    expect(doc.querySelector('[data-slack-composer]')?.textContent).toBe('Message #hr-ops');
    expect(doc.querySelector('[data-channel-link="hr-ops"]')?.getAttribute('aria-current')).toBe('page');
    expect(doc.querySelector('[data-channel-link="ops-leads"]')?.hasAttribute('aria-current')).toBe(false);
    expect(doc.querySelector('figure')?.getAttribute('aria-label')).toBe('Aldo in Slack');
    expect(html).toContain('<p>message</p>');
  });

  it('stays minimal, as the design system asks: no title bar with search, no member count', async () => {
    const html = await container.renderToString(SlackWindow, { props: { active: 'hr-ops' } });
    const doc = parse(html);
    expect(doc.querySelector('.slack-window__top, .slack-window__search, .slack-window__members')).toBeNull();
    expect(doc.body.textContent).not.toContain('Search');
  });

  it('can hide the sidebar', async () => {
    const html = await container.renderToString(SlackWindow, { props: { active: 'floor-team', sidebar: false } });
    expect(parse(html).querySelector('.slack-window__sidebar')).toBeNull();
  });
});

describe('SlackMessage', () => {
  it('shows Aldo with its avatar and no app badge', async () => {
    const html = await container.renderToString(SlackMessage, { props: { author: 'Aldo', time: '9:02 AM' } });
    const doc = parse(html);
    expect(doc.querySelector('.slack-message__avatar--aldo')).not.toBeNull();
    expect(doc.body.textContent).not.toContain('APP');
    expect(doc.querySelector('time')?.textContent).toBe('9:02 AM');
  });

  it('uses initials for people', async () => {
    const html = await container.renderToString(SlackMessage, { props: { author: 'HR manager', avatar: 'HR', time: '4:20 PM' } });
    const doc = parse(html);
    expect(doc.querySelector('.slack-message__avatar')?.textContent?.trim()).toBe('HR');
    expect(doc.querySelector('.slack-message__app')).toBeNull();
  });

  it('shows the time it is given, never the visitor’s clock', async () => {
    const html = await container.renderToString(SlackMessage, { props: { author: 'Aldo', time: '12:41', app: true } });
    expect(parse(html).querySelector('time')?.textContent).toBe('12:41');
    expect(html).not.toContain('live-clock');
  });
});

describe('Playbooks', () => {
  it('renders every Playbook with parseable data and a filter per team', async () => {
    const doc = parse(await container.renderToString(Playbooks));
    const cards = [...doc.querySelectorAll<HTMLElement>('[data-playbook]')];
    expect(cards).toHaveLength(PLAYBOOKS.length);
    expect(JSON.parse(cards[0]!.dataset.playbook!)).toEqual(PLAYBOOKS[0]);
    expect([...doc.querySelectorAll('[data-filter]')].map((b) => b.textContent)).toEqual([
      'All',
      'HR',
      'Operations',
      'Orders',
      'Dining room',
      'Catering',
    ]);
  });

  it('starts the graph on the first Playbook', async () => {
    const doc = parse(await container.renderToString(Playbooks));
    expect(doc.querySelector('[data-graph-title]')?.textContent).toBe(PLAYBOOKS[0]!.title);
    expect(doc.querySelector('[data-graph-step="send"]')?.textContent?.trim()).toBe(PLAYBOOKS[0]!.destination);
  });

  it('limits to one team without filters on solution pages', async () => {
    const doc = parse(await container.renderToString(Playbooks, { props: { team: 'HR' } }));
    expect(doc.querySelectorAll('[data-playbook]')).toHaveLength(PLAYBOOKS.filter((p) => p.team === 'HR').length);
    expect(doc.querySelector('[data-filter]')).toBeNull();
    expect(doc.querySelector('.playbooks__teams')).toBeNull();
  });

  it('on a solution page: leaves out the hero Playbook, asks as that team, and keeps a visible heading', async () => {
    const doc = parse(
      await container.renderToString(Playbooks, {
        props: {
          team: 'Operations',
          exclude: ['unattended-counter'],
          asker: { role: 'Shift lead', initials: 'SL', color: '#805ad5' },
          title: 'More Playbooks',
          muted: 'for operations teams.',
        },
      }),
    );
    const ids = [...doc.querySelectorAll<HTMLElement>('[data-playbook]')].map((b) => JSON.parse(b.dataset.playbook!).id);
    expect(ids).not.toContain('unattended-counter');
    expect(ids.length).toBe(PLAYBOOKS.filter((p) => p.team === 'Operations').length - 1);
    expect(doc.querySelector('.pb__request-meta')?.textContent).toBe('Shift lead to Aldo');
    expect(doc.querySelector('.pb__avatar')?.textContent).toBe('SL');
    const h2 = doc.getElementById('playbooks-title')!;
    expect(h2.classList.contains('visually-hidden')).toBe(false);
    expect(h2.textContent?.replace(/\s+/g, ' ').trim()).toBe('More Playbooks for operations teams.');
    expect(doc.querySelector('.playbooks__cta')).toBeNull();
  });

  it('ends on the explorer, with no "comes with" band under it', async () => {
    const doc = parse(await container.renderToString(Playbooks));
    expect(doc.querySelector('.playbooks__cta')).toBeNull();
    expect(doc.body.textContent).not.toContain('Aldo and its Playbooks come with');
  });
});

describe('Home hero and CTA band', () => {
  it('Hero: audience line right above the H1, "See Aldo in action" to Meet Aldo, and which products include Aldo', async () => {
    const { default: Hero } = await import('../../src/components/home/Hero.astro');
    const html = await container.renderToString(Hero);
    const doc = parse(html);
    const h1 = doc.querySelector('h1')!;
    expect(h1.previousElementSibling?.classList.contains('eyebrow')).toBe(true);
    expect(h1.previousElementSibling?.textContent).toBe('For restaurant chains and franchise operators');
    const actions = [...doc.querySelectorAll('.hero__actions a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(actions).toEqual([
      ['Book a demo', '/demo'],
      ['See Aldo in action', '#aldo'],
    ]);
    const note = doc.querySelector('.hero__note')!;
    expect(note.textContent?.replace(/\s+/g, ' ').trim()).toBe('Aldo comes with Aldente Verify or Aldente Vision.');
    expect([...note.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/order-verification', '/analytics']);
    expect(html).not.toContain('Get Aldo in Slack');
  });

  it('HeroConsole: no live clock, and Aldo’s posts keep fixed lunch-time stamps', async () => {
    const { default: HeroConsole } = await import('../../src/components/home/HeroConsole.astro');
    const html = await container.renderToString(HeroConsole);
    const doc = parse(html);
    expect(html).not.toContain('live-clock');
    expect(doc.querySelector('.console__time')).toBeNull();
    expect([...doc.querySelectorAll('.slack-message time')].map((t) => t.textContent)).toEqual(['12:38 PM', '12:40 PM', '12:41 PM']);
  });

  it('Cta: "Book a demo" and "Compare plans", without a link to the page you are on', async () => {
    const { default: Cta } = await import('../../src/components/home/Cta.astro');
    const links = (doc: Document) =>
      [...doc.querySelectorAll('.cta__actions a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    const home = parse(await container.renderToString(Cta, { request: new Request('https://aldenteai.com/') }));
    expect(links(home)).toEqual([
      ['Book a demo', '/demo'],
      ['Compare plans', '/pricing'],
    ]);
    const pricing = parse(await container.renderToString(Cta, { request: new Request('https://aldenteai.com/pricing.html') }));
    expect(links(pricing)).toEqual([['Book a demo', '/demo']]);
  });
});

describe('Analytics', () => {
  it('lists the eight metrics as compact chips on the home page', async () => {
    const doc = parse(await container.renderToString(Analytics));
    expect([...doc.querySelectorAll('.metric-chips .chip b')].map((b) => b.textContent)).toHaveLength(8);
    expect(doc.querySelectorAll('.metric')).toHaveLength(0);
  });

  it('gives every metric an icon and a preview that screen readers skip (Vision page)', async () => {
    const doc = parse(await container.renderToString(Analytics, { props: { heading: false } }));
    const metrics = [...doc.querySelectorAll('.metric')];
    expect(metrics.map((m) => m.querySelector('h3')?.textContent)).toEqual([
      'Visitor traffic',
      'Occupancy',
      'Queues',
      'Tables',
      'Staff presence',
      'Repeat visits',
      'Peak hours',
      'Leaderboards',
    ]);
    for (const metric of metrics) {
      expect(metric.querySelector('.metric__head svg')).not.toBeNull();
      expect(metric.querySelector('.viz')?.getAttribute('aria-hidden')).toBe('true');
      expect(metric.querySelector('.viz')?.children.length).toBeGreaterThan(0);
    }
  });
});

describe('Home sections consistency', () => {
  it('keeps an h2 above the step and card titles when a page supplies its own heading', async () => {
    const { default: OrderStory } = await import('../../src/components/home/OrderStory.astro');
    for (const [Section, name] of [
      [OrderStory, 'How an order is verified'],
      [Analytics, 'Aldente Vision'],
    ] as const) {
      const doc = parse(await container.renderToString(Section, { props: { heading: false } }));
      const h2 = doc.querySelector('h2')!;
      expect(h2.textContent).toBe(name);
      expect(h2.classList.contains('visually-hidden')).toBe(true);
      expect(doc.querySelector('section')?.getAttribute('aria-labelledby')).toBe(h2.id);
      expect(doc.querySelector('section')?.hasAttribute('aria-label')).toBe(false);
    }
  });

  it('builds card-like blocks from the shared Card', async () => {
    const { default: Enterprise } = await import('../../src/components/home/Enterprise.astro');
    const enterprise = parse(await container.renderToString(Enterprise));
    expect(enterprise.querySelectorAll('.weeks > li.card')).toHaveLength(3);
    expect(enterprise.querySelectorAll('.enterprise__trust > li.card.trust')).toHaveLength(4);
    const analytics = parse(await container.renderToString(Analytics));
    expect(analytics.querySelectorAll('.cams > li.cam')).toHaveLength(4);
  });

  it('uses SectionHeader for the problem statement', async () => {
    const { default: Problem } = await import('../../src/components/home/Problem.astro');
    const doc = parse(await container.renderToString(Problem));
    expect(doc.querySelector('h2.head__title')?.id).toBe('problem-title');
  });
});

describe('Product pills', () => {
  it('names the product a section belongs to', async () => {
    const doc = parse(await container.renderToString(SectionHeader, { props: { title: 'Every order checked', product: 'verify' } }));
    expect(doc.querySelector('.pill')?.textContent?.trim()).toBe('Aldente Verify');
  });

  it('leaves sections without a product unlabelled', async () => {
    const doc = parse(await container.renderToString(SectionHeader, { props: { title: 'Questions' } }));
    expect(doc.querySelector('.pill')).toBeNull();
  });

  it('labels each product in the overview', async () => {
    const doc = parse(await container.renderToString(Products));
    expect([...doc.querySelectorAll('.product .pill')].map((p) => p.textContent?.trim())).toEqual([
      'Aldo',
      'Aldente Verify',
      'Aldente Vision',
    ]);
  });

  it('gives topic sections a plain pill, as the decks do ("Customer results")', async () => {
    const doc = parse(await container.renderToString(SectionHeader, { props: { title: 'Results', label: 'Customer results' } }));
    const pill = doc.querySelector('.pill')!;
    expect(pill.textContent?.trim()).toBe('Customer results');
    expect(pill.classList.contains('pill--plain')).toBe(true);
    expect(pill.querySelector('svg, img')).toBeNull();
  });

  it('can rename a product pill and keep its cue ("Aldo in Slack")', async () => {
    const doc = parse(await container.renderToString(SectionHeader, { props: { title: 'Aldo', product: 'aldo', label: 'Aldo in Slack' } }));
    const pill = doc.querySelector('.pill')!;
    expect(pill.textContent?.trim()).toBe('Aldo in Slack');
    expect(pill.querySelector('.pill__avatar')).not.toBeNull();
  });

  it('labels the home sections the way the decks label their slides', async () => {
    const label = async (path: string) => {
      const { default: Section } = await import(/* @vite-ignore */ path);
      return parse(await container.renderToString(Section))
        .querySelector('.pill')
        ?.textContent?.trim();
    };
    expect(await label('../../src/components/home/Problem.astro')).toBe('The problem');
    expect(await label('../../src/components/home/CaseStudy.astro')).toBe('Customer results');
    expect(await label('../../src/components/home/Enterprise.astro')).toBe('How we start');
  });
});

describe('UI foundation', () => {
  it('Button: primary by default, link variant with an arrow, extra attributes passed through', async () => {
    const { default: Button } = await import('../../src/components/ui/Button.astro');
    const primary = parse(
      await container.renderToString(Button, { props: { href: '/demo', 'data-cta': 'hero' }, slots: { default: 'Book a demo' } }),
    );
    const a = primary.querySelector('a')!;
    expect(a.className).toContain('btn--primary');
    expect(a.className).toContain('btn--md');
    expect(a.getAttribute('data-cta')).toBe('hero');
    expect(a.querySelector('svg')).toBeNull();

    const link = parse(
      await container.renderToString(Button, {
        props: { href: '/pricing', variant: 'link', size: 'sm' },
        slots: { default: 'Compare plans' },
      }),
    );
    expect(link.querySelector('a')!.className).toContain('btn--link');
    expect(link.querySelector('a')!.className).toContain('btn--sm');
    expect(link.querySelector('a svg.btn__arrow')).not.toBeNull();

    const plain = parse(await container.renderToString(Button, { props: { href: '/pricing', variant: 'link', arrow: false } }));
    expect(plain.querySelector('svg')).toBeNull();
  });

  it('Card: tone-aware surface with element, padding and radius options', async () => {
    const { default: Card } = await import('../../src/components/ui/Card.astro');
    const plain = parse(await container.renderToString(Card, { slots: { default: '<h3>Title</h3>' } }));
    const div = plain.querySelector('div.card')!;
    expect(div.className).toContain('card--pad-m');
    expect(div.className).toContain('card--r-l');
    expect(div.querySelector('h3')?.textContent).toBe('Title');

    const li = parse(
      await container.renderToString(Card, { props: { as: 'li', pad: 'l', radius: 'xl', interactive: true, id: 'plan-vision' } }),
    );
    const el = li.querySelector('li.card')!;
    expect(el.className).toContain('card--pad-l');
    expect(el.className).toContain('card--r-xl');
    expect(el.className).toContain('card--interactive');
    expect(el.id).toBe('plan-vision');
  });

  it('Eyebrow: renders the text prop or the slot, as a paragraph or a span', async () => {
    const { default: Eyebrow } = await import('../../src/components/ui/Eyebrow.astro');
    const p = parse(await container.renderToString(Eyebrow, { props: { text: 'For restaurant chains and franchise operators' } }));
    expect(p.querySelector('p.eyebrow')?.textContent).toBe('For restaurant chains and franchise operators');
    const span = parse(await container.renderToString(Eyebrow, { props: { as: 'span' }, slots: { default: 'For operators' } }));
    expect(span.querySelector('span.eyebrow')?.textContent).toBe('For operators');
  });

  it('SectionHeader: the pill, then the title; no eyebrow kicker on sections', async () => {
    const doc = parse(await container.renderToString(SectionHeader, { props: { title: 'Every order checked', product: 'verify' } }));
    const titles = doc.querySelector('.head__titles')!;
    expect(titles.firstElementChild?.classList.contains('pill')).toBe(true);
    expect(titles.querySelector('h2')?.textContent).toBe('Every order checked');
    expect(doc.querySelector('.eyebrow')).toBeNull();
  });

  it('PageHero: becomes a split layout only when the media slot is filled', async () => {
    const { default: PageHero } = await import('../../src/components/site/PageHero.astro');
    const text = parse(
      await container.renderToString(PageHero, {
        props: { title: 'Security', lead: 'Lead' },
        slots: { default: '<a href="/demo">Book</a>' },
      }),
    );
    expect(text.querySelector('.page-hero--split')).toBeNull();
    expect(text.querySelector('.page-hero__media')).toBeNull();
    expect(text.querySelector('.page-hero__extra a')?.getAttribute('href')).toBe('/demo');

    const split = parse(
      await container.renderToString(PageHero, {
        props: { title: 'Every order checked', product: 'verify' },
        slots: { default: '<a href="/demo">Book</a>', media: '<img src="/x.webp" alt="Tablet">' },
      }),
    );
    expect(split.querySelector('section.page-hero--split')).not.toBeNull();
    expect(split.querySelector('.page-hero__media img')?.getAttribute('alt')).toBe('Tablet');
    expect(split.querySelector('.page-hero__copy .pill')).not.toBeNull();
    expect(split.querySelector('.page-hero__copy .eyebrow')).toBeNull();
    expect(split.querySelector('.page-hero__copy h1')?.textContent).toBe('Every order checked');
  });
});

describe('Product hero media', () => {
  const heroImage = (doc: Document) => doc.querySelector('img')!;
  const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('Detection: positions the box in % and places the label', async () => {
    const { default: Detection } = await import('../../src/components/product/Detection.astro');
    const doc = parse(
      await container.renderToString(Detection, { props: { tone: 'alert', label: 'Table 6', box: [26, 64, 34, 28], place: 'side' } }),
    );
    const det = doc.querySelector('.det')!;
    expect(det.getAttribute('style')).toBe('left:26%;top:64%;width:34%;height:28%');
    expect(det.className).toContain('det--alert');
    expect(det.className).toContain('det--side');
    expect(det.getAttribute('aria-hidden')).toBe('true');
    expect(text(det.querySelector('.det__label'))).toBe('Table 6');
  });

  it('VerifyHeroMedia: order 4821 checked against the POS, the 12:40 flag kept, verified at 12:41', async () => {
    const { default: VerifyHeroMedia } = await import('../../src/components/product/VerifyHeroMedia.astro');
    const doc = parse(await container.renderToString(VerifyHeroMedia));
    expect(text(doc.querySelector('.vh__head b'))).toBe('#4821');
    expect([...doc.querySelectorAll('.vh__name')].map(text)).toEqual(['Turkey sandwich', 'Fries', 'Drinks']);
    expect(text(doc.querySelector('.vh__item--flag .vh__flag'))).toBe('12:40 Add 1 drink');
    expect(text(doc.querySelector('.vh__status'))).toBe('Verified 12:41');
    expect(doc.querySelectorAll('.det')).toHaveLength(4);
    expect(heroImage(doc).getAttribute('loading')).toBe('eager');
    expect(heroImage(doc).getAttribute('fetchpriority')).toBe('high');
    expect(heroImage(doc).getAttribute('alt')).toMatch(/order 4821/);
  });

  it('VisionPipeline: five steps from cameras to Aldo, and one moment read through them', async () => {
    const { default: VisionPipeline } = await import('../../src/components/product/VisionPipeline.astro');
    const doc = parse(await container.renderToString(VisionPipeline, { props: { eager: true } }));
    expect([...doc.querySelectorAll('.step__text b')].map((b) => text(b).replace(/^\d\s*/, ''))).toEqual([
      'Your cameras',
      'Computer vision',
      'VLM',
      'Events and triggers',
      'Analytics and Aldo',
    ]);
    expect(doc.querySelectorAll('.det')).toHaveLength(3);
    expect([...doc.querySelectorAll('.vp__label')].map((l) => text(l).replace(/^\d\s*/, ''))).toEqual([
      'VLM reads the scene',
      'Event and trigger',
      'Analytics',
    ]);
    expect(heroImage(doc).getAttribute('fetchpriority')).toBe('high');
  });

  it('AldoHeroMedia: a question and a numbered answer with the clip, at fixed times and no live clock', async () => {
    const { default: AldoHeroMedia } = await import('../../src/components/product/AldoHeroMedia.astro');
    const html = await container.renderToString(AldoHeroMedia);
    const doc = parse(html);
    expect(doc.querySelectorAll('.slack-message')).toHaveLength(2);
    expect(doc.querySelectorAll('.aldo-hero__answer li')).toHaveLength(3);
    expect(text(doc.querySelector('.aldo-hero__clip .slack-media__label'))).toBe('Cam 04 · Table 6');
    expect(doc.querySelector('.aldo-hero__clip img')?.getAttribute('loading')).toBe('eager');
    expect(doc.querySelector('.aldo-hero__clip img')?.getAttribute('fetchpriority')).toBe('high');
    expect(html).not.toContain('<live-clock');
  });

  it('PlaybookHeroMedia: each solution shows its asker and its Playbook as When, If, Then, Send to', async () => {
    const { default: PlaybookHeroMedia } = await import('../../src/components/product/PlaybookHeroMedia.astro');
    const { SOLUTIONS, solutionPlaybook } = await import('../../src/data/solutions');
    for (const solution of SOLUTIONS) {
      const playbook = solutionPlaybook(solution);
      const doc = parse(await container.renderToString(PlaybookHeroMedia, { props: { playbook, asker: solution.asker } }));
      expect(text(doc.querySelector('.pbh__meta b'))).toBe(solution.asker.role);
      expect(text(doc.querySelector('.pbh__request .slack-text'))).toBe(playbook.say);
      expect(text(doc.querySelector('.pbh__title'))).toBe(playbook.title);
      expect([...doc.querySelectorAll('.pbh__label')].map(text)).toEqual(['When', 'If', 'Then', 'Send to']);
      expect([...doc.querySelectorAll('.pbh__value')].map(text)).toEqual([
        playbook.trigger,
        playbook.condition,
        playbook.action,
        playbook.destination,
      ]);
      expect(text(doc.querySelector('.pbh__result'))).toBe(playbook.result);
    }
  });
});

describe('Voices', () => {
  it('shows the featured quote and the two beside it', async () => {
    const doc = parse(await container.renderToString(Voices));
    expect(doc.querySelectorAll('blockquote')).toHaveLength(3);
    expect(doc.querySelector('.voices__side')?.querySelectorAll('figure')).toHaveLength(2);
  });
});

describe('PlanGrid', () => {
  it('lists the three plans, Aldo included in both products, with no price or badge', async () => {
    const doc = parse(await container.renderToString(PlanGrid));
    const names = [...doc.querySelectorAll('.plan__name')].map((n) => n.textContent);
    expect(names).toEqual(['Aldente Vision', 'Aldente Verify', 'Enterprise']);
    expect([...doc.querySelectorAll('.plan')].map((p) => Boolean(p.querySelector('.plan__aldo')))).toEqual([true, true, false]);
    expect(doc.body.textContent).not.toContain('Most chosen');
    expect(doc.body.textContent).not.toMatch(/\$\d|per location \/ month|free/i);
  });

  it('gives every plan the same booking button: orange, same size', async () => {
    const doc = parse(await container.renderToString(PlanGrid));
    const ctas = [...doc.querySelectorAll('.plan a.btn')];
    expect(ctas.map((a) => a.textContent?.trim())).toEqual(['Book a demo', 'Book a demo', 'Talk to us']);
    for (const cta of ctas) expect([...cta.classList].filter((c) => /^btn--/.test(c)).sort()).toEqual(['btn--md', 'btn--primary']);
  });
});

describe('Mobile layouts', () => {
  it('CompareTable: a fluid table plus a stacked list from the same rows, in one uniquely named region', async () => {
    const { default: CompareTable } = await import('../../src/components/pricing/CompareTable.astro');
    const { COMPARE, PLANS } = await import('../../src/data/pricing');
    const doc = parse(await container.renderToString(CompareTable));
    expect(doc.querySelectorAll('[role="region"]')).toHaveLength(0);
    expect(doc.querySelector('section')?.getAttribute('aria-labelledby')).toBe('compare-title');
    expect(doc.querySelectorAll('table tbody tr')).toHaveLength(COMPARE.length);
    const rows = [...doc.querySelectorAll('.compare__row')];
    expect(rows.map((r) => r.querySelector('.compare__feature')?.textContent)).toEqual(COMPARE.map((r) => r.feature));
    // Each stacked value names its plan for screen readers.
    for (const row of rows) expect([...row.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(PLANS.map((p) => p.name));
    expect(doc.querySelector('.compare__legend')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('VisionCameras: four cameras in four parts of the restaurant, each with its boxes and one reading', async () => {
    const { default: VisionCameras } = await import('../../src/components/product/VisionCameras.astro');
    const doc = parse(await container.renderToString(VisionCameras));
    expect([...doc.querySelectorAll('.cam__id')].map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())).toEqual([
      'Cam 01 · Entrance',
      'Cam 02 · Counter',
      'Cam 04 · Dining room',
      'Cam 07 · Back door',
    ]);
    expect(doc.querySelectorAll('.cam .det').length).toBeGreaterThanOrEqual(4);
    expect(doc.querySelectorAll('.cam__reading b')).toHaveLength(4);
    for (const img of doc.querySelectorAll('.cam img')) expect(img.getAttribute('alt')).toMatch(/camera/i);
  });

  it('CookieConsent: one short, honest line and one row of choices, still a region named "Cookies"', async () => {
    const { default: CookieConsent } = await import('../../src/components/site/CookieConsent.astro');
    const doc = parse(await container.renderToString(CookieConsent));
    const region = doc.querySelector('cookie-consent section');
    expect(doc.getElementById(region?.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Cookies');
    // The site sets no cookies of its own; Calendly does, once the visitor allows it.
    expect(doc.querySelector('.consent__text')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'We set no cookies. Calendly does, only if you allow it. Cookie policy',
    );
    expect([...doc.querySelectorAll('.consent__actions button')].map((b) => b.getAttribute('data-consent'))).toEqual([
      'reject',
      'accept',
      'save',
      'settings',
    ]);
    // Visit counting is cookieless, so marketing (Calendly) is the only choice.
    expect([...doc.querySelectorAll('[data-consent-settings] input[name]')].map((i) => i.getAttribute('name'))).toEqual(['marketing']);
  });

  it('OrderStory: the sticky visual is marked for <scroll-story>, and each step keeps its time and text together', async () => {
    const { default: OrderStory } = await import('../../src/components/home/OrderStory.astro');
    const doc = parse(await container.renderToString(OrderStory));
    expect(doc.querySelectorAll('scroll-story [data-story-visual]')).toHaveLength(1);
    const steps = [...doc.querySelectorAll('[data-story-step]')];
    expect(steps).toHaveLength(5);
    for (const step of steps) expect(step.querySelector('.story__row > .story__marker + .story__text h3')).not.toBeNull();
  });
});

describe('Header', () => {
  const render = async (path: string) =>
    parse(await container.renderToString(Header, { request: new Request(`https://aldenteai.com${path}`) }));
  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  // Every link in NAV_GROUPS, in header order: menu items first within their menu, then the direct links.
  const allHrefs = NAV_GROUPS.flatMap((group) => (isNavMenu(group) ? group.items.map((item) => item.href) : [group.href]));

  it('marks the current page in the built site too, where paths end in .html', async () => {
    const doc = await render('/pricing.html');
    const current = doc.querySelector('nav[aria-label="Main"] a[aria-current="page"]');
    expect(current?.getAttribute('href')).toBe('/pricing');
    expect(current?.classList.contains('is-active')).toBe(true);
  });

  it('lists Product and Solutions as dropdowns, then Security, Pricing and Company', async () => {
    const doc = await render('/pricing');
    const desktop = doc.querySelector('nav[aria-label="Main"]')!;
    expect([...desktop.querySelectorAll('.nav__top')].map(text)).toEqual(['Product', 'Solutions', 'Security', 'Pricing', 'Company']);
    expect([...desktop.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(allHrefs);
    for (const button of desktop.querySelectorAll('button')) {
      expect(button.getAttribute('aria-expanded')).toBe('false');
      const panel = doc.getElementById(button.getAttribute('aria-controls')!);
      expect(panel?.closest('li')).toBe(button.closest('li'));
    }
    // Each dropdown row carries its one-line note.
    const verify = desktop.querySelector('a[href="/order-verification"]');
    expect(text(verify)).toBe('Aldente Verify Order checks at the packing station');
  });

  it('marks the menu that holds a child page, and the child link inside it', async () => {
    const verify = await render('/order-verification');
    expect([...verify.querySelectorAll('nav[aria-label="Main"] .is-active')].map(text)).toEqual(['Product']);
    expect(verify.querySelector('#nav-product a[aria-current="page"]')?.getAttribute('href')).toBe('/order-verification');

    const hr = await render('/solutions/hr.html');
    expect([...hr.querySelectorAll('nav[aria-label="Main"] .is-active')].map(text)).toEqual(['Solutions']);
    expect(hr.querySelector('#nav-solutions a[aria-current="page"]')?.getAttribute('href')).toBe('/solutions/hr');

    const home = await render('/');
    expect(home.querySelectorAll('.is-active, [aria-current]')).toHaveLength(0);
  });

  it('groups the mobile menu the same way, behind a closed toggle', async () => {
    const doc = await render('/pricing');
    expect(doc.querySelector('button[aria-controls="mobile-menu"]')?.getAttribute('aria-expanded')).toBe('false');
    const menu = doc.getElementById('mobile-menu')!;
    expect(menu.hasAttribute('hidden')).toBe(true);
    expect(menu.querySelector('[data-menu-panel]')).not.toBeNull();
    const mobile = menu.querySelector('nav[aria-label="Mobile"]')!;
    expect([...mobile.querySelectorAll('.mmenu__title')].map(text)).toEqual(['Product', 'Solutions']);
    const links = [...mobile.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([...allHrefs, '/demo']);
    expect(text(links.at(-1))).toBe('Book a demo');
    expect(mobile.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/pricing');
  });

  it('books with a 44px header button, which jumps to the calendar on the booking page', async () => {
    const pricing = await render('/pricing');
    const cta = pricing.querySelector('.header__cta')!;
    expect(cta.classList.contains('btn--sm')).toBe(true);
    expect(cta.classList.contains('btn--primary')).toBe(true);
    expect(cta.getAttribute('href')).toBe('/demo');

    const demo = await render('/demo');
    const book = [...demo.querySelectorAll('a.btn')].filter((a) => text(a) === 'Book a demo');
    expect(book.map((a) => a.getAttribute('href'))).toEqual(['#schedule', '#schedule']);
  });
});

describe('Footer', () => {
  it('renders the Legal column and keeps only the cookie button and trust line in the legal row', async () => {
    const { default: Footer } = await import('../../src/components/site/Footer.astro');
    const doc = parse(await container.renderToString(Footer));
    const cols = doc.querySelector('nav[aria-label="Footer"]')!;
    expect([...cols.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(FOOTER.map((col) => col.title));
    const legal = [...cols.querySelectorAll('div')].find((col) => col.querySelector('h2')?.textContent === 'Legal')!;
    expect([...legal.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/privacy', '/terms', '/cookies']);
    const row = doc.querySelector('.footer__legal')!;
    expect(row.querySelectorAll('a')).toHaveLength(0);
    expect(row.querySelector('button[data-cookie-settings]')?.textContent).toBe('Cookie settings');
    expect(row.textContent).toContain('SOC 2 Type II · GDPR');
    // The divider sits inside the container's padding, so it spans the text column only.
    expect(row.parentElement?.classList.contains('container')).toBe(true);
    expect(row.classList.contains('container')).toBe(false);
  });
});

describe('Aldente Verify', () => {
  it('shows both loops, each ending on its result', async () => {
    const { default: VerifyLoops } = await import('../../src/components/product/VerifyLoops.astro');
    const doc = parse(await container.renderToString(VerifyLoops));
    expect([...doc.querySelectorAll('.loop__title')].map((t) => t.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '1. Check & Prevent',
      '2. Dispute & Recover',
    ]);
    expect([...doc.querySelectorAll('.loop__result b')].map((b) => b.textContent)).toEqual(['87%', 'Reversed']);
  });

  it('tells Dispute & Recover in four steps and ships the finished story for no-JS and reduced motion', async () => {
    const { default: DisputeRecover } = await import('../../src/components/product/DisputeRecover.astro');
    const doc = parse(await container.renderToString(DisputeRecover));
    expect([...doc.querySelectorAll('.dispute__copy b')].map((b) => b.textContent)).toEqual([
      'Claim comes in',
      'Proof found',
      'Dispute sent',
      'Money back',
    ]);
    const beats = doc.querySelector('scroll-beats')!;
    expect(beats.getAttribute('data-beats')).toBe('4');
    expect(beats.getAttribute('data-beat')).toBe('4');
  });
});

describe('How we start', () => {
  it('lists the rollout weeks from one source, as cards or as a list', async () => {
    const { default: RolloutWeeks } = await import('../../src/components/ui/RolloutWeeks.astro');
    const { ROLLOUT } = await import('../../src/data/rollout');
    const cards = parse(await container.renderToString(RolloutWeeks));
    expect([...cards.querySelectorAll('.weeks > li .weeks__when')].map((w) => w.textContent)).toEqual(ROLLOUT.map((w) => w.when));
    const list = parse(await container.renderToString(RolloutWeeks, { props: { layout: 'list' } }));
    expect(list.querySelectorAll('.steps > li')).toHaveLength(ROLLOUT.length);
  });
});
