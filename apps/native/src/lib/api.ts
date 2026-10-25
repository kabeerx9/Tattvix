// One ApiClient for the app. Clerk's getToken is wired in by the root layout
// (see AuthWiring) so fetchers can live at module level like the web's.
import {
  createCheckInApi,
  createCheckInQueries,
  createCompanionQueries,
  createCompanionsApi,
  createGuestProfileApi,
  createGuestProfileQueries,
  createGuestStayQueries,
  createGuestStaysApi,
  createIdentityDocumentQueries,
  createIdentityDocumentsApi,
  createCurrentUserApi,
  createCurrentUserQueries,
  createHotelOperationsApi,
  createHotelOperationsQueries,
  createHotelDetailsApi,
  createHotelDetailsQueries,
  createHotelReportsApi,
  createHotelReportsQueries,
  createHotelOverviewApi,
  createHotelOverviewQueries,
  createHotelStayQueries,
  createHotelStaysApi,
  createPropertyPhotoQueries,
  createPropertyPhotosApi,
} from "@tattvix/api";
import { createApiClient } from "@tattvix/contracts";
import { env } from "@tattvix/env/native";

type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;

export function setTokenGetter(getter: TokenGetter | null) {
  tokenGetter = getter;
}

export const apiClient = createApiClient({
  baseUrl: env.EXPO_PUBLIC_SERVER_URL,
  getToken: async () => (await tokenGetter?.()) ?? null,
});

export const api = {
  currentUser: createCurrentUserApi(apiClient),
  hotelOperations: createHotelOperationsApi(apiClient),
  hotelDetails: createHotelDetailsApi(apiClient),
  hotelReports: createHotelReportsApi(apiClient),
  hotelOverview: createHotelOverviewApi(apiClient),
  hotelStays: createHotelStaysApi(apiClient),
  propertyPhotos: createPropertyPhotosApi(apiClient),
  checkIn: createCheckInApi(apiClient),
  guestProfile: createGuestProfileApi(apiClient),
  guestStays: createGuestStaysApi(apiClient),
  companions: createCompanionsApi(apiClient),
  /** Identity documents are scoped per person: no id = the signed-in guest, an id = one of their companions. */
  identityDocuments: (companionId?: number) => createIdentityDocumentsApi(apiClient, companionId),
};

export const queries = {
  currentUser: createCurrentUserQueries(api.currentUser),
  hotelOperations: createHotelOperationsQueries(api.hotelOperations),
  hotelDetails: createHotelDetailsQueries(api.hotelDetails),
  hotelReports: createHotelReportsQueries(api.hotelReports),
  hotelOverview: createHotelOverviewQueries(api.hotelOverview),
  hotelStays: createHotelStayQueries(api.hotelStays),
  propertyPhotos: createPropertyPhotoQueries(api.propertyPhotos),
  checkIn: createCheckInQueries(api.checkIn),
  guestProfile: createGuestProfileQueries(api.guestProfile),
  guestStays: createGuestStayQueries(api.guestStays),
  companions: createCompanionQueries(api.companions),
  identityDocuments: createIdentityDocumentQueries(api.identityDocuments),
};
