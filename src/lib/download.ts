import { strToU8, zipSync } from 'fflate';
import type { GeneratedFile } from '@/catalog/types';

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadZip(files: GeneratedFile[], slug: string): void {
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) entries[f.path] = strToU8(f.contents);
  const zipped = zipSync(entries, { level: 6 });
  // Copy into a fresh ArrayBuffer so the Blob never sees a SharedArrayBuffer view.
  saveBlob(new Blob([new Uint8Array(zipped)], { type: 'application/zip' }), `${slug || 'project'}-scaffold.zip`);
}

export function downloadFile(file: GeneratedFile): void {
  const name = file.path.split('/').pop() ?? 'file.txt';
  saveBlob(new Blob([file.contents], { type: 'text/plain;charset=utf-8' }), name);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs a secure context; fall back to the legacy path.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
