// Variant 1 — "One page": everything on a single scroll, sections tick
// themselves done, and one sticky button either sends or jumps you to the
// first thing still missing.

import { Button } from "@tattvix/ui/components/button";
import { Checkbox } from "@tattvix/ui/components/checkbox";
import { cn } from "@tattvix/ui/lib/utils";
import { Check, Clock3, Loader2, Pencil, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { StatusPill } from "@/components/design-system";
import { AddressFields, PersonalFields } from "./fields";
import {
  accessEndsLabel,
  accessPolicy,
  assignedRoom,
  countErrors,
  documentErrors,
  formatDate,
  formatPhone,
  fullName,
  hotel,
  initials,
  maskedDocumentNumber,
  documentTypes,
  nationalityLabel,
  profileErrors,
} from "./model";
import {
  AddCompanionForm,
  Avatar,
  DocumentFields,
  SignInButtons,
  StickyFooter,
  type VariantProps,
  bigButton,
  bigOutlineButton,
  sharedItems,
  useDraft,
  useFakeSignIn,
  useFakeSubmit,
  useReceptionStatus,
  useRevoke,
} from "./ui";

type SectionId = "details" | "document" | "companions" | "consent";

export function OnePageVariant({ scenario }: VariantProps) {
  const auth = useFakeSignIn();
  const { draft, setProfile, setDocument, toggleCompanion, addCompanion } = useDraft(scenario);
  const [consent, setConsent] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [editingDetails, setEditingDetails] = useState(scenario === "new");
  const [replacingDocument, setReplacingDocument] = useState(scenario === "new");
  const [addingCompanion, setAddingCompanion] = useState(false);
  const submit = useFakeSubmit();

  const pErrors = profileErrors(draft.profile);
  const dErrors = documentErrors(draft.document);
  const done: Record<SectionId, boolean> = {
    details: countErrors(pErrors) === 0,
    document: countErrors(dErrors) === 0,
    companions: true,
    consent,
  };
  const remaining = (["details", "document", "consent"] as const).filter((s) => !done[s]);

  function send() {
    if (remaining.length) {
      setShowErrors(true);
      if (remaining[0] === "details") setEditingDetails(true);
      if (remaining[0] === "document") setReplacingDocument(true);
      // Wait a frame so the reopened section exists before scrolling to it.
      requestAnimationFrame(() => {
        const section = document.getElementById(`one-page-${remaining[0]}`);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        section?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        const target =
          section?.querySelector<HTMLElement>("[aria-invalid='true']") ??
          section?.querySelector<HTMLElement>("input, [role='checkbox']");
        target?.focus({ preventScroll: true });
      });
      return;
    }
    submit.submit();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <HotelHero />
      {submit.sent ? (
        <Confirmation />
      ) : !auth.signedIn ? (
        <main className="proto-rise grid flex-1 content-start gap-5 px-4 pt-6 pb-8">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Check in on your phone</h1>
            <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">
              Fill in your details once, then share them with reception in one tap. Nothing is
              shared until you say so.
            </p>
          </div>
          <SignInButtons pending={auth.pending} onSignIn={auth.signIn} />
          <ol className="grid gap-3 border-t border-border-soft pt-5 text-sm text-muted-foreground">
            {["Your details", "Your ID document", "Who’s with you (optional)", "Approve sharing"].map(
              (label, i) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  {label}
                </li>
              ),
            )}
          </ol>
        </main>
      ) : (
        <>
          <main className="proto-rise grid flex-1 content-start gap-3 px-4 pt-5 pb-6">
            <div className="flex items-center gap-3 pb-2">
              <Avatar initials={initials(draft.profile)} />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">Hi {draft.profile.firstName}</p>
                <p className="text-[13px] text-muted-foreground">
                  {remaining.length
                    ? `${remaining.length} ${remaining.length === 1 ? "step" : "steps"} left before reception can check you in`
                    : "All set. Send it to reception below."}
                </p>
              </div>
            </div>

            <Section id="details" index={1} title="Your details" done={done.details}>
              {editingDetails ? (
                <div className="grid gap-6">
                  <PersonalFields
                    profile={draft.profile}
                    errors={pErrors}
                    showErrors={showErrors}
                    onChange={setProfile}
                  />
                  <div className="grid gap-3">
                    <p className="text-[13px] font-semibold text-subtle-foreground">Home address</p>
                    <AddressFields
                      profile={draft.profile}
                      errors={pErrors}
                      showErrors={showErrors}
                      onChange={setProfile}
                    />
                  </div>
                </div>
              ) : (
                <SavedSummary
                  rows={[
                    fullName(draft.profile),
                    `${formatPhone(draft.profile.phone)} · Born ${formatDate(draft.profile.dateOfBirth)} · ${nationalityLabel(draft.profile)}`,
                    `${draft.profile.addressLine1}, ${draft.profile.city} ${draft.profile.postalCode}`,
                  ]}
                  onEdit={() => setEditingDetails(true)}
                />
              )}
            </Section>

            <Section id="document" index={2} title="ID document" done={done.document}>
              {replacingDocument ? (
                <DocumentFields
                  document={draft.document}
                  errors={dErrors}
                  showErrors={showErrors}
                  onChange={setDocument}
                />
              ) : (
                <SavedSummary
                  rows={[
                    documentTypes.find((t) => t.value === draft.document.type)!.label,
                    maskedDocumentNumber(draft.document),
                    "Front and back photos saved",
                  ]}
                  onEdit={() => setReplacingDocument(true)}
                  editLabel="Change"
                />
              )}
            </Section>

            <Section id="companions" index={3} title="Who’s with you" optional done={false}>
              <div className="grid gap-1">
                {draft.companions.map((c) => {
                  const checked = draft.selectedCompanionIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex min-h-14 items-center gap-3 border-b border-border-soft last:border-b-0">
                      <Avatar initials={initials(c)} className="size-9 text-xs" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{fullName(c)}</span>
                        <span className="block text-[13px] text-muted-foreground">
                          {c.relationship}
                          {c.idEnding ? ` · Aadhaar ending ${c.idEnding}` : ""}
                        </span>
                      </span>
                      <Checkbox
                        className="size-5 rounded-[5px]"
                        checked={checked}
                        onCheckedChange={() => toggleCompanion(c.id)}
                      />
                    </label>
                  );
                })}
                {addingCompanion ? (
                  <div className="pt-3">
                    <AddCompanionForm
                      onCancel={() => setAddingCompanion(false)}
                      onAdd={(c) => {
                        addCompanion(c);
                        setAddingCompanion(false);
                      }}
                    />
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="proto-press -mx-2 h-11 justify-start px-2 text-[15px] font-medium text-primary hover:bg-transparent"
                    onClick={() => setAddingCompanion(true)}
                  >
                    <Plus className="size-[18px]" />
                    {draft.companions.length ? "Add someone else" : "Add someone travelling with you"}
                  </Button>
                )}
              </div>
            </Section>

            <Section id="consent" index={4} title="Approve sharing" done={done.consent}>
              <p className="text-[15px] leading-6">{hotel.name} will receive:</p>
              <ul className="mt-2 grid gap-2">
                {sharedItems(draft).map((item) => (
                  <li key={item} className="flex gap-2.5 text-[15px] leading-6 text-muted-foreground">
                    <Check className="mt-1 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[13px] leading-5 text-subtle-foreground">
                Access lasts up to {accessPolicy.maximumDays} days and ends {accessPolicy.postCheckoutGraceHours} hours
                after checkout, when the ID photos are deleted. You can stop sharing any time.
              </p>
              <label
                className={cn(
                  "mt-4 flex min-h-14 items-center gap-3 rounded-lg border px-4",
                  showErrors && !consent ? "border-destructive" : "border-border",
                )}
              >
                <Checkbox
                  className="size-5 rounded-[5px]"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                />
                <span className="text-[15px] font-medium">I agree to share these details</span>
              </label>
            </Section>
          </main>

          <StickyFooter>
            <Button className={bigButton} disabled={submit.sending} onClick={send}>
              {submit.sending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              {submit.sending
                ? "Sending…"
                : remaining.length
                  ? `Continue · ${remaining.length} left`
                  : "Send to reception"}
            </Button>
          </StickyFooter>
        </>
      )}
    </div>
  );
}

function HotelHero() {
  return (
    <header>
      <div className="relative h-44 overflow-hidden bg-muted">
        <img src={hotel.cover} alt="" decoding="async" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-4 bottom-3.5 text-white">
          <p className="text-[13px] text-white/85">Checking in at</p>
          <p className="text-xl font-semibold tracking-[-0.01em]">{hotel.name}</p>
        </div>
      </div>
      <dl className="flex justify-between gap-4 border-b border-border px-4 py-3 text-[13px]">
        <div>
          <dt className="text-subtle-foreground">Check-in</dt>
          <dd className="font-medium tabular-nums">{hotel.checkInTime}</dd>
        </div>
        <div>
          <dt className="text-subtle-foreground">Check-out</dt>
          <dd className="font-medium tabular-nums">{hotel.checkOutTime}</dd>
        </div>
        <div className="text-right">
          <dt className="text-subtle-foreground">Rooms from</dt>
          <dd className="font-medium tabular-nums">{hotel.rateFrom}/night</dd>
        </div>
      </dl>
    </header>
  );
}

function Section({
  id,
  index,
  title,
  done,
  optional,
  children,
}: {
  id: SectionId;
  index: number;
  title: string;
  done: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`one-page-${id}`}
      aria-labelledby={`one-page-${id}-title`}
      className="scroll-mt-4 rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)]"
    >
      <header className="flex h-14 items-center gap-3 border-b border-border-soft px-4">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-200",
            done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {done ? <Check className="size-3.5" strokeWidth={2.5} /> : index}
        </span>
        <h2 id={`one-page-${id}-title`} className="flex-1 text-[15px] font-semibold">
          {title}
        </h2>
        {optional ? <span className="text-[13px] text-subtle-foreground">Optional</span> : null}
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function SavedSummary({
  rows,
  onEdit,
  editLabel = "Edit",
}: {
  rows: string[];
  onEdit: () => void;
  editLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{rows[0]}</p>
        {rows.slice(1).map((row) => (
          <p key={row} className="mt-0.5 text-[13px] leading-5 text-muted-foreground tabular-nums">
            {row}
          </p>
        ))}
      </div>
      <Button
        variant="ghost"
        className="proto-press -mr-2 h-11 px-3 text-[15px] font-medium text-primary hover:bg-transparent"
        onClick={onEdit}
      >
        <Pencil className="size-4" />
        {editLabel}
      </Button>
    </div>
  );
}

function Confirmation() {
  const checkedIn = useReceptionStatus(true);
  const revoke = useRevoke();
  return (
    <main className="proto-rise grid flex-1 content-start gap-4 px-4 pt-6 pb-8">
      <div className="rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)]">
        <div className="grid justify-items-start gap-3 px-4 py-5">
          {revoke.revoked ? (
            <StatusPill tone="neutral">Sharing stopped</StatusPill>
          ) : checkedIn ? (
            <StatusPill tone="success">Checked in</StatusPill>
          ) : (
            <StatusPill tone="warning">Waiting for reception</StatusPill>
          )}
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">
            {revoke.revoked
              ? "The hotel can no longer see your ID"
              : checkedIn
                ? `You’re in room ${assignedRoom.number}`
                : "Sent. Head to the desk."}
          </h1>
          <p className="text-[15px] leading-6 text-muted-foreground">
            {revoke.revoked
              ? "Reception may ask to see your ID at the desk."
              : checkedIn
                ? `${assignedRoom.type}. Reception will hand you the key.`
                : "Reception is checking your details and will assign your room. This page updates on its own."}
          </p>
        </div>
        {!revoke.revoked ? (
          <div className="flex items-center gap-2 border-t border-border-soft px-4 py-3 text-[13px] text-muted-foreground">
            <Clock3 className="size-4" />
            Hotel access ends by {accessEndsLabel()}
          </div>
        ) : null}
      </div>
      {!revoke.revoked ? (
        <Button variant="outline" className={bigOutlineButton} onClick={revoke.ask}>
          Stop sharing my ID
        </Button>
      ) : null}
      {revoke.dialog}
    </main>
  );
}
