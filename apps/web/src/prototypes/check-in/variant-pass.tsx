// Variant 3 — "Pass": the check-in is one wallet-style pass. Each part is a
// row on the pass that opens a bottom sheet; sharing is a deliberate
// press-and-hold, and the same pass becomes the room confirmation.

import { Button } from "@tattvix/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@tattvix/ui/components/sheet";
import { cn } from "@tattvix/ui/lib/utils";
import { Check, ChevronRight, Clock3, IdCard, Lock, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { StatusPill } from "@/components/design-system";
import { AddressFields, PersonalFields } from "./fields";
import {
  type IdentityDocument,
  type Profile,
  accessEndsLabel,
  accessPolicy,
  assignedRoom,
  countErrors,
  documentErrors,
  documentTypes,
  formatPhone,
  fullName,
  hotel,
  initials,
  maskedDocumentNumber,
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

type SheetId = "details" | "document" | "companions" | null;

const HOLD_MS = 1600;

export function PassVariant({ scenario }: VariantProps) {
  const auth = useFakeSignIn();
  const { draft, setProfile, setDocument, toggleCompanion, addCompanion } = useDraft(scenario);
  const [openSheet, setOpenSheet] = useState<SheetId>(null);
  const submit = useFakeSubmit();
  const checkedIn = useReceptionStatus(submit.sent);
  const revoke = useRevoke();

  const detailsMissing = countErrors(profileErrors(draft.profile));
  const documentMissing = countErrors(documentErrors(draft.document));
  const ready = detailsMissing === 0 && documentMissing === 0;
  const companions = draft.companions.filter((c) => draft.selectedCompanionIds.includes(c.id));
  const locked = !auth.signedIn || submit.sent;

  return (
    <div className="flex min-h-dvh flex-col bg-muted/60">
      <main className="flex-1 px-4 pt-5 pb-6">
        <article
          aria-label="Check-in pass"
          className="proto-pop overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04),0_8px_24px_-12px_rgb(16_24_40/0.12)]"
        >
          <div className="relative h-36 bg-muted">
            <img src={hotel.cover} alt="" decoding="async" className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
            <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-[-0.01em]">{hotel.name}</p>
                <p className="text-[13px] text-white/85">
                  {hotel.city} · Check-in {hotel.checkInTime} · Out {hotel.checkOutTime}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar initials={auth.signedIn ? initials(draft.profile) : "?"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">
                {auth.signedIn ? fullName(draft.profile) : "Guest check-in"}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {companions.length ? `+ ${companions.map((c) => c.firstName).join(", ")}` : "1 guest"}
              </p>
            </div>
            {revoke.revoked ? (
              <StatusPill tone="neutral">Stopped</StatusPill>
            ) : checkedIn ? (
              <StatusPill tone="success">Checked in</StatusPill>
            ) : submit.sent ? (
              <StatusPill tone="warning">With reception</StatusPill>
            ) : (
              <StatusPill tone="neutral">Not shared</StatusPill>
            )}
          </div>

          {submit.sent && !revoke.revoked ? (
            <div className="proto-rise grid grid-cols-2 border-t border-dashed border-border px-4 py-4">
              <div>
                <p className="text-[13px] text-subtle-foreground">Room</p>
                <p className="mt-0.5 text-[28px] leading-none font-semibold tabular-nums">
                  {checkedIn ? assignedRoom.number : "—"}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-subtle-foreground">Status</p>
                <p className="mt-1 text-[15px] font-medium">
                  {checkedIn ? assignedRoom.type : "Reception is assigning your room"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="border-t border-dashed border-border">
            <PassRow
              icon={UserRound}
              label="Your details"
              value={auth.signedIn ? formatPhone(draft.profile.phone) || "Add your details" : "Sign in to fill"}
              missing={auth.signedIn ? detailsMissing : null}
              disabled={locked}
              onClick={() => setOpenSheet("details")}
            />
            <PassRow
              icon={IdCard}
              label="ID document"
              value={
                !auth.signedIn
                  ? "Aadhaar, passport, licence or voter ID"
                  : documentMissing
                    ? "Add your ID"
                    : `${documentTypes.find((t) => t.value === draft.document.type)!.short} ${maskedDocumentNumber(draft.document)}`
              }
              missing={auth.signedIn ? documentMissing : null}
              disabled={locked}
              onClick={() => setOpenSheet("document")}
            />
            <PassRow
              icon={UsersRound}
              label="With you"
              value={companions.length ? companions.map((c) => fullName(c)).join(", ") : "Just you"}
              missing={null}
              disabled={locked}
              onClick={() => setOpenSheet("companions")}
            />
            <div className="flex items-start gap-3 border-t border-border-soft px-4 py-3.5">
              <Clock3 className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
              <p className="text-[13px] leading-5 text-muted-foreground">
                {submit.sent && !revoke.revoked
                  ? `Hotel access ends by ${accessEndsLabel()}. ID photos are deleted ${accessPolicy.postCheckoutGraceHours}h after checkout.`
                  : revoke.revoked
                    ? "The hotel can no longer see your ID."
                    : `Shared for up to ${accessPolicy.maximumDays} days. ID photos are deleted ${accessPolicy.postCheckoutGraceHours}h after checkout.`}
              </p>
            </div>
          </div>
        </article>

        {!auth.signedIn ? (
          <section className="proto-rise mt-5 grid gap-3">
            <p className="text-[15px] leading-6 text-muted-foreground">
              Sign in to fill your pass. {hotel.name} sees nothing until you hold to share.
            </p>
            <SignInButtons pending={auth.pending} onSignIn={auth.signIn} />
          </section>
        ) : submit.sent && !revoke.revoked ? (
          <Button
            variant="ghost"
            className={cn(bigOutlineButton, "mt-4 text-muted-foreground hover:bg-transparent")}
            onClick={revoke.ask}
          >
            Stop sharing my ID
          </Button>
        ) : null}
      </main>

      {auth.signedIn && !submit.sent ? (
        <StickyFooter className="bg-card/95">
          {ready ? (
            <>
              <ul className="mb-3 grid gap-1">
                {sharedItems(draft).map((item) => (
                  <li key={item} className="flex gap-2 text-[13px] leading-5 text-muted-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <HoldToShare sending={submit.sending} onConfirm={submit.submit} />
            </>
          ) : (
            <Button
              className={bigButton}
              onClick={() => setOpenSheet(detailsMissing ? "details" : "document")}
            >
              {detailsMissing ? "Add your details" : "Add your ID"}
              <ChevronRight />
            </Button>
          )}
        </StickyFooter>
      ) : null}

      <DetailsSheet
        open={openSheet === "details"}
        profile={draft.profile}
        onClose={() => setOpenSheet(null)}
        onSave={(profile) => {
          setProfile(profile);
          setOpenSheet(null);
        }}
      />
      <DocumentSheet
        open={openSheet === "document"}
        document={draft.document}
        onClose={() => setOpenSheet(null)}
        onSave={(document) => {
          setDocument(document);
          setOpenSheet(null);
        }}
      />
      <PassSheet
        open={openSheet === "companions"}
        onClose={() => setOpenSheet(null)}
        title="Who’s with you?"
        description="Selected people are shared with the hotel along with you."
        footer={
          <Button className={bigButton} onClick={() => setOpenSheet(null)}>
            Done
          </Button>
        }
      >
        <CompanionPicker
          companions={draft.companions}
          selected={draft.selectedCompanionIds}
          onToggle={toggleCompanion}
          onAdd={addCompanion}
        />
      </PassSheet>
      {revoke.dialog}
    </div>
  );
}

function PassRow({
  icon: Icon,
  label,
  value,
  missing,
  disabled,
  onClick,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  missing: number | null;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="proto-press flex min-h-16 w-full items-center gap-3 border-t border-border-soft px-4 py-3 text-left first:border-t-0 disabled:active:scale-100"
    >
      <Icon className="size-[18px] shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-subtle-foreground">{label}</span>
        <span className="block truncate text-[15px] font-medium tabular-nums">{value}</span>
      </span>
      {missing === null ? null : missing > 0 ? (
        <StatusPill tone="warning">{missing} to add</StatusPill>
      ) : (
        <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
      {disabled ? (
        <Lock className="size-4 text-subtle-foreground" />
      ) : (
        <ChevronRight className="size-5 text-subtle-foreground" />
      )}
    </button>
  );
}

function PassSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <SheetContent
        side="bottom"
        className="proto-sheet mx-auto max-h-[90dvh] max-w-[430px] rounded-t-2xl border-x text-sm data-[side=bottom]:data-starting-style:translate-y-full data-[side=bottom]:data-ending-style:translate-y-full data-starting-style:opacity-100 data-ending-style:opacity-100"
      >
        <span aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border" />
        <SheetHeader className="px-5 pt-3 pb-2">
          <SheetTitle className="text-[17px] font-semibold">{title}</SheetTitle>
          <SheetDescription className="text-[13px] leading-5">{description}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-4">{children}</div>
        <SheetFooter className="border-t border-border-soft px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Edits a local copy; Save validates and commits, closing discards. */
function DetailsSheet({
  open,
  profile,
  onClose,
  onSave,
}: {
  open: boolean;
  profile: Profile;
  onClose: () => void;
  onSave: (profile: Profile) => void;
}) {
  const [local, setLocal] = useState(profile);
  const [showErrors, setShowErrors] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      setLocal(profile);
      setShowErrors(false);
    }
  }, [open, profile]);
  const errors = profileErrors(local);
  return (
    <PassSheet
      open={open}
      onClose={onClose}
      title="Your details"
      description="Exactly as on your ID. Saved to your Tattwix profile for next time."
      footer={
        <Button
          className={bigButton}
          onClick={() => {
            if (countErrors(errors)) {
              setShowErrors(true);
              requestAnimationFrame(() =>
                bodyRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(),
              );
              return;
            }
            onSave(local);
          }}
        >
          Save details
        </Button>
      }
    >
      <div ref={bodyRef} className="grid gap-6">
        <PersonalFields
          profile={local}
          errors={errors}
          showErrors={showErrors}
          onChange={(patch) => setLocal((p) => ({ ...p, ...patch }))}
        />
        <div className="grid gap-3">
          <p className="text-[13px] font-semibold text-subtle-foreground">Home address</p>
          <AddressFields
            profile={local}
            errors={errors}
            showErrors={showErrors}
            onChange={(patch) => setLocal((p) => ({ ...p, ...patch }))}
          />
        </div>
      </div>
    </PassSheet>
  );
}

function DocumentSheet({
  open,
  document,
  onClose,
  onSave,
}: {
  open: boolean;
  document: IdentityDocument;
  onClose: () => void;
  onSave: (document: IdentityDocument) => void;
}) {
  const [local, setLocal] = useState(document);
  const [showErrors, setShowErrors] = useState(false);
  useEffect(() => {
    if (open) {
      setLocal(document);
      setShowErrors(false);
    }
  }, [open, document]);
  const errors = documentErrors(local);
  return (
    <PassSheet
      open={open}
      onClose={onClose}
      title="ID document"
      description="Only the number’s last 4 digits are shown after saving."
      footer={
        <Button
          className={bigButton}
          onClick={() => (countErrors(errors) ? setShowErrors(true) : onSave(local))}
        >
          Save ID
        </Button>
      }
    >
      <DocumentFields
        document={local}
        errors={errors}
        showErrors={showErrors}
        onChange={(patch) => setLocal((d) => ({ ...d, ...patch }))}
      />
    </PassSheet>
  );
}

function CompanionPicker({
  companions,
  selected,
  onToggle,
  onAdd,
}: {
  companions: ReturnType<typeof useDraft>["draft"]["companions"];
  selected: number[];
  onToggle: (id: number) => void;
  onAdd: ReturnType<typeof useDraft>["addCompanion"];
}) {
  const [adding, setAdding] = useState(companions.length === 0);
  return (
    <div className="grid gap-2">
      {companions.map((c) => {
        const on = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(c.id)}
            className={cn(
              "proto-press flex min-h-16 items-center gap-3 rounded-lg border px-3.5 text-left",
              on ? "border-primary bg-primary-tint/50" : "border-border",
            )}
          >
            <Avatar initials={initials(c)} className="size-9 text-xs" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{fullName(c)}</span>
              <span className="block text-[13px] text-muted-foreground">
                {c.relationship}
                {c.idEnding ? ` · Aadhaar ending ${c.idEnding}` : ""}
              </span>
            </span>
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full border transition-colors duration-150",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
            </span>
          </button>
        );
      })}
      {adding ? (
        <div className={cn(companions.length > 0 && "mt-2 rounded-lg border border-border p-4")}>
          <AddCompanionForm
            onCancel={() => setAdding(false)}
            onAdd={(c) => {
              onAdd(c);
              setAdding(false);
            }}
          />
        </div>
      ) : (
        <Button variant="outline" className={cn(bigOutlineButton, "mt-1 border-dashed")} onClick={() => setAdding(true)}>
          Add a person
        </Button>
      )}
    </div>
  );
}

/**
 * Press and hold to share. Slow, linear fill while the guest decides; a fast
 * ease-out snap back on release. Space/Enter hold works the same way.
 */
function HoldToShare({ sending, onConfirm }: { sending: boolean; onConfirm: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);

  function start() {
    if (sending || timer.current) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      navigator.vibrate?.(10);
      onConfirm();
    }, HOLD_MS);
  }
  function cancel() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }
  useEffect(() => cancel, []);

  return (
    <div className="grid gap-2">
      <button
        type="button"
        data-holding={holding || undefined}
        disabled={sending}
        aria-label="Press and hold to share with reception"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") cancel();
        }}
        className="proto-hold proto-press flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground [-webkit-touch-callout:none] disabled:opacity-80"
      >
        <span className="proto-hold-fill" aria-hidden />
        <ShieldCheck className="size-[18px]" />
        {sending ? "Sharing…" : holding ? "Keep holding…" : "Hold to share with reception"}
      </button>
      <p className="text-center text-[13px] text-subtle-foreground">Nothing is shared until you hold.</p>
    </div>
  );
}
