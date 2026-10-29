// Forgot password. Signed-in people never see it: they go to the root, which
// picks their place. Reachable signed out the same way /sign-in is.
import { Show } from "@clerk/expo";
import { Redirect } from "expo-router";

import { ResetPasswordForm } from "@/src/components/reset-password-form";

export default function ResetPasswordRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect href="/" />
      </Show>
      <Show when="signed-out">
        <ResetPasswordForm />
      </Show>
    </>
  );
}
