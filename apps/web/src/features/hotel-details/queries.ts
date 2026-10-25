import { createHotelDetailsQueries } from "@tattvix/api";

import { hotelDetailsApi } from "./api";

export const hotelDetailsQueries = createHotelDetailsQueries(hotelDetailsApi);
