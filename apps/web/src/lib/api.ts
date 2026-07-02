import {
  ApiError,
  createApiClient,
  meResponseSchema,
  type MeResponse,
} from "@hotel-app/contracts";
import { env } from "@hotel-app/env/web";

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
