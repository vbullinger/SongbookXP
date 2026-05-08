// Maps a resolved list of audio filenames into the `AudioSource` objects
// that `expo-audio` accepts. The audio directory for the currently
// loaded book is supplied externally — for the bundled demo book it is
// null (there are no audio files) and this returns an empty list. For a
// real imported book (M8), the directory is the unpacked archive's path
// within the app sandbox.

import type { AudioSource } from 'expo-audio';
import type { PlayableItem } from '@songbook/book-model';

export function audioSourcesFor(
  items: readonly PlayableItem[],
  audioDirectoryUri: string | null,
): readonly AudioSource[] {
  if (audioDirectoryUri === null) return [];
  const base = audioDirectoryUri.endsWith('/') ? audioDirectoryUri : audioDirectoryUri + '/';
  return items.map(
    (item): AudioSource => ({
      uri: base + encodeURIComponent(item.audioFileName),
    }),
  );
}
