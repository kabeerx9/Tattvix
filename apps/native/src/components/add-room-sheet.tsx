// Adds a room to the property. Mirrors the web's "Add room" form: number is
// required, floor and type are free text, the nightly rate is optional INR.
// The server validates everything; the footer only stops obviously bad input.
import { parseMoneyMinor } from "@tattvix/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, TextField, colors, space, toast, type } from "@/src/design-system";
import type { DeskScope } from "@/src/lib/desk-scope";
import { errorMessage } from "@/src/lib/format";
import { hotelMutations } from "@/src/lib/hotel-mutations";

const EMPTY = { number: "", floor: "", roomType: "", rate: "" };

export function AddRoomSheet({ scope, open, onClose }: { scope: DeskScope; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const createRoom = useMutation(hotelMutations.createRoom(queryClient));
  const [fields, setFields] = useState(EMPTY);

  const number = fields.number.trim();
  const rateText = fields.rate.trim();
  const parsedRate = rateText ? parseMoneyMinor(rateText) : null;
  const rateInvalid = rateText !== "" && parsedRate === null;
  const canSave = number !== "" && !rateInvalid;

  function set<K extends keyof typeof EMPTY>(key: K) {
    return (value: string) => setFields((current) => ({ ...current, [key]: value }));
  }

  function save() {
    if (!canSave) return;
    createRoom.mutate(
      {
        organizationSlug: scope.organizationSlug,
        propertySlug: scope.propertySlug,
        input: {
          number,
          floor: fields.floor.trim(),
          roomType: fields.roomType.trim(),
          nightlyRateMinor: parsedRate,
        },
      },
      {
        onSuccess: () => {
          toast(`Room ${number} added`);
          setFields(EMPTY);
          createRoom.reset();
          onClose();
        },
      },
    );
  }

  const error = createRoom.isError ? errorMessage(createRoom.error, "The room could not be added.") : null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add room"
      footer={<Button label="Save room" onPress={save} loading={createRoom.isPending} disabled={!canSave} />}
    >
      <View style={styles.stack}>
        <TextField label="Room number" placeholder="101" value={fields.number} onChangeText={set("number")} autoCapitalize="characters" />
        <TextField label="Floor" placeholder="1" value={fields.floor} onChangeText={set("floor")} />
        <TextField label="Room type" placeholder="Deluxe" value={fields.roomType} onChangeText={set("roomType")} />
        <TextField
          label="Nightly rate (INR, optional)"
          placeholder="2500.00"
          inputMode="decimal"
          value={fields.rate}
          onChangeText={set("rate")}
          error={rateInvalid ? "Enter an amount in rupees" : undefined}
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg, paddingTop: space.sm },
  error: { ...type.meta, color: colors.destructive },
});
