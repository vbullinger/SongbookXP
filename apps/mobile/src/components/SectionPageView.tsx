import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, spacing } from '../theme';

/**
 * A section title page, shown between the book cover and the section's
 * songs. Sections with no title (rare but permitted by the schema)
 * display as "Section {index + 1}" so the page is never blank.
 *
 * Memoized so swiping in/out of section pages doesn't re-render the
 * section subtree just because a parent re-rendered.
 */
export const SectionPageView = memo(function SectionPageView({
  title,
  sectionIndex,
}: {
  title: string | undefined;
  sectionIndex: number;
}): React.JSX.Element {
  const display = title ?? `Section ${sectionIndex + 1}`;
  return (
    <View style={styles.page}>
      <View style={styles.inner}>
        <Text style={styles.kicker}>Section {sectionIndex + 1}</Text>
        <Text style={styles.title}>{display}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.pageBackground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  inner: {
    alignItems: 'center',
  },
  kicker: {
    fontFamily: fonts.body,
    fontSize: fontSizes.meta,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.title,
    color: colors.accent,
    textAlign: 'center',
  },
});
