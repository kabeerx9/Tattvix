// Forgot password. Signed-in people never see it: they go to the root, which
// picks their place. Reachable signed out the same way /sign-in is.
import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

import { ResetPasswordForm } from "@/src/components/reset-password-form";

export default function ResetPasswordRoute() {
  return (
    <>
      <SignedIn>
        <Redirect href="/" />
      </SignedIn>
      <SignedOut>
        <ResetPasswordForm />
      </SignedOut>
    </>
  );
}
