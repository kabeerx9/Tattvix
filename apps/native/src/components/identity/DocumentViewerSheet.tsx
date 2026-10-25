// One identity document: its details and both photos, full width. Identity
// images are never cached on device (expo-image cachePolicy "none"): this is a
// shared desk phone too, and the URLs are short-lived anyway.
import {
  getExpiryStatus,
  identityDocumentTypeLabels,
  maskDocumentNumber,
  missingFieldLabels,
  photoSlots,
  sideLabel,
  summarizeDocument,
} from "@tattvix/api";
import type { IdentityDocument, IdentityDocumentImageSide } from "@tattvix/contracts";
import { Image } from "expo-image";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, ConfirmSheet, Spinner, StatusPill, colors, radii, space, toast, type } from "@/src/design-system";
import { errorMessage } from "@/src/lib/format";
import { useRemoveDocument, useSavedPhoto, type SavedPhoto } from "@/src/lib/identity-documents";

const toneFor = { success: "success", warning: "warning", danger: "destructive", neutral: "neutral" } as const;

/** A saved photo at full width, or a muted block that says why there is no image. */
export function DocumentPhoto({ label, photo, height = 220 }: { label: string; photo: SavedPhoto; height?: number }) {
  const box = [styles.photo, { height }];
  if (!photo.isUploaded) return <Placeholder style={box} text="No photo added" />;
  if (photo.isLoading) {
    return (
      <View style={box}>
        <Spinner color={colors.mutedForeground} />
      </View>
    );
  }
  if (!photo.url) return <Placeholder style={box} text="The photo could not be loaded" />;
  return (
    <Image
      source={{ uri: photo.url }}
      cachePolicy="none"
      contentFit="contain"
      style={box}
      accessibilityLabel={`${label} of the identity document`}
    />
  );
}

function Placeholder({ style, text }: { style: object; text: string }) {
  return (
    <View style={[style, styles.placeholder]}>
      <Text style={styles.placeholderText}>{text}</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

export function DocumentViewerSheet({
  open,
  onClose,
  companionId,
  document,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  companionId?: number;
  document: IdentityDocument;
  onEdit: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = useRemoveDocument(companionId);
  const front = useSavedPhoto(document, "FRONT", companionId);
  const back = useSavedPhoto(document, "BACK", companionId);
  const photos: Record<IdentityDocumentImageSide, SavedPhoto> = { FRONT: front, BACK: back };

  const summary = summarizeDocument(document);
  const expiry = getExpiryStatus(document.expiryDate);
  const sides = photoSlots(document.documentType, document.images.back.isUploaded);
  const missing = document.readiness.missingFields.map((field) => missingFieldLabels[field]);
  const removeError = remove.error ? errorMessage(remove.error, "The document could not be deleted.") : null;

  function confirmRemove() {
    remove.mutate(document.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast("Document removed");
        onClose();
      },
    });
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={document.documentType ? identityDocumentTypeLabels[document.documentType] : "Document"}
        footer={
          <>
            <Button label="Edit" variant="outline" onPress={onEdit} />
            <Button
              label="Remove"
              variant="destructive"
              onPress={() => {
                remove.reset();
                setConfirmOpen(true);
              }}
            />
          </>
        }
      >
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.status}>
            <StatusPill tone={toneFor[summary.tone]}>{summary.label}</StatusPill>
          </View>

          <View style={styles.facts}>
            <Fact label="Number" value={maskDocumentNumber(document.documentNumber)} />
            <Fact label="Name on document" value={document.nameOnDocument || "Not added"} />
            <Fact label="Issuing country" value={document.issuingCountry || "Not added"} />
            <Fact label="Expiry" value={"label" in expiry ? expiry.label : "No expiry date"} />
          </View>

          {missing.length ? <Text style={styles.missing}>Still needed: {missing.join(", ")}</Text> : null}

          {sides.map((side) => (
            <View key={side} style={styles.photoBlock}>
              <Text style={styles.photoLabel}>{sideLabel(side, document.documentType)}</Text>
              <DocumentPhoto label={sideLabel(side, document.documentType)} photo={photos[side]} />
            </View>
          ))}
        </ScrollView>
      </BottomSheet>

      <ConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Remove this document?"
        description={removeError ?? "Its details and private photos are removed from your profile. This can't be undone."}
        confirmLabel="Remove document"
        tone="destructive"
        loading={remove.isPending}
        onConfirm={confirmRemove}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 520 },
  status: { marginBottom: space.md },
  facts: { gap: space.md, paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  fact: { gap: 2 },
  factLabel: { ...type.label, color: colors.subtleForeground },
  factValue: { ...type.body, color: colors.foreground },
  missing: { ...type.caption, color: colors.mutedForeground, marginTop: space.md },
  photoBlock: { marginTop: space.xl, gap: space.sm },
  photoLabel: { ...type.label, color: colors.subtleForeground },
  photo: { width: "100%", borderRadius: radii.photo, backgroundColor: colors.muted },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { ...type.meta, color: colors.mutedForeground },
});
