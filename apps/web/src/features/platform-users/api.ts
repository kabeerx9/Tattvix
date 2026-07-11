import {
  platformUserSearchResponseSchema,
  type PlatformUserSearchParams,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

export const platformUsersApi = {
  search({ email }: PlatformUserSearchParams) {
    const query = new URLSearchParams({ email });
    return apiClient.requestJson(
      `/api/platform/users/?${query.toString()}`,
      platformUserSearchResponseSchema,
    );
  },
};
