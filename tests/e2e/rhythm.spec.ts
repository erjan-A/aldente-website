import sharp from 'sharp';
import { expect, test } from './fixtures';

/** Space and size: the hero breathes, sections sit a clear step apart, and no figure outgrows its heading. */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('the hero has air between its parts and above the product panel', async ({ page, isMobile }) => {
  const gaps = await page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const [hero, title, lead, actions, media] = ['.hero', '.hero__title', '.hero__lead', '.hero__actions', '.hero .hm'].map(box);
    return {
      above: Math.round(title!.top - hero!.top),
      titleToLead: Math.round(lead!.top - title!.bottom),
      leadToActions: Math.round(actions!.top - lead!.bottom),
      actionsToMedia: Math.round(media!.top - actions!.bottom),
      mediaTop: Math.round(media!.top),
    };
  });
  expect(gaps.above).toBeGreaterThanOrEqual(isMobile ? 80 : 120);
  expect(gaps.titleToLead).toBeGreaterThanOrEqual(24);
  expect(gaps.leadToActions).toBeGreaterThanOrEqual(isMobile ? 28 : 36);
  expect(gaps.actionsToMedia).toBeGreaterThanOrEqual(isMobile ? 48 : 64);
  // The product panel still starts on the first screen.
  expect(gaps.mediaTop).toBeLessThan(page.viewportSize()!.height);
});

test('sections sit a clear step apart, and a heading has room above its content', async ({ page, isMobile }) => {
  const space = await page.evaluate(() => {
    const section = document.querySelector('#calculator')!;
    const inner = section.querySelector('.calc__inner')!;
    return { pad: parseFloat(getComputedStyle(section).paddingTop), gap: parseFloat(getComputedStyle(inner).rowGap) };
  });
  expect(space.pad).toBeGreaterThanOrEqual(isMobile ? 72 : 128);
  expect(space.gap).toBeGreaterThanOrEqual(isMobile ? 40 : 56);
});

test('no figure is set larger than a section heading', async ({ page }) => {
  const sizes = await page.evaluate(() => {
    const size = (selector: string) => [...document.querySelectorAll(selector)].map((el) => parseFloat(getComputedStyle(el).fontSize));
    return { heading: size('#calc-title')[0]!, figures: [...size('.tile__value b'), ...size('.calc__result > output')] };
  });
  expect(sizes.figures.length).toBeGreaterThanOrEqual(6);
  for (const figure of sizes.figures) expect(figure).toBeLessThan(sizes.heading);
  // One size for every figure: none shouts over the others.
  expect(new Set(sizes.figures).size).toBe(1);
});

