// The signed-in check-in: one task per screen. Step order, gating and the
// submit body come from @tattvix/api (check-in-steps); this component owns the
// selection state and wires each step to the profile, document, companion and
// check-in APIs. Mirrors check-in-flow.tsx on the web. The current step lives
// in React state; the Android hardware back moves to the previous step.
import {
  buildSubmitInput,
  checkInKeys,
  checkInSteps,
  guestProfileKeys,
  initialStep,
  nextStep,
  profileFormFields,
  resolveStep,
  saveRefusalSummary,
  serverFieldErrors,
  validateProfileStep,
  type CheckInStep,
  type CheckInSelection,
  type ProfileFieldErrors,
} from "@tattvix/api";
import type {
  CheckInContext,
  CompanionProfile,
  GuestCheckInSubmitInput,
  GuestProfileInput,
  GuestProfileResponse,
  IdentityDocument,
  GuestProfileMissingField,
} from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, Text } from "react-native";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { Button, colors, toast, type } from "@/src/design-system";
import { api, queries } from "@/src/lib/api";
import { errorMessage } from "@/src/lib/format";

import { CheckInWelcome } from "./check-in-welcome";
import { CompanionsStep } from "./check-in-companions-step";
import { ConsentStep } from "./check-in-consent-step";
import { DocumentStep } from "./check-in-document-step";
import { CheckInScaffold, ErrorNotice, StepHeader, StepIntro } from "./check-in-layout";
import { AboutStepFields, AddressStepFields } from "./check-in-profile-steps";
import { ReviewStep } from "./check-in-review-step";

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
  context,
  onSubmitted,
}: {
  token: string;
  context: CheckInContext;
  onSubmitted: () => void;
}) {
  const profile = useQuery(queries.guestProfile.detail());
  const documents = useQuery(queries.identityDocuments.list());
  const companions = useQuery(queries.companions.list());

  if (!profile.data || !documents.data || !companions.data) {
    if (profile.isError || documents.isError || companions.isError) {
      return (
        <RetryScreen
          retrying={profile.isFetching || documents.isFetching || companions.isFetching}
          onRetry={() => {
            void profile.refetch();
            void documents.refetch();
            void companions.refetch();
          }}
        />
      );
    }
    return <PendingScreen />;
  }

  return (
    <FlowBody
      token={token}
      context={context}
      onSubmitted={onSubmitted}
      profile={profile.data}
      documents={documents.data.documents}
      companions={companions.data.companions}
    />
  );
}

