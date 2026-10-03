import {
  identityDocumentInputSchema,
  type IdentityDocument,
  type IdentityDocumentImageSide,
  type IdentityDocumentMissingField,
  type IdentityDocumentType,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@tattvix/ui/components/sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileImage,
  FileKey2,
  Pencil,
  Plus,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Surface } from "@/components/design-system";
import {
  DocumentImageField,
  type ImageSelection,
} from "@/features/identity-documents/components/document-image-field";
import { createIdentityDocumentsApi } from "@/features/identity-documents/api";
import {
  IdentityDocumentSaveError,
  identityDocumentMutations,
  type IdentityDocumentSaveInput,
} from "@/features/identity-documents/mutations";
import { identityDocumentQueries } from "@/features/identity-documents/queries";
import { ApiError } from "@/lib/api";

const documentTypeLabels: Record<IdentityDocumentType, string> = {
  AADHAAR: "Aadhaar",
  PASSPORT: "Passport",
  DRIVING_LICENCE: "Driving licence",
  VOTER_ID: "Voter ID",
};

const missingFieldLabels: Record<IdentityDocumentMissingField, string> = {
  documentType: "Document type",
  documentNumber: "Document number",
  nameOnDocument: "Name on document",
  issuingCountry: "Issuing country",
  expiryDate: "Valid expiry date",
  frontImage: "Front image",
  backImage: "Back image",
};

const documentRequirements: Record<
  IdentityDocumentType,
  { expiryDateRequired: boolean; backImageRequired: boolean }
> = {
  AADHAAR: { expiryDateRequired: false, backImageRequired: true },
  PASSPORT: { expiryDateRequired: true, backImageRequired: false },
  DRIVING_LICENCE: { expiryDateRequired: true, backImageRequired: true },
  VOTER_ID: { expiryDateRequired: false, backImageRequired: true },
};

type EditorState = IdentityDocument | "new" | null;

