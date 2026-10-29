import { useState, type ReactNode } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { KeyboardController } from "react-native-keyboard-controller";

import { colors, radii, type } from "./theme";

// Focus ring: a 2px primary line at 55% opacity, drawn as a 2px border so the
// layout does not shift. Error replaces it with the destructive colour.
// Focus changes never animate (see design doc, Motion).
const FOCUS_RING = "rgba(215,15,88,0.55)";

// What the keyboard's return key does: "next" moves to the following field on
// screen with the keyboard kept up, "done" closes the keyboard, and a function
// submits the form (pass it on the form's last field).
type Enter = "next" | "done" | (() => void);

function enterProps(enter: Enter | undefined): TextInputProps {
  if (!enter) return {};
  if (enter === "next") return { returnKeyType: "next", submitBehavior: "submit", onSubmitEditing: () => KeyboardController.setFocusTo("next") };
  if (enter === "done") return { returnKeyType: "done", submitBehavior: "blurAndSubmit" };
  return { returnKeyType: "done", submitBehavior: "blurAndSubmit", onSubmitEditing: () => enter() };
}

export function TextField({
  label,
  enter,
  helper,
  error,
  focused,
  trailing,
  onFocus,
  onBlur,
  ...input
}: TextInputProps & {
  label?: string;
  enter?: Enter;
  helper?: string;
  error?: string;
  /** Preview override for the gallery. Normally focus follows the input. */
  focused?: boolean;
  /** A control at the end of a single-line field, such as show password. */
  trailing?: ReactNode;
}) {
  const [inputFocused, setInputFocused] = useState(false);
  const isFocused = focused ?? inputFocused;

  const borderColor = error ? colors.destructive : isFocused ? FOCUS_RING : colors.input;
  const ringed = isFocused || !!error;
  const message = error ?? helper;
  // Multiline grows from a 120 minimum instead of the fixed single-line 50.
  const multiline = !!input.multiline;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[multiline ? styles.frameMultiline : styles.frame, { borderColor, borderWidth: ringed ? 2 : 1, paddingHorizontal: ringed ? 13 : 14 }]}>
        <TextInput
          placeholderTextColor={colors.subtleForeground}
          selectionColor={colors.primary}
          style={multiline ? styles.inputMultiline : styles.input}
          onFocus={(e) => {
            setInputFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setInputFocused(false);
            onBlur?.(e);
          }}
          {...enterProps(enter)}
          {...input}
        />
        {trailing && !multiline ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {message ? <Text style={[styles.message, { color: error ? colors.destructive : colors.mutedForeground }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...type.label, color: colors.subtleForeground },
  frame: { height: 50, borderRadius: radii.control, flexDirection: "row", alignItems: "center", backgroundColor: colors.card },
  frameMultiline: { minHeight: 120, paddingVertical: 12, justifyContent: "flex-start", borderRadius: radii.control, backgroundColor: colors.card },
  input: { ...type.body, flex: 1, color: colors.foreground, padding: 0, height: "100%" },
  trailing: { marginLeft: 8 },
  // Fills the frame so a tap anywhere in it focuses the input.
  inputMultiline: { ...type.body, color: colors.foreground, padding: 0, minHeight: 96, textAlignVertical: "top" },
  message: { ...type.caption },
});
