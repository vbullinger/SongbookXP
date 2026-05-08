// Lightweight perf instrumentation. Wrap a sync or async operation in
// `perfMark` / `perfMarkAsync` to log its wall-clock duration to Metro
// console with a `[perf]` prefix. No-op outside development unless the
// `EXPO_PUBLIC_PERF_LOG=1` env var is set, so production builds pay
// zero overhead.
//
// Usage:
//   const result = perfMark('decode', () => decodeBookJson(json));
//   const result = await perfMarkAsync('unzip', () => unzip(uri));
//
// Wired at five hot points (see Phase 0.11 of the perf overhaul):
//   - apps/mobile/App.tsx                          → loadDemoBook()
//   - apps/mobile/src/import/import-songbook.ts    → copy / unzip / decode / list
//   - apps/mobile/src/store/book-store.ts          → setBook (pageModels + index)
//   - apps/mobile/src/audio/use-book-audio-player.ts → player rebuild effect
//   - apps/mobile/src/components/BookPager.tsx     → render bracket

declare const __DEV__: boolean | undefined;

function isEnabled(): boolean {
  // process.env in RN is replaced at build time, so EXPO_PUBLIC_PERF_LOG
  // appears as a literal here when set. __DEV__ is RN's standard build
  // flag — true in dev-client, false in release.
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_PERF_LOG === '1') return true;
  return false;
}

const ENABLED = isEnabled();

function format(ms: number): string {
  if (ms < 10) return ms.toFixed(2);
  if (ms < 100) return ms.toFixed(1);
  return ms.toFixed(0);
}

/** Wrap a synchronous operation; returns the operation's result. */
export function perfMark<T>(label: string, fn: () => T): T {
  if (!ENABLED) return fn();
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  try {
    return fn();
  } finally {
    const elapsed = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
    // eslint-disable-next-line no-console -- diagnostic in dev only
    console.log(`[perf] ${label} ${format(elapsed)}ms`);
  }
}

/** Wrap an async operation; returns the operation's resolved value. */
export async function perfMarkAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!ENABLED) return fn();
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  try {
    return await fn();
  } finally {
    const elapsed = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
    // eslint-disable-next-line no-console -- diagnostic in dev only
    console.log(`[perf] ${label} ${format(elapsed)}ms`);
  }
}
