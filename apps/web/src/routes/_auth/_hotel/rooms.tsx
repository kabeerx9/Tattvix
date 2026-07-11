import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_auth/_hotel/rooms")({
  component: RoomsPage,
});

function RoomsPage() {
  return (
    <PlaceholderPage
      eyebrow="Inventory"
      title="Rooms"
      description="A future room board for availability, housekeeping state, room types, and maintenance flags."
    />
  );
}
