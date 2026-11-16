import { expect, test } from './fixtures';

test('About us says why we exist, shows the problem with its numbers, then the customers', async ({ page }) => {
  await page.goto('/company');
  await expect(page).toHaveTitle(/^About us/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Restaurants lose money at the counter, so that is where we put the camera.');
  // The problem section moved here from the home page, with its three numbers.
  const problem = page.locator('.problem');
  await expect(problem.getByRole('heading', { level: 2 })).toHaveText('Delivery apps refund the guest, and the store pays, right or wrong.');
  await expect(problem.locator('dt')).toHaveCount(3);
  const read = await page.locator('main > section').evaluateAll((els) =>
    els.map((el) => ({ name: el.className.split(' ')[0], tone: [...el.classList].find((c) => c.startsWith('tone-')) })),
  );
  expect(read.map((r) => r.name)).toContain('problem');
  expect(read.findIndex((r) => r.name === 'problem')).toBeLessThan(read.findIndex((r) => r.name === 'voices'));
  await expect(page.locator('main')).not.toContainText(/Chief of Staff|tablet/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('the header reads Products, Solutions, About us, Pricing, and Solutions opens the three team pages', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The desktop header');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.locator('.nav__top')).toHaveText(['Products', 'Solutions', 'About us', 'Pricing']);
  await nav.getByRole('button', { name: 'Solutions' }).click();
  const solutions = nav.locator('#nav-solutions a');
  await expect(solutions).toHaveText([/Operations/, /HR/, /Delivery/]);
  await expect(solutions.first()).toBeVisible();
  expect(await solutions.evaluateAll((links) => links.map((a) => a.getAttribute('href')))).toEqual(['/solutions/operations', '/solutions/hr', '/solutions/delivery']);
  await expect(nav.getByRole('link', { name: 'About us' })).toHaveAttribute('href', '/company');
  await expect(nav.getByRole('link', { name: 'Security' })).toHaveCount(0);
});
