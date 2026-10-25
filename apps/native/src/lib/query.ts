// The app's QueryClient and the one error policy every screen inherits
// (decision: "native data layer and error policy", issue #45).
//
// - Refetch when a screen regains focus or the app returns to the foreground.
// - 401: Clerk mints a fresh token on the retry; a second 401 in a row means the
//   session is dead, so sign out.
// - 403: access changed under us; refetch `me` and let the route guards reroute.
// - 402: the hotel's subscription lapsed; `me` carries the entitlement, so
//   refetching it turns on the read-only banner.
// - No persisted cache: the phone shares a desk and must never show stale guests
//   to the next sign-in.
import { classifyApiError, currentUserKeys, shouldRetryQuery } from "@tattvix/api";
import { MutationCache, QueryCache, QueryClient, focusManager } from "@tanstack/react-query";
import { AppState, type AppStateStatus } from "react-native";

type AuthHandlers = { signOut: () => Promise<void> | void };
let authHandlers: AuthHandlers | null = null;
let consecutiveUnauthorized = 0;

export function setAuthHandlers(handlers: AuthHandlers | null) {
  authHandlers = handlers;
  consecutiveUnauthorized = 0;
}

function handleError(error: unknown) {
  const failure = classifyApiError(error);
  if (failure.kind === "unauthorized") {
    consecutiveUnauthorized += 1;
    if (consecutiveUnauthorized >= 2) {
      consecutiveUnauthorized = 0;
      void authHandlers?.signOut();
    }
    return;
  }
  consecutiveUnauthorized = 0;
  if (failure.kind === "forbidden" || failure.kind === "entitlement") {
    void queryClient.invalidateQueries({ queryKey: currentUserKeys.all });
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleError,
    onSuccess: () => {
      consecutiveUnauthorized = 0;
    },
  }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: "online",
    },
    mutations: { retry: 0, networkMode: "online" },
  },
});

// TanStack's focusManager knows nothing about AppState; tell it when the app
// comes back to the foreground so stale screens refetch.
focusManager.setEventListener((handleFocus) => {
  const onChange = (status: AppStateStatus) => handleFocus(status === "active");
  const subscription = AppState.addEventListener("change", onChange);
  return () => subscription.remove();
});
