import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import LegalPage from '../../src/components/site/LegalPage.astro';

let container: AstroContainer;

beforeAll(async () => {
  // BaseLayout builds canonical and og:image URLs from the site, as in astro.config.
  container = await AstroContainer.create({ astroConfig: { site: 'https://aldenteai.com' } });
});

const parser = new new Window().DOMParser();
const parse = (html: string) => parser.parseFromString(html, 'text/html') as unknown as Document;

const props = {
  title: 'Privacy policy',
  muted: 'In plain words.',
  description: 'How we handle personal information.',
  lead: 'What we collect.',
  updated: '2026-10-06',
  sections: [
    { id: 'who-we-are', title: 'Who we are and what this covers', toc: 'Who we are' },
    { id: 'sharing', title: 'Sharing' },
  ],
};
const slots = {
  summary: '<ul><li>We sell nothing.</li></ul>',
  'who-we-are': '<p>Aldente AI runs this site.</p><h3>Scope</h3><p>Website only.</p>',
  sharing: '<p>Only with processors.</p>',
};

const render = (overrides: Partial<typeof props> = {}, slotOverrides: Record<string, string> = slots) =>
  container.renderToString(LegalPage, {
    props: { ...props, ...overrides },
    slots: slotOverrides,
    request: new Request('https://aldenteai.com/privacy'),
  });

describe('LegalPage', () => {
  it('renders the hero with the updated date and the meta description', async () => {
    const doc = parse(await render());
    expect(doc.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Privacy policy. In plain words.');
    expect(doc.querySelector('.page-hero__lead')?.textContent).toBe('What we collect. Updated 6 October 2026.');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('How we handle personal information.');
  });

  it('builds the contents from the sections, each link pointing at its h2', async () => {
    const doc = parse(await render());
    const links = [...doc.querySelectorAll('.legal__toc a')];
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Who we are', '#who-we-are'],
      ['Sharing', '#sharing'],
    ]);
    for (const link of links) {
      expect(doc.getElementById(link.getAttribute('href')!.slice(1))?.tagName).toBe('H2');
    }
    expect(doc.querySelector('nav.legal__toc')?.getAttribute('aria-labelledby')).toBe('legal-toc-title');
  });

  it('puts each slot under its own h2, in order, with headings h1 > h2 > h3', async () => {
    const doc = parse(await render());
    const sections = [...doc.querySelectorAll('.legal__section')];
    expect(sections.map((s) => s.querySelector('h2')?.textContent)).toEqual(['Who we are and what this covers', 'Sharing']);
    expect(sections[0].querySelector('.legal__prose')?.innerHTML).toContain('<p>Aldente AI runs this site.</p>');
    expect(sections[1].textContent).toContain('Only with processors.');
    const levels = [...doc.querySelectorAll('main h1, main h2, main h3')].map((h) => Number(h.tagName[1]));
    expect(levels).toEqual([1, 2, 2, 3, 2]);
  });

  it('shows the summary in a card only when the summary slot is filled', async () => {
    const doc = parse(await render());
    const summary = doc.querySelector('.legal__summary');
    expect(summary?.classList.contains('card')).toBe(true);
    expect(summary?.querySelector('h2')?.textContent?.trim()).toBe('The short version');
    expect(summary?.textContent).toContain('We sell nothing.');

    const { summary: _omit, ...withoutSummary } = slots;
    const bare = parse(await render({}, withoutSummary));
    expect(bare.querySelector('.legal__summary')).toBeNull();
    expect(bare.querySelector('.legal__grid--summary')).toBeNull();
  });

  it('fails the build when a section has no body, an id repeats or an id is not a slug', async () => {
    const { sharing: _omit, ...missing } = slots;
    await expect(render({}, missing)).rejects.toThrow(/sharing/);
    await expect(
      render({
        sections: [
          { id: 'sharing', title: 'A' },
          { id: 'sharing', title: 'B' },
        ],
      }),
    ).rejects.toThrow(/used twice/);
    await expect(render({ sections: [{ id: 'Who We Are', title: 'A' }] })).rejects.toThrow(/slug/);
  });
});
