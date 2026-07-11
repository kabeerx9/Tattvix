import { useAuth } from "@clerk/react";
import { Button } from "@tattvix/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import Loader from "@/components/loader";
import { currentUserQueries } from "@/features/current-user/queries";
import type { RouterAuthContext } from "@/lib/router-auth";
import { setClerkAuthTokenGetter } from "@/utils/clerk-auth";

export function RouterAuthProvider({
  children,
}: {
  children: (auth: RouterAuthContext) => React.ReactNode;
}) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const currentUserQuery = useQuery({
    ...currentUserQueries.detail(userId ?? "signed-out", getToken),
    enabled: isLoaded && Boolean(isSignedIn && userId),
  });

  useEffect(() => {
    setClerkAuthTokenGetter(() => getToken());
    return () => setClerkAuthTokenGetter(null);
  }, [getToken]);

  if (!isLoaded || (isSignedIn && currentUserQuery.isPending)) {
    return <Loader />;
  }

  if (isSignedIn && currentUserQuery.isError) {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <div className="max-w-sm space-y-4 text-center">
          <div>
            <h1 className="text-lg font-semibold">Could not load your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Check that the API server is running, then try again.
            </p>
          </div>
          <Button onClick={() => currentUserQuery.refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  const auth: RouterAuthContext = isSignedIn && currentUserQuery.data
    ? { isAuthenticated: true, currentUser: currentUserQuery.data }
    : { isAuthenticated: false, currentUser: null };

  return children(auth);
}
