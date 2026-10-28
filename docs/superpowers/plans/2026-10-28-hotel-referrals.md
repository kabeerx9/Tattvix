# Hotel referral tracking

User approved tracking only, rewards later; implement web/native, end-to-end test,
push main. Existing native hotel applications intentionally hand off to web.

- One opaque shareable code per active owner account, created explicitly by POST.
  GET never creates codes. Owners keep the same code across their properties.
- Optional code on registration, normalized/validated on both boundaries. Store
  an immutable optional referral FK on the request at creation; approval/rejection
  reads the same attribution. Reject invalid and self referrals. Missing code
  preserves current registration behavior. No click cookies/rewards/payments.
- Owner-only account Referrals screens on both clients: create/copy/share link,
  code, registration status counts and cursor-paged hotel names/statuses/dates.
  No applicant account/contact/address or rejection-reason disclosure.
- Referred registration stays on existing web flow. Preserve URL code through
  login, signup and SSO; prefill editable optional code before submission. Keep
  existing hotel-request response shapes unchanged.
- Test code races, attribution/duplicate requests, self/invalid codes, permissions,
  role loss, privacy, status lifecycle and paging. Run all required checks and
  local real HTTP/browser/Android end-to-end. No native release publishing step.
