import type { IdentityDocument, IdentityDocumentType } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { cn } from "@tattvix/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookUser,
  Car,
  ChevronRight,
  FileQuestion,
  IdCard,
  Plus,
  UploadCloud,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  ConfirmDialog,
  EmptyState,
  Panel,
  GroupTitle,
  StatusPill,
} from "@/components/design-system";
import { DocumentEditor } from "@/features/identity-documents/components/document-editor";
import { DocumentSheet } from "@/features/identity-documents/components/document-sheet";
import { DocumentViewer } from "@/features/identity-documents/components/document-viewer";
import { PhotoViewer } from "@/features/identity-documents/components/photo-viewer";
import {
  documentTypeLabels,
  getExpiryStatus,
  maskDocumentNumber,
  summarizeDocument,
} from "@/features/identity-documents/document-model";
import { identityDocumentMutations } from "@/features/identity-documents/mutations";
import { identityDocumentQueries } from "@/features/identity-documents/queries";
import { useDocumentSave } from "@/features/identity-documents/use-document-save";
import { ApiError } from "@/lib/api";

const typeIcons: Record<IdentityDocumentType, LucideIcon> = {
  AADHAAR: IdCard,
  PASSPORT: BookUser,
  DRIVING_LICENCE: Car,
  VOTER_ID: Vote,
};

/**
 * One sheet drives every document task. `session` keys the editor so a
 * partial failure (details saved, a photo upload failed) keeps the guest's
 * picked photos and step while the editor switches to updating the draft.
 */
type SheetState =
  | { screen: "view"; id: number }
  | { screen: "edit"; id: number | null; focus?: "photos"; session: number };

