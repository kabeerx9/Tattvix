// Sign-in. Signed-in people never see it: they go to the root, which picks
// their place. Screen keeps the focused field above the keyboard.
import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

import { SignInForm } from "@/src/components/sign-in-form";
import { Screen } from "@/src/design-system";

export default function SignInRoute() {
  return (
    <>
      <SignedIn>
        <Redirect href="/" />
      </SignedIn>
      <SignedOut>
        <Screen>
          <SignInForm />
        </Screen>
      </SignedOut>
    </>
  );
}
