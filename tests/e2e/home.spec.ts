import { expect, test } from './fixtures';

test('the "Watch it work" dialog ships with the home page only', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('dialog.watch')).toHaveCount(1);
  await page.goto('/terms');
  await expect(page.locator('dialog.watch')).toHaveCount(0);
});

test.describe('home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('leads with vision AI for every order and loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vision AI for every order.');
    // Who the page is for sits in a pill above the headline.
    await expect(page.locator('.hero .pill')).toHaveText('For restaurant chains');
    await expect(page.locator('.hero .eyebrow')).toHaveCount(0);
    // On the orange hero the booking button is the dark one: the orange button would vanish into the ground.
    await expect(page.locator('.hero')).toHaveClass(/tone-orange/);
    await expect(page.locator('.hero .btn--dark')).toHaveText(['Book a live demo']);
    await expect(page.locator('.hero__facts')).toHaveCount(0);
    // The two hero buttons are compact and share one row, on phones too.
    const [book, watch] = await Promise.all([
      page.locator('.hero__actions a').nth(0).boundingBox(),
      page.locator('.hero__actions a').nth(1).boundingBox(),
    ]);
    expect(Math.abs(book!.y - watch!.y)).toBeLessThan(1);
    expect(book!.height).toBeLessThanOrEqual(48);
    expect(book!.height).toBeGreaterThanOrEqual(44);
    expect(errors).toEqual([]);
  });

  test('"Watch it work" opens the longer clip in a dialog, and closing it stops the clip', async ({ page }) => {
    await page.locator('.hero').getByRole('link', { name: 'Watch it work' }).click();
    const dialog = page.getByRole('dialog', { name: 'Aldente in one minute' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('video')).toHaveAttribute('src', '/media/watch.mp4');
    // The video is not a dead end: the booking sits right under it.
    await expect(dialog.getByRole('link', { name: 'Book a live demo' })).toHaveAttribute('href', '/demo');
    // The explainer has sound, and the visitor asked for it with a click: it does not start muted.
    expect(await dialog.locator('video').evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
    await expect(page).toHaveURL(/\/$/);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    expect(await page.locator('watch-dialog video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });

  test('plays the hero clips by themselves and switches between Verify, Dispute and Tab, by click and by arrow key', async ({ page }) => {
    const tabs = page.getByRole('tablist', { name: 'Product views' });
    await expect(page.locator('media-tabs')).toHaveAttribute('data-playing', '');
    const verify = page.getByRole('tabpanel', { name: 'Verify' });
    await expect(verify.locator('video')).toHaveAttribute('src', '/media/verify.mp4');
    // The script does the playing, so the clip loses its controls.
    await expect(verify.locator('video')).not.toHaveAttribute('controls');
    await tabs.getByRole('tab', { name: 'Dispute' }).click();
    // A pick ends the autoplay.
    await expect(page.locator('media-tabs')).not.toHaveAttribute('data-playing');
    // No words under the clips: each clip carries its own name.
    await expect(page.getByRole('tabpanel', { name: 'Dispute' }).locator('video')).toHaveAttribute('aria-label', /refund claim/);
    await expect(page.locator('.hm figcaption')).toHaveCount(0);
    await expect(verify).toBeHidden();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.getByRole('tab', { name: 'Tab' })).toBeFocused();
    await expect(page.getByRole('tabpanel', { name: 'Tab', exact: true }).locator('video')).toHaveAttribute('aria-label', /overhead camera/);
  });

  test('draws the ember glow behind the hero, under the content and out of the way of clicks', async ({ page }) => {
    await page.waitForLoadState('load');
    // Where the browser can draw WebGL the glow must really draw: a broken shader may not pass as "plain".
    const webgl = await page.evaluate(() => Boolean(document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl')));
    expect(await page.locator('.hero hero-backdrop').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    // With WebGL the glow's layer holds a canvas; without it (some test browsers) the layer is removed and the
    // hero stays plain. Either way nothing else is left behind, and the booking button still takes the click.
    await expect
      .poll(() => page.locator('.hero hero-backdrop').evaluate((el) => (el.children.length === 0 ? 'plain' : el.querySelector('.hb__layer.is-on canvas') ? 'glow' : 'starting')))
      .toBe(webgl ? 'glow' : 'plain');
    await page.locator('.hero').getByRole('link', { name: 'Book a live demo' }).click({ trial: true });
  });

  test('rolls the slat wall behind the closing band, under the content and out of the way of clicks', async ({ page }) => {
    const band = page.locator('.cta');
    await band.scrollIntoViewIfNeeded();
    const sea = band.locator('slat-sea');
    const webgl = await page.evaluate(() => Boolean(document.createElement('canvas').getContext('webgl')));
    expect(await sea.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    // With WebGL the layer holds the canvas; without it the layer is removed and the band stays plain orange.
    await expect
      .poll(() => sea.evaluate((el) => (el.children.length === 0 ? 'plain' : el.querySelector('.slats__layer.is-on canvas') ? 'wall' : 'starting')))
      .toBe(webgl ? 'wall' : 'plain');
    // The wall never widens the page, and the booking button still takes the click.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await band.getByRole('link', { name: 'Book a live demo' }).click({ trial: true });
  });

  test('shows the whole frame of each hero clip, on phones too: nothing is cut off', async ({ page }) => {
    const video = page.locator('.hm__view:not([hidden]) video');
    const box = (await video.boundingBox())!;
    // The clips are 1280 × 658; the box keeps that shape, so no side of the product screen is cropped.
    expect(Math.abs(box.width / box.height - 1280 / 658)).toBeLessThan(0.02);
    expect(await video.evaluate((v) => getComputedStyle(v).objectFit)).toBe('contain');
  });

  test('on a phone, "Watch it work" opens as a short card, not a full-height sheet', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The dialog’s phone layout');
    await page.locator('.hero').getByRole('link', { name: 'Watch it work' }).click();
    const dialog = page.getByRole('dialog', { name: 'Aldente in one minute' });
    await expect(dialog).toBeVisible();
    const [box, close, video] = await Promise.all([
      dialog.boundingBox(),
      dialog.getByRole('button', { name: 'Close' }).boundingBox(),
      dialog.locator('video').boundingBox(),
    ]);
    // The clip is wide, so the card is short: the close button keeps its own size and the video its shape.
    expect(close!.height).toBeLessThanOrEqual(44);
    expect(Math.round((video!.width / video!.height) * 100)).toBe(Math.round((16 / 9) * 100));
    expect(box!.height).toBeLessThan(video!.height + 200);
  });

  test('serves the clips small enough to start at once', async ({ request }) => {
    for (const clip of ['verify', 'dispute', 'tab', 'watch', 'tab-line', 'verify-station']) {
      const response = await request.head(`/media/${clip}.mp4`);
      expect(response.status(), clip).toBe(200);
      expect(Number(response.headers()['content-length']), clip).toBeLessThan(3_000_000);
    }
  });

  test('states the orders-served figure until live stats exist', async ({ page }) => {
    await expect(page.locator('.proof__line')).toHaveText('2M+ orders served across 200+ restaurant locations.');
    await expect(page.locator('live-counter')).toHaveCount(0);
  });

  test('names each customer logo once, however often the strip repeats it', async ({ page }) => {
    for (const name of ['McDonald’s', 'KFC', 'Burger King']) {
      await expect(page.locator('.logos').getByRole('img', { name, exact: true })).toHaveCount(1);
    }
    await expect(page.getByRole('img', { name: 'Shaurma Food' })).toHaveCount(0);
  });

  test('runs the sections in the agreed order, and no two neighbours share a ground', async ({ page }) => {
    const sections = page.locator('main > section');
    const read = await sections.evaluateAll((els) =>
      els.map((el) => ({
        id: el.id || el.className.split(' ')[0],
        tone: [...el.classList].find((c) => c.startsWith('tone-')),
        ground: getComputedStyle(el).backgroundColor + getComputedStyle(el).backgroundImage,
      })),
    );
    expect(read.map((r) => r.id)).toEqual(['hero', 'logos', 'products', 'calculator', 'results', 'faq', 'cta']);
    expect(read.map((r) => r.tone)).toEqual([
      'tone-orange',
      'tone-surface',
      'tone-dark',
      'tone-surface',
      'tone-paper',
      'tone-dark',
      'tone-orange',
    ]);
    for (let i = 1; i < read.length; i++) expect(read[i]!.ground).not.toBe(read[i - 1]!.ground);
    // The long demos live on the product pages now.
    await expect(page.locator('scroll-story, scroll-beats, aldo-demo, playbook-explorer')).toHaveCount(0);
    // The page talks about what the product does, not the hardware, and labels nothing as a sample or a concept.
    await expect(page.locator('main')).not.toContainText(/tablet/i);
    await expect(page.locator('body')).not.toContainText(/concept demo|sample data|for illustration|generated footage/i);
  });

  test('stays shorter than the old home page (14,231px)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The length target is set for a 1440px desktop.');
    await page.setViewportSize({ width: 1440, height: 900 });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(height).toBeLessThanOrEqual(12000);
  });

  test('names each section above its title', async ({ page }) => {
    await expect(page.locator('main .head .pill')).toHaveText(['Products', 'Calculator', 'Customer results', 'FAQ']);
  });

  test('shows one result per lead product and three quotes', async ({ page }) => {
    const results = page.locator('#results');
    await expect(results.locator('.tile__value b')).toHaveText(['87%', '1–2 hours', '8%']);
    await expect(results.locator('blockquote')).toHaveCount(3);
    // A result and its quote are one card: the quote starts right under its result, in the same column.
    const pairs = await results.locator('.tile').evaluateAll((cards) =>
      cards.map((card) => {
        const result = card.querySelector('.tile__result')!.getBoundingClientRect();
        const quote = card.querySelector('.quote')!.getBoundingClientRect();
        return { sameColumn: Math.abs(result.left - quote.left) < 1 && Math.abs(result.width - quote.width) < 1, joined: Math.abs(quote.top - result.bottom) < 2 };
      }),
    );
    expect(pairs).toHaveLength(3);
    expect(pairs.every((p) => p.sameColumn && p.joined)).toBe(true);
  });

  test('works out what wrong orders cost as the visitor types', async ({ page }) => {
    const calc = page.locator('cost-calculator');
    await expect(calc.locator('[data-out="saved"]')).toHaveText('$1.9M');
    await calc.getByLabel('Locations').fill('1');
    await expect(calc.locator('[data-out="wrong"]')).toHaveText('14');
    await expect(calc.locator('[data-out="saved"]')).toHaveText('$76K');
    await calc.getByLabel('Average check').fill('20');
    await expect(calc.locator('[data-out="refunds"]')).toHaveText('$102K');
  });

  test('answers the usual questions before the closing band', async ({ page }) => {
    const faq = page.locator('.faq');
    await expect(faq.locator('summary')).toHaveCount(6);
    await expect(faq.getByText('How is it priced?')).toHaveCount(0);
    await faq.getByText('Does it work with our POS and delivery apps?').click();
    await expect(faq.getByText('Aldente works with any POS system.')).toBeVisible();
  });
});

test.describe('products section', () => {
  const names = ['Verify', 'Dispute', 'Tab', 'Playbooks'];

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('lists all four products, and marks the one being read as you scroll', async ({ page }) => {
    const toc = page.getByRole('navigation', { name: 'Products' });
    await expect(toc.locator('.toc__name')).toHaveText(names);
    for (const id of ['dispute', 'playbooks', 'verify']) {
      await page.locator(`#${id} h3`).scrollIntoViewIfNeeded();
      await page.evaluate((target) => {
        const top = document.getElementById(target)!.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top - window.innerHeight * 0.3, behavior: 'instant' });
      }, id);
      await expect(toc.locator('a[aria-current]')).toHaveAttribute('href', `#${id}`);
    }
  });

  test('a contents link jumps to its product and sets the address', async ({ page }) => {
    const toc = page.getByRole('navigation', { name: 'Products' });
    await page.locator('#products').scrollIntoViewIfNeeded();
    await toc.getByRole('link', { name: /^Tab/ }).click();
    await expect(page).toHaveURL(/#tab$/);
    await expect(page.locator('#tab h3')).toBeInViewport();
    await expect(toc.locator('a[aria-current]')).toHaveAttribute('href', '#tab');
  });

  test('keeps the contents list in view: beside the blocks on desktop, a chip row under the header on phones', async ({ page, isMobile }) => {
    await page.evaluate(() => {
      const top = document.getElementById('tab')!.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: 'instant' });
    });
    const toc = page.locator('.tour__toc');
    await expect(toc).toBeInViewport();
    const box = (await toc.boundingBox())!;
    const header = (await page.locator('.header').boundingBox())!;
    if (isMobile) {
      expect(Math.round(box.y)).toBe(Math.round(header.y + header.height));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    } else {
      expect(box.y).toBeGreaterThan(header.height);
      expect(box.width).toBeLessThan(300);
    }
  });

  test('works with the keyboard: every contents link takes focus and shows it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Tab order is checked once, on desktop.');
    const links = page.getByRole('navigation', { name: 'Products' }).getByRole('link');
    await links.first().focus();
    for (let i = 0; i < names.length; i++) {
      await expect(links.nth(i)).toBeFocused();
      expect(await links.nth(i).evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
      await page.keyboard.press('Tab');
    }
  });

  test('each product block links to its page', async ({ page }) => {
    const hrefs = await page.locator('article.block a.btn:not(.btn--primary)').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(['/order-verification', '/order-verification#dispute', '/tab', '/playbooks']);
  });
});

