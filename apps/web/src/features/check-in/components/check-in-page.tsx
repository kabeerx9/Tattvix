import type { GuestStay, IdentityDocument } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Checkbox } from "@tattvix/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tattvix/ui/components/select";
import { Link, useRouteContext } from "@tanstack/react-router";
import {
  useMutation,
  useQueries,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  FileCheck2,
  Hotel,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Panel, PanelHeader, PanelSection, StatusPill } from "@/components/design-system";
import { companionQueries } from "@/features/companions/queries";
import { checkInMutations } from "@/features/check-in/mutations";
import { checkInQueries } from "@/features/check-in/queries";
import { guestProfileQueries } from "@/features/guest-profile/queries";
import { identityDocumentQueries } from "@/features/identity-documents/queries";
import { ApiError } from "@/lib/api";
import { HotelArrivalSummary } from "./hotel-arrival-summary";
import { guestStayStatusLabel } from "@/features/guest-stays/status";

export function CheckInPage({ token }: { token: string }) {
  const { auth } = useRouteContext({ from: "__root__" });
  const { data: context } = useSuspenseQuery({
    ...checkInQueries.context(token),
    refetchInterval: (query) =>
      query.state.data?.existingStay &&
      query.state.data.existingStay.operationalStatus !== "CHECKED_OUT"
        ? 5000
        : false,
  });
  const redirect = `/check-in/${token}`;
  const [newVisit, setNewVisit] = useState(false);

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground">
              <Hotel className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Tattwix</p>
              <p className="text-xs text-muted-foreground">
                Secure hotel check-in
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-7 px-5 py-8 sm:py-12">
        <div className="grid gap-3">

          <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Check in to {context.property.name}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Review your saved identity, choose any companions, and approve
            exactly what this property may access for this stay.
          </p>
        </div>

        <HotelArrivalSummary property={context.property} />
        {!auth.isAuthenticated ? (
          <SignedOutCheckIn
            redirect={redirect}
            accessPolicy={context.accessPolicy}
          />
        ) : context.existingStay && !newVisit ? (
          <ExistingStay
            token={token}
            stay={context.existingStay}
            onNewVisit={() => setNewVisit(true)}
            propertyName={context.property.name}
            accessPolicy={context.accessPolicy}
          />
        ) : (
          <AuthenticatedCheckIn
            onSubmitted={() => setNewVisit(false)}
            token={token}
            propertyName={context.property.name}
            accessPolicy={context.accessPolicy}
          />
        )}
      </main>
    </div>
  );
}

function SignedOutCheckIn({
  redirect,
  accessPolicy,
}: {
  redirect: string;
  accessPolicy: AccessPolicy;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Panel><PanelHeader title="Sign in before sharing" icon={ShieldCheck} /><PanelSection>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Your hotel cannot see anything yet. Sign in to review your saved
          profile and provide stay-specific consent.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            nativeButton={false}
            size="lg"
            render={<Link to="/login" search={{ redirect }} />}
          >
            Sign in and continue
            <ArrowRight />
          </Button>
          <Button
            nativeButton={false}
            size="lg"
            variant="outline"
            render={<Link to="/sign-up" search={{ redirect }} />}
          >
            Create an account
          </Button>
        </div>
      </PanelSection></Panel>
      <PrivacySummary accessPolicy={accessPolicy} />
    </div>
  );
}

