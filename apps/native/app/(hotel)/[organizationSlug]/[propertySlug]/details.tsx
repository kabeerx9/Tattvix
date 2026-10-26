// Hotel details: the property information form and the photo slots. Staff
// without hotel:manage see the form read-only and no photo actions. Mirrors
// apps/web/src/features/hotel-details/components/hotel-details-page.tsx.
import type { PropertyDetails, PropertyDetailsInput, PropertyPhotoSlot } from "@tattvix/contracts";
import { hotelDetailsKeys } from "@tattvix/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, ConfirmSheet, LargeTitle, Screen, SecondaryHeader, SectionTitle, Spinner, TextField, TextLink, colors, space, toast, type } from "@/src/design-system";
import { PhotoSlot, SavingPhoto, useRemovePhoto, useUploadPhoto } from "@/src/components/photo-slots";
import { PropertyNameForm } from "@/src/components/property-name-form";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { api, queries } from "@/src/lib/api";
import { getManageScope } from "@/src/lib/desk-scope";
import { errorMessage } from "@/src/lib/format";
import { useHotelPlace } from "@/src/lib/hotel-place";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

type Form = {
  address: string;
  contactPhone: string;
  description: string;
  amenities: string;
  checkInTime: string;
  checkOutTime: string;
};

function toForm(details: PropertyDetails): Form {
  return {
    address: details.address,
    contactPhone: details.contactPhone,
    description: details.description,
    amenities: details.amenities.join("\n"),
    checkInTime: details.checkInTime,
    checkOutTime: details.checkOutTime,
  };
}

// Same rule as the contract: blank, or 7 to 20 digits with + space - allowed.
function phoneError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const digits = (trimmed.match(/[0-9]/g) ?? []).length;
  if (!/^\+?[0-9\s-]+$/.test(trimmed) || digits < 7 || digits > 20) return "Enter a valid contact phone";
  return undefined;
}

const timeError = (value: string) => (!value.trim() || TIME.test(value.trim()) ? undefined : "Use HH:mm");

