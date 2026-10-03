import {
  hotelRegistrationReviewInputSchema,
  type HotelRegistrationStatus,
  type PlatformHotelRegistrationRequest,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@tattvix/ui/components/sheet";
import { Textarea } from "@tattvix/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RefreshCw, X, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader, Panel, PanelHeader, KpiStrip, Kpi } from "@/components/design-system";
import { getInitials } from "@/lib/initials";
import { ApiError } from "@/lib/api";

import { StatusBadge } from "./hotel-registration-page";
import { hotelRegistrationMutations } from "../mutations";
import { hotelRegistrationQueries } from "../queries";

const statusFilters: { value: HotelRegistrationStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export function HotelRegistrationRequestsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<HotelRegistrationStatus>("PENDING");
  const [rejectionTarget, setRejectionTarget] = useState<PlatformHotelRegistrationRequest | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const requestQuery = useQuery(hotelRegistrationQueries.admin(status));
  const reviewMutation = useMutation(hotelRegistrationMutations.review(queryClient));

  function review(id: number, decision: "APPROVE" | "REJECT", rejectionReason?: string) {
    setReviewingId(id);
    setReviewError(null);
    reviewMutation.mutate({ id, input: { decision, rejectionReason } }, {
      onSuccess: () => {
        setRejectionTarget(null);
        toast.success(decision === "APPROVE" ? "Hotel request approved" : "Hotel request rejected");
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          setReviewError("This request was already reviewed. The list has been refreshed.");
          void queryClient.invalidateQueries({ queryKey: hotelRegistrationQueries.admin(status).queryKey });
          return;
        }
        setReviewError(error instanceof ApiError ? error.message : "The review could not be saved.");
      },
      onSettled: () => setReviewingId(null),
    });
  }

  return <div className="mx-auto grid max-w-[1400px] gap-6">
    <PageHeader
      title="Hotel registration requests"
      actions={<Button variant="outline" onClick={() => requestQuery.refetch()} disabled={requestQuery.isFetching}><RefreshCw className={requestQuery.isFetching ? "animate-spin" : undefined} />Refresh</Button>}
    />
    <div className="flex flex-wrap gap-2" aria-label="Request status filter">
      {statusFilters.map((filter) => <Button key={filter.value} size="sm" variant={status === filter.value ? "secondary" : "outline"} onClick={() => { setStatus(filter.value); setReviewError(null); }}>{filter.label}</Button>)}
    </div>
    {requestQuery.data ? <KpiStrip><Kpi icon={RefreshCw} label="Requests shown" value={requestQuery.data.requests.length} /><Kpi icon={Clock3} label="Awaiting review" value={requestQuery.data.requests.filter((request) => request.status === "PENDING").length} /><Kpi icon={Check} label="Reviewed" value={requestQuery.data.requests.filter((request) => request.status !== "PENDING").length} /></KpiStrip> : null}
    {reviewError ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{reviewError}</p> : null}
    {requestQuery.isPending ? <Panel className="p-8 text-sm text-muted-foreground">Loading registration requests…</Panel> : null}
    {requestQuery.isError ? <Panel className="p-8"><p className="text-sm text-destructive">Registration requests could not be loaded.</p><Button className="mt-4" variant="outline" onClick={() => requestQuery.refetch()}><RefreshCw />Try again</Button></Panel> : null}
    {requestQuery.data ? <RequestList requests={requestQuery.data.requests} onApprove={(id) => review(id, "APPROVE")} onReject={setRejectionTarget} reviewingId={reviewingId} /> : null}
    <RejectRequestSheet target={rejectionTarget} pending={reviewingId === rejectionTarget?.id} error={reviewError} onOpenChange={(open) => { if (!open && reviewingId === null) setRejectionTarget(null); }} onSubmit={(reason) => rejectionTarget && review(rejectionTarget.id, "REJECT", reason)} />
  </div>;
}

