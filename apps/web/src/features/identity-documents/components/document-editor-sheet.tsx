import type { IdentityDocument } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { DocumentEditor } from "@/features/identity-documents/components/document-editor";
import { DocumentSheet } from "@/features/identity-documents/components/document-sheet";
import { PhotoViewer } from "@/features/identity-documents/components/photo-viewer";
import { identityDocumentQueries } from "@/features/identity-documents/queries";
import { useDocumentSave } from "@/features/identity-documents/use-document-save";

/**
 * The add/edit document flow on its own, for screens that pick a document
 * rather than manage the list (check-in). `document` null adds a new one.
 * `onSaved` receives the saved document; the sheet closes itself after.
 */
export function DocumentEditorSheet({
  open,
  onOpenChange,
  document,
  companionId,
  presentation = "page",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: IdentityDocument | null;
  companionId?: number;
  presentation?: "page" | "bottom";
  onSaved?: (document: IdentityDocument) => void;
}) {
  // A partial failure saves a draft; later saves must update that draft.
  const [draftId, setDraftId] = useState<number | null>(null);
  const documentsQuery = useQuery(identityDocumentQueries.list(companionId));
  const saver = useDocumentSave(companionId, {
    onSaved: (saved) => {
      onSaved?.(saved);
      close();
    },
    onDraftSaved: (draft) => setDraftId(draft.id),
  });

  function close() {
    setDraftId(null);
    saver.reset();
    onOpenChange(false);
  }
  const [photo, setPhoto] = useState<{ url: string; title: string } | null>(null);

  // A fresh editor each time the sheet opens.
  const session = useRef(0);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) session.current += 1;
  wasOpen.current = open;

  const id = draftId ?? document?.id ?? null;
  const current =
    id === null
      ? null
      : (documentsQuery.data?.documents.find((item) => item.id === id) ?? document);

  return (
    <>
      <DocumentSheet
        open={open}
        presentation={presentation}
        onOpenChange={(next) => {
          if (!next && !saver.isSaving) close();
        }}
      >
        <DocumentEditor
            key={session.current}
            document={current}
            companionId={companionId}
            isSaving={saver.isSaving}
            progress={saver.progress}
            submitError={saver.submitError}
            onSubmit={saver.save}
            onCancel={close}
            onOpenPhoto={setPhoto}
          />
      </DocumentSheet>
      <PhotoViewer photo={photo} onClose={() => setPhoto(null)} />
    </>
  );
}
