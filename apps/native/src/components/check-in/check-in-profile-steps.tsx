// The About and Address form steps. Field order, helper copy and the
// India / another-country choice mirror check-in-profile-steps.tsx on the web.
import type { ProfileFieldErrors } from "@tattvix/api";
import type { GuestProfileInput } from "@tattvix/contracts";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PillTabs, TextField, colors, space, type } from "@/src/design-system";

type Props = {
  values: GuestProfileInput;
  errors: ProfileFieldErrors;
  onChange: (patch: Partial<GuestProfileInput>) => void;
};

/** India first; anyone else types their two-letter country code. */
function CountryChoice({
  label,
  value,
  error,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  hint: string;
  onChange: (value: string) => void;
}) {
  const isIndia = value.toUpperCase() === "IN";
  // "Another country" with no code typed yet still needs to show the input.
  const [otherChosen, setOtherChosen] = useState(value !== "" && !isIndia);
  const choice = isIndia ? "IN" : otherChosen ? "OTHER" : "";
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <PillTabs
        items={[
          { key: "IN", label: "India" },
          { key: "OTHER", label: "Another country" },
        ]}
        value={choice}
        onChange={(next) => {
          setOtherChosen(next === "OTHER");
          onChange(next === "IN" ? "IN" : "");
        }}
      />
      {error && choice !== "OTHER" ? <Text style={styles.error}>{error}</Text> : null}
      {choice === "OTHER" ? (
        <TextField
          label="Country code"
          value={value}
          maxLength={2}
          autoCapitalize="characters"
          placeholder="NP"
          helper={hint}
          error={error}
          onChangeText={(text) => onChange(text.toUpperCase())}
        />
      ) : null}
    </View>
  );
}

export function AboutStepFields({ values, errors, onChange }: Props) {
  return (
    <View style={styles.fields}>
      <TextField
        label="Legal first name"
        value={values.legalFirstName}
        maxLength={150}
        autoCapitalize="words"
        autoComplete="given-name"
        error={errors.legalFirstName}
        onChangeText={(text) => onChange({ legalFirstName: text })}
      />
      <TextField
        label="Legal last name"
        value={values.legalLastName}
        maxLength={150}
        autoCapitalize="words"
        autoComplete="family-name"
        helper="Only one name on your ID? Enter it again here."
        error={errors.legalLastName}
        onChangeText={(text) => onChange({ legalLastName: text })}
      />
      <TextField
        label="Phone number"
        value={values.phoneNumber}
        maxLength={32}
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
        error={errors.phoneNumber}
        onChangeText={(text) => onChange({ phoneNumber: text })}
      />
      <TextField
        label="Date of birth"
        value={values.dateOfBirth ?? ""}
        placeholder="YYYY-MM-DD"
        helper="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        maxLength={10}
        error={errors.dateOfBirth}
        onChangeText={(text) => onChange({ dateOfBirth: text.trim() || null })}
      />
      <CountryChoice
        label="Nationality"
        value={values.nationality}
        error={errors.nationality}
        hint="Two letters, as on your passport, e.g. NP for Nepal."
        onChange={(nationality) => onChange({ nationality })}
      />
    </View>
  );
}

export function AddressStepFields({ values, errors, onChange }: Props) {
  return (
    <View style={styles.fields}>
      <TextField
        label="House, street and area"
        value={values.addressLine1}
        maxLength={255}
        autoComplete="street-address"
        error={errors.addressLine1}
        onChangeText={(text) => onChange({ addressLine1: text })}
      />
      <TextField
        label="Landmark or locality (optional)"
        value={values.addressLine2}
        maxLength={255}
        error={errors.addressLine2}
        onChangeText={(text) => onChange({ addressLine2: text })}
      />
      <TextField
        label="City"
        value={values.city}
        maxLength={120}
        error={errors.city}
        onChangeText={(text) => onChange({ city: text })}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label="State or region"
            value={values.stateRegion}
            maxLength={120}
            error={errors.stateRegion}
            onChangeText={(text) => onChange({ stateRegion: text })}
          />
        </View>
        <View style={styles.pin}>
          <TextField
            label="PIN code"
            value={values.postalCode}
            maxLength={20}
            keyboardType={values.country === "IN" || values.country === "" ? "number-pad" : "default"}
            error={errors.postalCode}
            onChangeText={(text) => onChange({ postalCode: text })}
          />
        </View>
      </View>
      <CountryChoice
        label="Country"
        value={values.country}
        error={errors.country}
        hint="Two letters, e.g. NP for Nepal."
        onChange={(country) => onChange({ country })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: space.lg },
  group: { gap: space.sm },
  label: { ...type.label, color: colors.foreground },
  error: { ...type.caption, color: colors.destructive },
  row: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  flex: { flex: 1 },
  pin: { width: 136 },
});
