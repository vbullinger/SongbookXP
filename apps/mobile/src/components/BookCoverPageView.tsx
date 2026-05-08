import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, fontSizes, spacing } from '../theme';

/**
 * The cover page of a book. Displays the title prominently with the
 * version number below, on the red vertical gradient Swift-Rewrite uses
 * for the same screen (RedGradientView).
 *
 * Memoized so the cover doesn't re-render on every parent update.
 */
export const BookCoverPageView = memo(function BookCoverPageView({
  title,
  version,
}: {
  title: string;
  version: number;
}): React.JSX.Element {
  return (
    <LinearGradient colors={[colors.accent, colors.accentDark]} style={styles.page}>
      <View style={styles.inner}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.version}>Version {version}</Text>
      </View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  inner: { alignItems: 'center' },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.title * 1.4,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  version: {
    fontFamily: fonts.body,
    fontSize: fontSizes.subtitle,
    color: '#ffffff',
    opacity: 0.85,
  },
});
