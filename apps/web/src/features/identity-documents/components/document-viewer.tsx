import type { IdentityDocument, IdentityDocumentImageSide } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Skeleton } from "@tattvix/ui/components/skeleton";
import { ImageOff, Pencil, RefreshCw, Trash2 } from "lucide-react";

import { StatusPill } from "@/components/design-system";
import { DocumentSheetFrame } from "@/features/identity-documents/components/document-sheet";
import {
  documentTypeLabels,
  formatIsoDate,
  getExpiryStatus,
  maskDocumentNumber,
  missingFieldLabels,
  photoSlots,
  sideLabel,
  summarizeDocument,
} from "@/features/identity-documents/document-model";
import { useSavedPhoto } from "@/features/identity-documents/use-saved-photo";

/**
 * Read view of one saved document: both photos at card proportions (tap for
 * full screen), the facts, what's still missing, and the actions. The number
 * is masked here as everywhere else.
 */
export function DocumentViewer({
  document,
  companionId,
  onEdit,
  onReplacePhotos,
  onDelete,
  onOpenPhoto,
}: {
  document: IdentityDocument;
  companionId?: number;
  onEdit: () => void;
  onReplacePhotos: () => void;
  onDelete: () => void;
  onOpenPhoto: (photo: { url: string; title: string }) => void;
}) {
  const typeLabel = document.documentType
    ? documentTypeLabels[document.documentType]
    : "Untitled document";
  const summary = summarizeDocument(document);
  const expiry = getExpiryStatus(document.expiryDate);
  const slots = photoSlots(document.documentType, document.images.back.isUploaded);
  const missing = document.readiness.missingFields;

  return (
    <DocumentSheetFrame
      title={typeLabel}
      meta={<span className="tabular-nums tracking-wide">{maskDocumentNumber(document.documentNumber)}</span>}
      footer={
        <Button className="h-11 w-full text-sm" onClick={onEdit}>
          <Pencil />
          {document.readiness.isReady ? "Edit details" : "Finish document"}
        </Button>
      }
    >
      <div className="grid gap-6 px-4 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={summary.tone}>{summary.label}</StatusPill>
          {expiry.kind === "expired" ? (
            <span className="text-xs text-destructive">
              A hotel can't accept an expired document.
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {slots.map((side) => (
            <ViewerPhoto
              key={side}
              document={document}
              side={side}
              companionId={companionId}
              onOpen={onOpenPhoto}
            />
          ))}
        </div>
        <Button
          variant="outline"
          className="h-11 w-full text-sm sm:h-9 sm:w-fit"
          onClick={onReplacePhotos}
        >
          <RefreshCw />
          {document.images.front.isUploaded ? "Replace photos" : "Add photos"}
        </Button>

        <dl className="grid gap-4 border-t border-border-soft pt-5 sm:grid-cols-2">
          <ViewerFact label="Name on document" value={document.nameOnDocument || "Not added"} />
          <ViewerFact label="Issuing country" value={document.issuingCountry || "Not added"} />
          {document.expiryDate || document.requirements.expiryDateRequired ? (
            <ViewerFact
              label="Expiry date"
              value={document.expiryDate ? formatIsoDate(document.expiryDate) : "Not added"}
            />
          ) : null}
        </dl>

        {missing.length ? (
          <div className="grid gap-2 border-t border-border-soft pt-5">
            <h3 className="text-sm font-semibold">Still needed</h3>
            <ul className="grid gap-1.5 text-sm text-muted-foreground">
              {missing.map((field) => (
                <li key={field} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-warning" aria-hidden />
                  {missingFieldLabels[field]}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="border-t border-border-soft pt-5">
          <Button
            variant="ghost"
            className="-ml-2.5 h-11 text-sm text-destructive hover:bg-destructive-tint hover:text-destructive sm:h-9"
            onClick={onDelete}
          >
            <Trash2 />
            Delete document
          </Button>
        </div>
      </div>
    </DocumentSheetFrame>
  );
}

function ViewerPhoto({
  document,
  side,
  companionId,
  onOpen,
}: {
  document: IdentityDocument;
  side: IdentityDocumentImageSide;
  companionId?: number;
  onOpen: (photo: { url: string; title: string }) => void;
}) {
  const photo = useSavedPhoto(document, side, companionId);
  const label = sideLabel(side, document.documentType);
  const title = `${label} photo`;

  return (
    <figure className="grid gap-1.5">
      {photo.url ? (
        <button
          type="button"
          className="block aspect-[1.586] w-full overflow-hidden rounded-lg bg-muted ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View ${title.toLowerCase()} full screen`}
          onClick={() => onOpen({ url: photo.url!, title })}
        >
          <img src={photo.url} alt="" className="size-full object-contain" draggable={false} />
        </button>
      ) : photo.isLoading ? (
        <Skeleton className="aspect-[1.586] w-full rounded-lg" />
      ) : (
        <div className="grid aspect-[1.586] w-full place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground">
          <span className="grid justify-items-center gap-1.5 text-xs">
            <ImageOff className="size-5" strokeWidth={1.75} />
            {photo.isUploaded ? "Photo couldn't be loaded" : "No photo yet"}
          </span>
        </div>
      )}
      <figcaption className="text-xs text-subtle-foreground">{label}</figcaption>
    </figure>
  );
}

function ViewerFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="text-sm font-medium [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}
