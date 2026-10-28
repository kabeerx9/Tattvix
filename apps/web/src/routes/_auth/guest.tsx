import { formatDateTime, getCurrentGuestStay, stayStatusLabel } from "@tattvix/api";
import { guestProfileMissingFieldSchema, type GuestShare } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { Panel, PhotoHero, StatusPill } from "@/components/design-system";
import { checkInQueries } from "@/features/check-in/queries";
import { guestProfileQueries } from "@/features/guest-profile/queries";
import { travelImages } from "@/lib/travel-images";

export const Route = createFileRoute("/_auth/guest")({
  component: GuestHomePage,
});

const requiredFieldCount = guestProfileMissingFieldSchema.options.length;

// Status first: the current stay when there is one, otherwise whether the
// travel profile is ready for check-in. Stays, Profile, Companions and Privacy
// live in the nav, and "Register hotel" in the account menu, so Home doesn't
// repeat them. Mirrors apps/native/app/(guest)/(tabs)/index.tsx.
function GuestHomePage() {
  const { currentUser } = Route.useRouteContext().auth;
  const stays = useQuery({ ...checkInQueries.shares(), refetchInterval: 30_000 });
  const profile = useQuery(guestProfileQueries.detail());
  const displayName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.username ||
    currentUser?.email ||
    "Guest";
  const stay = stays.data ? getCurrentGuestStay(stays.data.stays) : null;
  const loading = stays.isPending || (!stay && profile.isPending);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      {/* Decorative photo; the scrim keeps the greeting legible on any image. */}
      <PhotoHero src={travelImages.home} title={`Hello, ${displayName}`} />

      {loading ? (
        <Panel className="p-6">
          <p role="status" className="text-sm text-muted-foreground">Loading...</p>
        </Panel>
      ) : stay ? (
        <StayCard stay={stay} />
      ) : profile.data ? (
        <ReadinessCard missing={profile.data.readiness.missingFields.length} />
      ) : (
        <Panel className="p-6">
          <p role="alert" className="text-sm">Your profile could not be loaded.</p>
          <Button className="mt-4" variant="outline" onClick={() => void profile.refetch()}>
            Try again
          </Button>
        </Panel>
      )}
    </div>
  );
}

function StayCard({ stay }: { stay: GuestShare }) {
  const waiting = stay.operationalStatus === "PENDING_CHECK_IN";
  const when = waiting
    ? stay.submittedAt ? `Requested ${formatDateTime(stay.submittedAt)}` : null
    : stay.checkedInAt ? `Checked in ${formatDateTime(stay.checkedInAt)}` : null;
  return (
    <Link
      to="/stays/$stayId"
      params={{ stayId: stay.id }}
      className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Panel className="flex items-center gap-4 p-5 transition-colors hover:bg-muted/40 sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-subtle-foreground">Your stay</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight [overflow-wrap:anywhere]">{stay.property.name}</h2>
          <div className="mt-2">
            <StatusPill tone={waiting ? "warning" : "success"}>{stayStatusLabel(stay.operationalStatus)}</StatusPill>
          </div>
          <p className="mt-3 text-sm">{stay.room ? `Room ${stay.room.number}` : "Reception will assign your room."}</p>
          {when ? <p className="mt-1 text-xs text-muted-foreground">{when}</p> : null}
        </div>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </Panel>
    </Link>
  );
}

function ReadinessCard({ missing }: { missing: number }) {
  if (missing === 0) {
    return (
      <Panel className="p-5 sm:p-6">
        <StatusPill tone="success">Ready for check-in</StatusPill>
        <h2 className="mt-3 text-lg font-semibold tracking-tight">You're ready</h2>
        <p className="mt-1 text-sm text-muted-foreground">Scan the hotel's check-in QR at reception.</p>
      </Panel>
    );
  }
  const completed = requiredFieldCount - missing;
  const percentage = Math.round((completed / requiredFieldCount) * 100);
  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">Finish your travel profile</h2>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {percentage}% · {completed} of {requiredFieldCount} requirements
      </p>
      <div
        role="progressbar"
        aria-label="Travel profile progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
      <Button className="mt-5" nativeButton={false} render={<Link to="/profile" />}>
        Open profile
      </Button>
    </Panel>
  );
}
