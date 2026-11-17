# Aldente AI website: design system

The system lives in code. This file states it in words.

- Tokens: `src/styles/global.css`
- Shared components: `src/components/ui/`
- Enforced by: `tests/unit/design-system.test.ts` (part of `npm run verify`)

## Character

Bold and plain. A dark ground, one orange accent, heavy headings with a muted second line, real product footage.
The chrome stays quiet. Colour and motion go to the product: footage, product screens, key numbers, actions.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0b0b0b` | The dark ground |
| `--surface` | `#151515` | Cards and panels on dark |
| `--surface-2` | `#1f1f1f` | A step up: tags, inner tiles |
| `--line`, `--line-card`, `--line-strong` | `#2b2b2b`, `#363636`, `#636363` | Dividers, card edges, control edges |
| `--ink`, `--ink-2`, `--ink-3` | `#f1f1f1`, `#b3b3b3`, `#898989` | Text: primary, secondary, muted |
| `--accent` | `#e05634` | Actions, the current item, key numbers |
| `--accent-fill`, `--accent-fill-hover` | gradients | The primary button's fill and its hover |
| `--accent-deep`, `--surface-orange` | `#b52c0b`, gradient | Large orange grounds, white text on them |
| `--ok`, `--ok-deep` | `#4fbf85`, `#147a43` | "Verified" and "ready" states |
| `--paper`, `--paper-card`, `--paper-ink*`, `--paper-line` | | The light tone |

Sections take one of four tones: `tone-dark`, `tone-surface`, `tone-paper`, `tone-orange`.
A tone sets local roles that components read: `--fg`, `--fg-2`, `--fg-3`, `--fg-accent`, `--card`, `--card-line`, `--tag-bg`, `--tag-fg`, `--tone-bg`.
Rules:

- Neighbouring sections never share a tone.
- Components read the roles, not the raw colours, so they work on every tone.
- No colour is written by hand in a component. Plain black or white with an alpha is allowed for shadows, backdrops and masks; a tint of a token is written as `color-mix(in srgb, var(--accent) 35%, transparent)`.
- Orange marks actions, the current item and key numbers. Icons and decoration stay neutral.
- Selected text on an orange ground is white with deep orange letters; elsewhere it is the accent.
- No coloured left bar on cards. No colour gradients on text. No coloured glows on controls.
- Text keeps WCAG AA on its ground (4.5:1, large text 3:1).
- The home hero stands on the orange ground. White text needs a deep ground there: the hero uses the deep end of the orange alone (`--accent-deep`, without the lighter wash other orange sections carry), and the glow is slow but clearly visible; its range comes from darker shades, and it uses none lighter than `#cb4116`. `node tools/contrast.mjs` measures the real contrast over the moving glow; `tests/e2e/rhythm.spec.ts` guards a still frame.
- The accent and the green are written once, in the tokens. A component never repeats their values, in hex or in rgb.
- A gradient keeps a plain shape: no `min()`, `max()`, `calc()` or `clamp()` in its size or position. Chromium drops such a declaration without a warning, and the page then differs between browsers.

## Type

One family, Onest. Geist Mono only for camera readouts, through `--font-mono`.

| Token | Size | Role |
| --- | --- | --- |
| `--step-h1` | 44 to 72 px | Every page's H1 |
| `--step-h1-split` | 49 to 68 px | A page H1 that shares its row with media |
| `--step-h2` | 32 to 52 px | Section titles, the closing band |
| `--step-stat` | 28 to 40 px | Every figure: result tiles, the problem's numbers, the calculator |
| `--step-statement` | 24 to 40 px | One large sentence that carries a page |
| `--step-h3` | 22 to 28 px | Sub-section and large card titles |
| `--step-h4` | 20 to 22 px | Card titles, FAQ questions |
| `--step-lead` | 18 to 22 px | Hero and section leads |
| `--step-body` | 17 px | Body copy |
| `--step-ui` | 16 px | Buttons and form controls |
| `--step-small` | 15 px | Secondary copy, nav, captions |
| `--step-label` | 13 px | Labels, tags, metadata |
| `--step-mock`, `--step-mock-s` | 12 px, 11 px | Text inside drawings of product screens only |

