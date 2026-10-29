// What the signed-out screens share: the hotel photo under the brand with the
// white sheet rising over it, the password eye, the inline error line, the
// "Already have an account?" switch line, and Clerk's emailed second-factor
// step, which a password sign-in and a password reset both run into.
import type { useSignIn } from "@clerk/expo/legacy";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Eye, EyeOff } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo, TextLink, colors, radii, space, type } from "@/src/design-system";
import { travelImages } from "@/src/lib/travel-images";

// Keeps the button under the focused field in view, not just the field.
export const BUTTON_CLEARANCE = 84;

/** The hotel photo with the brand, and the white sheet that rises over its bottom edge. */
export function SignInLayout({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
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

/** The show/hide eye at the end of a password field. */
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  const Icon = shown ? EyeOff : Eye;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={shown ? "Hide password" : "Show password"} hitSlop={12} onPress={onToggle}>
      <Icon color={colors.mutedForeground} size={20} strokeWidth={1.75} />
    </Pressable>
  );
}

/** The error line under a form; announced to screen readers when it appears. */
export function FormAlert({ message, action }: { message: string | null; action?: ReactNode }) {
  if (!message) return null;
  return (
    <View style={styles.alert}>
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{message}</Text>
      {action}
    </View>
  );
}

/** "New here? Create an account" and its siblings, under the primary button. */
export function SwitchLine({ prompt, label, onPress }: { prompt?: string; label: string; onPress: () => void }) {
  return (
    <View style={styles.switchLine}>
      {prompt ? <Text style={styles.switchPrompt}>{prompt}</Text> : null}
      <TextLink label={label} onPress={onPress} />
    </View>
  );
}

type SignIn = NonNullable<ReturnType<typeof useSignIn>["signIn"]>;

// After the first factor passes, Clerk's Device Trust asks for an emailed code
// when the sign-in comes from a phone it has not seen; MFA returns the same
// shape. Sends the code and says whether the form should show the code step.
export async function startEmailSecondFactor(signIn: SignIn, result: SignIn): Promise<boolean> {
  if (result.status !== "needs_second_factor" && result.status !== "needs_client_trust") return false;
  const factor = (result.supportedSecondFactors ?? []).find((candidate) => candidate.strategy === "email_code");
  if (!factor) return false;
  await signIn.prepareSecondFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
  return true;
}

export const UNSUPPORTED_STEP = "This account needs a sign-in step the app does not support yet. Sign in on the web once, then try again.";

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
  alert: { gap: space.xs },
  error: { ...type.caption, color: colors.destructive },
  switchLine: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: space.xs },
  switchPrompt: { ...type.meta, color: colors.mutedForeground },
  footer: { ...type.caption, marginTop: space.xxl, color: colors.subtleForeground, textAlign: "center" },
});
