import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_auth/_hotel/reservations")({
  component: ReservationsPage,
});

function ReservationsPage() {
  return (
    <PlaceholderPage
      eyebrow="Operations"
      title="Reservations"
      description="A future workspace for arrivals, departures, booking details, and stay management."
    />
  );
}
