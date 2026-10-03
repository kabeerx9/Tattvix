import { hotelRegistrationInputSchema, type HotelRegistrationRequest } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { useIsFetching, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Building2, CheckCircle2, CircleAlert, Clock3, RefreshCw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader, Panel, PanelHeader, PanelSection, StatusPill, KpiStrip, Kpi } from "@/components/design-system";
import { currentUserKeys } from "@/features/current-user/keys";
import { ApiError } from "@/lib/api";

import { hotelRegistrationMutations } from "../mutations";
import { hotelRegistrationQueries } from "../queries";
import { getLatestRejectedRequest, hasPendingHotelRequest } from "../status";

export function HotelRegistrationPage() {
  const queryClient = useQueryClient();
  const requestQuery = useQuery(hotelRegistrationQueries.guest());
  const submitMutation = useMutation(hotelRegistrationMutations.submit(queryClient));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const syncedApprovedRequestIds = useRef(new Set<number>());
  const [accessRefreshPending, setAccessRefreshPending] = useState(false);
  const requests = requestQuery.data?.requests ?? [];
  const hasPending = hasPendingHotelRequest(requests);
  const latestRejection = getLatestRejectedRequest(requests);
  const pendingCurrentUserFetches = useIsFetching({ queryKey: currentUserKeys.all }) > 0;
  const approvedRequestIds = requests
    .filter((request) => request.status === "APPROVED")
    .map((request) => request.id);
  const hasUnsyncedApproval = approvedRequestIds.some(
    (id) => !syncedApprovedRequestIds.current.has(id),
  );

  useEffect(() => {
    if (!hasUnsyncedApproval) return;

    for (const id of approvedRequestIds) syncedApprovedRequestIds.current.add(id);
    setAccessRefreshPending(true);
    void queryClient.invalidateQueries({ queryKey: currentUserKeys.all })
      .then(() => router.invalidate())
      .finally(() => setAccessRefreshPending(false));
  }, [approvedRequestIds, hasUnsyncedApproval, queryClient, router]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = hotelRegistrationInputSchema.safeParse({
      hotelName: data.get("hotelName"),
      address: data.get("address"),
      contactPhone: data.get("contactPhone"),
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
      setFieldErrors(errors);
      return;
    }

    submitMutation.mutate(parsed.data, {
      onSuccess: () => {
        form.reset();
        toast.success("Hotel registration request submitted");
      },
    });
  }

  const submitError = submitMutation.error instanceof ApiError
    ? submitMutation.error.message
    : submitMutation.isError
      ? "Your registration request could not be submitted."
      : null;

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title="Register your hotel"
        meta="Reviewed by a platform admin before access is granted"
        actions={
          <Button variant="outline" onClick={() => requestQuery.refetch()} disabled={requestQuery.isFetching}>
            <RefreshCw className={requestQuery.isFetching ? "animate-spin" : undefined} />
            Refresh status
          </Button>
        }
      />

      {requestQuery.data ? <KpiStrip><Kpi icon={Clock3} label="Pending" value={requests.filter((request) => request.status === "PENDING").length} /><Kpi icon={CheckCircle2} label="Approved" value={requests.filter((request) => request.status === "APPROVED").length} /><Kpi icon={CircleAlert} label="Rejected" value={requests.filter((request) => request.status === "REJECTED").length} /></KpiStrip> : null}
      {requestQuery.isPending ? <LoadingState /> : null}
      {requestQuery.isError ? <QueryError onRetry={() => requestQuery.refetch()} /> : null}
      {requestQuery.data ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
            {hasPending ? <PendingState /> : (
              <RegistrationForm
                key={latestRejection?.id ?? "new"}
                latestRejection={latestRejection}
                fieldErrors={fieldErrors}
                submitError={submitError}
                isSubmitting={submitMutation.isPending}
                onSubmit={onSubmit}
              />
            )}
          </div>
          <RequestHistory
            requests={requests}
            accessRefreshPending={accessRefreshPending || pendingCurrentUserFetches || hasUnsyncedApproval}
          />
        </div>
      ) : null}
    </div>
  );
}

