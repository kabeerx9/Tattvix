import { meResponseSchema } from "@tattvix/contracts";

import { createAuthenticatedApiClient } from "@/lib/api";

export function getCurrentUser(
  getToken: () => Promise<string | null | undefined>,
) {
  return createAuthenticatedApiClient(getToken).requestJson("/api/me/", meResponseSchema);
}
