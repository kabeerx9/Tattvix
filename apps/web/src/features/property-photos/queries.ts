import { createPropertyPhotoQueries } from "@tattvix/api";

import { propertyPhotosApi } from "./api";

export const propertyPhotoQueries = createPropertyPhotoQueries(propertyPhotosApi);
