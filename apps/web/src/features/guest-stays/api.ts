import { createGuestStaysApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const guestStaysApi = createGuestStaysApi(apiClient);
