// Sign-in. Signed-in people never see it: they go to the root, which picks
// their place. Keyboard avoidance only on iOS; Android resizes the window.
import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

import { SignInForm } from "@/src/components/sign-in-form";
import { Screen, colors } from "@/src/design-system";

export default function SignInRoute() {
  return (
    <>
      <SignedIn>
        <Redirect href="/" />
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

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: colors.background } });
