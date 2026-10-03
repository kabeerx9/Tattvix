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
import { Baby, CheckCircle2, FileKey2, Pencil, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, Kpi, KpiStrip, PageCover, PageHeader, Panel, PanelHeader, StatusPill } from "@/components/design-system";
import { travelImages } from "@/lib/travel-images";
import { getInitials } from "@/lib/initials";
import { companionMutations } from "@/features/companions/mutations";
import { companionQueries } from "@/features/companions/queries";
import { IdentityDocumentsSection } from "@/features/identity-documents/components/identity-documents-section";
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
  const [documentOwner, setDocumentOwner] = useState<CompanionProfile | null>(
    null,
  );
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
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title="Travel companions"
        actions={<Button size="lg" onClick={() => setEditor("new")}><Plus />Add companion</Button>}
      />
      <PageCover src={travelImages.companions} />

      <KpiStrip><Kpi icon={UsersRound} label="Companions" value={data.companions.length} /><Kpi icon={CheckCircle2} label="Ready" value={data.companions.filter((companion) => companion.readiness.isReady).length} /><Kpi icon={FileKey2} label="Incomplete" value={data.companions.filter((companion) => !companion.readiness.isReady).length} /></KpiStrip>
      {data.companions.length ? (
        <Panel><PanelHeader title="Companions" meta={data.companions.length} />
          {data.companions.map((companion) => (
            <CompanionCard
              key={companion.id}
              companion={companion}
              onEdit={() => setEditor(companion)}
              onManageDocuments={() => setDocumentOwner(companion)}
            />
          ))}
        </Panel>
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

      <Sheet
        open={documentOwner !== null}
        onOpenChange={(open) => {
          if (!open) setDocumentOwner(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              {documentOwner
                ? `Identity documents for ${formatCompanionName(documentOwner)}`
                : "Companion identity documents"}
            </SheetTitle>
            <SheetDescription>
              Save private documents ahead of time. They are shared with a hotel
              only when you choose an ID for this companion at check-in.
            </SheetDescription>
          </SheetHeader>
          {documentOwner ? (
            <div className="px-4 pb-4">
              <IdentityDocumentsSection
                key={documentOwner.id}
                companionId={documentOwner.id}
                participantName={formatCompanionName(documentOwner)}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CompanionCard({
  companion,
  onEdit,
  onManageDocuments,
}: {
  companion: CompanionProfile;
  onEdit: () => void;
  onManageDocuments: () => void;
}) {
  const missingFields = companion.readiness.missingFields;

  return (
    <div className="group flex min-h-11 flex-wrap items-center gap-3 border-t border-border-soft px-5 py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{getInitials(formatCompanionName(companion))}</span>
      <div className="min-w-0 flex-1">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">
            {formatCompanionName(companion)}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {companion.relationship || "Relationship not added"}
          </p>
        </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-subtle-foreground">{ageLabel(companion)}</span>
        {companion.readiness.isReady ? (
          <StatusPill tone="success">Profile ready</StatusPill>
        ) : (
          <StatusPill tone="neutral">{missingFields.length} detail{missingFields.length === 1 ? "" : "s"} needed</StatusPill>
        )}
      </div>

      {!companion.readiness.isReady ? (
        <p className="text-xs leading-5 text-subtle-foreground">
          Still needed: {missingFields.map((field) => missingFieldLabels[field]).join(", ")}.
        </p>
      ) : null}

      </div>
      <div className="flex flex-wrap items-center gap-2 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${formatCompanionName(companion)}`} onClick={onEdit}><Pencil /></Button>
      <Button variant="outline" size="sm" onClick={onManageDocuments}>
        <FileKey2 />
        Identity documents
      </Button>
      </div>
    </div>
  );
}

function EmptyCompanions({ onAdd }: { onAdd: () => void }) {
  return (
    <Panel>
      <EmptyState
        icon={Baby}
        tone="accent"
        title="No companions yet"
        description="Add family members or people you travel with often. This is optional and does not add anyone to a hotel stay."
        action={<Button onClick={onAdd}><Plus />Add your first companion</Button>}
      />
    </Panel>
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

      {submitError ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{submitError}</p> : null}

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


function formatCompanionName(companion: CompanionProfile) {
  return [companion.legalFirstName, companion.legalLastName].filter(Boolean).join(" ") || "Unnamed companion";
}

function ageLabel(companion: CompanionProfile) {
  if (companion.isMinor === null) return "Age pending";
  return companion.isMinor ? "Minor" : "Adult";
}
