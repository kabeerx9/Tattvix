import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  buildReferralLink,
  classifyApiError,
  createReferralCodeMutation,
  createReferralsApi,
  referralDashboardQuery,
} from "@tattvix/api";
import { Button } from "@tattvix/ui/components/button";
import {
  PageHeader,
  Panel,
  PanelHeader,
  PanelSection,
  KpiStrip,
  Kpi,
  StatusPill,
  EmptyState,
} from "@/components/design-system";
import { UsersRound } from "lucide-react";
import { apiClient } from "@/lib/api";
const api = createReferralsApi(apiClient);
export function ReferralsPage({ ownerId }: { ownerId: number }) {
  const client = useQueryClient();
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const [copyMessage, setCopyMessage] = useState("");
  const query = useQuery({
    ...referralDashboardQuery(api, ownerId, cursors[cursors.length - 1]),
  });
  const create = useMutation(createReferralCodeMutation(api, client, ownerId));
  const data = query.data;
  const link = data?.code
    ? buildReferralLink(window.location.origin, data.code)
    : "";
  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <PageHeader
        title="Referrals"
        meta="Hotel registrations made with your code"
        actions={
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh
          </Button>
        }
      />
      {query.isPending ? (
        <Panel>
          <PanelSection>
            <p role="status">Loading referrals...</p>
          </PanelSection>
        </Panel>
      ) : query.isError ? (
        <Panel>
          <PanelSection>
            <p role="alert">{classifyApiError(query.error).message}</p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </PanelSection>
        </Panel>
      ) : data ? (
        <>
          <Panel>
            <PanelHeader title="Invite a hotel owner" />
            <PanelSection className="grid justify-items-start gap-4">
              <p className="text-sm text-muted-foreground">
                Share your link or code. The owner can include it when
                registering their hotel.
              </p>
              {data.code ? (
                <>
                  <p
                    className="font-mono text-xl font-semibold tracking-wider"
                    aria-label={`Referral code ${data.code}`}
                  >
                    {data.code}
                  </p>
                  <p
                    className="max-w-full break-all text-sm text-muted-foreground"
                    aria-label="Referral link"
                  >
                    {link}
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(link);
                        setCopyMessage("Referral link copied.");
                      } catch {
                        setCopyMessage(
                          "Could not copy the link. Select it above to copy.",
                        );
                      }
                    }}
                  >
                    Copy referral link
                  </Button>
                  {copyMessage ? (
                    <p role="status" className="text-sm text-muted-foreground">
                      {copyMessage}
                    </p>
                  ) : null}
                </>
              ) : (
                <Button
                  disabled={create.isPending}
                  onClick={() => create.mutate()}
                >
                  {create.isPending ? "Creating..." : "Create referral link"}
                </Button>
              )}
              {create.isError ? (
                <p role="alert" className="text-sm text-destructive">
                  {classifyApiError(create.error).message}
                </p>
              ) : null}
            </PanelSection>
          </Panel>
          <KpiStrip>
            <Kpi label="Registrations" value={data.summary.total} />
            <Kpi label="Pending" value={data.summary.pending} />
            <Kpi label="Approved" value={data.summary.approved} />
            <Kpi label="Rejected" value={data.summary.rejected} />
          </KpiStrip>
          <Panel>
            <PanelHeader title="Referred registrations" />
            {data.registrations.length ? (
              data.registrations.map((item) => (
                <PanelSection key={item.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium wrap-anywhere">
                        {item.hotelName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted{" "}
                        {new Date(item.submittedAt).toLocaleDateString()}
                        {item.reviewedAt
                          ? ` · Reviewed ${new Date(item.reviewedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <StatusPill
                      tone={
                        item.status === "APPROVED"
                          ? "success"
                          : item.status === "PENDING"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {item.status === "APPROVED"
                        ? "Approved"
                        : item.status === "PENDING"
                          ? "Pending"
                          : "Rejected"}
                    </StatusPill>
                  </div>
                </PanelSection>
              ))
            ) : (
              <EmptyState
                icon={UsersRound}
                title="No referred registrations yet"
                description="Registrations made using your code will appear here."
              />
            )}
          </Panel>
          {cursors.length > 1 || data.nextCursor !== null ? (
            <div className="flex justify-between gap-3">
              <Button
                variant="outline"
                disabled={cursors.length === 1 || query.isFetching}
                onClick={() => setCursors(cursors.slice(0, -1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={data.nextCursor === null || query.isFetching}
                onClick={() =>
                  data.nextCursor !== null &&
                  setCursors([...cursors, data.nextCursor])
                }
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
