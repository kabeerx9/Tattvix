# Compliance rules for Tattwix (India)

Working rulebook distilled from `docs/research/privacy-legal-requirements-india.md`
(first pass) and `docs/research/privacy-legal-gaps-resolved.md` (second pass,
primary sources). Not legal advice. Each rule says what binds us, from when,
where the code stands today, and the proposed fix. Work the rules in the order
of the "Action order" section at the end.

Posture: defensible, not gold-plated. We are a pre-launch MVP with zero users.
"Must" means a rule in force today or a vendor contract term. "Should" means
a DPDP duty that starts 13 May 2027 but is cheap to meet now and shapes the
data model. "Later" means after the pilot or after counsel.

Key dates (Gazette-confirmed):

| Date | What starts |
|---|---|
| In force now | SPDI Rules 2011 (privacy policy, grievance officer, security practices); CERT-In 2022 directions (6-hour incident report, 180-day logs in India); Immigration and Foreigners Rules 2025 r.17 (hotel keeps foreign-guest particulars one year); Aadhaar Act and regulations; Google Analytics and vendor terms |
| 13 Nov 2026 | DPDP consent-manager provisions only. Nothing changes for us |
| 13 May 2027 | Every substantive DPDP duty: notice, consent, security, breach, erasure, grievance, children, rights, penalties. SPDI Rules fall away |

Data we hold today (from the models): Clerk account mirror; guest profile
(name, phone, DOB, nationality, address, emergency contact); companion
profiles (name, DOB, relationship, nationality, minor flag); identity documents
(type Aadhaar, Passport, Driving licence, Voter ID; full number; name on
document; issuing country; expiry) with front and back images in S3 Mumbai;
per-stay consent grant (version, categories, granted and revoked times);
per-stay immutable snapshot (guest, companions, document fields including the
full number) with image copies purged after the hotel access window; identity
access audit; platform audit log; stays, rooms, charges.

---

## A. Documents and contact points

### R1. Publish a privacy policy (must, now)

- Binds: SPDI r.4 requires a published policy for all personal information handled; Google Analytics ToS s.7 requires disclosure of Analytics and identifiers; Clerk DPA assumes we notify users. From 13 May 2027 DPDP s.5 and r.3 require an itemised notice at or before consent.
- Code today: no policy page, no link from sign-up, check-in or the native privacy screen.
- Solution: public route `/privacy` in web and a link from native. Content from the checklist in the first-pass doc, section "Checklist for the privacy policy". Must include: what we collect per category; purposes; that the hotel is the party collecting ID for the stay and keeps its own statutory record; the retention table from R8; Clerk, Sentry, Google Analytics, Vercel, Supabase and AWS as processors with US processing named for Clerk, Sentry and Vercel edge; grievance officer from R3; how to withdraw, access, correct and delete; version and effective date. Mark the page "v1, pending legal review" only internally, not on the page.
- Effort: S (content), S (route). Owner: docs then Haiku.

### R2. Publish terms of use and a hotel data-processing addendum (must, now)

- Binds: contract law now; DPDP s.8(2) from 2027 requires a valid contract between fiduciary and processor; SPDI r.5(9) and r.8 expect contractual security terms with partners.
- Code today: hotel onboarding is a registration request reviewed by a platform admin; nothing is accepted or versioned. Guests accept nothing at sign-up.
- Solution: public `/terms` route. Hotel addendum as a section of the terms, accepted by checkbox on the hotel registration form; store `accepted_terms_version` and timestamp on `HotelRegistrationRequest`. Hotel duties to state: use data only for the stay and legal record-keeping, no onward copies or screenshots, access limited to assigned staff, Form III filing is the hotel's duty, notify Tattwix of any breach within 24 hours, delete local copies when access ends. Guest duties: own documents only, authority for companions, accurate data.
- Effort: S. Owner: docs then Haiku.

### R3. Name a grievance officer and a response SLA (must, now)

