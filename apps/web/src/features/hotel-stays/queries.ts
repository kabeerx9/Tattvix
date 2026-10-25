import { createHotelStayQueries } from "@tattvix/api";

import { hotelStaysApi } from "./api";

export const hotelStayQueries = createHotelStayQueries(hotelStaysApi);
