// Fetchers and TanStack Query option factories shared by web and native.
// Every module exports pure `keys`, a `create<Feature>Api(client)` and a
// `create<Feature>Queries(api)`; apps build them once with their own
// ApiClient (web: cookie + bearer; native: Clerk getToken) and re-export.
export { classifyApiError, shouldRetryQuery, type ApiFailure } from "./errors";
export { createCurrentUserApi, createCurrentUserQueries, currentUserKeys, type CurrentUserApi } from "./current-user";
export { createHotelOperationsApi, createHotelOperationsQueries, hotelOperationsKeys, type HotelOperationsApi } from "./hotel-operations";
