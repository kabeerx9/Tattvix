# Referrals track hotel registration requests

Accepted 2026-10-28. Track hotel referrals now; rewards and financial rules remain
undecided. One stable, opaque code belongs to each active owner account, shared
across its organizations and properties. Explicit POST creates it; reading a
tracker never writes. One-to-one owner and unique-code constraints resolve races;
rare random collisions retry within savepoints.

An optional referral code on hotel registration resolves to a nullable protected
foreign key on HotelRegistrationRequest. The applicant cannot refer themselves;
unknown codes and codes whose owner no longer has an active OWNER membership in
an active organization are rejected. Subscription expiry does not affect this
account feature. Attribution is fixed at submission through the service/API.
Approval/rejection updates status without rewriting attribution. The existing
one-pending-request constraint prevents simultaneous submissions from switching
referrers. Existing request responses remain unchanged for earlier clients.

Counts describe registration requests, not unique hotels or paying customers.
A rejected applicant can submit a new request, optionally with a different code;
the rejected request retains its original attribution. Future reward eligibility
must define its own deduplication, qualifying event and abuse rules. No click
tracking, cookies, payouts, credits or subscription effects are introduced.

Owner-only trackers expose hotel names, request IDs, statuses and timestamps.
They exclude applicant accounts, contact/address data and rejection reasons.
Owner access is checked server-side on every request; losing owner access disables
creation, tracking and new use of the code while retaining historical attribution.
Counts derive from current request statuses rather than mutable counters. Lists
fetch 26/return 25 using descending-ID cursors; aggregate work still grows with
that referrer's request volume. A dashboard refresh is not a transactional snapshot
across the aggregate and page queries.

Both clients consume shared schemas/API/cache helpers. Keys include the account
ID, and pages do not carry placeholder data across query keys. Web copies links;
native uses the OS share sheet and selectable text. Native hotel applications keep
the existing browser handoff. Links target /register-hotel?ref=CODE and prefill an
editable optional field; sign-in/signup transitions and SSO callbacks preserve the
registration destination. Callback destinations remain explicitly whitelisted.

Migration 0019 creates the code table and nullable request foreign key. It does
not backfill historical requests or invent referrals. The code is public invitation
information, never an authentication credential.
