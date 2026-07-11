import { useAuth } from "@clerk/react";
import { Button } from "@tattvix/ui/components/button";
import { useEffect, useState } from "react";

import Loader from "@/components/loader";
import { getMeWithToken } from "@/lib/api";
import type { RouterAuthContext } from "@/lib/router-auth";
import { setClerkAuthTokenGetter } from "@/utils/clerk-auth";

type AuthState =
  | { status: "loading" }
  | { status: "ready"; auth: RouterAuthContext }
  | { status: "error" };

export function RouterAuthProvider({
  children,
}: {
  children: (auth: RouterAuthContext) => React.ReactNode;
}) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    setClerkAuthTokenGetter(() => getToken());
    return () => setClerkAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;

    if (!isLoaded) {
      setState({ status: "loading" });
      return () => {
        cancelled = true;
      };
    }

    if (!isSignedIn) {
      setState({
        status: "ready",
        auth: { isAuthenticated: false, currentUser: null },
      });
      return () => {
        cancelled = true;
      };
    }

    setState({ status: "loading" });
    getMeWithToken(getToken)
      .then((currentUser) => {
        if (!cancelled) {
          setState({
            status: "ready",
            auth: { isAuthenticated: true, currentUser },
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, retryCount, userId]);

  if (state.status === "loading") {
    return <Loader />;
  }

  if (state.status === "error") {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <div className="max-w-sm space-y-4 text-center">
          <div>
            <h1 className="text-lg font-semibold">Could not load your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Check that the API server is running, then try again.
            </p>
          </div>
          <Button onClick={() => setRetryCount((count) => count + 1)}>Try again</Button>
        </div>
      </div>
    );
  }

  return children(state.auth);
}
