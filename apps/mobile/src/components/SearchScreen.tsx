// Search overlay. Covers the pager while open, matches songs by title /
// subtitle / verse text / author via book-model's `search`. Tapping a
// result closes the overlay and jumps the pager to that song's page.
//
// Result list rendering is intentionally platform-neutral — iOS native
// search bar vs. Material SearchBar is a divergence captured in Plan §6
// and implemented in M9 polish, not here.

import { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Book, MatchType, SearchResultSection } from '@songbook/book-model';
import { search } from '@songbook/book-model';
import { useBookStore } from '../store/book-store';
import { colors, fonts, fontSizes, spacing } from '../theme';

export function SearchScreen({ book }: { book: Book }): React.JSX.Element {
  const query = useBookStore((s) => s.searchQuery);
  const setSearchQuery = useBookStore((s) => s.setSearchQuery);
  const closeSearch = useBookStore((s) => s.closeSearch);
  const navigateToSong = useBookStore((s) => s.navigateToSong);

  const sections = useMemo<readonly SearchResultSection[]>(() => search(book, query), [book, query]);

  const totalResults = sections.reduce((n, s) => n + s.results.length, 0);

  // Flatten for a single FlatList with section headers as synthetic rows.
  type Row =
    | { kind: 'header'; section: SearchResultSection }
    | { kind: 'result'; section: SearchResultSection; resultIndex: number };
  const rows: Row[] = [];
  for (const section of sections) {
    rows.push({ kind: 'header', section });
    for (let i = 0; i < section.results.length; i++) {
      rows.push({ kind: 'result', section, resultIndex: i });
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bar}>
        <TextInput
          value={query}
          onChangeText={setSearchQuery}
          placeholder="Search songs…"
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.input}
          placeholderTextColor={colors.inkFaint}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <Pressable onPress={closeSearch} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      {query.trim() === '' ? (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Type to search by title, subtitle, verse text or author.</Text>
        </View>
      ) : totalResults === 0 ? (
        <View style={styles.hint}>
          <Text style={styles.hintText}>No matches.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, i) =>
            row.kind === 'header' ? `h-${row.section.sectionIndex}` : `r-${i}`
          }
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              const { section } = item;
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>
                    {section.sectionTitle ?? `Section ${section.sectionIndex + 1}`}
                  </Text>
                </View>
              );
            }
            const result = item.section.results[item.resultIndex]!;
            return (
              <Pressable
                onPress={() => {
                  navigateToSong(result.songId);
                  closeSearch();
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.rowTitle}>{result.combinedTitle}</Text>
                {result.snippet !== undefined && (
                  <Text style={styles.rowSnippet} numberOfLines={2}>
                    {result.snippet}
                  </Text>
                )}
                <Text style={styles.rowBadge}>{matchLabel(result.matchType)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function matchLabel(m: MatchType): string {
  switch (m) {
    case 'exact-title':
      return 'exact';
    case 'title-prefix':
      return 'title';
    case 'title':
      return 'title';
    case 'subtitle':
      return 'subtitle';
    case 'text':
      return 'text';
    case 'author':
      return 'author';
    case 'number':
      return 'number';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBackground },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.verseBody,
    color: colors.ink,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  cancel: { padding: spacing.sm },
  cancelText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.accent,
  },
  hint: { padding: spacing.lg, alignItems: 'center' },
  hintText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionHeaderText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.rule,
  },
  rowPressed: { backgroundColor: colors.background },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.verseBody,
    color: colors.ink,
  },
  rowSnippet: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.inkMuted,
    marginTop: 2,
  },
  rowBadge: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
