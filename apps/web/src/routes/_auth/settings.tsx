import { UserProfile } from "@clerk/react";
import { Link, createFileRoute, useRouteContext } from "@tanstack/react-router";
import { getAccountSettings } from "@tattvix/api";
import { Button } from "@tattvix/ui/components/button";

import { PageHeader, Panel, PanelHeader, PanelSection } from "@/components/design-system";

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { auth } = useRouteContext({ from: "__root__" });
  const settings = getAccountSettings(auth.currentUser);
  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader title={settings.isOwner ? "Hotel owner account" : "Account settings"} />
      {settings.isOwner ? <Panel>
        <PanelHeader title="Your hotels" />
        {settings.hotels.map((hotel) => <PanelSection key={hotel.id}>
          <div className="grid min-w-0 gap-4">
            <div>
              <h2 className="text-sm font-semibold wrap-anywhere">{hotel.organization.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{hotel.subscriptionLabel}</p>
            </div>
            {hotel.properties.length ? hotel.properties.map((property) => (
              <div key={property.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium wrap-anywhere">{property.name}</span>
                <Button variant="outline" render={<Link to="/hotel/$organizationSlug/$propertySlug/details" params={{ organizationSlug: hotel.organization.slug, propertySlug: property.slug }} />}>
                  Property settings<span className="sr-only"> for {property.name}</span>
                </Button>
              </div>
            )) : <p className="text-sm text-muted-foreground">No properties are available. Contact the help desk for assistance.</p>}
          </div>
        </PanelSection>)}
      </Panel> : null}
      <Panel>
        <PanelHeader title="Personal settings" />
        <PanelSection>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" render={<Link to="/profile" />}>Guest profile</Button>
            <Button variant="outline" render={<Link to="/privacy" />}>Privacy and sharing</Button>
            <Button variant="outline" render={<Link to="/stays" />}>My stays</Button>
            <Button variant="outline" render={<Link to="/help" />}>Help desk</Button>
          </div>
        </PanelSection>
      </Panel>
      <UserProfile routing="hash" />
    </div>
  );
}
