import { queryOptions } from "@tanstack/react-query";
import {
  platformOversightAuditResponseSchema,
  platformOversightStaysResponseSchema,
  platformOversightWeeklyCheckInsResponseSchema,
  type ApiClient,
  type PlatformOversightAuditEntry,
  type PlatformOversightAuditQuery,
  type PlatformOversightWeeklyCheckInsQuery,
  type PlatformOversightWeeklyCheckInsRow,
} from "@tattvix/contracts";

export const platformOversightKeys = {
  all: ["platform-oversight"] as const,
  stays: () => [...platformOversightKeys.all, "stays"] as const,
  audit: (organizationSlug: string, action: string, limit: number) =>
    [...platformOversightKeys.all, "audit", organizationSlug, action, limit] as const,
  weeklyCheckIns: (weeks: number) => [...platformOversightKeys.all, "weekly-check-ins", weeks] as const,
};

export function createPlatformOversightApi(client: ApiClient) {
  return {
    stays() {
      return client.requestJson("/api/platform/oversight/stays/", platformOversightStaysResponseSchema);
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
      return client.requestJson(
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
      return client.requestJson(
        `/api/platform/oversight/weekly-check-ins/${search ? `?${search}` : ""}`,
        platformOversightWeeklyCheckInsResponseSchema,
      );
    },
  };
}
export type PlatformOversightApi = ReturnType<typeof createPlatformOversightApi>;

export function createPlatformOversightQueries(api: PlatformOversightApi) {
  return {
    stays: () =>
      queryOptions({
        queryKey: platformOversightKeys.stays(),
        queryFn: () => api.stays(),
        staleTime: 15_000,
      }),
    audit: (query: PlatformOversightAuditQuery) =>
      queryOptions({
        queryKey: platformOversightKeys.audit(query.organizationSlug ?? "", query.action ?? "", query.limit ?? 50),
        queryFn: () => api.audit(query),
        staleTime: 15_000,
      }),
    weeklyCheckIns: (query: PlatformOversightWeeklyCheckInsQuery) =>
      queryOptions({
        queryKey: platformOversightKeys.weeklyCheckIns(query.weeks ?? 8),
        queryFn: () => api.weeklyCheckIns(query),
        staleTime: 15_000,
      }),
  };
}

// --- Audit trail labels ----------------------------------------------------

export const AUDIT_ACTIONS = [
  { value: "", label: "All actions" },
  { value: "DETAILS_VIEWED", label: "Identity details viewed" },
  { value: "DOCUMENT_VIEWED", label: "Document image viewed" },
  { value: "STAY_CLOSED", label: "Stay closed" },
  { value: "CONSENT_REVOKED", label: "Consent revoked" },
  { value: "PROPERTY_CREATED", label: "Property created" },
  { value: "MEMBER_ADDED", label: "Member added" },
  { value: "MEMBER_ROLE_CHANGED", label: "Member role changed" },
  { value: "MEMBER_DEACTIVATED", label: "Member deactivated" },
  { value: "MEMBER_REACTIVATED", label: "Member reactivated" },
] as const;

export function auditActionLabel(action: string) {
  const match = AUDIT_ACTIONS.find((option) => option.value === action);
  return match ? match.label : action;
}

export function auditKindLabel(kind: PlatformOversightAuditEntry["kind"]) {
  return kind === "IDENTITY_ACCESS" ? "Identity access" : "Platform admin";
}

export function auditTarget(entry: PlatformOversightAuditEntry) {
  return `${entry.organizationSlug} · ${entry.kind === "IDENTITY_ACCESS" ? entry.propertyName : entry.target}`;
}

// --- Weekly check-ins grid -------------------------------------------------
// Weeks with zero check-ins are absent from the rows; the grid fills them with 0.

export type WeeklyCheckInsGridProperty = {
  propertyId: number;
  propertyName: string;
  organizationSlug: string;
  byWeek: Map<string, number>;
  total: number;
};

export function buildWeeklyCheckInsGrid(rows: readonly PlatformOversightWeeklyCheckInsRow[]): {
  weeks: string[];
  properties: WeeklyCheckInsGridProperty[];
  maxCheckIns: number;
} {
  const weeks = Array.from(new Set(rows.map((row) => row.weekStart))).sort();
  const propertiesByKey = new Map<string, WeeklyCheckInsGridProperty>();
  let maxCheckIns = 0;

  for (const row of rows) {
    const key = `${row.organizationSlug}-${row.propertyId}`;
    let property = propertiesByKey.get(key);
    if (!property) {
      property = { propertyId: row.propertyId, propertyName: row.propertyName, organizationSlug: row.organizationSlug, byWeek: new Map(), total: 0 };
      propertiesByKey.set(key, property);
    }
    property.byWeek.set(row.weekStart, row.checkIns);
    property.total += row.checkIns;
    maxCheckIns = Math.max(maxCheckIns, row.checkIns);
  }

  const properties = Array.from(propertiesByKey.values()).sort((a, b) => a.propertyName.localeCompare(b.propertyName));
  return { weeks, properties, maxCheckIns };
}
