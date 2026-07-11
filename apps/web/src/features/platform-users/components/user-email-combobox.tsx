import type { PlatformUserSearchResult } from "@tattvix/contracts";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@tattvix/ui/components/combobox";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useDebouncedValue } from "@/core/hooks/use-debounced-value";
import { platformUserQueries } from "@/features/platform-users/queries";

export function UserEmailCombobox({
  value,
  onValueChange,
  invalid = false,
}: {
  value: PlatformUserSearchResult | null;
  onValueChange: (user: PlatformUserSearchResult | null) => void;
  invalid?: boolean;
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim().toLowerCase(), 300);
  const searchQuery = useQuery({
    ...platformUserQueries.search(debouncedSearch),
    enabled: debouncedSearch.length >= 3 && value === null,
  });
  const users = searchQuery.data?.users ?? [];

  let emptyMessage = "Type at least 3 characters of an email.";
  if (debouncedSearch.length >= 3 && searchQuery.isFetching) {
    emptyMessage = "Searching users...";
  } else if (debouncedSearch.length >= 3 && searchQuery.isError) {
    emptyMessage = "Could not search users. Try again.";
  } else if (debouncedSearch.length >= 3) {
    emptyMessage = "No existing account matches this email.";
  }

  return (
    <Combobox
      items={users}
      value={value}
      onValueChange={onValueChange}
      inputValue={search}
      onInputValueChange={(nextSearch) => {
        setSearch(nextSearch);
        if (value && nextSearch !== value.email) {
          onValueChange(null);
        }
      }}
      itemToStringLabel={(user) => user.email}
      itemToStringValue={(user) => user.email}
      autoHighlight
    >
      <ComboboxInput
        placeholder="Search by email..."
        aria-label="Search owner by email"
        aria-invalid={invalid}
        autoComplete="off"
        showClear
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(user) => (
            <ComboboxItem key={user.id} value={user}>
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate font-medium">{user.email}</span>
                {user.firstName || user.lastName ? (
                  <span className="truncate text-muted-foreground">
                    {[user.firstName, user.lastName].filter(Boolean).join(" ")}
                  </span>
                ) : null}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
