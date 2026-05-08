// Resolves the lock-screen artwork URI to a value `expo-audio`'s
// `AudioMetadata.artworkUrl` will accept on both platforms — namely a
// real URL (`http(s)://...` or `file://...`) parseable by
// `java.net.URL` on Android and `URL(string:)` on iOS.
//
// Platform behavior:
// - Dev (Metro on either platform): asset URI is `http://<metro>/...`,
//   downloadAsync caches to a `file://` path. Both work.
// - iOS release: expo-asset's `localAssets` maps hash → `file://...`
//   (assets are bundled as files in the app bundle). Works.
// - Android release: expo-asset's `localAssets` maps hash → bare
//   drawable resource NAME (e.g. `assets_icon`) because RN bundles
//   image assets as packed Android drawable resources, not files.
//   The constructor flags `downloaded=true` immediately, so
//   `downloadAsync()` is a no-op — there's no automatic extraction.
//   We can't give expo-audio a usable URL here without manually
//   extracting the drawable, which is substantially more work than
//   the cosmetic value of an icon. Skip on Android release.
//
// The url-shape regex below filters all the fail cases down to a
// single check: only return localUri if it has a recognizable scheme.

import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';

const URL_SCHEME_REGEX = /^[a-z][a-z0-9+\-.]*:\/\//i;

let cachedUri: string | undefined;
let pending: Promise<string | undefined> | null = null;

function resolveArtwork(): Promise<string | undefined> {
  if (pending !== null) return pending;
  pending = (async () => {
    try {
      const asset = Asset.fromModule(require('../../assets/icon.png'));
      await asset.downloadAsync();
      const localUri = asset.localUri ?? undefined;
      cachedUri =
        localUri !== undefined && URL_SCHEME_REGEX.test(localUri) ? localUri : undefined;
    } catch {
      cachedUri = undefined;
    }
    return cachedUri;
  })();
  return pending;
}

void resolveArtwork();

export function useArtworkUri(): string | undefined {
  const [uri, setUri] = useState<string | undefined>(cachedUri);
  useEffect(() => {
    if (cachedUri !== undefined) {
      setUri(cachedUri);
      return;
    }
    let cancelled = false;
    void resolveArtwork().then((resolved) => {
      if (!cancelled) setUri(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return uri;
}
