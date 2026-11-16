## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## This project

- Architecture: logic in `src/lib` (unit-tested), behaviour in `src/scripts` custom elements (happy-dom tests), content in `src/data`, sections in `src/components`.
- Design: read `DESIGN.md` before any UI change. Take sizes, weights, radii and colours from the tokens in `src/styles/global.css`, keep spacing on the 4px grid, and build from `src/components/ui` (Button, Card, SectionHeader, ProductPill, Icon) instead of hand-made boxes. `npm run test:design` checks this in a second; the commit hook and CI run it too. Do not add an exemption to the test without the owner's word.
- Write the failing test first, then the code.
- Before finishing, run `npm run verify` (type check, Vitest, build, Playwright on desktop and mobile, axe, link check, size budget).
- Playwright starts `astro preview --ignore-lock` itself; don't start another server on port 4322.
