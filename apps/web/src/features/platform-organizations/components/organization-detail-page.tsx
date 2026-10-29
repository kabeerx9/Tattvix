import { PLATFORM_ROLES, platformMemberName, platformRoleLabel } from "@tattvix/api";
import type {
  PlatformMember,
  PlatformPortfolioProperty,
  PlatformMembershipRole,
  PlatformUserSearchResult,
} from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tattvix/ui/components/select";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Hotel, Plus, UserRoundPlus, Users } from "lucide-react";
import { useState } from "react";

import { EmptyState, Fact, FactsRow, InitialsAvatar, ListRow, PageHeader, Panel, PanelHeader, ResponsiveTable, SectionTitle, StatusPill } from "@/components/design-system";
import { PortfolioPropertyCard } from "@/features/platform-portfolio/components/portfolio-parts";
import { formatPercent, getPortfolioTotals } from "@/features/platform-portfolio/metrics";
import { platformPortfolioQueries } from "@/features/platform-portfolio/queries";
import { UserEmailCombobox } from "@/features/platform-users/components/user-email-combobox";
import { ApiError } from "@/lib/api";
import { formatMoneyWholeRupees } from "@/lib/money";

import { platformOrganizationMutations } from "../mutations";
import { platformOrganizationQueries } from "../queries";
import { SubscriptionSection } from "./subscription-section";

const ROLES = PLATFORM_ROLES;
const memberName = platformMemberName;
const roleLabel = platformRoleLabel;

export function OrganizationDetailPage({
  organizationSlug,
}: {
  organizationSlug: string;
}) {
  const { data } = useSuspenseQuery(
    platformOrganizationQueries.detail(organizationSlug),
  );
  const { data: portfolio } = useSuspenseQuery(
    platformPortfolioQueries.list(organizationSlug),
  );
  const totals = getPortfolioTotals(portfolio.properties);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader
        title={data.organization.name}
        meta={`${data.organization.slug} · ${
          data.organization.isActive ? "Active" : "Inactive"
        }`}
      />
      <FactsRow>
        <Fact label="Properties" value={data.properties.length} />
        <Fact label="Rooms" value={totals.rooms} detail={`${totals.readyRooms} ready`} />
        <Fact label="Occupancy tonight" value={formatPercent(totals.occupancyTonight)} detail={`${formatPercent(totals.occupancyRecent)} last 7 nights`} />
        <Fact label="In house" value={totals.inHouse} detail={`${totals.checkInsLast7Days} check-ins in 7 days`} />
        <Fact label="Revenue" value={formatMoneyWholeRupees(totals.revenueLast30DaysMinor)} detail="last 30 days" />
        <Fact label="Members" value={data.members.length} />
      </FactsRow>

      <SubscriptionSection
        organizationSlug={organizationSlug}
        subscription={data.subscription}
        pricing={data.pricing}
      />

      <PropertiesSection
        organizationSlug={organizationSlug}
        properties={portfolio.properties}
      />

      <MembersSection
        organizationSlug={organizationSlug}
        members={data.members}
      />
    </div>
  );
}

function PropertiesSection({
  organizationSlug,
  properties,
}: {
  organizationSlug: string;
  properties: PlatformPortfolioProperty[];
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const createMutation = useMutation(
    platformOrganizationMutations.createProperty(queryClient),
  );

  function createProperty(event: React.FormEvent) {
    event.preventDefault();
    createMutation.mutate(
      { organizationSlug, input: { name, slug } },
      {
        onSuccess: () => {
          setName("");
          setSlug("");
          setShowForm(false);
        },
      },
    );
  }

  const errorMessage =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : createMutation.isError
        ? "The property could not be created."
        : null;

  return (
    <section className="grid gap-4">
      <SectionTitle
        title="Properties"
        meta={`${properties.length} ${properties.length === 1 ? "property" : "properties"}`}
        action={
          <Button variant="outline" onClick={() => setShowForm((value) => !value)}>
            <Plus />
            Add property
          </Button>
        }
      />

      {showForm ? (
        <Panel>
          <form
            className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={createProperty}
          >
            <div className="grid gap-2">
              <Label>Property name</Label>
              <Input
                required
                autoFocus
                maxLength={255}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example Jaipur"
              />
            </div>
            <div className="grid gap-2">
              <Label>Property slug</Label>
              <Input
                required
                maxLength={255}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                autoCapitalize="none"
                autoComplete="off"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="jaipur"
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Save property"}
            </Button>
            {errorMessage ? (
              <p
                role="alert"
                className="sm:col-span-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {errorMessage}
              </p>
            ) : null}
          </form>
        </Panel>
      ) : null}

      {properties.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PortfolioPropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            icon={Hotel}
            title="No properties yet"
            description="Add the first property for this organization."
          />
        </Panel>
      )}
    </section>
  );
}

