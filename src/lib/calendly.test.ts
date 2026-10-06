import { describe, expect, it } from 'vitest';
import { calendlyEmbedUrl, calendlyHeight, calendlyMessage, calendlyShowsContent, incomingUtm } from './calendly';

const BASE = 'https://calendly.com/aldenteai/30min';
const params = (url: string) => Object.fromEntries(new URL(url).searchParams);

describe('calendlyEmbedUrl', () => {
  it('embeds the 30-minute event inline, themed for the dark card', () => {
    const url = calendlyEmbedUrl(BASE, { hostname: 'aldenteai.com' });
    expect(url.startsWith(`${BASE}?`)).toBe(true);
    expect(params(url)).toMatchObject({
      hide_event_type_details: '1',
      hide_landing_page_details: '1',
      background_color: '181818',
      text_color: 'f1f1f1',
      primary_color: 'e05634',
      embed_domain: 'aldenteai.com',
      embed_type: 'Inline',
    });
  });

  it('tags the booking with the source and the plan', () => {
    expect(params(calendlyEmbedUrl(BASE, { hostname: 'aldenteai.com', plan: 'vision' }))).toMatchObject({
      utm_source: 'aldenteai.com',
      utm_medium: 'website',
      utm_campaign: 'demo',
      utm_content: 'vision',
    });
    expect(params(calendlyEmbedUrl(BASE, { hostname: 'aldenteai.com', plan: '' })).utm_content).toBe('general');
  });

  it('keeps the campaign the visitor arrived with, and the plan as utm_content', () => {
    const url = calendlyEmbedUrl(BASE, {
      hostname: 'aldenteai.com',
      plan: 'vision',
      utm: { utm_source: 'linkedin', utm_campaign: 'q4', utm_term: 'camera analytics' },
    });
    expect(params(url)).toMatchObject({
      utm_source: 'linkedin',
      utm_medium: 'website',
      utm_campaign: 'q4',
      utm_term: 'camera analytics',
      utm_content: 'vision',
    });
    expect(params(calendlyEmbedUrl(BASE, { hostname: 'aldenteai.com', utm: { utm_medium: 'email' } })).utm_medium).toBe('email');
    expect(params(calendlyEmbedUrl(BASE, { hostname: 'aldenteai.com' }))).not.toHaveProperty('utm_term');
  });

  it('uses the hostname the page runs on', () => {
    expect(params(calendlyEmbedUrl(BASE, { hostname: 'www.aldenteai.com' })).embed_domain).toBe('www.aldenteai.com');
  });

  it('hides Calendly’s cookie banner only after the visitor chose to load it', () => {
    expect(params(calendlyEmbedUrl(BASE, { hostname: 'aldenteai.com' }))).not.toHaveProperty('hide_gdpr_banner');
    expect(params(calendlyEmbedUrl(BASE, { hostname: 'aldenteai.com', consented: true })).hide_gdpr_banner).toBe('1');
  });
});

describe('incomingUtm', () => {
  it('reads the campaign tags from the page’s query string', () => {
    expect(incomingUtm('?plan=vision&utm_source=linkedin&utm_medium=social&utm_campaign=q4&utm_term=kfc')).toEqual({
      utm_source: 'linkedin',
      utm_medium: 'social',
      utm_campaign: 'q4',
      utm_term: 'kfc',
    });
  });

  it('leaves utm_content to the plan and ignores everything else', () => {
    expect(incomingUtm('?utm_content=banner&plan=vision&ref=x')).toEqual({});
    expect(incomingUtm('')).toEqual({});
  });

  it('drops empty tags and cuts long ones', () => {
    expect(incomingUtm('?utm_source=&utm_campaign=%20%20')).toEqual({});
    expect(incomingUtm(`?utm_source=${'a'.repeat(300)}`).utm_source).toHaveLength(100);
  });
});

describe('calendlyMessage', () => {
  it('reads Calendly’s events', () => {
    expect(calendlyMessage('https://calendly.com', { event: 'calendly.page_height', payload: { height: '1100px' } })).toEqual({
      event: 'calendly.page_height',
      payload: { height: '1100px' },
    });
    expect(calendlyMessage('https://calendly.com', { event: 'calendly.event_type_viewed' })).toEqual({
      event: 'calendly.event_type_viewed',
      payload: {},
    });
  });

  it('ignores other origins and other messages', () => {
    expect(calendlyMessage('https://evil.example', { event: 'calendly.event_scheduled', payload: {} })).toBeNull();
    expect(calendlyMessage('https://calendly.com.evil.example', { event: 'calendly.event_scheduled' })).toBeNull();
    expect(calendlyMessage('https://calendly.com', 'calendly.event_scheduled')).toBeNull();
    expect(calendlyMessage('https://calendly.com', { event: 'something.else' })).toBeNull();
    expect(calendlyMessage('https://calendly.com', null)).toBeNull();
  });
});

describe('calendlyHeight', () => {
  it('follows Calendly’s height', () => {
    expect(calendlyHeight('1100px')).toBe(1100);
    expect(calendlyHeight(702)).toBe(702);
  });

  it('stays between 560 and 1400 px', () => {
    expect(calendlyHeight('26px')).toBe(560);
    expect(calendlyHeight('3000px')).toBe(1400);
  });

  it('ignores values it can’t read', () => {
    expect(calendlyHeight(undefined)).toBeNull();
    expect(calendlyHeight('auto')).toBeNull();
  });
});

describe('calendlyShowsContent', () => {
  it('waits past Calendly’s own spinner', () => {
    expect(calendlyShowsContent({ event: 'calendly.page_height', payload: { height: '26px' } })).toBe(false);
    expect(calendlyShowsContent({ event: 'calendly.page_height', payload: { height: '2px' } })).toBe(false);
    expect(calendlyShowsContent({ event: 'calendly.page_height', payload: {} })).toBe(false);
  });

  it('shows the scheduler once it has content', () => {
    expect(calendlyShowsContent({ event: 'calendly.event_type_viewed', payload: {} })).toBe(true);
    expect(calendlyShowsContent({ event: 'calendly.page_height', payload: { height: '700px' } })).toBe(true);
    expect(calendlyShowsContent({ event: 'calendly.event_scheduled', payload: {} })).toBe(true);
  });
});