test('the calculator is one compact card: fields two by two, results in a row', async ({ page, isMobile }) => {
  const calc = await page.evaluate(() => {
    const rect = (el: Element) => el.getBoundingClientRect();
    const section = document.querySelector('#calculator')!;
    const fields = [...section.querySelectorAll('.calc__field')].map((f) => Math.round(rect(f).left));
    const results = [...section.querySelectorAll('.calc__result')].map((r) => Math.round(rect(r).top));
    const inputs = [...section.querySelectorAll('.calc__input')].map((i) => Math.round(rect(i).height));
    return { height: Math.round(rect(section).height), columns: new Set(fields).size, resultRows: new Set(results).size, inputs };
  });
  expect(calc.columns).toBe(2);
  expect(calc.inputs.every((h) => h >= 44 && h <= 48)).toBe(true);
  if (isMobile) {
    expect(calc.height).toBeLessThan(1000);
  } else {
    expect(calc.resultRows).toBe(1);
    // The whole section, with its space above and below, fits one screen.
    expect(calc.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
});

test('the closing band is short: its title, one line and one button', async ({ page, isMobile }) => {
  const band = page.locator('.cta');
  await band.scrollIntoViewIfNeeded();
  await expect(band.getByRole('link')).toHaveText(['Book a live demo']);
  const height = (await band.boundingBox())!.height;
  expect(height).toBeLessThan(isMobile ? 520 : 500);
});

test('the footer is one compact ruled grid', async ({ page, isMobile }) => {
  const footer = page.locator('footer.footer');
  await footer.scrollIntoViewIfNeeded();
  const layout = await footer.evaluate((el) => {
    const top = (node: Element) => Math.round(node.getBoundingClientRect().top);
    const columns = [...el.querySelectorAll('.footer__cols > div')];
    const links = [...el.querySelectorAll('.footer__grid a')].map((a) => Math.round(a.getBoundingClientRect().height));
    return {
      height: Math.round(el.getBoundingClientRect().height),
      brandTop: top(el.querySelector('.footer__brand')!),
      columnTops: columns.map(top),
      ruled: columns.every((c) => parseFloat(getComputedStyle(c).borderLeftWidth) === 1 || parseFloat(getComputedStyle(c).borderTopWidth) === 1),
      links,
    };
  });
  if (isMobile) {
    // Two columns a row, and every link a full touch target.
    expect(new Set(layout.columnTops).size).toBe(2);
    expect(Math.min(...layout.links)).toBeGreaterThanOrEqual(44);
    expect(layout.height).toBeLessThan(800);
  } else {
    // The brand cell and the four columns stand on one line.
    expect(new Set([layout.brandTop, ...layout.columnTops]).size).toBe(1);
    expect(layout.height).toBeLessThan(560);
  }
  expect(layout.ruled).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('the hero glow fades out at its edges in this browser: its mask is a declaration the browser accepts', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const mask = await page.evaluate(() => {
    // The layer the glow is drawn into (made by hand here, so the check does not depend on WebGL).
    const layer = document.createElement('div');
    layer.className = 'hb__layer';
    document.querySelector('hero-backdrop')!.append(layer);
    const style = getComputedStyle(layer);
    const value = style.getPropertyValue('mask-image') || style.getPropertyValue('-webkit-mask-image');
    layer.remove();
    return value;
  });
  expect(mask).toContain('radial-gradient');
});

test('white text on the orange hero keeps its contrast against what is painted behind it', async ({ page }) => {
  // The settled picture: one still frame of the glow (or the plain ground where WebGL is off).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.waitForTimeout(1200);
  const boxes = await page.evaluate(() =>
    ['.hero .pill', '.hero__title', '.hero__lead'].map((selector) => {
      const el = document.querySelector(selector)!;
      const r = el.getBoundingClientRect();
      const [red, green, blue, alpha = 1] = getComputedStyle(el).color.match(/[\d.]+/g)!.map(Number);
      // Inside the pill, not on its hairline border.
      const inset = selector.endsWith('.pill') ? 4 : 0;
      return { selector, x: Math.max(0, Math.floor(r.x)) + inset, y: Math.floor(r.y) + inset, w: Math.floor(r.width) - 2 * inset, h: Math.floor(r.height) - 2 * inset, ink: [red!, green!, blue!], alpha };
    }),
  );
  await page.addStyleTag({ content: '.hero__copy, .hero__copy * { color: transparent !important; } ' });
  const { data, info } = await sharp(await page.screenshot()).raw().toBuffer({ resolveWithObject: true });
  const scale = info.width / page.viewportSize()!.width;
  const channel = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
  for (const box of boxes) {
    const ratios: number[] = [];
    for (let y = box.y; y < box.y + box.h; y += 3) {
      for (let x = box.x; x < Math.min(page.viewportSize()!.width, box.x + box.w); x += 3) {
        const i = (Math.floor(y * scale) * info.width + Math.floor(x * scale)) * info.channels;
        const ground = [data[i]!, data[i + 1]!, data[i + 2]!];
        const ink = box.ink.map((c, n) => c * box.alpha + ground[n]! * (1 - box.alpha));
        const [light, dark] = [luminance(ink), luminance(ground)].sort((a, b) => b - a);
        ratios.push((light! + 0.05) / (dark! + 0.05));
      }
    }
    ratios.sort((a, b) => a - b);
    // The 2nd percentile, so film grain in the glow does not decide it. The headline is large text (3:1).
    const low = ratios[Math.floor(ratios.length * 0.02)]!;
    expect(low, box.selector).toBeGreaterThanOrEqual(box.selector === '.hero__title' ? 3 : 4.5);
  }
});

test('the product tabs under the hero buttons match them: the same height and the same type size', async ({ page }) => {
  await page.goto('/');
  const sizes = await page.evaluate(() => {
    const button = document.querySelector('.hero__actions a')!;
    const bar = document.querySelector('.hm__tabs')!;
    const tab = document.querySelector('.hm__tab:not([aria-selected="true"])')!;
    const [b, t] = [bar.getBoundingClientRect(), tab.getBoundingClientRect()];
    // A tap anywhere in the bar's height, over a tab, lands on that tab.
    const hit = (y: number) => document.elementFromPoint(t.left + t.width / 2, y)?.closest('[role="tab"]') === tab;
    return {
      button: button.getBoundingClientRect().height,
      bar: b.height,
      buttonType: getComputedStyle(button).fontSize,
      tabType: getComputedStyle(tab).fontSize,
      target: hit(b.top + 1) && hit(b.bottom - 1),
    };
  });
  expect(sizes.bar).toBe(sizes.button);
  expect(sizes.tabType).toBe(sizes.buttonType);
  expect(sizes.target).toBe(true);
});

test('the hero tab progress holds while the panel waits off screen', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  await expect(page.locator('.hm')).toHaveAttribute('data-playing', '');
  const state = () => page.evaluate(() => document.getAnimations().find((a) => (a as CSSAnimation).animationName === 'hm-progress')?.playState);
  expect(await state()).toBe('running');
  await page.evaluate(() => document.querySelector('.hm')!.setAttribute('data-waiting', ''));
  expect(await state()).toBe('paused');
});

test('on a narrow phone the two hero buttons stay inside the side gutters, on one row', async ({ page }) => {
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/');
    const row = await page.evaluate(() => {
      const [book, watch] = [...document.querySelectorAll('.hero__actions a')].map((a) => a.getBoundingClientRect());
      const gutter = parseFloat(getComputedStyle(document.querySelector('.hero .container')!).paddingLeft);
      return { left: book!.left, right: window.innerWidth - watch!.right, gutter, sameRow: Math.abs(book!.top - watch!.top) < 1 };
    });
    expect(row.sameRow, `${width}px`).toBe(true);
    expect(row.left, `${width}px`).toBeGreaterThanOrEqual(row.gutter - 0.5);
    expect(row.right, `${width}px`).toBeGreaterThanOrEqual(row.gutter - 0.5);
  }
});

test('on a narrow phone the header fits: brand, booking button and menu inside equal gutters', async ({ page }) => {
  for (const width of [344, 360, 390]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/');
    const fit = await page.evaluate(() => {
      const brand = document.querySelector('.header a')!.getBoundingClientRect();
      const toggle = document.querySelector('.header__toggle')!.getBoundingClientRect();
      const book = document.querySelector('.header__cta')!.getBoundingClientRect();
      return { left: brand.left, right: window.innerWidth - toggle.right, book: book.width, overflow: document.documentElement.scrollWidth - window.innerWidth };
    });
    expect(fit.overflow, `${width}px`).toBeLessThanOrEqual(0);
    // Under 360px the bar has no room for the button: the menu sheet carries it.
    if (width >= 360) expect(fit.book, `${width}px`).toBeGreaterThan(0);
    expect(Math.abs(fit.left - fit.right), `${width}px`).toBeLessThanOrEqual(1);
  }
});

test('on a phone the headline breaks after "Vision AI", one tone to a line', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The phone headline');
  const lines = await page.locator('.hero__title').evaluate((title) => {
    const accent = title.querySelector('span')!.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(title.lastChild!);
    const rest = [...range.getClientRects()].filter((r) => r.width > 1);
    return { accentBottom: accent.bottom, restTop: Math.min(...rest.map((r) => r.top)), restLines: new Set(rest.map((r) => Math.round(r.top))).size };
  });
  expect(lines.restTop).toBeGreaterThanOrEqual(lines.accentBottom - 8);
  expect(lines.restLines).toBe(1);
});
