import {
  SignedIn,
  SignedOut,
  useAuth,
  useSignIn,
  useSSO,
  useUser,
} from "@clerk/clerk-expo";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, getMe, type MeResponse } from "@/lib/api";

export default function HomeRoute() {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Development Build</Text>
        <Text style={styles.title}>Tattvix</Text>
        <SignedIn>
          <SignedInHome />
        </SignedIn>
        <SignedOut>
          <SignInForm />
        </SignedOut>
      </View>
    </View>
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
    if (!isLoaded || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        return;
      }

      Alert.alert("Sign in needs another step", "This account requires a sign-in flow that is not enabled in the native shell yet.");
    } catch (error) {
      Alert.alert("Could not sign in", clerkErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isLoaded, isSubmitting, password, setActive, signIn]);

  const signInWithGoogle = useCallback(async () => {
    if (isGoogleSubmitting) {
      return;
    }

    setIsGoogleSubmitting(true);
    try {
      const { createdSessionId, setActive: setOAuthActive, authSessionResult } =
        await startSSOFlow({
          strategy: "oauth_google",
        });

      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        return;
      }

      if (authSessionResult?.type !== "cancel") {
        Alert.alert("Could not sign in with Google", "Clerk did not return an active Google session.");
      }
    } catch (error) {
      Alert.alert("Could not sign in with Google", clerkErrorMessage(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [isGoogleSubmitting, startSSOFlow]);

  return (
    <View style={styles.authBox}>
      <Text style={styles.copy}>Sign in with the same Clerk account used by the web app.</Text>
      <Pressable
        accessibilityRole="button"
        disabled={isGoogleSubmitting || isSubmitting}
        onPress={signInWithGoogle}
        style={({ pressed }) => [
          styles.googleButton,
          (pressed || isGoogleSubmitting) && styles.buttonPressed,
          (isGoogleSubmitting || isSubmitting) && styles.buttonDisabled,
        ]}
      >
        {isGoogleSubmitting ? (
          <ActivityIndicator color="#1C1C1E" />
        ) : (
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        )}
      </Pressable>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        inputMode="email"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="rgba(60,60,67,0.48)"
        style={styles.input}
        value={email}
      />
      <TextInput
        autoCapitalize="none"
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="rgba(60,60,67,0.48)"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      <Pressable
        accessibilityRole="button"
        disabled={!isLoaded || isSubmitting}
        onPress={submit}
        style={({ pressed }) => [
          styles.button,
          (pressed || isSubmitting) && styles.buttonPressed,
          (!isLoaded || isSubmitting) && styles.buttonDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </View>
  );
}

function SignedInHome() {
  const { getToken, sessionId, signOut, userId } = useAuth();
  const { user } = useUser();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);
    setMe(null);
    getMe(getToken)
      .then((value) => {
        if (isMounted) {
          setMe(value);
        }
      })
      .catch((unknownError) => {
        if (isMounted) {
          setError(apiErrorMessage(unknownError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId, userId]);

  return (
    <View style={styles.authBox}>
      <Text style={styles.copy}>
        Signed in as {user?.primaryEmailAddress?.emailAddress ?? "a Clerk user"}.
      </Text>
      {isLoading ? <ActivityIndicator color="#1D9E75" /> : null}
      {me ? <Text style={styles.meta}>API profile: {me.email || me.clerkId}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => signOut()} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function clerkErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray(error.errors) &&
    error.errors[0]?.message
  ) {
    return String(error.errors[0].message);
  }

  return error instanceof Error ? error.message : "Please check your credentials and try again.";
}

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return `API ${error.status}: ${error.message}`;
  }

  return error instanceof Error ? error.message : "Could not load the API profile.";
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAF8",
    padding: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 420,
    gap: 12,
  },
  eyebrow: {
    color: "#1D9E75",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#1C1C1E",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
  },
  copy: {
    color: "rgba(60,60,67,0.72)",
    fontSize: 16,
    lineHeight: 23,
  },
  authBox: {
    gap: 12,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(60,60,67,0.22)",
    borderRadius: 8,
    color: "#1C1C1E",
    fontSize: 16,
    paddingHorizontal: 14,
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  buttonDisabled: {
    opacity: 0.62,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  googleButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(60,60,67,0.22)",
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  googleButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(60,60,67,0.16)",
  },
  dividerText: {
    color: "rgba(60,60,67,0.58)",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(60,60,67,0.22)",
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#1C1C1E",
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    color: "#1C1C1E",
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 20,
  },
});
