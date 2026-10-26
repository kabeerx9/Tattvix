// Guest travel profile: personal details, home address and emergency contact,
// then the identity documents. Mirrors
// apps/web/src/features/guest-profile/components/guest-profile-page.tsx.
import { guestProfileKeys } from "@tattvix/api";
import { guestProfileInputSchema, type GuestProfileInput, type GuestProfileMissingField } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { IdentityDocumentsSection } from "@/src/components/identity/IdentityDocumentsSection";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { Button, Card, LargeTitle, Screen, SectionTitle, StatusPill, TextField, TextLink, colors, space, toast, type } from "@/src/design-system";
import { api, queries } from "@/src/lib/api";
import { errorMessage } from "@/src/lib/format";

type Form = Omit<GuestProfileInput, "dateOfBirth"> & { dateOfBirth: string };
type FormKey = keyof Form;

const missingFieldLabels: Record<GuestProfileMissingField, string> = {
  legalFirstName: "Legal first name",
  legalLastName: "Legal last name",
  phoneNumber: "Phone number",
  dateOfBirth: "Date of birth",
  nationality: "Nationality",
  addressLine1: "Address line 1",
  city: "City",
  stateRegion: "State or region",
  postalCode: "Postal code",
  country: "Country",
  identityDocuments: "Government identity document",
};

const requiredFieldCount = Object.keys(missingFieldLabels).length;

function toForm(profile: GuestProfileInput): Form {
  return { ...profile, dateOfBirth: profile.dateOfBirth ?? "" };
}

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const profile = useQuery(queries.guestProfile.detail());
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});

  // Seed the form once from the server copy. Later refetches (for example after a
  // document is added) must not overwrite what the person is typing.
  useEffect(() => {
    if (profile.data && form === null) setForm(toForm(profile.data.profile));
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: (input: GuestProfileInput) => api.guestProfile.update(input),
    onSuccess: (saved) => {
      setForm(toForm(saved.profile));
      void queryClient.invalidateQueries({ queryKey: guestProfileKeys.detail() });
      toast("Profile saved");
    },
  });

  if (!profile.data || !form) {
    if (profile.isError) return <RetryScreen onRetry={() => void profile.refetch()} retrying={profile.isFetching} />;
    return <PendingScreen />;
  }

  const set = (key: FormKey) => (value: string) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function submit() {
    if (!form) return;
    const parsed = guestProfileInputSchema.safeParse({ ...form, dateOfBirth: form.dateOfBirth.trim() || null });
    if (!parsed.success) {
      const next: Partial<Record<FormKey, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FormKey | undefined;
        if (key) next[key] ??= key === "dateOfBirth" ? "Use a date as YYYY-MM-DD, in the past." : issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  }

  const missing = profile.data.readiness.missingFields;
  const completed = requiredFieldCount - missing.length;
  const percentage = Math.round((completed / requiredFieldCount) * 100);
  const saveError = save.error ? errorMessage(save.error, "Your profile could not be saved.") : null;

  // Shared field wiring: every field is text, and the error from the last submit shows under it.
  const text = (key: FormKey, label: string, extra: Partial<ComponentProps<typeof TextField>> = {}) => (
    <TextField label={label} value={form![key]} onChangeText={set(key)} error={errors[key]} {...extra} />
  );

  return (
    <Screen refreshing={profile.isFetching && !profile.isPending} onRefresh={() => void profile.refetch()}>
      <LargeTitle meta="Keep the essentials ready and choose what is shared at check-in." action={<TextLink label="Getting started" onPress={() => router.push("/(guest)/getting-started" as Href)} />}>Profile</LargeTitle>

      {onboarding === "identity" ? <View style={styles.identityNote}><Text style={styles.meta}>Your next task is in Identity documents below. Add a government ID and its required photos.</Text></View> : null}

      <View style={styles.readiness}>
        <Card>
          <Text style={styles.readinessValue}>{percentage}%</Text>
          <Text style={styles.meta}>
            {completed} of {requiredFieldCount} requirements
          </Text>
          {missing.length ? (
            <View style={styles.missing}>
              <Text style={styles.label}>Still needed</Text>
              {missing.map((field) => (
                <Text key={field} style={styles.missingItem}>
                  {missingFieldLabels[field]}
                </Text>
              ))}
            </View>
          ) : (
            <View style={styles.missing}>
              <StatusPill tone="success">Ready for check-in</StatusPill>
            </View>
          )}
          <Text style={styles.caption}>A complete government identity document is required for full readiness.</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Personal details</SectionTitle>
        {text("legalFirstName", "Legal first name", { maxLength: 150, autoComplete: "given-name" })}
        {text("legalLastName", "Legal last name", { maxLength: 150, autoComplete: "family-name", helper: "For a single legal name, repeat the documented name." })}
        {text("phoneNumber", "Phone number", { maxLength: 32, keyboardType: "phone-pad", placeholder: "+91 98765 43210" })}
        {text("dateOfBirth", "Date of birth", {
          placeholder: "YYYY-MM-DD",
          helper: "YYYY-MM-DD",
          keyboardType: "numbers-and-punctuation",
          autoCapitalize: "none",
          maxLength: 10,
        })}
        {text("nationality", "Nationality", {
          maxLength: 2,
          autoCapitalize: "characters",
          placeholder: "IN",
          helper: "Two-letter country code, such as IN.",
        })}
      </View>

      <View style={styles.section}>
        <SectionTitle>Home address</SectionTitle>
        {text("addressLine1", "Address line 1", { maxLength: 255, autoComplete: "street-address" })}
        {text("addressLine2", "Address line 2", { maxLength: 255 })}
        {text("city", "City", { maxLength: 120 })}
        {text("stateRegion", "State or region", { maxLength: 120 })}
        {text("postalCode", "Postal code", { maxLength: 20, autoComplete: "postal-code" })}
        {text("country", "Country", {
          maxLength: 2,
          autoCapitalize: "characters",
          placeholder: "IN",
          helper: "Two-letter country code, such as IN.",
        })}
      </View>

      <View style={styles.section}>
        <SectionTitle>Emergency contact</SectionTitle>
        {text("emergencyContactName", "Contact name", { maxLength: 150 })}
        {text("emergencyContactPhone", "Contact phone", { maxLength: 32, keyboardType: "phone-pad" })}
      </View>

      {saveError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {saveError}
        </Text>
      ) : null}
      <View style={styles.save}>
        <Button label="Save profile" onPress={submit} loading={save.isPending} />
      </View>

      <View style={styles.section}>
        <IdentityDocumentsSection />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  readiness: { marginTop: space.xl },
  identityNote: { marginTop: space.lg },
  readinessValue: { ...type.kpiValue, color: colors.foreground, fontVariant: ["tabular-nums"] },
  meta: { ...type.meta, color: colors.mutedForeground },
  label: { ...type.label, color: colors.subtleForeground },
  missing: { marginTop: space.md, gap: space.xs },
  missingItem: { ...type.caption, color: colors.mutedForeground },
  caption: { ...type.caption, color: colors.mutedForeground, marginTop: space.md },
  section: { marginTop: space.xxxl, gap: space.lg },
  save: { marginTop: space.xl },
  error: { ...type.caption, color: colors.destructive, marginTop: space.lg },
});
