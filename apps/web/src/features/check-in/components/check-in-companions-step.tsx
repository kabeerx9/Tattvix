import type { CompanionProfile, CompanionProfileInput } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tattvix/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@tattvix/ui/components/sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InitialsAvatar } from "@/components/design-system";
import { documentLabel, personName } from "@/features/check-in/format";
import { companionMutations } from "@/features/companions/mutations";
import { identityDocumentQueries } from "@/features/identity-documents/queries";
import { ApiError } from "@/lib/api";

import { ChoiceCard } from "./check-in-choice-card";
import { CompanionForm } from "./check-in-companion-form";

/** The API accepts at most 20 companions per check-in. */
const MAX_COMPANIONS = 20;

export function CompanionsStep({
  companions,
  selectedIds,
  documentIds,
  onToggle,
  onDocumentChange,
}: {
  companions: CompanionProfile[];
  selectedIds: number[];
  documentIds: Record<number, number>;
  onToggle: (id: number, selected: boolean) => void;
  onDocumentChange: (companionId: number, documentId: number | null) => void;
}) {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<CompanionProfile | "new" | null>(null);
  const createMutation = useMutation(companionMutations.create(queryClient));
  const updateMutation = useMutation(companionMutations.update(queryClient));

  function save(input: CompanionProfileInput) {
    const onSuccess = (companion: CompanionProfile) => {
      toast.success(editor === "new" ? "Companion added" : "Companion updated");
      setEditor(null);
      if (companion.readiness.isReady && !selectedIds.includes(companion.id)) {
        onToggle(companion.id, true);
      }
    };
    if (editor === "new") createMutation.mutate(input, { onSuccess });
    else if (editor) updateMutation.mutate({ id: editor.id, input }, { onSuccess });
  }

  const mutationError = (createMutation.error ?? updateMutation.error) as unknown;
  const errorMessage =
    mutationError instanceof ApiError
      ? mutationError.message
      : mutationError
        ? "The companion could not be saved."
        : null;

  return (
    <div className="grid gap-3">
      {companions.map((companion) => {
        const ready = companion.readiness.isReady;
        const selected = selectedIds.includes(companion.id);
        return (
          <ChoiceCard
            key={companion.id}
            type="checkbox"
            name={`companion-${companion.id}`}
            checked={selected}
            disabled={!ready || (!selected && selectedIds.length >= MAX_COMPANIONS)}
            onCheckedChange={(checked) => onToggle(companion.id, checked)}
            leading={<InitialsAvatar name={personName(companion)} />}
            title={personName(companion, "Unnamed companion")}
            description={
              ready
                ? [companion.relationship, companion.isMinor ? "Minor" : null].filter(Boolean).join(" · ")
                : "Add the missing details to bring them along"
            }
          >
            {!ready ? (
              <Button variant="outline" size="sm" onClick={() => setEditor(companion)}>
                Complete details
              </Button>
            ) : selected ? (
              <CompanionDocumentChoice
                companion={companion}
                documentId={documentIds[companion.id] ?? null}
                onChange={(documentId) => onDocumentChange(companion.id, documentId)}
              />
            ) : null}
          </ChoiceCard>
        );
      })}

      <Button
        variant="outline"
        className="h-12 w-full border-dashed text-[15px]"
        onClick={() => setEditor("new")}
      >
        <Plus />
        {companions.length ? "Add someone else" : "Add someone travelling with you"}
      </Button>

      <Sheet open={editor !== null} onOpenChange={(open) => (open ? null : setEditor(null))}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-xl">
          <SheetHeader className="pr-12">
            <SheetTitle>{editor === "new" ? "Add a companion" : "Complete companion"}</SheetTitle>
            <SheetDescription>Saved to your companions for future stays too.</SheetDescription>
          </SheetHeader>
          {editor ? (
            <CompanionForm
              key={editor === "new" ? "new" : editor.id}
              companion={editor === "new" ? null : editor}
              isSaving={createMutation.isPending || updateMutation.isPending}
              submitError={errorMessage}
              onSubmit={save}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/**
 * Optional: share one of the companion's saved, complete IDs. Saving an ID
 * never shares it; only the one picked here goes into this stay.
 */
function CompanionDocumentChoice({
  companion,
  documentId,
  onChange,
}: {
  companion: CompanionProfile;
  documentId: number | null;
  onChange: (documentId: number | null) => void;
}) {
  const documentsQuery = useQuery(identityDocumentQueries.list(companion.id));
  if (documentsQuery.isPending) {
    return <p className="text-[13px] text-muted-foreground">Loading saved IDs…</p>;
  }
  if (documentsQuery.isError) {
    return (
      <div role="alert" className="flex items-center justify-between gap-2 text-[13px] text-destructive">
        Could not load {companion.legalFirstName}’s IDs.
        <Button size="sm" variant="outline" onClick={() => void documentsQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  const ready = documentsQuery.data.documents.filter((document) => document.readiness.isReady);
  if (!ready.length) {
    return <p className="text-[13px] text-subtle-foreground">No saved ID. The hotel may ask to see one at the desk.</p>;
  }
  const options = [
    { value: "none", label: "Don’t share an ID" },
    ...ready.map((document) => ({ value: String(document.id), label: documentLabel(document) })),
  ];
  return (
    <div className="grid gap-1.5">
      <p className="text-[13px] font-medium">{companion.legalFirstName}’s ID (optional)</p>
      <Select
        items={options}
        value={documentId ? String(documentId) : "none"}
        onValueChange={(value) => onChange(value && value !== "none" ? Number(value) : null)}
      >
        <SelectTrigger className="h-11 w-full text-[15px]" aria-label={`ID for ${companion.legalFirstName}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
