// Add or edit a travel companion: legal name, date of birth, relationship and
// nationality. Mirrors the web's CompanionEditor in
// apps/web/src/features/companions/components/companions-page.tsx, on a full-height sheet.
import { companionKeys } from "@tattvix/api";
import { companionProfileInputSchema, type CompanionProfile, type CompanionProfileInput } from "@tattvix/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, TextField, colors, space, toast, type } from "@/src/design-system";
import { api } from "@/src/lib/api";
import { errorMessage } from "@/src/lib/format";

type Form = {
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  relationship: string;
  nationality: string;
};

function initialForm(companion: CompanionProfile | null | undefined): Form {
  return {
    legalFirstName: companion?.legalFirstName ?? "",
    legalLastName: companion?.legalLastName ?? "",
    dateOfBirth: companion?.dateOfBirth ?? "",
    relationship: companion?.relationship ?? "",
    nationality: companion?.nationality ?? "",
  };
}

export function CompanionEditorSheet({
  open,
  onClose,
  companion,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  companion?: CompanionProfile | null;
  onSaved?: (companion: CompanionProfile) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(() => initialForm(companion));
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  // Each opening starts from the companion as it is now.
  useEffect(() => {
    if (!open) return;
    setForm(initialForm(companion));
    setErrors({});
    save.reset();
    // Runs once per opening; `companion` is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = useMutation({
    mutationFn: (input: CompanionProfileInput) =>
      companion ? api.companions.update(companion.id, input) : api.companions.create(input),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: companionKeys.list() });
      toast("Companion saved");
      onSaved?.(saved);
      onClose();
    },
  });

  const saveError = save.error ? errorMessage(save.error, "The companion could not be saved.") : null;

  const set = (key: keyof Form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function submit() {
    const parsed = companionProfileInputSchema.safeParse({
      ...form,
      dateOfBirth: form.dateOfBirth.trim() || null,
    });
    if (!parsed.success) {
      const next: Partial<Record<keyof Form, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Form | undefined;
        if (key) next[key] ??= key === "dateOfBirth" ? "Use a date as YYYY-MM-DD, in the past." : issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  }

  const field = (key: keyof Form, label: string, extra: Record<string, unknown> = {}) => (
    <TextField label={label} value={form[key]} onChangeText={set(key)} error={errors[key]} {...extra} />
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={companion ? "Edit companion" : "Add a companion"}
      fill
      footer={<Button label={companion ? "Save changes" : "Add companion"} onPress={submit} loading={save.isPending} />}
    >
      <Text style={styles.description}>Save the basics now. Hotels only need companion details when they are part of a future check-in.</Text>
      <View style={styles.fields}>
        {field("legalFirstName", "Legal first name", { maxLength: 150, autoComplete: "given-name", enter: "next" })}
        {field("legalLastName", "Legal last name", { maxLength: 150, autoComplete: "family-name", helper: "For a single legal name, repeat the documented name.", enter: "next" })}
        {field("dateOfBirth", "Date of birth", {
          placeholder: "YYYY-MM-DD",
          helper: "YYYY-MM-DD",
          keyboardType: "numbers-and-punctuation",
          autoCapitalize: "none",
          maxLength: 10,
          enter: "next",
        })}
        {field("relationship", "Relationship", { maxLength: 100, placeholder: "Spouse", helper: "For example: spouse, child, parent, friend.", enter: "next" })}
        {field("nationality", "Nationality", {
          maxLength: 2,
          autoCapitalize: "characters",
          placeholder: "IN",
          helper: "Two-letter country code, such as IN.",
          enter: submit,
        })}
        {saveError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {saveError}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  description: { ...type.body, color: colors.mutedForeground, marginBottom: space.lg },
  fields: { gap: space.lg, paddingBottom: space.xs },
  error: { ...type.caption, color: colors.destructive },
});