Rules:

- Components never write a size of their own. A phone cap is written as `min(var(--step-…), Nvw)`.
- Weights: 400 body, 500 secondary copy, 600 labels and controls, 700 headings and numbers. Nothing else.
- Headings: weight 700, tight tracking, a period at the end, the second line in `--fg-3`.
- No numbers in headlines. Numbers live in result tiles, the calculator and the lead under a heading.
- Every figure is set in `--step-stat`, one size on a page, always under the section heading. A figure never takes a heading step.
- Sentence case everywhere.
- A section title gives the reader something: the point, the consequence or the reason. It never just names what the section holds. One sentence, the second half muted.

## Spacing

There are no spacing tokens. Layout uses the 4 px grid directly:

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96`

- 1 px and 2 px are for hairlines and optical nudges.
- Offsets that centre or overlap things are computed (`calc`, negative values).
- Section rhythm comes from tokens: `--section-y` (72 to 152 px), `--section-gap` (40 to 64 px, heading to content), `--gutter` (20 to 48 px), `--container` (1280 px).
- Air over size. Space does the work that large type used to: a section's space above and below is about three times its heading's size (reference: openai.com).
- A hero: 56 to 104 px above the copy, 24 to 32 px between its lines, 56 to 88 px before the product panel, `--section-y` below. The panel still starts on the first screen.
- A section fits one screen where its content allows (the calculator does). Compact a section before letting it run past the screen.
- `tests/e2e/rhythm.spec.ts` checks the hero's air, the section step, the figure size and the calculator's height.
- Card padding: `--card-pad-s` 16 px, `--card-pad-m` 20 to 28 px, `--card-pad-l` 20 to 32 px.
- Touch targets are at least 44 px tall. A control drawn smaller (a hero tab inside its bar) extends its target to 44 px.

## Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-xs` | 4 px | Small marks inside drawings: bars, chips |
| `--radius-s` | 8 px | Tags, inputs, small tiles, icon wells |
| `--radius-m` | 16 px | Compact or nested cards |
| `--radius-l` | 24 px | Standard cards |
| `--radius-xl` | 32 px | Large panels |
| `--radius-pill` | 999 px | Buttons, pills, thin bars |

An inner corner is the outer radius minus the padding between them: `calc(var(--radius-l) - var(--card-pad-s))`.

## Components

| Component | Use |
| --- | --- |
| `Button` | Variants: `primary` (orange gradient), `secondary`, `dark`, `link`. Sizes: `sm` 44 px, `md` 48 px, `lg` 56 px. One primary action per section; the sticky header carries the standing one. The booking action reads "Book a live demo" everywhere; it shortens to "Book a demo" where the row would not fit: in the header under 420 px and in the home hero under 360 px. |
| `Card` | Every boxed surface. `as` div, li, article, section or figure; `pad` s, m, l or none; `radius` l or xl. Recolour it through the roles (`--card`, `--card-line`, `--fg`). Never nest a Card in a Card. |
| `SectionHeader` | Every section title: a pill, the claim, a muted second line, an optional lead. |
| `ProductPill` | Names the product a section belongs to, or a plain topic. A plain pill may carry an icon (`icon`), as "For restaurant chains" does in the home hero. On orange the pill is a dark chip and its icon takes the ink. |
| Tab scene (product tour) | Under the serving-line clip, the product's own screen follows it: three box cards and the steam table. Their seconds (`data-at`, `data-until`) are read off the clip's own screen; change them only against the clip. A box that has not reached the line is an empty dashed slot. Cards sit side by side when the panel is at least 370 px wide, else one under another (a container query). |
| Customer results | Three equal cards, one per product: the pill, the figure with its unit, one short line, then the operator's words on the section's ground. The lines and the quotes are kept close in length so the cards end level. |
| `Faq` | Questions as native `details`, under a `SectionHeader`. |
| Home hero copy | A pill for the audience, the headline, then one plain line per product (Tab, Verify, Dispute), without icons. Everything is centred. The pill sits a step closer to the headline than the headline does to the lines under it. |
| Customer logos | A moving row in one light tone (`ProofBar`), six customers, the larger chains mixed with the newer ones. A colour logo is first made into one-tone artwork on a transparent ground. The orders line stands still above the row on every screen; only logos move. Still and wrapped with reduced motion. |
| News bar | Orange on every page, the same sentence on every screen. Below 768 px it runs past as a news line and "Learn more" stays in place; with reduced motion it stands still and wraps. |
| Hero product tabs | The tab bar under the hero buttons is as tall as they are and set in their type size: 44 px and `--step-small` on phones, 48 px and `--step-ui` from 720 px. A tab is drawn inside the bar's padding; its tap target is the bar's full height. |
| `Footer` | One ruled grid: the brand cell with its contacts, then four link columns (Products, Solutions, Company with Pricing, Legal), hairlines between the cells. No boxes, no pill buttons. The wordmark below it is quiet and fades into the ground. |
| `Icon` | One line set (Lucide), in the colour of its text. The stroke follows the size: 1.75 from 20 px, 2 at 16 to 18 px, 2.5 at 14 px and below. Callers never set it. |

