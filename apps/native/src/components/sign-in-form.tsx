// The sign-in screen: a hotel photo under the brand, then a white sheet with
// Google, or email + password with Clerk's Device Trust / MFA email code step.
// Errors show under the form, where the person is looking, not in an alert.
// Mirrors the phone layout of apps/web/src/routes/login.tsx.
import { useSSO } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Button, TextField, TextLink, colors, space, type } from "@/src/design-system";
import { describeClerkError } from "@/src/lib/clerk-errors";

import { FormAlert, PasswordToggle, SignInLayout, SwitchLine, UNSUPPORTED_STEP, startEmailSecondFactor } from "./sign-in-shared";

export function SignInForm() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeStep, setCodeStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!isLoaded || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        return;
      }
      if (await startEmailSecondFactor(signIn, result)) {
        setCodeStep(true);
        return;
      }
      setError(UNSUPPORTED_STEP);
    } catch (failure) {
      setError(describeClerkError(failure, "Please check your credentials and try again.").message);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isLoaded, isSubmitting, password, setActive, signIn]);

  const verify = useCallback(async () => {
    if (!isLoaded || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signIn.attemptSecondFactor({ strategy: "email_code", code: code.trim() });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        return;
      }
      setError("That code did not work. Check the email and try again.");
    } catch (failure) {
      setError(describeClerkError(failure, "That code did not work. Check the email and try again.").message);
    } finally {
      setIsSubmitting(false);
    }
  }, [code, isLoaded, isSubmitting, setActive, signIn]);

  const google = useCallback(async () => {
    if (isGoogleSubmitting) return;
    setIsGoogleSubmitting(true);
    setError(null);
    try {
      const result = await startSSOFlow({ strategy: "oauth_google" });
      if (result.createdSessionId && result.setActive) await result.setActive({ session: result.createdSessionId });
    } catch (failure) {
      setError(describeClerkError(failure, "Google sign-in did not finish. Try again.").message);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [isGoogleSubmitting, startSSOFlow]);

  if (codeStep) {
    return (
      <SignInLayout title="Check your email" lede={`We sent a six-digit code to ${email.trim()} because this phone is new to your account.`}>
        <TextField label="Code" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} enter={verify} onChangeText={setCode} placeholder="123456" value={code} />
        <FormAlert message={error} />
        <Button label="Verify and sign in" onPress={verify} loading={isSubmitting} disabled={code.trim().length < 6} />
        <Button label="Use a different account" variant="ghost" onPress={() => { setCodeStep(false); setCode(""); setError(null); }} />
      </SignInLayout>
    );
  }

  return (
    <SignInLayout title="Sign in" lede="Use the account you use on the web. Your hotel and your own stays are both here.">
      <Button label="Continue with Google" variant="outline" onPress={google} loading={isGoogleSubmitting} leading={<GoogleMark />} />
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>or with email</Text>
        <View style={styles.line} />
      </View>
      <TextField label="Email" autoCapitalize="none" autoComplete="email" inputMode="email" enter="next" onChangeText={setEmail} placeholder="you@example.com" value={email} />
      <TextField
        label="Password"
        autoCapitalize="none"
        autoComplete="current-password"
        enter={submit}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        value={password}
        trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((shown) => !shown)} />}
      />
      <View style={styles.forgot}>
        <TextLink label="Forgot password?" onPress={() => router.push("/reset-password")} />
      </View>
      <FormAlert message={error} />
      <Button label="Sign in" onPress={submit} loading={isSubmitting} disabled={!isLoaded || !email.trim() || !password} />
      <SwitchLine prompt="New to Tattwix?" label="Create an account" onPress={() => router.push("/sign-up")} />
    </SignInLayout>
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

const styles = StyleSheet.create({
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: space.xs },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { ...type.caption, color: colors.subtleForeground },
  // Sits under the password field, on the right, with the form's gap pulled in.
  forgot: { alignSelf: "flex-end", marginTop: -space.xs },
});
