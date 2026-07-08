import {
  ApiError,
  createApiClient,
  meResponseSchema,
  type MeResponse,
} from "@tattvix/contracts";
import { env } from "@tattvix/env/native";

export type { MeResponse };
export { ApiError };

export function getMe(getToken: () => Promise<string | null | undefined>) {
  const api = createApiClient({
    baseUrl: env.EXPO_PUBLIC_SERVER_URL,
    getToken,
  });

  return api.requestJson("/api/me/", meResponseSchema);
}
