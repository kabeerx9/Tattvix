// One ApiClient for the app. Clerk's getToken is wired in by the root layout
// (see AuthWiring) so fetchers can live at module level like the web's.
import { createCurrentUserApi, createCurrentUserQueries, createHotelOperationsApi, createHotelOperationsQueries } from "@tattvix/api";
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
};

export const queries = {
  currentUser: createCurrentUserQueries(api.currentUser),
  hotelOperations: createHotelOperationsQueries(api.hotelOperations),
};
