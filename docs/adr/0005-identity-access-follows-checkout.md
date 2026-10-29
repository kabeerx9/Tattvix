# Identity access follows operational checkout

Accepted 2026-10-27. Requested policy: keep hotel identity access throughout the
stay, then for 60 days after checkout. A guest can stop sharing after checkout.

Operational checkout (`operational_status=CHECKED_OUT`, `checked_out_at`) starts
the access clock. A submission date or an early identity-review closure does not.
New submissions store no deadline. Checkout persists checkout + 60 days; reads
and cleanup derive the deadline from checkout, so legacy short deadlines cannot
expire current stays or shorten retained copies. `REVOKED` stays remain terminal.
The configurable default is `HOTEL_IDENTITY_POST_CHECKOUT_ACCESS_DAYS=60`; the old
submission-cap and post-review grace settings are retired. Changing this setting
changes the effective window for all non-revoked retained copies.

The nullable expiry response fields keep their existing shape. Null on an active
stay means the checkout clock has not started. The legacy check-in policy keys
remain: `maximumDays` describes post-checkout days, and
`postCheckoutGraceHours` is their equivalent in hours. New web/native clients
share the same access-action decision and day-formatting helper. Consent text is
versioned `2026-10-27`. Installed native clients need the matching JS update:
older guest screens interpret a null expiry as ended; hotel access is still
controlled by the server's `identityAccess.isActive` flag.

Guest revocation and legacy identity-close endpoints reject pre-checkout calls
with `409 stay_not_checked_out`. Checkout, revocation and cleanup serialize on
the stay lock; cleanup rechecks access after locking. Checkout retries preserve
the first timestamp/deadline. Revocation timestamps are captured after locking,
so a request waiting behind checkout cannot record an earlier effective time.

## Update 2026-10-29: stays the hotel never checks out

The open-ended wait for checkout is replaced by a safety cap on the same
60-day setting. A checked-in stay lapses 60 days after its planned checkout
(`checked_in_at` + `billing_nights`); a submitted stay the guest never arrived
for lapses 60 days after `submitted_at`. Access never comes back: if the cap
passed before a late checkout, the expiry stays at the cap, so checkout cannot
reopen a snapshot whose images the cron already purged. Guest revocation after
checkout is unchanged and immediate. A hotel can still check out and check in
again if a guest genuinely stays longer than billed plus 60 days.

`hotelAccessExpiresAt` is therefore never null on a submitted stay: it is the
checkout deadline once checked out, otherwise the current cap. Both clients
treat a past value as ended regardless of operational status. The purge query
mirrors the rule in SQL and still re-checks the Python rule under the stay lock.
Consent text is versioned `2026-10-29` and states the cap.

No data migration is needed. Previously deleted copies cannot be reconstructed;
guest originals are never used as a fallback. Existing revoked rows are not
reopened. Pending/active stays have no time-based purge until checkout; uncompleted
intake needs an explicit future cancellation/no-show lifecycle. Scheduled cleanup
removes expired copies later; presigned URLs already issued retain their existing
short TTL. Snapshots/audit records and guest-owned originals retain their existing
separate lifecycles.
