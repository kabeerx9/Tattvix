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

import { PageHeader, Surface } from "@/components/design-system";
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
  propertyName,
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
    <div className="mx-auto grid max-w-[1000px] gap-7">
      <PageHeader
        eyebrow={propertyName}
        title="Hotel details"
        description="Information guests see when they scan your check-in QR."
      />
      <form className="grid gap-6" onSubmit={save}>
        <Surface className="grid gap-6 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
              <Building2 className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Property information</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Shown to guests when they review this property.
              </p>
            </div>
          </div>
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
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          {canManage ? (
            <div className="flex justify-end border-t pt-5">
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save />
                {updateMutation.isPending ? "Saving..." : "Save details"}
              </Button>
            </div>
          ) : (
            <p className="border-t pt-5 text-sm text-muted-foreground">
              Your role can view these details but cannot edit them.
            </p>
          )}
        </Surface>
      </form>
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
