# Native launcher branding

The Expo launcher, Android adaptive foreground/background and themed silhouette,
Expo favicon and launch artwork now use the web's Threshold mark. No application
behaviour or API contract changed; web already uses the canonical logo.

## Review order

1. Assets: `apps/native/assets/images/brand-mark.svg` mirrors the paths in both
   client BrandMark implementations. Obsolete `splash-icon.svg` was removed.
2. Generation: `scripts/generate-native-brand.sh` renders the SVG with ImageMagick
   7, creates transparent adaptive layers and an opaque white launcher background.
   Keep paths synchronized when changing the brand; the script does not parse TSX.
3. Guidance: `docs/design-system.md` records regeneration and binary requirements.

## Verification

- Web `check-types`, `test` (89 passed) and `build` passed.
- Native `check-types` and `test` (42 passed) passed.
- SVG paths match web and native components; all launcher/splash layers are
  1024px square; launcher/background are opaque; monochrome and foreground
  silhouettes match; nontransparent foreground pixels fit the adaptive safe circle.
- Shell syntax and `git diff --check` passed.
- Expo Android prebuild passed. First build failed because resources were
  regenerated while Gradle was running; a sequential retry passed with
  `./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`.
- Installed APK with `adb install -r` on the local arm64 Android emulator.
  Visually verified the new doorway in the app drawer and launched it; the existing
  signed-in session reached Sunrise Jaipur's Today screen.

## Remaining release checks

No iOS build, Android release splash check or device themed-icon visual check ran.
Development builds cannot validate the production splash appearance reliably.
Launcher changes require shipping a new native binary; no OTA/store release was
published. This work does not implement onboarding, whose audience and first-use
goal are still being discussed.
