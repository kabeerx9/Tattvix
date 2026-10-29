import { UserProfile, useClerk } from "@clerk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import { createCurrentUserApi, describeAccountDeletionFailure, getAccountSettings } from "@tattvix/api";
import { Button } from "@tattvix/ui/components/button";
import { useState } from "react";

import { ConfirmDialog, PageHeader, Panel, PanelHeader, PanelSection } from "@/components/design-system";
import { apiClient } from "@/lib/api";

// Clerk's own "Delete account" only removes the Clerk user; ours removes the
// person's data on the server first, so that section is hidden.
const userProfileAppearance = { elements: { profileSection__danger: { display: "none" } } };

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { auth } = useRouteContext({ from: "__root__" });
  const settings = getAccountSettings(auth.currentUser);
  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader title={settings.isOwner ? "Hotel owner account" : "Account settings"} actions={settings.isOwner ? <Button variant="outline" render={<Link to="/referrals" />}>Referrals</Button> : undefined} />
      {settings.isOwner ? <Panel>
        <PanelHeader title="Your hotels" />
        {settings.hotels.map((hotel) => <PanelSection key={hotel.id}>
          <div className="grid min-w-0 gap-4">
            <div>
              <h2 className="text-sm font-semibold wrap-anywhere">{hotel.organization.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{hotel.subscriptionLabel}</p>
              <Button className="mt-3" variant="outline" render={<Link to="/hotel/$organizationSlug/team" params={{ organizationSlug: hotel.organization.slug }} />}>Manage team<span className="sr-only"> for {hotel.organization.name}</span></Button>
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
      <UserProfile routing="hash" appearance={userProfileAppearance} />
      <DeleteAccountPanel />
    </div>
  );
}

function DeleteAccountPanel() {
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => createCurrentUserApi(apiClient).deleteAccount(),
    onSuccess: async () => {
      setOpen(false);
      queryClient.clear();
      await signOut();
      await navigate({ to: "/login" });
    },
  });
  return (
    <Panel>
      <PanelHeader title="Delete account" />
      <PanelSection>
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Removes your profile, companions and ID documents and signs you out everywhere. Hotels you stayed at keep a record of the stay without your name or documents, as the law requires.
          </p>
          {mutation.isError ? (
            <p role="alert" className="text-sm text-destructive">{describeAccountDeletionFailure(mutation.error)}</p>
          ) : null}
          <div>
            <Button variant="destructive" onClick={() => { mutation.reset(); setOpen(true); }}>Delete account</Button>
          </div>
        </div>
      </PanelSection>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => { if (!mutation.isPending) setOpen(next); }}
        title="Delete your account?"
        description="Your profile, companions and ID documents are deleted now and cannot be recovered."
        confirmLabel="Delete my account"
        tone="destructive"
        pending={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
    </Panel>
  );
}
