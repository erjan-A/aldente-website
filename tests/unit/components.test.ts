import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import Analytics from '../../src/components/home/Analytics.astro';
import ProductTour from '../../src/components/home/ProductTour.astro';
import SectionHeader from '../../src/components/ui/SectionHeader.astro';
import Playbooks from '../../src/components/home/Playbooks.astro';
import Voices from '../../src/components/home/Voices.astro';
import PlanGrid from '../../src/components/pricing/PlanGrid.astro';
import Header from '../../src/components/site/Header.astro';
import SlackMessage from '../../src/components/slack/SlackMessage.astro';
import SlackWindow from '../../src/components/slack/SlackWindow.astro';
import { PLAYBOOKS } from '../../src/data/playbooks';
import { FOOTER, NAV_GROUPS, SITE, isNavMenu } from '../../src/data/site';

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

// Astro renders in Node; happy-dom only parses the output.
const parser = new new Window().DOMParser();
const parse = (html: string) => parser.parseFromString(html, 'text/html') as unknown as Document;

describe('SlackWindow', () => {
  it('renders the active channel and the composer', async () => {
    const html = await container.renderToString(SlackWindow, {
      props: { active: 'hr-ops' },
      slots: { default: '<p>message</p>' },
    });
    const doc = parse(html);
    expect(doc.querySelector('[data-slack-channel]')?.textContent).toBe('hr-ops');
    expect(doc.querySelector('[data-slack-composer]')?.textContent).toBe('Message #hr-ops');
    expect(doc.querySelector('figure')?.getAttribute('aria-label')).toBe('Aldo in Slack');
    expect(html).toContain('<p>message</p>');
  });

  it('stays minimal, as the design system asks: no sidebar, no title bar with search, no member count', async () => {
    const html = await container.renderToString(SlackWindow, { props: { active: 'hr-ops' } });
    const doc = parse(html);
    expect(doc.querySelector('.slack-window__sidebar, .slack-window__top, .slack-window__search, .slack-window__members')).toBeNull();
    expect(doc.body.textContent).not.toContain('Search');
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

  it('shows the frame each Playbook sends: a real photo per kind, only the first one visible', async () => {
    const doc = parse(await container.renderToString(Playbooks));
    const shots = [...doc.querySelectorAll<HTMLElement>('.pb__card [data-shot]')];
    expect(shots.map((s) => s.dataset.shot).sort()).toEqual([...new Set(PLAYBOOKS.map((p) => p.shot))].sort());
    expect(shots.filter((s) => !s.hasAttribute('hidden')).map((s) => s.dataset.shot)).toEqual([PLAYBOOKS[0]!.shot]);
    for (const shot of shots) {
      expect(shot.querySelector('img')?.getAttribute('alt'), shot.dataset.shot).toBeTruthy();
      expect(shot.querySelector('.slack-media__label')?.textContent, shot.dataset.shot).toBeTruthy();
    }
    // Only the frames the listed Playbooks use are rendered.
    const hr = parse(await container.renderToString(Playbooks, { props: { team: 'HR' } }));
    expect([...hr.querySelectorAll<HTMLElement>('[data-shot]')].map((s) => s.dataset.shot)).toEqual(['exit']);
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
  it('Hero: the audience, the vision AI claim, book or watch first, what the demo is, and the product panel', async () => {
    const { default: Hero } = await import('../../src/components/home/Hero.astro');
    const html = await container.renderToString(Hero);
    const doc = parse(html);
    const h1 = doc.querySelector('h1')!;
    expect(h1.previousElementSibling?.textContent).toBe('For restaurant chains');
    expect(h1.textContent).toBe('Vision AI for every order.');
    expect(h1.querySelector('span')?.textContent).toBe('Vision AI');
    // No number in the headline: three products share it.
    expect(h1.textContent).not.toMatch(/\d/);
    const actions = [...doc.querySelectorAll('.hero__actions a')];
    expect(actions.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Book a live demo', '/demo'],
      ['Watch it work', '/media/watch.mp4'],
    ]);
    expect(actions[1]!.hasAttribute('data-watch')).toBe(true);
    // Two compact buttons and nothing under them: the footage follows at once.
    expect(actions.every((a) => a.classList.contains('btn--sm'))).toBe(true);
    expect(doc.querySelector('.hero__facts')).toBeNull();
    expect(html).not.toContain('500 ms');
    expect(html).not.toContain('Chief of Staff');
  });

  it('HeroMedia: three clips (Verify, Dispute, Tab) as tabs; Verify shows first, and each plays for its own length', async () => {
    const { default: HeroMedia } = await import('../../src/components/home/HeroMedia.astro');
    const html = await container.renderToString(HeroMedia);
    const doc = parse(html);
    expect(doc.querySelector('media-tabs')?.getAttribute('data-autoplay')).toBe('13800');
    const tabs = [...doc.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.textContent?.trim())).toEqual(['Verify', 'Dispute', 'Tab']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    const panels = [...doc.querySelectorAll('[role="tabpanel"]')];
    expect(panels.map((p) => p.hasAttribute('hidden'))).toEqual([false, true, true]);
    expect(panels.map((p) => p.getAttribute('data-duration'))).toEqual(['13800', '10800', '14800']);
    // The tabs come before the views they switch. No words sit under a clip: each one carries its own name.
    expect(doc.querySelector('[role="tablist"]')!.compareDocumentPosition(panels[0]!) & 4).toBe(4);
    expect(doc.querySelector('figcaption')).toBeNull();
    expect(html).not.toMatch(/[Cc]oncept|[Ss]ample|generated footage/);
    // Nor does a caption insist that footage is real: that plants the doubt it answers.
    expect(html).not.toMatch(/\breal\b/i);
    for (const [i, tab] of tabs.entries()) {
      expect(tab.getAttribute('aria-controls')).toBe(panels[i]!.id);
      expect(panels[i]!.getAttribute('aria-labelledby')).toBe(tab.id);
    }
    const videos = panels.map((p) => p.querySelector('video')!);
    expect(videos.map((v) => v.getAttribute('src'))).toEqual(['/media/verify.mp4', '/media/dispute.mp4', '/media/tab.mp4']);
    // Each clip works without the script: controls, a poster, a text alternative, silent and inline.
    for (const video of videos) {
      for (const attr of ['controls', 'muted', 'loop', 'playsinline', 'poster', 'aria-label']) expect(video.hasAttribute(attr), attr).toBe(true);
    }
    expect(videos.map((v) => v.getAttribute('preload'))).toEqual(['metadata', 'none', 'none']);
    expect(videos[2]!.getAttribute('aria-label')).toMatch(/^Aldente Tab: an overhead camera/);
    expect(html).not.toMatch(/[Rr]eversed|won back|Won back/);
  });

  it('LogoBand: the orders-served line and the logos as their own surface band', async () => {
    const { default: LogoBand } = await import('../../src/components/home/LogoBand.astro');
    const doc = parse(await container.renderToString(LogoBand));
    const band = doc.querySelector('section')!;
    expect(band.classList.contains('tone-surface')).toBe(true);
    expect(band.getAttribute('aria-label')).toBe('Customers');
    expect(band.querySelector('.proof__line')?.textContent).toContain('orders served across 200+ restaurant locations.');
    // Six customers in a moving row: the three chains mixed with the three newer ones. The second set only
    // exists to close the loop, so it is hidden from assistive technology.
    const sets = [...band.querySelectorAll('.marquee__track > li.marquee__logo')];
    const first = sets.filter((li) => li.getAttribute('aria-hidden') !== 'true');
    expect(first.map((li) => li.querySelector('img')?.getAttribute('alt'))).toEqual(['McDonald’s', 'Melt Shack', 'KFC', 'Birdline Chicken', 'Burger King', 'Limepost Tacos']);
    expect(sets.length).toBe(first.length * 2);
    expect(sets.every((li) => li.querySelector('img')?.getAttribute('loading') === 'eager')).toBe(true);
    // On a phone the orders line rides in the same row, so text and logos are one line.
    expect(band.querySelector('.marquee__track > li.marquee__text')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('2M+ orders served across 200+ restaurant locations.');
  });

  it('section titles are one plain sentence each, the second half muted', async () => {
    const title = async (path: string) => {
      const { default: Section } = await import(/* @vite-ignore */ path);
      return parse(await container.renderToString(Section)).querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim();
    };
    expect(await title('../../src/components/home/Problem.astro')).toBe('Delivery apps refund the guest, and the store pays, right or wrong.');
    expect(await title('../../src/components/home/Results.astro')).toBe('Most errors stop at the counter, and the team gets its hours back.');
    expect(await title('../../src/components/home/Calculator.astro')).toBe('Each wrong order is a full refund, every day, at every location.');
  });

  it('Results: one quote per product, the third from a serving-line chain about Aldente Tab', async () => {
    const { default: Results } = await import('../../src/components/home/Results.astro');
    const doc = parse(await container.renderToString(Results));
    const cards = [...doc.querySelectorAll('.tile')];
    expect(cards.map((c) => c.querySelector('.pill')?.textContent?.trim())).toEqual(['Aldente Verify', 'Aldente Dispute', 'Aldente Tab']);
    expect(cards[2]!.querySelector('blockquote')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      '“Our lines are moving faster, and every box on our serving line is tracked.”',
    );
    // Signed by role and chain type, never by name.
    expect(cards[2]!.querySelector('figcaption')?.textContent?.replace(/\s+/g, ' ').trim()).toMatch(/^VP of Operations\s*Fast-casual bowl chain/);
  });

  it('Hero: who it is for in a pill with an icon, then one plain line per product, without icons', async () => {
    const { default: Hero } = await import('../../src/components/home/Hero.astro');
    const doc = parse(await container.renderToString(Hero));
    const pill = doc.querySelector('.hero__copy .pill')!;
    expect(pill.textContent?.trim()).toBe('For restaurant chains');
    expect(pill.querySelector('svg')).not.toBeNull();
    const lines = [...doc.querySelectorAll('.hero__lead > li')];
    expect(lines.map((li) => li.textContent?.trim())).toEqual([
      'Check every order before pickup.',
      'Answer every refund claim with proof.',
      'Ring up orders while staff build them.',
    ]);
    expect(doc.querySelector('.hero__lead svg')).toBeNull();
  });

  it('Cta: one action, "Book a live demo", and nothing under it', async () => {
    const { default: Cta } = await import('../../src/components/home/Cta.astro');
    const links = (doc: Document) =>
      [...doc.querySelectorAll('.cta__actions a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    const home = parse(await container.renderToString(Cta, { request: new Request('https://aldenteai.com/') }));
    expect(links(home)).toEqual([['Book a live demo', '/demo']]);
    const pricing = parse(await container.renderToString(Cta, { request: new Request('https://aldenteai.com/pricing.html') }));
    expect(links(pricing)).toEqual([['Book a live demo', '/demo']]);
    // The band ends on its button: no pricing link and no line about the next page.
    expect(home.querySelector('.cta__next')).toBeNull();
    expect(home.body.textContent).not.toMatch(/Compare plans|You pick a time/);
    // The slat wall behind the band is decoration: hidden from assistive technology, before the content.
    const sea = home.querySelector('.cta > slat-sea')!;
    expect(sea.getAttribute('aria-hidden')).toBe('true');
    expect(sea.nextElementSibling?.classList.contains('cta__inner')).toBe(true);
    expect(home.querySelector('.cta__mark')).toBeNull();
  });
});

describe('Analytics', () => {
  const heading = { title: 'What the cameras read,', muted: 'by location and hour.', lead: 'Every event adds up.' };

  it('renders its visible heading from title, and labels the section with it', async () => {
    const doc = parse(await container.renderToString(Analytics, { props: heading }));
    const h2 = doc.querySelector('h2')!;
    expect(h2.id).toBe('analytics-title');
    expect(h2.classList.contains('visually-hidden')).toBe(false);
    expect(h2.textContent?.replace(/\s+/g, ' ').trim()).toBe('What the cameras read, by location and hour.');
    expect(doc.querySelectorAll('h2')).toHaveLength(1);
    expect(doc.querySelector('section')?.getAttribute('aria-labelledby')).toBe(h2.id);
    expect(doc.querySelector('section')?.classList.contains('analytics--flush')).toBe(false);
  });

  it('gives every metric an icon and a preview that screen readers skip', async () => {
    const doc = parse(await container.renderToString(Analytics, { props: heading }));
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
  it('OrderStory: keeps a visible h2 from title above the step titles, and labels the section with it', async () => {
    const { default: OrderStory } = await import('../../src/components/home/OrderStory.astro');
    const doc = parse(await container.renderToString(OrderStory, { props: { title: 'How an order', muted: 'is verified.', product: null } }));
    const h2 = doc.querySelector('h2')!;
    expect(h2.textContent?.replace(/\s+/g, ' ').trim()).toBe('How an order is verified.');
    expect(h2.classList.contains('visually-hidden')).toBe(false);
    expect(doc.querySelectorAll('h2')).toHaveLength(1);
    expect(doc.querySelector('section')?.getAttribute('aria-labelledby')).toBe(h2.id);
    expect(doc.querySelector('section')?.hasAttribute('aria-label')).toBe(false);
    expect(doc.querySelector('.pill')).toBeNull();
  });

  it('builds card-like blocks from the shared Card', async () => {
    const analytics = parse(await container.renderToString(Analytics, { props: { title: 'What the cameras read' } }));
    expect(analytics.querySelectorAll('.cams > li.cam')).toHaveLength(4);
  });

  it('ProductTour: all four products in one contents list, each with the same block', async () => {
    const html = await container.renderToString(ProductTour);
    const doc = parse(html);
    expect(doc.querySelector('section')?.id).toBe('products');
    const nav = doc.querySelector('toc-spy nav[aria-label="Products"]')!;
    expect(nav.querySelector('.toc__label')).toBeNull();
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#verify', '#dispute', '#tab', '#playbooks']);
    expect(links.map((a) => a.querySelector('.toc__name')?.textContent)).toEqual(['Verify', 'Dispute', 'Tab', 'Playbooks']);
    expect(links.map((a) => a.querySelector('.toc__does')?.textContent)).toEqual([
      'Order check',
      'Refund evidence',
      'Line ring-up',
      'Checks in Slack',
    ]);
    expect(links.every((a) => a.getAttribute('data-track') === 'TOC click')).toBe(true);
    // The section title names what the products do with an order, not the hardware.
    expect(doc.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Checked, proven, rung up. What vision AI does with every order.');
    expect(doc.body.textContent).not.toMatch(/tablet/i);
    const blocks = [...doc.querySelectorAll('article.block')];
    expect(blocks.map((b) => b.id)).toEqual(['verify', 'dispute', 'tab', 'playbooks']);
    // Tab rings up the order and tracks the ingredient boxes on the line; its scene shows the box that runs low.
    expect([...doc.querySelectorAll('#tab .block__feature b')].map((b) => b.textContent)).toEqual([
      'No keying at the register',
      'Ingredient box tracking',
      'Any POS, any hardware',
    ]);
    // No feature line repeats its own title or the sentence above the list.
    const features = [...doc.querySelectorAll('.block__feature')].map((f) => [f.querySelector('b')!.textContent!, f.querySelector('span')!.textContent!]);
    for (const [title, line] of features) expect(line.toLowerCase(), title).not.toContain(title.toLowerCase());
    expect(doc.querySelector('#dispute .block__text')?.textContent).toBe(
      'Delivery apps charge the store for refund claims, right or wrong. Aldente Dispute builds the evidence pack for each claim.',
    );
    // The contents list under the title already says what is in the section: no lead repeats it.
    expect(doc.querySelector('.tour .head__lead')).toBeNull();
    // Tab's panel plays the walkthrough: the serving line, the camera and the register filling in.
    const walk = doc.querySelector('#tab loop-video video')!;
    expect(walk.getAttribute('src')).toBe('/media/tab-line.mp4');
    // Under the line, the product's own screen in our style, in step with the clip: two boxes, then the steam table.
    const screen = doc.querySelector('#tab loop-video .reg')!;
    expect([...screen.querySelectorAll('.reg__head b')].map((b) => b.textContent)).toEqual(['Boxes on the line', 'Steam table']);
    expect([...screen.querySelectorAll('.reg__id b')].map((b) => b.textContent)).toEqual(['B1 · #4401', 'B2 · #4402']);
    expect([...screen.querySelectorAll('.reg__box')[0]!.querySelectorAll('.reg__items li')].map((li) => [li.textContent?.trim(), li.getAttribute('data-at')])).toEqual([
      ['Chow mein', '2.5'],
      ['Sesame chicken', '5'],
      ['Beef broccoli', '10.5'],
    ]);
    expect(screen.querySelectorAll('.reg__pans > li')).toHaveLength(3);
    // No counts beside the two labels, and every pan shows how full it is as a bar.
    expect([...screen.querySelectorAll('.reg__head')].every((head) => head.children.length === 1)).toBe(true);
    expect(screen.querySelectorAll('.reg__pans .reg__bar').length).toBeGreaterThanOrEqual(3);
    // No headline inside the panel: the block's own title says it.
    expect(doc.querySelector('#tab .block__media h4, #tab .block__media h3')).toBeNull();
    expect(screen.textContent).not.toMatch(/\$\d/);
    for (const attr of ['muted', 'loop', 'playsinline', 'controls', 'poster', 'aria-label']) expect(walk.hasAttribute(attr), attr).toBe(true);
    expect(walk.getAttribute('preload')).toBe('none');
    expect(blocks.map((b) => b.querySelector('h3')?.textContent)).toEqual([
      'Every order checked before pickup.',
      'Every refund claim answered with proof.',
      'Orders rung up while staff build them.',
      'Ask once in Slack, and it runs every shift.',
    ]);
    expect(blocks.map((b) => b.querySelector('.pill')?.textContent?.trim())).toEqual([
      'Aldente Verify',
      'Aldente Dispute',
      'Aldente Tab',
      'Aldente Playbooks',
    ]);
    // Every product is a full block with three features; none is a compact card.
    expect(blocks.map((b) => b.querySelectorAll('.block__features > li').length)).toEqual([3, 3, 3, 3]);
    expect(doc.querySelector('.block--compact')).toBeNull();
    expect(blocks.map((b) => b.querySelector('.block__stat')?.textContent ?? null)).toEqual([
      'Wrong orders: from 14–16 a day to about 2',
      '1–2 hours a day saved on searching footage',
      '+8% orders in the peak hour · 225-store chain',
      null,
    ]);
    expect(blocks.map((b) => b.querySelector('a.btn:not(.btn--primary)')?.getAttribute('href'))).toEqual([
      '/order-verification',
      '/order-verification#dispute',
      '/tab',
      '/playbooks',
    ]);
    // Each lead product asks for the booking where the interest forms; its page is the quieter link beside it.
    expect(blocks.map((b) => b.querySelector('a.btn--primary')?.getAttribute('href') ?? null)).toEqual([
      '/demo?plan=verification',
      '/demo?plan=verification',
      '/demo',
      '/demo?plan=starter',
    ]);
    expect(blocks.every((b) => b.querySelector('a.btn--link')?.textContent?.includes('Learn more'))).toBe(true);
    // Each block's scene is decoration that plays in steps and pauses off screen.
    const media = blocks.map((b) => b.querySelector('.block__media')!);
    const clips = ['verify', 'tab'];
    const drawn = media.filter((_, n) => !clips.includes(blocks[n]!.id));
    expect(drawn.every((m) => m.getAttribute('aria-hidden') === 'true' && m.hasAttribute('data-seq') && m.hasAttribute('data-loop'))).toBe(true);
    // The Verify and Tab panels hold real clips with a name, so they are not hidden from assistive technology.
    expect(media[0]!.hasAttribute('aria-hidden')).toBe(false);
    expect(media[2]!.hasAttribute('aria-hidden')).toBe(false);
    // Verify's panel plays the packing station: staff at the counter above, the product's own screen below.
    const station = doc.querySelector('#verify loop-video video')!;
    expect(station.getAttribute('src')).toBe('/media/verify-station.mp4');
    for (const attr of ['muted', 'loop', 'playsinline', 'controls', 'poster', 'aria-label']) expect(station.hasAttribute(attr), attr).toBe(true);
    expect(station.getAttribute('preload')).toBe('none');
    expect(doc.querySelector('#verify .tl__step')).toBeNull();
    // Panels are the design system's Card, not hand-made boxes.
    expect(media.every((m) => m.classList.contains('card'))).toBe(true);
    // Playbooks is shown as Slack: the request, the saved Playbook, then the alert with the camera frame.
    const chat = doc.querySelector('#playbooks .chat')!;
    expect(chat.querySelector('.chat__head')?.textContent).toBe('# floor-team');
    expect([...chat.querySelectorAll('.chat__pb dt')].map((d) => d.textContent)).toEqual(['When', 'Where', 'Tell']);
    expect(chat.querySelector('.chat__photo img')).not.toBeNull();
    expect(doc.body.textContent).not.toMatch(/Aldente Vision|Chief of Staff/);
  });

  it('ProductTour: Dispute shows evidence, never an outcome, and nothing names a speed', async () => {
    const html = await container.renderToString(ProductTour);
    const doc = parse(html);
    expect([...doc.querySelectorAll('#dispute .st')].map((st) => st.textContent?.trim())).toEqual(['New claim', 'Evidence ready']);
    expect(html).not.toMatch(/Reversed|[Ww]on back|500 ms|half a second/);
  });

  it('Results: one number per lead product with the maths, then three quotes by role, one per product they speak about', async () => {
    const { default: Results } = await import('../../src/components/home/Results.astro');
    const doc = parse(await container.renderToString(Results));
    const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
    const tiles = [...doc.querySelectorAll('.tile')];
    expect(tiles.map((t) => text(t.querySelector('.pill')))).toEqual(['Aldente Verify', 'Aldente Dispute', 'Aldente Tab']);
    expect(tiles.map((t) => text(t.querySelector('.tile__value')))).toEqual([
      '87% fewer wrong orders',
      '1–2 hours a day saved',
      '8% more orders at peak',
    ]);
    // No money footnote under the first result: the three results read the same.
    expect(doc.querySelector('.results__note')).toBeNull();
    expect(doc.body.textContent).not.toMatch(/\$74K/);
    expect(tiles.every((t) => t.classList.contains('card'))).toBe(true);
    // Each product is one card: its measured result on top, its operator's words below. One pill names both.
    const quotes = tiles.map((t) => t.querySelector('.quote')!);
    expect(quotes.every(Boolean)).toBe(true);
    expect(doc.querySelectorAll('.quote')).toHaveLength(3);
    expect(tiles.every((t) => t.querySelectorAll('.pill').length === 1)).toBe(true);
    expect(tiles.every((t) => t.querySelector('.tile__result')!.compareDocumentPosition(t.querySelector('.quote')!) & 4)).toBe(true);
    expect(doc.querySelector('.results__quotes')).toBeNull();
    expect(doc.body.textContent).not.toMatch(/tablet/i);
    expect(quotes.map((q) => text(q.querySelector('figcaption b')))).toEqual(['Director of Operations', 'Head of Off-Premise', 'VP of Operations']);
    // One quote per lead product, and none names a person.
    expect(doc.body.textContent).not.toMatch(/Aldo|Chief of Staff/);
  });

  it('Calculator: four numbers in, three results out, shipped with the example’s result', async () => {
    const { default: Calculator } = await import('../../src/components/home/Calculator.astro');
    const html = await container.renderToString(Calculator);
    const doc = parse(html);
    expect(doc.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Each wrong order is a full refund, every day, at every location.');
    const inputs = [...doc.querySelectorAll('cost-calculator input[type="number"]')];
    expect(inputs.map((i) => [i.getAttribute('name'), i.getAttribute('value')])).toEqual([
      ['locations', '25'],
      ['ordersPerDay', '200'],
      ['averageCheck', '17'],
      ['errorRate', '7'],
    ]);
    // Every field has its label.
    expect(inputs.every((i) => i.closest('label')?.querySelector('span')?.textContent)).toBe(true);
    expect([...doc.querySelectorAll('output')].map((o) => [o.getAttribute('data-out'), o.textContent])).toEqual([
      ['wrong', '350'],
      ['refunds', '$2.2M'],
      ['saved', '$1.9M'],
      ['perLocation', '$76K'],
    ]);
    // Every field says what it accepts.
    expect(inputs.every((i) => i.hasAttribute('min') && i.hasAttribute('max'))).toBe(true);
    // No note and no lead: the card is the whole section.
    expect(doc.querySelector('.calc__note')).toBeNull();
    expect(doc.querySelector('.head__lead')).toBeNull();
    expect(doc.body.textContent).not.toMatch(/An estimate/);
    expect(doc.querySelector('.calc__result--saved > span')?.textContent).toBe('Saved a year with Verify and Dispute');
    // It sits on the lighter ground, after the dark products section, in the design system's Card.
    expect(doc.querySelector('section')?.classList.contains('tone-surface')).toBe(true);
    expect(doc.querySelector('cost-calculator')?.closest('.card')).not.toBeNull();
    expect(doc.querySelector('a.btn--primary')?.getAttribute('href')).toBe('/demo?plan=verification');
    // The second field says which orders it counts, since no note does.
    expect([...doc.querySelectorAll('.calc__field > span:first-child')].map((l) => l.textContent)).toEqual([
      'Locations',
      'Delivery and drive-thru orders a day, per location',
      'Average check',
      'Orders that go out wrong',
    ]);
  });

  it('Home FAQ: the questions a buyer asks before booking', async () => {
    const { HOME_FAQ } = await import('../../src/data/site');
    expect(HOME_FAQ.map((f) => f.q)).toEqual([
      'What do we need to install?',
      'Does it work with our POS and delivery apps?',
      'Do staff have to change how they pack?',
      'How long until a location is live?',
      'Can we start with one location?',
      'What happens to our footage?',
    ]);
    const all = HOME_FAQ.map((f) => f.a).join(' ');
    // Pricing is not a home question, and the POS answer is plain: any POS system.
    expect(HOME_FAQ.map((f) => f.q).join(' ')).not.toMatch(/priced|pricing/i);
    expect(HOME_FAQ.find((f) => f.q.includes('POS'))?.a).toMatch(/^Yes\. Aldente works with any POS system\./);
    expect(all).not.toMatch(/tablet/i);
    expect(all).not.toMatch(/\$\d|500 ms|[Rr]eversed|won back/);
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

  it('gives topic sections a plain pill, as the decks do ("Customer results")', async () => {
    const doc = parse(await container.renderToString(SectionHeader, { props: { title: 'Results', label: 'Customer results' } }));
    const pill = doc.querySelector('.pill')!;
    expect(pill.textContent?.trim()).toBe('Customer results');
    expect(pill.classList.contains('pill--plain')).toBe(true);
    expect(pill.querySelector('svg, img')).toBeNull();
  });

  it('can rename a product pill and keep its cue ("Aldo in Slack")', async () => {
    const doc = parse(await container.renderToString(SectionHeader, { props: { title: 'Aldo', product: 'playbooks', label: 'Aldo in Slack' } }));
    const pill = doc.querySelector('.pill')!;
    expect(pill.textContent?.trim()).toBe('Aldo in Slack');
    expect(pill.querySelector('svg')).not.toBeNull();
  });

  it('names each home section above its title', async () => {
    const label = async (path: string) => {
      const { default: Section } = await import(/* @vite-ignore */ path);
      return parse(await container.renderToString(Section))
        .querySelector('.pill')
        ?.textContent?.trim();
    };
    expect(await label('../../src/components/home/ProductTour.astro')).toBe('Products');
    expect(await label('../../src/components/home/Problem.astro')).toBe('The problem');
    expect(await label('../../src/components/home/Results.astro')).toBe('Customer results');
    expect(await label('../../src/components/home/Calculator.astro')).toBe('Calculator');
    expect(await label('../../src/components/home/CaseStudy.astro')).toBe('Customer results');
    expect(await label('../../src/components/home/Voices.astro')).toBe('From our customers');
  });
});

describe('UI foundation', () => {
  it('Button: primary by default, link variant with an arrow, extra attributes passed through', async () => {
    const { default: Button } = await import('../../src/components/ui/Button.astro');
    const primary = parse(
      await container.renderToString(Button, { props: { href: '/demo', 'data-cta': 'hero' }, slots: { default: 'Book a live demo' } }),
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
      await container.renderToString(Card, { props: { as: 'li', pad: 'l', radius: 'xl', id: 'plan-vision' } }),
    );
    const el = li.querySelector('li.card')!;
    expect(el.className).toContain('card--pad-l');
    expect(el.className).toContain('card--r-xl');
    expect(el.id).toBe('plan-vision');
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
      await container.renderToString(Detection, { props: { tone: 'alert', label: 'Table 6', box: [26, 64, 34, 28], place: 'bottom-start' } }),
    );
    const det = doc.querySelector('.det')!;
    expect(det.getAttribute('style')).toBe('left:26%;top:64%;width:34%;height:28%');
    expect(det.className).toContain('det--alert');
    expect(det.className).toContain('det--bottom-start');
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

describe('Icon', () => {
  it('draws thin lines at large sizes and heavier ones as it gets small, so every icon reads alike', async () => {
    const { default: Icon } = await import('../../src/components/ui/Icon.astro');
    const stroke = async (size?: number) =>
      parse(await container.renderToString(Icon, { props: { name: 'check', ...(size ? { size } : {}) } }))
        .querySelector('svg')
        ?.getAttribute('stroke-width');
    expect(await stroke()).toBe('1.75');
    expect(await stroke(22)).toBe('1.75');
    expect(await stroke(18)).toBe('2');
    expect(await stroke(16)).toBe('2');
    expect(await stroke(14)).toBe('2.5');
    expect(await stroke(12)).toBe('2.5');
  });
});

describe('Voices', () => {
  it('shows the featured quote and the two beside it', async () => {
    const doc = parse(await container.renderToString(Voices));
    expect(doc.querySelectorAll('blockquote')).toHaveLength(3);
    expect(doc.querySelector('.voices__side')?.querySelectorAll('figure')).toHaveLength(2);
  });

  it('quotes customers from different chain formats, never by name', async () => {
    const doc = parse(await container.renderToString(Voices, { props: { tone: 'dark' } }));
    expect(doc.querySelector('section')?.classList.contains('tone-dark')).toBe(true);
    expect([...doc.querySelectorAll('figcaption')].map((f) => f.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Director of OperationsMulti-brand restaurant group',
      'Head of Off-Premise · QSR chain',
      'VP of Operations · Fast-casual bowl chain',
    ]);
  });
});

describe('PlanGrid', () => {
  it('lists the three plans, Aldo included in both products, with no price or badge', async () => {
    const doc = parse(await container.renderToString(PlanGrid));
    const names = [...doc.querySelectorAll('.plan__name')].map((n) => n.textContent);
    expect(names).toEqual(['Aldente Verify + Dispute', 'Aldente Playbooks', 'Enterprise']);
    expect([...doc.querySelectorAll('.plan')].map((p) => Boolean(p.querySelector('.plan__aldo')))).toEqual([true, true, false]);
    expect(doc.body.textContent).not.toContain('Most chosen');
    expect(doc.body.textContent).not.toMatch(/\$\d|per location \/ month|free/i);
  });

  it('gives every plan the same booking button: orange, same size', async () => {
    const doc = parse(await container.renderToString(PlanGrid));
    const ctas = [...doc.querySelectorAll('.plan a.btn')];
    expect(ctas.map((a) => a.textContent?.trim())).toEqual(['Book a live demo', 'Book a live demo', 'Talk to us']);
    for (const cta of ctas) expect([...cta.classList].filter((c) => /^btn--/.test(c)).sort()).toEqual(['btn--md', 'btn--primary']);
  });
});

describe('Mobile layouts', () => {

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

  it('CookieConsent: one short, generic line and one row of choices, still a region named "Cookies"', async () => {
    const { default: CookieConsent } = await import('../../src/components/site/CookieConsent.astro');
    const doc = parse(await container.renderToString(CookieConsent));
    const region = doc.querySelector('cookie-consent section');
    expect(doc.getElementById(region?.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Cookies');
    // No vendor names in the pop-up: the cookie policy lists them.
    expect(doc.querySelector('.consent__text')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'We use cookies to run this site and for marketing. Cookie policy',
    );
    expect(doc.body.textContent).not.toMatch(/RB2B|Calendly/);
    expect([...doc.querySelectorAll('.consent__actions button')].map((b) => b.getAttribute('data-consent'))).toEqual([
      'reject',
      'accept',
      'save',
      'settings',
    ]);
    // Marketing (Calendly) is the only choice.
    expect([...doc.querySelectorAll('[data-consent-settings] input[name]')].map((i) => i.getAttribute('name'))).toEqual(['marketing']);
  });

  it('OrderStory: the sticky visual is marked for <scroll-story>, and each step keeps its time and text together', async () => {
    const { default: OrderStory } = await import('../../src/components/home/OrderStory.astro');
    const doc = parse(await container.renderToString(OrderStory, { props: { title: 'How an order', muted: 'is verified.' } }));
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

  it('lists Products and Solutions as dropdowns, then About us and Pricing', async () => {
    const doc = await render('/pricing');
    const desktop = doc.querySelector('nav[aria-label="Main"]')!;
    expect([...desktop.querySelectorAll('.nav__top')].map(text)).toEqual(['Products', 'Solutions', 'About us', 'Pricing']);
    expect([...desktop.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(allHrefs);
    for (const button of desktop.querySelectorAll('button')) {
      expect(button.getAttribute('aria-expanded')).toBe('false');
      const panel = doc.getElementById(button.getAttribute('aria-controls')!);
      expect(panel?.closest('li')).toBe(button.closest('li'));
    }
    // Each dropdown row carries its one-line note.
    const verify = desktop.querySelector('a[href="/order-verification"]');
    expect(text(verify)).toBe('Aldente Verify Every order checked at the packing station');
  });

  it('marks the menu that holds a child page, and the child link inside it', async () => {
    const verify = await render('/order-verification');
    expect([...verify.querySelectorAll('nav[aria-label="Main"] .is-active')].map(text)).toEqual(['Products']);
    expect(verify.querySelector('#nav-products a[aria-current="page"]')?.getAttribute('href')).toBe('/order-verification');

    const tab = await render('/tab.html');
    expect([...tab.querySelectorAll('nav[aria-label="Main"] .is-active')].map(text)).toEqual(['Products']);
    expect(tab.querySelector('#nav-products a[aria-current="page"]')?.getAttribute('href')).toBe('/tab');

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
    expect([...mobile.querySelectorAll('.mmenu__title')].map(text)).toEqual(['Products', 'Solutions']);
    const links = [...mobile.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([...allHrefs, '/demo']);
    expect(text(links.at(-1))).toBe('Book a live demo');
    expect(mobile.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/pricing');
  });

  it('books with a 44px header button, which jumps to the calendar on the booking page', async () => {
    const pricing = await render('/pricing');
    const cta = pricing.querySelector('.header__cta')!;
    expect(cta.classList.contains('btn--sm')).toBe(true);
    expect(cta.classList.contains('btn--primary')).toBe(true);
    expect(cta.getAttribute('href')).toBe('/demo');

    const demo = await render('/demo');
    const book = [...demo.querySelectorAll('a.btn')].filter((a) => text(a) === 'Book a live demo');
    expect(book.map((a) => a.getAttribute('href'))).toEqual(['#schedule', '#schedule']);
  });
});

describe('Footer', () => {
  it('renders the Legal column and keeps only the copyright and the cookie button in the legal row', async () => {
    const { default: Footer } = await import('../../src/components/site/Footer.astro');
    const doc = parse(await container.renderToString(Footer));
    const cols = doc.querySelector('nav[aria-label="Footer"]')!;
    expect([...cols.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(FOOTER.map((col) => col.title));
    const legal = [...cols.querySelectorAll('div')].find((col) => col.querySelector('h2')?.textContent === 'Legal')!;
    expect([...legal.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/privacy', '/terms', '/cookies']);
    const row = doc.querySelector('.footer__legal')!;
    expect(row.querySelectorAll('a')).toHaveLength(0);
    expect(row.querySelector('button[data-cookie-settings]')?.textContent).toBe('Cookie settings');
    expect(row.textContent).not.toMatch(/SOC 2|GDPR|Encrypted at rest/);
    // The divider sits inside the container's padding, so it spans the text column only.
    expect(row.parentElement?.classList.contains('container')).toBe(true);
    expect(row.classList.contains('container')).toBe(false);
  });

  it('is one ruled grid: the brand cell with its contacts, then the four link columns', async () => {
    const { default: Footer } = await import('../../src/components/site/Footer.astro');
    const doc = parse(await container.renderToString(Footer));
    const grid = doc.querySelector('.footer__grid')!;
    expect([...grid.children].map((c) => c.className.split(' ')[0])).toEqual(['footer__brand', 'footer__cols']);
    // Three ways to reach us, each a row with its icon: no pill button among them.
    const contacts = [...grid.querySelectorAll('.footer__contacts a')];
    expect(contacts.map((a) => a.getAttribute('href'))).toEqual(['mailto:support@aldenteai.com', SITE.phoneHref, SITE.linkedin]);
    expect(contacts.every((a) => a.querySelector('svg'))).toBe(true);
    expect(doc.querySelector('.footer__social')).toBeNull();
    // Product links carry their product's icon, as in the header menu.
    const product = [...grid.querySelectorAll('.footer__cols > div')][0]!;
    expect([...product.querySelectorAll('a')].map((a) => Boolean(a.querySelector('svg')))).toEqual([true, true, true, true]);
    // The wordmark is decoration.
    expect(doc.querySelector('.footer__mark')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Aldente Verify', () => {
  it('shows both loops, each ending on its result', async () => {
    const { default: VerifyLoops } = await import('../../src/components/product/VerifyLoops.astro');
    const doc = parse(await container.renderToString(VerifyLoops));
    expect([...doc.querySelectorAll('.loop__title')].map((t) => t.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '1. Aldente Verify',
      '2. Aldente Dispute',
    ]);
    expect([...doc.querySelectorAll('.loop__result b')].map((b) => b.textContent)).toEqual(['87%', 'Ready']);
  });

  it('tells Aldente Dispute in four steps under its own pill and ships the finished story for no-JS and reduced motion', async () => {
    const { default: DisputeRecover } = await import('../../src/components/product/DisputeRecover.astro');
    const doc = parse(await container.renderToString(DisputeRecover));
    expect(doc.querySelector('section')?.id).toBe('dispute');
    expect(doc.querySelector('.pill')?.textContent?.trim()).toBe('Aldente Dispute');
    expect([...doc.querySelectorAll('.dispute__copy b')].map((b) => b.textContent)).toEqual([
      'Claim comes in',
      'Clip found',
      'Evidence pack built',
      'Evidence ready',
    ]);
    expect(doc.body.textContent).not.toMatch(/[Rr]eversed|[Ww]on back|returned to/);
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
