import { createPlatformOversightQueries } from "@tattvix/api";

import { platformOversightApi } from "./api";

export const platformOversightQueries = createPlatformOversightQueries(platformOversightApi);
