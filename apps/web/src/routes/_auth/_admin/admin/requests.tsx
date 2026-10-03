import { createFileRoute } from "@tanstack/react-router";

import { HotelRegistrationRequestsPage } from "@/features/hotel-registration/components/hotel-registration-requests-page";

export const Route = createFileRoute("/_auth/_admin/admin/requests")({
  component: HotelRegistrationRequestsPage,
});
