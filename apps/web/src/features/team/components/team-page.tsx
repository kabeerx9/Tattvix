import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext, useRouter, useNavigate } from "@tanstack/react-router";
import { createTeamMutations, refreshLostTeamAccess, propertyScopeLabel, saveRefusalSummary, teamMemberName, teamMemberFormFields, teamRoleLabels } from "@tattvix/api";
import { ApiError, type TeamAddInput, type TeamMember, type TeamUpdateInput } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, PanelHeader, PanelSection, ListRow, StatusPill } from "@/components/design-system";
import { teamApi, teamQueries } from "../api";
import { TeamMemberForm } from "./team-member-form";

type Change = { memberId: number; input: TeamUpdateInput; title: string; description: string } | { memberId?: never; input: TeamAddInput; title: string; description: string };
export function TeamPage({ org }: { org: string }) {
  const client = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const { auth } = useRouteContext({ from: "__root__" });
  const team = useQuery(teamQueries.list(org));
  const [editing, setEditing] = useState<TeamMember | null | undefined>();
  const [change, setChange] = useState<Change | null>(null);
  const mutations = createTeamMutations(teamApi, client, org);
  // The failed request itself: the form shows its per-field refusals under
  // the role and property controls, the page and confirm sheet one summary line.
  const [saveError, setSaveError] = useState<unknown>(null);
  const setError = (error: unknown) => setSaveError(error);
  const error = saveRefusalSummary(saveError, {}, teamMemberFormFields, "The team change could not be saved. Please try again.");
  async function completed() {
    setEditing(undefined); setChange(null); setError(null);
    await router.invalidate();
    toast.success("Team access saved");
  }
  function failed(error: unknown) {
    setError(error);
    if (error instanceof ApiError && [403,404].includes(error.status)) void refreshLostTeamAccess(client, org).then(() => router.invalidate());
  }
  const add = useMutation({ ...mutations.add, onSuccess: async () => { await mutations.add.onSuccess(); await completed(); }, onError: failed });
  const update = useMutation({ ...mutations.update, onSuccess: async () => { await mutations.update.onSuccess(); await completed(); }, onError: failed });
  const busy = add.isPending || update.isPending;
  const owns = auth.currentUser?.memberships.some((m) => m.organization.slug === org && m.permissions.includes("members:manage"));
  useEffect(() => { if (!owns) void navigate({ to: "/settings", replace: true }); }, [owns, navigate]);
  useEffect(() => { if (team.error instanceof ApiError && [403,404].includes(team.error.status)) void refreshLostTeamAccess(client, org).then(() => router.invalidate()); }, [team.error, client, router]);
  if (!owns) return null;
  if (!team.data) return <div className="grid gap-4"><PageHeader title="Team" /><p role={team.isError ? "alert" : "status"}>{team.isError ? "Could not load the team. Please try again." : "Loading team…"}</p>{team.isError ? <Button variant="outline" className="w-fit" onClick={() => void team.refetch()}>Try again</Button> : null}</div>;
  const data = team.data;
  const readOnly = !data.subscription.entitled;
  const names = new Map(data.properties.map((p) => [p.id,p.name]));
  function submit(input: { userId?: number; role: TeamMember["role"]; propertyIds: number[] }) {
    setError(null);
    if (editing) {
      const roleChanged = input.role !== editing.role;
      const scopeChanged = input.role !== "OWNER" && JSON.stringify([...input.propertyIds].sort()) !== JSON.stringify([...editing.propertyIds].sort());
      const patch: TeamUpdateInput = { ...(roleChanged ? { role: input.role } : {}), ...(roleChanged || scopeChanged ? { propertyIds: input.propertyIds } : {}) };
      const self = editing.user.id === auth.currentUser?.id;
      if (self || (roleChanged && input.role === "OWNER")) setChange({ memberId: editing.id, input: patch, title: self ? "Change your own access?" : "Grant owner access?", description: self ? "Your available hotels and team controls will change immediately." : "This person will have full control of the organization, including your access." });
      else update.mutate({ memberId: editing.id, input: patch });
    } else if (input.userId) {
      const body = { ...input, userId: input.userId };
      if (body.role === "OWNER") setChange({ input: body, title: "Grant owner access?", description: "This person will have full control of the organization, including your access." });
      else add.mutate(body);
    }
  }
  function toggle(member: TeamMember) {
    setError(null);
    setChange({ memberId: member.id, input: { isActive: !member.isActive }, title: member.isActive ? "Remove access?" : "Restore access?", description: member.isActive ? `${teamMemberName(member)} will lose access to this organization's hotels. Their account and past records will remain.` : `${teamMemberName(member)} will regain their saved role and property access.` });
  }
  return <div className="mx-auto grid max-w-[1400px] gap-6">
    <PageHeader title="Team" meta={data.organization.name} actions={<Button disabled={readOnly} onClick={() => { setError(null); setEditing(null); }}>Add team member</Button>} />
    {readOnly ? <p role="status" className="text-sm text-muted-foreground">Subscription expired. Team access is available to review; changes are paused.</p> : null}
    {team.isError ? <p role="alert" className="text-sm text-destructive">The team could not be refreshed. Showing the last loaded members.</p> : null}
    {error && editing === undefined && !change ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {[true,false].map((active) => <Panel key={String(active)}><PanelHeader title={active ? "Active members" : "Inactive members"} />
      {data.members.filter((m) => m.isActive === active).map((member) => <PanelSection key={member.id}><ListRow title={teamMemberName(member)} badge={<StatusPill tone={active ? "neutral" : "warning"}>{teamRoleLabels[member.role]}</StatusPill>} meta={<><span>{member.user.email}</span><span className="block">{propertyScopeLabel(member,names)}</span></>} trailing={<Button variant="outline" disabled={readOnly} onClick={() => { setError(null); setEditing(member); }}>Edit<span className="sr-only"> {member.user.email}</span></Button>} /></PanelSection>)}
      {!data.members.some((m) => m.isActive === active) ? <PanelSection><p className="text-sm text-muted-foreground">{active ? "No active members." : "No inactive members."}</p></PanelSection> : null}
    </Panel>)}
    <TeamMemberForm org={org} properties={data.properties} member={editing ?? undefined} open={editing !== undefined} busy={busy} saveError={change ? null : saveError} onClose={() => { setEditing(undefined); setError(null); }} onSubmit={submit} onToggle={toggle} />
    <BottomSheet open={!!change} onOpenChange={(open) => { if (!open && !busy) setChange(null); }} title={change?.title} footer={<div className="flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setChange(null)}>Cancel</Button><Button disabled={busy} onClick={() => { if (!change) return; if (change.memberId) update.mutate({ memberId: change.memberId, input: change.input }); else if ("userId" in change.input) add.mutate(change.input); }}>{busy ? "Saving..." : "Confirm"}</Button></div>}>
      <p className="text-sm">{change?.description}</p>{error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
    </BottomSheet>
  </div>;
}
