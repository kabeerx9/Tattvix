// The signed-in check-in: one task per screen. Step order, gating and the
// submit body come from steps.ts; this component owns the selection state and
// wires each step to the real profile, document, companion and check-in APIs.

import type { CheckInContext, GuestProfileInput } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { checkInMutations } from "@/features/check-in/mutations";
import {
  buildSubmitInput,
  checkInSteps,
  initialStep,
  nextStep,
  resolveStep,
  validateProfileStep,
  type CheckInStep,
  type ProfileFieldErrors,
} from "@/features/check-in/steps";
import { companionQueries } from "@/features/companions/queries";
import { guestProfileMutations } from "@/features/guest-profile/mutations";
import { guestProfileQueries } from "@/features/guest-profile/queries";
import { identityDocumentQueries } from "@/features/identity-documents/queries";
import { ApiError } from "@/lib/api";

import { CompanionsStep } from "./check-in-companions-step";
import { ConsentStep } from "./check-in-consent-step";
import { DocumentStep } from "./check-in-document-step";
import {
  ErrorNotice,
  StepBody,
  StepFooter,
  StepHeader,
  StepIntro,
  footerButtonClassName,
} from "./check-in-layout";
import { AboutStepFields, AddressStepFields } from "./check-in-profile-steps";
import { ReviewStep } from "./check-in-review-step";
import { CheckInWelcome } from "./check-in-welcome";

const intros: Record<CheckInStep, { title: string; description: (property: string) => string }> = {
  about: { title: "About you", description: () => "Exactly as written on your ID." },
  address: { title: "Home address", description: () => "Where you live, for the hotel’s guest record." },
  document: { title: "Your ID", description: (property) => `Choose the ID to show ${property}.` },
  companions: {
    title: "Anyone with you?",
    description: () => "Add the people staying with you. Skip this if you’re on your own.",
  },
  review: { title: "Check your details", description: () => "Fix anything that’s wrong before you share." },
  consent: {
    title: "Share with the hotel?",
    description: () => "Read what is shared, then agree. Nothing is sent until you do.",
  },
};

