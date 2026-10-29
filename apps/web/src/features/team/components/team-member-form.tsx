import { useQuery } from "@tanstack/react-query";
import { propertiesForRole, canSaveTeamMember, saveRefusalSummary, serverFieldErrors, teamMemberFormFields, teamRoleLabels, type TeamRole } from "@tattvix/api";
import type { TeamMember } from "@tattvix/contracts";
import { BottomSheet } from "@tattvix/ui/components/bottom-sheet";
import { Button } from "@tattvix/ui/components/button";
import { Checkbox } from "@tattvix/ui/components/checkbox";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@tattvix/ui/components/combobox";
import { Label } from "@tattvix/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tattvix/ui/components/select";
import { useEffect, useReducer, useState } from "react";
import { useDebouncedValue } from "@/core/hooks/use-debounced-value";
import { teamQueries } from "../api";
import { teamUserSelection } from "../selection";

type Submission = { userId?: number; role: TeamRole; propertyIds: number[] };
export function TeamMemberForm({ org, properties, member, open, busy, saveError, onClose, onSubmit, onToggle }: {
  org: string; properties: { id: number; name: string }[]; member?: TeamMember;
  open: boolean; busy: boolean; saveError: unknown; onClose: () => void;
  onSubmit: (input: Submission) => void; onToggle: (member: TeamMember) => void;
}) {
  const [{ search, selected }, select] = useReducer(teamUserSelection, { search: "", selected: null });
  const [role, setRole] = useState<TeamRole>(member?.role ?? "MANAGER");
  const [ids, setIds] = useState<number[]>(member?.propertyIds ?? []);
  const term = useDebouncedValue(search.trim().toLowerCase(), 300);
  const users = useQuery({ ...teamQueries.search(org, term), enabled: open && !member && !selected && term.length >= 3 && term.length <= 100 });
  const currentSearch = term === search.trim().toLowerCase();
  useEffect(() => {
    if (!open) return;
    select({type:"select",user:null}); setRole(member?.role ?? "MANAGER"); setIds(member?.propertyIds ?? []);
  }, [member, open]);
  const scopeChanged = JSON.stringify([...ids].sort((a,b) => a-b)) !== JSON.stringify([...(member?.propertyIds ?? [])].sort((a,b) => a-b));
  const changed = !member || role !== member.role || (role !== "OWNER" && scopeChanged);
  const valid = changed && canSaveTeamMember(role, propertiesForRole(role, ids), !!member || !!selected);
  // The page owns the mutation; its refusal lands under the control it names
  // and the summary line covers the rest.
  const errors = serverFieldErrors(saveError, teamMemberFormFields).fieldErrors;
  const error = saveRefusalSummary(saveError, errors, teamMemberFormFields, "The team change could not be saved. Please try again.");
  let empty = "Type at least 3 characters of an email.";
  if (term.length >= 3) empty = users.isFetching || !currentSearch ? "Searching accounts…" : users.isError ? "Could not search accounts. Edit the email or try again." : "No account found. Ask them to register with Tattwix first.";

  return <BottomSheet open={open} onOpenChange={(value) => { if (!value && !busy) onClose(); }} title={member ? "Edit team access" : "Add team member"} footer={<div className="flex flex-wrap justify-end gap-2">
    {member ? <Button variant={member.isActive ? "destructive" : "outline"} disabled={busy} onClick={() => onToggle(member)}>{member.isActive ? "Remove access" : "Restore access"}</Button> : null}
    <Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
    <Button disabled={!valid || busy} onClick={() => { if (valid) onSubmit({ userId: selected?.id, role, propertyIds: propertiesForRole(role, ids) }); }}>{busy ? "Saving..." : member ? "Save access" : "Add to team"}</Button>
  </div>}>
    <div className="grid gap-5">
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {member ? <p className="text-sm font-medium wrap-anywhere">{member.user.email}</p> : <div className="grid gap-2">
        <Label>Search by email</Label>
        <Combobox items={currentSearch ? users.data?.users ?? [] : []} value={selected} onValueChange={(value, details) => { if (value || details.reason === "clear-press") select({type:"select",user:value}); }} inputValue={search} onInputValueChange={(value, details) => select({type:"input",value,reason:details.reason})} itemToStringLabel={(user) => user.email} itemToStringValue={(user) => String(user.id)}>
          <ComboboxInput aria-label="Search by email" placeholder="person@example.com" autoComplete="off" showClear disabled={busy} />
          <ComboboxContent><ComboboxEmpty>{empty}</ComboboxEmpty><ComboboxList>{(user) => <ComboboxItem key={user.id} value={user}><span className="grid gap-1"><span>{user.email}</span><span className="text-xs text-muted-foreground">{[user.firstName,user.lastName].filter(Boolean).join(" ")}</span></span></ComboboxItem>}</ComboboxList></ComboboxContent>
        </Combobox>
        {selected ? <p role="status" className="text-sm text-muted-foreground">Selected: {selected.email}</p> : null}
        {errors.userId ? <p className="text-xs text-destructive">{errors.userId}</p> : null}
      </div>}
      <div className="grid gap-2"><Label>Role</Label><Select items={Object.entries(teamRoleLabels).map(([value,label]) => ({value,label}))} value={role} onValueChange={(value) => setRole(value as TeamRole)} disabled={busy}><SelectTrigger aria-label="Role" aria-invalid={Boolean(errors.role)}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(teamRoleLabels).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>{errors.role ? <p className="text-xs text-destructive">{errors.role}</p> : null}</div>
      {role === "OWNER" ? <p className="text-sm text-muted-foreground">Owners can manage everyone in the organization and access all current and future properties.</p> : <fieldset className="grid gap-3"><legend className="mb-3 text-sm font-medium">Property access</legend>
        {member?.hasAllProperties && role === member.role ? <p className="text-sm text-muted-foreground">Currently has all-property access. Saving selected properties replaces that scope.</p> : null}
        {properties.map((property) => <label key={property.id} className="flex items-center gap-3 text-sm"><Checkbox aria-label={property.name} checked={ids.includes(property.id)} disabled={busy} onCheckedChange={(checked) => setIds((current) => checked ? [...current, property.id] : current.filter((id) => id !== property.id))} />{property.name}</label>)}
        {!ids.length ? <p className="text-sm text-muted-foreground">Select at least one property for staff.</p> : null}
        {errors.propertyIds ? <p className="text-xs text-destructive">{errors.propertyIds}</p> : null}
      </fieldset>}
    </div>
  </BottomSheet>;
}
