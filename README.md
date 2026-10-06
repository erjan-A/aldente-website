# aldenteai.com

The Aldente AI marketing site: a static [Astro](https://astro.build) build with very little client JavaScript (under 20 KB gzipped in total). It builds to plain HTML, CSS and images in `dist/`, so any web server can host it. **To deploy, see [DEPLOY.md](DEPLOY.md).**

## Requirements

- Node.js 22.12 or later (`.nvmrc` pins 22). Node is only needed to build; the server only serves files.
- For end-to-end tests: Playwright's browsers (`npx playwright install chromium`; add `webkit firefox` for `test:e2e:browsers`).

## Commands

```sh
npm ci              # install exactly what package-lock.json lists
npm run dev         # local dev server on http://localhost:4321
npm run build       # static site in dist/
npm run preview     # serve dist/ locally
npm test            # unit, DOM and component tests (Vitest)
npm run test:e2e    # builds, serves and runs Playwright on desktop and mobile
npm run verify      # all of the above: type check, tests, build, e2e
npm run test:e2e:browsers   # the same e2e suite in Safari's WebKit (desktop, iPhone) and Firefox
npm run smoke -- https://aldenteai.com   # check a deployed copy from outside (see DEPLOY.md)
```

## Pages

`/`, `/aldo`, `/order-verification` (Aldente Verify), `/analytics` (Aldente Vision), `/pricing`, `/solutions/{operations,hr,delivery}`, `/security`, `/company`, `/demo`, `/cookies`, `/privacy`, `/terms`, and the 404 page.

## Where things live

| Path | What |
| --- | --- |
| `src/data/` | Content that changes most: contact details and links (`site.ts`), products, pricing plans and FAQ, Playbooks, solution pages, logos, analytics settings. Start here for copy edits. |
| `src/pages/` | One file per page. `solutions/[slug].astro` renders the three solution pages from `src/data/solutions.ts`. |
| `src/components/home/` | Page sections, reused on the product pages. |
| `src/components/product/` | Product visuals: the hero mock-ups, the Aldente Vision pipeline and camera grid. |
| `src/components/site/` | Header, footer, page hero, legal page layout, cookie banner. |
| `src/components/ui/` | Shared primitives: Button, Card, SectionHeader, Eyebrow, Icon, ProductPill, Faq. |
| `src/components/slack/` | The Slack UI drawn wherever Aldo appears. |
| `src/lib/` | Pure logic with unit tests beside each file (demo-page intents, Calendly URL, analytics, consent, paths, Playbooks, scroll steps, tabs). |
| `src/scripts/` | Small custom elements that add behaviour to server-rendered HTML; each has a happy-dom test. |
| `src/styles/global.css` | Design tokens (colours, type scale, radii, card surfaces) and section tones (`tone-dark`, `tone-paper`, `tone-orange`). |
| `public/` | Files served as-is: `og.jpg` (link preview), `favicon.svg`, `robots.txt`. |
| `deploy/` | Server configuration (nginx), the header source the tests use, and the post-deploy smoke test. |
| `tools/` | `og/make-og.mjs` re-renders `public/og.jpg`; `make-artifact.py` makes a copy for the claude.ai preview link. |

Rules the code follows: pages work without JavaScript; every animation sits inside `prefers-reduced-motion: no-preference` and pauses while its section is off screen; images go through `astro:assets` (WebP, responsive widths); orange buttons are only for booking a demo.

## Behaviour worth knowing

- **Contact:** `support@aldenteai.com` and `+1 (818) 974-1857`, both from `SITE` in `src/data/site.ts`.
- **Demo booking:** `/demo` embeds Calendly's scheduler (`https://calendly.com/aldenteai/30min`) inline. `?plan=vision|verification|enterprise|starter` changes the heading and is passed to Calendly as `utm_content`; campaign tags on the link (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`) are passed on too. The Calendly event's qualifying questions are set in Calendly, not here.
- **Analytics:** cookie-free [Plausible](https://plausible.io), loaded only on `aldenteai.com` and `www.aldenteai.com` (never on localhost, staging or previews). Events: "CTA click" (label, section, path, plan), "Demo view" (plan), "Time selected" (plan), "Demo booked" (plan).
- **Cookie consent:** the site sets no cookies of its own; the banner stores one choice in local storage for 12 months. Its only optional category, marketing, lets Calendly's calendar set its cookies without asking again. Bump `CONSENT_VERSION` in `src/lib/consent.ts` if the categories change, and update `/cookies` and `/privacy` before adding any tool.
- **Live counter (optional):** set `PUBLIC_STATS_ENDPOINT` at build time to a JSON endpoint returning `{ "ordersVerified": number, "locations": number }`; without it the site shows the static "2M+". If you set it, add its origin to the CSP's `connect-src` in `deploy/nginx/snippets/aldente-headers.conf`.

## Quality gates

`npm run verify` must pass before every deploy. Besides the type check and unit tests, `tests/e2e` checks on desktop and mobile:

- no serious or critical axe (WCAG 2.1 AA) violations on any page;
- every page runs under the production Content-Security-Policy with no violations;
- no page scrolls sideways; every internal link returns 200;
- all JavaScript under 20 KB and all CSS under 40 KB gzipped, no image over 250 KB.
