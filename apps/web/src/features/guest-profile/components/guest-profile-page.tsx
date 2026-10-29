// Guest travel profile, read first: a teal band says how ready the guest is
// for check-in, then each section shows what is saved. Every fact is a row
// that opens one form holding all the details, focused on that fact; an empty
// fact reads as the action ("Add phone number"), and "Complete profile" opens
// the form at the first missing detail. Then the identity documents.
// Mirrors apps/native/app/(guest)/(tabs)/profile.tsx.
import { firstMissingProfileField, formErrorSummary, getProfileReadiness, getProfileSections, profileFormFields, profileSectionTitles, readinessLine } from "@tattvix/api";
import { guestProfileInputSchema, type GuestProfileInput } from "@tattvix/contracts";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { BandHeader, FactList, Panel, GroupTitle, ProgressRing } from "@/components/design-system";
import { guestProfileMutations } from "@/features/guest-profile/mutations";
import { guestProfileQueries } from "@/features/guest-profile/queries";
import { IdentityDocumentsSection } from "@/features/identity-documents/components/identity-documents-section";
import { ApiError } from "@/lib/api";

import { CountrySelect } from "./country-select";

const editFormId = "profile-details-form";
/** Each field's element id, so the form can open focused on the fact that was tapped. */
const fieldId = (field: string) => `profile-${field}`;

const profileFields = [
  "legalFirstName", "legalLastName", "phoneNumber", "nationality",
  "addressLine1", "addressLine2", "city", "stateRegion", "postalCode", "country",
  "emergencyContactName", "emergencyContactPhone",
] as const;

export function GuestProfilePage() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(guestProfileQueries.detail());
  const updateMutation = useMutation(guestProfileMutations.update(queryClient));
  // The field the form opened on; null while it is closed.
  const [editing, setEditing] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function openEditor(field: string) {
    setFieldErrors({});
    updateMutation.reset();
    setEditing(field);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input: Record<string, unknown> = {};
    for (const key of profileFields) input[key] = formData.get(key) ?? "";
    input.dateOfBirth = formData.get("dateOfBirth") || null;

    const parsed = guestProfileInputSchema.safeParse(input);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    updateMutation.mutate(parsed.data, {
      onSuccess: () => {
        setEditing(null);
        toast.success("Saved");
      },
    });
  }

  const readiness = getProfileReadiness(data.readiness.missingFields);
  const sections = getProfileSections(data.profile);
  const nextField = firstMissingProfileField(data.readiness.missingFields);
  const submitError =
    updateMutation.error instanceof ApiError
      ? updateMutation.error.message
      : updateMutation.isError
        ? "Your profile could not be saved."
        // A refused Save says why beside the button: the field errors may be scrolled out of view.
        : formErrorSummary(fieldErrors, profileFormFields);

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <div className="grid gap-4">
        <BandHeader
          title="Profile"
          meta="What a hotel gets when you check in"
          actions={
            <Link to="/getting-started" className="rounded-sm text-sm font-semibold text-white underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-white">
              Getting started
            </Link>
          }
          summary={{ leading: <ProgressRing done={readiness.completed} total={readiness.total} />, ...readinessLine(readiness) }}
        />
        {nextField ? (
          <Button className="w-full sm:w-auto sm:justify-self-start" onClick={() => openEditor(nextField)}>
            Complete profile
          </Button>
        ) : null}
      </div>

      {sections.map((section) => (
        <section key={section.key} className="grid gap-3">
          <GroupTitle title={section.title} />
          <Panel>
            <FactList facts={section.facts} onSelect={(fact) => openEditor(fact.field ?? "")} />
          </Panel>
        </section>
      ))}

      <div id="identity-documents"><IdentityDocumentsSection /></div>

      <BottomSheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) setEditing(null);
        }}
        title="Your details"
        initialFocus={editing ? fieldId(editing) : undefined}
        footer={
          <div className="grid gap-3">
            {submitError ? <p role="alert" className="text-sm text-destructive">{submitError}</p> : null}
            <Button type="submit" form={editFormId} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      >
        {editing !== null ? (
          <form id={editFormId} className="grid gap-6" onSubmit={onSubmit}>
            <DetailsFields profile={data.profile} errors={fieldErrors} />
          </form>
        ) : null}
      </BottomSheet>
    </div>
  );
}

