import { SignedIn, SignedOut, useSignIn, useSSO } from "@clerk/clerk-expo";
import { Redirect, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton, AppInput, Card, Screen } from "@/src/design-system/components";
import { useAppTheme } from "@/src/design-system/theme";

export default function WelcomeRoute() {
  const { colors, isDark } = useAppTheme();
  return (
    <Screen>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SignedIn><Redirect href={"/(guest)" as Href} /></SignedIn>
      <SignedOut>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              <View style={styles.brand}><View style={[styles.logo, { backgroundColor: colors.primary }]}><Text style={[styles.logoText, { color: colors.primaryForeground }]}>T</Text></View><Text style={[styles.brandName, { color: colors.foreground }]}>Tattvix</Text></View>
              <View style={styles.hero}><Text style={[styles.kicker, { color: colors.primary }]}>Your stay, simplified</Text><Text style={[styles.title, { color: colors.foreground }]}>Arrive ready. Feel at home.</Text><Text style={[styles.copy, { color: colors.mutedForeground }]}>Keep your guest profile, companions, and privacy choices together for a smoother hotel experience.</Text></View>
              <SignInForm />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SignedOut>
    </Screen>
  );
}

function SignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { colors } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (!isLoaded || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        return;
      }
      Alert.alert("One more step needed", "This account requires an additional sign-in step.");
    } catch (error) {
      Alert.alert("Could not sign in", clerkErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isLoaded, isSubmitting, password, setActive, signIn]);

  const google = useCallback(async () => {
    if (isGoogleSubmitting) return;
    setIsGoogleSubmitting(true);
    try {
      const result = await startSSOFlow({ strategy: "oauth_google" });
      if (result.createdSessionId && result.setActive) await result.setActive({ session: result.createdSessionId });
    } catch (error) {
      Alert.alert("Could not sign in with Google", clerkErrorMessage(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [isGoogleSubmitting, startSSOFlow]);

  return (
    <Card style={styles.form}>
      <Text style={[styles.formTitle, { color: colors.foreground }]}>Welcome back</Text>
      <Text style={[styles.formCopy, { color: colors.mutedForeground }]}>Sign in with the same account you use on the web.</Text>
      <AppButton label="Continue with Google" onPress={google} variant="outline" loading={isGoogleSubmitting} />
      <View style={styles.divider}><View style={[styles.line, { backgroundColor: colors.border }]} /><Text style={[styles.or, { color: colors.mutedForeground }]}>or</Text><View style={[styles.line, { backgroundColor: colors.border }]} /></View>
      <AppInput autoCapitalize="none" autoComplete="email" inputMode="email" onChangeText={setEmail} placeholder="Email address" value={email} />
      <AppInput autoCapitalize="none" onChangeText={setPassword} placeholder="Password" secureTextEntry value={password} />
      <AppButton label="Sign in" onPress={submit} loading={isSubmitting} disabled={!isLoaded} />
    </Card>
  );
}

function clerkErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "errors" in error && Array.isArray(error.errors) && error.errors[0]?.message) return String(error.errors[0].message);
  return error instanceof Error ? error.message : "Please check your credentials and try again.";
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1 }, scroll: { flexGrow: 1, justifyContent: "center", gap: 32, padding: 24, paddingVertical: 40 },
  brand: { flexDirection: "row", alignItems: "center", gap: 11 }, logo: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 13 }, logoText: { fontSize: 18, fontWeight: "800" }, brandName: { fontSize: 19, fontWeight: "700", letterSpacing: -0.4 },
  hero: { gap: 10 }, kicker: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" }, title: { maxWidth: 440, fontSize: 38, lineHeight: 43, fontWeight: "700", letterSpacing: -1.5 }, copy: { maxWidth: 480, fontSize: 15, lineHeight: 23 },
  form: { gap: 14 }, formTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4 }, formCopy: { marginTop: -6, fontSize: 13, lineHeight: 19 }, divider: { flexDirection: "row", alignItems: "center", gap: 10 }, line: { flex: 1, height: StyleSheet.hairlineWidth }, or: { fontSize: 12, fontWeight: "600" },
});