- Binds: SPDI r.5(9): designated grievance officer, name and contact published, redress within one month. From 2027 DPDP r.14: publish the contact and respond within a stated period, max 90 days.
- Code today: nothing.
- Solution: a named person (you, for now) and `privacy@tattwix.in` in the policy and terms, with "30 days" as the SLA. Requests tracked in a private GitHub issue label `privacy-request`. No code.
- Effort: XS. Owner: you (mailbox), docs.

### R4. Record which policy version each user accepted (should, cheap now)

- Binds: DPDP s.6(10) from 2027: the fiduciary must be able to prove consent and its version. Consent grants already do this per stay.
- Code today: `ConsentGrant.consent_version` exists for stays. Nothing records acceptance of the policy or terms.
- Solution: `ClerkUser.accepted_policy_version` and `accepted_at`; a one-time acceptance screen after first sign-in when the stored version is older than the current one. Same for hotel staff users. Consent checkbox copy in check-in links to `/privacy`.
- Effort: S. Owner: Haiku, server and web.

---

## B. Identity documents and retention

### R5. Decide the Aadhaar position (must decide before launch)

- Binds: Aadhaar Sharing Regs reg 6: no public display, confidentiality of numbers and any record holding them, encrypted transmission, retain "no longer than necessary". AOV Regs since 9 Dec 2025: any entity verifying Aadhaar through the Aadhaar app or secure QR must register as an OVSE, cannot verify on behalf of another entity, must check UIDAI's signature before accepting Aadhaar as ID, and must never log the number. The 2022 "hotels cannot keep copies" advisory was withdrawn two days later, so there is no standing ban on a hotel holding a copy, but there is no safe harbour for a plain photo either.
- Code today: Aadhaar is an accepted document type; the full 12-digit number is stored in the live document and in every stay snapshot indefinitely; the image is purged after the hotel window.
- Options:
  1. Drop Aadhaar as a document type. Simplest and safest. Cost: most Indian guests carry only Aadhaar, so the product loses its core market.
  2. Keep Aadhaar as a plain photo, store only the last four digits, never log the number, purge images in 7 days, HTTPS only. Meets reg 6 on its face. No verification claim made anywhere in copy. Recommended for the pilot.
  3. Register as an OVSE and verify via secure QR or Aadhaar app. Proper path for a product that claims "verified ID". Later, after the pilot proves demand.
- Solution: option 2 now, option 3 on the roadmap. Copy must say "share" not "verify". Rules R6 and R7 implement the storage side.
- Effort: product decision, then S. Owner: you.

### R6. Store Aadhaar numbers masked, everywhere (must if R5 keeps Aadhaar)

- Binds: Sharing Regs reg 6(2) and (5); AOV reg 14(1)(mb) treats redaction of the first 8 digits as the expected storage safeguard; DPDP r.6(1)(a) names masking as a safeguard.
- Code today: `IdentityDocument.document_number` and `SharedIdentitySnapshot.document_data.documentNumber` hold the full number. Serializers echo it back.
- Solution: for `document_type == AADHAAR`, normalise and store `XXXX XXXX 1234` at write time in the serializer, so the full number never reaches the database, the snapshot, Sentry or logs. Validation accepts 12 digits (Verhoeff check optional). Web and native show the masked value. One migration to rewrite any existing rows (none in prod).
- Effort: S. Owner: Haiku, server plus a UI label change. Tests: masked on create, masked in snapshot, full number never in response.

### R7. Expire document numbers in stay records after one year (should, shapes schema)

