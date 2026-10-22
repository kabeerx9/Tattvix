import type { GuestProfileInput } from "@tattvix/contracts";
import { Input } from "@tattvix/ui/components/input";
import { SegmentedControl } from "@tattvix/ui/components/segmented-control";
import { useState } from "react";

import type { ProfileFieldErrors } from "@/features/check-in/steps";

import { FormField, stepInputClassName } from "./check-in-layout";

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
  onChange,
  hint,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  hint: string;
}) {
  const isIndia = value.toUpperCase() === "IN";
  // "Another country" with no code typed yet still needs to show the input.
  const [otherChosen, setOtherChosen] = useState(value !== "" && !isIndia);
  const choice = isIndia ? "IN" : otherChosen ? "OTHER" : null;
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <p className="text-[13px] font-medium" id={`${label}-label`}>
          {label}
        </p>
        <SegmentedControl
          aria-labelledby={`${label}-label`}
          value={choice}
          onValueChange={(next) => {
            setOtherChosen(next === "OTHER");
            onChange(next === "IN" ? "IN" : "");
          }}
          options={[
            { value: "IN", label: "India" },
            { value: "OTHER", label: "Another country" },
          ]}
        />
        {error && choice !== "OTHER" ? <p className="text-[13px] text-destructive">{error}</p> : null}
      </div>
      {choice === "OTHER" ? (
        <FormField label="Country code" required error={error} hint={hint}>
          {(field) => (
            <Input
              {...field}
              className={stepInputClassName}
              value={isIndia ? "" : value}
              maxLength={2}
              autoCapitalize="characters"
              autoComplete="country"
              placeholder="NP"
              onChange={(event) => onChange(event.target.value.toUpperCase())}
            />
          )}
        </FormField>
      ) : null}
    </div>
  );
}

export function AboutStepFields({ values, errors, onChange }: Props) {
  return (
    <div className="grid gap-4">
      <FormField label="Legal first name" required error={errors.legalFirstName}>
        {(field) => (
          <Input
            {...field}
            className={stepInputClassName}
            value={values.legalFirstName}
            maxLength={150}
            autoComplete="given-name"
            autoCapitalize="words"
            onChange={(event) => onChange({ legalFirstName: event.target.value })}
          />
        )}
      </FormField>
      <FormField
        label="Legal last name"
        required
        error={errors.legalLastName}
        hint="Only one name on your ID? Enter it again here."
      >
        {(field) => (
          <Input
            {...field}
            className={stepInputClassName}
            value={values.legalLastName}
            maxLength={150}
            autoComplete="family-name"
            autoCapitalize="words"
            onChange={(event) => onChange({ legalLastName: event.target.value })}
          />
        )}
      </FormField>
      <FormField label="Phone number" required error={errors.phoneNumber}>
        {(field) => (
          <Input
            {...field}
            className={stepInputClassName}
            value={values.phoneNumber}
            type="tel"
            inputMode="tel"
            maxLength={32}
            autoComplete="tel"
            placeholder="+91 98765 43210"
            onChange={(event) => onChange({ phoneNumber: event.target.value })}
          />
        )}
      </FormField>
      <FormField label="Date of birth" required error={errors.dateOfBirth}>
        {(field) => (
          <Input
            {...field}
            className={stepInputClassName}
            value={values.dateOfBirth ?? ""}
            type="date"
            autoComplete="bday"
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => onChange({ dateOfBirth: event.target.value || null })}
          />
        )}
      </FormField>
      <CountryChoice
        label="Nationality"
        value={values.nationality}
        error={errors.nationality}
        hint="Two letters, as on your passport, e.g. NP for Nepal."
        onChange={(nationality) => onChange({ nationality })}
      />
    </div>
  );
}

export function AddressStepFields({ values, errors, onChange }: Props) {
  return (
    <div className="grid gap-4">
      <FormField label="House, street and area" required error={errors.addressLine1}>
        {(field) => (
          <Input
            {...field}
            className={stepInputClassName}
            value={values.addressLine1}
            maxLength={255}
            autoComplete="address-line1"
            onChange={(event) => onChange({ addressLine1: event.target.value })}
          />
        )}
      </FormField>
      <FormField label="Landmark or locality" error={errors.addressLine2}>
        {(field) => (
          <Input
            {...field}
            className={stepInputClassName}
            value={values.addressLine2}
            maxLength={255}
            autoComplete="address-line2"
            onChange={(event) => onChange({ addressLine2: event.target.value })}
          />
        )}
      </FormField>
      <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-3">
        <FormField label="City" required error={errors.city}>
          {(field) => (
            <Input
              {...field}
              className={stepInputClassName}
              value={values.city}
              maxLength={120}
              autoComplete="address-level2"
              onChange={(event) => onChange({ city: event.target.value })}
            />
          )}
        </FormField>
        <FormField label="PIN code" required error={errors.postalCode}>
          {(field) => (
            <Input
              {...field}
              className={`${stepInputClassName} tabular-nums`}
              value={values.postalCode}
              maxLength={20}
              inputMode={values.country === "IN" || values.country === "" ? "numeric" : "text"}
              autoComplete="postal-code"
              onChange={(event) => onChange({ postalCode: event.target.value })}
            />
          )}
        </FormField>
      </div>
      <FormField label="State or region" required error={errors.stateRegion}>
        {(field) => (
          <Input
            {...field}
            className={stepInputClassName}
            value={values.stateRegion}
            maxLength={120}
            autoComplete="address-level1"
            onChange={(event) => onChange({ stateRegion: event.target.value })}
          />
        )}
      </FormField>
      <CountryChoice
        label="Country"
        value={values.country}
        error={errors.country}
        hint="Two letters, e.g. NP for Nepal."
        onChange={(country) => onChange({ country })}
      />
    </div>
  );
}
