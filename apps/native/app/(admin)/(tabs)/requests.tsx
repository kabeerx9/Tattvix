// Hotel registration requests: pending ones get approved (confirm sheet) or
// rejected with a reason (sheet); approved and rejected are there to look back.
import { hotelRegistrationStatusFilters, isAlreadyReviewed } from "@tattvix/api";
import type { HotelRegistrationStatus, PlatformHotelRegistrationRequest } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { RejectRequestSheet, RequestRow } from "@/src/components/admin-requests";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { ConfirmSheet, EmptyState, Kpi, KpiRow, LargeTitle, Panel, PillTabs, Screen, colors, space, toast, type } from "@/src/design-system";
import { mutations, queries } from "@/src/lib/api";
import { errorMessage } from "@/src/lib/format";

export default function RequestsScreen() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<HotelRegistrationStatus>("PENDING");
  const [approveTarget, setApproveTarget] = useState<PlatformHotelRegistrationRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PlatformHotelRegistrationRequest | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const requestQuery = useQuery(queries.hotelRegistration.admin(status));
  const review = useMutation(mutations.hotelRegistration.review(queryClient));

  function submitReview(id: number, decision: "APPROVE" | "REJECT", rejectionReason?: string) {
    setReviewError(null);
    review.mutate(
      { id, input: { decision, rejectionReason } },
      {
        onSuccess: () => {
          setApproveTarget(null);
          setRejectTarget(null);
          toast(decision === "APPROVE" ? "Hotel request approved" : "Hotel request rejected");
        },
        onError: (error) => {
          if (isAlreadyReviewed(error)) {
            setApproveTarget(null);
            setRejectTarget(null);
            setReviewError("This request was already reviewed. The list has been refreshed.");
            void queryClient.invalidateQueries({ queryKey: queries.hotelRegistration.admin(status).queryKey });
            return;
          }
          setReviewError(errorMessage(error, "The review could not be saved."));
        },
      },
    );
  }

  if (!requestQuery.data) {
    if (requestQuery.isError) return <RetryScreen onRetry={() => void requestQuery.refetch()} retrying={requestQuery.isFetching} error={requestQuery.error} />;
    return <PendingScreen />;
  }

  const requests = requestQuery.data.requests;
  const awaiting = requests.filter((request) => request.status === "PENDING").length;

  return (
    <Screen refreshing={requestQuery.isFetching && !requestQuery.isPending} onRefresh={() => void requestQuery.refetch()}>
      <LargeTitle meta={`${requests.length} ${requests.length === 1 ? "request" : "requests"} shown`}>Hotel registration requests</LargeTitle>
      <PillTabs
        items={hotelRegistrationStatusFilters.map((filter) => ({ key: filter.value, label: filter.label }))}
        value={status}
        onChange={(key) => {
          setStatus(key as HotelRegistrationStatus);
          setReviewError(null);
        }}
      />

      <View style={styles.kpis}>
        <KpiRow>
          <Kpi label="Awaiting review" value={awaiting} />
          <Kpi label="Reviewed" value={requests.length - awaiting} />
        </KpiRow>
      </View>

      {reviewError && !rejectTarget && !approveTarget ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {reviewError}
        </Text>
      ) : null}

      <View style={styles.section}>
        {requests.length ? (
          <Panel>
            {requests.map((request) => (
              <RequestRow key={request.id} request={request} busy={review.isPending} onApprove={() => setApproveTarget(request)} onReject={() => setRejectTarget(request)} />
            ))}
          </Panel>
        ) : (
          <EmptyState icon={ClipboardList} text="No requests in this status. Choose another status to review earlier decisions." />
        )}
      </View>

      <ConfirmSheet
        open={Boolean(approveTarget)}
        onClose={() => {
          if (!review.isPending) setApproveTarget(null);
        }}
        title="Approve hotel request"
        description={approveTarget ? `Create ${approveTarget.hotelName} and give ${approveTarget.applicant.email} owner access.` : ""}
        confirmLabel="Approve"
        onConfirm={() => approveTarget && submitReview(approveTarget.id, "APPROVE")}
        loading={review.isPending && Boolean(approveTarget)}
        error={approveTarget ? (reviewError ?? undefined) : undefined}
      />
      <RejectRequestSheet
        target={rejectTarget}
        pending={review.isPending && Boolean(rejectTarget)}
        error={rejectTarget ? reviewError : null}
        onClose={() => setRejectTarget(null)}
        onSubmit={(reason) => rejectTarget && submitReview(rejectTarget.id, "REJECT", reason)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kpis: { marginTop: space.xl },
  section: { marginTop: space.xl },
  error: { ...type.caption, color: colors.destructive, marginTop: space.lg },
});
