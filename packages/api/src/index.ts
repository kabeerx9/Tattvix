// Fetchers and TanStack Query option factories shared by web and native.
// Every module exports pure `keys`, a `create<Feature>Api(client)` and a
// `create<Feature>Queries(api)`; apps build them once with their own
// ApiClient (web: cookie + bearer; native: Clerk getToken) and re-export.
export { classifyApiError, shouldRetryQuery, type ApiFailure } from "./errors";
export { checkInKeys, createCheckInApi, createCheckInQueries, type CheckInApi } from "./check-in";
export { companionKeys, createCompanionQueries, createCompanionsApi, type CompanionsApi } from "./companions";
export { createCurrentUserApi, createCurrentUserQueries, currentUserKeys, type CurrentUserApi } from "./current-user";
export { createGuestProfileApi, createGuestProfileQueries, guestProfileKeys, type GuestProfileApi } from "./guest-profile";
export { createGuestStayQueries, createGuestStaysApi, type GuestStaysApi } from "./guest-stays";
export { createHotelDetailsApi, createHotelDetailsQueries, hotelDetailsKeys, type HotelDetailsApi } from "./hotel-details";
export { createHotelOperationsApi, createHotelOperationsQueries, hotelOperationsKeys, type HotelOperationsApi } from "./hotel-operations";
export { createHotelOverviewApi, createHotelOverviewQueries, hotelOverviewKeys, type HotelOverviewApi } from "./hotel-overview";
export {
  createHotelRegistrationApi,
  createHotelRegistrationQueries,
  getLatestRejectedRequest,
  hasPendingHotelRequest,
  hotelRegistrationKeys,
  type HotelRegistrationApi,
} from "./hotel-registration";
export { createHotelReportsApi, createHotelReportsQueries, hotelReportsKeys, type HotelReportsApi } from "./hotel-reports";
export { createHotelStayQueries, createHotelStaysApi, hotelStayKeys, type HotelStaysApi } from "./hotel-stays";
export {
  createIdentityDocumentQueries,
  createIdentityDocumentsApi,
  identityDocumentKeys,
  type IdentityDocumentsApi,
} from "./identity-documents";
export {
  createPlatformOrganizationQueries,
  createPlatformOrganizationsApi,
  platformOrganizationKeys,
  type PlatformOrganizationsApi,
} from "./platform-organizations";
export { createPlatformOversightApi, createPlatformOversightQueries, platformOversightKeys, type PlatformOversightApi } from "./platform-oversight";
export { createPlatformPortfolioApi, createPlatformPortfolioQueries, platformPortfolioKeys, type PlatformPortfolioApi } from "./platform-portfolio";
export { createPlatformUserQueries, createPlatformUsersApi, platformUserKeys, type PlatformUsersApi } from "./platform-users";
export { createPropertyPhotoQueries, createPropertyPhotosApi, propertyPhotosKeys, type PropertyPhotosApi } from "./property-photos";
