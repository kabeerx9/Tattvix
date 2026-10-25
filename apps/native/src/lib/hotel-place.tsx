import { createContext, useContext } from "react";

import type { HotelPlace } from "./workspace";

const HotelPlaceContext = createContext<HotelPlace | null>(null);

export const HotelPlaceProvider = HotelPlaceContext.Provider;

/** The hotel the current route is inside. Only valid under `(hotel)/[organizationSlug]/[propertySlug]`. */
export function useHotelPlace(): HotelPlace {
  const place = useContext(HotelPlaceContext);
  if (!place) throw new Error("useHotelPlace must be used inside a hotel route");
  return place;
}
