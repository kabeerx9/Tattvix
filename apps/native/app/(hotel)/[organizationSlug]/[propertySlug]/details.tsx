// Hotel details: one form (name and property information, one Save) and the
// photo grid, which saves each photo on its own. Staff without hotel:manage see the form read-only and no photo
// actions. Mirrors
// apps/web/src/features/hotel-details/components/hotel-details-page.tsx.
import type { PropertyDetails, PropertyDetailsInput } from "@tattvix/contracts";
import { propertyNameSchema } from "@tattvix/contracts";
import { createPropertyNameApi, hotelDetailsFormFields, hotelDetailsKeys, propertyNameMutation, propertyNameQuery, propertyPhotoSlots, saveRefusalSummary, serverFieldErrors } from "@tattvix/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, LargeTitle, Screen, SecondaryHeader, SectionTitle, Spinner, TextField, TextLink, colors, space, toast, type } from "@/src/design-system";
import { PhotoSlots } from "@/src/components/photo-slots";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { api, apiClient, queries } from "@/src/lib/api";
import { getManageScope } from "@/src/lib/desk-scope";
import { useHotelPlace } from "@/src/lib/hotel-place";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const nameApi = createPropertyNameApi(apiClient);

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
  const name = useQuery(propertyNameQuery(nameApi, organizationSlug, propertySlug));
  const rooms = useQuery(queries.hotelOperations.rooms(organizationSlug, propertySlug));
  const photos = useQuery({ ...queries.propertyPhotos.list(organizationSlug, propertySlug), enabled: canManageHotel });

  const [form, setForm] = useState<Form | null>(null);

  // Re-sync the form whenever the server copy changes, as the web does.
  // The name and the details are separate server copies, so each re-syncs on
  // its own: saving the name must not reset unsaved detail edits.
  const [nameInput, setNameInput] = useState<string | null>(null);
  // The server's per-field refusals; each clears when its field is edited.
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (key: string) => setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
  useEffect(() => {
    if (details.data) setForm(toForm(details.data));
  }, [details.data]);
  useEffect(() => {
    if (name.data) setNameInput(name.data.name);
  }, [name.data]);

  const mergeServerErrors = (error: unknown) => setErrors((current) => ({ ...current, ...serverFieldErrors(error, hotelDetailsFormFields).fieldErrors }));
  const saveName = useMutation({ ...propertyNameMutation(nameApi, queryClient, organizationSlug, propertySlug), onError: mergeServerErrors });
  const save = useMutation({
    mutationFn: (input: PropertyDetailsInput) => api.hotelDetails.update(organizationSlug, propertySlug, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: hotelDetailsKeys.property(organizationSlug, propertySlug) }),
    onError: mergeServerErrors,
  });

  if (!details.data || !name.data || !form || nameInput === null) {
    const failed = details.isError ? details : name.isError ? name : null;
    if (failed) return <RetryScreen error={failed.error} onRetry={() => { void details.refetch(); void name.refetch(); }} retrying={details.isFetching || name.isFetching} />;
    return <PendingScreen />;
  }

  const phoneInvalid = phoneError(form.contactPhone);
  const checkInInvalid = timeError(form.checkInTime);
  const checkOutInvalid = timeError(form.checkOutTime);
  const timesValid = !checkInInvalid && !checkOutInvalid;
  const nameValid = propertyNameSchema.safeParse({ name: nameInput }).success;
  const nameChanged = nameInput.trim() !== name.data.name;
  const saving = saveName.isPending || save.isPending;
  const fieldErrors: Record<string, string | undefined> = {
    ...errors,
    ...(nameChanged && !nameValid ? { name: "Enter a property name between 1 and 255 characters." } : {}),
    ...(phoneInvalid ? { contactPhone: phoneInvalid } : {}),
    ...(checkInInvalid ? { checkInTime: checkInInvalid } : {}),
    ...(checkOutInvalid ? { checkOutTime: checkOutInvalid } : {}),
  };
  const saveError = saveRefusalSummary(
    saveName.error ?? save.error,
    fieldErrors,
    hotelDetailsFormFields,
    saveName.isError ? "The property name could not be saved. Please try again." : "The hotel details could not be saved.",
  );
  const set = (key: keyof Form) => (value: string) => {
    clearError(key);
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  // One Save: the name has its own endpoint, so it is sent first and only when it changed.
  async function submit() {
    if (!form || nameInput === null || !timesValid || phoneInvalid || !nameValid) return;
    saveName.reset();
    save.reset();
    setErrors({});
    try {
      if (nameChanged) await saveName.mutateAsync({ name: nameInput.trim() });
      await save.mutateAsync({
        address: form.address.trim(),
        contactPhone: form.contactPhone.trim(),
        description: form.description.trim(),
        amenities: form.amenities.split("\n").map((value) => value.trim()).filter(Boolean),
        checkInTime: form.checkInTime.trim(),
        checkOutTime: form.checkOutTime.trim(),
      });
      toast("Hotel details saved");
    } catch {
      // The failed mutation's error is shown under the Save button.
    }
  }

  const photosPending = photos.isPending || rooms.isPending;
  const photosFailed = photos.isError || rooms.isError;

  return (
    <Screen refreshing={details.isFetching && !details.isPending} onRefresh={() => void details.refetch()}>
      <SecondaryHeader title="Hotel details" onBack={() => router.back()} />
      <LargeTitle meta="Property information and photos">{place.propertyName}</LargeTitle>

      <View style={styles.section}>
        <SectionTitle>Property information</SectionTitle>
        {!canManageHotel ? <Text style={styles.readOnly}>Your role can view these details but cannot edit them.</Text> : null}

        <TextField
          label="Property name"
          enter="next"
          value={nameInput}
          onChangeText={(value) => { clearError("name"); setNameInput(value); }}
          editable={canManageHotel && !saving}
          maxLength={255}
          error={fieldErrors.name || undefined}
        />

        <TextField label="Address" value={form.address} onChangeText={set("address")} editable={canManageHotel} maxLength={1000} multiline error={fieldErrors.address || undefined} />
        <TextField
          label="Contact phone"
          enter="next"
          value={form.contactPhone}
          onChangeText={set("contactPhone")}
          editable={canManageHotel}
          keyboardType="phone-pad"
          maxLength={32}
          error={fieldErrors.contactPhone || undefined}
        />
        <TextField label="Description" value={form.description} onChangeText={set("description")} editable={canManageHotel} multiline maxLength={2000} error={fieldErrors.description || undefined} />
        <View style={styles.row}>
          <View style={styles.half}>
            <TextField
              label="Check-in time"
              enter="next"
              value={form.checkInTime}
              onChangeText={set("checkInTime")}
              editable={canManageHotel}
              placeholder="14:00"
              maxLength={5}
              error={fieldErrors.checkInTime || undefined}
            />
          </View>
          <View style={styles.half}>
            <TextField
              label="Check-out time"
              enter="done"
              value={form.checkOutTime}
              onChangeText={set("checkOutTime")}
              editable={canManageHotel}
              placeholder="11:00"
              maxLength={5}
              error={fieldErrors.checkOutTime || undefined}
            />
          </View>
        </View>
        <TextField label="Amenities" value={form.amenities} onChangeText={set("amenities")} editable={canManageHotel} multiline helper="One per line" error={fieldErrors.amenities || undefined} />

        {canManageHotel ? (
          <>
            <Button label="Save" onPress={() => void submit()} loading={saving} disabled={!timesValid || !!phoneInvalid || !nameValid} />
            {saveError ? <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text> : null}
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
            <PhotoSlots scope={scope} slots={propertyPhotoSlots(photos.data, (rooms.data?.rooms ?? []).map((room) => room.roomType))} />
          )}
        </View>
      ) : null}

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
