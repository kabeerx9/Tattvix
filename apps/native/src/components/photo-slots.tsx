// The hotel's photos on the Details screen: the cover as a wide tile, then a
// two-column grid of room types. A picked photo shows at once on its tile, with
// the upload's progress over it; it ends in a "Saved" badge, a haptic and a toast
// naming the slot, or stays on the tile as "Not saved", and a tap retries the same
// photo without picking again. Each slot uploads on its own, so several can run at
// once. A tap on a saved photo opens Replace and Remove.
// Mirrors apps/web/src/features/property-photos/components/property-photos-panel.tsx.
import { photoSavedMessage, photoSlotsSummary, hotelOperationsKeys, propertyPhotosKeys, type PhotoSlotView } from "@tattvix/api";
import type { PropertyPhotoSlot } from "@tattvix/contracts";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Check, ImagePlus, RotateCw } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { BottomSheet, Button, PhotoTile, colors, radii, space, toast, type } from "@/src/design-system";
import { api } from "@/src/lib/api";
import { pickImage, uploadPropertyPhoto } from "@/src/lib/photo-upload";

type Scope = { organizationSlug: string; propertySlug: string };
type Asset = { uri: string; width: number; height: number };

/** A slot's upload. "done" keeps the local photo on the tile, so it never blinks while the saved copy loads. */
type Upload = { status: "uploading" | "saved" | "failed" | "done"; asset: Asset; progress: number; error?: string };

const SAVED_BADGE_MS = 2500;

function invalidatePhotos(client: QueryClient, { organizationSlug, propertySlug }: Scope) {
  void client.invalidateQueries({ queryKey: propertyPhotosKeys.list(organizationSlug, propertySlug) });
  void client.invalidateQueries({ queryKey: hotelOperationsKeys.property(organizationSlug, propertySlug) });
}

export function failureText(error: unknown) {
  return error instanceof Error && error.message ? error.message : "The photo could not be saved. Try again.";
}

/** Per-slot uploads, keyed by PhotoSlotView.key. */
function usePhotoUploads(scope: Scope) {
  const client = useQueryClient();
  const [uploads, setUploads] = useState<Record<string, Upload>>({});
  const patch = (key: string, next: Partial<Upload> | null) =>
    setUploads((current) => {
      const copy = { ...current };
      if (next === null) delete copy[key];
      else copy[key] = { ...copy[key]!, ...next };
      return copy;
    });

  async function send(view: PhotoSlotView, asset: Asset) {
    setUploads((current) => ({ ...current, [view.key]: { status: "uploading", asset, progress: 0 } }));
    try {
      await uploadPropertyPhoto(scope.organizationSlug, scope.propertySlug, view.slot, asset, (progress) => patch(view.key, { progress }));
      invalidatePhotos(client, scope);
      patch(view.key, { status: "saved", progress: 1 });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(photoSavedMessage(view.label));
      setTimeout(() => setUploads((current) => (current[view.key]?.status === "saved" ? { ...current, [view.key]: { ...current[view.key]!, status: "done" } } : current)), SAVED_BADGE_MS);
    } catch (error) {
      // The toast carries the step and storage code, which is what tells a broken bucket from a bad connection.
      patch(view.key, { status: "failed", error: failureText(error) });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast(`${view.label} not saved. ${failureText(error)}`);
    }
  }

  async function pick(view: PhotoSlotView) {
    try {
      const asset = await pickImage("library");
      if (asset) void send(view, { uri: asset.uri, width: asset.width, height: asset.height });
    } catch (error) {
      toast(failureText(error));
    }
  }

  return {
    uploads,
    pick,
    retry: (view: PhotoSlotView) => {
      const asset = uploads[view.key]?.asset;
      if (asset) void send(view, asset);
    },
    forget: (key: string) => patch(key, null),
  };
}

