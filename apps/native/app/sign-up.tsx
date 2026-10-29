// Email sign-up. Signed-in people never see it: they go to the root, which
// picks their place. Reachable signed out the same way /sign-in is.
import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

import { SignUpForm } from "@/src/components/sign-up-form";

export default function SignUpRoute() {
  return (
    <>
      <SignedIn>
        <Redirect href="/" />
      </SignedIn>
      <SignedOut>
        <SignUpForm />
      </SignedOut>
    </>
  );
}
