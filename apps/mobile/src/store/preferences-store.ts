// Persistent user preferences. Small, durable settings that survive app
// restart — font choice for now; more will land here as they appear.
// Uses AsyncStorage directly (rather than Zustand persist) because our
// surface is small and explicit is clearer than middleware magic.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONT_MODES, type FontMode } from '../theme';

const KEY_FONT_MODE = 'pref:fontMode';
const DEFAULT_FONT_MODE: FontMode = 'aphont';

export function useFontModePreference(): [FontMode, (next: FontMode) => void] {
  const [mode, setMode] = useState<FontMode>(DEFAULT_FONT_MODE);

  // Read once on mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY_FONT_MODE)
      .then((raw) => {
        if (cancelled) return;
        if (raw !== null && (FONT_MODES as readonly string[]).includes(raw)) {
          setMode(raw as FontMode);
        }
      })
      .catch(() => {
        // Silent — stay on the default.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (next: FontMode) => {
    setMode(next);
    void AsyncStorage.setItem(KEY_FONT_MODE, next);
  };

  return [mode, update];
}
