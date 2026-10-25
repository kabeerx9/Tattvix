import { createGuestStayQueries } from "@tattvix/api";

import { guestStaysApi } from "./api";

export const guestStayQueries = createGuestStayQueries(guestStaysApi);
