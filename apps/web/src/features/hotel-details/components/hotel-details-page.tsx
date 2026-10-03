import type { PropertyDetails, PropertyDetailsInput } from "@tattvix/contracts";
import { Button } from "@tattvix/ui/components/button";
import { Input } from "@tattvix/ui/components/input";
import { Label } from "@tattvix/ui/components/label";
import { Textarea } from "@tattvix/ui/components/textarea";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Building2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader, PanelSection } from "@/components/design-system";
import { PropertyPhotosPanel } from "@/features/property-photos/components/property-photos-panel";
import { ApiError } from "@/lib/api";

import { hotelDetailsMutations } from "../mutations";
import { hotelDetailsQueries } from "../queries";

function toInput(details: PropertyDetails): PropertyDetailsInput {
  return {
    address: details.address,
    contactPhone: details.contactPhone,
    description: details.description,
    amenities: details.amenities,
    checkInTime: details.checkInTime,
    checkOutTime: details.checkOutTime,
  };
}

export function HotelDetailsPage({
  organizationSlug,
  propertySlug,
  canManage,
}: {
  organizationSlug: string;
  propertySlug: string;
  propertyName: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: details } = useSuspenseQuery(
    hotelDetailsQueries.property(organizationSlug, propertySlug),
  );
  const [amenitiesText, setAmenitiesText] = useState(
    details.amenities.join("\n"),
  );
  const [input, setInput] = useState(() => toInput(details));
  const updateMutation = useMutation(hotelDetailsMutations.update(queryClient));

  useEffect(() => {
    setInput(toInput(details));
    setAmenitiesText(details.amenities.join("\n"));
  }, [details]);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateMutation.mutate(
      {
        organizationSlug,
        propertySlug,
        input: {
          ...input,
          amenities: amenitiesText
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        },
      },
      { onSuccess: () => toast.success("Hotel details saved") },
    );
  }

  const error =
    updateMutation.error instanceof ApiError
      ? updateMutation.error.message
      : updateMutation.isError
        ? "The hotel details could not be saved."
        : null;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6">
      <PageHeader title="Property settings" />
      <form className="grid gap-6" onSubmit={save}>
        <Panel>
          <PanelHeader title="Property information" icon={Building2} />
          <PanelSection>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Address">
              <Input
                disabled={!canManage}
                value={input.address}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Contact phone">
              <Input
                disabled={!canManage}
                type="tel"
                value={input.contactPhone}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    contactPhone: event.target.value,
                  }))
                }
              />
            </Field>
            <Field className="sm:col-span-2" label="Description">
              <Textarea
                disabled={!canManage}
                value={input.description}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="A short introduction to the property"
              />
            </Field>
            <Field label="Check-in time">
              <Input
                disabled={!canManage}
                type="time"
                value={input.checkInTime}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    checkInTime: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Check-out time">
              <Input
                disabled={!canManage}
                type="time"
                value={input.checkOutTime}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    checkOutTime: event.target.value,
                  }))
                }
              />
            </Field>
            <Field className="sm:col-span-2" label="Amenities">
              <Textarea
                disabled={!canManage}
                value={amenitiesText}
                onChange={(event) => setAmenitiesText(event.target.value)}
                placeholder="Breakfast\nWi-Fi\nParking"
              />
            </Field>
          </div>
          </PanelSection>
          <PanelSection>
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          {canManage ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save />
                {updateMutation.isPending ? "Saving..." : "Save details"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your role can view these details but cannot edit them.
            </p>
          )}
          </PanelSection>
        </Panel>
      </form>
      {canManage ? <PropertyPhotosPanel organizationSlug={organizationSlug} propertySlug={propertySlug} /> : null}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label className="grid gap-2">
        {label}
        {children}
      </Label>
    </div>
  );
}
