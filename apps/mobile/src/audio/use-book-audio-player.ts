// Thin hook wrapping `expo-audio` for the app's single-player model: one
// song playing at a time, optionally advancing through its takes.
//
// M7: MediaSession / Now Playing is wired through expo-audio's
// `setActiveForLockScreen(active, metadata, options)` (global activation +
// metadata) plus `player.updateLockScreenMetadata(metadata)` (per-player
// updates when the song or take changes).
//
// Spike 2 (2026-04-22) confirmed that calling `setIsAudioActiveAsync(true)`
// alone — which is what the spike did — does *not* publish a MediaSession
// notification. `setActiveForLockScreen` is the correct API. Playback
// survived Doze on Android 12 even without the notification, but Android
// 14+ would kill that session. Wiring it here closes that gap.
//
// Guided Access autoplay suppression (iOS-only behavior from master's
// commit 1d2c58e) is wired via the local `expo-guided-access` module.
// While Guided Access is on, we skip lock-screen / MediaSession
// registration so that the phantom Play command iOS dispatches at GA
// activation can't reach the player and auto-start audio.

import { useEffect, useRef, useState } from 'react';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioMetadata,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';
import { useGuidedAccessEnabled } from 'expo-guided-access';
import { perfMark } from '../perf/perf-marks';

export interface BookAudioPlayerState {
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  currentTakeIndex: number; // 0-based index into the provided sources
  takeCount: number;
}

export interface BookAudioPlayerControls {
  readonly state: BookAudioPlayerState;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(seconds: number): void;
  nextTake(): void;
  previousTake(): void;
  stop(): void;
}

const LOCK_SCREEN_OPTIONS = {
  showSeekForward: false,
  showSeekBackward: false,
} as const;

export function useBookAudioPlayer(
  sources: readonly AudioSource[],
  metadata: AudioMetadata | null,
): BookAudioPlayerControls {
  const playerRef = useRef<AudioPlayer | null>(null);
  // Stable ref to the latest metadata, read by the GA-gating effect when
  // it re-registers for lock-screen on GA→off without listing metadata
  // as a dep (which would defeat the rebuild-once design).
  const metadataRef = useRef<AudioMetadata | null>(metadata);
  metadataRef.current = metadata;
  const [currentTakeIndex, setCurrentTakeIndex] = useState(0);
  const guidedAccessActive = useGuidedAccessEnabled();
  const [state, setState] = useState<BookAudioPlayerState>({
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    currentTakeIndex: 0,
    takeCount: sources.length,
  });

  // Configure the session once on mount.
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });
    return () => {
      playerRef.current?.setActiveForLockScreen(false);
    };
  }, []);

  // Rebuild the player when the source set or take index changes.
  // Critically does NOT depend on guidedAccessActive — toggling GA must
  // not destroy and recreate the player (iOS player.remove() doesn't
  // reliably stop the AVAudioPlayer immediately, so a rebuild produces
  // a second concurrent instance + UI state desync). The GA-gating
  // effect below adjusts lock-screen registration on the existing
  // player instead.
  useEffect(() => {
    playerRef.current?.remove();
    playerRef.current = null;
    setState((s) => ({ ...s, isPlaying: false, positionSec: 0, durationSec: 0 }));

    const source = sources[currentTakeIndex];
    if (source === undefined) return;

    const player = perfMark('audio.createAudioPlayer', () => createAudioPlayer(source));
    playerRef.current = player;

    // Activate lock-screen / MediaSession on this player at creation
    // time. The GA-gating effect below will deactivate it if Guided
    // Access happens to be on right now (iOS dispatches a phantom Play
    // command at GA *activation*, not at every render — so registering
    // a fresh player while GA is already on is safe).
    if (!guidedAccessActive && metadata !== null) {
      perfMark('audio.setActiveForLockScreen', () =>
        player.setActiveForLockScreen(true, metadata, LOCK_SCREEN_OPTIONS),
      );
    }

    const sub = player.addListener('playbackStatusUpdate', (status: any) => {
      setState((prev) => ({
        ...prev,
        isPlaying: status?.playing ?? prev.isPlaying,
        positionSec: typeof status?.currentTime === 'number' ? status.currentTime : prev.positionSec,
        durationSec: typeof status?.duration === 'number' ? status.duration : prev.durationSec,
        currentTakeIndex,
        takeCount: sources.length,
      }));

      if (status?.didJustFinish) {
        if (currentTakeIndex + 1 < sources.length) {
          setCurrentTakeIndex(currentTakeIndex + 1);
        } else {
          player.pause();
        }
      }
    });

    return () => {
      sub.remove();
      // Explicitly deactivate before remove() so Android's
      // MediaSessionService releases audio focus and tears down its
      // foreground notification before the next player tries to claim
      // them. Without this, a swipe-quit can leave the service alive
      // holding state that blocks the next player from acquiring focus
      // (suspected cause of the 2026-04-30 Android audio-stuck bug —
      // could not be reproduced after Force Stop, but matches the
      // pattern). iOS no-op when the player isn't the active one.
      player.setActiveForLockScreen(false);
      player.remove();
    };
    // Intentional dep omissions:
    // - metadata: identity churn would rebuild the player; the dedicated
    //   metadata-update effect below handles changes via
    //   updateLockScreenMetadata (Phase 1.2 of the perf overhaul).
    // - guidedAccessActive: toggling GA must not rebuild the player;
    //   the GA-gating effect below toggles registration in place
    //   (2026-04-30 fix for the GA double-instance bug).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, currentTakeIndex]);

  // GA-gating: toggle lock-screen registration on the existing player
  // when Guided Access flips. Suppresses the phantom Play command iOS
  // dispatches at GA activation by deactivating the player's
  // remote-command target before the OS can deliver to it. Re-registers
  // on GA exit using the current metadata via the ref (kept out of
  // deps to avoid rebuilds on metadata identity churn).
  useEffect(() => {
    const p = playerRef.current;
    if (p === null) return;
    if (guidedAccessActive) {
      p.setActiveForLockScreen(false);
    } else if (metadataRef.current !== null) {
      p.setActiveForLockScreen(true, metadataRef.current, LOCK_SCREEN_OPTIONS);
    }
  }, [guidedAccessActive]);

  // Push metadata updates to the current player without tearing it down.
  useEffect(() => {
    const p = playerRef.current;
    if (p === null || p === undefined) return;
    if (metadata !== null) {
      p.updateLockScreenMetadata(metadata);
    }
  }, [metadata]);

  // Reset take index when the source set changes (new song selected).
  useEffect(() => {
    setCurrentTakeIndex(0);
  }, [sources]);

  const controls: BookAudioPlayerControls = {
    state,
    play: () => playerRef.current?.play(),
    pause: () => playerRef.current?.pause(),
    toggle: () => {
      const p = playerRef.current;
      if (p === null || p === undefined) return;
      if (state.isPlaying) p.pause();
      else p.play();
    },
    seek: (seconds) => {
      const p = playerRef.current;
      if (p === null || p === undefined) return;
      void p.seekTo(seconds);
    },
    nextTake: () => {
      if (currentTakeIndex + 1 < sources.length) {
        setCurrentTakeIndex(currentTakeIndex + 1);
      }
    },
    previousTake: () => {
      if (currentTakeIndex > 0) {
        setCurrentTakeIndex(currentTakeIndex - 1);
      }
    },
    stop: () => {
      playerRef.current?.pause();
      setCurrentTakeIndex(0);
    },
  };

  return controls;
}
