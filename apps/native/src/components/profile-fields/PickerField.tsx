// A form field that opens a BottomSheet list instead of a keyboard: the
// trigger looks like TextField, the sheet lists options (optionally
// searchable). JS-only so it ships over the air.
import { Check, ChevronDown } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { BottomSheet, TextField, colors, radii, space, type } from "@/src/design-system";

export type PickerOption = { value: string; label: string };

export function PickerTrigger({
  label,
  valueLabel,
  placeholder,
  helper,
  error,
  invalid = false,
  onPress,
}: {
  label?: string;
  valueLabel?: string;
  placeholder: string;
  helper?: string;
  error?: string;
  /** Error border without a message, for a field whose message sits elsewhere. */
  invalid?: boolean;
  onPress: () => void;
}) {
  const message = error ?? helper;
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${valueLabel ?? placeholder}` : valueLabel ?? placeholder}
        onPress={onPress}
        style={[styles.frame, error || invalid ? styles.frameError : null]}
      >
        <Text style={[styles.value, !valueLabel && styles.placeholder]} numberOfLines={1}>
          {valueLabel ?? placeholder}
        </Text>
        <ChevronDown color={colors.subtleForeground} size={18} strokeWidth={2} />
      </Pressable>
      {message ? <Text style={[styles.message, { color: error ? colors.destructive : colors.mutedForeground }]}>{message}</Text> : null}
    </View>
  );
}

export function PickerSheet({
  open,
  onClose,
  title,
  options,
  selected,
  onSelect,
  search,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: readonly PickerOption[];
  selected: string | null;
  onSelect: (value: string) => void;
  /** When given, a search box filters the list with this function. */
  search?: (query: string) => readonly PickerOption[];
}) {
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const shown = useMemo(() => (search && query.trim() ? search(query) : options), [search, query, options]);
  const close = () => {
    setQuery("");
    onClose();
  };
  // Open on the current choice, a few rows from the top so it is clearly in view.
  const initialIndex = selected ? Math.max(0, options.findIndex((option) => option.value === selected) - 2) : 0;

  return (
    <BottomSheet open={open} onClose={close} title={title} dragHandleOnly scroll={false}>
      {search ? (
        <View style={styles.search}>
          <TextField value={query} onChangeText={setQuery} placeholder="Search" autoCorrect={false} autoCapitalize="none" accessibilityLabel={`Search ${title.toLowerCase()}`} />
        </View>
      ) : null}
      <FlatList
        data={shown as PickerOption[]}
        keyExtractor={(option) => option.value}
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: Math.max(200, height * (search ? 0.42 : 0.5)), flexShrink: 1 }}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        ListEmptyComponent={<Text style={styles.empty}>No matches.</Text>}
        renderItem={({ item }) => {
          const isSelected = item.value === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                onSelect(item.value);
                close();
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={[styles.rowText, isSelected && styles.rowTextSelected]} numberOfLines={1}>
                {item.label}
              </Text>
              {isSelected ? <Check color={colors.foreground} size={18} strokeWidth={2} /> : null}
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
}

const ROW_HEIGHT = 48;

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...type.label, color: colors.subtleForeground },
  frame: {
    height: 50,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  frameError: { borderWidth: 2, borderColor: colors.destructive, paddingHorizontal: 13 },
  value: { ...type.body, color: colors.foreground, flex: 1 },
  placeholder: { color: colors.subtleForeground },
  message: { ...type.caption },
  search: { marginTop: space.md, marginBottom: space.sm },
  row: { height: ROW_HEIGHT, flexDirection: "row", alignItems: "center", gap: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  rowPressed: { backgroundColor: colors.muted },
  rowText: { ...type.body, color: colors.foreground, flex: 1 },
  rowTextSelected: { fontFamily: type.rowTitle.fontFamily },
  empty: { ...type.meta, color: colors.mutedForeground, paddingVertical: space.lg },
});
