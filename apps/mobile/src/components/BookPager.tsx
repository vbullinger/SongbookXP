// Horizontal page-swipe pager across every PageModel in the current book.
// This is the core navigation metaphor: one book-cover page, one page per
// section, one page per song, in positional order. Same metaphor on both
// platforms — the iOS app's book-like feel is deliberately preserved on
// Android per the parity policy in Plan §3.
//
// Phase 2 of the perf overhaul: WINDOWED. PagerView still receives a
// stable child count (one slot per PageModel), so swipe physics are
// untouched. But each slot only renders its actual content when within
// `Math.abs(i - currentPageIndex) <= WINDOW`. Out-of-window slots are
// empty <View> stubs the reconciler can walk in microseconds, vs. full
// SongPageView subtrees on the IALC 751-page book.
//
// Programmatic navigation (from search results) comes in through the
// store's `navigationSeq` / `navigationTarget` pair — we imperatively
// call `setPage` only when the seq advances, avoiding a feedback loop
// with user-swipe updates.

import { memo, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import type { PageModel, Song } from '@songbook/book-model';
import { BookCoverPageView } from './BookCoverPageView';
import { SectionPageView } from './SectionPageView';
import { SongPageView } from './SongPageView';
import { shareBook } from '../import/export-songbook';
import { useBookStore } from '../store/book-store';
import { colors, fonts, fontSizes, spacing, type FontMode } from '../theme';

// Number of pages on each side of currentPageIndex that render their
// full content. WINDOW=2 means a 5-page render window centered on the
// current page. PagerView's offscreenPageLimit=1 keeps adjacent native
// view trees mounted; the wider window here pre-renders so a fast
// swipe doesn't hit a flash of empty content.
const WINDOW = 2;

export function BookPager({
  songByKey,
  fontMode,
  onOpenFontPicker,
}: {
  songByKey: ReadonlyMap<string, Song>;
  fontMode: FontMode;
  onOpenFontPicker: () => void;
}): React.JSX.Element {
  const pages = useBookStore((s) => s.pages);
  const currentPageIndex = useBookStore((s) => s.currentPageIndex);
  const setCurrentPageIndex = useBookStore((s) => s.setCurrentPageIndex);
  const navigationSeq = useBookStore((s) => s.navigationSeq);
  const navigationTarget = useBookStore((s) => s.navigationTarget);
  const openSearch = useBookStore((s) => s.openSearch);
  const bookArchiveUri = useBookStore((s) => s.bookArchiveUri);
  const pagerRef = useRef<PagerView>(null);
  const lastSeqRef = useRef(navigationSeq);

  useEffect(() => {
    if (navigationSeq !== lastSeqRef.current) {
      pagerRef.current?.setPage(navigationTarget);
      lastSeqRef.current = navigationSeq;
    }
  }, [navigationSeq, navigationTarget]);

  // Memoize the children array. Without this, every store update (even
  // currentPageIndex flipping after a swipe) re-creates 750 React
  // elements, even though most slots end up rendering the same empty
  // <View>. With memoization the array reference only changes when a
  // dep that genuinely affects the rendered set (pages identity, the
  // window, fontMode for the visible slots, songByKey for songs) does.
  const children = useMemo(() => {
    return pages.map((page, i) => {
      const inWindow = Math.abs(i - currentPageIndex) <= WINDOW;
      return (
        <View key={keyFor(page, i)} style={styles.page} collapsable={false}>
          {inWindow ? (
            <PageSlot page={page} songByKey={songByKey} fontMode={fontMode} />
          ) : null}
        </View>
      );
    });
  }, [pages, currentPageIndex, songByKey, fontMode]);

  if (pages.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No book loaded.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={currentPageIndex}
        offscreenPageLimit={1}
        onPageSelected={(e) => setCurrentPageIndex(e.nativeEvent.position)}
      >
        {children}
      </PagerView>

      <View style={styles.toolbar} pointerEvents="box-none">
        <View style={styles.toolbarLeft}>
          <Pressable onPress={openSearch} style={styles.pillBtn} hitSlop={8}>
            <Text style={styles.pillBtnText}>Search</Text>
          </Pressable>
          <Pressable onPress={onOpenFontPicker} style={styles.pillBtn} hitSlop={8}>
            <Text style={styles.pillBtnText}>Aa</Text>
          </Pressable>
        </View>
        <View style={styles.toolbarRight}>
          {bookArchiveUri !== null && (
            <Pressable
              onPress={() => {
                void shareBook(bookArchiveUri).catch(() => {
                  // System share may fail (user cancel, no handler); silent is fine.
                });
              }}
              style={styles.pillBtn}
              hitSlop={8}
            >
              <Text style={styles.pillBtnText}>Share</Text>
            </Pressable>
          )}
          <Text style={styles.pageMeta}>
            {currentPageIndex + 1} / {pages.length}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Memoized so that an in-window slot whose props haven't changed (same
// page object reference, same songByKey reference, same fontMode) skips
// re-render even when the parent BookPager re-renders. Combined with
// SongPageView/SectionPageView/BookCoverPageView's own React.memo
// wrappers (Phase 1.3), this collapses re-render work to "only the
// slots whose content actually changed."
const PageSlot = memo(function PageSlot({
  page,
  songByKey,
  fontMode,
}: {
  page: PageModel;
  songByKey: ReadonlyMap<string, Song>;
  fontMode: FontMode;
}): React.JSX.Element {
  switch (page.kind) {
    case 'book':
      return <BookCoverPageView title={page.title} version={page.version} />;
    case 'section':
      return <SectionPageView title={page.title} sectionIndex={page.sectionIndex} />;
    case 'song': {
      const key = `${page.songId.sectionIndex}-${page.songId.songIndex}`;
      const song = songByKey.get(key);
      if (song === undefined) {
        return (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Song not found: {key}</Text>
          </View>
        );
      }
      return <SongPageView song={song} fontMode={fontMode} />;
    }
  }
});

function keyFor(page: PageModel, fallbackIndex: number): string {
  switch (page.kind) {
    case 'book':
      return 'book';
    case 'section':
      return `section-${page.sectionIndex}`;
    case 'song':
      return `song-${page.songId.sectionIndex}-${page.songId.songIndex}`;
    default:
      return `page-${fallbackIndex}`;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pager: { flex: 1 },
  page: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.inkMuted },
  toolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pillBtn: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 16,
  },
  pillBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.accent,
  },
  pageMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.inkMuted,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
});
