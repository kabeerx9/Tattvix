// The ID step chooses which saved, complete document goes to the hotel.
// Adding or editing documents (form, photos, upload) is owned by the
// identity-documents feature; this step composes it unchanged in a sheet and
// picks up new documents from the shared query cache.

import type { IdentityDocument } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@tattvix/ui/components/sheet";
import { Plus, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { StatusPill } from "@/components/design-system";
import { documentImagesLabel, documentLabel } from "@/features/check-in/format";
import { IdentityDocumentsSection } from "@/features/identity-documents/components/identity-documents-section";

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
  const [managing, setManaging] = useState(false);
  const ready = documents.filter((document) => document.readiness.isReady);

  // A document that becomes ready while the sheet is open (added or finished
  // there) is chosen for the guest, so closing the sheet lands on Continue.
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
                    <Button variant="outline" size="sm" onClick={() => setManaging(true)}>
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
        onClick={() => setManaging(true)}
      >
        {documents.length ? <Settings2 /> : <Plus />}
        {documents.length ? "Add or edit IDs" : "Add your ID"}
      </Button>

      <Sheet open={managing} onOpenChange={setManaging}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-xl">
          <SheetHeader className="pr-12">
            <SheetTitle>Your IDs</SheetTitle>
            <SheetDescription>
              Saved to your profile. Only the one you choose is shared, and only after you agree.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <IdentityDocumentsSection />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
