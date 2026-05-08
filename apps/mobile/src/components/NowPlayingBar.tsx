// Bottom-of-screen transport bar shown when the current song has audio.
// Play/pause, skip-take buttons, a thin progress indicator. No lock-
// screen integration yet — that lands in M7.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, spacing } from '../theme';
import type { BookAudioPlayerControls } from '../audio/use-book-audio-player';

export function NowPlayingBar({
  controls,
  title,
}: {
  controls: BookAudioPlayerControls;
  title: string;
}): React.JSX.Element {
  const { state, toggle, nextTake, previousTake } = controls;
  const progress =
    state.durationSec > 0 ? Math.min(1, state.positionSec / state.durationSec) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {state.takeCount > 1 && (
            <Text style={styles.meta}>
              Take {state.currentTakeIndex + 1} of {state.takeCount}
            </Text>
          )}
        </View>
        <View style={styles.controls}>
          {state.takeCount > 1 && (
            <Pressable
              onPress={previousTake}
              disabled={state.currentTakeIndex === 0}
              style={styles.btn}
              hitSlop={8}
            >
              <Text style={[styles.btnText, state.currentTakeIndex === 0 && styles.btnDisabled]}>
                ‹‹
              </Text>
            </Pressable>
          )}
          <Pressable onPress={toggle} style={styles.playBtn} hitSlop={8}>
            <Text style={styles.playBtnText}>{state.isPlaying ? '❚❚' : '▶'}</Text>
          </Pressable>
          {state.takeCount > 1 && (
            <Pressable
              onPress={nextTake}
              disabled={state.currentTakeIndex >= state.takeCount - 1}
              style={styles.btn}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.btnText,
                  state.currentTakeIndex >= state.takeCount - 1 && styles.btnDisabled,
                ]}
              >
                ››
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    backgroundColor: colors.pageBackground,
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.rule,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  titleWrap: { flex: 1 },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.meta,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  btn: { padding: spacing.xs },
  btnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.verseBody,
    color: colors.accent,
  },
  btnDisabled: { color: colors.inkFaint, opacity: 0.5 },
  playBtn: {
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.bodyBold,
  },
});
