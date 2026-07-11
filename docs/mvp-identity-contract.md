# Tattvix MVP Identity Contract

## Status

- **Decision status**: Approved for MVP implementation
- **Approved on**: 2026-07-11
- **Launch posture**: India-first pilot
- **Scope**: Phase 1 identity foundation and the identity inputs used by later check-in and consent phases

This document is the product contract for identity data in the Tattvix web MVP. It defines implementation defaults, not legal advice. Hotel recordkeeping requirements, acceptable identity documents, sensitive-data retention, and foreign-guest obligations must be validated with the pilot hotel and qualified legal/compliance counsel before production launch.

## Launch Market

The first pilot is India-first. The schema must remain nationality-aware and support passport details, but the MVP does not promise country-specific workflows outside India.

## Primary Guest

The following fields are required before a primary guest is ready for check-in:

| Field | Requirement | Notes |
| --- | --- | --- |
| Legal first name | Required | Must match the selected identity document where applicable |
| Legal last name | Required | Allow a documented single-name value in the implementation |
| Phone number | Required | Account phone may prefill this value |
| Date of birth | Required | Store as a date, not an inferred age |
| Nationality | Required | Use a stable country code in the API and database |
| Address line 1 | Required | Structured address |
| Address line 2 | Optional | Structured address |
| City | Required | Structured address |
| State or region | Required | Structured address |
| Postal code | Required | Structured address |
| Country | Required | Use a stable country code |
| Government identity document | At least one required | One document must be selected for a stay |
| Emergency contact | Optional | Not part of profile-readiness requirements |

Gender, email address, signature, vehicle details, selfie, and biometric or verification results are not required for Phase 1 readiness. They must not be made mandatory without updating this contract.

## Identity Documents

The MVP supports:

- Aadhaar
- Passport
- Driving licence
- Voter ID

Each reusable identity document stores:

| Field | Requirement |
| --- | --- |
| Document type | Required |
| Document number | Required |
| Name on document | Required |
| Issuing country | Required |
| Expiry date | Required when the document type has an expiry date |
| Front image | Required |
| Back image | Required when the document has a relevant back side |

Document images are part of the reusable guest identity profile. They must use private object storage and must never be exposed through public URLs. API responses should return authorized, short-lived access URLs or stream authorized content. Logs, analytics, error reports, and URLs must not contain document numbers or image contents.

## Companions

Adult companions require the same identity fields and at least one supported government identity document as the primary guest.

A minor companion requires:

- Legal name
- Date of birth
- Relationship to the primary guest
- Nationality

A minor does not require a separate government identity document for MVP profile readiness. The system should derive minor/adult status from date of birth using the age threshold configured for the launch jurisdiction; it should not persist a manually editable `is_minor` flag as the source of truth.

## Profile Readiness

A primary guest is ready when all required primary-guest fields are present and at least one supported identity document is complete.

An adult companion is ready under the same rules. A minor companion is ready when all minor fields are present.

Readiness must be computed by the server and returned as both:

- A boolean readiness result.
- A machine-readable list of missing or invalid fields.

Saving an incomplete profile is allowed. Readiness is required only before the person can be included in a submitted check-in.

## Consent And Sharing

For each stay, the hotel defines:

- Required data categories.
- Optional data categories.

The guest may decline optional categories. Required categories cannot be deselected while continuing the check-in. The consent screen must show the exact categories and participants that will be shared before approval.

After approval, Tattvix creates an immutable stay-specific snapshot of the approved data. Hotel users read the snapshot, not the guest's mutable reusable profile.

## Retention And Deletion

Reusable identity data remains until the guest deletes the relevant document/profile or deletes their account.

Guests can initiate deletion of reusable profiles and documents in the MVP. Deletion of reusable data does not automatically erase historical stay snapshots that the hotel or Tattvix must retain. Historical records must follow the configured hotel and legal retention policy.

The production launch is blocked until the pilot has an approved retention schedule defining:

- Retention duration for reusable document images after account inactivity or deletion requests.
- Retention duration for stay-specific identity snapshots and images.
- Which minimal audit and stay records survive deletion.
- The process for access, correction, and deletion requests.

## Phase 1 Implementation Boundary

Phase 1 includes reusable guest profiles, companion profiles, identity document metadata and private images, server-computed readiness, ownership authorization, and web CRUD screens.

Phase 1 does not include hotel configuration of consent categories, stay snapshots, QR check-in, hotel access to identity data, or historical retention jobs. Those belong to later phases, but Phase 1 storage and APIs must not prevent them.

