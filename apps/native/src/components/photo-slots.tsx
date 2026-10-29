// One photo slot on the Details screen (cover or room type), plus the upload
// and remove mutations that every slot shares. Actions are disabled while any
// photo change is in flight, so two uploads never race for the same slot. The
// slot being changed shows its own progress and failure, where the person
// tapped, and a failure is also toasted.
import type { PropertyPhotoSlot } from "@tattvix/contracts";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, PhotoTile, Spinner, TextLink, colors, radii, space, toast, type } from "@/src/design-system";
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
    onError: (error) => toast(failureText(error)),
  });
}

export function failureText(error: unknown) {
  return error instanceof Error && error.message ? error.message : "The photo could not be saved. Try again.";
}

/** Identifies a slot, to match a mutation's variables to the slot on screen. */
export function slotKey(slot: PropertyPhotoSlot | undefined) {
  if (!slot) return null;
  return slot.kind === "COVER" ? "COVER" : `ROOM_TYPE:${slot.roomType}`;
}

export function useRemovePhoto(scope: Scope) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (slot: PropertyPhotoSlot) => api.propertyPhotos.remove(scope.organizationSlug, scope.propertySlug, slot),
    onSuccess: () => {
      invalidatePhotos(client, scope);
      toast("Photo removed");
    },
    onError: (error) => toast(failureText(error)),
  });
}

/**
 * A labelled slot: the photo with Replace and Remove, or a dashed "Add photo" target.
 * `saving` covers the slot with progress; `error` sits under it with Try again.
 */
export function PhotoSlot({
  label,
  url,
  disabled,
  saving = false,
  error,
  onAdd,
  onRemove,
}: {
  label: string;
  url?: string | null;
  disabled: boolean;
  saving?: boolean;
  error?: string | null;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const progress = saving ? (
    <View accessibilityLiveRegion="polite" style={styles.progress}>
      <Spinner color={colors.foreground} size={18} />
      <Text style={styles.progressText}>Saving photo…</Text>
    </View>
  ) : null;
  return (
    <View style={styles.slot}>
      <Text style={styles.label}>{label}</Text>
      {url ? (
        <>
          <View>
            <PhotoTile uri={url} />
            {progress}
          </View>
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
          {progress ?? <Text style={styles.emptyText}>Add photo</Text>}
        </Pressable>
      )}
      {error && !saving ? (
        <View accessibilityRole="alert" style={styles.failed}>
          <Text style={styles.failedText}>{error}</Text>
          <TextLink label="Try again" onPress={onAdd} />
        </View>
      ) : null}
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
  progress: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radii.card,
    backgroundColor: "rgba(255,255,255,0.86)",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  progressText: { ...type.meta, color: colors.foreground },
  failed: { gap: space.xs },
  failedText: { ...type.caption, color: colors.destructive },
});
