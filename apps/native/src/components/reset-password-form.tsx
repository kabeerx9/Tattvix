// Forgot password: the email, then the code Clerk sent plus the new password,
// then (when Device Trust or MFA asks) the second emailed code, then the app.
// Clerk resets the password and signs the person in as one step, so there is
// no trip back through the sign-in form.
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { Button, TextField } from "@/src/design-system";
import { describeClerkError } from "@/src/lib/clerk-errors";

import { FormAlert, PasswordToggle, SignInLayout, SwitchLine, UNSUPPORTED_STEP, startEmailSecondFactor } from "./sign-in-shared";

type Step = "email" | "reset" | "second-factor";

export function ResetPasswordForm() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [secondCode, setSecondCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToSignIn = useCallback(() => router.replace("/sign-in"), [router]);

  const sendCode = useCallback(async () => {
    if (!isLoaded || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email.trim() });
      setStep("reset");
    } catch (failure) {
      setError(describeClerkError(failure, "We could not send a code to that email. Check it and try again.").message);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isLoaded, isSubmitting, signIn]);

  const reset = useCallback(async () => {
    if (!isLoaded || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code: code.trim(), password });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
        return;
      }
      if (await startEmailSecondFactor(signIn, result)) {
        setStep("second-factor");
        return;
      }
      setError(UNSUPPORTED_STEP);
    } catch (failure) {
      setError(describeClerkError(failure, "That code did not work. Check the email and try again.").message);
    } finally {
      setIsSubmitting(false);
    }
  }, [code, isLoaded, isSubmitting, password, router, setActive, signIn]);

  const verifySecond = useCallback(async () => {
    if (!isLoaded || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signIn.attemptSecondFactor({ strategy: "email_code", code: secondCode.trim() });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
        return;
      }
      setError("That code did not work. Check the email and try again.");
    } catch (failure) {
      setError(describeClerkError(failure, "That code did not work. Check the email and try again.").message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isLoaded, isSubmitting, router, secondCode, setActive, signIn]);

  if (step === "second-factor") {
    return (
      <SignInLayout title="One more code" lede={`Your password is set. We sent a second six-digit code to ${email.trim()} because this phone is new to your account.`}>
        <TextField label="Code" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} enter={verifySecond} onChangeText={setSecondCode} placeholder="123456" value={secondCode} />
        <FormAlert message={error} />
        <Button label="Verify and sign in" onPress={verifySecond} loading={isSubmitting} disabled={secondCode.trim().length < 6} />
      </SignInLayout>
    );
  }

  if (step === "reset") {
    return (
      <SignInLayout title="Check your email" lede={`We sent a six-digit code to ${email.trim()}. Enter it with your new password.`}>
        <TextField label="Code" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} enter="next" onChangeText={setCode} placeholder="123456" value={code} />
        <TextField
          label="New password"
          helper="At least 8 characters."
          autoCapitalize="none"
          autoComplete="new-password"
          enter={reset}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          value={password}
          trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((shown) => !shown)} />}
        />
        <FormAlert message={error} />
        <Button label="Set password and sign in" onPress={reset} loading={isSubmitting} disabled={code.trim().length < 6 || password.length < 8} />
        <SwitchLine prompt="No code?" label="Send it again" onPress={sendCode} />
        <Button label="Use a different email" variant="ghost" onPress={() => { setStep("email"); setCode(""); setPassword(""); setError(null); }} />
      </SignInLayout>
    );
  }

  return (
    <SignInLayout title="Reset your password" lede="Enter the email you sign in with and we will send you a code.">
      <TextField label="Email" autoFocus autoCapitalize="none" autoComplete="email" inputMode="email" enter={sendCode} onChangeText={setEmail} placeholder="you@example.com" value={email} />
      <FormAlert message={error} />
      <Button label="Send code" onPress={sendCode} loading={isSubmitting} disabled={!isLoaded || !email.trim()} />
      <SwitchLine prompt="Remembered it?" label="Back to sign in" onPress={goToSignIn} />
    </SignInLayout>
  );
}
