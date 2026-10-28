// Guest travel profile, read first: each section shows what is saved, and
// "Edit" opens just that section's fields in a sheet. Then the identity
// documents. Mirrors apps/native/app/(guest)/(tabs)/profile.tsx.
import {
  getProfileReadiness,
  getProfileSections,
  profileSectionFields,
  profileSectionTitles,
  type ProfileSectionKey,
} from "@tattvix/api";
import { guestProfileInputSchema, type GuestProfileInput } from "@tattvix/contracts";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FactList, PageCover, PageHeader, Panel, SectionTitle } from "@/components/design-system";
import { guestProfileMutations } from "@/features/guest-profile/mutations";
import { guestProfileQueries } from "@/features/guest-profile/queries";
import { IdentityDocumentsSection } from "@/features/identity-documents/components/identity-documents-section";
import { ApiError } from "@/lib/api";
import { travelImages } from "@/lib/travel-images";

import { CountrySelect } from "./country-select";

const editFormId = "profile-section-form";

export function GuestProfilePage() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(guestProfileQueries.detail());
  const updateMutation = useMutation(guestProfileMutations.update(queryClient));
  const [editing, setEditing] = useState<ProfileSectionKey | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function openEditor(section: ProfileSectionKey) {
    setFieldErrors({});
    updateMutation.reset();
    setEditing(section);
  }

  // The sheet holds one section's fields; the rest come from the saved copy.
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const formData = new FormData(event.currentTarget);
    const input: Record<string, unknown> = { ...data.profile };
    for (const key of profileSectionFields[editing]) input[key] = formData.get(key) ?? "";
    if (editing === "personal") input.dateOfBirth = formData.get("dateOfBirth") || null;

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
  const submitError =
    updateMutation.error instanceof ApiError
      ? updateMutation.error.message
      : updateMutation.isError
        ? "Your profile could not be saved."
        : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <div className="grid gap-4">
        <PageHeader
          title="Profile"
          meta="What a hotel gets when you check in"
          actions={<Button nativeButton={false} variant="outline" render={<Link to="/getting-started" />}>Getting started</Button>}
        />
        <PageCover src={travelImages.profile} />
      </div>

      {readiness.ready ? (
        <Panel className="flex items-start gap-3 p-5">
          <BadgeCheck aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
          <div>
            <p className="text-[15px] font-semibold">Ready for check-in</p>
            <p className="text-sm text-muted-foreground">Scan a hotel&apos;s QR and these details go with you.</p>
          </div>
        </Panel>
      ) : (
        <Panel className="grid gap-3 p-5">
          <p className="text-[17px] font-semibold">
            {readiness.missing.length} {readiness.missing.length === 1 ? "thing" : "things"} left before check-in
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={readiness.percent}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${readiness.percent}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">{readiness.missing.join(", ")}</p>
        </Panel>
      )}

      {sections.map((section) => (
        <section key={section.key} className="grid gap-3">
          <SectionTitle
            title={section.title}
            action={
              <button
                type="button"
                onClick={() => openEditor(section.key)}
                className="text-sm font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                {section.facts.every((fact) => fact.value === null) ? "Add" : "Edit"}
              </button>
            }
          />
          <Panel>
            <FactList facts={section.facts} />
          </Panel>
        </section>
      ))}

      <div id="identity-documents"><IdentityDocumentsSection /></div>

      <BottomSheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) setEditing(null);
        }}
        title={editing ? profileSectionTitles[editing] : ""}
        footer={
          <div className="grid gap-3">
            {submitError ? <p role="alert" className="text-sm text-destructive">{submitError}</p> : null}
            <Button type="submit" form={editFormId} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      >
        {editing ? (
          <form id={editFormId} className="grid gap-4" onSubmit={onSubmit}>
            <SectionFields section={editing} profile={data.profile} errors={fieldErrors} />
          </form>
        ) : null}
      </BottomSheet>
    </div>
  );
}

function SectionFields({ section, profile, errors }: { section: ProfileSectionKey; profile: GuestProfileInput; errors: Record<string, string> }) {
  if (section === "personal") {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal first name" error={errors.legalFirstName}>
            <Input name="legalFirstName" defaultValue={profile.legalFirstName} maxLength={150} autoComplete="given-name" aria-invalid={Boolean(errors.legalFirstName)} />
          </Field>
          <Field label="Legal last name" error={errors.legalLastName} hint="With a single legal name, repeat it here.">
            <Input name="legalLastName" defaultValue={profile.legalLastName} maxLength={150} autoComplete="family-name" aria-invalid={Boolean(errors.legalLastName)} />
          </Field>
        </div>
        <Field label="Phone number" error={errors.phoneNumber}>
          <Input name="phoneNumber" defaultValue={profile.phoneNumber} maxLength={32} type="tel" autoComplete="tel" placeholder="+91 98765 43210" aria-invalid={Boolean(errors.phoneNumber)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth" htmlFor="profile-date-of-birth" error={errors.dateOfBirth}>
            <Input id="profile-date-of-birth" name="dateOfBirth" defaultValue={profile.dateOfBirth ?? ""} type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} aria-invalid={Boolean(errors.dateOfBirth)} />
          </Field>
          <Field label="Nationality" htmlFor="profile-nationality" error={errors.nationality}>
            <CountrySelect id="profile-nationality" name="nationality" defaultValue={profile.nationality} invalid={Boolean(errors.nationality)} />
          </Field>
        </div>
      </>
    );
  }
  if (section === "address") {
    return (
      <>
        <Field label="Address line 1" error={errors.addressLine1}>
          <Input name="addressLine1" defaultValue={profile.addressLine1} maxLength={255} autoComplete="address-line1" />
        </Field>
        <Field label="Address line 2" error={errors.addressLine2}>
          <Input name="addressLine2" defaultValue={profile.addressLine2} maxLength={255} autoComplete="address-line2" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" error={errors.city}>
            <Input name="city" defaultValue={profile.city} maxLength={120} autoComplete="address-level2" />
          </Field>
          <Field label="State or region" error={errors.stateRegion}>
            <Input name="stateRegion" defaultValue={profile.stateRegion} maxLength={120} autoComplete="address-level1" />
          </Field>
          <Field label="Postal code" error={errors.postalCode}>
            <Input name="postalCode" defaultValue={profile.postalCode} maxLength={20} autoComplete="postal-code" />
          </Field>
          <Field label="Country" htmlFor="profile-country" error={errors.country}>
            <CountrySelect id="profile-country" name="country" defaultValue={profile.country} invalid={Boolean(errors.country)} />
          </Field>
        </div>
      </>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Contact name" error={errors.emergencyContactName}>
        <Input name="emergencyContactName" defaultValue={profile.emergencyContactName} maxLength={150} autoComplete="off" />
      </Field>
      <Field label="Contact phone" error={errors.emergencyContactPhone}>
        <Input name="emergencyContactPhone" defaultValue={profile.emergencyContactPhone} maxLength={32} type="tel" autoComplete="off" />
      </Field>
    </div>
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
