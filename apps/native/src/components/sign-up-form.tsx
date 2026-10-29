// Email sign-up: name, email and password, then the six-digit code Clerk
// emails to prove the address, then straight into the app. Google sign-up
// stays on the sign-in screen, where Clerk's SSO flow creates the account.
import { useSignUp } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, TextField, TextLink, space } from "@/src/design-system";
import { EMAIL_TAKEN, describeClerkError, type ClerkFailure } from "@/src/lib/clerk-errors";

import { FormAlert, PasswordToggle, SignInLayout, SwitchLine } from "./sign-in-shared";

export function SignUpForm() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeStep, setCodeStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failure, setFailure] = useState<ClerkFailure | null>(null);

  const goToSignIn = useCallback(() => router.replace("/sign-in"), [router]);

  const submit = useCallback(async () => {
    if (!isLoaded || isSubmitting) return;
    setIsSubmitting(true);
    setFailure(null);
    try {
      await signUp.create({ firstName: firstName.trim(), lastName: lastName.trim(), emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setCodeStep(true);
    } catch (error) {
      setFailure(describeClerkError(error, "We could not create the account. Check the details and try again."));
    } finally {
      setIsSubmitting(false);
    }
  }, [email, firstName, isLoaded, isSubmitting, lastName, password, signUp]);

  const verify = useCallback(async () => {
    if (!isLoaded || isSubmitting) return;
    setIsSubmitting(true);
    setFailure(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
        return;
      }
      // The instance asks for something this form does not collect (a phone,
      // a username); the web's hosted sign-up collects everything.
      setFailure({ code: null, message: "Something is still missing from the account. Finish signing up on the web, then sign in here." });
    } catch (error) {
      setFailure(describeClerkError(error, "That code did not work. Check the email and try again."));
    } finally {
      setIsSubmitting(false);
    }
  }, [code, isLoaded, isSubmitting, router, setActive, signUp]);

  const resend = useCallback(async () => {
    if (!isLoaded || isSubmitting) return;
    setFailure(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (error) {
      setFailure(describeClerkError(error, "We could not send another code. Try again in a moment."));
    }
  }, [isLoaded, isSubmitting, signUp]);

  if (codeStep) {
    return (
      <SignInLayout title="Check your email" lede={`We sent a six-digit code to ${email.trim()}.`}>
        <TextField label="Code" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} enter={verify} onChangeText={setCode} placeholder="123456" value={code} />
        <FormAlert message={failure?.message ?? null} />
        <Button label="Verify and continue" onPress={verify} loading={isSubmitting} disabled={code.trim().length < 6} />
        <SwitchLine prompt="No code?" label="Send it again" onPress={resend} />
        <Button label="Use a different email" variant="ghost" onPress={() => { setCodeStep(false); setCode(""); setFailure(null); }} />
      </SignInLayout>
    );
  }

  const canSubmit = isLoaded && !!firstName.trim() && !!lastName.trim() && !!email.trim() && password.length >= 8;

  return (
    <SignInLayout title="Create your Tattwix account" lede="One account for your own stays and for any hotel you work at.">
      <View style={styles.names}>
        <View style={styles.name}>
          <TextField label="First name" autoCapitalize="words" autoComplete="given-name" enter="next" onChangeText={setFirstName} value={firstName} />
        </View>
        <View style={styles.name}>
          <TextField label="Last name" autoCapitalize="words" autoComplete="family-name" enter="next" onChangeText={setLastName} value={lastName} />
        </View>
      </View>
      <TextField label="Email" autoCapitalize="none" autoComplete="email" inputMode="email" enter="next" onChangeText={setEmail} placeholder="you@example.com" value={email} />
      <TextField
        label="Password"
        helper="At least 8 characters."
        autoCapitalize="none"
        autoComplete="new-password"
        enter={submit}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        value={password}
        trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((shown) => !shown)} />}
      />
      <FormAlert message={failure?.message ?? null} action={failure?.code === EMAIL_TAKEN ? <TextLink label="Sign in instead" onPress={goToSignIn} /> : undefined} />
      <Button label="Create account" onPress={submit} loading={isSubmitting} disabled={!canSubmit} />
      <SwitchLine prompt="Already have an account?" label="Sign in" onPress={goToSignIn} />
    </SignInLayout>
  );
}

const styles = StyleSheet.create({
  names: { flexDirection: "row", gap: space.md },
  name: { flex: 1 },
});
