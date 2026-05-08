// Renders a single song page. Layout rules mirror Swift-Rewrite's
// SongPageView behavior, derived from Song.fullText:
//
//   {combinedTitle}                    — title
//   {subtitle}                         — subtitle (if present)
//
//   {verse.title}                      — verse title (if present)
//   {versePrefix}{verse.text}[ Chorus]? — verse body (if present)
//   ...
//
//   {author}                           — meta (if present)
//   {year}                             — meta (if present)
//
// versePrefix:
//   - "Chorus: " when verse.isChorus
//   - "{verse.number}: " when number present and not a chorus
//   - empty otherwise
//
// Appended " Chorus" when the verse carries a chorusIndex (reference to a
// sibling chorus verse to sing after).
//
// Phase 1.3 of the perf overhaul: wrapped in React.memo so that
// SongPageViews don't re-render on parent re-renders that don't change
// `song` or `fontMode`. Per-fontMode style arrays are precomputed once
// at module load and selected by lookup, so memoization isn't defeated
// by inline style-object identity churn.

import { memo } from 'react';
import { ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import type { Song, Verse } from '@songbook/book-model';
import { combinedTitle } from '@songbook/book-model';
import { colors, fontFamilyFor, fontSizes, spacing, type FontMode } from '../theme';

const baseStyles = StyleSheet.create({
  page: {
    // paddingTop clears BookPager's floating Search/Aa/page-indicator
    // toolbar (absolute-positioned at top: 0 of the pager). Cover and
    // section pages don't need this because their content is vertically
    // centered; only the top-aligned song page has the collision.
    paddingTop: spacing.xxl + spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.pageBackground,
    flexGrow: 1,
  } as ViewStyle,
  title: {
    fontSize: fontSizes.title,
    color: colors.ink,
    marginBottom: spacing.xs,
  } as TextStyle,
  subtitle: {
    fontSize: fontSizes.subtitle,
    color: colors.inkMuted,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  } as TextStyle,
  verseBlock: { marginTop: spacing.md } as ViewStyle,
  verseTitle: {
    fontSize: fontSizes.verseTitle,
    color: colors.ink,
    marginBottom: spacing.xs,
  } as TextStyle,
  verseBody: {
    fontSize: fontSizes.verseBody,
    color: colors.ink,
    lineHeight: fontSizes.verseBody * 1.45,
  } as TextStyle,
  verseAccent: { color: colors.accent } as TextStyle,
  repeatText: {
    fontSize: fontSizes.verseBody,
    color: colors.inkMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  } as TextStyle,
  meta: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  } as ViewStyle,
  metaLine: {
    fontSize: fontSizes.meta,
    color: colors.inkFaint,
    textAlign: 'right',
  } as TextStyle,
});

interface PerFontModeStyles {
  readonly title: TextStyle[];
  readonly subtitle: TextStyle[];
  readonly verseTitle: TextStyle[];
  readonly verseBody: TextStyle[];
  readonly verseAccent: TextStyle[];
  readonly repeatText: TextStyle[];
  readonly metaLine: TextStyle[];
}

// Precompute style arrays per fontMode once. Each array reference is
// stable across renders, so memoized children skip re-render when
// fontMode stays the same.
const STYLES_BY_FONT_MODE: Record<FontMode, PerFontModeStyles> = (() => {
  const out = {} as Record<FontMode, PerFontModeStyles>;
  for (const mode of ['aphont', 'atkinson'] as const) {
    const family = fontFamilyFor(mode);
    out[mode] = {
      title: [baseStyles.title, { fontFamily: family.bodyBold }],
      subtitle: [baseStyles.subtitle, { fontFamily: family.body }],
      verseTitle: [baseStyles.verseTitle, { fontFamily: family.bodyBold }],
      verseBody: [baseStyles.verseBody, { fontFamily: family.body }],
      verseAccent: [baseStyles.verseAccent, { fontFamily: family.bodyBold }],
      repeatText: [baseStyles.repeatText, { fontFamily: family.body }],
      metaLine: [baseStyles.metaLine, { fontFamily: family.body }],
    };
  }
  return out;
})();

export const SongPageView = memo(function SongPageView({
  song,
  fontMode,
}: {
  song: Song;
  fontMode: FontMode;
}): React.JSX.Element {
  const s = STYLES_BY_FONT_MODE[fontMode];
  return (
    <ScrollView contentContainerStyle={baseStyles.page}>
      <Text style={s.title}>{combinedTitle(song)}</Text>
      {song.subtitle !== undefined && <Text style={s.subtitle}>{song.subtitle}</Text>}

      {song.verses.map((verse, i) => (
        <VerseBlock key={i} verse={verse} s={s} />
      ))}

      {(song.author !== undefined || song.year !== undefined) && (
        <View style={baseStyles.meta}>
          {song.author !== undefined && <Text style={s.metaLine}>{song.author}</Text>}
          {song.year !== undefined && <Text style={s.metaLine}>{song.year}</Text>}
        </View>
      )}
    </ScrollView>
  );
});

const VerseBlock = memo(function VerseBlock({
  verse,
  s,
}: {
  verse: Verse;
  s: PerFontModeStyles;
}): React.JSX.Element {
  const prefix = versePrefix(verse);
  const body = verse.text ?? '';
  const suffix = verse.chorusIndex !== undefined ? ' Chorus' : '';

  return (
    <View style={baseStyles.verseBlock}>
      {verse.title !== undefined && <Text style={s.verseTitle}>{verse.title}</Text>}
      <Text style={s.verseBody}>
        {prefix !== '' && <Text style={s.verseAccent}>{prefix}</Text>}
        {body}
        {suffix !== '' && <Text style={s.verseAccent}>{suffix}</Text>}
      </Text>
      {verse.repeatText !== undefined && (
        <Text style={s.repeatText}>…{verse.repeatText}</Text>
      )}
    </View>
  );
});

function versePrefix(verse: Verse): string {
  if (verse.isChorus) return 'Chorus: ';
  if (verse.number !== undefined) return `${verse.number}: `;
  return '';
}
