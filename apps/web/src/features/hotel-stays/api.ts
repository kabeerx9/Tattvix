import {
  hotelQrTokenResponseSchema,
  hotelStayDetailSchema,
  hotelStayImageAccessResponseSchema,
  hotelStayListResponseSchema,
  type IdentityDocumentImageSide,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

function propertyBase(organizationSlug: string, propertySlug: string) {
  return `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}`;
}

export const hotelStaysApi = {
  list(organizationSlug: string, propertySlug: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/`,
      hotelStayListResponseSchema,
    );
  },
  get(organizationSlug: string, propertySlug: string, stayId: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/`,
      hotelStayDetailSchema,
    );
  },
  generateQr(organizationSlug: string, propertySlug: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/check-in-tokens/`,
      hotelQrTokenResponseSchema,
      { method: "POST" },
    );
  },
  getImageAccess(
    organizationSlug: string,
    propertySlug: string,
    stayId: string,
    side: IdentityDocumentImageSide,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/images/access/`,
      hotelStayImageAccessResponseSchema,
      { method: "POST", body: JSON.stringify({ side }) },
    );
  },
  close(organizationSlug: string, propertySlug: string, stayId: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/close/`,
      hotelStayDetailSchema,
      { method: "POST" },
    );
  },
};
