// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://aldenteai.com',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  // Aldo and Aldente Vision are one product now, Aldente Playbooks: their old pages lead to its page.
  redirects: { '/aldo': '/playbooks', '/analytics': '/playbooks' },
  integrations: [sitemap()],
});
