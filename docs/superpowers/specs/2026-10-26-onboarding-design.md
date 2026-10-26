# Getting started on web and native

The guest's first success is a saved travel profile and a complete ID ready for
check-in. An owner's first success is a property with its details, active rooms
and room rates set. The user delegated all remaining design choices and asked
for both clients. There is no usage evidence yet.

## Product decisions

- A polished, optional task guide, not an automatic redirect or blocking tour.
  The guest home and eligible hotel Today pages offer a compact live progress
  prompt. Existing QR/deep-link flows continue unchanged.
- Dedicated Getting started pages show live task progress, an obvious next
  action, and short expandable explanations. Users may explore any task, including
  already completed ones. Completion is derived from existing server responses,
  never from clicks or locally saved checkboxes.
- Guest tasks: profile details (all readiness fields except identityDocuments),
  then ID (identityDocuments absent from missing fields). Explanations cover consent,
  scanning the hotel's QR on arrival, and optional companions. No claim of ID
  verification, guaranteed hotel acceptance or consent from merely saving an ID.
- Hotel tasks: address/contact/check-in/check-out information, at least one active
  room, and a saved nightly rate for every active room (zero is a legitimate rate).
  A room/task is not considered complete from inactive rooms. Optional guidance
  explains QR -> guest consent -> front-desk room assignment, and team management.
- Hotel setup is permission-driven: hotel:manage controls property task;
  rooms:manage controls room/rate tasks. Users without either permission do not
  get the owner setup prompt or actionable guide. Existing route guards continue
  to enforce access. Expired subscriptions show a read-only explanation and no
  setup write CTA; guidance never bypasses entitlement.
- A compact prompt can be dismissed per Clerk account and property on this device
  (localStorage on web, existing SecureStore on native). No sensitive data is
  persisted. Storage failure does not break navigation. The full guide remains
  accessible through Help and links on relevant screens. Completing setup hides
  the prompt, while replaying the guide shows the completed state. Personal and
  property guides are distinct, including for owners who also travel.
- Loading/error states never imply completion. Refetch on entering a guide and
  use existing mutation invalidations so saved progress updates on return.
- Fit existing semantic tokens/shared primitives, responsive layouts, neutral
  iconography, one rose primary action, restrained entrance motion with reduced
  motion support, readable labels and large native touch targets. No dependencies.

## Architecture

Pure guide builders, copy, task statuses and storage-key generation live in
`packages/api/src/onboarding.ts`, consumed by both clients. Existing profile,
property details and rooms endpoints remain unchanged; there is no migration or
new API field, so installed native binaries remain compatible.

Client feature components own presentation, query orchestration and persistence.
Client-specific routing resolves shared action IDs to existing forms. Hotel guides
are scoped to the selected property. Help offers personal setup and permitted
hotel setup choices. Native hotel registration remains the existing web handoff;
this guide starts after a property has been approved/provisioned, since owners
cannot create properties directly in the current product.

## Verification

Cover empty/partial/complete guest state; ID not ready; rooms absent/inactive;
unset and zero rates; missing hotel details; partial permissions/no permissions;
subscription expiry; storage keys/account/property isolation. Run web types/tests/
build and native types/tests. Exercise real local web and Android navigation,
skip/reopen, progress after a saved edit, ready state, restricted access, and narrow
screen layout. Record release/test limitations rather than claiming unrun checks.
