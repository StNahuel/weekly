import { vi } from 'vitest';

// jsdom has no object URLs; downloadExport also revokes one a second after the test may have ended.
function ensureObjectUrls() {
  for (const name of ['createObjectURL', 'revokeObjectURL'] as const) {
    if (!(name in URL)) Object.defineProperty(URL, name, { value: () => '', writable: true, configurable: true });
  }
}

export function captureDownloads(): Blob[] {
  ensureObjectUrls();
  const blobs: Blob[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((object) => {
    if (object instanceof Blob) blobs.push(object);
    return 'blob:weekly';
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  return blobs;
}
