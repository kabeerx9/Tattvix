import { createHotelOperationsQueries } from "@tattvix/api";

import { hotelOperationsApi } from "./api";

export const hotelOperationsQueries = createHotelOperationsQueries(hotelOperationsApi);
