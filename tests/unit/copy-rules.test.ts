import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The owner's copy rules, checked across everything the site can show (pages, components, data). A rule broken
 * on one page while the others keep it is how a promise slips onto the site.
 */
const SRC = join(process.cwd(), 'src');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const files = walk(SRC).filter((file) => /\.(astro|ts)$/.test(file) && !/\.test\.ts$/.test(file));
const hits = (pattern: RegExp) =>
  files.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .map((line, n) => (pattern.test(line) && !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line) ? `${file.replace(SRC, 'src')}:${n + 1}` : ''))
      .filter(Boolean),
  );

describe('copy rules', () => {
  it('Dispute builds evidence and never promises that a refund is fought or won', () => {
    expect(hits(/automatic[a-z ]*(refund )?disputes?|disputes? (delivery )?refunds? (for you|with (Uber|DoorDash))|dispute[sd]? [a-z ]*refunds for you|Stop paying|[Ww]on back|\bReversed\b|returned to the restaurant/)).toEqual([]);
  });

  it('never names a speed, and never the retired products', () => {
    expect(hits(/500 ?ms|half a second/i)).toEqual([]);
    expect(hits(/Aldente Vision|Chief of Staff/)).toEqual([]);
  });
});
