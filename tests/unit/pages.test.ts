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
    expect(text(doc.querySelector('.page-hero__lead'))).toMatch(/Updated 19\sNovember 2026\.$/);
    const sections = [...doc.querySelectorAll('.legal__section h2')];
    expect(sections.map(text)).toEqual(['Necessary', 'Marketing', 'Visit counting', 'Other sites', 'Change your mind', 'Questions']);
    expect([...doc.querySelectorAll('.legal__toc a')].map((a) => a.getAttribute('href'))).toEqual(sections.map((h) => `#${h.id}`));
    // Each category still answers what, why and for how long.
    for (const id of ['necessary', 'marketing', 'visit-counting']) {
      const section = doc.getElementById(id)!.closest('section')!;
      expect([...section.querySelectorAll('dt')].map(text)).toEqual(['What', 'Why', 'How long']);
    }
    expect(text(doc.getElementById('necessary')!.closest('section'))).toContain('“aldente-consent” in your browser’s local storage.');
    // The game and the pop-up keep a little too, and say so.
    expect(text(doc.getElementById('necessary')!.closest('section'))).toContain('Our game at /play keeps your progress, your sound setting and your language choice in local storage');
    expect(text(doc.getElementById('necessary')!.closest('section'))).toContain('remembers that you have seen a pop-up');
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
      ['Book a live demo', '/demo'],
      ['Back to the home page', '/'],
    ]);
    for (const b of buttons) expect(b.classList.contains('btn--lg')).toBe(true);
  });

  it('Aldente Verify: the pricing link reads "Compare plans", as everywhere else', async () => {
    const doc = await page('/order-verification', 'order-verification');
    const ctas = [...doc.querySelectorAll('.page-hero__extra a.btn')];
    expect(ctas.map(text)).toEqual(['Book a live demo', 'Compare plans']);
    expect(ctas[1]!.getAttribute('href')).toBe('/pricing');
    expect(ctas.filter((a) => a.classList.contains('btn--primary')).map(text)).toEqual(['Book a live demo']);
  });
});

describe('Sticky booking button', () => {
  it('stands on every page but the booking page: a link that works without scripts, and a calendar that waits', async () => {
    const doc = await page('/order-verification', 'order-verification');
    const sticky = doc.querySelector('book-demo')!;
    const link = sticky.querySelector('a[data-book]')!;
    expect(text(link)).toBe('Book a live demo');
    expect(link.getAttribute('href')).toBe('/demo');
    expect(link.classList.contains('btn--primary')).toBe(true);
    expect(link.getAttribute('aria-haspopup')).toBe('dialog');
    // The funnel names it apart from the page's other booking buttons.
    expect(sticky.getAttribute('data-section')).toBe('sticky button');
    // It steps aside for the closing band and the footer.
    for (const selector of sticky.getAttribute('data-yield')!.split(',')) expect(doc.querySelector(selector.trim()), selector).not.toBeNull();

    // The calendar is in the page closed, and asks Calendly for nothing until it is opened.
    const dialog = sticky.querySelector('dialog')!;
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(text(doc.getElementById(dialog.getAttribute('aria-labelledby')!))).toBe('Pick a time');
    const embed = dialog.querySelector('calendly-embed')!;
    expect(embed.hasAttribute('data-lazy')).toBe(true);
    expect(embed.getAttribute('data-url')).toBe('https://calendly.com/aldenteai/30min');
    expect(dialog.querySelector('iframe')).toBeNull();
    expect(text(dialog.querySelector('[data-book-close]'))).toBe('Close');
    // One id each: the dialog's parts never repeat an id of the page.
    const ids = [...doc.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('is left out of the booking page, whose calendar loads with the page', async () => {
    const demo = await page('/demo', 'demo');
    expect(demo.querySelector('book-demo')).toBeNull();
    const embed = demo.querySelector('#schedule calendly-embed')!;
    expect(embed.hasAttribute('data-lazy')).toBe(false);
    expect(text(demo.getElementById('schedule-title'))).toBe('Pick a time');
    expect(demo.querySelector('#schedule [data-book-close]')).toBeNull();
  });
});
