// Guest travel profile, read first: a teal band says how ready the guest is
// for check-in, then each section shows what is saved, and
// "Edit" opens just that section's fields in a sheet. Then the identity
// documents. Mirrors apps/web/src/features/guest-profile/components/guest-profile-page.tsx.
import {
  getProfileReadiness,
  getProfileSections,
  guestProfileKeys,
  profileSectionTitles,
  readinessLine,
  type ProfileSectionKey,
} from "@tattvix/api";
import { guestProfileInputSchema, type GuestProfileInput } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState, type ComponentProps } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { IdentityDocumentsSection } from "@/src/components/identity/IdentityDocumentsSection";
import { CountryField, DateOfBirthField } from "@/src/components/profile-fields/fields";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import {
  BandScreen,
  BottomSheet,
  Button,
  Enter,
  FactRow,
  Panel,
  ProgressRing,
  GroupTitle,
  TextField,
  TextLink,
  colors,
  radii,
  space,
  toast,
  type,
} from "@/src/design-system";
import { api, queries } from "@/src/lib/api";
import { errorMessage } from "@/src/lib/format";

type Form = Omit<GuestProfileInput, "dateOfBirth"> & { dateOfBirth: string };
type FormKey = keyof Form;

function toForm(profile: GuestProfileInput): Form {
  return { ...profile, dateOfBirth: profile.dateOfBirth ?? "" };
}

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const profile = useQuery(queries.guestProfile.detail());
  const [editing, setEditing] = useState<ProfileSectionKey | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});

  const save = useMutation({
    mutationFn: (input: GuestProfileInput) => api.guestProfile.update(input),
    onSuccess: (saved) => {
      queryClient.setQueryData(guestProfileKeys.detail(), saved);
      void queryClient.invalidateQueries({ queryKey: guestProfileKeys.detail() });
      setEditing(null);
      toast("Saved");
    },
  });

  if (!profile.data) {
    if (profile.isError) return <RetryScreen onRetry={() => void profile.refetch()} retrying={profile.isFetching} error={profile.error} />;
    return <PendingScreen />;
  }

  // Each sheet starts from the saved copy, so a cancelled edit leaves nothing behind.
  function openEditor(section: ProfileSectionKey) {
    setForm(toForm(profile.data!.profile));
    setErrors({});
    save.reset();
    setEditing(section);
  }

  function submit() {
    if (!form) return;
    const parsed = guestProfileInputSchema.safeParse({ ...form, dateOfBirth: form.dateOfBirth.trim() || null });
    if (!parsed.success) {
      const next: Partial<Record<FormKey, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FormKey | undefined;
        if (key) next[key] ??= key === "dateOfBirth" ? "Choose a date in the past." : issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  }

  const readiness = getProfileReadiness(profile.data.readiness.missingFields);
  const sections = getProfileSections(profile.data.profile);

  return (
    <BandScreen
      title="Profile"
      meta="What a hotel gets when you check in"
      action={<TextLink light label="Getting started" onPress={() => router.push("/(guest)/getting-started" as Href)} />}
      summary={{ leading: <ProgressRing done={readiness.completed} total={readiness.total} />, ...readinessLine(readiness) }}
      refreshing={profile.isFetching && !profile.isPending}
      onRefresh={() => void profile.refetch()}
    >
      {onboarding === "identity" ? <Text style={[styles.meta, styles.note]}>Next: add a government ID under Identity documents below.</Text> : null}

      {sections.map((section, index) => (
        <Enter key={section.key} index={index + 1} style={styles.section}>
          <GroupTitle action={<TextLink label={section.facts.every((fact) => fact.value === null) ? "Add" : "Edit"} onPress={() => openEditor(section.key)} />}>{section.title}</GroupTitle>
          <Panel>
            {section.facts.map((fact) => (
              <FactRow key={fact.label} label={fact.label} value={fact.value} icon={fact.icon} />
            ))}
          </Panel>
        </Enter>
      ))}

      <Enter index={sections.length + 1} style={styles.section}>
        <IdentityDocumentsSection />
      </Enter>

      <EditSheet
        section={editing}
        form={form}
        errors={errors}
        saving={save.isPending}
        saveError={save.error ? errorMessage(save.error, "Your profile could not be saved.") : null}
        onChange={(key, value) => {
          setForm((current) => (current ? { ...current, [key]: value } : current));
          setErrors((current) => ({ ...current, [key]: undefined }));
        }}
        onSave={submit}
        onClose={() => {
          if (!save.isPending) setEditing(null);
        }}
      />
    </BandScreen>
  );
}

function EditSheet({
  section,
  form,
  errors,
  saving,
  saveError,
  onChange,
  onSave,
  onClose,
}: {
  section: ProfileSectionKey | null;
  form: Form | null;
  errors: Partial<Record<FormKey, string>>;
  saving: boolean;
  saveError: string | null;
  onChange: (key: FormKey, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { height } = useWindowDimensions();
  const text = (key: FormKey, label: string, extra: Partial<ComponentProps<typeof TextField>> = {}) =>
    form ? <TextField label={label} value={form[key]} onChangeText={(value) => onChange(key, value)} error={errors[key]} {...extra} /> : null;

  return (
    <BottomSheet
      open={section !== null}
      onClose={onClose}
      title={section ? profileSectionTitles[section] : undefined}
      dragHandleOnly
      footer={
        <>
          {saveError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {saveError}
            </Text>
          ) : null}
          <Button label="Save" onPress={onSave} loading={saving} />
        </>
      }
    >
      {form ? (
        <ScrollView style={{ maxHeight: height * 0.6 }} contentContainerStyle={styles.fields} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {section === "personal" ? (
            <>
              {text("legalFirstName", "Legal first name", { maxLength: 150, autoComplete: "given-name" })}
              {text("legalLastName", "Legal last name", { maxLength: 150, autoComplete: "family-name", helper: "With a single legal name, repeat it here." })}
              {text("phoneNumber", "Phone number", { maxLength: 32, keyboardType: "phone-pad", placeholder: "+91 98765 43210" })}
              <DateOfBirthField label="Date of birth" value={form.dateOfBirth || null} error={errors.dateOfBirth} onChange={(value) => onChange("dateOfBirth", value ?? "")} />
              <CountryField label="Nationality" value={form.nationality} error={errors.nationality} onChange={(value) => onChange("nationality", value)} />
            </>
          ) : section === "address" ? (
            <>
              {text("addressLine1", "Address line 1", { maxLength: 255, autoComplete: "street-address" })}
              {text("addressLine2", "Address line 2", { maxLength: 255 })}
              {text("city", "City", { maxLength: 120 })}
              {text("stateRegion", "State or region", { maxLength: 120 })}
              {text("postalCode", "Postal code", { maxLength: 20, autoComplete: "postal-code" })}
              <CountryField label="Country" value={form.country} error={errors.country} onChange={(value) => onChange("country", value)} />
            </>
          ) : (
            <>
              {text("emergencyContactName", "Contact name", { maxLength: 150 })}
              {text("emergencyContactPhone", "Contact phone", { maxLength: 32, keyboardType: "phone-pad" })}
            </>
          )}
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: space.lg },
  section: { marginTop: space.xl, gap: space.md },
  meta: { ...type.meta, color: colors.mutedForeground },
  fields: { gap: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  error: { ...type.caption, color: colors.destructive },
});
