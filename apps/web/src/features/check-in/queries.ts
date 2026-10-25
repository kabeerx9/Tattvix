import { createCheckInQueries } from "@tattvix/api";

import { checkInApi } from "./api";

export const checkInQueries = createCheckInQueries(checkInApi);