function DetailsFields({ profile, errors }: { profile: GuestProfileInput; errors: Record<string, string> }) {
  return (
    <>
      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-semibold">{profileSectionTitles.personal}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal first name" htmlFor={fieldId("legalFirstName")} error={errors.legalFirstName}>
            <Input id={fieldId("legalFirstName")} name="legalFirstName" defaultValue={profile.legalFirstName} maxLength={150} autoComplete="given-name" aria-invalid={Boolean(errors.legalFirstName)} />
          </Field>
          <Field label="Legal last name" htmlFor={fieldId("legalLastName")} error={errors.legalLastName} hint="With a single legal name, repeat it here.">
            <Input id={fieldId("legalLastName")} name="legalLastName" defaultValue={profile.legalLastName} maxLength={150} autoComplete="family-name" aria-invalid={Boolean(errors.legalLastName)} />
          </Field>
        </div>
        <Field label="Phone number" htmlFor={fieldId("phoneNumber")} error={errors.phoneNumber}>
          <Input id={fieldId("phoneNumber")} name="phoneNumber" defaultValue={profile.phoneNumber} maxLength={32} type="tel" autoComplete="tel" placeholder="+91 98765 43210" aria-invalid={Boolean(errors.phoneNumber)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth" htmlFor={fieldId("dateOfBirth")} error={errors.dateOfBirth}>
            <Input id={fieldId("dateOfBirth")} name="dateOfBirth" defaultValue={profile.dateOfBirth ?? ""} type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} aria-invalid={Boolean(errors.dateOfBirth)} />
          </Field>
          <Field label="Nationality" htmlFor={fieldId("nationality")} error={errors.nationality}>
            <CountrySelect id={fieldId("nationality")} name="nationality" defaultValue={profile.nationality} invalid={Boolean(errors.nationality)} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-semibold">{profileSectionTitles.address}</legend>
        <Field label="Address line 1" htmlFor={fieldId("addressLine1")} error={errors.addressLine1}>
          <Input id={fieldId("addressLine1")} name="addressLine1" defaultValue={profile.addressLine1} maxLength={255} autoComplete="address-line1" />
        </Field>
        <Field label="Address line 2" htmlFor={fieldId("addressLine2")} error={errors.addressLine2}>
          <Input id={fieldId("addressLine2")} name="addressLine2" defaultValue={profile.addressLine2} maxLength={255} autoComplete="address-line2" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor={fieldId("city")} error={errors.city}>
            <Input id={fieldId("city")} name="city" defaultValue={profile.city} maxLength={120} autoComplete="address-level2" />
          </Field>
          <Field label="State or region" htmlFor={fieldId("stateRegion")} error={errors.stateRegion}>
            <Input id={fieldId("stateRegion")} name="stateRegion" defaultValue={profile.stateRegion} maxLength={120} autoComplete="address-level1" />
          </Field>
          <Field label="Postal code" htmlFor={fieldId("postalCode")} error={errors.postalCode}>
            <Input id={fieldId("postalCode")} name="postalCode" defaultValue={profile.postalCode} maxLength={20} autoComplete="postal-code" />
          </Field>
          <Field label="Country" htmlFor={fieldId("country")} error={errors.country}>
            <CountrySelect id={fieldId("country")} name="country" defaultValue={profile.country} invalid={Boolean(errors.country)} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-semibold">{profileSectionTitles.emergency}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" htmlFor={fieldId("emergencyContactName")} error={errors.emergencyContactName}>
            <Input id={fieldId("emergencyContactName")} name="emergencyContactName" defaultValue={profile.emergencyContactName} maxLength={150} autoComplete="off" />
          </Field>
          <Field label="Contact phone" htmlFor={fieldId("emergencyContactPhone")} error={errors.emergencyContactPhone}>
            <Input id={fieldId("emergencyContactPhone")} name="emergencyContactPhone" defaultValue={profile.emergencyContactPhone} maxLength={32} type="tel" autoComplete="off" />
          </Field>
        </div>
      </fieldset>
    </>
  );
}

function Field({ label, htmlFor, error, hint, children }: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