test.describe('Tab page', () => {
  test('explains Tab with the camera view, three steps, the result and its questions', async ({ page }) => {
    await page.goto('/tab');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Orders rung up while staff build them.');
    await expect(page.locator('.page-hero .pill')).toHaveText('Aldente Tab');
    await expect(page.locator('.steps h3')).toHaveText(['The camera sees each scoop', 'The register adds the item', 'The guest pays']);
    // The result is a figure with its line, not a number set as a heading.
    await expect(page.locator('.result__figure')).toHaveText('8%');
    await expect(page.getByRole('heading', { name: 'More orders in the peak hour' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ingredient box tracking' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/concept demo|sample data|for illustration|generated footage/i);
    await expect(page.locator('.faq summary')).toHaveText([
      'Do staff do anything for each item?',
      'Which POS does it work with?',
      'What hardware does it need?',
      'What else does it track?',
    ]);
  });
});

test.describe('Playbooks page: Slack demo and Playbooks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playbooks');
  });

  test('walks through Aldo in Slack with the tabs', async ({ page }) => {
    const demo = page.locator('aldo-demo');
    await demo.getByRole('tab', { name: /Assign/ }).click();
    await expect(demo.locator('[data-slack-channel]')).toHaveText('hr-ops');
    await expect(demo.getByRole('tabpanel')).toContainText('Missing clock-out review');
    await expect(demo.getByRole('tabpanel')).toContainText('Send to');
    await expect(demo.getByRole('tabpanel')).not.toContainText('Owner');
    await expect(demo.getByText('Cancel', { exact: true })).toBeVisible();

    await demo.getByRole('tab', { name: /Assign/ }).press('ArrowDown');
    await expect(demo.getByRole('tab', { name: /Alert/ })).toHaveAttribute('aria-selected', 'true');
    await expect(demo.getByRole('tab', { name: /Alert/ })).toBeFocused();
    await expect(demo.locator('[data-slack-channel]')).toHaveText('district-west');
    await expect(demo.getByRole('tabpanel')).toContainText('closest district manager');
  });

  test('steps through Aldo’s tabs on its own while on screen', async ({ page }) => {
    const demo = page.locator('aldo-demo');
    await demo.scrollIntoViewIfNeeded();
    await expect(demo.getByRole('tab', { name: /Assign/ })).toHaveAttribute('aria-selected', 'true', { timeout: 8000 });
  });

  test('confirms a Playbook in Slack: the card locks and Aldo posts "Playbook created"', async ({ page }) => {
    const demo = page.locator('aldo-demo');
    await demo.getByRole('tab', { name: /Assign/ }).click();
    await demo.getByRole('button', { name: 'Confirm' }).click();
    await expect(demo.getByRole('button', { name: 'Confirm' })).toBeHidden();
    await expect(demo.getByRole('tabpanel')).toContainText(
      'Playbook created: Missing clock-out review. Results will be sent to #hr-review.',
    );
    await demo.getByRole('tab', { name: /Result/ }).click();
    await expect(demo.locator('[data-slack-channel]')).toHaveText('hr-review');
    await demo.getByText('Review case').click();
    await expect(demo.getByText('A camera event does not prove identity or paid hours.')).toBeVisible();
  });

  test('jumps from a Slack answer to the step it sets up', async ({ page }) => {
    const demo = page.locator('aldo-demo');
    await demo.getByRole('button', { name: 'Send this every Monday' }).click();
    const assign = demo.getByRole('tab', { name: /Assign/ });
    await expect(assign).toHaveAttribute('aria-selected', 'true');
    await expect(assign).toBeFocused();
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
    await page.goto('/tab');
    const toggle = page.getByRole('button', { name: 'Menu' });
    await toggle.click();
    const menu = page.getByRole('navigation', { name: 'Mobile' });
    await expect(menu.getByRole('link', { name: /^Aldente Tab/ })).toHaveAttribute('aria-current', 'page');
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
    const product = nav.getByRole('button', { name: 'Products' });
    await product.click();
    await expect(product).toHaveAttribute('aria-expanded', 'true');
    const verify = nav.getByRole('link', { name: /^Aldente Verify/ });
    await expect(verify).toBeVisible();
    await expect(verify).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: /^Aldente Tab/ })).toHaveAttribute('href', '/tab');
    await page.keyboard.press('Escape');
    await expect(verify).toBeHidden();
    await expect(product).toBeFocused();
  });

  test('open without moving the page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The dropdowns only show on wide screens.');
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(1500);
    const product = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Products' });
    await product.click();
    await expect(product).toHaveAttribute('aria-expanded', 'true');
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(1500);
  });
});

