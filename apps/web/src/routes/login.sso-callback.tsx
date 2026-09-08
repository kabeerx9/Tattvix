import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  checkInTokenFromRedirect,
  readPostLoginRedirect,
} from "@/utils/post-login-redirect";

export const Route = createFileRoute("/login/sso-callback")({
  component: LoginSSOCallbackPage,
});

function LoginSSOCallbackPage() {
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
