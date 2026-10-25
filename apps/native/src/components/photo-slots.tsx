// One photo slot on the Details screen (cover or room type), plus the upload
// and remove mutations that every slot shares. Actions are disabled while any
// photo change is in flight, so two uploads never race for the same slot.
import type { PropertyPhotoSlot } from "@tattvix/contracts";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, PhotoTile, Spinner, colors, radii, space, toast, type } from "@/src/design-system";
import { api } from "@/src/lib/api";
import { hotelOperationsKeys, propertyPhotosKeys } from "@tattvix/api";
import { pickAndUploadPhoto } from "@/src/lib/photo-upload";

type Scope = { organizationSlug: string; propertySlug: string };

function invalidatePhotos(client: QueryClient, { organizationSlug, propertySlug }: Scope) {
  void client.invalidateQueries({ queryKey: propertyPhotosKeys.list(organizationSlug, propertySlug) });
  void client.invalidateQueries({ queryKey: hotelOperationsKeys.property(organizationSlug, propertySlug) });
}

/** Picks, uploads and completes a photo. Resolves to null when the picker was cancelled. */
export function useUploadPhoto(scope: Scope) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (slot: PropertyPhotoSlot) => pickAndUploadPhoto(scope.organizationSlug, scope.propertySlug, slot),
    onSuccess: (saved) => {
      if (!saved) return;
      invalidatePhotos(client, scope);
      toast("Photo saved");
    },
  });
}

export function useRemovePhoto(scope: Scope) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (slot: PropertyPhotoSlot) => api.propertyPhotos.remove(scope.organizationSlug, scope.propertySlug, slot),
    onSuccess: () => {
      invalidatePhotos(client, scope);
      toast("Photo removed");
    },
  });
}

/** A labelled slot: the photo with Replace and Remove, or a dashed "Add photo" target. */
export function PhotoSlot({
  label,
  url,
  disabled,
  onAdd,
  onRemove,
}: {
  label: string;
  url?: string | null;
  disabled: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.slot}>
      <Text style={styles.label}>{label}</Text>
      {url ? (
        <>
          <PhotoTile uri={url} />
          <View style={styles.actions}>
            <Button label="Replace" size="sm" variant="outline" onPress={onAdd} disabled={disabled} accessibilityLabel={`Replace photo for ${label}`} />
            <Button label="Remove" size="sm" variant="ghost" onPress={onRemove} disabled={disabled} accessibilityLabel={`Remove photo for ${label}`} />
          </View>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add photo for ${label}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onAdd}
          style={({ pressed }) => [styles.empty, disabled && { opacity: 0.5 }, pressed && !disabled && { backgroundColor: colors.muted }]}
        >
          <Text style={styles.emptyText}>Add photo</Text>
        </Pressable>
      )}
    </View>
  );
}

/** "Saving photo…" line shown while an upload or removal is in flight. */
export function SavingPhoto() {
  return (
    <View accessibilityLiveRegion="polite" style={styles.saving}>
      <Spinner color={colors.mutedForeground} size={14} />
      <Text style={styles.savingText}>Saving photo…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { gap: space.sm },
  label: { ...type.label, color: colors.subtleForeground },
  actions: { flexDirection: "row", gap: space.sm },
  empty: {
    height: 120,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radii.card,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { ...type.meta, color: colors.mutedForeground },
  saving: { flexDirection: "row", alignItems: "center", gap: space.sm },
  savingText: { ...type.caption, color: colors.mutedForeground },
});