function MembersSection({
  organizationSlug,
  members,
}: {
  organizationSlug: string;
  members: PlatformMember[];
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState<PlatformUserSearchResult | null>(null);
  const [userPickerKey, setUserPickerKey] = useState(0);
  const [role, setRole] = useState<PlatformMembershipRole>("RECEPTION");
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);

  const addMutation = useMutation(
    platformOrganizationMutations.addMember(queryClient),
  );
  const updateMutation = useMutation(
    platformOrganizationMutations.updateMember(queryClient),
  );

  function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    addMutation.mutate(
      { organizationSlug, input: { email: user.email, role } },
      {
        onSuccess: () => {
          setUser(null);
          setUserPickerKey((key) => key + 1);
          setRole("RECEPTION");
          setShowForm(false);
        },
      },
    );
  }

  function changeRole(member: PlatformMember, nextRole: PlatformMembershipRole) {
    setRowError(null);
    updateMutation.mutate(
      { organizationSlug, memberId: member.id, input: { role: nextRole } },
      {
        onError: (error) => {
          setRowError({
            id: member.id,
            message:
              error instanceof ApiError
                ? error.message
                : "The role could not be updated.",
          });
        },
      },
    );
  }

  function toggleActive(member: PlatformMember) {
    setRowError(null);
    updateMutation.mutate(
      {
        organizationSlug,
        memberId: member.id,
        input: { isActive: !member.isActive },
      },
      {
        onError: (error) => {
          setRowError({
            id: member.id,
            message:
              error instanceof ApiError
                ? error.message
                : "The membership could not be updated.",
          });
        },
      },
    );
  }

  const addErrorMessage =
    addMutation.error instanceof ApiError
      ? addMutation.error.message
      : addMutation.isError
        ? "The member could not be added."
        : null;

  return (
    <Panel>
      <PanelHeader title="Members" icon={Users} meta={members.length} actions={
        <Button variant="outline" onClick={() => setShowForm((value) => !value)}>
          <UserRoundPlus />
          Add member
        </Button>
      } />

      {showForm ? (
        <form
          className="grid gap-4 border-b p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end sm:p-6"
          onSubmit={addMember}
        >
          <div className="grid gap-2">
            <Label>Account</Label>
            <UserEmailCombobox
              key={userPickerKey}
              value={user}
              onValueChange={setUser}
            />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select
              items={ROLES.map((roleOption) => ({ value: roleOption, label: roleLabel(roleOption) }))}
              value={role}
              onValueChange={(value) => setRole(value as PlatformMembershipRole)}
            >
              <SelectTrigger aria-label="New member role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {roleLabel(roleOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={!user || addMutation.isPending}>
            {addMutation.isPending ? "Adding..." : "Add member"}
          </Button>
          {addErrorMessage ? (
            <p
              role="alert"
              className="sm:col-span-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {addErrorMessage}
            </p>
          ) : null}
        </form>
      ) : null}

      {members.length ? (
        <ResponsiveTable
          label="Members"
          rows={members}
          getRowKey={(member) => member.id}
          switchAt="2xl"
          columns={[
            { header: "Member", className: "flex items-center gap-3", cell: (member) => <><InitialsAvatar name={memberName(member)} /><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{memberName(member)}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{member.user.email}</p></div></> },
            { header: "Role · Status · Actions", width: "340px", cell: (member) => <MemberControls member={member} disabled={updateMutation.isPending} onRoleChange={(nextRole) => changeRole(member, nextRole)} onToggleActive={() => toggleActive(member)} /> },
          ]}
          mobileRow={(member) => (
            <ListRow
              leading={<InitialsAvatar name={memberName(member)} />}
              title={memberName(member)}
              meta={member.user.email}
            >
              <MemberControls member={member} disabled={updateMutation.isPending} onRoleChange={(nextRole) => changeRole(member, nextRole)} onToggleActive={() => toggleActive(member)} />
            </ListRow>
          )}
          rowFooter={(member) =>
            rowError && rowError.id === member.id ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {rowError.message}
              </p>
            ) : null
          }
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Add the first member for this organization."
        />
      )}
    </Panel>
  );
}

function MemberControls({
  member,
  disabled,
  onRoleChange,
  onToggleActive,
}: {
  member: PlatformMember;
  disabled: boolean;
  onRoleChange: (role: PlatformMembershipRole) => void;
  onToggleActive: () => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Select items={ROLES.map((roleOption) => ({ value: roleOption, label: roleLabel(roleOption) }))} value={member.role} onValueChange={(value) => onRoleChange(value as PlatformMembershipRole)}>
        <SelectTrigger
          className="min-w-0 flex-1 sm:w-[150px] sm:flex-none"
          aria-label={`Role for ${member.user.email}`}
          disabled={disabled}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((roleOption) => (
            <SelectItem key={roleOption} value={roleOption}>
              {roleLabel(roleOption)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <StatusBadge isActive={member.isActive} />
      <Button variant="outline" size="sm" disabled={disabled} onClick={onToggleActive}>
        {member.isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) { return <StatusPill tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</StatusPill>; }