export default function HotelDetailsScreen() {
  const place = useHotelPlace();
  const scope = getManageScope(place);
  const { organizationSlug, propertySlug, canManageHotel } = scope;
  const router = useRouter();
  const queryClient = useQueryClient();

  const details = useQuery(queries.hotelDetails.property(organizationSlug, propertySlug));
  const rooms = useQuery(queries.hotelOperations.rooms(organizationSlug, propertySlug));
  const photos = useQuery({ ...queries.propertyPhotos.list(organizationSlug, propertySlug), enabled: canManageHotel });

  const [form, setForm] = useState<Form | null>(null);
  const [removeSlot, setRemoveSlot] = useState<PropertyPhotoSlot | null>(null);
  const upload = useUploadPhoto(scope);
  const remove = useRemovePhoto(scope);
  const busy = upload.isPending || remove.isPending;

  // Re-sync the form whenever the server copy changes, as the web does.
  useEffect(() => {
    if (details.data) setForm(toForm(details.data));
  }, [details.data]);

  const save = useMutation({
    mutationFn: (input: PropertyDetailsInput) => api.hotelDetails.update(organizationSlug, propertySlug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hotelDetailsKeys.property(organizationSlug, propertySlug) });
      toast("Hotel details saved");
    },
  });

  if (!details.data || !form) {
    if (details.isError) return <RetryScreen onRetry={() => void details.refetch()} retrying={details.isFetching} />;
    return <PendingScreen />;
  }

  const phoneInvalid = phoneError(form.contactPhone);
  const checkInInvalid = timeError(form.checkInTime);
  const checkOutInvalid = timeError(form.checkOutTime);
  const timesValid = !checkInInvalid && !checkOutInvalid;
  const set = (key: keyof Form) => (value: string) => setForm((current) => (current ? { ...current, [key]: value } : current));

  function submit() {
    if (!form || !timesValid || phoneInvalid) return;
    save.mutate({
      address: form.address.trim(),
      contactPhone: form.contactPhone.trim(),
      description: form.description.trim(),
      amenities: form.amenities.split("\n").map((value) => value.trim()).filter(Boolean),
      checkInTime: form.checkInTime.trim(),
      checkOutTime: form.checkOutTime.trim(),
    });
  }

  const photoError = upload.error ?? remove.error;
  const roomTypes = [...new Set((rooms.data?.rooms ?? []).map((room) => room.roomType ?? ""))].sort();
  const photosPending = photos.isPending || rooms.isPending;
  const photosFailed = photos.isError || rooms.isError;
  const roomPhoto = (roomType: string) => photos.data?.roomTypes.find((photo) => photo.roomType === roomType)?.url;

  return (
    <Screen refreshing={details.isFetching && !details.isPending} onRefresh={() => void details.refetch()}>
      <SecondaryHeader title="Hotel details" onBack={() => router.back()} />
      <LargeTitle meta="Property information and photos" action={<TextLink label="Getting started" onPress={() => router.push(`/(hotel)/${organizationSlug}/${propertySlug}/getting-started` as Href)} />}>{place.propertyName}</LargeTitle>
      <PropertyNameForm organizationSlug={organizationSlug} propertySlug={propertySlug} canManage={canManageHotel} />

      <View style={styles.section}>
        <SectionTitle>Property information</SectionTitle>
        {!canManageHotel ? <Text style={styles.readOnly}>Your role can view these details but cannot edit them.</Text> : null}

        <TextField label="Address" value={form.address} onChangeText={set("address")} editable={canManageHotel} maxLength={1000} multiline />
        <TextField
          label="Contact phone"
          value={form.contactPhone}
          onChangeText={set("contactPhone")}
          editable={canManageHotel}
          keyboardType="phone-pad"
          maxLength={32}
          error={phoneInvalid}
        />
        <TextField label="Description" value={form.description} onChangeText={set("description")} editable={canManageHotel} multiline maxLength={2000} />
        <View style={styles.row}>
          <View style={styles.half}>
            <TextField
              label="Check-in time"
              value={form.checkInTime}
              onChangeText={set("checkInTime")}
              editable={canManageHotel}
              placeholder="14:00"
              maxLength={5}
              error={checkInInvalid}
            />
          </View>
          <View style={styles.half}>
            <TextField
              label="Check-out time"
              value={form.checkOutTime}
              onChangeText={set("checkOutTime")}
              editable={canManageHotel}
              placeholder="11:00"
              maxLength={5}
              error={checkOutInvalid}
            />
          </View>
        </View>
        <TextField label="Amenities" value={form.amenities} onChangeText={set("amenities")} editable={canManageHotel} multiline helper="One per line" />

        {canManageHotel ? (
          <>
            <Button label="Save details" onPress={submit} loading={save.isPending} disabled={!timesValid || !!phoneInvalid} />
            {save.isError ? <Text style={styles.error}>{errorMessage(save.error, "The hotel details could not be saved.")}</Text> : null}
          </>
        ) : null}
      </View>

      {canManageHotel ? (
        <View style={styles.section}>
          <SectionTitle>Photos</SectionTitle>
          {photosPending ? (
            <View style={styles.loading}>
              <Spinner color={colors.mutedForeground} size={14} />
              <Text style={styles.savingText}>Loading photos…</Text>
            </View>
          ) : photosFailed ? (
            <View style={styles.loading}>
              <Text style={styles.error}>Photos could not be loaded.</Text>
              <TextLink label="Try again" onPress={() => { void photos.refetch(); void rooms.refetch(); }} />
            </View>
          ) : (
            <>
              <PhotoSlot
                label="Cover photo"
                url={photos.data?.cover?.url}
                disabled={busy}
                onAdd={() => upload.mutate({ kind: "COVER" })}
                onRemove={() => setRemoveSlot({ kind: "COVER" })}
              />
              {roomTypes.map((roomType) => (
                <PhotoSlot
                  key={roomType || "unnamed"}
                  label={roomType || "Unnamed room type"}
                  url={roomPhoto(roomType)}
                  disabled={busy}
                  onAdd={() => upload.mutate({ kind: "ROOM_TYPE", roomType })}
                  onRemove={() => setRemoveSlot({ kind: "ROOM_TYPE", roomType })}
                />
              ))}
            </>
          )}
          {busy ? <SavingPhoto /> : null}
          {photoError ? <Text style={styles.error}>{photoError instanceof Error ? photoError.message : "The photo could not be saved."}</Text> : null}
        </View>
      ) : null}

      <ConfirmSheet
        open={removeSlot !== null}
        onClose={() => setRemoveSlot(null)}
        title="Remove this photo?"
        description="Guests will no longer see this photo until you add another."
        confirmLabel="Remove photo"
        tone="destructive"
        loading={remove.isPending}
        onConfirm={() => {
          if (removeSlot) remove.mutate(removeSlot, { onSettled: () => setRemoveSlot(null) });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl, gap: space.lg },
  readOnly: { ...type.meta, color: colors.mutedForeground },
  row: { flexDirection: "row", gap: space.md },
  half: { flex: 1 },
  loading: { flexDirection: "row", alignItems: "center", gap: space.sm },
  savingText: { ...type.caption, color: colors.mutedForeground },
  error: { ...type.caption, color: colors.destructive },
});
