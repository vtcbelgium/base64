import { describe, it, expect } from 'vitest';
import {
  encodeBytes,
  decodeToBytes,
  encodeText,
  decodeToText,
  normalizeBase64,
  inspectBase64,
  detectFileType,
} from '../src/base64.ts';

describe('encodeText / decodeToText', () => {
  it('encodes ASCII text to standard Base64', () => {
    expect(encodeText('Hello, World!')).toBe('SGVsbG8sIFdvcmxkIQ==');
  });

  it('round-trips multi-byte UTF-8 text', () => {
    const text = 'Héllo wörld — 你好 🚀';
    expect(decodeToText(encodeText(text))).toBe(text);
  });

  it('encodes UTF-8 bytes, not UTF-16 code units', () => {
    expect(encodeText('é')).toBe('w6k=');
  });

  it('produces URL-safe output without padding when asked', () => {
    expect(encodeText('subjects?_d', { urlSafe: true })).toBe('c3ViamVjdHM_X2Q');
  });

  it('decodes URL-safe input without padding', () => {
    expect(decodeToText('c3ViamVjdHM_X2Q')).toBe('subjects?_d');
  });

  it('ignores whitespace and line breaks in input', () => {
    expect(decodeToText('SGVs\nbG8s IFdv\r\ncmxkIQ==')).toBe('Hello, World!');
  });

  it('accepts a data URL prefix', () => {
    expect(decodeToText('data:text/plain;base64,SGk=')).toBe('Hi');
  });

  it('throws on invalid characters', () => {
    expect(() => decodeToText('SGVsbG8*')).toThrow(/invalid/i);
  });

  it('throws when decoded bytes are not valid UTF-8', () => {
    expect(() => decodeToText('/w==')).toThrow(/utf-8/i);
  });

  it('encodes the empty string to the empty string', () => {
    expect(encodeText('')).toBe('');
    expect(decodeToText('')).toBe('');
  });
});

describe('encodeBytes / decodeToBytes', () => {
  it('round-trips every byte value', () => {
    const bytes = new Uint8Array(256).map((_, i) => i);
    expect(Array.from(decodeToBytes(encodeBytes(bytes)))).toEqual(Array.from(bytes));
  });

  it('handles inputs larger than the chunk size', () => {
    const bytes = new Uint8Array(100_000).map((_, i) => (i * 7) % 256);
    expect(decodeToBytes(encodeBytes(bytes))).toEqual(bytes);
  });

  it('throws on impossible length (one leftover character)', () => {
    expect(() => decodeToBytes('SGVsb')).toThrow(/length/i);
  });
});

describe('normalizeBase64', () => {
  it('converts URL-safe alphabet and restores padding', () => {
    expect(normalizeBase64('-_8')).toBe('+/8=');
  });
});

describe('inspectBase64', () => {
  it('reports a valid standard string with byte length and padding', () => {
    const info = inspectBase64('SGVsbG8sIFdvcmxkIQ==');
    expect(info.valid).toBe(true);
    expect(info.variant).toBe('standard');
    expect(info.byteLength).toBe(13);
    expect(info.padded).toBe(true);
    expect(info.isText).toBe(true);
  });

  it('detects the URL-safe variant', () => {
    expect(inspectBase64('c3ViamVjdHM_X2Q').variant).toBe('url-safe');
  });

  it('flags binary payloads and detects PNG', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    const info = inspectBase64(encodeBytes(png));
    expect(info.isText).toBe(false);
    expect(info.fileType?.mime).toBe('image/png');
  });

  it('returns an error message for invalid input', () => {
    const info = inspectBase64('not base64!');
    expect(info.valid).toBe(false);
    expect(info.error).toMatch(/invalid/i);
  });
});

describe('detectFileType', () => {
  it('recognizes PDF and returns null for unknown bytes', () => {
    expect(detectFileType(new TextEncoder().encode('%PDF-1.7'))?.ext).toBe('pdf');
    expect(detectFileType(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
