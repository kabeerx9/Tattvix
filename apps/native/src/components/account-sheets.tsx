import { isClerkAPIResponseError, useUser } from "@clerk/clerk-expo";
import { useQueryClient } from "@tanstack/react-query";
import { currentUserKeys } from "@tattvix/api";
import { Eye, EyeOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, TextField, colors, space, toast, type } from "@/src/design-system";

// Clerk's own wording is the most specific reason a change was refused.
function clerkMessage(error: unknown, fallback: string) {
  if (isClerkAPIResponseError(error)) return error.errors[0]?.longMessage ?? error.errors[0]?.message ?? fallback;
  return fallback;
}

// Name lives on the Clerk account; the server's copy syncs from it, so `me` is refetched.
export function NameSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useUser();
  const client = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setError("");
  }, [open, user]);

  async function save() {
    if (!user) return;
    if (!firstName.trim()) return setError("Enter your first name.");
    setSaving(true);
    setError("");
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      void client.invalidateQueries({ queryKey: currentUserKeys.all });
      toast("Name saved");
      onClose();
    } catch (failure) {
      setError(clerkMessage(failure, "Your name could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Your name" footer={<Button label="Save name" onPress={save} loading={saving} />}>
      <View style={styles.stack}>
        <TextField label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" maxLength={150} enter="next" />
        <TextField label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" maxLength={150} enter={save} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
    </BottomSheet>
  );
}

// An account made with Google has no password: it can set one, with no current password to give.
export function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useUser();
  const hasPassword = Boolean(user?.passwordEnabled);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrent("");
    setNext("");
    setError("");
  }, [open]);

  async function save() {
    if (!user) return;
    if (hasPassword && !current) return setError("Enter your current password.");
    if (next.length < 8) return setError("Use at least 8 characters for the new password.");
    setSaving(true);
    setError("");
    try {
      await user.updatePassword({ newPassword: next, currentPassword: hasPassword ? current : undefined, signOutOfOtherSessions: true });
      toast(hasPassword ? "Password changed" : "Password set");
      onClose();
    } catch (failure) {
      setError(clerkMessage(failure, "Your password could not be changed."));
    } finally {
      setSaving(false);
    }
  }

  const toggle = (
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? "Hide passwords" : "Show passwords"} hitSlop={8} onPress={() => setVisible((value) => !value)}>
      {visible ? <EyeOff color={colors.mutedForeground} size={20} /> : <Eye color={colors.mutedForeground} size={20} />}
    </Pressable>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={hasPassword ? "Change password" : "Set a password"}
      footer={<Button label={hasPassword ? "Change password" : "Set password"} onPress={save} loading={saving} />}
    >
      <View style={styles.stack}>
        {hasPassword ? (
          <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry={!visible} autoComplete="current-password" autoCapitalize="none" trailing={toggle} enter="next" />
        ) : (
          <Text style={styles.meta}>You sign in with Google. A password lets you sign in with your email too.</Text>
        )}
        <TextField
          label="New password"
          value={next}
          onChangeText={setNext}
          secureTextEntry={!visible}
          autoComplete="new-password"
          autoCapitalize="none"
          helper="At least 8 characters. Other devices are signed out."
          trailing={hasPassword ? undefined : toggle}
          enter={save}
        />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  meta: { ...type.caption, color: colors.mutedForeground },
  error: { ...type.caption, color: colors.destructive },
});
