import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// The same end-to-end suite in the other engines: Safari's WebKit (desktop and iPhone) and Firefox.
// Install them once with `npx playwright install webkit firefox`, then run `npm run test:e2e:browsers`.
export default defineConfig({
  ...base,
  projects: [
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 14'] } },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
  ],
});
