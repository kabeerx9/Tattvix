// Pick an existing Tattwix account by email (platform admin only). The web's
// UserEmailCombobox as a field: type three characters, matches appear as rows,
// the chosen account replaces the field with a "Change" link. Free-form
// emails cannot be submitted.
import type { PlatformUserSearchResult } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { InitialsAvatar, ListRow, Panel, TextField, TextLink, colors, space, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { initialsOf } from "@/src/lib/format";

const DEBOUNCE_MS = 300;
const MIN_QUERY = 3;

export function userDisplayName(user: Pick<PlatformUserSearchResult, "firstName" | "lastName" | "email">) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

export function UserEmailPicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: PlatformUserSearchResult | null;
  onChange: (user: PlatformUserSearchResult | null) => void;
  error?: string;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim().toLowerCase()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const ready = debounced.length >= MIN_QUERY;
  const searchQuery = useQuery({ ...queries.platformUsers.search(debounced), enabled: ready && value === null });
  const users = searchQuery.data?.users ?? [];

  let message = "Type at least 3 characters of an email.";
  if (ready && searchQuery.isFetching) message = "Searching users...";
  else if (ready && searchQuery.isError) message = "Could not search users. Try again.";
  else if (ready && !users.length) message = "No existing account matches this email.";

  if (value) {
    return (
      <View style={styles.wrap}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <TextLink
            label="Change"
            onPress={() => {
              onChange(null);
              setSearch("");
            }}
          />
        </View>
        <Panel>
          <ListRow leading={<InitialsAvatar initials={initialsOf(userDisplayName(value))} name={value.email} size={40} />} title={value.email} detail={value.firstName || value.lastName ? userDisplayName(value) : undefined} />
        </Panel>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TextField
        label={label}
        value={search}
        onChangeText={setSearch}
        placeholder="Search by email..."
        accessibilityLabel="Search owner by email"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        keyboardType="email-address"
        error={error}
        helper={error ? undefined : message}
      />
      {users.length ? (
        <Panel>
          {users.map((user) => (
            <ListRow
              key={user.id}
              leading={<InitialsAvatar initials={initialsOf(userDisplayName(user))} name={user.email} size={40} />}
              title={user.email}
              detail={user.firstName || user.lastName ? userDisplayName(user) : undefined}
              onPress={() => onChange(user)}
            />
          ))}
        </Panel>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { ...type.label, color: colors.subtleForeground },
});
