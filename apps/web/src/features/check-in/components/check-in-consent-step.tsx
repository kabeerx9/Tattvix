import { describeConsentAccessWindow } from "@tattvix/api";
// The consent notice. It is its own step, shown only after Review, and it is
// the only place consent is captured: an unticked checkbox the guest must
// tick. Sending stays disabled until then (see buildSubmitInput in steps.ts).
//
// What it must show, and why:
// - Itemised data per participant, the purpose and the recipient, before the
//   request: DPDP Act 2023 s.5(1) and DPDP Rules 2025 r.3 (standalone,
//   plain-language, itemised notice); MVP identity contract, "Consent And
//   Sharing" (exact categories and participants shown before approval).
// - A separate, specific, unbundled, clear affirmative action: DPDP Act s.6(1).
// - How to withdraw, as easy as giving consent: DPDP Act s.6(4), Rules r.3.
// See docs/research/privacy-legal-requirements-india.md.

import type {
  CompanionProfile,
  GuestProfileInput,
  IdentityDocument,
} from "@tattvix/contracts";
import { Checkbox } from "@tattvix/ui/components/checkbox";
import { cn } from "@tattvix/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";

import { documentImagesLabel, documentLabel, personName } from "@/features/check-in/format";
import { identityDocumentQueries } from "@/features/identity-documents/queries";

type AccessPolicy = { maximumDays: number; postCheckoutGraceHours: number };

export function ConsentStep({
  propertyName,
  organizationName,
  profile,
  document,
  companions,
  companionDocumentIds,
  accessPolicy,
  accepted,
  showError,
  onAcceptedChange,
}: {
  propertyName: string;
  organizationName: string;
  profile: GuestProfileInput;
  document: IdentityDocument;
  companions: CompanionProfile[];
  companionDocumentIds: Record<number, number>;
  accessPolicy: AccessPolicy;
  accepted: boolean;
  showError: boolean;
  onAcceptedChange: (accepted: boolean) => void;
}) {
  const companionDocuments = useQueries({
    queries: companions.map((companion) => identityDocumentQueries.list(companion.id)),
  });

  return (
    <div className="grid gap-6">
      <NoticeSection title="Who receives it">
        <p>
          {propertyName}
          {organizationName && organizationName !== propertyName ? `, run by ${organizationName}` : ""}.
        </p>
      </NoticeSection>

      <NoticeSection title="Why">
        <p>To confirm who is staying and record your check-in for this stay only. Not for marketing.</p>
      </NoticeSection>

      <NoticeSection title="What is shared">
        <ul className="grid gap-3">
          <Participant
            name={`${personName(profile)} (you)`}
            items={[
              "Legal name, phone number, date of birth, nationality and home address",
              `${documentLabel(document)}: number, name on it, issuing country${
                document.expiryDate ? ", expiry date" : ""
              } and ${documentImagesLabel(document)}`,
            ]}
          />
          {companions.map((companion, index) => {
            const chosenId = companionDocumentIds[companion.id];
            const chosen = companionDocuments[index]?.data?.documents.find((item) => item.id === chosenId);
            return (
              <Participant
                key={companion.id}
                name={personName(companion)}
                items={[
                  "Legal name, date of birth, relationship to you and nationality",
                  chosen
                    ? `${documentLabel(chosen)}: number, name on it, issuing country and ${documentImagesLabel(chosen)}`
                    : "No ID",
                ]}
              />
            );
          })}
        </ul>
        <p className="mt-3 text-[13px] text-subtle-foreground">
          Not shared: your other saved IDs, companions you didn’t select, your email and account details.
        </p>
      </NoticeSection>

      <NoticeSection title="For how long">
        <p>
          {describeConsentAccessWindow(accessPolicy.postCheckoutGraceHours)} Each time the hotel opens your details it is
          recorded, and you can see it in Privacy.
        </p>
      </NoticeSection>

      <NoticeSection title="Changing your mind">
        <p>
          The hotel uses your details while you stay. After checkout you can stop sharing from this check-in
          page or from{" "}
          <Link to="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
            Privacy
          </Link>
          , and the hotel loses access straight away. If you don’t, access ends on its own.
        </p>
      </NoticeSection>

      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-lg border p-4",
          accepted ? "border-foreground shadow-[inset_0_0_0_1px_var(--foreground)]" : showError ? "border-destructive" : "border-border",
        )}
      >
        <Checkbox
          className="mt-0.5 size-5"
          checked={accepted}
          onCheckedChange={(value) => onAcceptedChange(value === true)}
          aria-describedby={showError ? "consent-error" : undefined}
        />
        <span className="text-[15px] leading-6 font-medium">
          I agree to share the details above with {propertyName} for this stay.
        </span>
      </label>
      {showError ? (
        <p id="consent-error" role="alert" className="-mt-4 text-[13px] text-destructive">
          Tick the box to agree before sending.
        </p>
      ) : null}
    </div>
  );
}

function NoticeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-1.5 text-[15px] leading-6 [overflow-wrap:anywhere]">
      <h2 className="text-[13px] font-semibold text-subtle-foreground">{title}</h2>
      <div className="text-foreground">{children}</div>
    </section>
  );
}

function Participant({ name, items }: { name: string; items: string[] }) {
  return (
    <li className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="font-medium">{name}</p>
      <ul className="mt-1 grid list-disc gap-1 pl-5 text-[13px] leading-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </li>
  );
}