function AuthenticatedCheckIn({
  onSubmitted,
  token,
  propertyName,
  accessPolicy,
}: {
  onSubmitted: () => void;
  token: string;
  propertyName: string;
  accessPolicy: AccessPolicy;
}) {
  const queryClient = useQueryClient();
  const { data: profile } = useSuspenseQuery(guestProfileQueries.detail());
  const { data: documents } = useSuspenseQuery(identityDocumentQueries.list());
  const { data: companions } = useSuspenseQuery(companionQueries.list());
  const readyDocuments = documents.documents.filter(
    (document) => document.readiness.isReady,
  );
  const documentOptions = readyDocuments.map((document) => ({
    label: documentLabel(document),
    value: document.id.toString(),
  }));
  const [documentId, setDocumentId] = useState(
    readyDocuments[0]?.id.toString() ?? "",
  );
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<number[]>(
    [],
  );
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [companionDocumentIds, setCompanionDocumentIds] = useState<
    Record<number, string>
  >({});
  const companionDocumentQueries = useQueries({
    queries: selectedCompanionIds.map((id) => identityDocumentQueries.list(id)),
  });
  const selectedCompanionDocumentsReady = selectedCompanionIds.every(
    (id, index) => {
      const chosenId = companionDocumentIds[id];
      return (
        !chosenId ||
        companionDocumentQueries[index]?.data?.documents.some(
          (document) =>
            document.id === Number(chosenId) && document.readiness.isReady,
        )
      );
    },
  );
  const submitMutation = useMutation(checkInMutations.submit(queryClient));
  const canSubmit =
    profile.readiness.isReady &&
    readyDocuments.some((document) => document.id === Number(documentId)) &&
    selectedCompanionDocumentsReady &&
    consentAccepted &&
    !submitMutation.isPending;

  function toggleCompanion(id: number, checked: boolean) {
    setConsentAccepted(false);
    setCompanionDocumentIds((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSelectedCompanionIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((companionId) => companionId !== id),
    );
  }

  function submit() {
    if (!canSubmit) return;
    submitMutation.mutate(
      {
        token,
        input: {
          identityDocumentId: Number(documentId),
          companionIds: selectedCompanionIds,
          companionDocuments: selectedCompanionIds.flatMap((companionId) =>
            companionDocumentIds[companionId]
              ? [
                  {
                    companionId,
                    identityDocumentId: Number(
                      companionDocumentIds[companionId],
                    ),
                  },
                ]
              : [],
          ),
          consentAccepted: true,
        },
      },
      {
        onSuccess: () => {
          toast.success("Check-in request sent to reception");
          onSubmitted();
        },
      },
    );
  }

  const submitError =
    submitMutation.error instanceof ApiError
      ? submitMutation.error.message
      : submitMutation.isError
        ? "Your identity could not be shared right now."
        : null;

  if (!profile.readiness.isReady || readyDocuments.length === 0) {
    return (
      <Panel><PanelHeader title="Finish your travel profile" icon={FileCheck2} /><PanelSection className="grid gap-5">
        <div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            A complete profile and one ready identity document are required
            before anything can be shared with {propertyName}.
          </p>
        </div>
        <Button
          nativeButton={false}
          className="w-fit"
          render={<Link to="/profile" />}
        >
          Complete profile
          <ArrowRight />
        </Button>
      </PanelSection></Panel>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Panel>
        <PanelSection className="grid gap-3">
          <div className="flex items-start gap-3">
            <FileCheck2 className="size-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold">Identity document</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose the document snapshot that this property will receive.
              </p>
            </div>
          </div>
          <Select
            items={documentOptions}
            value={documentId || null}
            onValueChange={(value) => {
              setDocumentId(value ?? "");
              setConsentAccepted(false);
            }}
          >
            <SelectTrigger aria-label="Identity document">
              <SelectValue placeholder="Choose an identity document" />
            </SelectTrigger>
            <SelectContent>
              {documentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PanelSection>

        <PanelSection className="grid gap-3">
          <div className="flex items-start gap-3">
            <UsersRound className="size-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold">Companions</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Optional. Only selected, complete companion profiles are shared.
              </p>
            </div>
          </div>
          {companions.companions.length ? (
            <div className="grid gap-2">
              {companions.companions.map((companion) => {
                const checked = selectedCompanionIds.includes(companion.id);
                const documentQuery =
                  companionDocumentQueries[
                    selectedCompanionIds.indexOf(companion.id)
                  ];
                const readyCompanionDocuments =
                  documentQuery?.data?.documents.filter(
                    (document) => document.readiness.isReady,
                  ) ?? [];
                const options = [
                  { label: "Do not share an ID", value: "none" },
                  ...readyCompanionDocuments.map((document) => ({
                    label: documentLabel(document),
                    value: String(document.id),
                  })),
                ];
                return (
                  <div
                    key={companion.id}
                    className="grid gap-3 rounded-lg border bg-muted/40 p-3"
                  >
                    <label className="flex items-center gap-3">
                      <Checkbox
                        checked={checked}
                        disabled={
                          !companion.readiness.isReady ||
                          (!checked && selectedCompanionIds.length >= 20)
                        }
                        onCheckedChange={(value) =>
                          toggleCompanion(companion.id, value === true)
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {[companion.legalFirstName, companion.legalLastName]
                            .filter(Boolean)
                            .join(" ") || "Unnamed companion"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {companion.readiness.isReady
                            ? companion.relationship || "Ready to share"
                            : "Complete this companion before selecting"}
                        </span>
                      </span>
                    </label>
                    {checked ? (
                      <div className="grid gap-2 border-t pt-3">
                        <p className="text-xs font-medium">
                          Companion identity document (optional)
                        </p>
                        {documentQuery?.isPending ? (
                          <p className="text-xs text-muted-foreground">
                            Loading documents...
                          </p>
                        ) : documentQuery?.isError ? (
                          <div
                            role="alert"
                            className="flex items-center gap-2 text-xs text-destructive"
                          >
                            Could not load documents.
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => void documentQuery.refetch()}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : (
                          <Select
                            items={options}
                            value={companionDocumentIds[companion.id] || "none"}
                            onValueChange={(value) => {
                              setCompanionDocumentIds((current) => ({
                                ...current,
                                [companion.id]:
                                  value && value !== "none" ? value : "",
                              }));
                              setConsentAccepted(false);
                            }}
                          >
                            <SelectTrigger
                              aria-label={`Identity document for ${companion.legalFirstName}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="text-xs leading-5 text-muted-foreground">
                          Only the ID you select and its images will be shared.{" "}
                          <Link to="/companions" className="underline">
                            Manage companion IDs
                          </Link>
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg bg-muted p-4 text-xs leading-5 text-muted-foreground">
              No companions saved. You can continue as the primary guest.
            </p>
          )}
        </PanelSection>

        <PanelSection className="grid gap-4">
          <label className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
            <Checkbox
              className="mt-0.5"
              checked={consentAccepted}
              onCheckedChange={(value) => setConsentAccepted(value === true)}
            />
            <span className="text-sm leading-6">
              I approve sharing the selected profile, document metadata and
              images, selected companions, and any IDs chosen for those
              companions with {propertyName} for this stay. Access lasts for up
              to {accessPolicy.maximumDays} days unless I revoke it sooner.
              Checkout limits any remaining access to{" "}
              {accessPolicy.postCheckoutGraceHours} hours, after which the
              document images shared with the hotel are permanently deleted.
              Every hotel view is property-scoped and audited.
            </span>
          </label>
          {submitError ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {submitError}
            </p>
          ) : null}
          <Button size="lg" disabled={!canSubmit} onClick={submit}>
            {submitMutation.isPending
              ? "Sending request..."
              : "Send check-in request"}
            <ShieldCheck />
          </Button>
        </PanelSection>
      </Panel>
      <PrivacySummary accessPolicy={accessPolicy} />
    </div>
  );
}

function ExistingStay({
  onNewVisit,
  token,
  stay,
  propertyName,
  accessPolicy,
}: {
  onNewVisit: () => void;
  token: string;
  stay: GuestStay;
  propertyName: string;
  accessPolicy: AccessPolicy;
}) {
  const queryClient = useQueryClient();
  const revokeMutation = useMutation(checkInMutations.revoke(queryClient));
  const revoked = stay.status === "REVOKED";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Panel><PanelHeader title="Your stay" /><PanelSection>
        <StatusPill tone={stay.operationalStatus === "PENDING_CHECK_IN" ? "warning" : stay.operationalStatus === "CHECKED_IN" ? "success" : "neutral"}>
          {guestStayStatusLabel(stay.operationalStatus)}
        </StatusPill>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {revoked
            ? `${propertyName} can no longer open this identity package.`
            : `${propertyName} can access the submitted snapshot only during the authorized window.`}
        </p>
        <p className="mt-3 text-sm font-medium">
          {stay.room
            ? `Room ${stay.room.number}`
            : "Reception will assign your room and confirm the rate."}
        </p>
        <Button
          nativeButton={false}
          className="mt-5"
          render={<Link to="/stays/$stayId" params={{ stayId: stay.id }} />}
        >
          View stay and bill
          <ArrowRight />
        </Button>
        {stay.operationalStatus === "CHECKED_OUT" ? (
          <Button className="mt-5 ml-3" variant="outline" onClick={onNewVisit}>
            Start a new visit
          </Button>
        ) : null}
        {revokeMutation.isError ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {revokeMutation.error instanceof ApiError
              ? revokeMutation.error.message
              : "Could not revoke hotel access. Please retry."}
          </p>
        ) : null}
        {!revoked && stay.hotelAccessExpiresAt ? (
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4" />
            Access ends no later than{" "}
            {formatDateTime(stay.hotelAccessExpiresAt)}
          </div>
        ) : null}
        {!revoked ? (
          <Button
            className="mt-6"
            variant="outline"
            disabled={revokeMutation.isPending}
            onClick={() => revokeMutation.mutate({ token, stayId: stay.id })}
          >
            {revokeMutation.isPending ? "Revoking..." : "Revoke hotel access"}
          </Button>
        ) : null}
      </PanelSection></Panel>
      <PrivacySummary accessPolicy={accessPolicy} />
    </div>
  );
}

function PrivacySummary({ accessPolicy }: { accessPolicy: AccessPolicy }) {
  return (
    <Panel className="h-fit"><PanelHeader title="How access works" /><PanelSection>
      <ul className="mt-3 grid list-disc gap-3 pl-4 text-xs leading-5 text-muted-foreground">
        <li>Saving a document does not share it with a hotel.</li>
        <li>The hotel receives your selected details only after approval.</li>
        <li>
          Access lasts up to {accessPolicy.maximumDays} days, ends immediately
          on revocation, and is capped to {accessPolicy.postCheckoutGraceHours}{" "}
          hours after checkout.
        </li>
      </ul>
    </PanelSection></Panel>
  );
}

function documentLabel(document: IdentityDocument) {
  const type = {
    AADHAAR: "Aadhaar card",
    PASSPORT: "Passport",
    DRIVING_LICENCE: "Driving licence",
    VOTER_ID: "Voter ID",
  }[document.documentType || "AADHAAR"];
  const ending = document.documentNumber.slice(-4);
  return `${type} ending ${ending || "—"}`;
}

type AccessPolicy = {
  maximumDays: number;
  postCheckoutGraceHours: number;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
