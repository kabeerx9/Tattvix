import { createHotelDetailsApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const hotelDetailsApi = createHotelDetailsApi(apiClient);
