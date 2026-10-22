// Small building blocks shared by the three prototype variants. They wrap
// @tattvix/ui primitives with phone-sized targets (48px controls, 16px inputs).

import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { cn } from "@tattvix/ui/lib/utils";
import { Camera, Check, Loader2, Mail, Smartphone } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { ConfirmDialog } from "@/components/design-system";

import {
  type CheckInDraft,
  type DocumentType,
  type IdentityDocument,
  type Profile,
  type Scenario,
  documentLabel,
  documentRules,
  documentTypes,
  formatDocumentNumber,
  hotel,
  initialDraft,
  relationshipOptions,
} from "./model";

/** Phone-sized primary/secondary buttons: 48px tall, 15px text, press scale. */
export const bigButton =
  "proto-press h-12 w-full rounded-lg px-4 text-[15px] font-semibold active:translate-y-0 hover:bg-primary [&_svg:not([class*='size-'])]:size-[18px]";
export const bigOutlineButton =
  "proto-press h-12 w-full rounded-lg px-4 text-[15px] font-medium active:translate-y-0 hover:bg-background";

export type VariantProps = { scenario: Scenario };

export function useDraft(scenario: Scenario) {
  const [draft, setDraft] = useState<CheckInDraft>(() => initialDraft(scenario));
  return {
    draft,
    setProfile: (patch: Partial<Profile>) =>
      setDraft((d) => ({ ...d, profile: { ...d.profile, ...patch } })),
    setDocument: (patch: Partial<IdentityDocument>) =>
      setDraft((d) => ({ ...d, document: { ...d.document, ...patch } })),
    toggleCompanion: (id: number) =>
      setDraft((d) => ({
        ...d,
        selectedCompanionIds: d.selectedCompanionIds.includes(id)
          ? d.selectedCompanionIds.filter((x) => x !== id)
          : [...d.selectedCompanionIds, id],
      })),
    addCompanion: (c: { firstName: string; lastName: string; relationship: string }) =>
      setDraft((d) => {
        const id = Math.max(0, ...d.companions.map((x) => x.id)) + 1;
        return {
          ...d,
          companions: [...d.companions, { ...c, id, idEnding: null }],
          selectedCompanionIds: [...d.selectedCompanionIds, id],
        };
      }),
  };
}

/** Fake sign-in: in production this is Clerk; here it just resolves after a beat. */
export function useFakeSignIn() {
  const [signedIn, setSignedIn] = useState(false);
  const [pending, setPending] = useState<null | "google" | "phone">(null);
  function signIn(method: "google" | "phone") {
    setPending(method);
    window.setTimeout(() => {
      setPending(null);
      setSignedIn(true);
    }, 700);
  }
  return { signedIn, pending, signIn, signOut: () => setSignedIn(false) };
}

/** Production polls the stay every 5s; the prototype "checks in" after 4s. */
export function useReceptionStatus(sent: boolean) {
  const [checkedIn, setCheckedIn] = useState(false);
  useEffect(() => {
    if (!sent) {
      setCheckedIn(false);
      return;
    }
    const t = window.setTimeout(() => setCheckedIn(true), 4000);
    return () => window.clearTimeout(t);
  }, [sent]);
  return checkedIn;
}

export function SignInButtons({
  pending,
  onSignIn,
}: {
  pending: null | "google" | "phone";
  onSignIn: (method: "google" | "phone") => void;
}) {
  return (
    <div className="grid gap-2.5">
      <Button className={bigButton} disabled={pending !== null} onClick={() => onSignIn("phone")}>
        {pending === "phone" ? <Loader2 className="animate-spin" /> : <Smartphone />}
        {pending === "phone" ? "Sending code…" : "Continue with mobile number"}
      </Button>
      <Button
        variant="outline"
        className={bigOutlineButton}
        disabled={pending !== null}
        onClick={() => onSignIn("google")}
      >
        {pending === "google" ? <Loader2 className="animate-spin" /> : <Mail />}
        {pending === "google" ? "Signing in…" : "Continue with Google"}
      </Button>
    </div>
  );
}

