import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { beforeAll, describe, expect, it } from 'vitest';

let container: AstroContainer;

beforeAll(async () => {
  // BaseLayout builds canonical and og:image URLs from the site, as in astro.config.
  container = await AstroContainer.create({ astroConfig: { site: 'https://aldenteai.com' } });
});

const parser = new new Window().DOMParser();
const parse = (html: string) => parser.parseFromString(html, 'text/html') as unknown as Document;
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const page = async (path: string, file: string) => {
  const { default: Page } = await import(`../../src/pages/${file}.astro`);
  return parse(await container.renderToString(Page, { request: new Request(`https://aldenteai.com${path}`) }));
};

describe('Cookie policy', () => {
  it('uses the legal page layout and keeps every category and note', async () => {
    const doc = await page('/cookies', 'cookies');
    expect(text(doc.querySelector('h1'))).toBe('Cookie policy. Kept short.');
    expect(text(doc.querySelector('.page-hero__lead'))).toMatch(/Updated 6\sOctober 2026\.$/);
    const sections = [...doc.querySelectorAll('.legal__section h2')];
    expect(sections.map(text)).toEqual(['Necessary', 'Marketing', 'Visit counting', 'Other sites', 'Change your mind', 'Questions']);
    expect([...doc.querySelectorAll('.legal__toc a')].map((a) => a.getAttribute('href'))).toEqual(sections.map((h) => `#${h.id}`));
    // Each category still answers what, why and for how long.
    for (const id of ['necessary', 'marketing', 'visit-counting']) {
      const section = doc.getElementById(id)!.closest('section')!;
      expect([...section.querySelectorAll('dt')].map(text)).toEqual(['What', 'Why', 'How long']);
    }
    expect(text(doc.getElementById('necessary')!.closest('section'))).toContain('“aldente-consent” in your browser’s local storage.');
    expect(doc.querySelector('.legal__prose button[data-cookie-settings]')).not.toBeNull();
    expect(text(doc.getElementById('change-your-mind')!.closest('section'))).toContain('Open cookie settings at any time');
    expect(doc.querySelector('.legal__prose a[href="mailto:support@aldenteai.com"]')).not.toBeNull();
  });
});

describe('Page heroes', () => {
  it('404: the page-hero title size and the hero button size', async () => {
    const doc = await page('/404', '404');
    expect(text(doc.querySelector('h1'))).toBe('Aldo looked everywhere. This page isn’t here.');
    const buttons = [...doc.querySelectorAll('.missing__actions a.btn')];
    expect(buttons.map((b) => [text(b), b.getAttribute('href')])).toEqual([
      ['Book a demo', '/demo'],
      ['Back to the home page', '/'],
    ]);
    for (const b of buttons) expect(b.classList.contains('btn--lg')).toBe(true);
  });

  it('Aldente Verify: the pricing link reads "Compare plans", as everywhere else', async () => {
    const doc = await page('/order-verification', 'order-verification');
    const ctas = [...doc.querySelectorAll('.page-hero__extra a.btn')];
    expect(ctas.map(text)).toEqual(['Book a demo', 'Compare plans']);
    expect(ctas[1]!.getAttribute('href')).toBe('/pricing');
    expect(ctas.filter((a) => a.classList.contains('btn--primary')).map(text)).toEqual(['Book a demo']);
  });
});

describe('Compare plans', () => {
  it('uses the shared section heading', async () => {
    const { default: CompareTable } = await import('../../src/components/pricing/CompareTable.astro');
    const doc = parse(await container.renderToString(CompareTable));
    const title = doc.getElementById('compare-title');
    expect(title?.tagName).toBe('H2');
    expect(title?.classList.contains('head__title')).toBe(true);
    expect(text(title)).toBe('Compare plans, side by side.');
  });
});
