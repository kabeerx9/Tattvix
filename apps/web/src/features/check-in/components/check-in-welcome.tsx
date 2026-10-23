import type { CheckInProperty } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Phone } from "lucide-react";

import { formatMoneyMinor } from "@/lib/money";
import { travelImages } from "@/lib/travel-images";

import { CheckInBrandBar, StepFooter, footerButtonClassName } from "./check-in-layout";

/**
 * The QR landing. Shows the hotel's own details (real data only; there is no
 * property photo in the check-in context, so the image is a decorative travel
 * photo, never presented as the hotel) and one action in the thumb zone.
 */
export function CheckInWelcome({
  property,
  signedIn,
  redirect,
  onStart,
}: {
  property: CheckInProperty;
  signedIn: boolean;
  redirect: string;
  onStart: () => void;
}) {
  const details = property.details;
  const from = details?.nightlyRateFromMinor ?? null;
  const to = details?.nightlyRateToMinor ?? null;
  const rate =
    from === null ? null : from === to || to === null ? formatMoneyMinor(from) : `${formatMoneyMinor(from)} – ${formatMoneyMinor(to)}`;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <CheckInBrandBar />
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-6 px-4 pt-4 pb-8">
        <div className="overflow-hidden rounded-lg bg-muted">
          <img src={travelImages.home} alt="" decoding="async" className="h-36 w-full object-cover" />
        </div>
        <div className="grid gap-1.5">
          <p className="text-[13px] text-subtle-foreground">Checking in at</p>
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">
            {property.name}
          </h1>
          {details?.address ? (
            <p className="mt-1 flex items-start gap-2 text-[15px] leading-6 text-muted-foreground [overflow-wrap:anywhere]">
              <MapPin className="mt-1 size-4 shrink-0" />
              {details.address}
            </p>
          ) : null}
        </div>

        {details && (details.checkInTime || details.checkOutTime || rate) ? (
          <dl className="grid grid-cols-3 gap-3 border-y border-border-soft py-4">
            {details.checkInTime ? <Fact label="Check-in" value={details.checkInTime} /> : null}
            {details.checkOutTime ? <Fact label="Check-out" value={details.checkOutTime} /> : null}
            {rate ? <Fact label="Rooms from" value={formatMoneyMinor(from!)} /> : null}
          </dl>
        ) : null}

        <div className="grid gap-2 text-[15px] leading-6">
          <p>Check in from your phone in about two minutes. Keep your ID handy.</p>
          <p className="text-muted-foreground">
            Nothing is shared with the hotel until you agree on the last step.
          </p>
          {rate ? (
            <p className="text-[13px] text-subtle-foreground">
              Rooms {rate} a night. Reception assigns your room and confirms the rate.
            </p>
          ) : null}
          {details?.amenities.length ? (
            <p className="text-[13px] text-subtle-foreground [overflow-wrap:anywhere]">{details.amenities.join(" · ")}</p>
          ) : null}
          {details?.contactPhone ? (
            <a href={`tel:${details.contactPhone}`} className="flex w-fit items-center gap-2 text-[13px] font-medium text-primary">
              <Phone aria-hidden className="size-4 text-muted-foreground" />
              {details.contactPhone}
            </a>
          ) : null}
        </div>
      </main>

      <StepFooter>
        {signedIn ? (
          <Button className={footerButtonClassName} onClick={onStart}>
            Start check-in
            <ArrowRight />
          </Button>
        ) : (
          <>
            <Button nativeButton={false} className={footerButtonClassName} render={<Link to="/login" search={{ redirect }} />}>
              Sign in to check in
              <ArrowRight />
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              className={footerButtonClassName}
              render={<Link to="/sign-up" search={{ redirect }} />}
            >
              New to Tattwix? Create an account
            </Button>
          </>
        )}
      </StepFooter>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
