# Reviews belong to completed visits

Accepted 2026-10-28. The guest rates a hotel at checkout with 1–5 stars and written
feedback. Reviews cannot be edited. Repeat visits can have separate reviews.
Guests see their own review within their stay; owners have a Reviews section that
links to the guest's existing hotel stay record.

`StayReview.stay` is a one-to-one relation to `Stay`. The stay determines both
review author and property, avoiding duplicate mutable author/property keys.
The database enforces one review per stay and a 1–5 rating range. Text is required,
trimmed and limited to 2,000 characters. No edit/delete API is provided. Guest
submission locks the stay: same-content retries return the existing review;
different-content repeats return 409, including simultaneous submissions.

Eligibility requires the authenticated stay guest, operational CHECKED_OUT and
actual check-in/checkout timestamps. Identity revocation/expiry and subscription
expiry do not affect reviews. The user did not request an additional staff-account
exclusion. Companion profiles do not have independent review votes.

Guest review GET/POST is a separate endpoint, so existing stay DTOs do not change.
Owner property reads use the existing owner-only hotel:manage permission, with
expired-subscription reads allowed. Managers/reception and unrelated accounts
cannot read this list. The response includes the existing register name, stay
public ID, review and checkout date; it excludes document metadata, private image
keys, reusable profiles and account emails. Following the guest link keeps the
existing hotel stay/ID-access permission checks.

Owner lists use descending review-ID cursors, fetching at most 26 and displaying
25. New submissions do not shift older pages. Total count and rounded average are
computed from the property's reviews rather than maintained as mutable counters;
those aggregate scans grow with review volume and may eventually merit a read
model. Guest form/state, summary and owner navigation land in web and native
through shared contracts/API/cache logic. Reviews remain private to the author
and property owners; public publishing and moderation are separate future scope.

Migration 0018 creates a new empty table with constraints and a stay FK; no
historical reviews are fabricated and no existing stay data is backfilled.
