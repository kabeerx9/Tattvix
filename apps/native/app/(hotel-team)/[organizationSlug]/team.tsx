import { classifyApiError, createTeamMutations, refreshLostTeamAccess, saveRefusalSummary, teamMemberFormFields, teamMemberName } from "@tattvix/api";
import type { TeamMember } from "@tattvix/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { UserPlus, UsersRound } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TeamMemberForm } from "@/src/components/team-member-form";
import { PendingScreen, RetryScreen } from "@/src/components/status-screens";
import { Button, ConfirmSheet, EmptyState, ListRow, Panel, Screen, SecondaryHeader, SectionTitle, StatusPill, colors, space, toast, type } from "@/src/design-system";
import { api, queries } from "@/src/lib/api";
import { useCurrentUser } from "@/src/lib/current-user";
import { buildTeamMemberPatch, isLostTeamAccess, propertyScopeLabel } from "@/src/lib/team-member-form";
import { queryClient } from "@/src/lib/query";

type Change = { memberId: number; input: { role?: TeamMember["role"]; propertyIds?: number[]; isActive?: boolean }; title: string; description: string; tone?: "primary" | "destructive"; self?: boolean } | { memberId?: never; input: { userId: number; role: TeamMember["role"]; propertyIds: number[] }; title: string; description: string; tone?: "primary" | "destructive"; self?: boolean };

