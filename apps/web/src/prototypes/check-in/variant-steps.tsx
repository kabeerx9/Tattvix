// Variant 2 — "Steps": one small task per screen, a progress bar on top and a
// thumb-zone Continue button. Returning guests land straight on Review.

import { Button } from "@tattvix/ui/components/button";
import { cn } from "@tattvix/ui/lib/utils";
import { ArrowRight, Check, ChevronLeft, Clock3, Loader2, MapPin, Plus } from "lucide-react";
import { useRef, useState } from "react";

import { StatusPill } from "@/components/design-system";
import { AddressFields, PersonalFields } from "./fields";
import {
  accessEndsLabel,
  accessPolicy,
  addressFields,
  assignedRoom,
  countErrors,
  documentErrors,
  documentLabel,
  documentRules,
  formatDate,
  formatPhone,
  fullName,
  hotel,
  initials,
  nationalityLabel,
  personalFields,
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

type Screen = "welcome" | "sign-in" | "about" | "address" | "document" | "companions" | "review" | "done";
const numbered: Screen[] = ["about", "address", "document", "companions", "review"];

const copy: Record<Exclude<Screen, "welcome" | "done">, { title: string; body: string }> = {
  "sign-in": {
    title: "First, sign in",
    body: "So your details are saved for next time. We never post or message on your behalf.",
  },
  about: { title: "About you", body: "Exactly as written on your ID." },
  address: { title: "Home address", body: "Hotels in India must record where guests live." },
  document: { title: "Your ID", body: "Take clear photos in good light. You can retake them." },
  companions: { title: "Anyone with you?", body: "Add the people staying in your room. You can skip this." },
  review: { title: "Check and send", body: `Here’s what ${hotel.name} will receive.` },
};

export function StepsVariant({ scenario }: VariantProps) {
  const auth = useFakeSignIn();
  const { draft, setProfile, setDocument, toggleCompanion, addCompanion } = useDraft(scenario);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [history, setHistory] = useState<Screen[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const [addingCompanion, setAddingCompanion] = useState(false);
  const submit = useFakeSubmit();
  const bodyRef = useRef<HTMLDivElement>(null);

  const pErrors = profileErrors(draft.profile);
  const dErrors = documentErrors(draft.document);
  const stepErrors: Partial<Record<Screen, number>> = {
    about: personalFields.filter((f) => pErrors[f]).length,
    address: addressFields.filter((f) => pErrors[f]).length,
    document: countErrors(dErrors),
  };

  function go(next: Screen, dir: "forward" | "back" = "forward") {
    setDirection(dir);
    setShowErrors(false);
    setAddingCompanion(false);
    if (dir === "forward") setHistory((h) => [...h, screen]);
    setScreen(next);
    window.scrollTo({ top: 0 });
  }

  function back() {
    // Once signed in, the sign-in screen is not a place to go back to.
    const stack = [...history];
    let previous = stack.pop();
    while (previous === "sign-in" && auth.signedIn) previous = stack.pop();
    if (!previous) return;
    setHistory(stack);
    setDirection("back");
    setShowErrors(false);
    setAddingCompanion(false);
    setScreen(previous);
    window.scrollTo({ top: 0 });
  }

  function next() {
    if (stepErrors[screen]) {
      setShowErrors(true);
      requestAnimationFrame(() =>
        bodyRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(),
      );
      return;
    }
    if (returnToReview && screen !== "review") return go("review");
    const order: Screen[] = ["welcome", "sign-in", ...numbered];
    go(order[order.indexOf(screen) + 1]);
  }

  function editFromReview(target: Screen) {
    setReturnToReview(true);
    go(target);
  }

  if (screen === "welcome") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <div className="relative h-[44dvh] min-h-64 overflow-hidden bg-muted">
          <img src={hotel.cover} alt="" decoding="async" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 text-white">
            <p className="text-sm text-white/85">Welcome to</p>
            <h1 className="mt-0.5 text-[26px] leading-tight font-semibold tracking-[-0.02em]">{hotel.name}</h1>
          </div>
        </div>
        <main className="proto-rise flex-1 px-5 pt-5 pb-6">
          <p className="flex items-start gap-2 text-[15px] leading-6 text-muted-foreground">
            <MapPin className="mt-1 size-4 shrink-0" />
            {hotel.address}
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-border-soft py-4">
            <Fact label="Check-in" value={hotel.checkInTime} />
            <Fact label="Check-out" value={hotel.checkOutTime} />
            <Fact label="Rooms from" value={hotel.rateFrom} />
          </dl>
          <p className="mt-5 text-[15px] leading-6">
            Check in from your phone in about two minutes. Keep your Aadhaar, passport or licence handy.
          </p>
          <p className="mt-2 text-[13px] text-subtle-foreground">{hotel.amenities.join(" · ")}</p>
        </main>
        <StickyFooter>
          <Button className={bigButton} onClick={() => go("sign-in")}>
            Start check-in
            <ArrowRight />
          </Button>
        </StickyFooter>
      </div>
    );
  }

  if (screen === "done") return <Done />;

  const stepIndex = numbered.indexOf(screen);
  const { title, body } = copy[screen];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-1 px-2">
          <Button
            variant="ghost"
            className="proto-press size-11 rounded-full p-0 hover:bg-transparent"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <p className="flex-1 text-center text-[13px] font-medium text-muted-foreground tabular-nums">
            {stepIndex >= 0 ? `Step ${stepIndex + 1} of ${numbered.length}` : hotel.name}
          </p>
          <span className="size-11" aria-hidden />
        </div>
        <div className="flex gap-1 px-4 pb-2" aria-hidden>
          {numbered.map((s, i) => (
            <span key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full origin-left rounded-full bg-primary transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  i <= stepIndex ? "scale-x-100" : "scale-x-0",
                )}
              />
            </span>
          ))}
        </div>
      </header>

      <main
        key={screen}
        ref={bodyRef}
        className={cn("flex-1 px-5 pt-4 pb-8", direction === "forward" ? "proto-forward" : "proto-back")}
      >
        <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">{body}</p>
        <div className="mt-6">
          {screen === "sign-in" ? (
            <SignInButtons
              pending={auth.pending}
              onSignIn={(method) => {
                auth.signIn(method);
                window.setTimeout(() => {
                  if (scenario === "returning") {
                    setReturnToReview(true);
                    go("review");
                  } else go("about");
                }, 720);
              }}
            />
          ) : screen === "about" ? (
            <PersonalFields profile={draft.profile} errors={pErrors} showErrors={showErrors} onChange={setProfile} />
          ) : screen === "address" ? (
            <AddressFields profile={draft.profile} errors={pErrors} showErrors={showErrors} onChange={setProfile} />
          ) : screen === "document" ? (
            <DocumentFields document={draft.document} errors={dErrors} showErrors={showErrors} onChange={setDocument} />
          ) : screen === "companions" ? (
            <div className="grid gap-3">
              {draft.companions.map((c) => {
                const selected = draft.selectedCompanionIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleCompanion(c.id)}
                    className={cn(
                      "proto-press flex min-h-16 items-center gap-3 rounded-lg border px-4 text-left",
                      selected ? "border-primary bg-primary-tint/50" : "border-border bg-card",
                    )}
                  >
                    <Avatar initials={initials(c)} className="size-9 text-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{fullName(c)}</span>
                      <span className="block text-[13px] text-muted-foreground">
                        {c.relationship}
                        {c.idEnding ? ` · Aadhaar ending ${c.idEnding}` : " · No ID needed"}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full border transition-colors duration-150",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
                    </span>
                  </button>
                );
              })}
              {addingCompanion ? (
                <div className="rounded-lg border border-border p-4">
                  <AddCompanionForm
                    onCancel={() => setAddingCompanion(false)}
                    onAdd={(c) => {
                      addCompanion(c);
                      setAddingCompanion(false);
                    }}
                  />
                </div>
              ) : (
                <Button variant="outline" className={cn(bigOutlineButton, "border-dashed")} onClick={() => setAddingCompanion(true)}>
                  <Plus />
                  Add a person
                </Button>
              )}
            </div>
          ) : (
            <Review draft={draft} onEdit={editFromReview} />
          )}
        </div>
      </main>

      {screen !== "sign-in" ? (
        <StickyFooter>
          {screen === "review" ? (
            <>
              <p className="mb-2.5 text-center text-[13px] leading-5 text-muted-foreground">
                Access ends {accessPolicy.postCheckoutGraceHours} hours after checkout, or {accessPolicy.maximumDays} days at most.
              </p>
              <Button
                className={bigButton}
                disabled={submit.sending}
                onClick={() => {
                  submit.submit();
                  window.setTimeout(() => go("done"), 950);
                }}
              >
                {submit.sending ? <Loader2 className="animate-spin" /> : null}
                {submit.sending ? "Sending…" : "Agree and send to reception"}
              </Button>
            </>
          ) : (
            <Button className={bigButton} onClick={next}>
              {screen === "companions" && draft.selectedCompanionIds.length === 0
                ? "Just me, continue"
                : returnToReview
                  ? "Save and review"
                  : "Continue"}
            </Button>
          )}
        </StickyFooter>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Review({
  draft,
  onEdit,
}: {
  draft: ReturnType<typeof useDraft>["draft"];
  onEdit: (screen: Screen) => void;
}) {
  const companions = draft.companions.filter((c) => draft.selectedCompanionIds.includes(c.id));
  const rows: { screen: Screen; label: string; value: string; detail?: string }[] = [
    {
      screen: "about",
      label: "You",
      value: fullName(draft.profile),
      detail: `${formatPhone(draft.profile.phone)} · ${formatDate(draft.profile.dateOfBirth)} · ${nationalityLabel(draft.profile)}`,
    },
    {
      screen: "address",
      label: "Home",
      value: `${draft.profile.city}, ${draft.profile.state}`,
      detail: `${draft.profile.addressLine1}, ${draft.profile.postalCode}`,
    },
    {
      screen: "document",
      label: "ID",
      value: documentLabel(draft.document),
      detail: documentRules[draft.document.type].backRequired ? "Front and back photos" : "Photo page",
    },
    {
      screen: "companions",
      label: "With you",
      value: companions.length ? companions.map((c) => c.firstName).join(", ") : "Just you",
    },
  ];
  return (
    <div className="grid gap-6">
      <dl className="divide-y divide-border-soft rounded-lg border border-border bg-card">
        {rows.map((row) => (
          <div key={row.screen} className="flex items-start gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <dt className="text-[13px] text-subtle-foreground">{row.label}</dt>
              <dd className="mt-0.5 text-[15px] font-medium">{row.value}</dd>
              {row.detail ? (
                <dd className="mt-0.5 text-[13px] leading-5 text-muted-foreground tabular-nums">{row.detail}</dd>
              ) : null}
            </div>
            <Button
              variant="ghost"
              className="proto-press -mr-2 h-11 px-3 text-[15px] font-medium text-primary hover:bg-transparent"
              aria-label={`Edit ${row.label}`}
              onClick={() => onEdit(row.screen)}
            >
              Edit
            </Button>
          </div>
        ))}
      </dl>
      <div>
        <h2 className="text-[15px] font-semibold">What the hotel can see</h2>
        <ul className="mt-2 grid gap-2">
          {sharedItems(draft).map((item) => (
            <li key={item} className="flex gap-2.5 text-[15px] leading-6 text-muted-foreground">
              <Check className="mt-1 size-4 shrink-0 text-primary" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] leading-5 text-subtle-foreground">
          ID photos are deleted after your stay. You can stop sharing from this page any time.
        </p>
      </div>
    </div>
  );
}

function Done() {
  const checkedIn = useReceptionStatus(true);
  const revoke = useRevoke();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="grid flex-1 content-center justify-items-center gap-4 px-6 text-center">
        <span className="proto-pop grid size-16 place-items-center rounded-full bg-primary-tint text-primary">
          <Check className="size-8" strokeWidth={2.5} />
        </span>
        <div className="proto-rise">
          {revoke.revoked ? (
            <StatusPill tone="neutral">Sharing stopped</StatusPill>
          ) : checkedIn ? (
            <StatusPill tone="success">Checked in</StatusPill>
          ) : (
            <StatusPill tone="warning">Waiting for reception</StatusPill>
          )}
          <h1 className="mt-3 text-[26px] leading-tight font-semibold tracking-[-0.02em]">
            {revoke.revoked ? "Sharing stopped" : checkedIn ? `Room ${assignedRoom.number}` : "You’re all set"}
          </h1>
          <p className="mx-auto mt-2 max-w-72 text-[15px] leading-6 text-muted-foreground">
            {revoke.revoked
              ? "The hotel can no longer see your ID."
              : checkedIn
                ? `${assignedRoom.type} at ${hotel.name}. Collect your key at the desk.`
                : "Show this screen at the desk. Reception is assigning your room."}
          </p>
        </div>
        {!revoke.revoked ? (
          <p className="flex items-center gap-1.5 text-[13px] text-subtle-foreground">
            <Clock3 className="size-4" />
            Hotel access ends by {accessEndsLabel()}
          </p>
        ) : null}
      </main>
      {!revoke.revoked ? (
        <StickyFooter className="border-t-0">
          <Button variant="ghost" className={cn(bigOutlineButton, "text-muted-foreground hover:bg-transparent")} onClick={revoke.ask}>
            Stop sharing my ID
          </Button>
        </StickyFooter>
      ) : null}
      {revoke.dialog}
    </div>
  );
}