- Binds: DPDP r.8(3) from 2027: keep personal data and logs of a processing for a minimum of one year, then erase unless other law requires more. Immigration r.17: hotels keep foreign-guest particulars electronically for at least one year. Act s.8(7): erase when purpose is served, unless law requires retention.
- Code today: the purge removes S3 images once `hotel_access_expires_at` passes and deletes `SharedIdentityDocumentImage` rows. The snapshot row, including the document number, lives forever. The live `IdentityDocument` lives until the guest deletes it.
- Solution: extend the daily cron with a second pass: for snapshots whose stay closed more than `STAY_RECORD_RETENTION_DAYS` ago (default 365, per-property override from R12), blank `documentNumber` and `expiryDate` in `document_data` and companion documents, keeping type, name and country so the stay history still reads. Keep audit rows (R9). The live document stays untouched; it belongs to the guest's profile.
- Effort: S. Owner: Haiku. Tests: expired snapshot scrubbed, unexpired untouched, idempotent.

### R8. Publish and implement one retention table (must for the policy, now)

| Data | Keep for | Then | Basis |
|---|---|---|---|
| Document images shared with a hotel | until hotel access ends, max 7 days after submit, 24 h after checkout | S3 object deleted by daily cron | our promise in the consent text; "no longer than necessary" |
| Stay snapshot: name, document type, number, country, expiry | 1 year after stay closes (per-property override, R12) | number and expiry blanked | DPDP r.8(3); Immigration r.17 |
| Identity access audit, platform audit | 1 year minimum | kept; prune after 2 years | DPDP r.8(3), r.6(1)(e) |
| Application and request logs | 180 days, stored in India | rolled | CERT-In 2022 direction (iv) |
| Guest profile, companions, live documents | until the guest deletes them or the account | deleted with the account (R10) | consent |
| Hotel account, members, stays, charges | life of the hotel contract plus 1 year | deleted on request | contract |
| Google Analytics events | 2 months (set in GA4 admin) | Google purges | GA4 retention setting |
| Sentry events | 90 days (Sentry default) | Sentry purges | vendor |

- Code today: rows one and five hold. Row two is new (R7). Row three holds by accident. Row four is not met: Vercel function logs live in the US and are short-lived; the two Postgres audit tables are in Mumbai.
- Solution: the table goes into the policy as written. For row four, see R15.

### R9. Keep audit logs for one year and never put identity data in them (should, mostly done)

- Binds: DPDP r.6(1)(e) and r.8(3); CERT-In 180 days.
- Code today: `IdentityAccessAudit` records who viewed what and when; `PlatformAuditLog` records membership changes. Neither stores document numbers. Sentry is scrubbed of identity fields.
- Solution: no change now. Add a prune step at 2 years later. Keep the "no identity data in logs" rule in `AGENTS.md`.
- Effort: none now.

### R10. Account deletion that actually deletes (must before launch; DPDP s.12 from 2027)

- Binds: SPDI r.5(7) withdrawal of consent; DPDP s.12 erasure right and s.8(7); Clerk DPA cl.9-10 deletion on request.
- Code today: the Clerk webhook verifies the signature and returns `received: true` without handling any event. No in-app "delete account". Deleting a user in the Clerk dashboard leaves every profile, document, image and snapshot in place.
- Solution: handle `user.deleted` in the webhook: delete S3 objects for the user's documents, delete `IdentityDocument`, `CompanionProfile`, `GuestProfile`, and the `ClerkUser` mirror. Keep `Stay` and `SharedIdentitySnapshot` for the retention period in R7 with the guest FK nulled (it is the hotel's record), and keep audit rows. Add a "Delete account" action on the guest profile page that calls Clerk's delete-user API so the webhook path is the single implementation. Handle `user.updated` while there to keep email in sync. Policy text: "stay records already shared with a hotel are kept for the hotel's legal record for one year after the stay, then reduced to name and document type".
- Effort: M. Owner: Haiku with failure-mode tests (S3 delete failure, webhook replay, user with open stay).
- Danger domain: deletion. Needs the open-stay case decided: revoke consent first, then delete.

### R11. Minor companions need verifiable parental consent (should; design now)

