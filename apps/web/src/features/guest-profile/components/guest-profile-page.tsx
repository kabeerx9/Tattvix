import {
  guestProfileInputSchema,
  type GuestProfileInput,
  type GuestProfileMissingField,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, ContactRound, HeartHandshake, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Surface } from "@/components/design-system";
import { guestProfileMutations } from "@/features/guest-profile/mutations";
import { guestProfileQueries } from "@/features/guest-profile/queries";
import { ApiError } from "@/lib/api";

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

export function GuestProfilePage() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(guestProfileQueries.detail());
  const updateMutation = useMutation(guestProfileMutations.update(queryClient));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = guestProfileInputSchema.safeParse({
      legalFirstName: formData.get("legalFirstName"),
      legalLastName: formData.get("legalLastName"),
      phoneNumber: formData.get("phoneNumber"),
      dateOfBirth: formData.get("dateOfBirth") || null,
      nationality: formData.get("nationality"),
      addressLine1: formData.get("addressLine1"),
      addressLine2: formData.get("addressLine2"),
      city: formData.get("city"),
      stateRegion: formData.get("stateRegion"),
      postalCode: formData.get("postalCode"),
      country: formData.get("country"),
      emergencyContactName: formData.get("emergencyContactName"),
      emergencyContactPhone: formData.get("emergencyContactPhone"),
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[issue.path.join(".")] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    updateMutation.mutate(parsed.data, {
      onSuccess: () => toast.success("Travel profile saved"),
    });
  }

  const missingFields = data.readiness.missingFields;
  const completedFieldCount = requiredFieldCount - missingFields.length;
  const completionPercentage = Math.round(
    (completedFieldCount / requiredFieldCount) * 100,
  );
  const submitError =
    updateMutation.error instanceof ApiError
      ? updateMutation.error.message
      : updateMutation.isError
        ? "Your profile could not be saved."
        : null;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow="Guest identity"
        title="Your travel profile"
        description="Save your identity details once, then choose exactly what to share when you check in. You can save an incomplete profile and return later."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form className="grid gap-6" onSubmit={onSubmit}>
          <ProfileSection
            icon={ContactRound}
            title="Personal details"
            description="Use the legal name shown on the identity document you will add next."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Legal first name" required error={fieldErrors.legalFirstName}>
                <Input name="legalFirstName" defaultValue={data.profile.legalFirstName} maxLength={150} autoComplete="given-name" aria-invalid={Boolean(fieldErrors.legalFirstName)} />
              </Field>
              <Field label="Legal last name" required error={fieldErrors.legalLastName} hint="For a single legal name, repeat the documented name.">
                <Input name="legalLastName" defaultValue={data.profile.legalLastName} maxLength={150} autoComplete="family-name" aria-invalid={Boolean(fieldErrors.legalLastName)} />
              </Field>
              <Field label="Phone number" required error={fieldErrors.phoneNumber}>
                <Input name="phoneNumber" defaultValue={data.profile.phoneNumber} maxLength={32} type="tel" autoComplete="tel" placeholder="+91 98765 43210" aria-invalid={Boolean(fieldErrors.phoneNumber)} />
              </Field>
              <Field label="Date of birth" required error={fieldErrors.dateOfBirth}>
                <Input name="dateOfBirth" defaultValue={data.profile.dateOfBirth ?? ""} type="date" aria-invalid={Boolean(fieldErrors.dateOfBirth)} />
              </Field>
              <Field label="Nationality" required error={fieldErrors.nationality} hint="Two-letter country code, such as IN.">
                <Input name="nationality" defaultValue={data.profile.nationality} maxLength={2} autoCapitalize="characters" placeholder="IN" aria-invalid={Boolean(fieldErrors.nationality)} />
              </Field>
            </div>
          </ProfileSection>

          <ProfileSection
            icon={MapPin}
            title="Home address"
            description="This structured address will be available for future consent-based hotel check-ins."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2" label="Address line 1" required error={fieldErrors.addressLine1}>
                <Input name="addressLine1" defaultValue={data.profile.addressLine1} maxLength={255} autoComplete="address-line1" />
              </Field>
              <Field className="sm:col-span-2" label="Address line 2" error={fieldErrors.addressLine2}>
                <Input name="addressLine2" defaultValue={data.profile.addressLine2} maxLength={255} autoComplete="address-line2" />
              </Field>
              <Field label="City" required error={fieldErrors.city}>
                <Input name="city" defaultValue={data.profile.city} maxLength={120} autoComplete="address-level2" />
              </Field>
              <Field label="State or region" required error={fieldErrors.stateRegion}>
                <Input name="stateRegion" defaultValue={data.profile.stateRegion} maxLength={120} autoComplete="address-level1" />
              </Field>
              <Field label="Postal code" required error={fieldErrors.postalCode}>
                <Input name="postalCode" defaultValue={data.profile.postalCode} maxLength={20} autoComplete="postal-code" />
              </Field>
              <Field label="Country" required error={fieldErrors.country} hint="Two-letter country code, such as IN.">
                <Input name="country" defaultValue={data.profile.country} maxLength={2} autoComplete="country" autoCapitalize="characters" placeholder="IN" />
              </Field>
            </div>
          </ProfileSection>

          <ProfileSection
            icon={HeartHandshake}
            title="Emergency contact"
            description="Optional for profile readiness, but useful during a stay-related emergency."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact name" error={fieldErrors.emergencyContactName}>
                <Input name="emergencyContactName" defaultValue={data.profile.emergencyContactName} maxLength={150} autoComplete="off" />
              </Field>
              <Field label="Contact phone" error={fieldErrors.emergencyContactPhone}>
                <Input name="emergencyContactPhone" defaultValue={data.profile.emergencyContactPhone} maxLength={32} type="tel" autoComplete="off" />
              </Field>
            </div>
          </ProfileSection>

          {submitError ? (
            <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving profile..." : "Save profile"}
            </Button>
          </div>
        </form>

        <Surface className="sticky top-28 grid gap-5 p-5 sm:p-6">
          <div>
            <p className="app-kicker">Check-in readiness</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold tracking-tight">{completionPercentage}%</p>
              <p className="text-xs text-muted-foreground">{completedFieldCount} of {requiredFieldCount} requirements</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${completionPercentage}%` }} />
            </div>
          </div>

          {missingFields.length ? (
            <div>
              <h2 className="text-sm font-semibold">Still needed</h2>
              <ul className="mt-3 grid gap-2">
                {missingFields.map((field) => (
                  <li key={field} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                    {missingFieldLabels[field]}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl bg-accent p-4 text-accent-foreground">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <div><h2 className="text-sm font-semibold">Ready for check-in</h2><p className="mt-1 text-xs leading-5">Your profile meets the current identity requirements.</p></div>
            </div>
          )}

          <p className="border-t pt-4 text-xs leading-5 text-muted-foreground">
            A government identity document is required for full readiness. Document upload is the next profile step.
          </p>
        </Surface>
      </div>
    </div>
  );
}

function ProfileSection({ icon: Icon, title, description, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Surface className="grid gap-5 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-5" /></span>
        <div><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>
      </div>
      {children}
    </Surface>
  );
}

function Field({ label, required, error, hint, className, children }: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label>{label}{required ? <span className="text-destructive">*</span> : null}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
