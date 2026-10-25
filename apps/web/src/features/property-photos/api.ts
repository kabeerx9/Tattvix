import { createPropertyPhotosApi } from "@tattvix/api";

import { apiClient } from "@/lib/api";

export const propertyPhotosApi = createPropertyPhotosApi(apiClient);
