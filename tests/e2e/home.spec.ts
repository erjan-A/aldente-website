import { expect, test } from './fixtures';

test.describe('home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('leads with the Aldo promise and loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your AI Chief of Staff with eyes.');
    await expect(page.locator('.hero .eyebrow')).toHaveText('For restaurant chains and franchise operators');
    await expect(page.locator('.hero').getByRole('link', { name: 'See Aldo in action' })).toHaveAttribute('href', '#aldo');
    await expect(page.locator('.hero__note')).toHaveText('Aldo comes with Aldente Verify or Aldente Vision.');
    await expect(page.getByRole('link', { name: 'Get Aldo in Slack' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('"See Aldo in action" scrolls to Meet Aldo', async ({ page }) => {
    await page.locator('.hero').getByRole('link', { name: 'See Aldo in action' }).click();
    await expect(page).toHaveURL(/#aldo$/);
    await expect(page.locator('#aldo')).toBeInViewport();
  });

  test('walks through Aldo in Slack with the tabs', async ({ page }) => {
    const demo = page.locator('aldo-demo');
    await demo.getByRole('tab', { name: /Assign/ }).click();
    await expect(demo.locator('[data-slack-channel]')).toHaveText('hr-ops');
    await expect(demo.getByRole('tabpanel')).toContainText('New Playbook · Missing clock-outs');

    await demo.getByRole('tab', { name: /Assign/ }).press('ArrowDown');
    await expect(demo.getByRole('tab', { name: /Alert/ })).toHaveAttribute('aria-selected', 'true');
    await expect(demo.getByRole('tab', { name: /Alert/ })).toBeFocused();
    await expect(demo.locator('[data-slack-channel]')).toHaveText('district-west');
    await expect(demo.getByRole('tabpanel')).toContainText('closest district manager');
  });

  test('filters Playbooks and draws the chosen one', async ({ page }) => {
    const explorer = page.locator('playbook-explorer');
    await explorer.getByRole('button', { name: 'HR', exact: true }).click();
    await expect(explorer.locator('[data-team]:visible')).toHaveCount(1);

    await explorer.getByRole('button', { name: 'All', exact: true }).click();
    await explorer.getByRole('button', { name: /Long queues/ }).click();
    await expect(explorer.locator('[data-graph-title]')).toHaveText('Long queues');
    await expect(explorer.locator('[data-graph-step="send"]')).toHaveText('Nearest district manager');
  });

  test('advances the order story as you scroll', async ({ page }) => {
    const story = page.locator('scroll-story');
    await expect(story).toHaveAttribute('data-step', '0');
    await page.locator('[data-story-step]').last().scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await expect(story).toHaveAttribute('data-step', '4');
    await expect(page.locator('[data-story-step]').last()).toHaveAttribute('aria-current', 'step');
  });

  test('states the verified-orders figure until live stats exist', async ({ page }) => {
    await expect(page.locator('.proof__line')).toContainText('2M+ orders verified across 200+ restaurant locations.');
    await expect(page.locator('live-counter')).toHaveCount(0);
  });

  test('names each customer logo once, however often the strip repeats it', async ({ page }) => {
    for (const name of ['McDonald’s', 'KFC', 'Burger King', 'Shaurma Food']) {
      await expect(page.getByRole('img', { name, exact: true })).toHaveCount(1);
    }
  });

  test('keeps the camera scene at lunch, whatever the visitor’s clock says', async ({ page }) => {
    await expect(page.locator('live-clock')).toHaveCount(0);
    await expect(page.locator('scroll-beats .slack-message time')).toHaveText(['12:38 PM', '12:40 PM', '12:41 PM']);
  });

  test('reveals camera detections and Aldo’s Slack posts together as you scroll', async ({ page, isMobile }) => {
    const beats = page.locator('scroll-beats');
    await expect(page.locator('.det.b1')).toBeVisible();
    await expect(page.locator('.msg.b1')).toBeVisible();
    if (!isMobile) {
      await expect(beats).toHaveAttribute('data-beat', '1');
      await expect(page.locator('.det.b2')).toBeHidden();
    }

    for (let i = 0; i < 30; i++) {
      if ((await beats.getAttribute('data-beat')) === '3') break;
      await page.mouse.wheel(0, 150);
      await page.waitForTimeout(50);
    }
    await expect(beats).toHaveAttribute('data-beat', '3');
    await expect(page.locator('.det.b2')).toBeVisible();
    await expect(page.locator('.msg.b3')).toContainText('Location 03 is busy');
  });

  test('steps through Aldo’s tabs on its own while on screen', async ({ page }) => {
    const demo = page.locator('aldo-demo');
    await demo.scrollIntoViewIfNeeded();
    await expect(demo.getByRole('tab', { name: /Assign/ })).toHaveAttribute('aria-selected', 'true', { timeout: 8000 });
  });

  test('labels each product section with the product', async ({ page }) => {
    await expect(page.locator('#aldo .pill')).toHaveText('Aldo');
    await expect(page.locator('#playbooks .pill')).toHaveText('Aldo');
    await expect(page.locator('#customers .pill')).toHaveText('Aldente Verify');
    await expect(page.locator('#analytics .pill')).toHaveText('Aldente Vision');
  });

  test('jumps from a Slack answer to the step it sets up', async ({ page }) => {
    const demo = page.locator('aldo-demo');
    await demo.getByRole('button', { name: 'Send this every Monday' }).click();
    const assign = demo.getByRole('tab', { name: /Assign/ });
    await expect(assign).toHaveAttribute('aria-selected', 'true');
    await expect(assign).toBeFocused();
  });

  test('shows Aldo between your data and Slack, as on the deck', async ({ page }) => {
    const map = page.locator('.connections .map');
    await expect(map.locator('.map__in li')).toHaveText([
      /Aldente Verify/,
      /Aldente Vision/,
      /POS/,
      /HR and time clock/,
      /Delivery/,
      /Other customer systems/,
    ]);
    await expect(map.locator('.hub')).toContainText('AI Chief of Staff');
    await expect(map.locator('.hub__note')).toHaveText('Large language models (LLMs)');
    await expect(map.locator('.out b').filter({ hasText: /^(Q&A|Playbooks)$/ })).toHaveText(['Q&A', 'Playbooks']);
  });

  test('keeps the team for the company page', async ({ page }) => {
    await expect(page.locator('.team')).toHaveCount(0);
    await page.goto('/company');
    await expect(page.locator('.team')).toContainText('Restaurant operators and engineers');
  });
});

test.describe('mobile menu', () => {
  test('opens and closes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The menu button only shows on small screens.');
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Menu' });
    await toggle.click();
    const menu = page.getByRole('navigation', { name: 'Mobile' });
    await expect(menu.getByRole('link', { name: 'Pricing' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('fills the screen, locks the page behind it and closes from its button', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The menu button only shows on small screens.');
    await page.goto('/solutions/hr');
    const toggle = page.getByRole('button', { name: 'Menu' });
    await toggle.click();
    const menu = page.getByRole('navigation', { name: 'Mobile' });
    await expect(menu.getByRole('link', { name: /^HR/ })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
    // The sheet runs to the bottom of the screen: no half-visible page strip under it.
    // (Polled: the sheet slides in for a quarter of a second.)
    await expect
      .poll(async () => {
        const sheet = (await page.locator('[data-menu-panel]').boundingBox())!;
        return Math.round(sheet.y + sheet.height);
      })
      .toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
    await toggle.click();
    await expect(menu).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-menu-open');
  });

  test('keeps the reader’s place when it opens and closes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The menu button only shows on small screens.');
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(1000);
    const toggle = page.getByRole('button', { name: 'Menu' });
    await toggle.click();
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeVisible();
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(1000);
    await toggle.click();
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeHidden();
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(1000);
  });
});

test.describe('header menus', () => {
  test('open from the bar, mark the current page and close on Escape', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The dropdowns only show on wide screens.');
    await page.goto('/order-verification');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const product = nav.getByRole('button', { name: 'Product' });
    await product.click();
    await expect(product).toHaveAttribute('aria-expanded', 'true');
    const verify = nav.getByRole('link', { name: /^Aldente Verify/ });
    await expect(verify).toBeVisible();
    await expect(verify).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('button', { name: 'Solutions' }).click();
    await expect(product).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.getByRole('link', { name: /^Operations/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(nav.getByRole('link', { name: /^Operations/ })).toBeHidden();
    await expect(nav.getByRole('button', { name: 'Solutions' })).toBeFocused();
  });

  test('open without moving the page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The dropdowns only show on wide screens.');
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(1500);
    const product = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Product' });
    await product.click();
    await expect(product).toHaveAttribute('aria-expanded', 'true');
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(1500);
  });
});

test.describe('product and solution heroes', () => {
  for (const [path, seeAldo] of [
    ['/aldo', '#aldo'],
    ['/solutions/operations', '/aldo#aldo'],
  ] as const) {
    test(`${path}: a visual beside the copy, one orange "Book a demo", "See Aldo in action" to the demo`, async ({ page }) => {
      await page.goto(path);
      const hero = page.locator('.page-hero');
      await expect(hero.locator('.page-hero__media')).toBeVisible();
      await expect(hero.locator('.btn--primary')).toHaveText(['Book a demo']);
      await expect(hero.getByRole('link', { name: 'See Aldo in action' })).toHaveAttribute('href', seeAldo);
      await expect(page.getByRole('link', { name: 'Get Aldo in Slack' })).toHaveCount(0);
    });
  }

  test('/analytics books a demo for Aldente Vision, and compares plans like Aldente Verify', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('.page-hero .btn--primary')).toHaveAttribute('href', '/demo?plan=vision');
    await expect(page.locator('.page-hero').getByRole('link', { name: 'Compare plans' })).toHaveAttribute('href', '/pricing');
  });

  test('/aldo books the "Get Aldo with Aldente Verify or Vision" demo', async ({ page }) => {
    await page.goto('/aldo');
    await expect(page.locator('.page-hero .btn--primary')).toHaveAttribute('href', '/demo?plan=starter');
    await expect(page.locator('.cta').getByRole('link', { name: 'Book a demo' })).toHaveAttribute('href', '/demo?plan=starter');
  });
});
