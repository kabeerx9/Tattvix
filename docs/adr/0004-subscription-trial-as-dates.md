# ADR 0004 — Hotel subscriptions: a 45-day trial expressed as dates

**Status:** accepted, 2026-10-24

## Context

Every hotel gets 45 days free, then pays per property (₹500/month each). The
first hotel onboards the day after this decision; there is no payment gateway
and no scheduler in the stack. What must exist on day one is the trial clock,
because its start cannot be revised later; enforcement and payment have the
whole trial window to land.

## Decision

- **One `Subscription` per `Organization`** (not per property). Membership,
  roles and the access gate are already org-scoped; price scales with the
  property count, the entitlement does not.
- **Entitlement is computed, never stored.** The row holds `trial_ends_at`
  and `paid_until`; a hotel may operate while `now < max(...)`. No status
  column exists to drift, and no job has to flip it at midnight. The UI label
  (`TRIALING` / `PAID` / `EXPIRED` / `MISSING`) is derived at read time.
- **An organization is born with its trial.** `Organization.objects.create()`
  opens the clock, so neither onboarding path, the seed, nor a test can make a
  hotel the gate would fail closed on.
- **Writes name the target state.** "Extend trial" sets `trial_ends_at` to a
  date (monotonic, future-only); replaying the request is a no-op. Every change
  is appended to `SubscriptionEvent` with actor and note.
- **Expiry pauses new business, not the hotel's records.** The check lives in
  `get_accessible_property()`, the one permission-aware choke point. Mutating
  permissions and `REPORTS_VIEW` return **402** `{code: "subscription_expired"}`;
  reads stay open. Checkout, the guest register and the in-house list opt out
  (`allow_expired=True`): no guest is stranded and the hotel can always produce
  its legal register. Guest routes, `/api/me/` and platform routes never consult
  the subscription.
- **Fail closed.** A missing row is treated as expired and logged.
- **The API never fakes data to express entitlement.** Locked reports return
  402; the blurred placeholder is a frontend decoration.

## Consequences

- Grace periods are data (move the date), not a second rule in code.
- Listing expired hotels is a date filter rather than an indexed status; fine
  at this scale.
- Payment recording (`paid_until`) and a gateway are follow-ups; a Razorpay
  webhook becomes another caller of the same service function.
