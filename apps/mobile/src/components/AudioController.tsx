// Owns the single AudioPlayer instance for the app and renders the
// NowPlayingBar when the current page is a song with playable audio.
// Component kept separate from BookPager so the pager can remain a
// pure rendering surface.
//
// Phase 1.1 of the perf overhaul split this into two pieces:
//   - AudioController (outer): subscribes only to the current page kind
//     and unmounts when the user is on cover / section pages. Cheap to
//     re-render on every swipe.
//   - SongAudioController (inner): mounts ONLY while a song page is
//     visible. Owns the heavy hooks (useBookAudioPlayer, the memoized
//     sources/metadata, the eventual lock-screen registration). Mount
//     and unmount drive player lifecycle directly — swipes through
//     non-song pages no longer thrash the ExoPlayer / MediaSession.

import { useMemo } from 'react';
import type { AudioMetadata } from 'expo-audio';
import type { Song, SongId } from '@songbook/book-model';
import { combinedTitle, resolveAudioFromIndex } from '@songbook/book-model';
import { audioSourcesFor } from '../audio/audio-sources';
import { useArtworkUri } from '../audio/artwork-uri';
import { useBookAudioPlayer } from '../audio/use-book-audio-player';
import { useBookStore } from '../store/book-store';
import { NowPlayingBar } from './NowPlayingBar';

export function AudioController({
  songByKey,
  audioDirectoryUri,
}: {
  songByKey: ReadonlyMap<string, Song>;
  audioDirectoryUri: string | null;
}): React.JSX.Element | null {
  // Subscribe with a selector that yields a stable string for non-song
  // pages so this component doesn't re-render when the user swipes
  // between two adjacent non-song pages. The currentPage object itself
  // changes identity every time pages or currentPageIndex flips; the
  // string-key selector reduces re-renders meaningfully.
  const songKey = useBookStore((s) => {
    const page = s.pages[s.currentPageIndex];
    if (page?.kind !== 'song') return null;
    return `${page.songId.sectionIndex}-${page.songId.songIndex}`;
  });

  if (songKey === null) return null;
  return (
    <SongAudioController
      songKey={songKey}
      songByKey={songByKey}
      audioDirectoryUri={audioDirectoryUri}
    />
  );
}

function SongAudioController({
  songKey,
  songByKey,
  audioDirectoryUri,
}: {
  songKey: string;
  songByKey: ReadonlyMap<string, Song>;
  audioDirectoryUri: string | null;
}): React.JSX.Element | null {
  const bookTitle = useBookStore((s) => s.book?.title ?? '');
  const audioIndex = useBookStore((s) => s.audioIndex);
  const artworkUri = useArtworkUri();

  const { song, songId, title } = useMemo(() => {
    const s = songByKey.get(songKey) ?? null;
    if (s === null) return { song: null, songId: null, title: '' };
    const [sec, idx] = songKey.split('-').map(Number);
    return {
      song: s,
      songId: { sectionIndex: sec!, songIndex: idx! } as SongId,
      title: combinedTitle(s),
    };
  }, [songKey, songByKey]);

  const sources = useMemo(() => {
    if (song === null || songId === null) return [];
    // Phase 1.4 of the perf overhaul: O(takes per song) lookup against
    // the pre-built index instead of O(total available files) re-scan.
    const items = resolveAudioFromIndex(song, songId, audioIndex);
    return audioSourcesFor(items, audioDirectoryUri);
  }, [song, songId, audioDirectoryUri, audioIndex]);

  const metadata = useMemo<AudioMetadata | null>(() => {
    if (song === null) return null;
    return {
      title,
      artist: song.author ?? undefined,
      albumTitle: bookTitle,
      artworkUrl: artworkUri,
    };
  }, [song, title, bookTitle, artworkUri]);

  const controls = useBookAudioPlayer(sources, metadata);

  if (sources.length === 0) return null;
  return <NowPlayingBar controls={controls} title={title} />;
}
