import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  checkInTokenFromRedirect,
  readPostLoginRedirect,
} from "@/utils/post-login-redirect";

export const Route = createFileRoute("/sign-up/sso-callback")({
  component: SignUpSSOCallbackPage,
});

function SignUpSSOCallbackPage() {
  const [destination] = useState(() => {
    const token = checkInTokenFromRedirect(readPostLoginRedirect());
    return token ? `/check-in/${token}` : "/guest";
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