export default function TeamScreen() {
  const { organizationSlug } = useGlobalSearchParams<{ organizationSlug: string }>();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const team = useQuery(queries.team.list(organizationSlug));
  const [formMember, setFormMember] = useState<TeamMember | null | undefined>(undefined);
  const [change, setChange] = useState<Change | null>(null);
  const mutations = createTeamMutations(api.team, queryClient, organizationSlug);
  const mutation = useMutation({
    ...mutations.update,
    onSuccess: async () => {
      await mutations.update.onSuccess();
      const self = change?.self;
      setChange(null);
      setFormMember(undefined);
      toast("Team access updated");
      if (self) router.replace("/");
    },
  });
  const add = useMutation({
    ...mutations.add,
    onSuccess: async () => {
      await mutations.add.onSuccess();
      setChange(null);
      setFormMember(undefined);
      toast("Team member added");
    },
  });
  const namesById = useMemo(() => new Map(team.data?.properties.map((property) => [property.id, property.name]) ?? []), [team.data?.properties]);
  const activeMembers = team.data?.members.filter((member) => member.isActive) ?? [];
  const inactiveMembers = team.data?.members.filter((member) => !member.isActive) ?? [];
  const readOnly = !team.data?.subscription.entitled;
  const saveError = add.error ?? mutation.error;
  // The form's controls live in TeamMemberForm; the server's per-field
  // refusals (role, property access) are named in this one line instead.
  const saveErrorLine = saveError ? saveRefusalSummary(saveError, {}, teamMemberFormFields, classifyApiError(saveError).message) : null;

  useEffect(() => {
    if (isLostTeamAccess(team.error) || isLostTeamAccess(saveError)) {
      void refreshLostTeamAccess(queryClient, organizationSlug);
    }
  }, [saveError, team.error]);
  useEffect(() => {
    if (formMember && team.data && !team.data.members.some((member) => member.id === formMember.id)) {
      setFormMember(undefined);
    }
  }, [formMember, team.data]);

  if (!currentUser.data) return currentUser.isError ? <RetryScreen onRetry={() => void currentUser.refetch()} retrying={currentUser.isFetching} error={currentUser.error} /> : <PendingScreen />;
  if (!team.data) return team.isError ? <RetryScreen onRetry={() => void team.refetch()} retrying={team.isFetching} error={team.error} /> : <PendingScreen />;
  const user = currentUser.data;

  function saveForm(input: { role: TeamMember["role"]; propertyIds: number[]; userId?: number; roleChanged: boolean; propertyScopeChanged: boolean }) {
    if (!formMember) {
      if (!input.userId) return;
      if (input.role === "OWNER") {
        setChange({ input: { userId: input.userId, role: input.role, propertyIds: input.propertyIds }, title: "Grant owner access?", description: "Owners can manage every person and property in this organization.", self: input.userId === user.id });
      } else add.mutate({ userId: input.userId, role: input.role, propertyIds: input.propertyIds });
      return;
    }
    const refreshedMember = team.data?.members.find((member) => member.id === formMember.id);
    if (!refreshedMember) {
      setFormMember(undefined);
      void team.refetch();
      return;
    }
    const scopeChanged = input.roleChanged || input.propertyScopeChanged;
    const inputChange = buildTeamMemberPatch(input);
    const self = refreshedMember.user.id === user.id;
    if (input.roleChanged && input.role === "OWNER" && refreshedMember.role !== "OWNER") {
      setChange({ memberId: refreshedMember.id, input: inputChange, title: "Grant owner access?", description: "Owners can manage every person and property in this organization.", self });
    } else if (self && scopeChanged) {
      setChange({ memberId: refreshedMember.id, input: inputChange, title: "Change your own access?", description: "You will return to your account after this change.", self });
    } else mutation.mutate({ memberId: refreshedMember.id, input: inputChange });
  }
  function toggleAccess(member: TeamMember) {
    const self = member.user.id === user.id;
    setChange({ memberId: member.id, input: { isActive: !member.isActive }, title: member.isActive ? "Remove access?" : "Restore access?", description: member.isActive ? `${teamMemberName(member)} will no longer be able to use this hotel.` : `${teamMemberName(member)} can use this hotel again with their saved access.`, tone: member.isActive ? "destructive" : "primary", self });
    setFormMember(undefined);
  }
  function confirmChange() {
    if (!change) return;
    if (change.memberId) mutation.mutate({ memberId: change.memberId, input: change.input });
    else if ("userId" in change.input) add.mutate(change.input);
  }

  return <Screen refreshing={team.isRefetching} onRefresh={() => void team.refetch()}>
    <SecondaryHeader title="Team" onBack={() => router.back()} />
    <View style={styles.content}>
      <Text style={styles.meta}>{team.data.organization.name}</Text>
      {readOnly ? <Text accessibilityRole="alert" style={styles.warning}>Subscription expired. You can review team access, but changes are unavailable.</Text> : <Button label="Add team member" icon={UserPlus} onPress={() => setFormMember(null)} />}
      {saveErrorLine ? <Text accessibilityRole="alert" style={styles.error}>{saveErrorLine}</Text> : null}
      <SectionTitle>Active members</SectionTitle>
      {activeMembers.length ? <Panel>{activeMembers.map((member) => <ListRow key={member.id} title={teamMemberName(member)} detail={`${member.role[0] + member.role.slice(1).toLowerCase()} · ${propertyScopeLabel(member, namesById)}\n${member.user.email}`} trailing={<StatusPill tone="success">Active</StatusPill>} chevron={!readOnly} onPress={readOnly ? undefined : () => setFormMember(member)} />)}</Panel> : <EmptyState icon={UsersRound} text="No one has access to this organization yet." />}
      {inactiveMembers.length ? <><SectionTitle>Inactive members</SectionTitle><Panel>{inactiveMembers.map((member) => <ListRow key={member.id} title={teamMemberName(member)} detail={`${member.role[0] + member.role.slice(1).toLowerCase()} · ${propertyScopeLabel(member, namesById)}\n${member.user.email}`} trailing={<StatusPill tone="neutral">Inactive</StatusPill>} chevron={!readOnly} onPress={readOnly ? undefined : () => setFormMember(member)} />)}</Panel></> : null}
    </View>
    <TeamMemberForm organizationSlug={organizationSlug} properties={team.data.properties} member={formMember ? team.data.members.find((member) => member.id === formMember.id) : undefined} open={formMember === null || Boolean(formMember && team.data.members.some((member) => member.id === formMember.id))} readOnly={readOnly} onClose={() => setFormMember(undefined)} saving={add.isPending || mutation.isPending} error={!change && saveErrorLine ? saveErrorLine : undefined} saveError={!change ? saveError : undefined} onToggleAccess={toggleAccess} onSubmit={saveForm} />
    <ConfirmSheet open={Boolean(change)} onClose={() => setChange(null)} title={change?.title ?? "Confirm"} description={change?.description ?? ""} confirmLabel={change?.tone === "destructive" ? "Remove access" : "Confirm"} tone={change?.tone} loading={add.isPending || mutation.isPending} error={change && saveErrorLine ? saveErrorLine : undefined} onConfirm={confirmChange} />
  </Screen>;
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  meta: { ...type.meta, color: colors.mutedForeground },
  warning: { ...type.caption, color: colors.warning },
  error: { ...type.caption, color: colors.destructive },
});
