// Add or edit an identity document: type, number, name, issuing country,
// optional expiry, and a photo per side. Mirrors
// apps/web/src/features/identity-documents/components/document-editor.tsx, on one
// screen (the web splits new documents into steps).
import {
  documentNumberFieldProps,
  documentTypeHint,
  documentTypes,
  getExpiryStatus,
  identityDocumentTypeLabels,
  maskDocumentNumber,
  photoSlots,
  showsExpiry,
  sideLabel,
} from "@tattvix/api";
import { identityDocumentInputSchema, type IdentityDocument, type IdentityDocumentImageSide, type IdentityDocumentType } from "@tattvix/contracts";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, PillTabs, Spinner, TextField, TextLink, colors, radii, space, toast, type, useFocusChain } from "@/src/design-system";
import { errorMessage } from "@/src/lib/format";
import { pickImage } from "@/src/lib/photo-upload";
import {
  IdentityDocumentSaveError,
  useSavedPhoto,
  useSaveDocument,
  type PickedPhoto,
  type SavedPhoto,
} from "@/src/lib/identity-documents";

type Side = IdentityDocumentImageSide;
type Form = {
  type: IdentityDocumentType | "";
  number: string;
  /** False while a saved number is only shown masked; typing a new one switches this on. */
  editingNumber: boolean;
  name: string;
  country: string;
  expiry: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function initialForm(document: IdentityDocument | null): Form {
  return {
    type: document?.documentType ?? "",
    number: "",
    editingNumber: !document?.documentNumber,
    name: document?.nameOnDocument ?? "",
    country: document?.issuingCountry || "IN",
    expiry: document?.expiryDate ?? "",
  };
}

export function DocumentEditorSheet({
  open,
  onClose,
  companionId,
  document = null,
}: {
  open: boolean;
  onClose: () => void;
  companionId?: number;
  /** Null for a new document. */
  document?: IdentityDocument | null;
}) {
  const save = useSaveDocument(companionId);
  const [form, setForm] = useState<Form>(() => initialForm(document));
  // The saved draft id: set for an edit, and after a partial failure (details saved, a photo failed).
  const [draftId, setDraftId] = useState<number | null>(document?.id ?? null);
  const [picks, setPicks] = useState<Partial<Record<Side, PickedPhoto>>>({});
  const [pickErrors, setPickErrors] = useState<Partial<Record<Side, string>>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Each opening starts from the document as it is now.
  useEffect(() => {
    if (!open) return;
    setForm(initialForm(document));
    setDraftId(document?.id ?? null);
    setPicks({});
    setPickErrors({});
    setFieldErrors({});
    save.reset();
    // Runs once per opening; `document` is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const savedFront = useSavedPhoto(document, "FRONT", companionId);
  const savedBack = useSavedPhoto(document, "BACK", companionId);
  const saved: Record<Side, SavedPhoto> = { FRONT: savedFront, BACK: savedBack };

  const isNew = document === null;
  const expiryVisible = showsExpiry(form.type, document?.expiryDate);
  const slots = photoSlots(form.type, Boolean(document?.images.back.isUploaded));
  const expiryValid = ISO_DATE.test(form.expiry) && !Number.isNaN(Date.parse(form.expiry));
  const submitError = save.error
    ? save.error instanceof IdentityDocumentSaveError
      ? save.error.message
      : errorMessage(save.error, "The document could not be saved.")
    : null;

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));

  function submit() {
    if (!form.type) {
      setFieldErrors({ documentType: "Choose a document type." });
      return;
    }
    const parsed = identityDocumentInputSchema.safeParse({
      documentType: form.type,
      documentNumber: form.editingNumber ? form.number.trim() : (document?.documentNumber ?? ""),
      nameOnDocument: form.name.trim(),
      issuingCountry: form.country.trim(),
      expiryDate: expiryVisible ? form.expiry.trim() || null : null,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        errors[key] ??= key === "expiryDate" ? "Use a date as YYYY-MM-DD." : issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    // A photo picked for a side the type no longer needs is dropped, as on the web.
    const photos: Partial<Record<Side, PickedPhoto>> = {};
    for (const side of slots) {
      const pick = picks[side];
      if (pick) photos[side] = pick;
    }

    save.mutate(
      { documentId: draftId ?? undefined, input: parsed.data, photos },
      {
        onSuccess: () => {
          toast("Document saved");
          onClose();
        },
        onError: (error) => {
          if (error instanceof IdentityDocumentSaveError) setDraftId(error.document.id);
        },
      },
    );
  }

  async function pick(side: Side, source: "library" | "camera") {
    setPickErrors((current) => ({ ...current, [side]: undefined }));
    try {
      const asset = await pickImage(source);
      if (!asset) return;
      setPicks((current) => ({ ...current, [side]: { uri: asset.uri, width: asset.width, height: asset.height } }));
    } catch (error) {
      setPickErrors((current) => ({ ...current, [side]: error instanceof Error ? error.message : "The photo could not be opened." }));
    }
  }

  function removePick(side: Side) {
    setPicks((current) => {
      const next = { ...current };
      delete next[side];
      return next;
    });
  }

  const typeItems = documentTypes.map((type) => ({ key: type, label: identityDocumentTypeLabels[type] }));
  const expiryStatus = expiryValid && !fieldErrors.expiryDate ? getExpiryStatus(form.expiry) : null;
  const expiryHelper = expiryStatus && "label" in expiryStatus ? expiryStatus.label : undefined;

  // Photos follow the typed fields, so the last one closes the keyboard rather than saving.
  const chain = useFocusChain();

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isNew ? "Add document" : "Edit document"}
      fill
      footer={
        <>
          <Button label="Save" onPress={submit} loading={save.isPending} />
          <Button label="Cancel" variant="ghost" onPress={onClose} disabled={save.isPending} />
        </>
      }
    >
      <View>
        <Text style={styles.sectionLabel}>Document type</Text>
        <PillTabs items={typeItems} value={form.type} onChange={(key) => set("type")(key as IdentityDocumentType)} />
        {fieldErrors.documentType ? <Text style={styles.error}>{fieldErrors.documentType}</Text> : null}
        <Text style={styles.hint}>{form.type ? documentTypeHint(form.type) : "Choose the type printed on the document."}</Text>

        <View style={styles.fields}>
          {document?.documentNumber && !form.editingNumber ? (
            <View style={styles.maskedRow}>
              <View style={styles.maskedCopy}>
                <Text style={styles.sectionLabel}>Document number</Text>
                <Text style={styles.maskedValue}>{maskDocumentNumber(document.documentNumber)}</Text>
              </View>
              <TextLink label="Change number" onPress={() => set("editingNumber")(true)} />
            </View>
          ) : (
            <TextField
              label="Document number"
              value={form.number}
              onChangeText={set("number")}
              error={fieldErrors.documentNumber}
              {...documentNumberFieldProps(form.type)}
              {...chain(0)}
            />
          )}

          <TextField
            label="Name on document"
            value={form.name}
            onChangeText={set("name")}
            error={fieldErrors.nameOnDocument}
            maxLength={300}
            autoComplete="name"
            {...chain(1)}
          />

          <TextField
            label="Issuing country"
            value={form.country}
            onChangeText={(value) => set("country")(value.toUpperCase())}
            error={fieldErrors.issuingCountry}
            helper="Two-letter country code, such as IN."
            maxLength={2}
            autoCapitalize="characters"
            placeholder="IN"
            {...chain(2, expiryVisible ? undefined : "dismiss")}
          />

          {expiryVisible ? (
            <TextField
              label={form.type && showsExpiry(form.type, null) ? "Expiry date" : "Expiry date (optional)"}
              value={form.expiry}
              onChangeText={set("expiry")}
              error={fieldErrors.expiryDate}
              helper={expiryHelper ?? "YYYY-MM-DD"}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              maxLength={10}
              {...chain(3, "dismiss")}
            />
          ) : null}
        </View>

        <Text style={[styles.sectionLabel, styles.photosLabel]}>Photos</Text>
        {slots.map((side) => (
          <PhotoSlot
            key={side}
            label={sideLabel(side, form.type)}
            picked={picks[side]}
            saved={saved[side]}
            error={pickErrors[side]}
            disabled={save.isPending}
            onTake={() => void pick(side, "camera")}
            onChoose={() => void pick(side, "library")}
            onRemove={() => removePick(side)}
          />
        ))}

        {submitError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {submitError}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function PhotoSlot({
  label,
  picked,
  saved,
  error,
  disabled,
  onTake,
  onChoose,
  onRemove,
}: {
  label: string;
  picked?: PickedPhoto;
  saved: SavedPhoto;
  error?: string;
  disabled: boolean;
  onTake: () => void;
  onChoose: () => void;
  onRemove: () => void;
}) {
  const uri = picked?.uri ?? saved.url;
  return (
    <View style={styles.slot}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {uri ? (
        <Image source={{ uri }} cachePolicy="none" contentFit="contain" style={styles.preview} accessibilityLabel={`${label} photo`} />
      ) : saved.isLoading ? (
        <View style={[styles.preview, styles.empty]}>
          <Spinner color={colors.mutedForeground} />
        </View>
      ) : (
        <View style={[styles.preview, styles.empty]}>
          <Text style={styles.emptyText}>{saved.isUploaded ? "The photo could not be loaded" : "No photo yet"}</Text>
        </View>
      )}
      <View style={styles.actions}>
        <Button label="Take photo" size="sm" variant="outline" onPress={onTake} disabled={disabled} />
        <Button label="Choose photo" size="sm" variant="outline" onPress={onChoose} disabled={disabled} />
        {picked ? <Button label="Remove" size="sm" variant="ghost" onPress={onRemove} disabled={disabled} /> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { ...type.label, color: colors.subtleForeground },
  hint: { ...type.caption, color: colors.mutedForeground, marginTop: space.sm },
  error: { ...type.caption, color: colors.destructive, marginTop: space.sm },
  fields: { gap: space.lg, marginTop: space.xl },
  maskedRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.md },
  maskedCopy: { gap: 6 },
  maskedValue: { ...type.body, color: colors.foreground },
  photosLabel: { marginTop: space.xl },
  slot: { gap: space.sm, marginTop: space.md },
  preview: { width: "100%", height: 160, borderRadius: radii.photo, backgroundColor: colors.muted },
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { ...type.meta, color: colors.mutedForeground },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