function RequestList({ requests, onApprove, onReject, reviewingId }: {
  requests: PlatformHotelRegistrationRequest[];
  onApprove: (id: number) => void;
  onReject: (request: PlatformHotelRegistrationRequest) => void;
  reviewingId: number | null;
}) {
  if (!requests.length) return <Panel><EmptyState icon={RefreshCw} title="No requests in this status" description="Choose another status to review earlier decisions." /></Panel>;
  return <Panel><PanelHeader title="Requests" meta={requests.length} />{requests.map((request) => <div key={request.id} className="group grid min-h-11 gap-3 border-t border-border-soft px-5 py-3 first:border-t-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-center">
    <div className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{getInitials([request.applicant.firstName, request.applicant.lastName].filter(Boolean).join(" ") || request.applicant.email)}</span><div className="min-w-0"><p className="text-sm font-medium">{[request.applicant.firstName, request.applicant.lastName].filter(Boolean).join(" ") || "Unnamed applicant"}</p><p className="mt-1 break-words text-xs text-subtle-foreground">{request.applicant.email}</p><p className="mt-1 text-xs text-subtle-foreground tabular-nums">Submitted {formatDateTime(request.submittedAt)}</p></div></div>
    <div><p className="text-sm font-medium">{request.hotelName}</p><p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{request.address}</p><p className="mt-1 text-xs text-subtle-foreground">{request.contactPhone}</p>{request.rejectionReason ? <p className="mt-2 text-xs text-destructive">{request.rejectionReason}</p> : null}</div>
    <div className="grid justify-items-start gap-2 md:justify-items-end"><StatusBadge status={request.status} />{request.status === "PENDING" ? <div className="flex flex-wrap gap-2 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"><Button size="sm" variant="outline" disabled={reviewingId !== null} onClick={() => onReject(request)}><X />Reject</Button><Button size="sm" variant="outline" disabled={reviewingId !== null} onClick={() => onApprove(request.id)}>{reviewingId === request.id ? "Reviewing..." : <><Check />Approve</>}</Button></div> : <span className="text-xs text-subtle-foreground tabular-nums">Reviewed {request.reviewedAt ? formatDateTime(request.reviewedAt) : ""}</span>}</div>
  </div>)}</Panel>;
}

function RejectRequestSheet({ target, pending, error, onOpenChange, onSubmit }: {
  target: PlatformHotelRegistrationRequest | null;
  pending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
}) {
  const [fieldError, setFieldError] = useState<string | null>(null);
  useEffect(() => setFieldError(null), [target?.id]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get("rejectionReason");
    const parsed = hotelRegistrationReviewInputSchema.safeParse({ decision: "REJECT", rejectionReason: reason });
    if (!parsed.success) { setFieldError(parsed.error.issues[0]?.message ?? "Add a rejection reason."); return; }
    setFieldError(null);
    onSubmit(parsed.data.rejectionReason!);
  }
  return <Sheet open={Boolean(target)} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><form key={target?.id ?? "none"} className="flex min-h-full flex-col" onSubmit={submit}><SheetHeader><SheetTitle>Reject hotel request</SheetTitle><SheetDescription>Explain what the applicant needs to correct before submitting again.</SheetDescription></SheetHeader><div className="grid gap-4 p-4 pt-2"><div className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">{target?.hotelName}</p><p className="mt-1 text-xs text-muted-foreground">{target?.applicant.email}</p></div><div className="grid gap-2"><Label htmlFor="rejectionReason">Reason for rejection</Label><Textarea id="rejectionReason" name="rejectionReason" required maxLength={1000} aria-invalid={Boolean(fieldError)} placeholder="For example, please provide the legal hotel name and a monitored contact number." />{fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}</div>{error ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}</div><SheetFooter className="mt-auto border-t"><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Rejecting..." : "Reject request"}</Button></SheetFooter></form></SheetContent></Sheet>;
}

function formatDateTime(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