function RegistrationForm({ latestRejection, fieldErrors, submitError, isSubmitting, onSubmit }: {
  latestRejection: HotelRegistrationRequest | undefined;
  fieldErrors: Record<string, string>;
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      {latestRejection ? (
        <Panel className="border-destructive/30 bg-destructive/5 p-5">
          <div className="flex gap-3">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <h2 className="font-semibold">Update your previous request</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{latestRejection.rejectionReason}</p>
            </div>
          </div>
        </Panel>
      ) : null}
      <Panel><PanelHeader title="Hotel details" icon={Building2} /><PanelSection className="grid gap-6">
        <p className="text-xs text-subtle-foreground">Use the legal business name and a contact number your team monitors.</p>
        <Field label="Hotel name" error={fieldErrors.hotelName}>
          <Input id="hotelName" name="hotelName" defaultValue={latestRejection?.hotelName} maxLength={255} required autoComplete="organization" placeholder="The Fern Jaipur" aria-invalid={Boolean(fieldErrors.hotelName)} />
        </Field>
        <Field label="Hotel address" error={fieldErrors.address}>
          <Input id="address" name="address" defaultValue={latestRejection?.address} maxLength={1000} required autoComplete="street-address" placeholder="123 Hospitality Road, Jaipur" aria-invalid={Boolean(fieldErrors.address)} />
        </Field>
        <Field label="Contact phone" error={fieldErrors.contactPhone}>
          <Input id="contactPhone" name="contactPhone" defaultValue={latestRejection?.contactPhone} maxLength={32} required type="tel" autoComplete="tel" placeholder="+91 98765 43210" aria-invalid={Boolean(fieldErrors.contactPhone)} />
        </Field>
        {submitError ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{submitError}</p> : null}
        <div className="flex justify-end border-t pt-5">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting request..." : <><Send />Submit for review</>}</Button>
        </div>
      </PanelSection></Panel>
    </form>
  );
}

function PendingState() {
  return <Panel className="p-6 sm:p-8"><div className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Clock3 className="size-5" /></span><div><StatusPill tone="warning">Under review</StatusPill><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">We will update this page when a platform administrator has made a decision. Hotel workspace access is not available until the request is approved.</p></div></div></Panel>;
}

function RequestHistory({ requests, accessRefreshPending }: { requests: HotelRegistrationRequest[]; accessRefreshPending: boolean }) {
  return <Panel><PanelHeader title="Request history" meta={requests.length} />{requests.length ? <div>{requests.map((request) => <RequestHistoryItem key={request.id} request={request} accessRefreshPending={accessRefreshPending} />)}</div> : <EmptyState className="px-0 py-8" icon={Building2} title="No requests submitted" description="Submit your hotel details to begin the review." />}</Panel>;
}

function RequestHistoryItem({ request, accessRefreshPending }: { request: HotelRegistrationRequest; accessRefreshPending: boolean }) {
  return <div className="min-h-11 border-t border-border-soft px-5 py-3 first:border-t-0"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{request.hotelName}</p><p className="mt-1 text-xs text-muted-foreground">Submitted {formatDate(request.submittedAt)}</p></div><StatusBadge status={request.status} /></div>{request.status === "REJECTED" ? <p className="mt-3 text-sm leading-6 text-destructive">{request.rejectionReason}</p> : null}{request.status === "APPROVED" ? <div className="mt-3"><p className="text-sm text-muted-foreground">{accessRefreshPending ? "Updating your hotel workspace access…" : request.organization?.name ?? request.property?.name ?? "Your hotel workspace is ready."}</p><Button variant="outline" className="mt-3" size="sm" disabled={accessRefreshPending} nativeButton={false} render={<Link to="/hotel" />}><CheckCircle2 />Open hotel workspace</Button></div> : null}</div>;
}

export function StatusBadge({ status }: { status: HotelRegistrationRequest["status"] }) {
  return <StatusPill tone={status === "APPROVED" ? "success" : status === "REJECTED" ? "danger" : "warning"}>{status[0] + status.slice(1).toLowerCase()}</StatusPill>;
}

function LoadingState() { return <Panel className="p-8 text-sm text-muted-foreground">Loading your registration requests…</Panel>; }
function QueryError({ onRetry }: { onRetry: () => void }) { return <Panel className="p-8"><p className="text-sm text-destructive">Your registration requests could not be loaded.</p><Button className="mt-4" variant="outline" onClick={onRetry}><RefreshCw />Try again</Button></Panel>; }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { const id = label === "Hotel name" ? "hotelName" : label === "Hotel address" ? "address" : "contactPhone"; return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label>{children}{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
