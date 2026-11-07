// Pure, dependency-free Base64 helpers. Everything runs in the browser; no data leaves the page.

export interface EncodeOptions {
  urlSafe?: boolean;
}

export interface FileType {
  mime: string;
  ext: string;
}

export interface Base64Info {
  valid: boolean;
  error?: string;
  variant?: 'standard' | 'url-safe';
  padded?: boolean;
  charLength: number;
  byteLength?: number;
  isText?: boolean;
  fileType?: FileType | null;
}

const CHUNK = 0x8000;
const DATA_URL_PREFIX = /^data:[^,]*;base64,/i;

export function encodeBytes(bytes: Uint8Array, options: EncodeOptions = {}): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const b64 = btoa(binary);
  return options.urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
}

export function encodeText(text: string, options: EncodeOptions = {}): string {
  return encodeBytes(new TextEncoder().encode(text), options);
}

/** Strips whitespace and a data URL prefix, maps URL-safe characters and restores padding. */
export function normalizeBase64(input: string): string {
  const cleaned = input.trim().replace(DATA_URL_PREFIX, '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/\-_]*={0,2}$/.test(cleaned)) {
    throw new Error('Invalid Base64: contains characters outside the Base64 alphabet.');
  }
  const body = cleaned.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');
  if (body.length % 4 === 1) {
    throw new Error('Invalid Base64: impossible length (one leftover character).');
  }
  return body + '='.repeat((4 - (body.length % 4)) % 4);
}

export function decodeToBytes(input: string): Uint8Array<ArrayBuffer> {
  const binary = atob(normalizeBase64(input));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function decodeToText(input: string): string {
  const bytes = decodeToBytes(input);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Decoded data is not valid UTF-8 text. Download it as a file instead.');
  }
}

const SIGNATURES: Array<{ magic: number[]; type: FileType }> = [
  { magic: [0x89, 0x50, 0x4e, 0x47], type: { mime: 'image/png', ext: 'png' } },
  { magic: [0xff, 0xd8, 0xff], type: { mime: 'image/jpeg', ext: 'jpg' } },
  { magic: [0x47, 0x49, 0x46, 0x38], type: { mime: 'image/gif', ext: 'gif' } },
  { magic: [0x25, 0x50, 0x44, 0x46], type: { mime: 'application/pdf', ext: 'pdf' } },
  { magic: [0x50, 0x4b, 0x03, 0x04], type: { mime: 'application/zip', ext: 'zip' } },
  { magic: [0x1f, 0x8b], type: { mime: 'application/gzip', ext: 'gz' } },
  { magic: [0x3c, 0x73, 0x76, 0x67], type: { mime: 'image/svg+xml', ext: 'svg' } },
];

export function detectFileType(bytes: Uint8Array): FileType | null {
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  const match = SIGNATURES.find(({ magic }) => magic.every((b, i) => bytes[i] === b));
  return match ? match.type : null;
}

function isUtf8(bytes: Uint8Array): boolean {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Control characters other than tab/newline/carriage return suggest binary data.
    return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text);
  } catch {
    return false;
  }
}

export function inspectBase64(input: string): Base64Info {
  const stripped = input.trim().replace(DATA_URL_PREFIX, '').replace(/\s+/g, '');
  try {
    const bytes = decodeToBytes(input);
    const fileType = detectFileType(bytes);
    return {
      valid: true,
      variant: /[-_]/.test(stripped) ? 'url-safe' : 'standard',
      padded: stripped.endsWith('='),
      charLength: stripped.length,
      byteLength: bytes.length,
      isText: !fileType && isUtf8(bytes),
      fileType,
    };
  } catch (err) {
    return { valid: false, error: (err as Error).message, charLength: stripped.length };
  }
}
