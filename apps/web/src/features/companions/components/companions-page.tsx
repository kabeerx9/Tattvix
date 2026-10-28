// Travel companions: people the signed-in guest travels with, one row each.
// A row opens that person's page (details, ID documents, remove). Mirrors
// apps/native/app/(guest)/companions/index.tsx.
import { companionRowDetail, personName } from "@tattvix/api";
import { companionProfileInputSchema, type CompanionProfile, type CompanionProfileInput } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@tattvix/ui/components/sheet";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, InitialsAvatar, ListRow, PageHeader, Panel } from "@/components/design-system";
import { companionMutations } from "@/features/companions/mutations";
import { companionQueries } from "@/features/companions/queries";
import { CountrySelect } from "@/features/guest-profile/components/country-select";
import { ApiError } from "@/lib/api";

export function CompanionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(companionQueries.list());
  const [adding, setAdding] = useState(false);
  const createMutation = useMutation(companionMutations.create(queryClient));

  function add(input: CompanionProfileInput) {
    createMutation.mutate(input, {
      onSuccess: (saved) => {
        toast.success("Companion added");
        setAdding(false);
        void navigate({ to: "/companions/$companionId", params: { companionId: String(saved.id) } });
      },
    });
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <div className="grid gap-4">
        <PageHeader
          title="Travel companions"
          meta="People you check in with"
          actions={data.companions.length ? <Button variant="outline" onClick={() => setAdding(true)}><Plus />Add</Button> : undefined}
        />
      </div>

      {data.companions.length ? (
        <Panel>
          <ul className="divide-y divide-border-soft">
            {data.companions.map((companion) => (
              <li key={companion.id}>
                <Link
                  to="/companions/$companionId"
                  params={{ companionId: String(companion.id) }}
                  className="block px-5 py-3 outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <ListRow
                    leading={<InitialsAvatar name={personName(companion, "?")} size="md" />}
                    title={<span className="text-[15px] font-semibold [overflow-wrap:anywhere]">{personName(companion, "Unnamed companion")}</span>}
                    meta={<span className="text-sm text-muted-foreground">{companionRowDetail(companion)}</span>}
                    trailing={<ChevronRight aria-hidden className="size-4 text-subtle-foreground" />}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <Panel>
          <EmptyState
            icon={UsersRound}
            title="No companions yet"
            description="Save family or friends you travel with, so checking in together takes one scan."
            action={<Button onClick={() => setAdding(true)}><Plus />Add companion</Button>}
          />
        </Panel>
      )}

      <CompanionEditorSheet
        open={adding}
        onOpenChange={setAdding}
        companion={null}
        isSaving={createMutation.isPending}
        submitError={mutationError(createMutation.error, createMutation.isError)}
        onSubmit={add}
      />
    </div>
  );
}

export function mutationError(error: unknown, isError: boolean) {
  return error instanceof ApiError ? error.message : isError ? "The companion could not be saved." : null;
}

export function CompanionEditorSheet({
  open,
  onOpenChange,
  ...editor
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & React.ComponentProps<typeof CompanionEditor>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pr-12">
          <SheetTitle>{editor.companion ? "Edit companion" : "Add a companion"}</SheetTitle>
        </SheetHeader>
        {open ? <CompanionEditor key={editor.companion?.id ?? "new"} {...editor} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function CompanionEditor({
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const data = new FormData(event.currentTarget);
    const parsed = companionProfileInputSchema.safeParse({
      legalFirstName: data.get("legalFirstName"),
      legalLastName: data.get("legalLastName"),
      dateOfBirth: data.get("dateOfBirth") || null,
      relationship: data.get("relationship"),
      nationality: data.get("nationality") ?? "",
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[issue.path.join(".")] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    onSubmit(parsed.data);
  }

  return (
    <form className="grid min-h-0 flex-1 gap-5 px-4 pb-4" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <EditorField label="Legal first name" error={fieldErrors.legalFirstName}>
          <Input name="legalFirstName" defaultValue={companion?.legalFirstName ?? ""} maxLength={150} autoComplete="given-name" aria-invalid={Boolean(fieldErrors.legalFirstName)} />
        </EditorField>
        <EditorField label="Legal last name" error={fieldErrors.legalLastName} hint="With a single legal name, repeat it here.">
          <Input name="legalLastName" defaultValue={companion?.legalLastName ?? ""} maxLength={150} autoComplete="family-name" aria-invalid={Boolean(fieldErrors.legalLastName)} />
        </EditorField>
        <EditorField label="Date of birth" error={fieldErrors.dateOfBirth}>
          <Input name="dateOfBirth" defaultValue={companion?.dateOfBirth ?? ""} type="date" max={new Date().toISOString().slice(0, 10)} aria-invalid={Boolean(fieldErrors.dateOfBirth)} />
        </EditorField>
        <EditorField label="Relationship" error={fieldErrors.relationship} hint="For example: spouse, child, parent, friend.">
          <Input name="relationship" defaultValue={companion?.relationship ?? ""} maxLength={100} placeholder="Spouse" aria-invalid={Boolean(fieldErrors.relationship)} />
        </EditorField>
        <EditorField label="Nationality" htmlFor="companion-nationality" error={fieldErrors.nationality}>
          <CountrySelect id="companion-nationality" name="nationality" defaultValue={companion?.nationality ?? ""} invalid={Boolean(fieldErrors.nationality)} />
        </EditorField>
      </div>

      {submitError ? <p role="alert" className="text-sm text-destructive">{submitError}</p> : null}

      <SheetFooter className="mt-0 border-t px-0 pt-4">
        <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : companion ? "Save" : "Add companion"}</Button>
      </SheetFooter>
    </form>
  );
}

function EditorField({ label, htmlFor, error, hint, children }: {
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
