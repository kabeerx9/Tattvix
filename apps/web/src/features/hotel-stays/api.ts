import {
  hotelQrTokenResponseSchema,
  hotelStayDetailSchema,
  hotelStayImageAccessResponseSchema,
  hotelStayListResponseSchema,
  stayBillSchema,
  type StayBillChargeInput,
  type StayBillVoidInput,
  type HotelStayListQuery,
  type IdentityDocumentImageSide,
} from "@tattvix/contracts";

import { apiClient } from "@/lib/api";

function propertyBase(organizationSlug: string, propertySlug: string) {
  return `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}`;
}

export const hotelStaysApi = {
  list(
    organizationSlug: string,
    propertySlug: string,
    query: HotelStayListQuery = {},
  ) {
    const params = new URLSearchParams();
    if (query.search) {
      params.set("search", query.search);
    }
    if (query.operationalStatus) {
      params.set("operationalStatus", query.operationalStatus);
    }
    if (query.dateFrom) {
      params.set("dateFrom", query.dateFrom);
    }
    if (query.dateTo) {
      params.set("dateTo", query.dateTo);
    }
    const search = params.toString();
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${search ? `?${search}` : ""}`,
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
    companionId?: number,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/images/access/`,
      hotelStayImageAccessResponseSchema,
      {
        method: "POST",
        body: JSON.stringify({ side, ...(companionId ? { companionId } : {}) }),
      },
    );
  },
  close(organizationSlug: string, propertySlug: string, stayId: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/close/`,
      hotelStayDetailSchema,
      { method: "POST" },
    );
  },
  getBill(organizationSlug: string, propertySlug: string, stayId: string) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/bill/`,
      stayBillSchema,
    );
  },
  addBillCharge(
    organizationSlug: string,
    propertySlug: string,
    stayId: string,
    input: StayBillChargeInput,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/bill/`,
      stayBillSchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  voidBillItem(
    organizationSlug: string,
    propertySlug: string,
    stayId: string,
    itemId: string,
    input: StayBillVoidInput,
  ) {
    return apiClient.requestJson(
      `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/bill/${itemId}/void/`,
      stayBillSchema,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
};