export function IdentityDocumentsSection({
  companionId,
  participantName,
  embedded = false,
}: {
  companionId?: number;
  participantName?: string;
  /** Inside another sheet: render the list without its own panel chrome. */
  embedded?: boolean;
} = {}) {
  const queryClient = useQueryClient();
  const documentsQuery = useQuery(identityDocumentQueries.list(companionId));
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [photo, setPhoto] = useState<{ url: string; title: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<IdentityDocument | null>(null);
  const sessionRef = useRef(0);
  const saver = useDocumentSave(companionId, {
    onSaved: (document) => setSheet({ screen: "view", id: document.id }),
    // Details were saved; retrying updates that draft instead of creating a duplicate.
    onDraftSaved: (document) =>
      setSheet((state) => (state?.screen === "edit" ? { ...state, id: document.id } : state)),
  });
  const removeMutation = useMutation(
    identityDocumentMutations.remove(queryClient, companionId),
  );

  const documents = documentsQuery.data?.documents ?? [];
  const current =
    sheet?.id != null ? (documents.find((item) => item.id === sheet.id) ?? null) : null;

  function openEditor(id: number | null, focus?: "photos") {
    saver.reset();
    sessionRef.current += 1;
    setSheet({ screen: "edit", id, focus, session: sessionRef.current });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    removeMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success("Document deleted");
        setPendingDelete(null);
        setSheet(null);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : "The document could not be deleted.",
        );
      },
    });
  }

  const addButton = (
    <Button
      variant="outline"
      className="pointer-coarse:h-10"
      disabled={!documentsQuery.data}
      onClick={() => openEditor(null)}
    >
      <Plus />
      Add document
    </Button>
  );

  const body = documentsQuery.isPending ? (
    <p className="px-5 py-5 text-sm text-muted-foreground">Loading documents…</p>
  ) : documentsQuery.isError ? (
    <div className="grid gap-3 px-5 py-5">
      <p className="text-sm text-destructive">Documents couldn't be loaded.</p>
      <Button
        className="w-fit"
        variant="outline"
        size="sm"
        onClick={() => void documentsQuery.refetch()}
      >
        Try again
      </Button>
    </div>
  ) : documents.length ? (
    <ul className="divide-y divide-border-soft">
      {documents.map((document) => (
        <li key={document.id}>
          <DocumentRow
            document={document}
            onOpen={() => setSheet({ screen: "view", id: document.id })}
          />
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState
      icon={UploadCloud}
      title="No ID saved yet"
      description="Add Aadhaar, a passport, driving licence or voter ID once, and pick it at check-in. You can save a draft and finish it later."
      action={
        <Button onClick={() => openEditor(null)}>
          <Plus />
          Add your first document
        </Button>
      }
    />
  );

  const intro = participantName
    ? `Shared with a hotel only when you choose one of ${participantName}'s documents at check-in.`
    : "Shared with a hotel only when you choose it at check-in.";

  return (
    <>
      {embedded ? (
        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              Documents
              {documents.length ? (
                <span className="ml-1.5 font-normal text-subtle-foreground tabular-nums">
                  {documents.length}
                </span>
              ) : null}
            </h3>
            {documents.length ? addButton : null}
          </div>
          <div className="overflow-hidden rounded-lg border border-border">{body}</div>
        </section>
      ) : (
        <section className="grid gap-3">
          <GroupTitle title="Identity documents" action={documents.length ? addButton : undefined} />
          <Panel>
            <p className="border-b border-border-soft px-5 py-3 text-xs text-subtle-foreground">
              {intro}
            </p>
            {body}
          </Panel>
        </section>
      )}

      <DocumentSheet
        open={sheet !== null}
        onOpenChange={(open) => {
          if (!open && !saver.isSaving) setSheet(null);
        }}
      >
        {sheet?.screen === "edit" ? (
          <DocumentEditor
            key={sheet.session}
            document={current}
            focus={sheet.focus}
            companionId={companionId}
            isSaving={saver.isSaving}
            progress={saver.progress}
            submitError={saver.submitError}
            saveError={saver.saveError}
            onSubmit={saver.save}
            onCancel={() =>
              setSheet(current ? { screen: "view", id: current.id } : null)
            }
            onOpenPhoto={setPhoto}
          />
        ) : sheet?.screen === "view" && current ? (
          <DocumentViewer
            document={current}
            companionId={companionId}
            onEdit={() => openEditor(current.id)}
            onReplacePhotos={() => openEditor(current.id, "photos")}
            onDelete={() => setPendingDelete(current)}
            onOpenPhoto={setPhoto}
          />
        ) : null}
      </DocumentSheet>

      <PhotoViewer photo={photo} onClose={() => setPhoto(null)} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !removeMutation.isPending) setPendingDelete(null);
        }}
        title={`Delete ${
          pendingDelete?.documentType
            ? documentTypeLabels[pendingDelete.documentType]
            : "this document"
        }?`}
        description="Its details and private photos are removed from your profile. This can't be undone."
        confirmLabel={removeMutation.isPending ? "Deleting…" : "Delete document"}
        cancelLabel="Keep it"
        tone="destructive"
        pending={removeMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

/** A whole-row button: mini card tile, type, masked number, name, status. */
function DocumentRow({
  document,
  onOpen,
}: {
  document: IdentityDocument;
  onOpen: () => void;
}) {
  const Icon = document.documentType ? typeIcons[document.documentType] : FileQuestion;
  const summary = summarizeDocument(document);
  const expiry = getExpiryStatus(document.expiryDate);
  const photoCount =
    Number(document.images.front.isUploaded) + Number(document.images.back.isUploaded);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full touch-manipulation items-center gap-3 px-4 py-3.5 text-left transition-colors outline-none select-none hover:bg-muted/50 focus-visible:bg-muted/60 active:bg-muted sm:px-5"
    >
      <Icon aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">
            {document.documentType
              ? documentTypeLabels[document.documentType]
              : "Untitled document"}
          </span>
          <StatusPill tone={summary.tone}>{summary.label}</StatusPill>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          <span className="tracking-wide">{maskDocumentNumber(document.documentNumber)}</span>
          {expiry.kind === "valid" ? ` · ${expiry.label}` : null}
        </span>
        <span
          className={cn(
            "truncate text-xs",
            document.nameOnDocument ? "text-subtle-foreground" : "text-subtle-foreground italic",
          )}
        >
          {document.nameOnDocument || "Name not added"}
          {" · "}
          {photoCount === 0 ? "No photos" : photoCount === 1 ? "1 photo" : "2 photos"}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-subtle-foreground" />
    </button>
  );
}
