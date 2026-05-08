// Reads UIAccessibility.isGuidedAccessEnabled and emits change events.
// iOS-only module — Android has no equivalent OS feature, and we keep the
// surface area uniform across platforms by gating the requireNativeModule
// call on Platform.OS. On Android the hook just always returns false and
// the suppression in useBookAudioPlayer never triggers.
//
// Mirrors the upstream iOS Swift app's master commit 1d2c58e fix:
// enabling Guided Access can send a phantom Play command to
// MPRemoteCommandCenter that would auto-start audio.

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

interface GuidedAccessChangeEvent {
  readonly enabled: boolean;
}

interface ExpoGuidedAccessNativeModule {
  isEnabled(): boolean;
  addListener(
    eventName: 'change',
    listener: (event: GuidedAccessChangeEvent) => void,
  ): EventSubscription;
}

// requireNativeModule throws on Android (the module isn't registered there),
// so guard with Platform.OS rather than try/catch — keeps the failure mode
// at module-load time, not lazily at first call.
const native: ExpoGuidedAccessNativeModule | null =
  Platform.OS === 'ios' ? requireNativeModule<ExpoGuidedAccessNativeModule>('ExpoGuidedAccess') : null;

/** Synchronous read. Always false on Android. */
export function isGuidedAccessEnabled(): boolean {
  return native?.isEnabled() ?? false;
}

/**
 * Reactive hook that re-renders when Guided Access toggles.
 * Returns the current state synchronously on first render.
 * On Android the listener is never registered and the value stays false.
 */
export function useGuidedAccessEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(isGuidedAccessEnabled);
  useEffect(() => {
    if (native === null) return;
    const sub = native.addListener('change', (e) => setEnabled(e.enabled));
    return () => sub.remove();
  }, []);
  return enabled;
}
