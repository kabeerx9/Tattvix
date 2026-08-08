import {
  platformOversightAuditResponseSchema,
  platformOversightStaysResponseSchema,
  platformOversightWeeklyCheckInsResponseSchema,
  type PlatformOversightAuditQuery,
  type PlatformOversightWeeklyCheckInsQuery,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

export const platformOversightApi = {
  stays() {
    return apiClient.requestJson(
      "/api/platform/oversight/stays/",
      platformOversightStaysResponseSchema,
    );
  },
  audit(query: PlatformOversightAuditQuery) {
    const params = new URLSearchParams();
    if (query.organizationSlug) {
      params.set("organizationSlug", query.organizationSlug);
    }
    if (query.action) {
      params.set("action", query.action);
    }
    if (query.limit) {
      params.set("limit", String(query.limit));
    }
    const search = params.toString();
    return apiClient.requestJson(
      `/api/platform/oversight/audit/${search ? `?${search}` : ""}`,
      platformOversightAuditResponseSchema,
    );
  },
  weeklyCheckIns(query: PlatformOversightWeeklyCheckInsQuery) {
    const params = new URLSearchParams();
    if (query.weeks) {
      params.set("weeks", String(query.weeks));
    }
    const search = params.toString();
    return apiClient.requestJson(
      `/api/platform/oversight/weekly-check-ins/${search ? `?${search}` : ""}`,
      platformOversightWeeklyCheckInsResponseSchema,
    );
  },
};
