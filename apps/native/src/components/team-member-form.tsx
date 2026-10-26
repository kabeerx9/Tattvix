import type { TeamMember, TeamUser } from "@tattvix/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet, Button, ListRow, Panel, PillTabs, TextField, colors, space, toast, type } from "@/src/design-system";
import { queries } from "@/src/lib/api";
import { canSaveTeamMember, propertiesForRole, type TeamRole } from "@/src/lib/team-member-form";

const roles = [
  { key: "OWNER", label: "Owner" },
  { key: "MANAGER", label: "Manager" },
  { key: "RECEPTION", label: "Reception" },
];

type Property = { id: number; name: string };

export function TeamMemberForm({
  organizationSlug,
  properties,
  member,
  open,
  readOnly,
  onClose,
  onSubmit,
  onToggleAccess,
  saving,
}: {
  organizationSlug: string;
  properties: Property[];
  member?: TeamMember;
  open: boolean;
  readOnly: boolean;
  onClose: () => void;
  onSubmit: (input: { role: TeamRole; propertyIds: number[]; userId?: number }) => void;
  onToggleAccess?: (member: TeamMember) => void;
  saving: boolean;
}) {
  const [email, setEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [role, setRole] = useState<TeamRole>(member?.role ?? "MANAGER");
  const [propertyIds, setPropertyIds] = useState<number[]>(member?.propertyIds ?? []);
  const [debouncedEmail, setDebouncedEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setSelectedUser(member?.user ?? null);
    setRole(member?.role ?? "MANAGER");
    setPropertyIds(member?.propertyIds ?? []);
    setDebouncedEmail("");
  }, [member, open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(email.trim()), 300);
    return () => clearTimeout(timer);
  }, [email]);

  const search = useQuery({ ...queries.team.search(organizationSlug, debouncedEmail), enabled: !member && debouncedEmail.length >= 3 });
  const searchIsCurrent = debouncedEmail === email.trim();
  const changed = !member || member.role !== role || (role !== "OWNER" && JSON.stringify([...member.propertyIds].sort()) !== JSON.stringify([...propertyIds].sort()));
  const canSave = changed && canSaveTeamMember(role, propertiesForRole(role, propertyIds), Boolean(member || selectedUser)) && !readOnly;
  const selectedPropertyIds = useMemo(() => new Set(propertyIds), [propertyIds]);

  function changeEmail(value: string) {
    setEmail(value);
    setSelectedUser(null);
  }
  function toggleProperty(id: number) {
    setPropertyIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
  function submit() {
    if (!canSave) return;
    onSubmit({ role, propertyIds: propertiesForRole(role, propertyIds), userId: member ? undefined : selectedUser?.id });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={member ? `Edit ${[member.user.firstName, member.user.lastName].filter(Boolean).join(" ") || member.user.email}` : "Add team member"}
      footer={<><Button label={member ? "Save access" : "Add to team"} icon={member ? undefined : UserPlus} onPress={submit} disabled={!canSave} loading={saving} />{member ? <Button label={member.isActive ? "Remove access" : "Restore access"} variant={member.isActive ? "destructive" : "outline"} onPress={() => onToggleAccess?.(member)} disabled={saving || readOnly} /> : null}<Button label="Cancel" variant="ghost" onPress={onClose} disabled={saving} /></>}
    >
      <View style={styles.form}>
        {member ? <Text style={styles.selected}>{member.user.email}</Text> : <>
          <TextField label="Search by email" accessibilityLabel="Search by email" value={email} onChangeText={changeEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="person@example.com" editable={!saving && !readOnly} helper="Choose an existing Tattwix account." />
          {selectedUser ? <Panel flat><ListRow title={[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") || selectedUser.email} detail={selectedUser.email} trailing={<Text style={styles.chosen}>Selected</Text>} /></Panel> : null}
          {searchIsCurrent && search.isFetching ? <Text style={styles.muted}>Searching accounts…</Text> : null}
          {searchIsCurrent && search.isError ? <Text accessibilityRole="alert" style={styles.error}>Could not search accounts. Edit the email or try again.</Text> : null}
          {searchIsCurrent && search.data && !selectedUser ? (search.data.users.length ? <Panel flat>{search.data.users.map((user) => <ListRow key={user.id} icon={Search} title={[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email} detail={user.email} onPress={() => { setSelectedUser(user); toast(`${user.email} selected`); }} />)}</Panel> : <Text style={styles.muted}>No account found. Ask them to register with Tattwix first.</Text>) : null}
        </>}
        <View style={styles.roleSection}>
          <Text style={styles.label}>Role</Text>
          <PillTabs items={roles} value={role} onChange={(value) => setRole(value as TeamRole)} />
        </View>
        {role === "OWNER" ? <Text style={styles.muted}>{member?.role === "OWNER" && !member.hasAllProperties ? "This legacy owner currently has selected-property access. Changing their role will set a new explicit scope." : "Owners can manage the organization and have access to all current and future properties."}</Text> : <View style={styles.scope}>
          <Text style={styles.label}>Property access</Text>
          <Text style={styles.muted}>Choose every property this person can access.</Text>
          <Panel flat>{properties.map((property) => {
            const selected = selectedPropertyIds.has(property.id);
            return <Pressable key={property.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} disabled={saving || readOnly} onPress={() => toggleProperty(property.id)}><ListRow title={property.name} trailing={<Text style={selected ? styles.chosen : styles.muted}>{selected ? "Selected" : "Select"}</Text>} /></Pressable>;
          })}</Panel>
          {!propertyIds.length ? <Text style={styles.error}>Select at least one property for staff.</Text> : null}
        </View>}
        {readOnly ? <Text accessibilityRole="alert" style={styles.error}>The subscription has expired. You can review the team, but changes are unavailable.</Text> : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg, paddingTop: space.md },
  roleSection: { gap: space.xs },
  scope: { gap: space.sm },
  label: { ...type.label, color: colors.subtleForeground },
  selected: { ...type.body, color: colors.foreground },
  muted: { ...type.caption, color: colors.mutedForeground },
  error: { ...type.caption, color: colors.destructive },
  chosen: { ...type.caption, color: colors.success },
});
