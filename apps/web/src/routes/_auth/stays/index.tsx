import { createFileRoute } from "@tanstack/react-router";
import { GuestStaysPage } from "@/features/guest-stays/components/guest-stays-page";
export const Route = createFileRoute("/_auth/stays/")({
  component: GuestStaysPage,
});
