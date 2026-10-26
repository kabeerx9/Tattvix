import { UserProfile } from "@clerk/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@tattvix/ui/components/button";

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <UserProfile routing="hash" />
      <Button variant="outline" className="w-fit" render={<Link to="/help" />}>Help desk</Button>
    </div>
  );
}
