import type { CheckInProperty } from "@tattvix/contracts";
import { Panel, PanelHeader, PanelSection } from "@/components/design-system";
import { formatMoneyMinor } from "@/lib/money";
export function HotelArrivalSummary({
  property,
}: {
  property: CheckInProperty;
}) {
  const details = property.details;
  if (!details) return null;
  const from = details.nightlyRateFromMinor;
  const to = details.nightlyRateToMinor;
  return (
    <Panel><PanelHeader title="About your hotel" /><PanelSection className="grid gap-5 sm:grid-cols-2">
      <div>
        {details.description && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {details.description}
          </p>
        )}
        {details.address && <p className="mt-3 text-sm">{details.address}</p>}
        {details.contactPhone && (
          <p className="mt-2 text-sm">Contact: {details.contactPhone}</p>
        )}
        {details.amenities.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {details.amenities.join(" · ")}
          </p>
        )}
      </div>
      <div>
        <h2 className="font-semibold">Nightly room rates</h2>
        <p className="mt-2 text-xl font-semibold">
          {from == null
            ? "Confirmed by reception"
            : from === to
              ? formatMoneyMinor(from)
              : `${formatMoneyMinor(from)} – ${formatMoneyMinor(to ?? from)}`}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Reception assigns your room and confirms the rate and number of
          nights. Additional charges will appear separately on your bill.
        </p>
        {(details.checkInTime || details.checkOutTime) && (
          <p className="mt-3 text-sm">
            {[
              details.checkInTime && `Check-in ${details.checkInTime}`,
              details.checkOutTime && `Check-out ${details.checkOutTime}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </PanelSection></Panel>
  );
}
