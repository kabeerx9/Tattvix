import { createCurrentUserApi } from "@tattvix/api";

import { createAuthenticatedApiClient } from "@/lib/api";

// `me` is fetched before the global token getter is wired, so the caller
// supplies Clerk's getToken and gets a client bound to it.
export function getCurrentUser(getToken: () => Promise<string | null | undefined>) {
  return createCurrentUserApi(createAuthenticatedApiClient(getToken)).getMe();
}
