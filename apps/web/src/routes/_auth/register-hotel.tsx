import { createFileRoute } from "@tanstack/react-router";

import { HotelRegistrationPage } from "@/features/hotel-registration/components/hotel-registration-page";

export const Route = createFileRoute("/_auth/register-hotel")({
  component: HotelRegistrationPage,
});
