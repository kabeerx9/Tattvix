import { createHotelReportsQueries } from "@tattvix/api";

import { hotelReportsApi } from "./api";

export const hotelReportsQueries = createHotelReportsQueries(hotelReportsApi);
