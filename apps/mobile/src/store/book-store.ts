// Minimal app state. Zustand (~1KB) gives us a terse observable store
// analogous to Swift's @Observable. No middleware, no persistence yet;
// the current book's on-disk location persists across launches via the
// filesystem itself (fixed path under app-documents).
//
// Navigation model: `currentPageIndex` tracks the pager's position and
// updates on every user swipe. Programmatic jumps (from search results)
// go through `requestNavigation(pageIndex)` which bumps `navigationSeq`.
// BookPager watches the seq and imperatively calls `setPage`, so there
// is no feedback loop with user swipes.

import { create } from 'zustand';
import type { AudioIndex, Book, PageModel, Song, SongId } from '@songbook/book-model';
import { buildAudioIndex, pageModels, pageIndexBySongId, keyOf } from '@songbook/book-model';
import { perfMark } from '../perf/perf-marks';

const EMPTY_AUDIO_INDEX: AudioIndex = new Map();

// Per-`pages`-reference cache for the pageIndexBySong map. Keyed by the
// readonly array's identity so a fresh `setBook` invalidates implicitly
// (the new pages array is a different reference). WeakMap keeps the
// cache from preventing GC of old book pages.
const pageIndexBySongCache = new WeakMap<
  readonly PageModel[],
  ReadonlyMap<string, number>
>();

function getOrBuildPageIndexBySong(pages: readonly PageModel[]): ReadonlyMap<string, number> {
  const cached = pageIndexBySongCache.get(pages);
  if (cached !== undefined) return cached;
  const built = perfMark('store.pageIndexBySong (lazy)', () => pageIndexBySongId(pages));
  pageIndexBySongCache.set(pages, built);
  return built;
}

interface BookState {
  book: Book | null;
  songByKey: ReadonlyMap<string, Song>;
  pages: readonly PageModel[];
  // Phase 1.5 of the perf overhaul: pageIndexBySong is computed lazily
  // on first read inside `navigateToSong`. The cached map is keyed by
  // the `pages` reference identity so swapping in a new book invalidates
  // it implicitly. Previously this was eager inside setBook, costing
  // ~1ms on a 750-song book that often didn't need it (the search
  // overlay is the only consumer; users who don't search never pay).
  // Holding a WeakMap-keyed cache so book swaps GC the old index.
  // The internal cache is mutated; the BookState fields stay readonly.
  currentPageIndex: number;

  // Location of the unpacked book's audio files on disk. null when the
  // loaded book has no audio (text-only variant or bundled demo).
  audioDirectoryUri: string | null;

  // Filenames available alongside book.json in the unpacked book directory.
  // Kept for share-out / debug; per-song resolution uses audioIndex below.
  // Empty for bundled/demo books.
  audioFilenames: readonly string[];

  // Pre-built lookup keyed on `${sectionIndex}-${songIndex}` mapping to
  // the lexically-sorted ordered filename array for that song. Built
  // once at import time (Phase 1.4 of the perf overhaul) so per-song-
  // change resolution is O(takes) rather than O(total files).
  audioIndex: AudioIndex;

  // The original .songbook archive kept around for share-out. null when
  // the loaded book came from a bundled asset (demo).
  bookArchiveUri: string | null;

  // Request-based navigation for programmatic jumps.
  navigationSeq: number;
  navigationTarget: number;

  // Search overlay.
  searchOpen: boolean;
  searchQuery: string;

  loadError: string | null;

  setBook: (args: {
    book: Book;
    songByKey: ReadonlyMap<string, Song>;
    audioDirectoryUri?: string | null;
    audioFilenames?: readonly string[];
    audioIndex?: AudioIndex;
    bookArchiveUri?: string | null;
  }) => void;
  setLoadError: (message: string | null) => void;
  setCurrentPageIndex: (index: number) => void;
  requestNavigation: (pageIndex: number) => void;
  navigateToSong: (songId: SongId) => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
}

export const useBookStore = create<BookState>((set, get) => ({
  book: null,
  songByKey: new Map(),
  pages: [],
  currentPageIndex: 0,
  audioDirectoryUri: null,
  audioFilenames: [],
  audioIndex: EMPTY_AUDIO_INDEX,
  bookArchiveUri: null,
  navigationSeq: 0,
  navigationTarget: 0,
  searchOpen: false,
  searchQuery: '',
  loadError: null,

  setBook: ({ book, songByKey, audioDirectoryUri, audioFilenames, audioIndex, bookArchiveUri }) => {
    const pages = perfMark('store.pageModels', () => pageModels(book));
    // pageIndexBySong is computed lazily by getOrBuildPageIndexBySong on
    // first navigateToSong call. Skipping it here saves ~1ms on a
    // 750-song book per import — small but free.
    const resolvedAudioIndex =
      audioIndex ?? perfMark('store.buildAudioIndex', () => buildAudioIndex(audioFilenames ?? []));
    set({
      book,
      songByKey,
      pages,
      audioDirectoryUri: audioDirectoryUri ?? null,
      audioFilenames: audioFilenames ?? [],
      audioIndex: resolvedAudioIndex,
      bookArchiveUri: bookArchiveUri ?? null,
      currentPageIndex: 0,
      loadError: null,
    });
  },

  setLoadError: (message) => set({ loadError: message }),

  setCurrentPageIndex: (index) => set({ currentPageIndex: index }),

  requestNavigation: (pageIndex) =>
    set((s) => ({
      navigationSeq: s.navigationSeq + 1,
      navigationTarget: pageIndex,
      currentPageIndex: pageIndex,
    })),

  navigateToSong: (songId) => {
    const pages = get().pages;
    const target = getOrBuildPageIndexBySong(pages).get(keyOf(songId));
    if (target !== undefined) {
      get().requestNavigation(target);
    }
  },

  openSearch: () => set({ searchOpen: true, searchQuery: '' }),
  closeSearch: () => set({ searchOpen: false }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
