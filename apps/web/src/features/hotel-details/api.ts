import {
  propertyDetailsSchema,
  type PropertyDetailsInput,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

function propertyBase(organizationSlug: string, propertySlug: string) {
  return `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}`;
}

export const hotelDetailsApi = {
  get(organizationSlug: string, propertySlug: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/details/`,
      propertyDetailsSchema,
    );
  },
  update(
    organizationSlug: string,
    propertySlug: string,
    input: PropertyDetailsInput,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/details/`,
      propertyDetailsSchema,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  },
};
