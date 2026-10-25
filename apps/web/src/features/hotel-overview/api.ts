import { createHotelOverviewApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const hotelOverviewApi = createHotelOverviewApi(apiClient);