export function PhotoSlots({ scope, slots }: { scope: Scope; slots: PhotoSlotView[] }) {
  const client = useQueryClient();
  const { uploads, pick, retry, forget } = usePhotoUploads(scope);
  const [open, setOpen] = useState<PhotoSlotView | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [width, setWidth] = useState(0);
  const remove = useMutation({
    mutationFn: (slot: PropertyPhotoSlot) => api.propertyPhotos.remove(scope.organizationSlug, scope.propertySlug, slot),
    onSuccess: () => {
      invalidatePhotos(client, scope);
      toast("Photo removed");
    },
  });

  // A slot counts as added once its upload saved, before the list refetches.
  const counted = slots.map((slot) => ({ ...slot, url: slot.url ?? (uploads[slot.key]?.status === "saved" || uploads[slot.key]?.status === "done" ? "local" : null) }));
  const [cover, ...roomTypes] = slots;
  const tileWidth = Math.floor((width - space.md) / 2);

  function press(view: PhotoSlotView) {
    const upload = uploads[view.key];
    if (upload?.status === "uploading") return;
    if (upload?.status === "failed") return retry(view);
    if (view.url || upload) {
      setConfirming(false);
      remove.reset();
      return setOpen(view);
    }
    void pick(view);
  }

  function closeSheet() {
    if (!remove.isPending) setOpen(null);
  }

  const tile = (view: PhotoSlotView, tileStyle: object, aspectRatio: number) => (
    <SlotTile key={view.key} view={view} upload={uploads[view.key]} aspectRatio={aspectRatio} style={tileStyle} onPress={() => press(view)} />
  );
  const openUri = open ? (uploads[open.key]?.asset.uri ?? open.url) : null;

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Text style={styles.summary}>{photoSlotsSummary(counted)} · Guests see these when they check in.</Text>
      {cover ? tile(cover, styles.full, 16 / 9) : null}
      {width > 0 ? <View style={styles.grid}>{roomTypes.map((view) => tile(view, { width: tileWidth }, 4 / 3))}</View> : null}

      <BottomSheet open={open !== null} onClose={closeSheet} title={open?.label}>
        {openUri ? <Image source={{ uri: openUri }} contentFit="cover" style={styles.sheetPhoto} accessible={false} /> : null}
        {confirming ? (
          <View style={styles.sheetActions}>
            <Text style={styles.sheetText}>Remove this photo? Guests will not see one here until you add another.</Text>
            {remove.isError ? <Text accessibilityRole="alert" style={styles.error}>{failureText(remove.error)}</Text> : null}
            <Button
              label="Remove photo"
              variant="destructive"
              loading={remove.isPending}
              onPress={() => {
                if (!open) return;
                const view = open;
                remove.mutate(view.slot, { onSuccess: () => { forget(view.key); setOpen(null); } });
              }}
            />
            <Button label="Keep photo" variant="ghost" disabled={remove.isPending} onPress={() => setConfirming(false)} />
          </View>
        ) : (
          <View style={styles.sheetActions}>
            <Button label="Replace photo" onPress={() => { const view = open; setOpen(null); if (view) void pick(view); }} />
            <Button label="Remove photo" variant="ghost" onPress={() => setConfirming(true)} />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

function SlotTile({ view, upload, aspectRatio, style, onPress }: { view: PhotoSlotView; upload?: Upload; aspectRatio: number; style: object; onPress: () => void }) {
  const uri = upload?.asset.uri ?? view.url;
  const status = upload?.status;
  const percent = Math.round((upload?.progress ?? 0) * 100);
  const line =
    status === "uploading" ? `Uploading ${percent}%`
    : status === "failed" ? "Not saved · Tap to retry"
    : status === "saved" ? "Saved"
    : uri ? "Tap to replace or remove"
    : "Tap to add";
  const label = status === "failed" ? `${view.label}, not saved. Retry` : uri ? `${view.label} photo. Replace or remove` : `Add ${view.label} photo`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: status === "uploading" }}
      onPress={onPress}
      style={({ pressed }) => [style, styles.tile, pressed && status !== "uploading" && styles.pressed]}
    >
      {uri ? (
        <View>
          <PhotoTile uri={uri} aspectRatio={aspectRatio} />
          {status === "uploading" ? <UploadingCover percent={percent} /> : null}
          {status === "failed" ? (
            <View style={[styles.cover, styles.failedCover]}>
              <RotateCw color="#ffffff" size={22} strokeWidth={2.25} />
              <Text style={styles.coverText}>Not saved</Text>
            </View>
          ) : null}
          {status === "saved" ? (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(240)} style={styles.savedBadge}>
              <Check color={colors.success} size={14} strokeWidth={3} />
              <Text style={styles.savedText}>Saved</Text>
            </Animated.View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.empty, { aspectRatio }]}>
          <ImagePlus color={colors.mutedForeground} size={24} strokeWidth={1.75} />
          <Text style={styles.emptyText}>Add photo</Text>
        </View>
      )}
      <View accessibilityLiveRegion="polite">
        <Text numberOfLines={1} style={styles.title}>{view.label}</Text>
        <Text numberOfLines={1} style={[styles.line, status === "failed" && styles.lineFailed]}>{line}</Text>
      </View>
    </Pressable>
  );
}

function UploadingCover({ percent }: { percent: number }) {
  return (
    <View style={styles.cover}>
      <Text style={styles.coverText}>{percent}%</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(4, percent)}%` }]} />
      </View>
    </View>
  );
}

const fillCover = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } as const;

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  summary: { ...type.meta, color: colors.mutedForeground },
  full: { width: "100%" },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: space.md, rowGap: space.lg },
  tile: { gap: space.sm },
  pressed: { opacity: 0.85 },
  empty: {
    width: "100%",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radii.photo,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  emptyText: { ...type.caption, color: colors.mutedForeground },
  cover: { ...fillCover, borderRadius: radii.photo, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", gap: space.sm },
  failedCover: { backgroundColor: "rgba(0,0,0,0.55)" },
  coverText: { ...type.badge, color: "#ffffff" },
  track: { position: "absolute", left: space.md, right: space.md, bottom: space.md, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)", overflow: "hidden" },
  fill: { height: 4, borderRadius: 2, backgroundColor: "#ffffff" },
  savedBadge: {
    position: "absolute",
    left: space.sm,
    top: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "#ffffff",
  },
  savedText: { ...type.badge, color: colors.foreground },
  title: { ...type.rowTitle, color: colors.foreground },
  line: { ...type.caption, color: colors.mutedForeground },
  lineFailed: { color: colors.destructive },
  sheetPhoto: { width: "100%", aspectRatio: 16 / 9, borderRadius: radii.photo, backgroundColor: colors.muted, marginTop: space.md },
  sheetActions: { gap: space.sm, marginTop: space.lg },
  sheetText: { ...type.body, color: colors.mutedForeground, marginBottom: space.xs },
  error: { ...type.caption, color: colors.destructive },
});
