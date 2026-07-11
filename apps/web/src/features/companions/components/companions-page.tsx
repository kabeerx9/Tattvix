import {
  companionProfileInputSchema,
  type CompanionProfile,
  type CompanionProfileInput,
  type CompanionProfileMissingField,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@tattvix/ui/components/sheet";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Baby, CheckCircle2, Pencil, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Surface } from "@/components/design-system";
import { companionMutations } from "@/features/companions/mutations";
import { companionQueries } from "@/features/companions/queries";
import { ApiError } from "@/lib/api";

const missingFieldLabels: Record<CompanionProfileMissingField, string> = {
  legalFirstName: "Legal first name",
  legalLastName: "Legal last name",
  dateOfBirth: "Date of birth",
  relationship: "Relationship",
  nationality: "Nationality",
};

type EditorState = CompanionProfile | "new" | null;

export function CompanionsPage() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(companionQueries.list());
  const [editor, setEditor] = useState<EditorState>(null);
  const createMutation = useMutation(companionMutations.create(queryClient));
  const updateMutation = useMutation(companionMutations.update(queryClient));
  const removeMutation = useMutation(companionMutations.remove(queryClient));

  function saveCompanion(input: CompanionProfileInput) {
    if (editor === "new") {
      createMutation.mutate(input, {
        onSuccess: () => {
          toast.success("Companion added");
          setEditor(null);
        },
      });
      return;
    }

    if (editor) {
      updateMutation.mutate(
        { id: editor.id, input },
        {
          onSuccess: () => {
            toast.success("Companion updated");
            setEditor(null);
          },
        },
      );
    }
  }

  function removeCompanion(companion: CompanionProfile) {
    removeMutation.mutate(companion.id, {
      onSuccess: () => {
        toast.success("Companion removed");
        setEditor(null);
      },
    });
  }

  const mutationError = [createMutation, updateMutation, removeMutation].find(
    (mutation) => mutation.isError,
  )?.error;
  const errorMessage =
    mutationError instanceof ApiError
      ? mutationError.message
      : mutationError
        ? "The companion could not be saved."
        : null;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow="Guest identity"
        title="Travel companions"
        description="Save the people you commonly travel with. You only add them to a check-in when they are staying with you."
        action={<Button size="lg" onClick={() => setEditor("new")}><Plus />Add companion</Button>}
      />

      {data.companions.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.companions.map((companion) => (
            <CompanionCard
              key={companion.id}
              companion={companion}
              onEdit={() => setEditor(companion)}
            />
          ))}
        </div>
      ) : (
        <EmptyCompanions onAdd={() => setEditor("new")} />
      )}

      <Sheet
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editor === "new" ? "Add a companion" : "Edit companion"}</SheetTitle>
            <SheetDescription>
              Save the basics now. Hotels only need companion details when they are part of a future check-in.
            </SheetDescription>
          </SheetHeader>
          {editor ? (
            <CompanionEditor
              key={editor === "new" ? "new" : editor.id}
              companion={editor === "new" ? null : editor}
              isSaving={createMutation.isPending || updateMutation.isPending}
              isRemoving={removeMutation.isPending}
              submitError={errorMessage}
              onSubmit={saveCompanion}
              onRemove={editor === "new" ? undefined : () => removeCompanion(editor)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CompanionCard({ companion, onEdit }: { companion: CompanionProfile; onEdit: () => void }) {
  const missingFields = companion.readiness.missingFields;

  return (
    <Surface className="grid gap-5 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary"><UsersRound className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">
            {formatCompanionName(companion)}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {companion.relationship || "Relationship not added"}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${formatCompanionName(companion)}`} onClick={onEdit}><Pencil /></Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusPill>{ageLabel(companion)}</StatusPill>
        {companion.readiness.isReady ? (
          <StatusPill ready><CheckCircle2 className="size-3.5" />Profile ready</StatusPill>
        ) : (
          <StatusPill>{missingFields.length} detail{missingFields.length === 1 ? "" : "s"} needed</StatusPill>
        )}
      </div>

      {!companion.readiness.isReady ? (
        <p className="border-t pt-4 text-xs leading-5 text-muted-foreground">
          Still needed: {missingFields.map((field) => missingFieldLabels[field]).join(", ")}.
        </p>
      ) : null}
    </Surface>
  );
}

function EmptyCompanions({ onAdd }: { onAdd: () => void }) {
  return (
    <Surface className="grid place-items-center gap-4 p-8 text-center sm:p-12">
      <span className="grid size-12 place-items-center rounded-xl bg-accent text-primary"><Baby className="size-6" /></span>
      <div className="max-w-md"><h2 className="text-lg font-semibold">No companions yet</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Add family members or people you travel with often. This is optional and does not add anyone to a hotel stay.</p></div>
      <Button onClick={onAdd}><Plus />Add your first companion</Button>
    </Surface>
  );
}

function CompanionEditor({
  companion,
  isSaving,
  isRemoving,
  submitError,
  onSubmit,
  onRemove,
}: {
  companion: CompanionProfile | null;
  isSaving: boolean;
  isRemoving: boolean;
  submitError: string | null;
  onSubmit: (input: CompanionProfileInput) => void;
  onRemove?: () => void;
}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const data = new FormData(event.currentTarget);
    const parsed = companionProfileInputSchema.safeParse({
      legalFirstName: data.get("legalFirstName"),
      legalLastName: data.get("legalLastName"),
      dateOfBirth: data.get("dateOfBirth") || null,
      relationship: data.get("relationship"),
      nationality: data.get("nationality"),
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
        <EditorField label="Legal first name" required error={fieldErrors.legalFirstName}>
          <Input name="legalFirstName" defaultValue={companion?.legalFirstName ?? ""} maxLength={150} autoComplete="given-name" aria-invalid={Boolean(fieldErrors.legalFirstName)} />
        </EditorField>
        <EditorField label="Legal last name" required error={fieldErrors.legalLastName} hint="For a single legal name, repeat the documented name.">
          <Input name="legalLastName" defaultValue={companion?.legalLastName ?? ""} maxLength={150} autoComplete="family-name" aria-invalid={Boolean(fieldErrors.legalLastName)} />
        </EditorField>
        <EditorField label="Date of birth" required error={fieldErrors.dateOfBirth}>
          <Input name="dateOfBirth" defaultValue={companion?.dateOfBirth ?? ""} type="date" aria-invalid={Boolean(fieldErrors.dateOfBirth)} />
        </EditorField>
        <EditorField label="Relationship" required error={fieldErrors.relationship} hint="For example: spouse, child, parent, friend.">
          <Input name="relationship" defaultValue={companion?.relationship ?? ""} maxLength={100} placeholder="Spouse" aria-invalid={Boolean(fieldErrors.relationship)} />
        </EditorField>
        <EditorField label="Nationality" required error={fieldErrors.nationality} hint="Two-letter country code, such as IN.">
          <Input name="nationality" defaultValue={companion?.nationality ?? ""} maxLength={2} autoCapitalize="characters" placeholder="IN" aria-invalid={Boolean(fieldErrors.nationality)} />
        </EditorField>
      </div>

      {submitError ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{submitError}</p> : null}

      <SheetFooter className="mt-0 border-t px-0 pt-4">
        {onRemove ? (
          confirmingRemoval ? (
            <div className="flex w-full items-center justify-between gap-2"><p className="text-xs text-destructive">Remove this companion permanently?</p><div className="flex gap-2"><Button type="button" variant="ghost" size="sm" disabled={isRemoving} onClick={() => setConfirmingRemoval(false)}>Cancel</Button><Button type="button" variant="destructive" size="sm" disabled={isRemoving} onClick={onRemove}>{isRemoving ? "Removing..." : "Confirm remove"}</Button></div></div>
          ) : (
            <Button type="button" variant="ghost" className="mr-auto text-destructive hover:text-destructive" disabled={isRemoving} onClick={() => setConfirmingRemoval(true)}>Remove companion</Button>
          )
        ) : null}
        {!confirmingRemoval ? <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : companion ? "Save changes" : "Add companion"}</Button> : null}
      </SheetFooter>
    </form>
  );
}

function EditorField({ label, required, error, hint, children }: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return <div className="grid gap-2"><Label>{label}{required ? <span className="text-destructive">*</span> : null}</Label>{children}{error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}</div>;
}

function StatusPill({ children, ready = false }: { children: React.ReactNode; ready?: boolean }) {
  return <span className={ready ? "inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground" : "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"}>{children}</span>;
}

function formatCompanionName(companion: CompanionProfile) {
  return [companion.legalFirstName, companion.legalLastName].filter(Boolean).join(" ") || "Unnamed companion";
}

function ageLabel(companion: CompanionProfile) {
  if (companion.isMinor === null) return "Age pending";
  return companion.isMinor ? "Minor" : "Adult";
}
