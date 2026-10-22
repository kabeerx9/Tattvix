// The ID step chooses which saved, complete document goes to the hotel.
// Adding or finishing a document (form, photos, upload) is owned by the
// identity-documents feature; this step opens its editor in a bottom sheet
// and picks up saved documents from the shared query cache.

import type { IdentityDocument } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { StatusPill } from "@/components/design-system";
import { documentImagesLabel, documentLabel } from "@/features/check-in/format";
import { DocumentEditorSheet } from "@/features/identity-documents/components/document-editor-sheet";

import { ChoiceCard } from "./check-in-choice-card";

export function DocumentStep({
  documents,
  documentId,
  showError,
  onSelect,
}: {
  documents: IdentityDocument[];
  documentId: number | null;
  showError: boolean;
  onSelect: (id: number) => void;
}) {
  // null: closed; "new": adding; a document: finishing that one.
  const [editing, setEditing] = useState<IdentityDocument | "new" | null>(null);
  const ready = documents.filter((document) => document.readiness.isReady);

  // A document that becomes ready in the editor (added or finished there) is
  // chosen for the guest, so closing the sheet lands on Continue.
  const knownReady = useRef(new Set(ready.map((document) => document.id)));
  useEffect(() => {
    const fresh = ready.find((document) => !knownReady.current.has(document.id));
    knownReady.current = new Set(ready.map((document) => document.id));
    if (fresh) onSelect(fresh.id);
    else if (documentId === null && ready[0]) onSelect(ready[0].id);
  }, [ready, documentId, onSelect]);

  return (
    <div className="grid gap-4">
      {/* Aadhaar (Sharing of Information) Regulations reg 5(1)(b): say it is optional and name the alternatives. */}
      <p className="text-[13px] leading-5 text-subtle-foreground">
        Aadhaar is optional. A passport, driving licence or voter ID works too.
      </p>

      {documents.length ? (
        <div className="grid gap-3" role="radiogroup" aria-label="ID to share">
          {documents.map((document) => {
            const isReady = document.readiness.isReady;
            const missing = document.readiness.missingFields.length;
            return (
              <ChoiceCard
                key={document.id}
                type="radio"
                name="identity-document"
                checked={isReady && document.id === documentId}
                disabled={!isReady}
                onCheckedChange={(checked) => checked && onSelect(document.id)}
                title={documentLabel(document)}
                description={
                  isReady
                    ? `Ready, with ${documentImagesLabel(document)}`
                    : `${missing} ${missing === 1 ? "detail" : "details"} needed before it can be shared`
                }
              >
                {isReady ? null : (
                  <div className="flex items-center justify-between gap-3">
                    <StatusPill tone="warning">Incomplete</StatusPill>
                    <Button variant="outline" size="sm" onClick={() => setEditing(document)}>
                      Finish this ID
                    </Button>
                  </div>
                )}
              </ChoiceCard>
            );
          })}
        </div>
      ) : null}

      {showError ? (
        <p role="alert" className="text-[13px] text-destructive">
          {ready.length ? "Choose the ID to share with the hotel." : "Add an ID with its photos to continue."}
        </p>
      ) : null}

      <Button
        variant={documents.length ? "outline" : "default"}
        className="h-12 w-full text-[15px]"
        onClick={() => setEditing("new")}
      >
        <Plus />
        {documents.length ? "Add another ID" : "Add your ID"}
      </Button>

      <DocumentEditorSheet
        open={editing !== null}
        onOpenChange={(open) => (open ? null : setEditing(null))}
        document={editing === "new" ? null : editing}
        presentation="bottom"
        onSaved={(saved) => {
          if (saved.readiness.isReady) onSelect(saved.id);
        }}
      />
    </div>
  );
}
