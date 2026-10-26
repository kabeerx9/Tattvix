import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { propertyNameSchema, type ApiClient, type PropertyName } from "@tattvix/contracts";

export const propertyNameKeys = {
  all: ["property-name"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    ["property-name", organizationSlug, propertySlug] as const,
};

export function createPropertyNameApi(client: ApiClient) {
  const path = (organizationSlug: string, propertySlug: string) =>
    `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}/name/`;
  return {
    get: (organizationSlug: string, propertySlug: string) =>
      client.requestJson(path(organizationSlug, propertySlug), propertyNameSchema),
    update: (organizationSlug: string, propertySlug: string, input: PropertyName) =>
      client.requestJson(path(organizationSlug, propertySlug), propertyNameSchema, {
        method: "PATCH",
        body: JSON.stringify(propertyNameSchema.parse(input)),
      }),
  };
}

export function propertyNameQuery(api: ReturnType<typeof createPropertyNameApi>, organizationSlug: string, propertySlug: string) {
  return queryOptions({
    queryKey: propertyNameKeys.property(organizationSlug, propertySlug),
    queryFn: () => api.get(organizationSlug, propertySlug),
    staleTime: 30_000,
  });
}

// Names appear across workspace menus, hotel dashboards and guest stays.
const nameConsumers = new Set([
  "current-user", "hotel-overview", "hotel-stays", "hotel-operations",
  "hotel-reports", "platform-organizations", "platform-portfolio",
  "platform-oversight", "check-in",
]);

export function propertyNameMutation(api: ReturnType<typeof createPropertyNameApi>, queryClient: QueryClient, organizationSlug: string, propertySlug: string) {
  return {
    mutationFn: (input: PropertyName) => api.update(organizationSlug, propertySlug, input),
    onSuccess: async (data: PropertyName) => {
      queryClient.setQueryData(propertyNameKeys.property(organizationSlug, propertySlug), data);
      await queryClient.invalidateQueries({ predicate: (query) => nameConsumers.has(String(query.queryKey[0])) });
    },
  };
}
