import { createHotelRegistrationApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const hotelRegistrationApi = createHotelRegistrationApi(apiClient);
