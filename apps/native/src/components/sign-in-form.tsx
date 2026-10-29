// The sign-in screen: a hotel photo under the brand, then a white sheet with
// Google, or email + password with Clerk's Device Trust / MFA email code step.
// Errors show under the form, where the person is looking, not in an alert.
// Mirrors the phone layout of apps/web/src/routes/login.tsx.
import { useSignIn, useSSO } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Eye, EyeOff } from "lucide-react-native";
import { useCallback, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { BrandLogo, Button, TextField, colors, radii, space, type } from "@/src/design-system";
import { travelImages } from "@/src/lib/travel-images";

export function SignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Clerk's Device Trust asks for an emailed code when a password sign-in
  // comes from a device it has not seen; MFA returns the same shape.
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
      const emailFactor = (result.supportedSecondFactors ?? []).find((factor) => factor.strategy === "email_code") as
        | { strategy: "email_code"; emailAddressId: string }
        | undefined;
      if ((result.status === "needs_second_factor" || (result.status as string) === "needs_client_trust") && emailFactor) {
        // The installed @clerk/types predate email_code as a second factor, hence the cast.
        await (signIn.prepareSecondFactor as (params: { strategy: "email_code"; emailAddressId: string }) => Promise<unknown>)({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });
        setCodeStep(true);
        return;
      }
      setError("This account needs a sign-in step the app does not support yet. Sign in on the web once, then try again.");
    } catch (failure) {
      setError(clerkErrorMessage(failure));
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isLoaded, isSubmitting, password, setActive, signIn]);

  const verify = useCallback(async () => {
    if (!isLoaded || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await (signIn.attemptSecondFactor as (params: { strategy: "email_code"; code: string }) => Promise<{ status: string | null; createdSessionId: string | null }>)({
        strategy: "email_code",
        code: code.trim(),
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        return;
      }
      setError("That code did not work. Check the email and try again.");
    } catch (failure) {
      setError(clerkErrorMessage(failure));
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
      setError(clerkErrorMessage(failure));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [isGoogleSubmitting, startSSOFlow]);

  const alert = error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null;

  if (codeStep) {
    return (
      <SignInLayout title="Check your email" lede={`We sent a six-digit code to ${email.trim()} because this phone is new to your account.`}>
        <TextField label="Code" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} enter={verify} onChangeText={setCode} placeholder="123456" value={code} />
        {alert}
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
        trailing={
          <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} hitSlop={12} onPress={() => setShowPassword((shown) => !shown)}>
            {showPassword ? <EyeOff color={colors.mutedForeground} size={20} strokeWidth={1.75} /> : <Eye color={colors.mutedForeground} size={20} strokeWidth={1.75} />}
          </Pressable>
        }
      />
      {alert}
      <Button label="Sign in" onPress={submit} loading={isSubmitting} disabled={!isLoaded || !email.trim() || !password} />
    </SignInLayout>
  );
}

// Keeps the button under the focused field in view, not just the field.
const BUTTON_CLEARANCE = 84;

/** The hotel photo with the brand, and the white sheet that rises over its bottom edge. */
function SignInLayout({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const photoHeight = Math.round(Math.min(360, height * 0.4));
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView bottomOffset={BUTTON_CLEARANCE} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} bounces={false}>
        <View style={{ height: photoHeight }}>
          <Image source={travelImages.signIn} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
          <LinearGradient colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]} locations={[0, 0.5]} style={StyleSheet.absoluteFill} />
          <View style={[styles.brand, { paddingTop: insets.top + space.lg }]}>
            <BrandLogo tone="inverse" size="md" />
          </View>
        </View>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.xxl }]}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.lede}>{lede}</Text>
          <View style={styles.form}>{children}</View>
          <Text style={styles.footer}>By continuing you agree to the Tattwix terms and privacy policy.</Text>
        </View>
      </KeyboardAwareScrollView>
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
  root: { flex: 1, backgroundColor: colors.card },
  scroll: { flexGrow: 1 },
  brand: { paddingHorizontal: space.xl },
  // Rises over the photo's bottom edge, like a card laid on it.
  sheet: {
    flexGrow: 1,
    marginTop: -radii.sheet - space.sm,
    paddingTop: space.xxl + space.xs,
    paddingHorizontal: space.xl,
    borderTopLeftRadius: radii.sheet + space.xs,
    borderTopRightRadius: radii.sheet + space.xs,
    backgroundColor: colors.card,
  },
  title: { ...type.pageTitle, color: colors.foreground },
  lede: { ...type.body, marginTop: space.sm, color: colors.mutedForeground },
  form: { marginTop: space.xxl, gap: space.md + 2 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: space.xs },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { ...type.caption, color: colors.subtleForeground },
  error: { ...type.caption, color: colors.destructive },
  footer: { ...type.caption, marginTop: space.xxl, color: colors.subtleForeground, textAlign: "center" },
});
