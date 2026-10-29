// Learn more https://docs.expo.io/guides/customizing-metro
// Sentry's wrapper returns Expo's default config plus debug ids in the bundle
// and source maps, so an EAS build can be symbolised. No behaviour change
// otherwise; the monorepo watch folders come from Expo's default.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = config;
