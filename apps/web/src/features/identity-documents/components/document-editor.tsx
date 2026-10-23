import {
  identityDocumentInputSchema,
  type IdentityDocument,
  type IdentityDocumentImageSide,
  type IdentityDocumentType,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { cn } from "@tattvix/ui/lib/utils";
import {
  BookUser,
  Car,
  Check,
  ChevronRight,
  IdCard,
  LoaderCircle,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  DocumentPhotoSlot,
  type ImageSelection,
} from "@/features/identity-documents/components/document-image-field";
import { DocumentSheetFrame } from "@/features/identity-documents/components/document-sheet";
import {
  documentNumberFieldProps,
  documentTypeHint,
  documentTypeLabels,
  documentTypes,
  getExpiryStatus,
  maskDocumentNumber,
  photoSlots,
  requirementsFor,
  showsExpiry,
  sideLabel,
} from "@/features/identity-documents/document-model";
import type {
  IdentityDocumentSaveInput,
  IdentityDocumentSaveProgress,
} from "@/features/identity-documents/mutations";
import { useSavedPhoto } from "@/features/identity-documents/use-saved-photo";

const typeIcons: Record<IdentityDocumentType, LucideIcon> = {
  AADHAAR: IdCard,
  PASSPORT: BookUser,
  DRIVING_LICENCE: Car,
  VOTER_ID: Vote,
};

/**
 * New documents go one task per screen: type → details → photos, which is
 * what a phone camera flow needs. Editing an existing document shows details
 * and photos on one screen with the type as a changeable row.
 */
type Step = "type" | "details" | "photos" | "edit";

export function DocumentEditor({
  document,
  focus,
  companionId,
  isSaving,
  progress,
  submitError,
  onSubmit,
  onCancel,
  onOpenPhoto,
}: {
  /** Null for a new document. Becomes the saved draft if a photo upload fails. */
  document: IdentityDocument | null;
  /** Scroll to the photos when the editor was opened from "Replace photo". */
  focus?: "photos";
  companionId?: number;
  isSaving: boolean;
  progress: IdentityDocumentSaveProgress | null;
  submitError: string | null;
  onSubmit: (input: IdentityDocumentSaveInput) => void;
  /** Leaves the editor: back to the document, or closes the sheet for a new one. */
  onCancel: () => void;
  onOpenPhoto: (photo: { url: string; title: string }) => void;
}) {
  const formId = useId();
  // Fixed for the editor's lifetime, so a draft saved by a failed upload keeps
  // the step-by-step flow instead of jumping layouts mid-task.
  const [isNew] = useState(document === null);
  const [step, setStep] = useState<Step>(isNew ? "type" : "edit");
  const [documentType, setDocumentType] = useState<IdentityDocumentType | "">(
    document?.documentType ?? "",
  );
  // A saved number is only ever shown masked. Typing a new one replaces it.
  const [isEditingNumber, setIsEditingNumber] = useState(!document?.documentNumber);
  const [documentNumber, setDocumentNumber] = useState("");
  const [nameOnDocument, setNameOnDocument] = useState(document?.nameOnDocument ?? "");
  const [issuingCountry, setIssuingCountry] = useState(document?.issuingCountry || "IN");
  const [expiryDate, setExpiryDate] = useState(document?.expiryDate ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [images, setImages] = useState<
    Partial<Record<IdentityDocumentImageSide, ImageSelection>>
  >({});
  const [imageErrors, setImageErrors] = useState<
    Partial<Record<IdentityDocumentImageSide, string>>
  >({});
  const photosRef = useRef<HTMLDivElement>(null);

  const savedFront = useSavedPhoto(document, "FRONT", companionId);
  const savedBack = useSavedPhoto(document, "BACK", companionId);

  useEffect(() => {
    if (focus === "photos") photosRef.current?.scrollIntoView({ block: "start" });
  }, [focus]);

  const requirements = requirementsFor(documentType);
  const slots = photoSlots(documentType, Boolean(document?.images.back.isUploaded));
  const expiryVisible = showsExpiry(documentType, document?.expiryDate);
  const isPreparingImage = Object.values(images).some(
    (selection) => selection.status === "processing",
  );

  function parseInput() {
    const parsed = identityDocumentInputSchema.safeParse({
      documentType,
      documentNumber: isEditingNumber ? documentNumber : (document?.documentNumber ?? ""),
      nameOnDocument,
      issuingCountry,
      expiryDate: expiryVisible ? expiryDate || null : null,
    });
    const errors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors[issue.path.join(".")] ??= issue.message;
      }
    }
    setFieldErrors(errors);
    return parsed;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "details") {
      if (parseInput().success) setStep("photos");
      return;
    }
    const parsed = parseInput();
    if (!parsed.success) {
      setStep(isNew ? "details" : "edit");
      return;
    }
    if (isPreparingImage) return;

    const files: Partial<Record<IdentityDocumentImageSide, File>> = {};
    for (const [side, selection] of Object.entries(images) as [
      IdentityDocumentImageSide,
      ImageSelection,
    ][]) {
      // A back photo picked before switching to a front-only type is dropped.
      if (!slots.includes(side)) continue;
      if (selection.status === "ready") files[side] = selection.file;
    }

    onSubmit({
      ...(document ? { documentId: document.id } : {}),
      input: parsed.data,
      files,
    });
  }

  function chooseType(type: IdentityDocumentType) {
    setDocumentType(type);
    setFieldErrors((current) => ({ ...current, documentType: "" }));
    setStep(isNew ? "details" : "edit");
  }

  function slotHandlers(side: IdentityDocumentImageSide) {
    return {
      selection: images[side] ?? null,
      error: imageErrors[side],
      onSelectionChange: (selection: ImageSelection | null) =>
        setImages((current) => {
          const next = { ...current };
          if (selection) next[side] = selection;
          else delete next[side];
          return next;
        }),
      onError: (message: string | undefined) =>
        setImageErrors((current) => ({ ...current, [side]: message })),
    };
  }

  const typeLabel = documentType ? documentTypeLabels[documentType] : "Document";

  if (step === "type") {
    return (
      <DocumentSheetFrame
        title="Which document?"
        meta={isNew ? "Step 1 of 3" : undefined}
        onBack={isNew ? undefined : () => setStep("edit")}
      >
        <TypePicker value={documentType} onChange={chooseType} />
      </DocumentSheetFrame>
    );
  }

  const title =
    step === "details"
      ? `${typeLabel} details`
      : step === "photos"
        ? `${typeLabel} photos`
        : `Edit ${typeLabel === "Document" ? "document" : typeLabel}`;

  const meta =
    step === "details" ? "Step 2 of 3" : step === "photos" ? "Step 3 of 3" : undefined;

  const back =
    step === "details"
      ? () => setStep("type")
      : step === "photos"
        ? () => setStep("details")
        : onCancel;

  const detailsFields = (
    <div className="grid gap-5">
      {!isNew ? (
        <button
          type="button"
          onClick={() => setStep("type")}
          className="flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-lg border border-border px-3 text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-subtle-foreground">Document type</span>
            <span className="block text-sm font-medium">
              {documentType ? documentTypeLabels[documentType] : "Choose a type"}
            </span>
          </span>
          <span className="text-sm text-primary">Change</span>
        </button>
      ) : null}

      <Field
        id={`${formId}-number`}
        label="Document number"
        error={fieldErrors.documentNumber}
        hint={
          documentType === "AADHAAR" && isEditingNumber
            ? "Enter all 12 digits. We keep only the last 4."
            : undefined
        }
      >
        {isEditingNumber ? (
          <Input
            id={`${formId}-number`}
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            className="pointer-coarse:h-11 tabular-nums"
            aria-invalid={Boolean(fieldErrors.documentNumber)}
            autoFocus={!isNew && Boolean(document?.documentNumber)}
            {...documentNumberFieldProps(documentType)}
          />
        ) : (
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3">
            <span className="text-sm tabular-nums tracking-wide">
              {maskDocumentNumber(document?.documentNumber ?? "")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-1.5 h-9 text-sm text-primary"
              onClick={() => setIsEditingNumber(true)}
            >
              Change
            </Button>
          </div>
        )}
      </Field>

      <Field
        id={`${formId}-name`}
        label="Name on document"
        hint="Exactly as printed."
        error={fieldErrors.nameOnDocument}
      >
        <Input
          id={`${formId}-name`}
          value={nameOnDocument}
          onChange={(event) => setNameOnDocument(event.target.value)}
          maxLength={300}
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          className="pointer-coarse:h-11"
          aria-invalid={Boolean(fieldErrors.nameOnDocument)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${formId}-country`}
          label="Issuing country"
          hint="Two-letter code, such as IN."
          error={fieldErrors.issuingCountry}
        >
          <Input
            id={`${formId}-country`}
            value={issuingCountry}
            onChange={(event) => setIssuingCountry(event.target.value)}
            maxLength={2}
            autoCapitalize="characters"
            autoComplete="country"
            autoCorrect="off"
            spellCheck={false}
            placeholder="IN"
            className="pointer-coarse:h-11 uppercase"
            aria-invalid={Boolean(fieldErrors.issuingCountry)}
          />
        </Field>
        {expiryVisible ? (
          <Field
            id={`${formId}-expiry`}
            label={requirements.expiryDateRequired ? "Expiry date" : "Expiry date (optional)"}
            error={fieldErrors.expiryDate}
          >
            <Input
              id={`${formId}-expiry`}
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              className="pointer-coarse:h-11"
              aria-invalid={Boolean(fieldErrors.expiryDate)}
            />
            <ExpiryHint expiryDate={expiryDate} />
          </Field>
        ) : null}
      </div>
    </div>
  );

  const photoFields = (
    <div ref={photosRef} className="grid scroll-mt-4 gap-6">
      {slots.map((side) => (
        <DocumentPhotoSlot
          key={side}
          label={sideLabel(side, documentType)}
          required={side === "FRONT" || requirements.backImageRequired}
          saved={side === "FRONT" ? savedFront : savedBack}
          disabled={isSaving}
          onOpen={onOpenPhoto}
          {...slotHandlers(side)}
        />
      ))}
      <p className="text-xs leading-5 text-subtle-foreground">
        Photos stay private. They're resized on this device before upload and
        shared with a hotel only when you choose this document at check-in.
      </p>
    </div>
  );

  return (
    <DocumentSheetFrame
      title={title}
      meta={meta}
      onBack={isSaving ? undefined : back}
      footer={
        <SubmitFooter
          formId={formId}
          step={step}
          isSaving={isSaving}
          isPreparingImage={isPreparingImage}
          progress={progress}
          submitError={submitError}
          isNew={isNew}
        />
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <fieldset disabled={isSaving} className="grid gap-8 px-4 py-5">
          {step === "details" ? detailsFields : null}
          {step === "photos" ? photoFields : null}
          {step === "edit" ? (
            <>
              {detailsFields}
              <section className="grid gap-4 border-t border-border-soft pt-6">
                <h3 className="text-sm font-semibold">Photos</h3>
                {photoFields}
              </section>
            </>
          ) : null}
        </fieldset>
      </form>
    </DocumentSheetFrame>
  );
}

function TypePicker({
  value,
  onChange,
}: {
  value: IdentityDocumentType | "";
  onChange: (type: IdentityDocumentType) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Document type" className="grid gap-2 px-4 py-5">
      {documentTypes.map((type) => {
        const Icon = typeIcons[type];
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={cn(
              "flex min-h-16 w-full touch-manipulation items-center gap-3 rounded-lg border px-3 py-3 text-left transition-[background-color,border-color,scale] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted motion-safe:active:scale-[0.99]",
              selected ? "border-foreground bg-card ring-1 ring-foreground" : "border-border bg-card hover:bg-muted/60",
            )}
          >
            <Icon aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{documentTypeLabels[type]}</span>
              <span className="block text-xs text-muted-foreground">{documentTypeHint(type)}</span>
            </span>
            {selected ? (
              <Check className="size-5 text-foreground" />
            ) : (
              <ChevronRight className="size-4 text-subtle-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function ExpiryHint({ expiryDate }: { expiryDate: string }) {
  const status = getExpiryStatus(expiryDate || null);
  if (status.kind === "expired") {
    return (
      <p className="text-xs text-destructive">
        Expired. A hotel can't accept an expired document.
      </p>
    );
  }
  if (status.kind === "expiring") {
    return <p className="text-xs text-warning">{status.label}.</p>;
  }
  return null;
}

function SubmitFooter({
  formId,
  step,
  isSaving,
  isPreparingImage,
  progress,
  submitError,
  isNew,
}: {
  formId: string;
  step: Step;
  isSaving: boolean;
  isPreparingImage: boolean;
  progress: IdentityDocumentSaveProgress | null;
  submitError: string | null;
  isNew: boolean;
}) {
  const progressValue = !isSaving
    ? 0
    : progress?.stage === "photos"
      ? (progress.uploaded + 1) / (progress.total + 1)
      : 0.15;
  const savingLabel =
    progress?.stage === "photos"
      ? `Uploading photo ${Math.min(progress.uploaded + 1, progress.total)} of ${progress.total}…`
      : "Saving details…";

  return (
    <div className="grid w-full gap-3">
      {submitError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive-tint p-3 text-sm text-destructive"
        >
          {submitError}
        </p>
      ) : null}
      {isSaving ? (
        <div
          role="progressbar"
          aria-label="Saving document"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressValue * 100)}
          className="h-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full origin-left rounded-full bg-foreground transition-transform duration-200 ease-out motion-reduce:transition-none"
            style={{ transform: `scaleX(${progressValue})` }}
          />
        </div>
      ) : null}
      <Button
        type="submit"
        form={formId}
        className="h-11 w-full text-sm"
        disabled={isSaving || isPreparingImage}
      >
        {isSaving ? (
          <>
            <LoaderCircle className="animate-spin" />
            {savingLabel}
          </>
        ) : isPreparingImage ? (
          "Preparing photo…"
        ) : step === "details" ? (
          "Continue to photos"
        ) : isNew ? (
          "Save document"
        ) : (
          "Save changes"
        )}
      </Button>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-subtle-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
