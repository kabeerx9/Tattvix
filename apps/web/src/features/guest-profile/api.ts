import { createGuestProfileApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const guestProfileApi = createGuestProfileApi(apiClient);
