// Profile field groups shared by the variants. Every input carries the right
// autocomplete + inputMode so phone keyboards and autofill do the typing.

import { type Profile, type ProfileField } from "./model";
import { ChoiceChips, TextField } from "./ui";

type GroupProps = {
  profile: Profile;
  errors: Partial<Record<ProfileField, string>>;
  showErrors: boolean;
  onChange: (patch: Partial<Profile>) => void;
};

export function PersonalFields({ profile, errors, showErrors, onChange }: GroupProps) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="First name"
          autoComplete="given-name"
          autoCapitalize="words"
          value={profile.firstName}
          error={errors.firstName}
          showError={showErrors}
          onChange={(e) => onChange({ firstName: e.target.value })}
        />
        <TextField
          label="Last name"
          autoComplete="family-name"
          autoCapitalize="words"
          value={profile.lastName}
          error={errors.lastName}
          showError={showErrors}
          onChange={(e) => onChange({ lastName: e.target.value })}
        />
      </div>
      <TextField
        label="Mobile number"
        prefix="+91"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={profile.phone}
        error={errors.phone}
        showError={showErrors}
        onChange={(e) => onChange({ phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
        className="[&_input]:tabular-nums"
      />
      <TextField
        label="Date of birth"
        type="date"
        autoComplete="bday"
        max={new Date().toISOString().slice(0, 10)}
        value={profile.dateOfBirth}
        error={errors.dateOfBirth}
        showError={showErrors}
        onChange={(e) => onChange({ dateOfBirth: e.target.value })}
      />
      <ChoiceChips
        label="Nationality"
        options={[
          { value: "IN", label: "Indian" },
          { value: "OTHER", label: "Other" },
        ]}
        value={profile.nationality}
        onChange={(nationality) => onChange({ nationality })}
      />
      {profile.nationality === "OTHER" ? (
        <TextField
          label="Your nationality"
          autoComplete="country-name"
          placeholder="e.g. Nepali"
          value={profile.otherNationality}
          error={errors.otherNationality}
          showError={showErrors}
          onChange={(e) => onChange({ otherNationality: e.target.value })}
        />
      ) : null}
    </div>
  );
}

export function AddressFields({ profile, errors, showErrors, onChange }: GroupProps) {
  return (
    <div className="grid gap-4">
      <TextField
        label="House, street and area"
        autoComplete="street-address"
        placeholder="e.g. 702, Sea Breeze Apts, Bandra West"
        value={profile.addressLine1}
        error={errors.addressLine1}
        showError={showErrors}
        onChange={(e) => onChange({ addressLine1: e.target.value })}
      />
      <div className="grid grid-cols-[1fr_8.5rem] gap-3">
        <TextField
          label="City"
          autoComplete="address-level2"
          value={profile.city}
          error={errors.city}
          showError={showErrors}
          onChange={(e) => onChange({ city: e.target.value })}
        />
        <TextField
          label="PIN code"
          inputMode="numeric"
          autoComplete="postal-code"
          value={profile.postalCode}
          error={errors.postalCode}
          showError={showErrors}
          onChange={(e) => onChange({ postalCode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          className="[&_input]:tabular-nums"
        />
      </div>
      <TextField
        label="State"
        autoComplete="address-level1"
        value={profile.state}
        error={errors.state}
        showError={showErrors}
        onChange={(e) => onChange({ state: e.target.value })}
      />
    </div>
  );
}
