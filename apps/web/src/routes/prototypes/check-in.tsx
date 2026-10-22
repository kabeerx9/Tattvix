// Throwaway design exploration for the guest QR check-in on a phone.
// Public on purpose (no _auth) and fake data only: no API calls.
// Delete this route and src/prototypes/check-in once a direction is chosen.

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Picker } from "@/prototypes/check-in/picker";
import { OnePageVariant } from "@/prototypes/check-in/variant-one-page";
import { PassVariant } from "@/prototypes/check-in/variant-pass";
import { StepsVariant } from "@/prototypes/check-in/variant-steps";
import type { Scenario } from "@/prototypes/check-in/model";

import "@/prototypes/check-in/prototype.css";

const variants = [
  { name: "Scroll", Component: OnePageVariant },
  { name: "Steps", Component: StepsVariant },
  { name: "Pass", Component: PassVariant },
] as const;

export const Route = createFileRoute("/prototypes/check-in")({
  validateSearch: (search: Record<string, unknown>): { v?: number; guest?: Scenario } => {
    const v = Number(search.v);
    return {
      v: Number.isInteger(v) && v >= 1 && v <= variants.length ? v : undefined,
      guest: search.guest === "returning" ? "returning" : undefined,
    };
  },
  head: () => ({ meta: [{ title: "Check-in prototypes · Tattwix" }, { name: "robots", content: "noindex" }] }),
  component: CheckInPrototypes,
});

function CheckInPrototypes() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const current = (search.v ?? 1) - 1;
  const scenario: Scenario = search.guest ?? "new";
  const [mountKey, setMountKey] = useState(0);
  const { Component } = variants[current];

  return (
    <div className="min-h-dvh bg-muted">
      {/* On a phone this is full width; on desktop it frames a phone-width column. */}
      <div className="proto-phone mx-auto min-h-dvh max-w-[430px] bg-background sm:border-x sm:border-border">
        <Component key={`${current}-${scenario}-${mountKey}`} scenario={scenario} />
      </div>
      <Picker
        names={variants.map((v) => v.name)}
        current={current}
        // Every variant pins its primary action to the bottom, so the picker sits on top.
        position="top"
        onSelect={(i) => {
          if (i === current) return setMountKey((k) => k + 1);
          void navigate({ search: (prev) => ({ ...prev, v: i + 1 }), replace: true });
        }}
        onReplay={() => setMountKey((k) => k + 1)}
      />
    </div>
  );
}