Build new sections from these, not from hand-made boxes.

## Motion

- Motion shows the product at work: footage, and product screens that play in steps.
- Everything pauses off screen. With reduced motion, nothing loops: scenes show their finished state, and the hero glow and the slat wall are still frames.
- The home hero has one background effect, "Ember" (`src/scripts/hero-ember.ts`), in shades of the hero's orange. It starts loading once the page is parsed and fades in when it draws.
- The hero clips play one after another. The timer, the clip and the tab's progress bar stay in step: off screen all three hold, and while the pointer or the keyboard is on the panel the same clip plays again.
- Every clip is silent, plays by itself while it is on screen and loops without end, with no controls. The visitor can stop it: a click on the clip, or Space or Enter while it has focus; it plays again the next time it comes on screen. Controls show in two cases only: with reduced motion, and when the browser refuses to autoplay (a phone in low-power mode). A start cut short by scrolling past is not a refusal.
- A clip that fails to load gets three more chances (`src/scripts/clip-rescue.ts`). First the clip worker (`public/clip-sw.js`) is turned on: Safari plays a video only from byte ranges, and on a host that sends the whole file the worker cuts the ranges out of it. Then the file is played from memory. Last, the clip becomes its still: the poster, no controls, never a broken player. The watch video is rescued the same way.
- Footage is shown as it was filmed: no blur or mask is added to a clip unless the owner asks for it.
- The two Verify clips (hero and product tour) are one piece of footage with the product's own interface drawn over it: the app's order card, status tags, item rows, corner brackets, colours and fonts (Golos Text, JetBrains Mono), taken from the app's code. To change them, edit the overlay plan and render again; the files and the steps are in the brain folder `00_INBOX/2026-11-17-verify-clip/`.
- The closing orange band has one background effect, the slat wall (`src/scripts/slat-sea-gl.ts`): small slats shaded by a slow swell. It loads when the band nears the screen. Light crests stay off the white text (`glintZone` in `src/lib/slats.ts`); the band has no watermark.
- No other section gets a background effect.
- Buttons do not lift or glow on hover.

## Exemptions

Two kinds of code are exempt, each from one rule:

- Slack replicas (`src/components/slack/`, `src/styles/slack.css`) copy Slack's own sizes, weights and colours.
- Drawings of product screens (the scenes in the product tour and on product pages) keep the product's own denser spacing. Their text still comes from the scale.

## Checking

```bash
npm run test:design
```

`tests/unit/design-system.test.ts` fails when:

- a stylesheet uses a type size, weight, family or radius outside the tokens;
- the site's own layout leaves the 4 px grid, or writes a colour by hand;
- any component repeats the value of the accent or the green;
- a gradient uses a math function in its shape;
- a card is drawn by hand instead of with `Card` (the few that stay are listed in the test with the reason);
- an icon is given its own stroke width.

It runs in three places:

| Where | When |
| --- | --- |
| The commit hook (`.githooks/pre-commit`) | On every commit that touches a style or a component. `npm install` switches it on. |
| `npm run verify` | Before finishing any change (the full check) |
| GitHub (`.github/workflows/verify.yml`) | On every push and pull request |

Changing the system itself: change the token in `global.css`, this file and the test together.
