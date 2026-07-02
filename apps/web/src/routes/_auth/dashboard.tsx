import { UserButton } from "@clerk/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { getMe, type MeResponse } from "@/lib/api";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((account) => {
        setMe(account);
        setError(null);
      })
      .catch(() => {
        setError("Unable to load account details.");
      });
  }, []);

  const displayName =
    [me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
    me?.username ||
    me?.email ||
    "there";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hotel App</h1>
        <UserButton />
      </div>
      <p className="text-muted-foreground">Welcome, {displayName}</p>
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Signed-in account</p>
        {me ? (
          <div className="mt-4 grid gap-3 text-sm">
            <AccountDetail label="Name" value={displayName} />
            <AccountDetail label="Email" value={me.email} />
            <AccountDetail label="Username" value={me.username} />
            <AccountDetail label="Clerk ID" value={me.clerkId} />
            <AccountDetail label="Local ID" value={String(me.id)} />
          </div>
        ) : (
          <p className="mt-1 font-medium">{error ?? "Loading..."}</p>
        )}
      </div>
    </div>
  );
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:items-baseline">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{value || "Not set"}</span>
    </div>
  );
}
