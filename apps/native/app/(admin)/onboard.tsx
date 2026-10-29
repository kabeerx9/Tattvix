// Onboard a hotel: the organization, its first property and an existing
// account as the initial owner, in one submit. Lands on the new organization.
import { platformOrganizationOnboardingInputSchema, type PlatformUserSearchResult } from "@tattvix/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { organizationHref } from "@/src/components/admin-portfolio";
import { UserEmailPicker } from "@/src/components/admin-user-picker";
import { Button, GroupTitle, LargeTitle, Screen, SecondaryHeader, TextField, colors, space, toast, type } from "@/src/design-system";
import { mutations } from "@/src/lib/api";
import { errorMessage } from "@/src/lib/format";

type Form = { organizationName: string; organizationSlug: string; propertyName: string; propertySlug: string };
const emptyForm: Form = { organizationName: "", organizationSlug: "", propertyName: "", propertySlug: "" };

// Zod issue paths ("organization.name") to the field they belong to.
const fieldByPath: Record<string, keyof Form | "ownerEmail"> = {
  "organization.name": "organizationName",
  "organization.slug": "organizationSlug",
  "property.name": "propertyName",
  "property.slug": "propertySlug",
  ownerEmail: "ownerEmail",
};

export default function OnboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const onboard = useMutation(mutations.platformOrganizations.onboard(queryClient));
  const [form, setForm] = useState<Form>(emptyForm);
  const [owner, setOwner] = useState<PlatformUserSearchResult | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form | "ownerEmail", string>>>({});
  const set = (key: keyof Form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  function submit() {
    const parsed = platformOrganizationOnboardingInputSchema.safeParse({
      organization: { name: form.organizationName, slug: form.organizationSlug },
      property: { name: form.propertyName, slug: form.propertySlug },
      ownerEmail: owner?.email,
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const field = fieldByPath[issue.path.join(".")];
        if (field) next[field] ??= issue.message;
      }
      if (!owner) next.ownerEmail = "Select an existing user account.";
      setErrors(next);
      return;
    }
    setErrors({});
    onboard.mutate(parsed.data, {
      onSuccess: (created) => {
        toast("Hotel onboarding completed successfully.");
        setForm(emptyForm);
        setOwner(null);
        router.replace(organizationHref(created.organization.slug));
      },
    });
  }

  const submitError = errorMessage(onboard.error, "The organization could not be created.");

  return (
    <Screen>
      <SecondaryHeader title="Onboard a hotel" onBack={() => router.back()} />
      <LargeTitle>Onboard a hotel</LargeTitle>

      <View style={styles.section}>
        <GroupTitle>Organization</GroupTitle>
        <Text style={styles.hint}>The hotel business or ownership group.</Text>
        <TextField label="Organization name" value={form.organizationName} onChangeText={set("organizationName")} error={errors.organizationName} maxLength={255} autoComplete="organization" placeholder="Example Hotels" enter="next" />
        <TextField label="Organization slug" value={form.organizationSlug} onChangeText={set("organizationSlug")} error={errors.organizationSlug} maxLength={255} autoCapitalize="none" autoCorrect={false} placeholder="example-hotels" enter="next" />
      </View>

      <View style={styles.section}>
        <GroupTitle>First property</GroupTitle>
        <Text style={styles.hint}>The first physical hotel operated by this organization.</Text>
        <TextField label="Property name" value={form.propertyName} onChangeText={set("propertyName")} error={errors.propertyName} maxLength={255} placeholder="Example Jaipur" enter="next" />
        <TextField label="Property slug" value={form.propertySlug} onChangeText={set("propertySlug")} error={errors.propertySlug} maxLength={255} autoCapitalize="none" autoCorrect={false} placeholder="jaipur" enter="done" />
      </View>

      <View style={styles.section}>
        <GroupTitle>Initial owner</GroupTitle>
        <Text style={styles.hint}>Search for and select an existing account. Free-form emails cannot be submitted.</Text>
        <UserEmailPicker
          label="Owner account"
          value={owner}
          onChange={(user) => {
            setOwner(user);
            if (user) setErrors((current) => ({ ...current, ownerEmail: undefined }));
          }}
          error={errors.ownerEmail}
        />
      </View>

      <View style={styles.submit}>
        {submitError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {submitError}
          </Text>
        ) : null}
        <Button label="Create organization" onPress={submit} loading={onboard.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxxl, gap: space.lg },
  hint: { ...type.caption, color: colors.mutedForeground, marginTop: -space.sm },
  submit: { marginTop: space.xxxl, gap: space.md },
  error: { ...type.caption, color: colors.destructive },
});