export function CheckInFlow({
  token,
  step,
  edit,
  context,
  onSubmitted,
}: {
  token: string;
  step: CheckInStep | undefined;
  edit: boolean;
  context: CheckInContext;
  onSubmitted: () => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/check-in/$token" });
  const { data: profile } = useSuspenseQuery(guestProfileQueries.detail());
  const { data: documentList } = useSuspenseQuery(identityDocumentQueries.list());
  const { data: companionList } = useSuspenseQuery(companionQueries.list());
  const updateProfile = useMutation(guestProfileMutations.update(queryClient));
  const submitMutation = useMutation(checkInMutations.submit(queryClient));

  const documents = documentList.documents;
  const readyDocumentIds = documents.filter((d) => d.readiness.isReady).map((d) => d.id);

  const [draft, setDraft] = useState<GuestProfileInput>(profile.profile);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [documentId, setDocumentId] = useState<number | null>(readyDocumentIds[0] ?? null);
  const [companionIds, setCompanionIds] = useState<number[]>([]);
  const [companionDocumentIds, setCompanionDocumentIds] = useState<Record<number, number>>({});
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showStepError, setShowStepError] = useState(false);

  const go = useCallback(
    (target: CheckInStep | undefined, options: { edit?: boolean; replace?: boolean } = {}) => {
      setShowStepError(false);
      setFieldErrors({});
      void navigate({
        search: { step: target, edit: options.edit || undefined },
        replace: options.replace,
      });
    },
    [navigate],
  );

  const progress = { missingFields: profile.readiness.missingFields, readyDocumentIds, documentId };
  const shown = step ? resolveStep(step, progress) : undefined;

  // A deep link or refresh onto a step that isn't reachable yet lands on the first gap.
  useEffect(() => {
    if (step && shown !== step) go(shown, { replace: true });
  }, [step, shown, go]);

  // New screen: start at the top and move focus to its heading for screen readers.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true });
  }, [shown]);

  // Any change to what would be shared withdraws a consent given earlier.
  const selectDocument = useCallback((id: number) => {
    setDocumentId((current) => {
      if (current !== id) setConsentAccepted(false);
      return id;
    });
  }, []);

  if (!shown) {
    return (
      <CheckInWelcome
        property={context.property}
        signedIn
        redirect={`/check-in/${token}`}
        onStart={() =>
          go(initialStep({ missingFields: profile.readiness.missingFields, readyDocumentIds }))
        }
      />
    );
  }

  const propertyName = context.property.name;
  const selectedCompanions = companionList.companions.filter((c) => companionIds.includes(c.id));
  const selectedDocument = documents.find((d) => d.id === documentId) ?? null;

  function back() {
    if (!shown) return;
    if (edit && shown !== "review" && shown !== "consent") return go("review");
    const index = checkInSteps.indexOf(shown);
    go(index === 0 ? undefined : checkInSteps[index - 1]);
  }

  function focusFirstInvalid() {
    requestAnimationFrame(() => document.querySelector<HTMLElement>("main [aria-invalid='true']")?.focus());
  }

  function advance() {
    if (!shown) return;
    const target = nextStep(shown, edit);
    if (target) go(target, { edit: edit && target !== "review" && target !== "consent" });
  }

  function continueFrom() {
    if (!shown) return;
    if (shown === "about" || shown === "address") {
      const result = validateProfileStep(shown, draft);
      if (!result.ok) {
        setFieldErrors(result.errors);
        focusFirstInvalid();
        return;
      }
      setFieldErrors({});
      updateProfile.mutate(result.profile, {
        onSuccess: (saved) => {
          setDraft(saved.profile);
          setConsentAccepted(false);
          advance();
        },
      });
      return;
    }
    if (shown === "document" && (documentId === null || !readyDocumentIds.includes(documentId))) {
      setShowStepError(true);
      return;
    }
    if (shown === "consent") {
      const input = buildSubmitInput({
        documentId,
        readyDocumentIds,
        companionIds,
        companionDocumentIds,
        profileReady: profile.readiness.isReady,
        consentAccepted,
      });
      if (!input) {
        setShowStepError(true);
        return;
      }
      submitMutation.mutate(
        { token, input },
        {
          onSuccess: () => {
            toast.success("Check-in request sent to reception");
            onSubmitted();
            go(undefined, { replace: true });
          },
        },
      );
      return;
    }
    advance();
  }

  const saveError =
    updateProfile.error instanceof ApiError
      ? updateProfile.error.message
      : updateProfile.isError
        ? "Your details could not be saved. Check your connection and try again."
        : null;
  const submitError =
    submitMutation.error instanceof ApiError
      ? submitMutation.error.message
      : submitMutation.isError
        ? "Your details could not be shared right now. Please try again."
        : null;

  const intro = intros[shown];
  const pending = updateProfile.isPending || submitMutation.isPending;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <StepHeader step={shown} propertyName={propertyName} onBack={back} />
      <StepBody key={shown}>
        <StepIntro title={shown === "consent" ? `Share with ${propertyName}?` : intro.title} description={intro.description(propertyName)} />

        {shown === "about" ? (
          <AboutStepFields values={draft} errors={fieldErrors} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
        ) : shown === "address" ? (
          <AddressStepFields values={draft} errors={fieldErrors} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
        ) : shown === "document" ? (
          <DocumentStep documents={documents} documentId={documentId} showError={showStepError} onSelect={selectDocument} />
        ) : shown === "companions" ? (
          <CompanionsStep
            companions={companionList.companions}
            selectedIds={companionIds}
            documentIds={companionDocumentIds}
            onToggle={(id, selected) => {
              setConsentAccepted(false);
              setCompanionIds((current) =>
                selected ? [...new Set([...current, id])] : current.filter((x) => x !== id),
              );
              if (!selected) {
                setCompanionDocumentIds(({ [id]: _removed, ...rest }) => rest);
              }
            }}
            onDocumentChange={(companionId, chosen) => {
              setConsentAccepted(false);
              setCompanionDocumentIds(({ [companionId]: _previous, ...rest }) =>
                chosen ? { ...rest, [companionId]: chosen } : rest,
              );
            }}
          />
        ) : shown === "review" ? (
          <ReviewStep
            profile={profile.profile}
            document={selectedDocument}
            companions={selectedCompanions}
            onEdit={(target) => go(target, { edit: true })}
          />
        ) : selectedDocument ? (
          <ConsentStep
            propertyName={propertyName}
            organizationName={context.property.organization.name}
            profile={profile.profile}
            document={selectedDocument}
            companions={selectedCompanions}
            companionDocumentIds={companionDocumentIds}
            accessPolicy={context.accessPolicy}
            accepted={consentAccepted}
            showError={showStepError && !consentAccepted}
            onAcceptedChange={(accepted) => {
              setConsentAccepted(accepted);
              setShowStepError(false);
            }}
          />
        ) : null}

        {saveError && (shown === "about" || shown === "address") ? <ErrorNotice>{saveError}</ErrorNotice> : null}
        {submitError && shown === "consent" ? <ErrorNotice>{submitError}</ErrorNotice> : null}
      </StepBody>

      <StepFooter>
        {shown === "consent" ? (
          <>
            <Button className={footerButtonClassName} disabled={!consentAccepted || pending} onClick={continueFrom}>
              {submitMutation.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              {submitMutation.isPending ? "Sending…" : "Send check-in request"}
            </Button>
            {!consentAccepted ? (
              <p className="text-center text-[13px] text-subtle-foreground">Tick the box above to send.</p>
            ) : null}
          </>
        ) : (
          <Button className={footerButtonClassName} disabled={pending} onClick={continueFrom}>
            {updateProfile.isPending ? <Loader2 className="animate-spin" /> : null}
            {updateProfile.isPending
              ? "Saving…"
              : shown === "companions" && companionIds.length === 0
                ? edit
                  ? "Save and review"
                  : "Continue on my own"
                : edit && shown !== "review"
                  ? "Save and review"
                  : "Continue"}
          </Button>
        )}
      </StepFooter>
    </div>
  );
}
