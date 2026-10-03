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
import { Check, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader, Surface } from "@/components/design-system";
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

  return <div className="mx-auto grid max-w-[1400px] gap-7">
    <PageHeader
      eyebrow="Platform administration"
      title="Hotel registration requests"
      description="Review ownership requests before creating hotel workspace access."
      action={<Button variant="outline" onClick={() => requestQuery.refetch()} disabled={requestQuery.isFetching}><RefreshCw className={requestQuery.isFetching ? "animate-spin" : undefined} />Refresh</Button>}
    />
    <div className="flex flex-wrap gap-2" aria-label="Request status filter">
      {statusFilters.map((filter) => <Button key={filter.value} size="sm" variant={status === filter.value ? "default" : "outline"} onClick={() => { setStatus(filter.value); setReviewError(null); }}>{filter.label}</Button>)}
    </div>
    {reviewError ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{reviewError}</p> : null}
    {requestQuery.isPending ? <Surface className="p-8 text-sm text-muted-foreground">Loading registration requests…</Surface> : null}
    {requestQuery.isError ? <Surface className="p-8"><p className="text-sm text-destructive">Registration requests could not be loaded.</p><Button className="mt-4" variant="outline" onClick={() => requestQuery.refetch()}><RefreshCw />Try again</Button></Surface> : null}
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
  if (!requests.length) return <Surface><EmptyState icon={RefreshCw} title="No requests in this status" description="Choose another status to review earlier decisions." /></Surface>;
  return <Surface className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-muted/60 text-xs text-muted-foreground"><tr><th className="p-4 font-medium sm:p-5">Applicant</th><th className="p-4 font-medium sm:p-5">Hotel details</th><th className="p-4 font-medium sm:p-5">Submitted</th><th className="p-4 font-medium sm:p-5">Status</th><th className="p-4 font-medium text-right sm:p-5">Review</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id} className="border-b last:border-0"><td className="p-4 align-top sm:p-5"><p className="font-medium">{[request.applicant.firstName, request.applicant.lastName].filter(Boolean).join(" ") || "Unnamed applicant"}</p><p className="mt-1 text-xs text-muted-foreground">{request.applicant.email}</p></td><td className="p-4 align-top sm:p-5"><p className="font-medium">{request.hotelName}</p><p className="mt-1 max-w-sm whitespace-pre-line text-xs leading-5 text-muted-foreground">{request.address}</p><p className="mt-1 text-xs text-muted-foreground">{request.contactPhone}</p>{request.rejectionReason ? <p className="mt-2 text-xs text-destructive">{request.rejectionReason}</p> : null}</td><td className="p-4 align-top text-xs text-muted-foreground sm:p-5">{formatDateTime(request.submittedAt)}</td><td className="p-4 align-top sm:p-5"><StatusBadge status={request.status} /></td><td className="p-4 align-top text-right sm:p-5">{request.status === "PENDING" ? <div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={reviewingId !== null} onClick={() => onReject(request)}><X />Reject</Button><Button size="sm" disabled={reviewingId !== null} onClick={() => onApprove(request.id)}>{reviewingId === request.id ? "Reviewing..." : <><Check />Approve</>}</Button></div> : <span className="text-xs text-muted-foreground">Reviewed {request.reviewedAt ? formatDateTime(request.reviewedAt) : ""}</span>}</td></tr>)}</tbody></table></div></Surface>;
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
  return <Sheet open={Boolean(target)} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><form key={target?.id ?? "none"} className="flex min-h-full flex-col" onSubmit={submit}><SheetHeader><SheetTitle>Reject hotel request</SheetTitle><SheetDescription>Explain what the applicant needs to correct before submitting again.</SheetDescription></SheetHeader><div className="grid gap-4 p-4 pt-2"><div className="rounded-xl bg-muted/60 p-3 text-sm"><p className="font-medium">{target?.hotelName}</p><p className="mt-1 text-xs text-muted-foreground">{target?.applicant.email}</p></div><div className="grid gap-2"><Label htmlFor="rejectionReason">Reason for rejection</Label><Textarea id="rejectionReason" name="rejectionReason" required maxLength={1000} aria-invalid={Boolean(fieldError)} placeholder="For example, please provide the legal hotel name and a monitored contact number." />{fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}</div>{error ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}</div><SheetFooter className="mt-auto border-t"><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Rejecting..." : "Reject request"}</Button></SheetFooter></form></SheetContent></Sheet>;
}

function formatDateTime(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
