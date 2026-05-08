// iOS-only helper for copying a file from an arbitrary OS-delivered URL
// (Files.app → iCloud Drive, third-party DocumentProviders, etc.) into our
// app sandbox. expo-file-system's `copyAsync` fails on security-scoped URLs
// with "File … is not readable" because it never calls
// startAccessingSecurityScopedResource(). This module bridges that.
//
// On Android, the equivalent path is `copyAsync({ from: 'content://…' })`,
// which routes through ContentResolver and doesn't need security-scoped
// access — so this module is iOS-only and Android imports keep using
// expo-file-system/legacy.

import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

interface ExpoIosSecureCopyNativeModule {
  copyFile(fromUri: string, toUri: string): Promise<void>;
}

const native: ExpoIosSecureCopyNativeModule | null =
  Platform.OS === 'ios'
    ? requireNativeModule<ExpoIosSecureCopyNativeModule>('ExpoIosSecureCopy')
    : null;

/**
 * Copy a file from `fromUri` to `toUri` using NSFileCoordinator and
 * security-scoped access. iOS-only — throws on other platforms.
 */
export async function copySecureFile(fromUri: string, toUri: string): Promise<void> {
  if (native === null) {
    throw new Error('expo-ios-secure-copy: iOS-only module called from ' + Platform.OS);
  }
  await native.copyFile(fromUri, toUri);
}
