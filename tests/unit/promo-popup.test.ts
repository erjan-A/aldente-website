import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import PromoPopup from '../../src/components/site/PromoPopup.astro';
import { ANNOUNCEMENT } from '../../src/data/site';
import { PROMO } from '../../src/data/promo';
import { promoActive } from '../../src/lib/promo';

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create({ astroConfig: { site: 'https://aldenteai.com' } });
});

const parser = new new Window().DOMParser();
const parse = (html: string) => parser.parseFromString(html, 'text/html') as unknown as Document;
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('Promo popup', () => {
  it('is the game for three days and a little: through Sunday 22 November, wherever the visitor is', () => {
    const [from, until] = [Date.parse(PROMO!.from), Date.parse(PROMO!.until)];
    const days = (until - from) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(3);
    expect(days).toBeLessThan(5);
    expect(promoActive(PROMO!, from)).toBe(true);
    expect(promoActive(PROMO!, until)).toBe(false);
    expect(PROMO!.href).toBe('/play');
    // The booking page is never covered.
    expect(PROMO!.skip).toContain('/demo');
  });

  it('hands its days and its rules to <promo-popup>, closed in the page', async () => {
    const doc = parse(await container.renderToString(PromoPopup));
    const popup = doc.querySelector('promo-popup')!;
    expect(popup.getAttribute('data-id')).toBe(PROMO!.id);
    expect(popup.getAttribute('data-from')).toBe(PROMO!.from);
    expect(popup.getAttribute('data-until')).toBe(PROMO!.until);
    expect(popup.getAttribute('data-skip')).toBe('/demo');
    const dialog = popup.querySelector('dialog')!;
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(dialog.getAttribute('aria-label')).toBe('Order Up: Night Shift, a free game by Aldente AI');
    // It can take focus itself when it opens.
    expect(dialog.getAttribute('tabindex')).toBe('-1');
  });

  it('is one card: Close first, the game’s art, one line and one action', async () => {
    const doc = parse(await container.renderToString(PromoPopup));
    const card = doc.querySelector('dialog > .card')!;
    expect([...card.children].map((el) => el.tagName)).toEqual(['BUTTON', 'A', 'P']);
    expect(text(card.querySelector('[data-promo-close]'))).toBe('Close');
    expect(text(card.querySelector('.promo__next span'))).toBe(PROMO!.line);

    // The action is the dark button: orange stays with booking.
    const play = card.querySelector('.promo__next a')!;
    expect(text(play)).toBe('Play now');
    expect(play.getAttribute('href')).toBe('/play');
    expect(play.hasAttribute('data-promo-play')).toBe(true);
    expect([...play.classList].filter((c) => /^btn--/.test(c)).sort()).toEqual(['btn--dark', 'btn--md']);
  });

  it('lets a click on the picture open the game too, without a second link for the keyboard or a screen reader', async () => {
    const doc = parse(await container.renderToString(PromoPopup));
    const art = doc.querySelector('.promo__art')!;
    expect(art.getAttribute('href')).toBe('/play');
    expect(art.getAttribute('tabindex')).toBe('-1');
    expect(art.getAttribute('aria-hidden')).toBe('true');
    const img = art.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('');
    // Fetched only when the popup is about to open.
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(Number(img.getAttribute('width')) / Number(img.getAttribute('height'))).toBeCloseTo(1200 / 630, 1);
  });

  it('is on every page of the site, once, and leaves the news bar as it was', async () => {
    const { default: Page } = await import('../../src/pages/404.astro');
    const doc = parse(await container.renderToString(Page, { request: new Request('https://aldenteai.com/404') }));
    expect(doc.querySelectorAll('promo-popup')).toHaveLength(1);
    const bar = doc.querySelector('aside[aria-label="Announcement"]')!;
    expect(bar.querySelectorAll('.announce__line')).toHaveLength(1);
    expect(text(bar.querySelector('.announce__text'))).toBe(ANNOUNCEMENT!.text);
    expect(text(bar.querySelector('.announce__cta'))).toBe('Learn more');
    expect(bar.querySelector('a')!.getAttribute('href')).toBe('/tab');
  });
});
