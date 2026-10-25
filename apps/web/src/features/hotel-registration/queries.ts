import { createHotelRegistrationQueries } from "@tattvix/api";

import { hotelRegistrationApi } from "./api";

export const hotelRegistrationQueries = createHotelRegistrationQueries(hotelRegistrationApi);
