/** Trigger a browser download of generated content. Nothing is uploaded anywhere. */
export function saveFile(content: Uint8Array | string, fileName: string, mime: string): void {
  const part: BlobPart = typeof content === 'string' ? content : (content.slice().buffer as ArrayBuffer);
  const blob = new Blob([part], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Small wrapper around localStorage that never throws (private mode, blocked storage). */
export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: the form still works for this session */
    }
  },
};
