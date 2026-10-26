import { StyleSheet, Text } from "react-native";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { colors, space, type } from "./theme";

// A BottomSheet with a title, one line of consequence, the confirm action and
// Cancel. Used for charge void and sign out, never the system Alert.
export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = "primary",
  loading = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  tone?: "primary" | "destructive";
  loading?: boolean;
  error?: string;
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button label={confirmLabel} variant={tone === "destructive" ? "destructive" : "primary"} onPress={onConfirm} loading={loading} />
          <Button label="Cancel" variant="ghost" onPress={onClose} disabled={loading} />
        </>
      }
    >
      <Text style={styles.description}>{description}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  description: { ...type.body, color: colors.mutedForeground, marginBottom: space.xs },
  error: { ...type.caption, color: colors.destructive, marginTop: space.sm },
});
