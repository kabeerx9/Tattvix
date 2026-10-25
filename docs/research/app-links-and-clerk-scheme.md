# Clerk Expo scheme change and App Links / Universal Links on Vercel

Research date: 2026-10-25. Resolves GitHub issue #50. Two checklists: (1) moving the native app from scheme `tattvix` / `com.tattvix.app` to scheme `tattwix` / `com.tattwix.app` without breaking Clerk SSO; (2) making `https://tattwix.in/check-in/*` and `https://tattwix.in/hotel/*` open the native app (Android App Links, iOS Universal Links), served from the Vite + TanStack Router app on Vercel.

"Verified" means read from a primary source (vendor docs, vendor source code, or a live probe run on 2026-10-25). Items marked UNVERIFIED are inference or community-sourced and must be checked when the work is done.

Repo facts used below (read from the worktree, not assumed):

- `apps/native/app.json`: `scheme: "tattvix"`, `slug: "tattvix"`, `android.package: "com.tattvix.app"`, `ios.bundleIdentifier: "com.tattvix.app"`, `ios.deploymentTarget: "17.0"`, no `intentFilters`, no `associatedDomains`, no `extra.eas.projectId`.
- `apps/native/app/index.tsx` calls `startSSOFlow({ strategy: "oauth_google" })` with no `redirectUrl`. `apps/native/app/_layout.tsx` calls `WebBrowser.maybeCompleteAuthSession()` at module load.
- `apps/native/package.json`: `@clerk/clerk-expo ^2.19.31` (installed 2.19.31), `expo ~57.0.4`, `expo-router ~57.0.4`, `expo-web-browser ~57.0.0`, `expo-linking ~57.0.2`.
- `apps/native/android/` is committed to git (54 tracked files, including `app/src/main/AndroidManifest.xml`, which today carries `<data android:scheme="tattvix"/>` and `<data android:scheme="exp+tattvix"/>`). `apps/native/ios/` has only `.gitignore`, `.xcode.env` and `Podfile` tracked.
- Native routes today: `index`, `(guest)`, `+not-found`. There is no `check-in` or `hotel` route in the native app and no `+native-intent.tsx`.
- Web routes: `apps/web/src/routes/check-in/$token.tsx` → `/check-in/:token`; `apps/web/src/routes/_auth/_hotel/hotel/...` → `/hotel`, `/hotel/:organizationSlug`, `/hotel/:organizationSlug/:propertySlug/{dashboard,guests,stays,reports,details}`. Other hotel-side pages (`/dashboard`, `/guests`, `/rooms`, `/reservations`) live outside `/hotel/` and are not covered by the ticket's path list.
- `apps/web/vercel.json`: a single rewrite `/(.*)` → `/index.html` and a `/(.*)` headers block (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`). `apps/web/public/` has `robots.txt`, favicons, `images/`; no `.well-known/`.
- Live probe (curl, 2026-10-25): `https://tattwix.in/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` both return `200` with `content-type: text/html` and `content-disposition: inline; filename="index.html"` (the SPA rewrite). `https://tattwix.in/robots.txt` returns `text/plain` (static file wins over the rewrite). `https://www.tattwix.in/` returns `308` → `https://tattwix.in/`.

---

## Checklist 1: scheme and package change for Clerk SSO

### How the current sign-in actually works (so the checklist is grounded)

Read from the installed package `@clerk/clerk-expo@2.19.31`, `dist/hooks/useSSO.js` (lines 53-80), and confirmed against the upstream source `packages/expo/src/hooks/useSSO.ts` in `clerk/javascript`:

- `redirectUrl` defaults to `AuthSession.makeRedirectUri({ path: "sso-callback" })` when the caller passes none. The upstream source carries a comment that this URL must be allowlisted in the Clerk Dashboard (or via the Backend API) so the `rotating_token_nonce` is included on the SSO callback.
- The hook calls `signIn.create({ strategy, redirectUrl, ... })`, opens `signIn.firstFactorVerification.externalVerificationRedirectURL` with `WebBrowser.openAuthSessionAsync(url, redirectUrl, authSessionOptions)`, and on `type === "success"` reads `rotating_token_nonce` from the returned URL and calls `signIn.reload({ rotatingTokenNonce })`.
- `AuthSession.makeRedirectUri({ scheme, path })` produces `<scheme>://<path>` in development and production builds, using the first `expo.scheme` from the app config when `scheme` is omitted ("CNG projects: uses the `scheme` property from your app config"). In Expo Go it produces `exp://127.0.0.1:8081/--/<path>` instead. Source: https://docs.expo.dev/versions/latest/sdk/auth-session/ (makeRedirectUri) and https://docs.expo.dev/versions/latest/sdk/linking/ (`createURL`: "uses the first scheme in your app config").
- So today the native redirect URL is `tattvix://sso-callback`; after the change it becomes `tattwix://sso-callback`. Nothing in app code spells the scheme; it is derived from `app.json`.
- `expo-web-browser` on iOS: "To handle redirection back to the mobile application, the redirect URI set in the authentication server has to use the protocol provided as the scheme in app.json ... For example, `demo://` not `https://` protocol." Source: https://docs.expo.dev/versions/latest/sdk/webbrowser/ (`openAuthSessionAsync`). This is why the redirect must stay a custom-scheme URL even after App Links exist; do not switch the Clerk redirect to `https://tattwix.in/...`.
- `WebBrowser.maybeCompleteAuthSession()` is documented as web-only ("Supported platforms: Web"; "The method should be invoked on the page that the window redirects to"). Source: same page. On native it is a no-op; keeping the call in `_layout.tsx` is harmless and unaffected by the rename.

### Clerk Dashboard requirements (primary: Clerk docs)

Source: https://clerk.com/docs/guides/development/deployment/expo (read via the `.md` variant).

- "If you use hosted authentication, native components, or native sign-in hooks, you must add your application to the Native applications page" (https://dashboard.clerk.com/~/native-applications) "in the Clerk Dashboard for your production instance." `useSSO()` is listed under "Native sign-in hooks" in https://clerk.com/docs/expo/reference/overview (described there as "Browser-based SSO and OAuth flows"), so treat registration as required.
- "For iOS, you will need your app's Bundle ID and Team ID. For Android, you will need your app's namespace and package name." Clerk's Expo native Google guide (https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google) says the Android entry also takes a "SHA-256 certificate fingerprint" and the iOS entry the "App ID Prefix". UNVERIFIED whether the dashboard form enforces the SHA-256 for the browser-based `useSSO` flow or only for the native Google hook; have the EAS fingerprint ready (see Checklist 2) and fill it in either way.
- "Allowlist for mobile SSO redirect": on the Native applications page, "scroll down to the Allowlist for mobile SSO redirect section and add your redirect URLs." Clerk sends the security-critical nonce only to allowlisted URLs in native browsers/webviews, and production instances require the allowlist (Dashboard or Backend API: https://clerk.com/docs/reference/backend/redirect-urls/create-redirect-url).
- Clerk's stated default for native SDKs is `{bundleIdentifier}://callback`; that default is for Clerk's iOS/Android SDKs. The Expo SDK's default is `<scheme>://sso-callback` as shown above; allowlist the Expo one.
- Hosted-auth doc (https://clerk.com/docs/android/guides/account-portal/hosted-auth): "Production instances validate the callback against the registered bundle identifier or package name", and "Rebuild the native project after you add the plugin or change the Android package name." UNVERIFIED whether the Expo SDK's custom-scheme callback is validated against the registered package name (the text is written for the Android SDK), but the safe assumption is that the registered Android entry must say `com.tattwix.app` before the first production build is tested.

### The checklist

Files (all under `apps/native/` unless noted):

1. `app.json` → `expo.scheme: "tattwix"`. Format rule: lowercase letter first, then lowercase letters, digits, `+`, `.`, `-` (https://docs.expo.dev/versions/latest/config/app/#scheme). "This is a build-time configuration, it has no effect in Expo Go." A scheme change cannot ship through EAS Update; it needs a new build (AuthSession doc, Configuration section).
2. `app.json` → `expo.android.package: "com.tattwix.app"`, `expo.ios.bundleIdentifier: "com.tattwix.app"`.
3. `app.json` → `expo.slug` is still `"tattvix"`. The slug is the EAS project identifier; decide whether the new EAS project uses slug `tattwix` and add `extra.eas.projectId` when `eas init` creates it. (Not a Clerk requirement; listed because it is in the same file and the ticket says "new EAS project".)
4. `app/index.tsx`: no change required. It passes no `redirectUrl`, so the default follows `app.json`. If a `redirectUrl` is ever added, build it with `AuthSession.makeRedirectUri({ path: "sso-callback" })` or `{ scheme: "tattwix", path: "sso-callback" }`, never a hard-coded string.
5. `app/_layout.tsx`: no change (`maybeCompleteAuthSession` is web-only, see above).
6. Committed prebuild output `android/`: regenerate, do not hand-edit. `npx expo prebuild --clean -p android` rewrites `android/app/src/main/AndroidManifest.xml` (`<data android:scheme="tattwix"/>`, `<data android:scheme="exp+tattwix"/>`), `android/app/build.gradle` (`namespace`/`applicationId`), and moves the Kotlin package directory from `com/tattvix/app` to `com/tattwix/app`. The `exp+<scheme>` entry is added by `expo-dev-client`'s config plugin (`plugin/build/withGeneratedAndroidScheme.js`, `getDefaultScheme.js` in the installed `expo-dev-client@57.0.5`) and only exists in development builds. The generated intent filters carry `data-generated="true"` and are replaced on each prebuild (https://github.com/expo/expo/blob/main/packages/%40expo/config-plugins/src/android/IntentFilters.ts). If EAS Build runs prebuild itself (no committed `android/` on the EAS side), the committed directory still must match, otherwise EAS builds from the stale committed manifest. UNVERIFIED which of the two the current `eas.json` (none exists yet in the repo) will do; the safest route is to stop committing `android/` or to recommit it after `prebuild --clean`.
7. `ios/`: `npx expo prebuild -p ios` regenerates `Info.plist` `CFBundleURLSchemes` and the bundle identifier; nothing is committed beyond `Podfile`, so nothing stale to fix.
8. Grep for the old identifiers before you finish: `grep -rn "tattvix://\|com\.tattvix\.app\|exp+tattvix" apps/native --exclude-dir=node_modules`. Today the only hits outside `android/` are the `@tattvix/*` workspace package names in `app/_layout.tsx` and `lib/api.ts`, which stay (memory rule: `tattvix` is the repo/package id and is never renamed).
9. `@tattvix/env/native` / `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: unchanged. Same Clerk instance, same key.

Dashboard settings:

10. Clerk Dashboard → Native applications (production instance): add/replace the Android app with package `com.tattwix.app` (plus namespace and the EAS SHA-256 fingerprint), and the iOS app with bundle `com.tattwix.app` plus Team ID / App ID prefix. Remove the `com.tattvix.app` entries once the old build is retired. Clerk says to do this "before you create a production build".
11. Clerk Dashboard → Native applications → Allowlist for mobile SSO redirect: add `tattwix://sso-callback`. Keep `tattvix://sso-callback` only while old builds are in use, then remove it. If a development Clerk instance is used for dev builds, repeat there (production is where Clerk says it is mandatory; adding it in dev avoids a missing-nonce surprise).
12. Google Cloud Console: no change expected. For Clerk's browser-based Google OAuth the authorized redirect URI is Clerk's own callback on the Clerk domain, not the app scheme (https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google). UNVERIFIED by re-reading the current Google Cloud client config; confirm the Clerk-provided redirect URI is still the one registered.

### How to verify sign-in still works

1. Build a development build with the new identifiers (`eas build --profile development -p android`, then iOS), install it.
2. Prove the scheme is registered: `npx uri-scheme open tattwix://sso-callback --android` and `--ios` (https://docs.expo.dev/linking/into-your-app/). The app should come to the foreground. On Android, `adb shell dumpsys package com.tattwix.app | grep -A3 "Schemes"` lists `tattwix` and `exp+tattwix` (UNVERIFIED exact dumpsys formatting; the point is the scheme appears).
3. Tap "Continue with Google". Expected: system browser (Chrome Custom Tab / `ASWebAuthenticationSession`) opens on Clerk's domain, Google completes, the browser closes itself, `startSSOFlow` resolves with `createdSessionId`, and `<SignedIn>` redirects to `/(guest)`.
4. Failure signatures and what they mean:
   - Browser completes but never closes / app shows "cancel": the scheme in the build does not match what Clerk redirected to. Re-check `app.json` scheme and that this is a fresh build, not an EAS Update.
   - Browser closes but `createdSessionId` is `null` or `signIn.reload` fails: the nonce was not sent. The redirect URL `tattwix://sso-callback` is missing from the Clerk allowlist, or the Native application entry does not match `com.tattwix.app`.
   - On Android, after the browser closes the app lands on `+not-found`: Expo Router received the `tattwix://sso-callback` URL as a navigation event. UNVERIFIED whether this happens with `openAuthSessionAsync` on Android (the Expo docs say Android uses "custom Chrome tabs, AppState, and Linking APIs"). If it does, add `app/sso-callback.tsx` that renders `<Redirect href="/" />`, or map it in `+native-intent.tsx` (see below).
5. Repeat on a production build against the production Clerk instance before publishing; the allowlist is enforced there.

Side note for the SDK 58 upgrade (out of scope, but found while reading): `npm view @clerk/clerk-expo deprecated` prints "@clerk/clerk-expo is deprecated. Migrate to @clerk/expo by following the Core 3 upgrade guide https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3" (latest `@clerk/clerk-expo` is 2.20.0; `@clerk/expo` is 4.14.1). Current Clerk Expo docs assume `@clerk/expo` and an `@clerk/expo` config plugin in `app.json` `plugins`. The checklist above is written against the installed 2.19.31 source, so it holds for 2.x; re-read `useSSO` after a migration.

---

## Checklist 2: Android App Links and iOS Universal Links

### `app.json` additions

`expo.android.intentFilters` schema (from `@expo/config-types` `ExpoConfig.ts`): entries have `autoVerify?: boolean`, `action: string`, `data?: AndroidIntentFiltersData | AndroidIntentFiltersData[]`, `category?: string | string[]`. `AndroidIntentFiltersData` fields: `scheme`, `host`, `port`, `path`, `pathPattern`, `pathPrefix`, `pathSuffix` (API 31+), `pathAdvancedPattern` (API 31+), `mimeType`. The config plugin prefixes `action` with `android.intent.action.`, each `category` with `android.intent.category.`, each `data` key with `android:`, and emits `android:autoVerify="true"` when `autoVerify` is truthy (https://github.com/expo/expo/blob/main/packages/%40expo/config-plugins/src/android/IntentFilters.ts). Expo's App Links guide: "Specifying `autoVerify` is required for Android App Links to work correctly" (https://docs.expo.dev/linking/android-app-links/).

Android path semantics (https://developer.android.com/guide/topics/manifest/data-element): `pathPrefix` "specifies a partial path that is matched against only the initial part of the path"; `path` is an exact match; `pathPattern` supports `.`, `*`, `.*` wildcards. All `<data>` elements inside one `<intent-filter>` are merged ("All the `<data>` elements contained within the same `<intent-filter>` element contribute to the same filter"), so one filter with host `tattwix.in` and two `pathPrefix` entries matches either prefix. Android recommends separate filters only when you need distinct scheme/host combinations (https://developer.android.com/training/app-links/add-applinks).

```json
{
  "expo": {
    "scheme": "tattwix",
    "android": {
      "package": "com.tattwix.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            { "scheme": "https", "host": "tattwix.in", "pathPrefix": "/check-in/" },
            { "scheme": "https", "host": "tattwix.in", "pathPrefix": "/hotel" }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "ios": {
      "bundleIdentifier": "com.tattwix.app",
      "associatedDomains": ["applinks:tattwix.in"]
    }
  }
}
```

Notes on the values:

- `pathPrefix: "/check-in/"` (trailing slash) requires a token segment; a bare `/check-in` stays in the browser. `pathPrefix: "/hotel"` matches `/hotel`, `/hotel/<org>/...` and would also match a hypothetical `/hotels` (prefix semantics); no such web route exists today.
- Only `https` is declared. Android's own example also lists `http` so http links can be delegated; the ticket asked for https and `tattwix.in` redirects http anyway. Adding `{ "scheme": "http", ... }` later does not affect verification (Android verifies hosts, not schemes, and warns only against non-http(s) schemes in the same filter).
- Do not put `tattwix` (the custom scheme) into this filter. Expo prebuild generates a separate scheme filter from `expo.scheme`; mixing a custom scheme into the `autoVerify` filter breaks verification ("Do not include other schemes, as this will prevent verification", add-applinks page).
- `www.tattwix.in` is not listed: it 308-redirects to the apex, and Android verifies each host independently, so listing it would require a second `assetlinks.json` on `www` (add-applinks: "treats subdomains in your intent filters as unique, separate hosts").
- `ios.associatedDomains` entries "must follow the format `applinks:<fully qualified domain>[:port number]`" (https://docs.expo.dev/versions/latest/config/app/#associateddomains). No `https://` prefix: Expo calls that "a common mistake that will result in the universal links not working" (https://docs.expo.dev/linking/ios-universal-links/). EAS Build registers the Associated Domains capability on the App ID automatically; with CNG, `npx expo prebuild` writes `com.apple.developer.associated-domains` into the entitlements file (same page).

After editing `app.json`, run `npx expo prebuild --clean` (both platforms) and recommit `android/` if it stays tracked. Expo: "If you change the web files, rebuild the native app so Google's servers pick up the update" and iOS "only re-fetches the AASA on app install or App Store update" (Expo App Links / Universal Links pages).

### `/.well-known/assetlinks.json` (Android)

Shape (verbatim structure from https://developer.android.com/training/app-links/configure-assetlinks and https://developers.google.com/digital-asset-links/v1/getting-started):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.tattwix.app",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:...:FF"
      ]
    }
  }
]
```

- `package_name` is the `applicationId` (`expo.android.package`). `sha256_cert_fingerprints` "supports multiple fingerprints, which can be used to support different versions of your app, such as debug and production builds" (configure-assetlinks). Add the EAS production keystore fingerprint; add the development-build keystore fingerprint too if dev builds should open links.
- Hosting rules (configure-assetlinks, verbatim bullets): served with content-type `application/json`; accessible over HTTPS; "accessible without any redirects (no 301 or 302 redirects)"; published on every host named in the intent filters.
- Play App Signing: if the app is later enrolled, "the certificate fingerprint produced by running `keytool` locally will usually not match the one on users' devices"; the correct snippet is in Play Console → Release → Setup → App signing. EAS-managed keystores are upload keys from Play's point of view once Play App Signing is on. UNVERIFIED whether this project will enroll in Play App Signing (it is the default for new apps on Play); if it does, the Play-provided fingerprint, not the EAS one, must be in `assetlinks.json`.

Getting the fingerprint from EAS (primary: https://docs.expo.dev/linking/android-app-links/ "Native app configuration", and `eas-cli` source):

1. Create at least one build so EAS has generated/stored the keystore for `com.tattwix.app` (EAS prompts to generate a keystore on the first remote-credentials build: https://docs.expo.dev/build-reference/android-builds/).
2. `eas credentials -p android`, choose the build profile. The keystore summary prints `SHA256 Fingerprint` (eas-cli `packages/eas-cli/src/credentials/android/utils/printCredentials.ts`, `displayAndroidKeystore`, formats the raw hex as uppercase colon-separated bytes). Copy it.
3. Alternative, from a downloaded keystore: `eas credentials` → Android → profile → "credentials.json: Upload/Download credentials between EAS servers and your local json" → "Download credentials from EAS to credentials.json" (https://docs.expo.dev/app-signing/app-credentials/), then `keytool -list -v -keystore <file>.jks -alias <keyAlias>` and read the `SHA256:` line (https://support.google.com/android-developer-console/answer/16641489). From a built APK: `apksigner verify --print-certs app.apk` (same Google page).
4. Because the package changed to `com.tattwix.app`, EAS credentials are a new, separate entry (eas-cli prints credentials under an "application identifier" header) with a new keystore and therefore a new fingerprint. UNVERIFIED that EAS cannot be told to reuse the old keystore; it can (upload via `credentials.json`), but a fresh keystore is simpler for an app with zero users.

### `/.well-known/apple-app-site-association` (iOS)

Shape (https://developer.apple.com/documentation/xcode/supporting-associated-domains, read via Apple's docs JSON endpoint):

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<TEAM_ID>.com.tattwix.app"],
        "components": [
          { "/": "/check-in/*", "comment": "Guest check-in links" },
          { "/": "/hotel", "comment": "Hotel landing" },
          { "/": "/hotel/*", "comment": "Hotel pages" }
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["<TEAM_ID>.com.tattwix.app"]
  }
}
```

- `appIDs` entries are `<Application Identifier Prefix>.<Bundle Identifier>`; the prefix is the Apple Team ID in the normal case (Expo: https://expo.fyi/apple-team). Use `appIDs` + `components` only; Apple TN3155 warns not to mix with the legacy `appID` + `paths` form. `deploymentTarget` is 17.0, so the legacy form is unnecessary (Expo notes `appIDs` is iOS 13+).
- `*` in a component path does not match path separators according to Expo's guide ("The `*` wildcard does not match domain or path separators"); Apple's own page describes `/buy/*` as "Matches any URL with a path that starts with /buy/". UNVERIFIED which reading is right for multi-segment paths like `/hotel/<org>/<prop>/stays`; if deep hotel paths fail to open the app, add `{ "/": "/hotel/*/*" }` and `{ "/": "/hotel/*/*/*" }` entries or switch to a `pathPattern`-style test with `swcutil verify` (below).
- File name has no extension; location `https://tattwix.in/.well-known/apple-app-site-association`. "You must host the file using https:// with a valid certificate and with no redirects." Uncompressed size limit 128 KB (Expo guide). `webcredentials` is optional and recommended by Expo for password autofill.
- CDN: "Starting with macOS 11 and iOS 14, apps no longer send requests for apple-app-site-association files directly to your web server. Instead, they send these requests to an Apple-managed content delivery network" (Apple). "Apple's content delivery network requests the apple-app-site-association file for your domain within 24 hours. Devices check for updates approximately once per week after app installation." TN3155: "There is no direct CDN invalidation option"; reinstall the app to pull a newer file; the file must be reachable from all IPs and user agents (test with `curl -A "MyAgent-Bot/*" https://tattwix.in/.well-known/apple-app-site-association`).

### Serving both files from the Vite / TanStack Router app on Vercel

Facts established:

- Vite copies `public/` "to the root of the dist directory as-is" (https://vite.dev/guide/assets#the-public-directory). Dotfile directories are included: a scratch build with the project's installed `vite@8.0.16` and `public/.well-known/{assetlinks.json,apple-app-site-association}` produced `dist/.well-known/assetlinks.json` and `dist/.well-known/apple-app-site-association` (local test, 2026-10-25).
- Vercel serves static files before applying `rewrites`: "The `source` property should NOT be a file because precedence is given to the filesystem prior to rewrites being applied" (https://vercel.com/docs/project-configuration/vercel-json#rewrites). Confirmed live: `robots.txt` is served as `text/plain` on tattwix.in despite the `/(.*)` → `/index.html` rewrite, while the two missing `.well-known` paths currently fall through to `index.html` (HTML, 200). So adding the files is enough to beat the rewrite; the rewrite itself does not need to change.
- Content type: Vercel infers it from the extension (`robots.txt` → `text/plain`, so `assetlinks.json` → `application/json` is expected). `apple-app-site-association` has no extension, so set it explicitly with a `headers` rule. Vercel's `headers` config supports arbitrary response headers on static paths (https://vercel.com/docs/project-configuration/vercel-json#headers). UNVERIFIED that Vercel honours a `Content-Type` override on a static file (the docs example uses `Cache-Control`); Apple does not strictly require `application/json` but Google does for `assetlinks.json`, and the extension already covers that. Verify with curl after deploy.
- Existing `/(.*)` headers (nosniff, DENY, Referrer-Policy, Permissions-Policy) are harmless for both files. `X-Content-Type-Options: nosniff` makes the explicit Content-Type matter more, so keep the rule below.
- No redirects: files live on the apex and `www` already redirects to apex, so no `applinks:www.tattwix.in` and no second copy needed. Do not add `trailingSlash` or `cleanUrls` settings that would redirect these paths.

Changes:

1. `apps/web/public/.well-known/assetlinks.json` (content above, real fingerprint).
2. `apps/web/public/.well-known/apple-app-site-association` (content above, real Team ID).
3. `apps/web/vercel.json` add to `headers`:

```json
{
  "source": "/.well-known/apple-app-site-association",
  "headers": [{ "key": "Content-Type", "value": "application/json" }]
},
{
  "source": "/.well-known/assetlinks.json",
  "headers": [{ "key": "Content-Type", "value": "application/json" }]
}
```

Place these before the `/(.*)` entry (Vercel applies all matching header rules; the order only matters if two rules set the same key).

4. `apps/web/public/robots.txt`: ensure it does not `Disallow: /.well-known/` (currently it does not; Google's crawler and Apple's CDN must be able to fetch).

### Verification

Web (run after deploy):

- `curl -sI https://tattwix.in/.well-known/assetlinks.json` → `200`, `content-type: application/json`, no `location` header.
- `curl -sI https://tattwix.in/.well-known/apple-app-site-association` → `200`, `content-type: application/json`, no `location`.
- Google Digital Asset Links API: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://tattwix.in&relation=delegate_permission/common.handle_all_urls` (endpoint from https://developers.google.com/digital-asset-links/reference/rest/v1/statements/list; it returns the parsed statements or an error describing why the file was rejected). Google's Statement List Generator and Tester at https://developers.google.com/digital-asset-links/tools/generator can also generate and "test an existing statement file" for a site + package + fingerprint.
- Apple CDN: `curl -sD - https://app-site-association.cdn-apple.com/a/v1/tattwix.in -o /dev/null` should return `200` once Apple has fetched the file (within 24 h). The `/a/v1/<domain>` URL is community-documented (Apple Developer Forums threads 736053, 821908) and not in Apple's docs; UNVERIFIED as an official contract, but widely used. Apple's official local checks (TN3155, https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links): `sudo swcutil dl -d tattwix.in` and `sudo swcutil verify -d tattwix.in -j ./aasa.json -u https://tattwix.in/check-in/abc` (expects `Pattern "..." matched.`).

Android device (https://developer.android.com/training/app-links/verify-android-applinks):

- Install the new build, wait at least 20 seconds, then `adb shell pm get-app-links com.tattwix.app`. Expect `tattwix.in: verified`. Other states: `none` (not yet run), `legacy_failure`, numeric `1024+` codes (verifier error; usually the file was unreachable, wrong content type, or fingerprint mismatch).
- Force a re-run on Android 12+: `adb shell pm set-app-links --package com.tattwix.app 0 all` then `adb shell pm verify-app-links --re-verify com.tattwix.app`, wait, then `pm get-app-links` again.
- End to end: `adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "https://tattwix.in/check-in/test-token"` must open the app without a chooser. Per-user override state: `adb shell pm get-app-links --user cur com.tattwix.app`.
- Dev loop without a deployed site: Expo's tunnel recipe (`EXPO_TUNNEL_SUBDOMAIN`, `npx expo start --tunnel`, ngrok host in `intentFilters`) in the Expo App Links guide.

iOS device:

- Install the build, open `https://tattwix.in/check-in/test-token` from Notes or Messages (not from Safari already on `tattwix.in`; TN3155: same-domain navigation stays in the browser). Long-press the link to see "Open in Tattwix".
- Settings → Developer → Associated Domains Development → Diagnostics, enter the URL. For a not-yet-public server, add `applinks:tattwix.in?mode=developer` to `associatedDomains` in a dev build; that mode bypasses the CDN and only works for development-signed apps (https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.associated-domains).

### Expo Router deep-link handling: cold start and deferring until sign-in

How a cold-start link reaches the router (read from `expo-router` source on `main`; SDK 57/58 behaviour should match, UNVERIFIED against the exact installed tag):

1. `getLinkingConfig.ts` builds React Navigation's `linking` object. On native, `getInitialURL` is wrapped: the URL goes through `applyRedirects` (the `redirects` from `expo-router` settings), then, if `app/+native-intent.tsx` exports `redirectSystemPath`, through `redirectSystemPath({ path: initialUrl, initial: true })`. The result is cached because "Expo Router calls `getInitialURL` twice".
2. `link/linking.ts` `getInitialURL`: on iOS reads `Linking.getLinkingURL()` synchronously; on Android races `Linking.getInitialURL()` against a 150 ms timer (`fork/getInitialURLWithTimeout.ts`, "Timeout in 150ms if `getInitialState` doesn't resolve") and falls back to `null`, which becomes the root URL (`Linking.createURL('/')`). Warm-start links arrive via `Linking.addEventListener('url')` in `subscribe`, which runs `redirectSystemPath({ path, initial: false })`.
3. `+native-intent.tsx` contract (https://docs.expo.dev/router/advanced/native-intent/ and https://docs.expo.dev/versions/latest/sdk/router/#nativeintent): `redirectSystemPath({ path, initial })` returns `string | Promise<string | null> | null`; a falsy return means "no redirection occurs and the app stays on the current path"; "While the parameter is called `path` there is no guarantee that this is a path or a valid URL"; it is native-only; and it "lacks app context, so you don't have access to logic such as authentication status or the current route's state".
4. The Expo Router authentication guide: "If a user visits a deep link to any routes with the authentication check, they'll be redirected to the sign-in screen" (https://docs.expo.dev/router/advanced/authentication/). `Stack.Protected` with `guard={false}` sends the user to the anchor route, or to `redirectTo` on SDK 58+ (https://docs.expo.dev/router/advanced/protected/). Neither doc describes restoring the original link after sign-in; the modal variant only "partially preserve[s] deep links".

What this means for Tattwix:

- An `https://tattwix.in/check-in/<token>` link only does something useful if the native app has a route for it. Today there is no `app/check-in/[token].tsx`; the router would land on `+not-found`. UNVERIFIED whether Expo Router maps the `https://tattwix.in` host to the route tree without extra config (Expo's App Links guide implies yes, since it only tells you to add `intentFilters` and "handle URLs" with the standard router), so test the mapping first with `npx uri-scheme open "https://tattwix.in/check-in/x" --android` on a verified build.
- Deferring until sign-in, recommended pattern (design recommendation, not vendor-documented): because `+native-intent` has no auth state, do not try to gate there. Instead:
  1. In `app/+native-intent.tsx`, normalise inbound URLs to app paths (strip `https://tattwix.in`, drop anything that is not `/check-in/...` or `/hotel/...`, return `null` for unknown hosts so nothing navigates). Also map `tattwix://sso-callback` to `null` if the Android `+not-found` case in Checklist 1 turns out to be real.
  2. Create the target routes in the native app (`app/check-in/[token].tsx` etc.) under a `Stack.Protected guard={isSignedIn}` (Clerk's `useAuth().isSignedIn`), with `redirectTo="/"` (SDK 58) or the anchor fallback (SDK 57).
  3. In the root layout, read `Linking.useLinkingURL()` ("On reload it always returns the initial URL immediately", https://docs.expo.dev/versions/latest/sdk/linking/) and stash the normalised path in state (a ref or a small store) while `isSignedIn` is false. After `setActive({ session })` resolves in `index.tsx`, `router.replace(stashedPath ?? "/(guest)")` and clear the stash. Keep the splash visible until Clerk's `isLoaded` is true so the guard does not fire on a stale `false`.
  4. Alternative without state: have `redirectSystemPath` rewrite `https://tattwix.in/check-in/<t>` to `/?next=%2Fcheck-in%2F<t>` and let `index.tsx` read `next` with `useLocalSearchParams` and replace to it after sign-in. This keeps everything inside router params and works on cold and warm starts because `redirectSystemPath` runs on both.
  5. Guest check-in tokens are single-use-ish bearer links; whichever option is chosen, drop the stash if sign-in fails so a later unrelated sign-in does not replay an old token.

---

## Open items (UNVERIFIED, re-check during implementation)

1. Whether Clerk's Native applications form requires a SHA-256 fingerprint for the browser-based `useSSO` flow or only for native Google/Apple hooks.
2. Whether production-instance callback validation against the registered package name applies to the Expo custom-scheme callback.
3. Whether `tattwix://sso-callback` reaches Expo Router as a navigation on Android after `openAuthSessionAsync` closes the tab.
4. Whether EAS Build uses the committed `android/` directory or regenerates it; either way `prebuild --clean` + recommit is safe.
5. Whether Play App Signing will be enabled; if so the Play Console fingerprint replaces the EAS one in `assetlinks.json`.
6. Whether Vercel honours a `Content-Type` header override for the extension-less `apple-app-site-association` static file.
7. Whether AASA `/hotel/*` matches multi-segment paths; test with `swcutil verify`.
8. The Apple CDN check URL `https://app-site-association.cdn-apple.com/a/v1/<domain>` is community-documented, not in Apple's docs.
9. Whether Expo Router maps `https://tattwix.in/...` to the route tree without additional linking config, and the exact SDK 57/58 behaviour of `getInitialURL` (read from `main`).
10. `@clerk/clerk-expo` is deprecated upstream in favour of `@clerk/expo` (Core 3); this research targets the installed 2.19.31.

## Sources

- Clerk, Deploy an Expo app to production: https://clerk.com/docs/guides/development/deployment/expo
- Clerk, `useSSO()` reference: https://clerk.com/docs/reference/expo/use-sso
- Clerk, Expo SDK overview (native sign-in hooks): https://clerk.com/docs/expo/reference/overview
- Clerk, Expo Sign in with Google (native): https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google
- Clerk, Android hosted auth (callback validation, package name): https://clerk.com/docs/android/guides/account-portal/hosted-auth
- Clerk, Google social connection (web flow redirect URI): https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google
- Clerk source, `useSSO`: https://github.com/clerk/javascript/blob/main/packages/expo/src/hooks/useSSO.ts and installed `@clerk/clerk-expo@2.19.31/dist/hooks/useSSO.js`
- Expo, AuthSession `makeRedirectUri`: https://docs.expo.dev/versions/latest/sdk/auth-session/
- Expo, WebBrowser (`openAuthSessionAsync`, `maybeCompleteAuthSession`): https://docs.expo.dev/versions/latest/sdk/webbrowser/
- Expo, Linking (`createURL`, `useLinkingURL`, `getInitialURL`): https://docs.expo.dev/versions/latest/sdk/linking/
- Expo, Linking into your app: https://docs.expo.dev/linking/into-your-app/
- Expo, Android App Links: https://docs.expo.dev/linking/android-app-links/
- Expo, iOS Universal Links: https://docs.expo.dev/linking/ios-universal-links/
- Expo, app config reference (`scheme`, `intentFilters`, `associatedDomains`): https://docs.expo.dev/versions/latest/config/app/
- Expo, `+native-intent`: https://docs.expo.dev/router/advanced/native-intent/ and https://docs.expo.dev/versions/latest/sdk/router/#nativeintent
- Expo, Router authentication / protected routes: https://docs.expo.dev/router/advanced/authentication/ , https://docs.expo.dev/router/advanced/protected/
- Expo source: `packages/@expo/config-plugins/src/android/IntentFilters.ts`, `packages/@expo/config-types/src/ExpoConfig.ts`, `packages/expo-router/src/getLinkingConfig.ts`, `packages/expo-router/src/link/linking.ts`, `packages/expo-router/src/fork/getInitialURLWithTimeout.ts` (all on https://github.com/expo/expo/tree/main)
- Expo, app credentials / managed credentials: https://docs.expo.dev/app-signing/app-credentials/ , https://docs.expo.dev/app-signing/managed-credentials/ , https://docs.expo.dev/build-reference/android-builds/
- eas-cli source, `displayAndroidKeystore` (`SHA256 Fingerprint`): https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/credentials/android/utils/printCredentials.ts
- Android, Verify App Links (adb commands, states): https://developer.android.com/training/app-links/verify-android-applinks
- Android, Configure website associations (`assetlinks.json`, hosting rules, keytool, Play App Signing): https://developer.android.com/training/app-links/configure-assetlinks
- Android, Add intent filters: https://developer.android.com/training/app-links/add-applinks
- Android, `<data>` element reference: https://developer.android.com/guide/topics/manifest/data-element
- Google, Digital Asset Links getting started and `statements.list`: https://developers.google.com/digital-asset-links/v1/getting-started , https://developers.google.com/digital-asset-links/reference/rest/v1/statements/list , generator/tester: https://developers.google.com/digital-asset-links/tools/generator
- Google, SHA-256 certificate fingerprint (keytool/apksigner): https://support.google.com/android-developer-console/answer/16641489
- Apple, Supporting associated domains: https://developer.apple.com/documentation/xcode/supporting-associated-domains
- Apple, Associated Domains entitlement (alternate modes, CDN): https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.associated-domains
- Apple, TN3155 Debugging universal links: https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links
- Apple Developer Forums (CDN URL, community): https://developer.apple.com/forums/thread/736053 , https://developer.apple.com/forums/thread/821908
- Vercel, `vercel.json` (`rewrites` filesystem precedence, `headers`): https://vercel.com/docs/project-configuration/vercel-json
- Vite, public directory: https://vite.dev/guide/assets#the-public-directory
