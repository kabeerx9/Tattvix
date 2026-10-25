import { queryOptions } from "@tanstack/react-query";
import {
  propertyPhotosResponseSchema,
  propertyPhotoUploadResponseSchema,
  type ApiClient,
  type PropertyPhotoSlot,
  type PropertyPhotoUploadRequest,
} from "@tattvix/contracts";

export const propertyPhotosKeys = {
  all: ["property-photos"] as const,
  list: (org: string, prop: string) => ["property-photos", org, prop] as const,
};

const base = (org: string, prop: string) =>
  `/api/hotel/${encodeURIComponent(org)}/${encodeURIComponent(prop)}/photos/`;

export function createPropertyPhotosApi(client: ApiClient) {
  return {
    list: (org: string, prop: string) => client.requestJson(base(org, prop), propertyPhotosResponseSchema),
    requestUpload: (org: string, prop: string, input: PropertyPhotoUploadRequest) =>
      client.requestJson(`${base(org, prop)}upload/`, propertyPhotoUploadResponseSchema, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    complete: (org: string, prop: string, slot: PropertyPhotoSlot) =>
      client.requestJson(`${base(org, prop)}upload/complete/`, propertyPhotosResponseSchema, {
        method: "POST",
        body: JSON.stringify(slot),
      }),
    remove: (org: string, prop: string, slot: PropertyPhotoSlot) =>
      client.requestJson(base(org, prop), propertyPhotosResponseSchema, {
        method: "DELETE",
        body: JSON.stringify(slot),
      }),
  };
}
export type PropertyPhotosApi = ReturnType<typeof createPropertyPhotosApi>;

export function createPropertyPhotoQueries(api: PropertyPhotosApi) {
  return {
    list: (org: string, prop: string) =>
      queryOptions({
        queryKey: propertyPhotosKeys.list(org, prop),
        queryFn: () => api.list(org, prop),
        // Half the server's default 120-second signed URL lifetime.
        staleTime: 60_000,
        refetchInterval: 60_000,
      }),
  };
}
