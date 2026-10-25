import { createGuestProfileQueries } from "@tattvix/api";

import { guestProfileApi } from "./api";

export const guestProfileQueries = createGuestProfileQueries(guestProfileApi);
