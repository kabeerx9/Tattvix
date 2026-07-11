import {
  ApiError,
  createApiClient,
  meResponseSchema,
  type MeResponse,
} from "@tattvix/contracts";
import { env } from "@tattvix/env/web";

import { getClerkAuthToken } from "@/utils/clerk-auth";

export type { MeResponse };
export { ApiError };

const api = createApiClient({
  baseUrl: env.VITE_SERVER_URL,
  getToken: getClerkAuthToken,
  credentials: "include",
});

export function getMe() {
  return api.requestJson("/api/me", meResponseSchema);
}

export function getMeWithToken(getToken: () => Promise<string | null | undefined>) {
  const bootstrapApi = createApiClient({
    baseUrl: env.VITE_SERVER_URL,
    getToken,
    credentials: "include",
  });

  return bootstrapApi.requestJson("/api/me", meResponseSchema);
}
