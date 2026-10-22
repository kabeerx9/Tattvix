import type { CompanionProfile, GuestProfileInput, IdentityDocument } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";

import type { CheckInStep } from "@/features/check-in/steps";
import { documentImagesLabel, documentLabel, formatDate, personName } from "@/features/check-in/format";

type Row = { step: CheckInStep; label: string; value: string; detail?: string };

/** Everything that will be shared, one row per step, each with Edit. */
export function ReviewStep({
  profile,
  document,
  companions,
  onEdit,
}: {
  profile: GuestProfileInput;
  document: IdentityDocument | null;
  companions: CompanionProfile[];
  onEdit: (step: CheckInStep) => void;
}) {
  const rows: Row[] = [
    {
      step: "about",
      label: "You",
      value: personName(profile),
      detail: [profile.phoneNumber, formatDate(profile.dateOfBirth), `Nationality ${profile.nationality}`]
        .filter(Boolean)
        .join(" · "),
    },
    {
      step: "address",
      label: "Home address",
      value: [profile.city, profile.stateRegion].filter(Boolean).join(", "),
      detail: [profile.addressLine1, profile.addressLine2, profile.postalCode, profile.country]
        .filter(Boolean)
        .join(", "),
    },
    {
      step: "document",
      label: "ID",
      value: document ? documentLabel(document) : "No ID chosen",
      detail: document ? `With ${documentImagesLabel(document)}` : undefined,
    },
    {
      step: "companions",
      label: "With you",
      value: companions.length ? companions.map((companion) => personName(companion)).join(", ") : "Just you",
    },
  ];

  return (
    <dl className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)]">
      {rows.map((row) => (
        <div key={row.step} className="flex items-start gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <dt className="text-xs text-subtle-foreground">{row.label}</dt>
            <dd className="mt-0.5 text-[15px] font-medium [overflow-wrap:anywhere]">{row.value}</dd>
            {row.detail ? (
              <dd className="mt-0.5 text-[13px] leading-5 text-muted-foreground tabular-nums [overflow-wrap:anywhere]">
                {row.detail}
              </dd>
            ) : null}
          </div>
          <Button
            variant="ghost"
            className="-mr-2 h-11 px-3 text-[15px] text-primary"
            aria-label={`Edit ${row.label.toLowerCase()}`}
            onClick={() => onEdit(row.step)}
          >
            Edit
          </Button>
        </div>
      ))}
    </dl>
  );
}
