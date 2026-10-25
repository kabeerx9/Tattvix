import { createHotelStaysApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const hotelStaysApi = createHotelStaysApi(apiClient);