- Binds: DPDP s.9 and r.10 from 2027: verifiable consent of a parent, checked against identity and age details the fiduciary holds; no tracking or behavioural monitoring of children. No Fourth Schedule exemption reaches a hotel platform.
- Code today: `is_minor` is computed for companions and shown; nothing gates sharing a minor's document.
- Solution: when a selected companion is a minor, require that the primary guest has a ready document with a DOB showing they are an adult, and add an attestation checkbox "I am the parent or lawful guardian of the minors selected" stored on the `ConsentGrant` as a category `minor_guardian_attestation`. That uses r.10(1)(a), identity details already with the fiduciary. Keep GA off the check-in route (it already carries no identity data; make sure no page views fire there).
- Effort: S. Owner: Haiku.

### R12. Foreign guests: supply Form III particulars, hotel files (should before hosting foreigners)

- Binds: Immigration and Foreigners Rules 2025 r.17 and Form III: the hotel must record particulars, have the guest sign on arrival and departure, keep them electronically one year, and transmit Form III within 24 hours. No passport or visa copy is required. Duty and liability sit with the hotel.
- Code today: profile has nationality, DOB and address; passport document has number, expiry, country. Missing Form III fields: visa or OCI number and type, phone in India, email, arrived from, date and time of arrival, purpose of visit, previous place of stay, next destination.
- Solution: phase 2. A "travel details" step in check-in shown only when nationality is not IN, saved into the snapshot, plus a "Form III export" button on the hotel stay page producing the field set. Record the guest's on-screen acceptance with timestamp as the "sign"; electronic sufficiency is unconfirmed, so the hotel keeps its own signed register until counsel confirms. Per-property `record_retention_days` (default 365) on `Property` so a district order can be honoured.
- Effort: M. Owner: later, Haiku with a plan.

### R13. Indian guests: no national rule, so per-hotel retention and no deletion promises (should)

- Binds: Sarais Act s.7 has no guest-register duty; Delhi's lodging regulations were repealed June 2025; Goa's tourist-trade Act has no register clause. Recording comes from district police orders under BNSS s.163 and licence conditions, which vary.
- Code today: a single global window.
- Solution: the `record_retention_days` field from R12, editable by the hotel owner, with the policy saying "retention for your stay record follows the hotel's local requirements, minimum one year". Ask the pilot hotel for its district order before go-live.
- Effort: XS once R12 lands.

---

## C. Security and incidents

### R14. Reasonable security practices (must, mostly done)

- Binds: SPDI r.8 now (documented security programme; ISO 27001 is a deemed-compliance route, not mandatory); DPDP r.6(1) from 2027: encryption or masking, access control, logging, backups, one-year logs, processor contract terms.
- Code today: HTTPS everywhere, presigned S3 URLs, tenant scoping with Http404, role permissions with tests, Clerk-verified webhooks, Sentry scrubbing, cron secret fails closed, security headers. Gaps: S3 default encryption not asserted, no database backup on Supabase free, no written security note.
- Solution: enable bucket default encryption (SSE-S3) and block public access, verified once in the console; nightly `pg_dump` to a private S3 prefix via a Vercel cron or GitHub Actions schedule; a one-page `docs/security.md` listing the controls above. That page is the SPDI r.8 "documented programme".
- Effort: S each. Owner: you (console), Haiku (backup job, doc).

### R15. CERT-In: incident reporting and logs in India (must, now, partial)

- Binds: CERT-In directions of 28 Apr 2022, in force since 27 Jun 2022, apply to any body corporate: report listed cyber incidents within 6 hours to `incident@cert-in.org.in`, designate a point of contact, keep ICT logs for 180 days within India, sync clocks to NIC or NPL.
- Code today: no runbook, no point of contact, Vercel function logs are US-resident and ephemeral, Sentry has only US and EU regions.
- Solution: `docs/incident-runbook.md` with the 6-hour CERT-In step, the Supabase 48-hour clause, and the DPDP r.7 content list for 2027. For logs, a pragmatic MVP position: the audit tables in Mumbai Postgres are the authoritative access logs and are retained 180 days or more; a Vercel log drain to an India-resident store is a later item. Record this as an accepted gap in the runbook.
- Effort: S (doc), L (log drain, later).

