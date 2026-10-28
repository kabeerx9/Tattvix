import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  postLoginDestination,
  readPostLoginRedirect,
} from "@/utils/post-login-redirect";

export const Route = createFileRoute("/sign-up/sso-callback")({
  component: SignUpSSOCallbackPage,
});

function SignUpSSOCallbackPage() {
  const [destination] = useState(() => {
    return postLoginDestination(readPostLoginRedirect());
  });

  return (
    <>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={destination}
        signUpFallbackRedirectUrl={destination}
      />
      <div id="clerk-captcha" />
    </>
  );
}
