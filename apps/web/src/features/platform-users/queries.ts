import { createPlatformUserQueries } from "@tattvix/api";

import { platformUsersApi } from "./api";

export const platformUserQueries = createPlatformUserQueries(platformUsersApi);
