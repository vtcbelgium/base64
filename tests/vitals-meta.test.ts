import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('social image vitals', () => {
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');
  const url = 'https://base64.othrys.be/og-image.svg';

  it('ships public/og-image.svg', () => {
    expect(existsSync(resolve(__dirname, '../public/og-image.svg'))).toBe(true);
  });

  it('declares og:image and twitter:image pointing to the asset', () => {
    expect(html).toContain(`<meta property="og:image" content="${url}"`);
    expect(html).toContain(`<meta name="twitter:image" content="${url}"`);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });
});
