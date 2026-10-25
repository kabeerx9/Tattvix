import { queryOptions } from "@tanstack/react-query";
import {
  hotelQrTokenResponseSchema,
  hotelStayDetailSchema,
  hotelStayImageAccessResponseSchema,
  hotelStayListResponseSchema,
  stayBillSchema,
  type ApiClient,
  type HotelStayListQuery,
  type IdentityDocumentImageSide,
  type StayBillChargeInput,
  type StayBillVoidInput,
} from "@tattvix/contracts";

export const hotelStayKeys = {
  all: ["hotel-stays"] as const,
  property: (organizationSlug: string, propertySlug: string) =>
    [...hotelStayKeys.all, organizationSlug, propertySlug] as const,
  list: (organizationSlug: string, propertySlug: string, query: HotelStayListQuery = {}) =>
    [...hotelStayKeys.property(organizationSlug, propertySlug), "list", query] as const,
  detail: (organizationSlug: string, propertySlug: string, stayId: string) =>
    [...hotelStayKeys.property(organizationSlug, propertySlug), "detail", stayId] as const,
  bill: (organizationSlug: string, propertySlug: string, stayId: string) =>
    [...hotelStayKeys.detail(organizationSlug, propertySlug, stayId), "bill"] as const,
  image: (
    organizationSlug: string,
    propertySlug: string,
    stayId: string,
    side: string,
    companionId?: number,
  ) =>
    [
      ...hotelStayKeys.detail(organizationSlug, propertySlug, stayId),
      "image",
      companionId ?? 0,
      side,
    ] as const,
};

function propertyBase(organizationSlug: string, propertySlug: string) {
  return `/api/hotel/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(propertySlug)}`;
}

export function createHotelStaysApi(client: ApiClient) {
  return {
    list(organizationSlug: string, propertySlug: string, query: HotelStayListQuery = {}) {
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
      return client.requestJson(
        `${propertyBase(organizationSlug, propertySlug)}/stays/${search ? `?${search}` : ""}`,
        hotelStayListResponseSchema,
      );
    },
    get(organizationSlug: string, propertySlug: string, stayId: string) {
      return client.requestJson(
        `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/`,
        hotelStayDetailSchema,
      );
    },
    generateQr(organizationSlug: string, propertySlug: string) {
      return client.requestJson(
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
      return client.requestJson(
        `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/images/access/`,
        hotelStayImageAccessResponseSchema,
        {
          method: "POST",
          body: JSON.stringify({ side, ...(companionId ? { companionId } : {}) }),
        },
      );
    },
    close(organizationSlug: string, propertySlug: string, stayId: string) {
      return client.requestJson(
        `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/close/`,
        hotelStayDetailSchema,
        { method: "POST" },
      );
    },
    getBill(organizationSlug: string, propertySlug: string, stayId: string) {
      return client.requestJson(
        `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/bill/`,
        stayBillSchema,
      );
    },
    addBillCharge(organizationSlug: string, propertySlug: string, stayId: string, input: StayBillChargeInput) {
      return client.requestJson(
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
      return client.requestJson(
        `${propertyBase(organizationSlug, propertySlug)}/stays/${stayId}/bill/${itemId}/void/`,
        stayBillSchema,
        { method: "POST", body: JSON.stringify(input) },
      );
    },
  };
}
export type HotelStaysApi = ReturnType<typeof createHotelStaysApi>;

export function createHotelStayQueries(api: HotelStaysApi) {
  return {
    list: (organizationSlug: string, propertySlug: string, query: HotelStayListQuery = {}) =>
      queryOptions({
        queryKey: hotelStayKeys.list(organizationSlug, propertySlug, query),
        queryFn: () => api.list(organizationSlug, propertySlug, query),
        staleTime: 30_000,
      }),
    detail: (organizationSlug: string, propertySlug: string, stayId: string) =>
      queryOptions({
        queryKey: hotelStayKeys.detail(organizationSlug, propertySlug, stayId),
        queryFn: () => api.get(organizationSlug, propertySlug, stayId),
        staleTime: 10_000,
      }),
    imageAccess: (
      organizationSlug: string,
      propertySlug: string,
      stayId: string,
      side: IdentityDocumentImageSide,
      companionId?: number,
    ) =>
      queryOptions({
        queryKey: hotelStayKeys.image(organizationSlug, propertySlug, stayId, side, companionId),
        queryFn: () => api.getImageAccess(organizationSlug, propertySlug, stayId, side, companionId),
        staleTime: 60_000,
        gcTime: 0,
        retry: false,
        refetchOnWindowFocus: false,
      }),
    bill: (organizationSlug: string, propertySlug: string, stayId: string) =>
      queryOptions({
        queryKey: hotelStayKeys.bill(organizationSlug, propertySlug, stayId),
        queryFn: () => api.getBill(organizationSlug, propertySlug, stayId),
        staleTime: 10_000,
      }),
  };
}
