import { SignedIn, SignedOut, useSignIn, useSSO } from "@clerk/clerk-expo";
import { Redirect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { BrandLogo, Button, Screen, TextField, colors, type } from "@/src/design-system";

export default function WelcomeRoute() {
  return (
    <>
      <SignedIn>
        <Redirect href={"/(guest)" as Href} />
      </SignedIn>
      <SignedOut>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <Screen>
            <SignInForm />
          </Screen>
        </KeyboardAvoidingView>
      </SignedOut>
    </>
  );
}

function SignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
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
    <View style={styles.page}>
      <BrandLogo size="md" />
      <Text style={styles.hero}>Welcome back.</Text>
      <Text style={styles.lede}>Sign in with the account you use on the web. Your hotel and your own stays are both here.</Text>

      <View style={styles.form}>
        <Button label="Continue with Google" variant="outline" onPress={google} loading={isGoogleSubmitting} leading={<GoogleMark />} />
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.or}>or</Text>
          <View style={styles.line} />
        </View>
        <TextField autoCapitalize="none" autoComplete="email" inputMode="email" onChangeText={setEmail} placeholder="Email address" value={email} />
        <TextField autoCapitalize="none" onChangeText={setPassword} placeholder="Password" secureTextEntry value={password} />
        <Button label="Sign in" onPress={submit} loading={isSubmitting} disabled={!isLoaded} />
      </View>

      <Text style={styles.footer}>By continuing you agree to the Tattwix terms and privacy policy.</Text>
    </View>
  );
}

// The Google "G" in its brand colours (the only coloured artwork in the app).
function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 2.9-2.2 5.4-4.7 7.1l7.3 5.7c4.3-4 6.9-9.8 6.9-17.3z" />
      <Path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <Path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.3-5.7c-2.1 1.4-4.8 2.2-8.3 2.2-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </Svg>
  );
}

function clerkErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "errors" in error && Array.isArray(error.errors) && error.errors[0]?.message) return String(error.errors[0].message);
  return error instanceof Error ? error.message : "Please check your credentials and try again.";
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  page: { paddingTop: 24 },
  hero: { ...type.hero, marginTop: 48, color: colors.foreground },
  lede: { ...type.body, marginTop: 12, color: colors.mutedForeground },
  form: { marginTop: 40, gap: 12 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { ...type.caption, color: colors.subtleForeground },
  footer: { ...type.caption, marginTop: 28, color: colors.subtleForeground, textAlign: "center" },
});
