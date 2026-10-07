export type SaveOutcome = 'saved' | 'declined' | 'failed' | 'unavailable';

interface DownloadsNs {
  save(req: { filename: string; data: string | Uint8Array }): Promise<{ status: string }>;
}

let downloadsNs: Promise<DownloadsNs | null> | null = null;

/**
 * When Cuadra runs inside the claude.ai artifact viewer, the frame cannot start
 * downloads itself; the viewer's `downloads` capability asks the person to
 * confirm and saves the exact bytes. Anywhere else, `window.claude` does not
 * exist and we use a normal browser download.
 */
function viewerDownloads(): Promise<DownloadsNs | null> {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  if (!c?.use) return Promise.resolve(null);
  downloadsNs ??= c.use('downloads').then((ns) => (ns as DownloadsNs | null) ?? null, () => null);
  return downloadsNs;
}

/** Save generated content on the user's computer. Nothing is uploaded anywhere. */
export async function saveFile(content: Uint8Array | string, fileName: string, mime: string): Promise<SaveOutcome> {
  const ns = await viewerDownloads();
  if (ns) {
    try {
      await ns.save({ filename: fileName, data: content });
      return 'saved';
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'declined') return 'declined';
      if (code === 'rate_limited' || code === 'bad_request' || code === 'too_large') return 'failed';
      // unavailable / not granted: fall back to a regular download below.
    }
  }
  // A framed page without the capability cannot start downloads: say so instead of failing silently.
  if (window.top !== window.self) return 'unavailable';
  browserDownload(content, fileName, mime);
  return 'saved';
}

function browserDownload(content: Uint8Array | string, fileName: string, mime: string): void {
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