function FlowBody({
  token,
  context,
  onSubmitted,
  profile,
  documents,
  companions,
}: {
  token: string;
  context: CheckInContext;
  onSubmitted: () => void;
  profile: GuestProfileResponse;
  documents: IdentityDocument[];
  companions: CompanionProfile[];
}) {
  const queryClient = useQueryClient();
  const readyDocumentIds = documents.filter((document) => document.readiness.isReady).map((document) => document.id);

  // null is the welcome screen; a step is one task on screen.
  const [step, setStep] = useState<CheckInStep | null>(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<GuestProfileInput>(profile.profile);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [documentId, setDocumentId] = useState<number | null>(readyDocumentIds[0] ?? null);
  const [companionIds, setCompanionIds] = useState<number[]>([]);
  const [companionDocumentIds, setCompanionDocumentIds] = useState<Record<number, number>>({});
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showStepError, setShowStepError] = useState(false);

  const saveProfile = useMutation({
    mutationFn: (input: GuestProfileInput) => api.guestProfile.update(input),
    onSuccess: (saved) => {
      // The resolver reads readiness from the cache; seed it so Continue moves on at once.
      queryClient.setQueryData(guestProfileKeys.detail(), saved);
      void queryClient.invalidateQueries({ queryKey: guestProfileKeys.detail() });
    },
    // The server's per-field refusal lands under the step's inputs, beside any client errors.
    onError: (error) => setFieldErrors((current) => ({ ...current, ...(serverFieldErrors(error, profileFormFields).fieldErrors as ProfileFieldErrors) })),
  });
  const submit = useMutation({
    mutationFn: (input: GuestCheckInSubmitInput) => api.checkIn.submit(token, input),
    onSuccess: (stay) => {
      toast("Check-in submitted");
      // Show the stay status at once; the refetch below confirms it from the server.
      queryClient.setQueryData<CheckInContext>(checkInKeys.context(token), (current) =>
        current ? { ...current, existingStay: stay } : current,
      );
      void queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      onSubmitted();
    },
  });

  const progress = { missingFields: profile.readiness.missingFields, readyDocumentIds, documentId };

  function go(target: CheckInStep | null, options: { edit?: boolean; missingFields?: readonly GuestProfileMissingField[] } = {}) {
    setShowStepError(false);
    setFieldErrors({});
    saveProfile.reset();
    submit.reset();
    setEdit(!!options.edit);
    setStep(target === null ? null : resolveStep(target, { ...progress, missingFields: options.missingFields ?? progress.missingFields }));
  }

  // Switching the chosen ID withdraws a consent given for the previous one.
  useEffect(() => {
    setConsentAccepted(false);
  }, [documentId]);

  function back() {
    if (step === null) return;
    if (edit && step !== "review" && step !== "consent") return go("review");
    const index = checkInSteps.indexOf(step);
    go(index === 0 ? null : checkInSteps[index - 1]);
  }

  // The hardware back goes to the previous step; from the welcome screen it is
  // left unhandled so the screen closes as usual.
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === null) return false;
      backRef.current();
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  function advance(missingFields?: readonly GuestProfileMissingField[]) {
    if (step === null) return;
    const target = nextStep(step, edit);
    if (target) go(target, { edit: edit && target !== "review" && target !== "consent", missingFields });
  }

  async function continueFrom() {
    if (step === null) return;
    if (step === "about" || step === "address") {
      const result = validateProfileStep(step, draft);
      if (!result.ok) {
        setFieldErrors(result.errors);
        return;
      }
      setFieldErrors({});
      try {
        const saved = await saveProfile.mutateAsync(result.profile);
        setDraft(saved.profile);
        setConsentAccepted(false);
        // The profile prop is still the pre-save copy; resolve against the saved readiness.
        advance(saved.readiness.missingFields);
      } catch {
        // Shown from saveProfile.error below.
      }
      return;
    }
    if (step === "document" && (documentId === null || !readyDocumentIds.includes(documentId))) {
      setShowStepError(true);
      return;
    }
    if (step === "consent") {
      const selection: CheckInSelection = {
        documentId,
        readyDocumentIds,
        companionIds,
        companionDocumentIds,
        profileReady: profile.readiness.isReady,
        consentAccepted,
      };
      const input = buildSubmitInput(selection);
      if (!input) {
        setShowStepError(true);
        return;
      }
      submit.mutate(input);
      return;
    }
    advance();
  }

  if (step === null) {
    return (
      <CheckInWelcome
        property={context.property}
        signedIn
        onStart={() => go(initialStep({ missingFields: profile.readiness.missingFields, readyDocumentIds }))}
      />
    );
  }

  const propertyName = context.property.name;
  const selectedCompanions = companions.filter((companion) => companionIds.includes(companion.id));
  const selectedDocument = documents.find((document) => document.id === documentId) ?? null;
  const pending = saveProfile.isPending || submit.isPending;
  const intro = intros[step];

  const saveError =
    step === "about" || step === "address"
      ? saveRefusalSummary(saveProfile.error, fieldErrors, profileFormFields, "Your details could not be saved. Check your connection and try again.")
      : null;
  const submitError = step === "consent" ? errorMessage(submit.error, "Your details could not be shared right now. Please try again.") : null;

  const footer =
    step === "consent" ? (
      <>
        <Button
          label="Send check-in request"
          loading={submit.isPending}
          disabled={!consentAccepted || pending}
          onPress={() => void continueFrom()}
        />
        {!consentAccepted ? <Text style={styles.hint}>Tick the box above to send.</Text> : null}
      </>
    ) : (
      <Button
        label={footerLabel(step, edit, companionIds.length)}
        loading={saveProfile.isPending}
        disabled={pending}
        onPress={() => void continueFrom()}
      />
    );

  return (
    <CheckInScaffold
      key={step}
      header={<StepHeader step={step} propertyName={propertyName} onBack={back} />}
      footer={footer}
    >
      <StepIntro
        title={step === "consent" ? `Share with ${propertyName}?` : intro.title}
        description={intro.description(propertyName)}
      />

      {step === "about" ? (
        <AboutStepFields values={draft} errors={fieldErrors} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
      ) : step === "address" ? (
        <AddressStepFields values={draft} errors={fieldErrors} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
      ) : step === "document" ? (
        <DocumentStep documents={documents} documentId={documentId} showError={showStepError} onSelect={setDocumentId} />
      ) : step === "companions" ? (
        <CompanionsStep
          companions={companions}
          selectedIds={companionIds}
          documentIds={companionDocumentIds}
          onToggle={(id, selected) => {
            setConsentAccepted(false);
            setCompanionIds((current) => (selected ? [...new Set([...current, id])] : current.filter((value) => value !== id)));
            if (!selected) {
              setCompanionDocumentIds((current) => {
                const next = { ...current };
                delete next[id];
                return next;
              });
            }
          }}
          onDocumentChange={(companionId, chosen) => {
            setConsentAccepted(false);
            setCompanionDocumentIds((current) => {
              const next = { ...current };
              if (chosen) next[companionId] = chosen;
              else delete next[companionId];
              return next;
            });
          }}
        />
      ) : step === "review" ? (
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

      {saveError ? <ErrorNotice>{saveError}</ErrorNotice> : null}
      {submitError ? <ErrorNotice>{submitError}</ErrorNotice> : null}
    </CheckInScaffold>
  );
}

function footerLabel(step: CheckInStep, edit: boolean, companionCount: number) {
  if (step === "companions" && companionCount === 0) return edit ? "Save and review" : "Continue on my own";
  if (edit && step !== "review") return "Save and review";
  return "Continue";
}

const styles = StyleSheet.create({
  hint: { ...type.caption, color: colors.subtleForeground, textAlign: "center" },
});
