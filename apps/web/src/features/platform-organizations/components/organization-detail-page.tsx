import type {
  PlatformMember,
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

import { PageHeader, Surface } from "@/components/design-system";
import { UserEmailCombobox } from "@/features/platform-users/components/user-email-combobox";
import { ApiError } from "@/lib/api";

import { platformOrganizationMutations } from "../mutations";
import { platformOrganizationQueries } from "../queries";

const ROLES: PlatformMembershipRole[] = ["OWNER", "MANAGER", "RECEPTION"];

export function OrganizationDetailPage({
  organizationSlug,
}: {
  organizationSlug: string;
}) {
  const { data } = useSuspenseQuery(
    platformOrganizationQueries.detail(organizationSlug),
  );

  return (
    <div className="mx-auto grid max-w-[1400px] gap-7">
      <PageHeader
        eyebrow="Platform administration"
        title={data.organization.name}
        description={`${data.organization.slug} · ${
          data.organization.isActive ? "Active" : "Inactive"
        }`}
      />

      <PropertiesSection
        organizationSlug={organizationSlug}
        properties={data.properties}
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
  properties: { id: number; name: string; slug: string; isActive: boolean }[];
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
    <Surface>
      <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
            <Hotel className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Properties</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Physical hotels operated under this organization.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowForm((value) => !value)}>
          <Plus />
          Add property
        </Button>
      </div>

      {showForm ? (
        <form
          className="grid gap-4 border-b p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
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
              className="sm:col-span-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          ) : null}
        </form>
      ) : null}

      {properties.length ? (
        <div className="divide-y">
          {properties.map((property) => (
            <div
              key={property.id}
              className="flex items-center justify-between gap-4 p-5 sm:p-6"
            >
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{property.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {property.slug}
                </p>
              </div>
              <StatusBadge isActive={property.isActive} />
            </div>
          ))}
        </div>
      ) : (
        <p className="p-6 text-sm text-muted-foreground">
          No properties yet. Add the first property for this organization.
        </p>
      )}
    </Surface>
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
    <Surface>
      <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
            <Users className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Members</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              People with access to this organization and its properties.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowForm((value) => !value)}>
          <UserRoundPlus />
          Add member
        </Button>
      </div>

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
              className="sm:col-span-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {addErrorMessage}
            </p>
          ) : null}
        </form>
      ) : null}

      {members.length ? (
        <div className="divide-y">
          {members.map((member) => (
            <div key={member.id} className="grid gap-3 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">
                    {[member.user.firstName, member.user.lastName]
                      .filter(Boolean)
                      .join(" ") || member.user.email}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      changeRole(member, value as PlatformMembershipRole)
                    }
                  >
                    <SelectTrigger
                      className="w-[150px]"
                      aria-label={`Role for ${member.user.email}`}
                      disabled={updateMutation.isPending}
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() => toggleActive(member)}
                  >
                    {member.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
              {rowError && rowError.id === member.id ? (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {rowError.message}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="p-6 text-sm text-muted-foreground">
          No members yet. Add the first member for this organization.
        </p>
      )}
    </Surface>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={
        isActive
          ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
          : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
      }
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function roleLabel(role: PlatformMembershipRole) {
  return {
    OWNER: "Owner",
    MANAGER: "Manager",
    RECEPTION: "Reception",
  }[role];
}
