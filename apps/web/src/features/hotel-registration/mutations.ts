import { createHotelRegistrationMutations } from "@tattvix/api";

import { hotelRegistrationApi } from "./api";

export const hotelRegistrationMutations = createHotelRegistrationMutations(hotelRegistrationApi);
