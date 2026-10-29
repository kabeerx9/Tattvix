import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Building2 } from "lucide-react-native";
import { currentUserKeys, formatDateTime, getLatestRejectedRequest, hasPendingHotelRequest, hotelRegistrationFormFields, hotelRegistrationKeys, saveRefusalSummary, serverFieldErrors } from "@tattvix/api";
import { ApiError, hotelRegistrationInputSchema, type HotelRegistrationRequest } from "@tattvix/contracts";

import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import {
  Button,
  Card,
  EmptyState,
  LargeTitle,
  Screen,
  SecondaryHeader,
  StatusPill,
  TextField,
  TextLink,
  colors,
  space,
  toast,
  type,
} from "@/src/design-system";
import { api, queries } from "@/src/lib/api";

type Form = { hotelName: string; address: string; contactPhone: string; referralCode: string };
const emptyForm: Form = { hotelName: "", address: "", contactPhone: "", referralCode: "" };

// A guest submits their hotel for a platform admin's review and follows the
// request here. Approval creates the hotel; `me` is refetched so the new place
// shows in the switcher. Mirrors apps/web/src/features/hotel-registration.
export default function RegisterHotelScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const requests = useQuery(queries.hotelRegistration.guest());
  const submit = useMutation({
    mutationFn: api.hotelRegistration.submitRequest,
    onSuccess: () => client.invalidateQueries({ queryKey: hotelRegistrationKeys.guest() }),
    onError: (error) => {
      // 409: a request is already pending, so show it.
      if (error instanceof ApiError && error.status === 409) void client.invalidateQueries({ queryKey: hotelRegistrationKeys.guest() });
      // A refused field keeps its message until that field is edited.
      setErrors((current) => ({ ...current, ...serverFieldErrors(error, hotelRegistrationFormFields).fieldErrors }));
    },
  });
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const syncedApprovals = useRef(new Set<number>());

  const list = requests.data?.requests ?? [];
  const pending = hasPendingHotelRequest(list);
  const rejection = getLatestRejectedRequest(list);

  // Prefill once: a rejected request comes back for editing, a referral link brings its code.
  useEffect(() => {
    if (form || !requests.data) return;
    setForm({
      hotelName: rejection?.hotelName ?? "",
      address: rejection?.address ?? "",
      contactPhone: rejection?.contactPhone ?? "",
      referralCode: (ref ?? "").trim().toUpperCase(),
    });
  }, [form, ref, rejection, requests.data]);

  // An approval grants a membership: refetch `me` once per approved request.
  useEffect(() => {
    const fresh = list.filter((request) => request.status === "APPROVED" && !syncedApprovals.current.has(request.id));
    if (!fresh.length) return;
    for (const request of fresh) syncedApprovals.current.add(request.id);
    void client.invalidateQueries({ queryKey: currentUserKeys.all });
  }, [client, list]);

  if (!requests.data) {
    if (requests.isError) return <RetryScreen onRetry={() => void requests.refetch()} retrying={requests.isFetching} error={requests.error} />;
    return <PendingScreen />;
  }

  const submitError = saveRefusalSummary(submit.error, errors, hotelRegistrationFormFields, "Your registration request could not be submitted.");

  const set = (key: keyof Form) => (value: string) => {
    setForm((current) => ({ ...(current ?? emptyForm), [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function onSubmit() {
    if (!form) return;
    const parsed = hotelRegistrationInputSchema.safeParse({ ...form, referralCode: form.referralCode.trim() || undefined });
    if (!parsed.success) {
      const next: Partial<Record<keyof Form, string>> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Form] ??= issue.message;
      setErrors(next);
      return;
    }
    submit.mutate(parsed.data, {
      onSuccess: () => {
        setForm(emptyForm);
        toast("Hotel registration request submitted");
      },
    });
  }

  return (
    <Screen refreshing={requests.isRefetching} onRefresh={() => void requests.refetch()}>
      <SecondaryHeader title="Menu" onBack={() => router.back()} />
      <LargeTitle meta="Reviewed by a platform admin before access is granted" action={<TextLink label="Refresh" onPress={() => void requests.refetch()} />}>
        Register your hotel
      </LargeTitle>

      {pending ? (
        <Card style={styles.section}>
          <StatusPill tone="warning">Under review</StatusPill>
          <Text style={styles.body}>We will update this screen when a platform administrator has made a decision. Hotel workspace access is not available until the request is approved.</Text>
        </Card>
      ) : form ? (
        <View style={styles.section}>
          {rejection ? (
            <Card style={styles.card}>
              <Text style={styles.title}>Update your previous request</Text>
              <Text style={styles.error}>{rejection.rejectionReason}</Text>
            </Card>
          ) : null}
          <Card style={styles.card}>
            <Text style={styles.meta}>Use the legal business name and a contact number your team monitors.</Text>
            <TextField label="Hotel name" value={form.hotelName} onChangeText={set("hotelName")} error={errors.hotelName} maxLength={255} autoComplete="organization-title" placeholder="The Fern Jaipur" enter="next" />
            <TextField label="Hotel address" value={form.address} onChangeText={set("address")} error={errors.address} maxLength={1000} autoComplete="street-address" placeholder="123 Hospitality Road, Jaipur" enter="next" />
            <TextField label="Contact phone" value={form.contactPhone} onChangeText={set("contactPhone")} error={errors.contactPhone} maxLength={32} keyboardType="phone-pad" autoComplete="tel" placeholder="+91 98765 43210" enter="next" />
            <TextField
              label="Referral code (optional)"
              value={form.referralCode}
              onChangeText={(value) => set("referralCode")(value.toUpperCase())}
              error={errors.referralCode}
              maxLength={32}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Enter the owner's code"
              helper="Including a code lets that owner see your hotel name and registration status."
              enter={onSubmit}
            />
            {submitError ? <Text accessibilityRole="alert" style={styles.error}>{submitError}</Text> : null}
            <Button label="Submit for review" loading={submit.isPending} onPress={onSubmit} />
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.title}>Request history</Text>
        {list.length ? (
          list.map((request) => <RequestRow key={request.id} request={request} onOpen={() => router.replace("/")} />)
        ) : (
          <EmptyState icon={Building2} text="No requests submitted. Submit your hotel details to begin the review." />
        )}
      </View>
    </Screen>
  );
}

function RequestRow({ request, onOpen }: { request: HotelRegistrationRequest; onOpen: () => void }) {
  const tone = request.status === "APPROVED" ? "success" : request.status === "REJECTED" ? "destructive" : "warning";
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Text style={styles.title}>{request.hotelName}</Text>
          <Text style={styles.meta}>Submitted {formatDateTime(request.submittedAt)}</Text>
        </View>
        <StatusPill tone={tone}>{request.status[0] + request.status.slice(1).toLowerCase()}</StatusPill>
      </View>
      {request.status === "REJECTED" ? <Text style={styles.error}>{request.rejectionReason}</Text> : null}
      {request.status === "APPROVED" ? <Button label="Open hotel workspace" variant="outline" onPress={onOpen} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl, gap: space.md },
  card: { gap: space.md },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  grow: { flex: 1 },
  title: { ...type.cardTitle, color: colors.foreground },
  body: { ...type.body, color: colors.foreground },
  meta: { ...type.caption, color: colors.mutedForeground },
  error: { ...type.caption, color: colors.destructive },
});
