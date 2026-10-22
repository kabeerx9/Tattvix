// Phone-sized companion form for adding someone mid check-in. Validates with
// the shared contract schema and saves through the companions feature's
// mutations, so the companion is reusable on the Companions page afterwards.

import {
  companionProfileInputSchema,
  type CompanionProfile,
  type CompanionProfileInput,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { SegmentedControl } from "@tattvix/ui/components/segmented-control";
import { useState } from "react";

import { ErrorNotice, FormField, footerButtonClassName, stepInputClassName } from "./check-in-layout";

const relationships = ["Spouse", "Child", "Parent", "Sibling", "Friend"] as const;

export function CompanionForm({
  companion,
  isSaving,
  submitError,
  onSubmit,
}: {
  companion: CompanionProfile | null;
  isSaving: boolean;
  submitError: string | null;
  onSubmit: (input: CompanionProfileInput) => void;
}) {
  const [values, setValues] = useState<CompanionProfileInput>({
    legalFirstName: companion?.legalFirstName ?? "",
    legalLastName: companion?.legalLastName ?? "",
    dateOfBirth: companion?.dateOfBirth ?? null,
    relationship: companion?.relationship ?? "",
    nationality: companion?.nationality || "IN",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CompanionProfileInput, string>>>({});

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    const parsed = companionProfileInputSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as keyof CompanionProfileInput] ??= issue.message;
      }
    }
    // All four are needed for the companion to be shareable at check-in.
    if (!values.legalFirstName.trim()) next.legalFirstName ??= "Enter their first name";
    if (!values.legalLastName.trim()) next.legalLastName ??= "Enter their last name";
    if (!values.dateOfBirth) next.dateOfBirth ??= "Enter their date of birth";
    if (!values.relationship.trim()) next.relationship ??= "Choose how they’re related to you";
    if (!values.nationality.trim()) next.nationality ??= "Enter their nationality";
    setErrors(next);
    if (Object.keys(next).length || !parsed.success) return;
    onSubmit(parsed.data);
  }

  const set = (patch: Partial<CompanionProfileInput>) => setValues((current) => ({ ...current, ...patch }));
  const presetRelationship = relationships.find((item) => item === values.relationship) ?? null;

  return (
    <form className="grid gap-4 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" onSubmit={submit} noValidate>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First name" required error={errors.legalFirstName}>
          {(field) => (
            <Input {...field} className={stepInputClassName} value={values.legalFirstName} maxLength={150}
              autoComplete="off" autoCapitalize="words" onChange={(e) => set({ legalFirstName: e.target.value })} />
          )}
        </FormField>
        <FormField label="Last name" required error={errors.legalLastName}>
          {(field) => (
            <Input {...field} className={stepInputClassName} value={values.legalLastName} maxLength={150}
              autoComplete="off" autoCapitalize="words" onChange={(e) => set({ legalLastName: e.target.value })} />
          )}
        </FormField>
      </div>
      <FormField label="Date of birth" required error={errors.dateOfBirth}>
        {(field) => (
          <Input {...field} type="date" className={stepInputClassName} value={values.dateOfBirth ?? ""}
            max={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ dateOfBirth: e.target.value || null })} />
        )}
      </FormField>
      <div className="grid gap-1.5">
        <p className="text-[13px] font-medium" id="companion-relationship">Relationship</p>
        <SegmentedControl
          aria-labelledby="companion-relationship"
          value={presetRelationship}
          onValueChange={(relationship) => set({ relationship })}
          options={relationships.map((item) => ({ value: item, label: item }))}
        />
        {errors.relationship ? <p className="text-[13px] text-destructive">{errors.relationship}</p> : null}
      </div>
      <FormField label="Nationality" required error={errors.nationality} hint="Two letters, e.g. IN for India.">
        {(field) => (
          <Input {...field} className={`${stepInputClassName} uppercase`} value={values.nationality} maxLength={2}
            autoCapitalize="characters" onChange={(e) => set({ nationality: e.target.value.toUpperCase() })} />
        )}
      </FormField>
      {submitError ? <ErrorNotice>{submitError}</ErrorNotice> : null}
      <Button type="submit" className={footerButtonClassName} disabled={isSaving}>
        {isSaving ? "Saving…" : companion ? "Save companion" : "Add companion"}
      </Button>
    </form>
  );
}
