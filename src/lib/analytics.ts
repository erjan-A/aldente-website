import { ANALYTICS } from '../data/analytics';
import { isDemoPlan } from './demo';

/** Event properties as Plausible takes them. */
export type EventProps = Record<string, string>;

/** True only on the production site, so development, previews and shared copies send nothing. */
export function shouldLoad(hostname: string, hosts: readonly string[] = ANALYTICS.hosts): boolean {
  return hosts.includes(hostname.toLowerCase());
}

/** The demo plan a link asks for (?plan=…), or 'general'. Unknown plans count as general. */
export function planFromHref(href: string, base = `https://${ANALYTICS.domain}/`): string {
  try {
    const plan = new URL(href, base).searchParams.get('plan');
    return isDemoPlan(plan) ? plan : 'general';
  } catch {
    return 'general';
  }
}

/** True for links that lead to booking: the demo page (any plan) or the scheduler on it. */
export function isDemoHref(href: string, base: string): boolean {
  try {
    const url = new URL(href, base);
    if (url.origin !== new URL(base).origin) return false;
    return /^\/demo(?:\.html)?$/.test(url.pathname) || url.hash === '#schedule';
  } catch {
    return false;
  }
}

/** Collapses whitespace and keeps property values short. */
export const cleanText = (text: string | null | undefined, max = 60): string =>
  (text ?? '').replace(/\s+/g, ' ').trim().slice(0, max).trim();

/** What the click handler can read about the region around a link. */
export interface SectionInfo {
  tag: string;
  /** aria-label */
  label?: string | null;
  /** aria-labelledby, else the first heading's id */
  headingId?: string | null;
  id?: string | null;
  /** The first heading's text, as a last resort. */
  heading?: string | null;
}

/** A readable name for where a link sits: the section's aria-label or heading id, or "header" / "footer". */
export function sectionName(info: SectionInfo | null): string {
  if (!info) return 'page';
  const tag = info.tag.toLowerCase();
  if (tag === 'header' || tag === 'footer') return tag;
  return cleanText(info.label) || cleanText(info.headingId) || cleanText(info.id) || cleanText(info.heading, 40) || tag;
}

export interface CtaClick {
  /** The link's visible text. */
  text: string;
  href: string;
  section: string;
  /** The page the click happened on, e.g. "/pricing". */
  path: string;
  /** Where relative links resolve from (location.href). */
  base: string;
}

/** Properties for a "CTA click" event, or null when the link doesn't lead to booking. */
export function ctaProps({ text, href, section, path, base }: CtaClick): EventProps | null {
  if (!isDemoHref(href, base)) return null;
  return { label: cleanText(text) || 'link', section, path, plan: planFromHref(href, base) };
}
