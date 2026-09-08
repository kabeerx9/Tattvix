import { UserProfile } from "@clerk/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <UserProfile routing="hash" />
    </div>
  );
}
