import { createPropertyNameApi, propertyNameMutation, propertyNameQuery } from "@tattvix/api";
import { propertyNameSchema } from "@tattvix/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { Panel, PanelHeader, PanelSection } from "@/components/design-system";
import { apiClient } from "@/lib/api";
import { useHotelSubscription } from "@/features/subscription/use-hotel-subscription";

const api = createPropertyNameApi(apiClient);

export function PropertyNameForm({ organizationSlug, propertySlug, canManage }: { organizationSlug: string; propertySlug: string; canManage: boolean }) {
  const queryClient = useQueryClient();
  const subscription = useHotelSubscription(organizationSlug);
  const editable = canManage && subscription?.entitled === true;
  const query = useQuery(propertyNameQuery(api, organizationSlug, propertySlug));
  const [name, setName] = useState("");
  const id = useId();
  const mutation = useMutation(propertyNameMutation(api, queryClient, organizationSlug, propertySlug));
  useEffect(() => { if (query.data) setName(query.data.name); }, [query.data]);
  const valid = propertyNameSchema.safeParse({ name }).success;

  return (
    <Panel>
      <PanelHeader title="Property name" />
      <PanelSection>
        {query.data ? (
          <form className="grid gap-4" onSubmit={(event) => {
            event.preventDefault();
            if (editable && valid) mutation.mutate({ name }, { onSuccess: () => toast.success("Property name saved") });
          }}>
            <div className="grid gap-2">
              <Label htmlFor={id}>Property name</Label>
              <Input id={id} value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} disabled={!editable || mutation.isPending} />
              {name !== query.data.name && !valid ? <p role="alert" className="text-sm text-destructive">Enter a property name between 1 and 255 characters.</p> : null}
            </div>
            {canManage ? <Button type="submit" className="w-fit" variant="outline" disabled={!editable || !valid || name.trim() === query.data.name || mutation.isPending}>{mutation.isPending ? "Saving..." : "Save name"}</Button> : null}
            {mutation.isError ? <p role="alert" className="text-sm text-destructive">The property name could not be saved. Please try again.</p> : null}
          </form>
        ) : query.isError ? (
          <div className="grid gap-2"><p role="alert" className="text-sm text-destructive">The property name could not be loaded.</p><Button variant="outline" className="w-fit" onClick={() => void query.refetch()}>Try again</Button></div>
        ) : <p className="text-sm text-muted-foreground">Loading property name…</p>}
      </PanelSection>
    </Panel>
  );
}
