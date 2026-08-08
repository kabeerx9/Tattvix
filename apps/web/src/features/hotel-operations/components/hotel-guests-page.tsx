import type { HotelGuestStay } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, BedDouble, History, UserRound } from "lucide-react";

import { EmptyState, PageHeader, Surface } from "@/components/design-system";

import { hotelOperationsQueries } from "../queries";

export function HotelGuestsPage({
  organizationSlug,
  propertySlug,
  propertyName,
}: {
  organizationSlug: string;
  propertySlug: string;
  propertyName: string;
}) {
  const { data } = useSuspenseQuery(
    hotelOperationsQueries.guests(organizationSlug, propertySlug),
  );
  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow={propertyName}
        title="Guests"
        description="Current guests appear only after reception assigns a room and confirms check-in. Completed stays remain in history."
      />
      <GuestSection
        title="Current guests"
        description="People who are checked in and currently occupy a room."
        icon={UserRound}
        stays={data.current}
        organizationSlug={organizationSlug}
        propertySlug={propertySlug}
        empty="No guests are currently checked in."
      />
      <GuestSection
        title="Stay history"
        description="Operationally completed stays, separate from identity retention."
        icon={History}
        stays={data.history}
        organizationSlug={organizationSlug}
        propertySlug={propertySlug}
        empty="Completed stays will appear here after checkout."
      />
    </div>
  );
}

function GuestSection({
  title,
  description,
  icon: Icon,
  stays,
  organizationSlug,
  propertySlug,
  empty,
}: {
  title: string;
  description: string;
  icon: typeof UserRound;
  stays: HotelGuestStay[];
  organizationSlug: string;
  propertySlug: string;
  empty: string;
}) {
  return (
    <Surface>
      <div className="flex items-start gap-3 border-b p-5 sm:p-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {stays.length ? (
        <div className="divide-y">
          {stays.map((stay) => (
            <GuestRow
              key={stay.id}
              stay={stay}
              organizationSlug={organizationSlug}
              propertySlug={propertySlug}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={Icon} title="Nothing here yet" description={empty} />
      )}
    </Surface>
  );
}

function GuestRow({
  stay,
  organizationSlug,
  propertySlug,
}: {
  stay: HotelGuestStay;
  organizationSlug: string;
  propertySlug: string;
}) {
  const referenceTime =
    stay.operationalStatus === "CHECKED_IN"
      ? stay.checkedInAt
      : stay.checkedOutAt;
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">{stay.guestName}</h3>
          {stay.room ? (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <BedDouble className="size-3" />
              Room {stay.room.number}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {stay.companionCount} companion
          {stay.companionCount === 1 ? "" : "s"}
          {" · "}
          {stay.operationalStatus === "CHECKED_IN"
            ? "Checked in"
            : "Checked out"}{" "}
          {referenceTime ? formatDateTime(referenceTime) : "—"}
        </p>
      </div>
      <Button
        nativeButton={false}
        variant="ghost"
        render={
          <Link
            to="/hotel/$organizationSlug/$propertySlug/stays/$stayId"
            params={{
              organizationSlug,
              propertySlug,
              stayId: stay.id,
            }}
          />
        }
      >
        View stay
        <ArrowRight />
      </Button>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