export function IdentityDocumentsSection({
  companionId,
  participantName,
}: {
  companionId?: number;
  participantName?: string;
} = {}) {
  const queryClient = useQueryClient();
  const documentsQuery = useQuery(identityDocumentQueries.list(companionId));
  const [editor, setEditor] = useState<EditorState>(null);
  const saveMutation = useMutation(
    identityDocumentMutations.save(queryClient, companionId),
  );
  const removeMutation = useMutation(
    identityDocumentMutations.remove(queryClient, companionId),
  );

  function saveDocument(input: IdentityDocumentSaveInput) {
    saveMutation.mutate(input, {
      onSuccess: () => {
        toast.success(
          input.documentId ? "Identity document updated" : "Identity document added",
        );
        setEditor(null);
      },
      onError: (error) => {
        if (error instanceof IdentityDocumentSaveError) {
          setEditor(error.document);
        }
      },
    });
  }

  function removeDocument(document: IdentityDocument) {
    removeMutation.mutate(document.id, {
      onSuccess: () => {
        toast.success("Identity document removed");
        setEditor(null);
      },
    });
  }

  const mutationError = saveMutation.error ?? removeMutation.error;
  const errorMessage =
    mutationError instanceof IdentityDocumentSaveError
      ? mutationError.message
      : mutationError instanceof ApiError
      ? mutationError.message
      : mutationError
        ? "The identity document could not be saved."
        : null;

  return (
    <Surface className="grid gap-5 p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
            <FileKey2 className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Government identity documents</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              {participantName
                ? `${participantName}'s documents stay private and are shared with a hotel only when you select them for a check-in.`
                : "Images stay private. Tattwix creates short-lived access only when you choose to view or share them."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          disabled={!documentsQuery.data}
          onClick={() => setEditor("new")}
        >
          <Plus />
          Add document
        </Button>
      </div>

      {documentsQuery.isPending ? (
        <div className="rounded-2xl bg-muted/60 p-5 text-sm text-muted-foreground">
          Loading identity documents...
        </div>
      ) : documentsQuery.isError ? (
        <div className="grid gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
          <p className="text-sm text-destructive">
            The identity documents could not be loaded.
          </p>
          <Button
            className="w-fit"
            variant="outline"
            size="sm"
            onClick={() => void documentsQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : documentsQuery.data.documents.length ? (
        <div className="grid gap-3">
          {documentsQuery.data.documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onEdit={() => setEditor(document)}
            />
          ))}
        </div>
      ) : (
        <div className="grid place-items-center gap-3 rounded-2xl bg-muted/60 p-7 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-background text-primary ring-1 ring-border">
            <UploadCloud className="size-5" />
          </span>
          <div className="max-w-md">
            <h3 className="text-sm font-semibold">No identity document yet</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Add Aadhaar, a passport, driving licence, or voter ID. You may
              save an incomplete draft and finish it later.
            </p>
          </div>
          <Button onClick={() => setEditor("new")}>
            <Plus />
            Add your first document
          </Button>
        </div>
      )}

      <Sheet
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editor === "new" ? "Add identity document" : "Edit identity document"}
            </SheetTitle>
            <SheetDescription>
              Metadata is saved in Tattwix. Images upload directly to private
              storage and are verified before becoming part of your profile.
            </SheetDescription>
          </SheetHeader>
          {editor ? (
            <DocumentEditor
              key={editor === "new" ? "new" : editor.id}
              document={editor === "new" ? null : editor}
              isSaving={saveMutation.isPending}
              isRemoving={removeMutation.isPending}
              submitError={errorMessage}
              companionId={companionId}
              onSubmit={saveDocument}
              onRemove={
                editor === "new" ? undefined : () => removeDocument(editor)
              }
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </Surface>
  );
}

function DocumentCard({
  document,
  onEdit,
}: {
  document: IdentityDocument;
  onEdit: () => void;
}) {
  const typeLabel = document.documentType
    ? documentTypeLabels[document.documentType]
    : "Document type pending";

  return (
    <div className="grid gap-4 rounded-2xl border bg-muted/40 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-foreground ring-1 ring-border">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{typeLabel}</h3>
            {document.readiness.isReady ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                <CheckCircle2 className="size-3.5" />
                Profile ready
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {document.readiness.missingFields.length} item
                {document.readiness.missingFields.length === 1 ? "" : "s"} needed
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {maskDocumentNumber(document.documentNumber)}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <ImageStatus
              label="Front"
              uploaded={document.images.front.isUploaded}
            />
            {document.requirements.backImageRequired ||
            document.images.back.isUploaded ? (
              <ImageStatus
                label="Back"
                uploaded={document.images.back.isUploaded}
              />
            ) : null}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Pencil />
        Manage
      </Button>
    </div>
  );
}

function ImageStatus({
  label,
  uploaded,
}: {
  label: string;
  uploaded: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <FileImage className="size-3.5" />
      {label}: {uploaded ? "uploaded" : "needed"}
    </span>
  );
}

function DocumentEditor({
  document,
  isSaving,
  isRemoving,
  submitError,
  companionId,
  onSubmit,
  onRemove,
}: {
  document: IdentityDocument | null;
  isSaving: boolean;
  isRemoving: boolean;
  submitError: string | null;
  companionId?: number;
  onSubmit: (input: IdentityDocumentSaveInput) => void;
  onRemove?: () => void;
}) {
  const [documentType, setDocumentType] = useState(document?.documentType ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [images, setImages] = useState<
    Partial<Record<IdentityDocumentImageSide, ImageSelection>>
  >({});
  const [imageErrors, setImageErrors] = useState<
    Partial<Record<IdentityDocumentImageSide, string>>
  >({});
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [preview, setPreview] = useState<{
    side: IdentityDocumentImageSide;
    url: string;
  } | null>(null);
  const api = createIdentityDocumentsApi(companionId);
  const accessMutation = useMutation({
    mutationFn: ({
      documentId,
      side,
    }: {
      documentId: number;
      side: IdentityDocumentImageSide;
    }) => api.getImageAccess(documentId, side),
    onSuccess: (access, variables) => {
      setPreview({ side: variables.side, url: access.url });
    },
  });

  const requirements = documentType
    ? documentRequirements[documentType as IdentityDocumentType]
    : { expiryDateRequired: false, backImageRequired: false };
  const showBackImage =
    requirements.backImageRequired || Boolean(document?.images.back.isUploaded);
  const isPreparingImage = Object.values(images).some(
    (selection) => selection.status === "processing",
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const formData = new FormData(event.currentTarget);
    const parsed = identityDocumentInputSchema.safeParse({
      documentType,
      documentNumber: formData.get("documentNumber"),
      nameOnDocument: formData.get("nameOnDocument"),
      issuingCountry: formData.get("issuingCountry"),
      expiryDate: formData.get("expiryDate") || null,
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        nextErrors[issue.path.join(".")] ??= issue.message;
      }
    }

    setFieldErrors(nextErrors);
    if (!parsed.success || isPreparingImage) return;

    const files: Partial<Record<IdentityDocumentImageSide, File>> = {};
    for (const [side, selection] of Object.entries(images) as [
      IdentityDocumentImageSide,
      ImageSelection,
    ][]) {
      // A back photo picked before switching to a front-only type is dropped.
      if (side === "BACK" && !showBackImage) continue;
      if (selection.status === "ready") files[side] = selection.file;
    }

    onSubmit({
      ...(document ? { documentId: document.id } : {}),
      input: parsed.data,
      files,
    });
  }

  function imageFieldHandlers(side: IdentityDocumentImageSide) {
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

  const accessError =
    accessMutation.error instanceof ApiError
      ? accessMutation.error.message
      : accessMutation.isError
        ? "The private image could not be opened."
        : null;

  return (
    <form className="grid min-h-0 flex-1 gap-5 px-4 pb-4" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <EditorField
          label="Document type"
          required
          error={fieldErrors.documentType}
        >
          <Select
            value={documentType || null}
            onValueChange={(value) => setDocumentType(value ?? "")}
          >
            <SelectTrigger aria-invalid={Boolean(fieldErrors.documentType)}>
              <SelectValue placeholder="Select a document type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EditorField>

        <EditorField
          label="Document number"
          required
          error={fieldErrors.documentNumber}
          hint="Stored privately and never included in image URLs or logs."
        >
          <Input
            name="documentNumber"
            defaultValue={document?.documentNumber ?? ""}
            maxLength={64}
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.documentNumber)}
          />
        </EditorField>

        <EditorField
          label="Name on document"
          required
          error={fieldErrors.nameOnDocument}
        >
          <Input
            name="nameOnDocument"
            defaultValue={document?.nameOnDocument ?? ""}
            maxLength={300}
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.nameOnDocument)}
          />
        </EditorField>

        <div className="grid gap-4 sm:grid-cols-2">
          <EditorField
            label="Issuing country"
            required
            error={fieldErrors.issuingCountry}
            hint="Two-letter code, such as IN."
          >
            <Input
              name="issuingCountry"
              defaultValue={document?.issuingCountry ?? ""}
              maxLength={2}
              autoCapitalize="characters"
              placeholder="IN"
              aria-invalid={Boolean(fieldErrors.issuingCountry)}
            />
          </EditorField>
          {requirements.expiryDateRequired || document?.expiryDate ? (
            <EditorField
              label="Expiry date"
              required={requirements.expiryDateRequired}
              error={fieldErrors.expiryDate}
              hint="An expired document will not count as ready."
            >
              <Input
                name="expiryDate"
                type="date"
                defaultValue={document?.expiryDate ?? ""}
                aria-invalid={Boolean(fieldErrors.expiryDate)}
              />
            </EditorField>
          ) : (
            <input name="expiryDate" type="hidden" value="" />
          )}
        </div>
      </div>

      <div className="grid gap-3 border-t pt-5">
        <div>
          <h3 className="text-sm font-semibold">Private document images</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Take a clear photo of the whole card, or choose one from your
            files. Photos are resized on this device before upload.
          </p>
        </div>
        <DocumentImageField
          name="frontImage"
          label="Front image"
          required
          uploaded={document?.images.front.isUploaded ?? false}
          {...imageFieldHandlers("FRONT")}
          isAccessPending={
            accessMutation.isPending &&
            accessMutation.variables?.side === "FRONT"
          }
          onView={
            document?.images.front.isUploaded
              ? () =>
                  accessMutation.mutate({
                    documentId: document.id,
                    side: "FRONT",
                  })
              : undefined
          }
        />
        {showBackImage ? (
          <DocumentImageField
            name="backImage"
            label="Back image"
            required={requirements.backImageRequired}
            uploaded={document?.images.back.isUploaded ?? false}
            {...imageFieldHandlers("BACK")}
            isAccessPending={
              accessMutation.isPending &&
              accessMutation.variables?.side === "BACK"
            }
            onView={
              document?.images.back.isUploaded
                ? () =>
                    accessMutation.mutate({
                      documentId: document.id,
                      side: "BACK",
                    })
                : undefined
            }
          />
        ) : null}
      </div>

      {preview ? (
        <div className="grid gap-2 rounded-2xl bg-muted/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium">
              {preview.side === "FRONT" ? "Front" : "Back"} preview
            </p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setPreview(null)}
            >
              Close preview
            </Button>
          </div>
          <img
            src={preview.url}
            alt={`Private ${preview.side.toLowerCase()} document preview`}
            className="max-h-72 w-full rounded-xl object-contain"
          />
          <p className="text-xs text-muted-foreground">
            This access link expires automatically.
          </p>
        </div>
      ) : null}

      {submitError || accessError ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {submitError ?? accessError}
        </p>
      ) : null}

      <SheetFooter className="sticky bottom-0 z-10 mt-0 border-t bg-popover px-0 pt-4">
        {onRemove ? (
          confirmingRemoval ? (
            <div className="flex w-full items-center justify-between gap-2">
              <p className="text-xs text-destructive">
                Delete this document and its private images?
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isRemoving}
                  onClick={() => setConfirmingRemoval(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isRemoving}
                  onClick={onRemove}
                >
                  {isRemoving ? "Deleting..." : "Confirm delete"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-destructive hover:text-destructive"
              disabled={isRemoving}
              onClick={() => setConfirmingRemoval(true)}
            >
              Delete document
            </Button>
          )
        ) : null}
        {!confirmingRemoval ? (
          <Button type="submit" disabled={isSaving || isPreparingImage}>
            {isSaving
              ? "Saving and uploading..."
              : isPreparingImage
                ? "Preparing photo..."
                : document
                ? "Save changes"
                : "Add document"}
          </Button>
        ) : null}
      </SheetFooter>
    </form>
  );
}

function EditorField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function maskDocumentNumber(value: string): string {
  if (!value) return "Document number not added";
  if (value.length <= 4) return `•••• ${value}`;
  return `•••• ${value.slice(-4)}`;
}
