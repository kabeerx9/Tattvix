import { ApiError, createApiClient } from "@tattvix/contracts";
import { env } from "@tattvix/env/web";

import { getClerkAuthToken } from "@/utils/clerk-auth";

export { ApiError };

export const apiClient = createApiClient({
  baseUrl: env.VITE_SERVER_URL,
  getToken: getClerkAuthToken,
  credentials: "include",
});

export function createAuthenticatedApiClient(
  getToken: () => Promise<string | null | undefined>,
) {
  return createApiClient({
    baseUrl: env.VITE_SERVER_URL,
    getToken,
    credentials: "include",
  });
}
