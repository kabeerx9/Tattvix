# Hotel reviews per completed visit

User decisions: guests rate at checkout; 1–5 stars and written review; no editing;
each visit has its own review related to Stay. Guests see their review in their
stay session. Owners have a Reviews section linking to the guest's existing stay.

- Add StayReview with one-to-one Stay, rating range DB check, required trimmed
  text <=2000 chars, created timestamp. No author/property input: derive from Stay.
- Guest-owned GET/POST endpoint: only genuinely checked-out stays eligible,
  independent of identity access and hotel subscription. Atomic stay lock and
  unique constraint; same-payload retries return the existing review, conflicting
  repeats return 409. No edit/delete endpoints.
- Owner-only property reviews via existing hotel:manage permission, allow expired
  subscription reads. Cursor pages of 25, stable newest-first ID order, total/average. Each
  result links to the existing hotel stay; do not expose extra guest ID/email data.
- Shared contracts, API/query keys and mutation cache policy. Both clients get
  immutable guest review card/form and owner Reviews route/navigation.
- Test auth/property isolation, validation, immutable duplicate/retry behavior,
  repeat visits, identity/entitlement independence, query bounds and concurrency.
  Run server and both clients' required checks; local web/Android end-to-end.
- Native is not live; no OTA/store publishing step. Push main as authorized.
