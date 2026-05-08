// Simple modal picker for the body font. Two bundled accessibility
// families (APHont, Atkinson Hyperlegible) — the iOS app had more,
// including a system font picker, but for M9 the curated pair covers
// our audience and keeps the UX identical on both platforms.

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FONT_MODES, type FontMode, colors, fontFamilyFor, fontSizes, spacing } from '../theme';

export function FontPickerSheet({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: FontMode;
  onSelect: (mode: FontMode) => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Font</Text>
          {FONT_MODES.map((mode) => {
            const family = fontFamilyFor(mode);
            const selected = mode === current;
            return (
              <Pressable
                key={mode}
                onPress={() => {
                  onSelect(mode);
                  onClose();
                }}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { fontFamily: family.bodyBold }]}>
                    {family.label}
                  </Text>
                  <Text style={[styles.optionSample, { fontFamily: family.body }]}>
                    The quick brown fox jumps over the lazy dog.
                  </Text>
                </View>
                {selected && <Text style={styles.check}>✓</Text>}
              </Pressable>
            );
          })}
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.pageBackground,
    borderRadius: 12,
    padding: spacing.lg,
  },
  title: {
    fontFamily: 'APHont-Bold',
    fontSize: fontSizes.title,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.rule,
    marginBottom: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: '#fdecea',
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: fontSizes.verseBody, color: colors.ink },
  optionSample: { fontSize: fontSizes.meta, color: colors.inkMuted, marginTop: 4 },
  check: { fontSize: 20, color: colors.accent, marginLeft: spacing.md },
  cancel: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontFamily: 'APHont-Bold',
    fontSize: fontSizes.meta,
    color: colors.accent,
  },
});
