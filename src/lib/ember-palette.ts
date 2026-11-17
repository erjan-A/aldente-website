/**
 * The colours of the hero's glow ("Ember", src/scripts/hero-ember.ts): the burning orange of the orange surface
 * (`--surface-orange` in global.css), from its deep stop up to its warm light. No red-brown: the owner asked for
 * orange, not dark red (2026-11-17). White text stays readable because the copy has its own ground over the glow
 * (`--surface-orange-shade`), not because the glow is dark.
 */
export const EMBER_COLORS = ['#ff8f52', '#cf4318', '#ffa468', '#b8320d', '#e8602e', '#ad2c0a'] as const;
