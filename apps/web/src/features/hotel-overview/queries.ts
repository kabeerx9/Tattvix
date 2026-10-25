import { createHotelOverviewQueries } from "@tattvix/api";

import { hotelOverviewApi } from "./api";

export const hotelOverviewQueries = createHotelOverviewQueries(hotelOverviewApi);
