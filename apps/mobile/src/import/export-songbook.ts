// Share the currently-loaded book archive via the system share sheet
// (iOS) / intent chooser (Android). M8 scope: share the archive as it
// was imported (with or without tunes).
//
// A future enhancement (tracked in Plan §6) is to also offer a fresh
// "without tunes" export when the loaded archive has tunes — that
// requires re-zipping just book.json, which is a deferred nice-to-have.

import { shareAsync, isAvailableAsync } from 'expo-sharing';

export async function shareBook(archiveUri: string): Promise<void> {
  const available = await isAvailableAsync();
  if (!available) {
    throw new Error('System sharing is not available on this device');
  }
  await shareAsync(archiveUri, {
    mimeType: 'application/zip',
    dialogTitle: 'Share Songbook',
    UTI: 'io.github.vbullinger.songbook.book',
  });
}