export function TextField({
  label,
  error,
  hint,
  prefix,
  className,
  showError = true,
  ...input
}: React.ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
  prefix?: string;
  showError?: boolean;
}) {
  const id = useId();
  const visibleError = showError ? error : undefined;
  const describedBy = visibleError ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-[13px] font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-base text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          id={id}
          aria-invalid={Boolean(visibleError) || undefined}
          aria-describedby={describedBy}
          className={cn("h-12 rounded-lg px-3.5 text-base", prefix && "pl-12")}
          {...input}
        />
      </div>
      {visibleError ? (
        <p id={`${id}-error`} className="text-[13px] text-destructive">
          {visibleError}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-subtle-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Radio-style chips. A winner would need a shared ToggleGroup in @tattvix/ui. */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-[13px] font-medium">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "proto-press h-10 rounded-full border px-4 text-sm font-medium",
                active
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Fake camera capture. Production opens the camera (`capture="environment"`)
 * and compresses the photo; here a tap "captures" after a short beat.
 */
export function PhotoCapture({
  side,
  captured,
  onCapture,
  error,
  compact = false,
}: {
  side: "Front" | "Back";
  captured: boolean;
  onCapture: (captured: boolean) => void;
  error?: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  function capture() {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      onCapture(true);
    }, 600);
  }
  return (
    <div className="grid gap-1.5">
      <button
        type="button"
        onClick={captured ? () => onCapture(false) : capture}
        aria-label={captured ? `Retake ${side.toLowerCase()} photo` : `Take ${side.toLowerCase()} photo`}
        className={cn(
          "proto-press relative grid w-full place-items-center overflow-hidden rounded-lg border text-sm",
          compact ? "h-24" : "aspect-[1.6]",
          captured
            ? "border-border bg-muted"
            : error
              ? "border-dashed border-destructive bg-destructive-tint/40 text-destructive"
              : "border-dashed border-border bg-card text-muted-foreground",
        )}
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : captured ? (
          <>
            <CardIllustration />
            <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-xs font-medium text-foreground shadow-[0_1px_2px_rgb(16_24_40/0.08)]">
              <Check className="size-3.5 text-primary" />
              {side} · Retake
            </span>
          </>
        ) : (
          <span className="grid justify-items-center gap-1.5">
            <Camera className="size-5" />
            <span className="font-medium">{side} photo</span>
          </span>
        )}
      </button>
      {error && !captured ? <p className="text-[13px] text-destructive">{error}</p> : null}
    </div>
  );
}

/** A neutral sketch of an ID card: never a real document image. */
function CardIllustration() {
  return (
    <span aria-hidden className="absolute inset-3 grid grid-cols-[30%_1fr] gap-3 rounded-md bg-card p-3 shadow-[0_1px_2px_rgb(16_24_40/0.06)]">
      <span className="rounded-sm bg-muted" />
      <span className="grid content-start gap-1.5 pt-1">
        <span className="h-1.5 w-3/4 rounded-full bg-border" />
        <span className="h-1.5 w-1/2 rounded-full bg-border" />
        <span className="h-1.5 w-2/3 rounded-full bg-border" />
        <span className="mt-2 h-1.5 w-1/3 rounded-full bg-border" />
      </span>
    </span>
  );
}

export function DocumentTypeChips({
  value,
  onChange,
}: {
  value: DocumentType;
  onChange: (value: DocumentType) => void;
}) {
  return (
    <ChoiceChips
      label="Document"
      options={documentTypes.map((t) => ({ value: t.value, label: t.short }))}
      value={value}
      onChange={onChange}
    />
  );
}

/** Number + expiry + photos for one identity document. */
export function DocumentFields({
  document,
  errors,
  showErrors,
  onChange,
}: {
  document: IdentityDocument;
  errors: Partial<Record<"number" | "expiryDate" | "frontCaptured" | "backCaptured", string>>;
  showErrors: boolean;
  onChange: (patch: Partial<IdentityDocument>) => void;
}) {
  const rules = documentRules[document.type];
  return (
    <div className="grid gap-4">
      <DocumentTypeChips
        value={document.type}
        onChange={(type) =>
          onChange({ type, number: "", expiryDate: "", backCaptured: false, frontCaptured: false })
        }
      />
      <TextField
        label={`${documentTypes.find((t) => t.value === document.type)!.label} number`}
        value={document.number}
        inputMode={document.type === "AADHAAR" ? "numeric" : "text"}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder={document.type === "AADHAAR" ? "1234 5678 9012" : undefined}
        hint={rules.numberHint}
        error={errors.number}
        showError={showErrors}
        onChange={(e) => onChange({ number: formatDocumentNumber(document.type, e.target.value) })}
        className="[&_input]:tabular-nums [&_input]:tracking-wide"
      />
      {rules.expiryRequired ? (
        <TextField
          label="Expiry date"
          type="date"
          value={document.expiryDate}
          error={errors.expiryDate}
          showError={showErrors}
          onChange={(e) => onChange({ expiryDate: e.target.value })}
        />
      ) : null}
      <div className={cn("grid gap-3", rules.backRequired && "grid-cols-2")}>
        <PhotoCapture
          side="Front"
          compact={rules.backRequired}
          captured={document.frontCaptured}
          error={showErrors ? errors.frontCaptured : undefined}
          onCapture={(frontCaptured) => onChange({ frontCaptured })}
        />
        {rules.backRequired ? (
          <PhotoCapture
            side="Back"
            compact
            captured={document.backCaptured}
            error={showErrors ? errors.backCaptured : undefined}
            onCapture={(backCaptured) => onChange({ backCaptured })}
          />
        ) : null}
      </div>
    </div>
  );
}

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Thumb-zone footer pinned to the bottom of the phone, above the home indicator. */
export function StickyFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 border-t border-border bg-background/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AddCompanionForm({
  onAdd,
  onCancel,
}: {
  onAdd: (c: { firstName: string; lastName: string; relationship: string }) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [relationship, setRelationship] = useState("Spouse");
  const [tried, setTried] = useState(false);
  const invalid = !firstName.trim() || !lastName.trim();
  return (
    <div className="proto-pop grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="First name"
          autoComplete="off"
          autoCapitalize="words"
          value={firstName}
          error={tried && !firstName.trim() ? "Required" : undefined}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <TextField
          label="Last name"
          autoComplete="off"
          autoCapitalize="words"
          value={lastName}
          error={tried && !lastName.trim() ? "Required" : undefined}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
      <ChoiceChips
        label="Relationship"
        options={relationshipOptions.map((r) => ({ value: r, label: r }))}
        value={relationship}
        onChange={setRelationship}
      />
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className={bigOutlineButton} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className={bigButton}
          onClick={() => {
            if (invalid) return setTried(true);
            onAdd({ firstName: firstName.trim(), lastName: lastName.trim(), relationship });
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

/** Plain-language list of exactly what the hotel receives. */
export function sharedItems(draft: CheckInDraft) {
  const companions = draft.companions.filter((c) => draft.selectedCompanionIds.includes(c.id));
  return [
    "Your name, date of birth, nationality, mobile and home address",
    `${draft.document.number ? documentLabel(draft.document) : "Your ID document"}, with front${documentRules[draft.document.type].backRequired ? " and back" : ""} photos`,
    companions.length
      ? `${companions.map((c) => c.firstName).join(" and ")}: name and relationship${companions.some((c) => c.idEnding) ? ", plus their saved ID" : ""}`
      : null,
  ].filter((x): x is string => Boolean(x));
}

export function useRevoke() {
  const [open, setOpen] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [pending, setPending] = useState(false);
  const dialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={`Stop sharing with ${hotel.name}?`}
      description="The hotel loses access to your ID right away. Reception may ask to see it again at the desk."
      confirmLabel="Stop sharing"
      tone="destructive"
      pending={pending}
      onConfirm={() => {
        setPending(true);
        window.setTimeout(() => {
          setPending(false);
          setRevoked(true);
          setOpen(false);
        }, 600);
      }}
    />
  );
  return { revoked, ask: () => setOpen(true), dialog };
}

/** Pretend network latency for the submit call. */
export function useFakeSubmit() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  return {
    sending,
    sent,
    submit: () => {
      setSending(true);
      window.setTimeout(() => {
        setSending(false);
        setSent(true);
      }, 900);
    },
  };
}
