import { createFileRoute, redirect } from "@tanstack/react-router";
import { TeamPage } from "@/features/team/components/team-page";
export const Route = createFileRoute("/_auth/_hotel/hotel/$organizationSlug/team")({
  beforeLoad: ({ context }) => {
    if (!context.activeMembership.permissions.includes("members:manage")) throw redirect({to:"/settings"});
  },
  component: function TeamRoute() { const {organizationSlug} = Route.useParams(); return <TeamPage org={organizationSlug} />; },
});
