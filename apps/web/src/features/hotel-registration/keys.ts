import type { HotelRegistrationStatus } from "@tattvix/contracts";

export const hotelRegistrationKeys = {
  all: ["hotel-registration"] as const,
  guest: () => [...hotelRegistrationKeys.all, "guest"] as const,
  admin: (status: HotelRegistrationStatus) =>
    [...hotelRegistrationKeys.all, "admin", status] as const,
};