### R16. Breach notification playbook (should now, must 2027)

- Binds: DPDP r.7 from 2027: tell each affected principal without delay with nature, consequences, mitigation, safety steps and a contact; tell the Board without delay, then a detailed report within 72 hours. Supabase DPA 48 hours; Sentry and Clerk "without undue delay".
- Solution: part of the runbook in R15, with an email template and a list of who to notify (guests via Clerk email, hotels via owner email, CERT-In, Board from 2027).
- Effort: XS, same doc.

---

## D. Vendors and analytics

### R17. Disclose Google Analytics and keep it out of identity flows (must, now)

- Binds: GA ToS s.7: policy must disclose Analytics, cookies and identifiers, and link Google's partner page; no PII to Google. No Indian law requires a cookie banner.
- Code today: GA4 runs site-wide, scrubbed of identity fields. Retention setting unknown.
- Solution: policy paragraph with the partner link; set GA4 event retention to 2 months in the admin; confirm Google Signals is off; no banner.
- Effort: XS. Owner: you (GA admin), docs.

### R18. Disclose cross-border processing and keep hosting in Mumbai (must for the policy; cheap now)

- Binds: nothing restricts transfers today; DPDP s.16 and r.15 from 2027 allow transfer unless a country is notified, none yet. Clerk, Sentry and Vercel edge process in the US. Supabase and S3 are in Mumbai; the API function is pinned to bom1.
- Solution: name US processing for sign-in, error reports and CDN in the policy. Keep the API in bom1. No vendor change for the pilot. Revisit if a s.16 notification lands.
- Effort: XS.

### R19. Vendor contracts on file (must, now)

- Binds: SPDI r.8 and DPDP s.8(2) expect processor terms.
- Solution: a `docs/compliance/vendors.md` with each vendor, its DPA URL, sub-processor page, region, breach clause, and the date you accepted it. Clerk's full sub-processor list sits behind the Trust Center and should be captured as a PDF.
- Effort: XS. Owner: docs.

---

## E. Lawyer-only items (do not block launch)

- L1. Role allocation: Tattwix as processor for stay data and fiduciary for the reusable profile. Confirms the shape of the hotel addendum in R2.
- L2. Whether r.8(3)'s one-year minimum reaches the images or only the structured record. Our position: structured record plus logs. If counsel disagrees, the 7-day purge becomes a one-year purge and R8 row one changes.
- L3. Whether an on-screen acceptance satisfies "sign" in Immigration r.17.
- L4. OVSE registration scope if we move to option 3 in R5.
- L5. Significant Data Fiduciary exposure. No thresholds exist yet. Revisit at scale.
- L6. The pilot hotel's district order for Indian guest records and its retention period.

---

## Action order

Each item is one commit. Items 1 to 9 before launch; 10 to 12 before the first foreign guest; the rest as scheduled.

1. R5 decide Aadhaar (you). Assumed answer: keep, masked.
2. R6 mask Aadhaar numbers at write time.
3. R10 account deletion via `user.deleted` plus in-app delete.
4. R7 one-year scrub of document numbers in stay snapshots.
5. R4 policy-version acceptance on users and hotel registration.
6. R1 and R2 privacy policy and terms routes, consent text links to them.
7. R3 grievance mailbox, R17 GA retention setting, R18 wording. All in the policy text.
8. R14 S3 encryption check and nightly database backup.
9. R15 and R16 incident runbook with CERT-In contact.
10. R11 minor companion guardian attestation.
11. R12 Form III travel details and export, per-property retention.
12. R13 pilot hotel district order on file.
13. R19 vendors file.
14. Lawyer review of L1 to L6 with both research docs attached.
15. Before 13 May 2027: re-check egazette for amendments; itemised DPDP notice at consent; grievance SLA language to r.14; breach steps to r.7.
