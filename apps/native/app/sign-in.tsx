// Sign-in. Signed-in people never see it: they go to the root, which picks
// their place. The form owns the full-bleed layout and keyboard handling.
import { Show } from "@clerk/expo";
import { Redirect } from "expo-router";

import { SignInForm } from "@/src/components/sign-in-form";

export default function SignInRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect href="/" />
      </Show>
      <Show when="signed-out">
        <SignInForm />
      </Show>
    </>
  );
}
