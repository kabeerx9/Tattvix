import {
  propertyPhotosResponseSchema, propertyPhotoUploadResponseSchema,
  type PropertyPhotoSlot, type PropertyPhotoUploadRequest,
} from "@tattvix/contracts";
import { apiClient } from "@/lib/api";

const base = (org: string, prop: string) =>
  `/api/hotel/${encodeURIComponent(org)}/${encodeURIComponent(prop)}/photos/`;

export const propertyPhotosApi = {
  list: (org: string, prop: string) => apiClient.requestJson(base(org, prop), propertyPhotosResponseSchema),
  requestUpload: (org: string, prop: string, input: PropertyPhotoUploadRequest) =>
    apiClient.requestJson(`${base(org, prop)}upload/`, propertyPhotoUploadResponseSchema, { method: "POST", body: JSON.stringify(input) }),
  complete: (org: string, prop: string, slot: PropertyPhotoSlot) =>
    apiClient.requestJson(`${base(org, prop)}upload/complete/`, propertyPhotosResponseSchema, { method: "POST", body: JSON.stringify(slot) }),
  remove: (org: string, prop: string, slot: PropertyPhotoSlot) =>
    apiClient.requestJson(base(org, prop), propertyPhotosResponseSchema, { method: "DELETE", body: JSON.stringify(slot) }),
};
