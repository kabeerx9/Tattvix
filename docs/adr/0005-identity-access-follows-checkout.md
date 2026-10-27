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

No data migration is needed. Previously deleted copies cannot be reconstructed;
guest originals are never used as a fallback. Existing revoked rows are not
reopened. Pending/active stays have no time-based purge until checkout; uncompleted
intake needs an explicit future cancellation/no-show lifecycle. Scheduled cleanup
removes expired copies later; presigned URLs already issued retain their existing
short TTL. Snapshots/audit records and guest-owned originals retain their existing
separate lifecycles.
