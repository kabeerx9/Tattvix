import { createHotelOperationsApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const hotelOperationsApi = createHotelOperationsApi(apiClient);
