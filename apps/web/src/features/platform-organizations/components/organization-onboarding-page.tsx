import {
  platformOrganizationOnboardingInputSchema,
  type PlatformOrganizationOnboardingResponse,
  type PlatformUserSearchResult,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Hotel, UserRoundCheck } from "lucide-react";
import { useState } from "react";

import { platformOrganizationMutations } from "@/features/platform-organizations/mutations";
import { UserEmailCombobox } from "@/features/platform-users/components/user-email-combobox";
import { ApiError } from "@/lib/api";
import { PageHeader, Panel, PanelHeader, PanelSection, StatusPill } from "@/components/design-system";

export function OrganizationOnboardingPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const onboardingMutation = useMutation(platformOrganizationMutations.onboard(queryClient));
  const [owner, setOwner] = useState<PlatformUserSearchResult | null>(null);
  const [ownerPickerKey, setOwnerPickerKey] = useState(0);
  const [result, setResult] = useState<PlatformOrganizationOnboardingResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setFieldErrors({});

    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = platformOrganizationOnboardingInputSchema.safeParse({
      organization: {
        name: data.get("organizationName"),
        slug: data.get("organizationSlug"),
      },
      property: {
        name: data.get("propertyName"),
        slug: data.get("propertySlug"),
      },
      ownerEmail: owner?.email,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        nextErrors[issue.path.join(".")] ??= issue.message;
      }
      if (!owner) nextErrors.ownerEmail = "Select an existing user account.";
      setFieldErrors(nextErrors);
      return;
    }

    onboardingMutation.mutate(parsed.data, {
      onSuccess: (created) => {
        setResult(created);
        setOwner(null);
        setOwnerPickerKey((key) => key + 1);
        form.reset();
        navigate({
          to: "/admin/$organizationSlug",
          params: { organizationSlug: created.organization.slug },
        });
      },
    });
  }

  const submitError = onboardingMutation.error instanceof ApiError
    ? onboardingMutation.error.message
    : onboardingMutation.isError
      ? "The organization could not be created."
      : null;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader title="Onboard a hotel" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={onSubmit}><Panel>
          <FormSection icon={Building2} title="Organization" description="The hotel business or ownership group.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organization name" error={fieldErrors["organization.name"]}>
                <Input name="organizationName" required maxLength={255} autoComplete="organization" aria-invalid={Boolean(fieldErrors["organization.name"])} placeholder="Example Hotels" />
              </Field>
              <Field label="Organization slug" error={fieldErrors["organization.slug"]}>
                <Input name="organizationSlug" required maxLength={255} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" autoCapitalize="none" autoComplete="off" aria-invalid={Boolean(fieldErrors["organization.slug"])} placeholder="example-hotels" />
              </Field>
            </div>
          </FormSection>

          <FormSection icon={Hotel} title="First property" description="The first physical hotel operated by this organization.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Property name" error={fieldErrors["property.name"]}>
                <Input name="propertyName" required maxLength={255} autoComplete="off" aria-invalid={Boolean(fieldErrors["property.name"])} placeholder="Example Jaipur" />
              </Field>
              <Field label="Property slug" error={fieldErrors["property.slug"]}>
                <Input name="propertySlug" required maxLength={255} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" autoCapitalize="none" autoComplete="off" aria-invalid={Boolean(fieldErrors["property.slug"])} placeholder="jaipur" />
              </Field>
            </div>
          </FormSection>

          <FormSection icon={UserRoundCheck} title="Initial owner" description="Search for and select an existing account. Free-form emails cannot be submitted.">
            <Field label="Owner account" error={fieldErrors.ownerEmail}>
              <UserEmailCombobox
                key={ownerPickerKey}
                value={owner}
                onValueChange={(user) => {
                  setOwner(user);
                  if (user) setFieldErrors((errors) => ({ ...errors, ownerEmail: "" }));
                }}
                invalid={Boolean(fieldErrors.ownerEmail)}
              />
            </Field>
          </FormSection>

          {submitError ? (
            <p role="alert" className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          ) : null}

          <PanelSection className="flex justify-end">
            <Button type="submit" disabled={onboardingMutation.isPending}>
              {onboardingMutation.isPending ? "Creating hotel..." : "Create organization"}
            </Button>
          </PanelSection>
        </Panel></form>

        <aside><Panel><PanelHeader title="Onboarding result" /> <PanelSection>
          {result ? (
            <div className="mt-5 grid gap-4 text-sm">
              <ResultItem label="Organization" value={result.organization.name} />
              <ResultItem label="Property" value={result.property.name} />
              <ResultItem label="Owner" value={result.owner.email} />
              <ResultItem label="Role" value={result.membership.role} />
              <div><StatusPill tone="success">Onboarding complete</StatusPill><p className="mt-1 text-xs text-subtle-foreground">Hotel onboarding completed successfully.</p></div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The created organization, property, and owner assignment will appear here.
            </p>
          )}
        </PanelSection></Panel></aside>
      </div>
    </div>
  );
}

function FormSection({ icon: Icon, title, description, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <PanelSection className="grid gap-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>
      </div>
      {children}
    </PanelSection>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b pb-3 last:border-b-0"><span className="text-xs text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
