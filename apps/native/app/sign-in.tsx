// Sign-in. Signed-in people never see it: they go to the root, which picks
// their place. The form owns the full-bleed layout and keyboard handling.
import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

import { SignInForm } from "@/src/components/sign-in-form";

export default function SignInRoute() {
  return (
    <>
      <SignedIn>
        <Redirect href="/" />
      </SignedIn>
      <SignedOut>
        <SignInForm />
      </SignedOut>
    </>
  );
}
