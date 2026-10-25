import { createHotelReportsApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const hotelReportsApi = createHotelReportsApi(apiClient);
