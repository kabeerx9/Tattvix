import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { env } from "@tattvix/env/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Splash } from "@/src/design-system/Splash";
import { Toaster } from "@/src/design-system/Toast";
import { setTokenGetter } from "@/src/lib/api";
import { setPendingPath } from "@/src/lib/pending-path";
import { queryClient, setAuthHandlers } from "@/src/lib/query";

WebBrowser.maybeCompleteAuthSession();
// Keep the native splash up until the fonts are in; hidden in the effect below.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const ready = fontsLoaded || !!fontError; // a font failure falls back to the system face rather than hanging
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ClerkProvider publishableKey={env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <QueryClientProvider client={queryClient}>
          <AuthWiring />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="(guest)" />
            <Stack.Screen name="(hotel)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="check-in/[token]" />
            <Stack.Screen name="gallery" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <Toaster />
          {introDone ? null : <Splash onDone={() => setIntroDone(true)} />}
        </QueryClientProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

// Hands Clerk's token and sign-out to the module-level api and query layer,
// and drops every cached query when the session ends: a desk phone changes
// hands, so the next sign-in must start from nothing.
function AuthWiring() {
  const { getToken, signOut, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    setTokenGetter(() => getToken());
    setAuthHandlers({ signOut: () => signOut() });
    return () => {
      setTokenGetter(null);
      setAuthHandlers(null);
    };
  }, [getToken, signOut]);

  // Signing out (true → false) also drops a path stashed for sign-in resume, so
  // the next person on a shared phone starts from their own landing. A cold
  // start that is simply signed out (null → false) keeps it: that is a deep link.
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      queryClient.clear();
      if (wasSignedIn.current) setPendingPath(null);
    }
    wasSignedIn.current = !!isSignedIn;
  }, [isLoaded, isSignedIn]);

  return null;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
