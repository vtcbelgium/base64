import { initTheme } from './theme.ts';
import { initModals } from './modals.ts';
import { showToast } from './toast.ts';
import { auditCookies } from './cookies.ts';
import { auditVault } from './vault.ts';
import { encodeBytes, encodeText, decodeToBytes, inspectBase64, type Base64Info } from './base64.ts';

const PLACEHOLDER = '<div class="output-placeholder">Output results will appear here in real-time.</div>';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initModals();

  const audit = auditCookies();
  const vault = auditVault();
  console.log(`[OTHRYS] Base64 Inspector and Converter initialized. Cookies: ${audit.totalCookies}, Client-Vault: ${vault.clientSideOnly}`);

  const inputEl = document.getElementById('app-input') as HTMLTextAreaElement | null;
  const outputRegion = document.getElementById('output-region');
  const processBtn = document.getElementById('action-process');
  const clearBtn = document.getElementById('action-clear');
  const copyBtn = document.getElementById('action-copy');
  const downloadBtn = document.getElementById('action-download') as HTMLButtonElement | null;
  const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
  const urlSafeEl = document.getElementById('opt-url-safe') as HTMLInputElement | null;
  const decodeEl = document.getElementById('mode-decode') as HTMLInputElement | null;

  if (!inputEl || !outputRegion) return;

  let output = '';
  let decoded: { bytes: Uint8Array<ArrayBuffer>; info: Base64Info } | null = null;

  const render = (heading: string, body: string) => {
    output = body;
    const title = document.createElement('p');
    title.textContent = heading;
    const pre = document.createElement('pre');
    pre.style.fontFamily = 'var(--font-mono)';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-all';
    pre.textContent = body;
    outputRegion.replaceChildren(title, pre);
  };

  const setDecoded = (value: typeof decoded) => {
    decoded = value;
    if (downloadBtn) downloadBtn.disabled = !value;
  };

  const encode = () => {
    const encoded = encodeText(inputEl.value, { urlSafe: urlSafeEl?.checked });
    setDecoded(null);
    render(`Encoded ${new TextEncoder().encode(inputEl.value).length} bytes → ${encoded.length} Base64 characters`, encoded);
  };

  const decode = () => {
    const info = inspectBase64(inputEl.value);
    if (!info.valid) {
      setDecoded(null);
      render('Not valid Base64', info.error ?? 'Unknown error');
      showToast('Input is not valid Base64.');
      return;
    }
    const bytes = decodeToBytes(inputEl.value);
    setDecoded({ bytes, info });
    const kind = info.fileType ? `${info.fileType.mime} file` : info.isText ? 'UTF-8 text' : 'binary data';
    const heading = `${info.variant} Base64${info.padded ? ', padded' : ''} · ${info.byteLength} bytes · ${kind}`;
    const body = info.isText
      ? new TextDecoder().decode(bytes)
      : `Binary payload (${info.byteLength} bytes). Use "Download Decoded File" to save it.`;
    render(heading, body);
  };

  processBtn?.addEventListener('click', () => {
    if (!inputEl.value.trim()) {
      showToast('Please enter input to process.');
      return;
    }
    if (decodeEl?.checked) decode();
    else encode();
    showToast('Conversion complete!');
  });

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const encoded = encodeBytes(bytes, { urlSafe: urlSafeEl?.checked });
    setDecoded(null);
    render(`Encoded file "${file.name}" (${bytes.length} bytes) → ${encoded.length} Base64 characters`, encoded);
    showToast('File encoded locally.');
  });

  downloadBtn?.addEventListener('click', () => {
    if (!decoded) return;
    const ext = decoded.info.fileType?.ext ?? (decoded.info.isText ? 'txt' : 'bin');
    const mime = decoded.info.fileType?.mime ?? 'application/octet-stream';
    const url = URL.createObjectURL(new Blob([decoded.bytes], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `decoded.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  });

  clearBtn?.addEventListener('click', () => {
    inputEl.value = '';
    if (fileInput) fileInput.value = '';
    output = '';
    setDecoded(null);
    outputRegion.innerHTML = PLACEHOLDER;
    showToast('Cleared');
  });

  copyBtn?.addEventListener('click', async () => {
    if (!output) {
      showToast('Nothing to copy.');
      return;
    }
    await navigator.clipboard.writeText(output);
    showToast('Copied to clipboard!');
  });
});
