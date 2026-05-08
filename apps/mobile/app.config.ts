import type { ExpoConfig } from 'expo/config';

const IS_PRODUCTION = process.env.EAS_BUILD_PROFILE === 'production';

// The real songbook file-type UTI we own (iOS) and the MIME-adjacent
// registrations (Android). Validated end-to-end by Spike 1 (2026-04-21).
const SONGBOOK_UTI = 'io.github.vbullinger.songbook.book';

const config: ExpoConfig = {
  name: 'Songbook',
  slug: 'songbook',
  scheme: 'songbook',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  // newArchEnabled removed — SDK 55 makes the New Architecture the
  // default and the explicit flag is no longer in Expo's config typings.
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    // Match the middle stop of the icon's red gradient so the centered
    // splash-icon (which Android 12+ masks into a circle regardless of
    // splash config) blends into the background — effectively a
    // fullscreen red boot. Top of icon gradient is #BD1931, bottom is
    // #7D1020; #9D1429 is roughly the midpoint.
    backgroundColor: '#9D1429',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'io.github.vbullinger.songbook',
    // Build 1 was uploaded to App Store Connect on 2026-05-18; build 2
    // followed with the icon fix. Build 3 adds the iOS security-scoped
    // URL handling for Files.app → iCloud Drive imports.
    buildNumber: '3',
    infoPlist: {
      // Declare we use no custom encryption beyond what Apple exempts (TLS for
      // OS-level networking). Without this, App Store Connect prompts for
      // export-compliance answers on every submission.
      ITSAppUsesNonExemptEncryption: false,
      // Lock iPad to portrait — content is portrait-only, and exposing the
      // landscape orientation would invite a "not iPad-optimized" rejection.
      'UISupportedInterfaceOrientations~ipad': [
        'UIInterfaceOrientationPortrait',
        'UIInterfaceOrientationPortraitUpsideDown',
      ],
      UIBackgroundModes: ['audio'],
      // Mirror the upstream Swift app's UTI registration exactly. Earlier we
      // declared `.songbook` as conforming to `public.zip-archive` with a
      // `public.mime-type` of `application/zip`, which made iOS route the
      // file through the system zip viewer (Files.app's preview) instead of
      // offering Songbook in Open With. Paul deliberately declares the file
      // as a generic public.data / public.content type so we own the
      // handler. LSSupportsOpeningDocumentsInPlace=false forces iOS to copy
      // the file into our Inbox before delivering, which matches our import
      // pipeline's expectation.
      LSSupportsOpeningDocumentsInPlace: false,
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'Songbook File',
          LSHandlerRank: 'Owner',
          LSItemContentTypes: [SONGBOOK_UTI],
        },
      ],
      UTExportedTypeDeclarations: [
        {
          UTTypeIdentifier: SONGBOOK_UTI,
          UTTypeDescription: 'Songbook File',
          UTTypeConformsTo: ['public.data', 'public.content'],
          UTTypeTagSpecification: {
            'public.filename-extension': ['songbook'],
          },
        },
      ],
    },
  },
  android: {
    package: 'io.github.vbullinger.songbook',
    // Mirror iOS — bump in lockstep so the two stores stay in sync.
    versionCode: 3,
    // Disable Google auto-backup. Songbook XP stores imported .songbook
    // archives in app-private storage; backing them up to the user's Drive
    // is wasteful (archives can exceed the 25 MB per-backup quota and fail
    // silently) and offers no recovery value for a single-book offline app.
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    // edgeToEdgeEnabled removed — SDK 55 makes edge-to-edge the default
    // (Android 15+ requires it). The flag itself is no longer in Expo's
    // Android config typings.
    predictiveBackGestureEnabled: false,
    // Block permissions that Songbook XP does not use. These would otherwise
    // be transitively pulled in by expo-audio's defaults or by React Native
    // baseline, and would appear unnecessarily in the Play Store permissions
    // list — bad for user trust.
    //
    //   RECORD_AUDIO         pulled in by expo-audio; app never records.
    //   SYSTEM_ALERT_WINDOW  not used by any feature.
    //   VIBRATE              app never vibrates.
    //
    // INTERNET / ACCESS_NETWORK_STATE are additionally blocked in production
    // only — dev-client must keep INTERNET to reach Metro. Spike 1 lesson
    // (2026-04-21): blocking INTERNET in dev-client produces `EPERM` on
    // socket and Metro is unreachable.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.VIBRATE',
      ...(IS_PRODUCTION
        ? ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE']
        : []),
    ],
    intentFilters: [
      {
        action: 'VIEW',
        category: ['DEFAULT', 'BROWSABLE'],
        data: [
          { scheme: 'content', mimeType: 'application/zip' },
          { scheme: 'content', mimeType: 'application/octet-stream' },
          { scheme: 'file', mimeType: 'application/zip' },
          { scheme: 'file', mimeType: 'application/octet-stream' },
        ],
      },
      {
        action: 'VIEW',
        category: ['DEFAULT', 'BROWSABLE'],
        data: [
          { scheme: 'content', host: '*', pathPattern: '.*\\\\.songbook' },
          { scheme: 'file', host: '*', pathPattern: '.*\\\\.songbook' },
          { scheme: 'https', host: '*', pathPattern: '.*\\\\.songbook' },
        ],
      },
    ],
  },
  plugins: [
    'expo-dev-client',
    [
      'expo-build-properties',
      {
        // react-native-zip-archive 7.1.0 hard-pins iOS 15.5 in its podspec;
        // bumping the floor unblocks `pod install` during prebuild.
        ios: { deploymentTarget: '15.5' },
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission: false,
      },
    ],
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/APHont-Regular.ttf',
          './assets/fonts/APHont-Bold.ttf',
          './assets/fonts/AtkinsonHyperlegible-Regular.otf',
          './assets/fonts/AtkinsonHyperlegible-Bold.otf',
        ],
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    eas: {
      projectId: 'f29e778e-2d24-4ae1-ab7a-5212d29c14b9',
    },
  },
};

export default config;
