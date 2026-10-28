// After sending: the status updates on its own, shows the room and, only once
// the guest has checked out while the hotel's window is open, stop sharing.
// Mirrors check-in-stay-status.tsx on the web.
import { checkInKeys, describeGuestAccess, getGuestAccessAction, stayStatusLabel } from "@tattvix/api";
import type { CheckInContext } from "@tattvix/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, ConfirmSheet, StatusPill, colors, space, toast, type } from "@/src/design-system";
import { api } from "@/src/lib/api";
import { errorMessage } from "@/src/lib/format";

import { CheckInBrandBar, CheckInScaffold } from "./check-in-layout";

type Stay = NonNullable<CheckInContext["existingStay"]>;

export function CheckInStayStatus({
  stay,
  propertyName,
  graceHours,
  onNewVisit,
}: {
  stay: Stay;
  propertyName: string;
  graceHours: number;
  onNewVisit: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const revoke = useMutation({
    mutationFn: () => api.checkIn.revoke(stay.id),
    onSuccess: () => {
      toast("Sharing stopped");
      void queryClient.invalidateQueries({ queryKey: checkInKeys.all });
    },
    onSettled: () => setConfirming(false),
  });

  const revoked = stay.status === "REVOKED";
  const pending = stay.operationalStatus === "PENDING_CHECK_IN";
  const checkedOut = stay.operationalStatus === "CHECKED_OUT";
  const access = getGuestAccessAction(stay);
  const accessLine = describeGuestAccess(access, { graceHours });

  const title = revoked
    ? "Sharing stopped"
    : stay.room && !checkedOut
      ? `Room ${stay.room.number}`
      : pending
        ? "Sent to reception"
        : stayStatusLabel(stay.operationalStatus);
  const body = revoked
    ? `${propertyName} can no longer open your details. Reception may ask to see your ID at the desk.`
    : checkedOut
      ? "Thanks for staying. Your bill stays available in your stay."
      : stay.room
        ? `You’re checked in at ${propertyName}. Collect your key at the desk.`
        : "Show this screen at the desk. Reception is assigning your room; this page updates on its own.";

  const pillTone = revoked ? "neutral" : pending ? "warning" : stay.operationalStatus === "CHECKED_IN" ? "success" : "neutral";
  const showAccessLine = access.kind === "hidden" || access.kind === "revocable" || (access.kind === "ended" && access.reason === "expired");

  const footer = (
    <>
      <Button label="View stay and bill" onPress={() => router.push(`/(guest)/stays/${stay.id}` as Href)} />
      {checkedOut ? <Button label="Start a new visit" variant="outline" onPress={onNewVisit} /> : null}
      {access.kind === "revocable" ? (
        <Button label="Stop sharing my details" variant="ghost" loading={revoke.isPending} onPress={() => setConfirming(true)} />
      ) : null}
    </>
  );

  return (
    <CheckInScaffold header={<CheckInBrandBar />} footer={footer}>
      <View style={styles.center}>
        <Check color={revoked ? colors.mutedForeground : colors.foreground} size={40} strokeWidth={2} />
        <StatusPill tone={pillTone}>{revoked ? "Not shared" : stayStatusLabel(stay.operationalStatus)}</StatusPill>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
        {showAccessLine ? <Text style={styles.access}>{accessLine}</Text> : null}
        {revoke.isError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {errorMessage(revoke.error, "Could not stop sharing. Please try again.")}
          </Text>
        ) : null}
      </View>

      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Stop sharing with ${propertyName}?`}
        description="The hotel loses access to your details and ID straight away."
        confirmLabel="Stop sharing"
        tone="destructive"
        loading={revoke.isPending}
        onConfirm={() => revoke.mutate()}
      />
    </CheckInScaffold>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", gap: space.lg, paddingTop: space.xxxl },
  title: { ...type.pageTitle, color: colors.foreground, textAlign: "center", fontVariant: ["tabular-nums"] },
  body: { ...type.body, color: colors.mutedForeground, textAlign: "center", maxWidth: 320 },
  access: { ...type.caption, color: colors.subtleForeground, textAlign: "center", maxWidth: 320 },
  error: { ...type.meta, color: colors.destructive, textAlign: "center" },
});
