import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED = [
  'Name:',
  'URL:',
  'Description:',
  'LLMs-Txt:',
  'Sitemap:',
  'Protocol: public-read-only',
  'Privacy: zero-tracking-cookies, local-browser-execution, zero-cloud-uploads',
];

const FILES = ['agents.txt', '.well-known/agents.txt'];

function check(base: string) {
  for (const rel of FILES) {
    const p = resolve(base, rel);
    expect(existsSync(p)).toBe(true);
    const text = readFileSync(p, 'utf-8');
    for (const token of REQUIRED) {
      expect(text).toContain(token);
    }
  }
}

describe('agents discovery manifests', () => {
  it('ships public/ manifests', () => {
    check(resolve(__dirname, '../public'));
  });

  it('copies manifests into dist build output when present', () => {
    const dist = resolve(__dirname, '../dist');
    if (existsSync(dist)) {
      check(dist);
    }
  });
});
