import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";

import { HotelRegistrationPage } from "@/features/hotel-registration/components/hotel-registration-page";

export const Route = createFileRoute("/_auth/register-hotel")({
  validateSearch: z.object({
    ref: z.string().max(32).optional().catch(undefined),
  }),
  component: RegistrationRoute,
});

function RegistrationRoute() {
  const { ref } = Route.useSearch();
  return <HotelRegistrationPage referralCode={ref} />;
}
