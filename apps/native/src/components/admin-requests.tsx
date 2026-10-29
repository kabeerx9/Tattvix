// Hotel registration requests for the platform admin: one row per request
// with approve / reject on the pending ones, and the reject-with-reason sheet.
import { applicantName } from "@tattvix/api";
import { hotelRegistrationReviewInputSchema, type PlatformHotelRegistrationRequest } from "@tattvix/contracts";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, InitialsAvatar, StatusPill, TextField, colors, space, type } from "@/src/design-system";
import { formatDateTime, initialsOf } from "@/src/lib/format";

export function RequestStatusPill({ status }: { status: PlatformHotelRegistrationRequest["status"] }) {
  if (status === "APPROVED") return <StatusPill tone="success">Approved</StatusPill>;
  if (status === "REJECTED") return <StatusPill tone="destructive">Rejected</StatusPill>;
  return <StatusPill tone="warning">Pending</StatusPill>;
}

export function RequestRow({
  request,
  busy,
  onApprove,
  onReject,
}: {
  request: PlatformHotelRegistrationRequest;
  /** Another review is in flight: both actions wait for it. */
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const name = applicantName(request);
  return (
    <View style={styles.row}>
      <View style={styles.applicant}>
        <InitialsAvatar initials={initialsOf(name === "Unnamed applicant" ? request.applicant.email : name)} name={request.applicant.email} size={40} />
        <View style={styles.copy}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.caption}>{request.applicant.email}</Text>
          <Text style={styles.captionNumeric}>Submitted {formatDateTime(request.submittedAt)}</Text>
        </View>
        <RequestStatusPill status={request.status} />
      </View>
      <View style={styles.hotel}>
        <Text style={styles.title}>{request.hotelName}</Text>
        <Text style={styles.meta}>{request.address}</Text>
        <Text style={styles.captionNumeric}>{request.contactPhone}</Text>
        {request.rejectionReason ? <Text style={styles.reason}>{request.rejectionReason}</Text> : null}
      </View>
      {request.status === "PENDING" ? (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button label="Reject" variant="outline" size="sm" disabled={busy} onPress={onReject} />
          </View>
          <View style={styles.action}>
            <Button label="Approve" variant="outline" size="sm" disabled={busy} onPress={onApprove} />
          </View>
        </View>
      ) : (
        <Text style={styles.captionNumeric}>Reviewed {request.reviewedAt ? formatDateTime(request.reviewedAt) : ""}</Text>
      )}
    </View>
  );
}

export function RejectRequestSheet({
  target,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  target: PlatformHotelRegistrationRequest | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  useEffect(() => {
    setReason("");
    setFieldError(null);
  }, [target?.id]);

  function submit() {
    const parsed = hotelRegistrationReviewInputSchema.safeParse({ decision: "REJECT", rejectionReason: reason });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Add a rejection reason.");
      return;
    }
    setFieldError(null);
    onSubmit(parsed.data.rejectionReason!);
  }

  return (
    <BottomSheet
      open={Boolean(target)}
      onClose={() => {
        if (!pending) onClose();
      }}
      title="Reject hotel request"
      footer={
        <>
          <Button label="Reject request" variant="destructive" onPress={submit} loading={pending} />
          <Button label="Cancel" variant="ghost" onPress={onClose} disabled={pending} />
        </>
      }
    >
      <Text style={styles.description}>Explain what the applicant needs to correct before submitting again.</Text>
      <View style={styles.summary}>
        <Text style={styles.title}>{target?.hotelName}</Text>
        <Text style={styles.caption}>{target?.applicant.email}</Text>
      </View>
      <TextField
        label="Reason for rejection"
        value={reason}
        onChangeText={setReason}
        error={fieldError ?? undefined}
        multiline
        maxLength={1000}
        placeholder="For example, please provide the legal hotel name and a monitored contact number."
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md },
  applicant: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  copy: { flex: 1, gap: 2 },
  hotel: { gap: 2 },
  title: { ...type.rowTitle, color: colors.foreground },
  meta: { ...type.caption, color: colors.mutedForeground },
  caption: { ...type.caption, color: colors.subtleForeground },
  captionNumeric: { ...type.caption, color: colors.subtleForeground, fontVariant: ["tabular-nums"] },
  reason: { ...type.caption, color: colors.destructive, marginTop: space.xs },
  actions: { flexDirection: "row", gap: space.sm },
  action: { flex: 1 },
  description: { ...type.body, color: colors.mutedForeground, marginBottom: space.md },
  summary: { backgroundColor: colors.muted, borderRadius: 10, padding: space.md, gap: 2, marginBottom: space.lg },
  error: { ...type.caption, color: colors.destructive, marginTop: space.sm },
});
