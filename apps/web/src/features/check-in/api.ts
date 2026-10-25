import { createCheckInApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const checkInApi = createCheckInApi(apiClient);
