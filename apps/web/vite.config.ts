import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    // Maps exist only for the Sentry upload (deleted afterwards) and are never
    // referenced from the bundle; without a token none are emitted at all.
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? "hidden" : false,
  },
  define: {
    __APP_RELEASE__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? "dev"),
    __APP_ENVIRONMENT__: JSON.stringify(process.env.VERCEL_ENV ?? "development"),
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    // Last so it sees the final bundle. Uploads maps and deletes them from
    // dist; without a token (CI, local) the build only emits hidden maps.
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: "kabeer-joshi",
            project: "tattwix-web",
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: process.env.VERCEL_GIT_COMMIT_SHA },
            sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
            telemetry: false,
          }),
        ]
      : []),
  ],
});
