import type { IdentityDocument } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Checkbox } from "@tattvix/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tattvix/ui/components/select";
import {
  Link,
  useRouteContext,
} from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Hotel,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ModeToggle } from "@/components/mode-toggle";
import { Surface } from "@/components/design-system";
import { companionQueries } from "@/features/companions/queries";
import { checkInMutations } from "@/features/check-in/mutations";
import { checkInQueries } from "@/features/check-in/queries";
import { guestProfileQueries } from "@/features/guest-profile/queries";
import { identityDocumentQueries } from "@/features/identity-documents/queries";
import { ApiError } from "@/lib/api";

export function CheckInPage({ token }: { token: string }) {
  const { auth } = useRouteContext({ from: "__root__" });
  const { data: context } = useSuspenseQuery(checkInQueries.context(token));
  const redirect = `/check-in/${token}`;

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Hotel className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Tattvix</p>
              <p className="text-xs text-muted-foreground">Secure hotel check-in</p>
            </div>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-7 px-5 py-8 sm:py-12">
        <div className="grid gap-3">
          <p className="app-kicker">Arriving at {context.property.organization.name}</p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Check in to {context.property.name}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Review your saved identity, choose any companions, and approve exactly
            what this property may access for this stay.
          </p>
        </div>

        {!auth.isAuthenticated ? (
          <SignedOutCheckIn
            redirect={redirect}
            accessPolicy={context.accessPolicy}
          />
        ) : context.existingStay ? (
          <ExistingStay
            token={token}
            stay={context.existingStay}
            propertyName={context.property.name}
            accessPolicy={context.accessPolicy}
          />
        ) : (
          <AuthenticatedCheckIn
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
      <Surface className="p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <h2 className="mt-5 text-xl font-semibold">Sign in before sharing</h2>
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
      </Surface>
      <PrivacySummary accessPolicy={accessPolicy} />
    </div>
  );
}

function AuthenticatedCheckIn({
  token,
  propertyName,
  accessPolicy,
}: {
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
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<number[]>([]);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const submitMutation = useMutation(checkInMutations.submit(queryClient));
  const canSubmit =
    profile.readiness.isReady &&
    Boolean(documentId) &&
    consentAccepted &&
    !submitMutation.isPending;

  function toggleCompanion(id: number, checked: boolean) {
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
          consentAccepted: true,
        },
      },
      {
        onSuccess: () => toast.success("Identity shared with the hotel"),
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
      <Surface className="grid gap-5 p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-muted text-foreground">
          <FileCheck2 className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Finish your travel profile</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            A complete profile and one ready identity document are required
            before anything can be shared with {propertyName}.
          </p>
        </div>
        <Button nativeButton={false} className="w-fit" render={<Link to="/profile" />}>
          Complete profile
          <ArrowRight />
        </Button>
      </Surface>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Surface className="grid gap-7 p-6 sm:p-8">
        <section className="grid gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
              <FileCheck2 className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Identity document</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose the document snapshot that this property will receive.
              </p>
            </div>
          </div>
          <Select
            items={documentOptions}
            value={documentId || null}
            onValueChange={(value) => setDocumentId(value ?? "")}
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
        </section>

        <section className="grid gap-3 border-t pt-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
              <UsersRound className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Companions</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Optional. Only selected, complete companion profiles are shared.
              </p>
            </div>
          </div>
          {companions.companions.length ? (
            <div className="grid gap-2">
              {companions.companions.map((companion) => {
                const checked = selectedCompanionIds.includes(companion.id);
                return (
                  <label
                    key={companion.id}
                    className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!companion.readiness.isReady}
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
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">
              No companions saved. You can continue as the primary guest.
            </p>
          )}
        </section>

        <section className="grid gap-4 border-t pt-6">
          <label className="flex items-start gap-3 rounded-2xl border bg-muted/40 p-4">
            <Checkbox
              className="mt-0.5"
              checked={consentAccepted}
              onCheckedChange={(value) => setConsentAccepted(value === true)}
            />
            <span className="text-sm leading-6">
              I approve sharing the selected profile, document metadata and
              images, and companions with {propertyName} for this stay. Access
              lasts for up to {accessPolicy.maximumDays} days unless I revoke
              it sooner. Checkout limits any remaining access to{" "}
              {accessPolicy.postCheckoutGraceHours} hours. Every hotel view is
              property-scoped and audited.
            </span>
          </label>
          {submitError ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {submitError}
            </p>
          ) : null}
          <Button size="lg" disabled={!canSubmit} onClick={submit}>
            {submitMutation.isPending ? "Sharing securely..." : "Approve and share"}
            <ShieldCheck />
          </Button>
        </section>
      </Surface>
      <PrivacySummary accessPolicy={accessPolicy} />
    </div>
  );
}

function ExistingStay({
  token,
  stay,
  propertyName,
  accessPolicy,
}: {
  token: string;
  stay: {
    id: string;
    status: "DRAFT" | "SUBMITTED" | "CLOSED" | "REVOKED";
    submittedAt: string | null;
    closedAt: string | null;
    hotelAccessExpiresAt: string | null;
  };
  propertyName: string;
  accessPolicy: AccessPolicy;
}) {
  const queryClient = useQueryClient();
  const revokeMutation = useMutation(checkInMutations.revoke(queryClient));
  const revoked = stay.status === "REVOKED";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Surface className="p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
          {revoked ? <ShieldCheck className="size-5" /> : <CheckCircle2 className="size-5" />}
        </span>
        <h2 className="mt-5 text-xl font-semibold">
          {revoked ? "Hotel access has been revoked" : "Identity submitted"}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {revoked
            ? `${propertyName} can no longer open this identity package.`
            : `${propertyName} can access the submitted snapshot only during the authorized window.`}
        </p>
        {!revoked && stay.hotelAccessExpiresAt ? (
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4" />
            Access ends no later than {formatDateTime(stay.hotelAccessExpiresAt)}
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
      </Surface>
      <PrivacySummary accessPolicy={accessPolicy} />
    </div>
  );
}

function PrivacySummary({ accessPolicy }: { accessPolicy: AccessPolicy }) {
  return (
    <Surface className="h-fit p-6">
      <span className="grid size-10 place-items-center rounded-xl bg-muted">
        <Building2 className="size-5" />
      </span>
      <h2 className="mt-5 text-sm font-semibold">How access works</h2>
      <ul className="mt-3 grid gap-3 text-xs leading-5 text-muted-foreground">
        <li>Saving a document does not share it with a hotel.</li>
        <li>The hotel receives a frozen snapshot only after approval.</li>
        <li>Each document view uses a fresh, short-lived private link.</li>
        <li>
          Access lasts up to {accessPolicy.maximumDays} days, ends immediately
          on revocation, and is capped to {accessPolicy.postCheckoutGraceHours}{" "}
          hours after checkout.
        </li>
      </ul>
    </Surface>
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