test.describe('product and solution heroes', () => {
  for (const [path, seeAldo] of [
    ['/playbooks', '#aldo'],
    ['/solutions/operations', '/playbooks#aldo'],
  ] as const) {
    test(`${path}: a visual beside the copy, one orange "Book a live demo", "See Aldo in action" to the demo`, async ({ page }) => {
      await page.goto(path);
      const hero = page.locator('.page-hero');
      await expect(hero.locator('.page-hero__media')).toBeVisible();
      await expect(hero.locator('.btn--primary')).toHaveText(['Book a live demo']);
      await expect(hero.getByRole('link', { name: 'See Aldo in action' })).toHaveAttribute('href', seeAldo);
      await expect(page.getByRole('link', { name: 'Get Aldo in Slack' })).toHaveCount(0);
    });
  }

  test('/aldo and /analytics, the retired pages, lead to /playbooks', async ({ page }) => {
    for (const old of ['/aldo', '/analytics']) {
      await page.goto(old);
      await expect(page).toHaveURL(/\/playbooks$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ask once in Slack, and it runs every shift.');
    }
  });

  test('/playbooks: Slack first, then a Playbook with its camera frame, then what the cameras read', async ({ page }) => {
    await page.goto('/playbooks');
    await expect(page.locator('.page-hero .pill')).toHaveText('Aldente Playbooks');
    // One sentence per heading, like the other product pages: not two clipped ones.
    await expect(page.locator('#playbooks-title')).toHaveText('Say it once, and it becomes a Playbook.');
    const order = await page.locator('main > section, main > aldo-demo, main section').evaluateAll((els) => els.map((el) => el.id).filter(Boolean));
    expect(order.indexOf('aldo')).toBeLessThan(order.indexOf('playbooks'));
    expect(order.indexOf('playbooks')).toBeLessThan(order.indexOf('analytics'));
    // Choosing a Playbook swaps the frame its message carries.
    const explorer = page.locator('playbook-explorer');
    await expect(explorer.locator('[data-shot]:visible')).toHaveAttribute('data-shot', 'exit');
    await explorer.getByRole('button', { name: /Long queues/ }).click();
    await expect(explorer.locator('[data-shot]:visible')).toHaveAttribute('data-shot', 'counter');
    await expect(explorer.locator('[data-shot]:visible img')).toBeVisible();
    await expect(page.locator('.cams > li')).toHaveCount(4);
    await expect(page.locator('body')).not.toContainText(/Aldente Vision|Chief of Staff|tablet/i);
  });

  test('/playbooks books the Aldente Playbooks demo', async ({ page }) => {
    await page.goto('/playbooks');
    await expect(page.locator('.page-hero .btn--primary')).toHaveAttribute('href', '/demo?plan=starter');
    await expect(page.locator('.cta').getByRole('link', { name: 'Book a live demo' })).toHaveAttribute('href', '/demo?plan=starter');
  });
});
