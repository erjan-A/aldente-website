import { ANALYTICS, RB2B } from '../data/analytics';
import { shouldLoad } from '../lib/analytics';

/** RB2B's install snippet as a module (the CSP allows no inline scripts). Runs on the production hosts only. */
declare global {
  interface Window {
    reb2b?: { loaded: boolean };
  }
}

/** Adds RB2B's script. Returns whether it did. */
export function loadVisitorId(hostname = location.hostname): boolean {
  if (window.reb2b || !shouldLoad(hostname, ANALYTICS.hosts)) return false;
  window.reb2b = { loaded: true };
  const script = document.createElement('script');
  script.async = true;
  script.src = RB2B.script;
  document.head.append(script);
  return true;
}

loadVisitorId();
