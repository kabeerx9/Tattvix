import { countries, type Country } from "@tattvix/api";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@tattvix/ui/components/combobox";
import { useState } from "react";

/**
 * Searchable country picker that shows names and stores the ISO code.
 * Controlled through `value`/`onChange`, or uncontrolled with `defaultValue`
 * and `name`, in which case a hidden input submits the code with the form.
 */
export function CountrySelect({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  invalid = false,
  className,
  "aria-describedby": describedBy,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  invalid?: boolean;
  className?: string;
  "aria-describedby"?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const code = (value ?? own).trim().toUpperCase();
  const selected = countries.find((country) => country.code === code) ?? null;

  return (
    <>
      <Combobox<Country>
        items={countries}
        value={selected}
        onValueChange={(next) => {
          const nextCode = next?.code ?? "";
          if (value === undefined) setOwn(nextCode);
          onChange?.(nextCode);
        }}
        itemToStringLabel={(country) => country.name}
        itemToStringValue={(country) => country.code}
        isItemEqualToValue={(item, current) => item.code === current.code}
        autoHighlight
      >
        <ComboboxInput
          id={id}
          placeholder="Search countries"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          autoComplete="off"
          className={className ?? "w-full"}
        />
        <ComboboxContent>
          <ComboboxEmpty>No country matches.</ComboboxEmpty>
          <ComboboxList>
            {(country: Country) => (
              <ComboboxItem key={country.code} value={country}>
                {country.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {name ? <input type="hidden" name={name} value={code} /> : null}
    </>
  );
}
