# Privacy and legal requirements for Tattwix (India): research notes

Research date: 2026-10-20. This is research, not legal advice. Every claim carries a URL. "Read" means I downloaded and read the primary text myself. "Secondary" means I only saw it reported elsewhere and it is labelled so. Where I could not confirm something, it says so.

Primary sources used (read in full or in the relevant parts):

- [Act] DPDP Act 2023, Gazette text: https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf
- [Rules] DPDP Rules 2025, Gazette G.S.R. 846(E), 13 Nov 2025: https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
- [IFA] Immigration and Foreigners Act 2025 (e-Gazette): https://egazette.gov.in/WriteReadData/2025/262300.pdf
- [BOI] Bureau of Immigration, "Obligation of Hotels": https://boi.gov.in/boi/contents/registration-authority/obligation-of-hotels-hospitals-educational-institutes
- [Aadhaar Act] Gazette text: https://uidai.gov.in/images/targeted_delivery_of_financial_and_other_subsidies_benefits_and_services_13072016.pdf
- [Sharing Regs] Aadhaar (Sharing of Information) Regulations 2016, updated 21.08.2025: https://www.uidai.gov.in/images/The_Aadhaar_Sharing_of_information_regulation_2016.pdf
- [AOV Regs] Aadhaar (Authentication and Offline Verification) Regulations 2021, updated 15.12.2025: https://uidai.gov.in/images/The_Aadhaar_Authentication_and_Offline_Verifications_Regulations_2021-_Clean_copy-30122025.pdf
- [GA ToS] https://marketingplatform.google.com/about/analytics/terms/us/
- [Clerk DPA] https://clerk.com/legal/dpa.md (rendered at https://clerk.com/legal/dpa)

Fetch note: meity.gov.in, indiacode.nic.in and pib.gov.in return 403 to the fetch tool, so I downloaded the PDFs directly. India Code's Sarais Act PDF and the SPDI Rules official MeitY PDF could not be retrieved (details in Q2 and Q3).

---

## Bottom line for Tattwix

1. As of 20 Oct 2026 the DPDP notice, consent, breach, erasure and grievance duties are NOT yet in force. Rules 3 and 5-16 start 18 months after publication, about 13 May 2027; Rule 4 (consent managers) starts one year after, about 13 Nov 2026. Rule 1: [Rules] p.1 (English at "1. Short title and commencement"). A reported plan to shorten the window is unconfirmed (secondary): https://dpdprules.org/blog/dpdp-18-months-to-12-months-proposal. Build to the Rules now; the 2011 SPDI Rules (privacy policy, written consent, grievance officer) still apply until IT Act s.43A is omitted by Act s.44(2)(a): [Act] s.44(2).
2. The hotel decides why a guest ID is collected (a stay, regulatory recording); Tattwix decides the means (platform, reusable profile, retention defaults). On a plain reading Tattwix is a Data Processor for hotel stay data and a Data Fiduciary for the guest's reusable profile that the guest builds in Tattwix. This is my analysis, not a ruling. Definitions: [Act] s.2(i), s.2(k). A valid processor contract is mandatory: [Act] s.8(2).
3. A compliant notice must be standalone, plain language, itemise the personal data and purpose, and give the withdrawal, rights and Board-complaint routes: [Rules] r.3; [Act] s.5. It must be offered in English or an Eighth Schedule language: [Act] s.5(3). The Fiduciary carries the burden of proving notice and consent: [Act] s.6(10).
4. Publish a contact person for data questions and a grievance mechanism, with a response window of up to 90 days: [Act] s.8(9)-(10); [Rules] r.9, r.14(3). A DPO is only required for Significant Data Fiduciaries: [Act] s.10(2)(a).
5. Breach: tell each affected person without delay, tell the Board without delay and give a detailed report within 72 hours: [Rules] r.7. Penalty up to Rs 250 crore for failing reasonable safeguards, up to Rs 200 crore for failing breach notice: [Act] Schedule items 1 and 2.
6. A blanket "we delete everything" promise is unsafe. Hotels must keep foreign-guest particulars electronically for at least one year ([BOI], Form III rule text), and DPDP Rule 8(3) requires a minimum one-year retention of personal data and logs for a Data Fiduciary: [Rules] r.8(3). No retention period for Indian guests' registers was found in any primary source.
7. Aadhaar is the highest-risk document type. UIDAI has said publicly that unlicensed private entities like hotels may not collect or keep Aadhaar copies and that this is an offence: https://www.pib.gov.in/PressReleasePage.aspx?PRID=1828797&reg=48&lang=2 (read via curl, 27 May 2022). The Sharing Regulations separately allow any entity to collect an Aadhaar number with purpose notice and consent, and bar keeping it longer than necessary: [Sharing Regs] reg 5, 6(5). These two points are in tension; a lawyer must resolve them.
8. Document numbers kept "indefinitely in the stay record" conflict with "no longer than necessary" principles: [Act] s.8(7); [Sharing Regs] reg 6(5) (for Aadhaar numbers); SPDI r.5(4) (if sensitive data). Set a defined period.
9. No Indian statute I found mandates a cookie banner. Google's terms still require a privacy policy that discloses GA and require cookie consent "where required by law": [GA ToS] s.7. Under DPDP, treat analytics identifiers as personal data to be safe.
10. Clerk is on a processor DPA dated 2024-11-26, but is an independent controller for "Account Information"; hosts mainly on Google Cloud and Cloudflare; sub-processor list lives in its Trust Center: [Clerk DPA] cl.3, cl.5, Sch.2. Disclose Clerk, the offshore processing, and Sentry/GA in the privacy policy.

---

## 1. DPDP Act 2023 and DPDP Rules 2025

### 1.1 Commencement status as of October 2026

- Rule 1 (read): Rules 1, 2 and 17-21 in force on publication; Rule 4 one year after; Rules 3, 5-16, 22 and 23 eighteen months after. The Gazette header is dated 13 Nov 2025 (PIB posted its release 14 Nov 2025). [Rules] r.1(2)-(4). Computed dates: ~13 Nov 2026 and ~13 May 2027. Computed by me, not stated in the Rules.
- Act s.1(2) lets the Centre commence provisions on different dates by notification: [Act] s.1(2).
- The Act commencement notification (G.S.R. 843(E), 13 Nov 2025): I did NOT read the Gazette text. Secondary summary says ss.1(2), 2, 18-26, 35, 38-43, 44(1),(3) took effect on publication, s.6(9) and s.27(1)(d) after one year, and the rest (including ss.5-8, 9, 33) after 18 months: https://dpdp.myndsolution.com/wiki/notifications/gsr-843e-2025-commencement/ and https://dpdprules.org/timeline. Confirm on the Gazette. UNCONFIRMED from a primary source.
- Practical consequence: substantive obligations (notice, consent, security, breach, erasure, grievance, penalties) are not yet enforceable. There is no confirmed instrument shortening this as of the sources reviewed (secondary: https://dpdprules.org/blog/dpdp-18-months-to-12-months-proposal). Re-check the Gazette before launch.
- Other bodies still apply meanwhile: IT Act s.43A and the SPDI Rules (see 1.9).

### 1.2 Applicability and lawful basis

- Processing needs consent or a "legitimate use": [Act] s.4(1).
- Legitimate use s.7(a): the specified purpose for which the principal "voluntarily provided" data and has not indicated she does not consent. s.7(d): fulfilling a legal obligation to disclose information to the State. [Act] s.7. Foreign-guest Form III reporting is a likely s.7(d) use for the hotel; the consent-based flow still fits the contract's explicit consent screen. Which basis to rely on is a lawyer question.
- Duties of the data principal (not to impersonate or suppress identity details): [Act] s.15.

### 1.3 Roles: hotel vs Tattwix

- Data Fiduciary: "any person who alone or in conjunction with other persons determines the purpose and means of processing". Data Processor: "any person who processes personal data on behalf of a Data Fiduciary". [Act] s.2(i), 2(k).
- The Fiduciary is responsible for everything done by its processor, "irrespective of any agreement to the contrary": [Act] s.8(1). A processor may be used only under a valid contract: [Act] s.8(2). Rules require processor contracts to include security safeguards: [Rules] r.6(1)(f).
- Analysis (not from the Act text): the Act says the party that determines purpose and means is the fiduciary, regardless of labels. Hotel: sets what categories are required, views the snapshot, checks guests in. Tattwix: runs the reusable profile, sets 7-day image purge and the retention of document numbers, and offers the account. If Tattwix controls retention defaults and reuse of profiles across hotels, it is likely a fiduciary (or joint) for the reusable profile and possibly for the stay snapshot. Treat the MVP contract's "Tattwix creates an immutable snapshot" step as Tattwix acting for its own product purpose, not purely for the hotel.
- Hotel and Tattwix need a written data-processing contract either way. The Act has no DPA template; contents are for counsel.

### 1.4 What the notice must contain

Notice must accompany or precede the consent request: [Act] s.5(1). Required items:

- The personal data and the purpose of processing: [Act] s.5(1)(i).
- How to exercise the withdrawal right and the rights to access, correction/erasure, grievance and nomination: [Act] s.5(1)(ii) (refers to s.6(4) and s.13).
- How to complain to the Data Protection Board: [Act] s.5(1)(iii).
- Rules add: shown and understandable independently of other information; clear plain language; an itemised description of the data; the specific purposes and the specific goods/services or uses enabled; the website/app link; and the means to withdraw consent (as easy as giving it), exercise rights, and complain to the Board. [Rules] r.3.
- Language: option of English or any Eighth Schedule language: [Act] s.5(3).
- Contact details of a DPO if applicable, or another authorised person, must be provided in the consent request: [Act] s.6(3).

### 1.5 Form of consent

- "Free, specific, informed, unconditional and unambiguous with a clear affirmative action", limited to data necessary for the specified purpose: [Act] s.6(1). Bundled consent beyond the purpose is invalid to that extent: [Act] s.6(1) illustration, s.6(2).
- Plain language; English or Eighth Schedule languages; contact details: [Act] s.6(3).
- Withdrawal "at any time, with the ease of doing so being comparable" to giving it; consequences borne by the principal; after withdrawal the Fiduciary and its processors must cease processing within a reasonable time unless law requires or authorises it: [Act] s.6(4)-(6).
- Burden: the Fiduciary must prove notice was given and consent obtained: [Act] s.6(10). Keep an auditable consent record (versioned text shown, timestamp, categories, participants). The existing consent screen and immutable snapshot help here; this is my recommendation.
- Children (under 18) and persons with a lawful guardian: verifiable parental or guardian consent before processing; no tracking or behavioural monitoring of children: [Act] s.2(f), s.9; [Rules] r.10 (due diligence on parent identity, including via a Digital Locker token). Exemptions for classes of fiduciaries are in [Rules] r.12 and its schedule; I did not read that schedule closely, so whether a hotel or travel platform is exempt is UNCONFIRMED. Companion profiles with a minor's date of birth likely trigger this.
- Adult companions: the primary guest enters their data. Whether the primary guest's action counts as the companion's consent is not answered by the Act text I read. Open question.

### 1.6 Grievance officer and contact obligations

- Publish business contact information of a DPO if applicable, or a person who can answer questions: [Act] s.8(9); [Rules] r.9 ("prominently publish on its website or app", and mention it in every response to a rights request).
- "Establish an effective mechanism to redress the grievances": [Act] s.8(10); right to grievance redressal: [Act] s.13.
- Publish the means to make rights requests and the identifier needed: [Rules] r.14(1).
- Publish a grievance response time not exceeding 90 days and implement measures to meet it: [Rules] r.14(3).
- A DPO based in India is mandatory only for Significant Data Fiduciaries: [Act] s.10(2)(a). No notification designating hotels or Tattwix was found.
- Until the DPDP duties start, SPDI Rule 5(9) requires a named Grievance Officer with contact details on the website, resolving grievances within one month: IT Rules 2011 text (PRS copy, not the MeitY PDF): https://prsindia.org/files/bills_acts/bills_parliament/2011/IT_Rules_2011.pdf, r.5(9).

### 1.7 Retention and erasure

- Erase personal data on withdrawal of consent or when it is reasonable to assume the purpose is no longer served, whichever is earlier, unless law requires retention; the Fiduciary must also cause its processors to erase: [Act] s.8(7).
- Purpose deemed served if the principal neither approaches the Fiduciary nor exercises rights for a prescribed period: [Act] s.8(8), s.8(11). The prescribed periods in the Third Schedule apply only to listed classes (e-commerce with 2 crore+ users, online gaming with 50 lakh+ users, social media with 2 crore+ users): [Rules] r.8(1), Third Schedule. A hotel stay product is not in those classes on its face.
- Right to correction, completion, updating and erasure on request, unless retention is necessary for the specified purpose or legal compliance: [Act] s.12(1)-(3).
- Minimum retention: a Data Fiduciary must retain personal data, associated traffic data and processing logs for at least one year from processing, for Seventh Schedule purposes (State requests, etc.), then erase unless other law requires more. The illustration extends this to a cloud processor. [Rules] r.8(3). Also logs retained one year for security investigations: [Rules] r.6(1)(e).
- Effect on the MVP contract: Rule 8(3) is not limited to Third Schedule classes and sits beside the "erase as soon as purpose served" rule. The interaction (does the 7-day image purge conflict with a one-year minimum?) is unclear in the text. Flag for a lawyer. Until resolved, say in the policy that data is removed from active use on request and some records and logs are retained as the law requires.
- Third Schedule 48-hour pre-erasure warning applies only to those listed classes: [Rules] r.8(2).

### 1.8 Breach notification and penalties

- Duty: intimate the Board and each affected principal in the prescribed form: [Act] s.8(6).
- To each affected person, without delay, via account or registered contact: description (nature, extent, timing), likely consequences, mitigation, safety steps, and a business contact: [Rules] r.7(1).
- To the Board: without delay a description including nature, extent, timing, location and likely impact; within 72 hours (extendable on written request) updated detail, events and reasons, mitigation, findings on the cause, remedial steps and a report on principal notifications: [Rules] r.7(2).
- Security safeguards minimum: encryption, obfuscation or masking or virtual tokens; access control; logging and monitoring; backups; one-year log retention; processor contract terms: [Rules] r.6(1).
- Penalty schedule ("may extend to"): security safeguards failure Rs 250 crore; breach notification failure Rs 200 crore; children's obligations Rs 200 crore; Significant Data Fiduciary obligations Rs 150 crore; data principal duties Rs 10,000; other breaches Rs 50 crore. [Act] Schedule items 1-7.

### 1.9 Cross-border and other points

- Transfers outside India allowed unless the Centre restricts a country; any other law with stricter rules prevails: [Act] s.16; [Rules] r.15 (requirements the Centre may specify). Clerk and others may process abroad (see Q5), so the policy should say so.
- SPDI Rules 2011: "sensitive personal data" is a closed list (password, financial info, health, sexual orientation, medical records, biometric). Government ID numbers are not listed: IT Rules 2011 r.3 (PRS copy above). Biometric information is a listed category, but the MVP contract excludes selfie and biometric results. r.4 privacy policy contents and r.5 written consent apply to the sensitive categories only.

---

## 2. Hotel guest identity recording and retention

### 2.1 Foreign nationals

- Immigration and Foreigners Act 2025 s.8(1): duty of the keeper of accommodation to submit to the Registration Officer information on foreigners accommodated, in the prescribed manner; non-commercial residential premises are excluded. s.8(2): the foreigner must give the keeper the particulars required. "Keeper of accommodation" is the person in charge of management, including authorised persons. [IFA] s.2(j), s.8. Commencement 1 Sep 2025 per Goa government notice: https://www.goa.gov.in/wp-content/uploads/2025/12/ONLINE-FILLING-OF.pdf
- The Bureau of Immigration publishes the operative rule text (Immigration and Foreigners Rules 2025, rule 17, Form III, formerly Form C) [BOI]:
  - The keeper must require every foreigner, including an OCI cardholder, to furnish particulars and sign on arrival, and record departure date, time and onward address, "maintained by the keeper of accommodation electronically for a period of at least one year".
  - Particulars must be available for inspection on demand by the Registration Officer, District Magistrate or a police officer not below Head Constable.
  - Transmit Form III electronically within 24 hours of arrival, and departure details within 24 hours of departure, through the designated portal or app.
  - "Accommodation" includes hotels' kin: boarding house, guest house, hostel, home stay, sarai, etc.
- I read the BOI rendering, not the Rules gazette PDF itself. The rule number (17) comes from the Goa notice, which also gives a Rs 50,000 penalty per case for non-submission: Goa notice above. BOI penalties page (generic): https://boi.gov.in/boi/contents/registration-authority/penalties
- Goa notice says hoteliers register at the Bureau of Immigration site (boi.gov.in) and need FRRO approval of a user ID. Portal details elsewhere (indianfrro.gov.in) are secondary; check current BOI instructions.
- Consequence: for foreign guests the hotel (not Tattwix) has a statutory duty, includes a minimum one-year electronic retention, and requires a signature. Tattwix can supply the data but cannot promise earlier deletion of the hotel's own legal record. Whether a digital consent or on-screen signature satisfies "sign" is unconfirmed.

### 2.2 Indian nationals

- Sarais Act 1867: I could not retrieve the India Code PDF (https://indiacode.nic.in/bitstream/123456789/19045/1/a1867-22.pdf returned an error/redirect), so I did NOT verify the text. A secondary summary describes ss.4-8 as magistrate's register of sarai keepers, registration before admitting lodgers, health and inspection duties and reports ordered by a magistrate, and no explicit guest-register duty: https://www.casemine.com/act/in/5a979df64a93263ca60b7705 (unverified secondary). Treat "Sarai Act mandates a guest register" as UNCONFIRMED.
- Guest recording for Indians appears to come from state or district police orders and state hotel or lodging regulations, which vary. Examples found are news reports only (secondary): Andaman & Nicobar DM directive requiring a check-in register, valid ID and CCTV footage kept at least 30 days (https://nicobartimes.com/?p=14563 reported via search); Haryana police portal registration of hotels (Tribune report via search). I found no primary state text with a guest-register retention period.
- Conclusion: a national minimum retention period for the Indian guest register is NOT established by any primary source I reached. The only confirmed minimum is one year for foreign guests ([BOI]). This needs the pilot hotel's state and city police order.
- Implication for deletion promises: promise deletion of images on schedule and deletion of the reusable profile on request; do not promise erasure of the hotel's statutory register. Say that hotels may be legally required to keep stay records for periods set by law, and that Tattwix holds them for the hotel.

---

## 3. Aadhaar numbers and images

- Aadhaar Act s.29(3): identity information held by a requesting entity may not be used for a purpose other than that specified at submission, or disclosed further without consent. s.29(4): no Aadhaar number "shall be published, displayed or posted publicly" except as specified by regulations. [Aadhaar Act] s.29. Section 29(2) ties other sharing to the Act and regulations. s.29(3) is addressed to requesting entities (those authorised to authenticate).
- Sharing Regulations apply to any "individual, agency or entity which collects Aadhaar number or any document containing the Aadhaar number" [Sharing Regs] reg 5(1): must (a) collect, store and use for a lawful purpose; (b) tell the holder the purpose, whether giving it is mandatory or voluntary and the legal provision if mandatory, and any alternatives; (c) get consent to collection, storage and use. Reg 5(2)-(3): no use beyond that purpose; no sharing without consent.
- Reg 6: never publish or display; the holder of Aadhaar numbers must "ensure security and confidentiality" of numbers and records; redact before making any database public; encrypted transmission over the internet; and reg 6(5) "No entity... shall retain Aadhaar numbers or any document or database containing Aadhaar numbers for longer than is necessary for the purpose specified". Reg 7: breach of regs 3-6 is a violation of s.29(2). [Sharing Regs] reg 5-7.
- Public statement: UIDAI says "Unlicensed private entities like hotels or film halls are not permitted to collect or keep copies of Aadhaar card. It is an offence under the Aadhaar Act 2016", and recommends masked Aadhaar (last 4 digits only): PIB 27 May 2022, https://www.pib.gov.in/PressReleasePage.aspx?PRID=1828797&reg=48&lang=2. This is an advisory in a press release, not a rule text. Which Aadhaar Act offence section it relies on is not stated; I did not find a section that clearly makes a hotel copy an offence. UNCONFIRMED as a matter of statute.
- Offline verification route: an entity wanting to verify Aadhaar can register with UIDAI as an Offline Verification Seeking Entity; an OVSE may store offline Aadhaar data only with consent, and must delete in a verifiable manner and acknowledge if consent is revoked; it must verify the digital signature or secure QR before accepting an Aadhaar. [AOV Regs] reg 13A, 16A, 16C (as updated 15.12.2025). Whether a hotel or Tattwix needs to register, or is covered, is not answered by these texts. UNCONFIRMED.
- DPDP overlay (from 2027): masking is named as a safeguard: [Rules] r.6(1)(a).
- Answer to "does storing a full Aadhaar image by a private entity need anything specific?": from primary text, at minimum (i) purpose notice with voluntary/mandatory status and alternatives, (ii) explicit consent to storage, (iii) security and confidentiality, no public display, (iv) retention no longer than necessary, plus UIDAI's stated position against hotels keeping copies. The safest design option is to accept masked Aadhaar (last 4 digits visible) or a non-Aadhaar document, and to store the full image only if counsel confirms an exemption.
- Product implication: the contract lists Aadhaar as supported with front and back images. Consider (a) masking the number on the stored image or accepting only the masked Aadhaar download, (b) not storing the full number in the stay record beyond the access window, (c) a lawyer opinion before the Aadhaar option goes live.

---

## 4. Google Analytics 4 and cookie consent

- Indian law on cookie banners: I found no Indian statute or rule that requires a cookie banner as such. The DPDP Act and Rules do not mention cookies in the text I read. If analytics identifiers are personal data, DPDP consent and notice rules apply once in force. Whether GA identifiers are "personal data" under the Act is UNCONFIRMED. The Act defines personal data as data about an individual who is identifiable by or in relation to such data: [Act] s.2(t).
- Google Analytics Terms of Service s.7 (Privacy) [GA ToS]:
  - You will have and abide by an appropriate Privacy Policy and comply with applicable law on collecting information from users.
  - You must post a Privacy Policy that gives notice of cookies, mobile identifiers or similar technology used to collect data.
  - You must disclose the use of Google Analytics and how it collects and processes data; a prominent link to "How Google uses information from sites or apps that use our services" is a permitted way.
  - You must use commercially reasonable efforts to ensure users get clear information about, and consent to, storing and accessing cookies where required by law.
  - You must not pass information to Google that Google could recognise as personally identifiable information, hashed or not. This matters for Tattwix: do not send user IDs, emails, phone numbers, document types or hotel-stay identifiers as GA parameters or in URLs.
  - ToS page shows "Last Updated May 15, 2023"; check the live page again before publishing.
- Policy for advertising features, and the EU user consent policy, apply only if advertising features are enabled or EEA users are served: https://support.google.com/analytics/answer/2700409 and https://support.google.com/analytics/answer/7318509 (search-result summaries, not read in full). Not confirmed for Tattwix.
- Sentry: same rule of thumb. Disclose it as a processor for error reporting, state it is scrubbed. I did not review Sentry's DPA.

---

## 5. Clerk

- DPA: https://clerk.com/legal/dpa (markdown: https://clerk.com/legal/dpa.md). Last updated 2024-11-26. Read in full via the markdown rendering. Findings [Clerk DPA]:
  - Roles (cl.3): Clerk is processor or sub-processor for Customer Personal Data under GDPR; for Account Information Clerk is an "independent controller, not a joint controller with Customer". Under US laws it is generally a service provider or processor except for Account Information.
  - Sub-processors (cl.5): list at https://clerk.com/legal/subprocessors.md, which says the current list is in the Trust Center at https://trust.clerk.com/. At least 15 days' notice of changes; customer may object within 10 days; unresolved objection allows termination as sole remedy.
  - Location (cl.4.4, Sch.2): Clerk may process wherever it or its sub-processors have facilities; hosting is primarily Google Cloud and Cloudflare data centres. EEA/UK/Swiss transfers rely on the Data Privacy Framework and SCCs (cl.11). Nothing in what I read addresses India or DPDP specifically. UNCONFIRMED whether the DPA has India terms.
  - Security incident notice (cl.8): "without undue delay"; no fixed number of hours. This matters for the 72-hour Board report ([Rules] r.7(2)), which counts from the Fiduciary becoming aware.
  - Deletion (cl.9-10): return on request, and delete all other copies within 90 days of termination.
- Sub-processor list contents: trust.clerk.com returned a Cloudflare challenge to my fetch, so I did NOT read the named sub-processors. Open the Trust Center in a browser and copy the current list. Do not rely on the unrelated vendor "Clerk.io", whose sub-processor page is a different company.
- What the policy should say about Clerk: Clerk handles sign-in and holds account information (at least email, per the brief) and session data; processing may occur outside India (Google Cloud, Cloudflare and Clerk's sub-processors); Clerk is an independent controller for its Account Information, so link to Clerk's own privacy policy as well; list or link to the sub-processor page; state how a deletion request reaches Clerk (delete user via API), noting Clerk's own retention.

---

## What the privacy policy and terms pages must cover (checklist)

Privacy notice and policy (fiduciary role to be confirmed; items needed under [Act] s.5, [Rules] r.3, r.9, r.14, SPDI r.4):

- [ ] Who we are: Tattwix operator entity and address; role statement (Tattwix and the hotel each, as determined by counsel); hotel name for each stay.
- [ ] Itemised list of data: name, phone, date of birth, nationality, address, document type, document number, name on document, expiry, front/back images, companion details, relationship, stay and room data, audit logs. Say what is optional.
- [ ] Specific purposes per category: identity verification for the stay; hotel's legal reporting; account reuse across stays; security and fraud; service operation. Exclude marketing unless separately consented.
- [ ] Who sees it: the named hotel and its staff, for a limited window; Tattwix staff access rules; processors (hosting, Clerk, Sentry, GA); legal disclosure to authorities (Form III to the Registration Officer for foreigners; police on lawful demand).
- [ ] Retention table: image access window (7 days, then purge), document numbers (set a period; "indefinite" is hard to defend), reusable profiles (until deleted), audit logs and minimum logs (state the one-year minimum under [Rules] r.6(1)(e), r.8(3)), hotel's own statutory records (minimum one year for foreigners, [BOI]).
- [ ] How to withdraw consent (as easy as giving it), access, correct, erase, nominate; how a request is verified; response time (state 90 days max, aim for faster): [Rules] r.14.
- [ ] How to complain: first to the grievance contact, then to the Data Protection Board; no waiver of that right: [Act] s.5(1)(iii), s.6(2), s.13.
- [ ] Published contact person for data questions and a named grievance officer with email and postal address (SPDI r.5(9) now, DPDP r.9 later).
- [ ] Children and companions: parental consent for under-18 companions; no tracking of children; what the primary guest represents about companion data: [Act] s.9.
- [ ] Aadhaar-specific text: purpose, whether voluntary, alternatives (other documents; masked Aadhaar), consent to storage, no public display: [Sharing Regs] reg 5-6.
- [ ] Security measures summary (encryption, access control, private storage, logs, backups): [Rules] r.6.
- [ ] Breach notice promise: tell affected users via account or registered contact without delay: [Rules] r.7(1).
- [ ] Location and cross-border: stored in Mumbai (AWS ap-south-1, Supabase); Clerk and others may process elsewhere: [Act] s.16.
- [ ] Analytics and cookies: GA4 and Sentry disclosed, what they collect, scrubbing of identity data, a link to https://policies.google.com/technologies/partner-sites, opt-out option: [GA ToS] s.7.
- [ ] English version at launch plus an option for Eighth Schedule languages (start with Hindi): [Act] s.5(3).
- [ ] Version, effective date, and a record of the version each user accepted: [Act] s.6(10).

Terms of use:

- [ ] Service description; Tattwix as platform, hotel as the party collecting ID and responsible for its own register obligations.
- [ ] User duties: accurate data, only own documents (and authority for companions), no impersonation: [Act] s.15.
- [ ] Hotel terms: hotel agrees to use data only for the stay and its legal duties, access limits, no onward copies, deletion after window, breach notice to Tattwix, a data processing addendum. Include foreign-guest Form III responsibility sits with the hotel: [IFA] s.8.
- [ ] Account deletion and effect on historical stay records.
- [ ] Liability limits and governing law (not a data-rights waiver: [Act] s.6(2)).
- [ ] Acceptable use, availability, changes to terms, contact details.

---

## Open questions needing a lawyer

1. Roles: is Tattwix a processor, an independent fiduciary or a joint fiduciary for (a) the reusable guest profile, (b) the stay snapshot, (c) analytics? What goes into the hotel contract?
2. Which Gazette instrument fixes the Act's commencement dates (G.S.R. 843(E))? Any later amendment shortening the 18 months? I could not read the Gazette text for the Act commencement notification.
3. Rule 8(3) one-year minimum versus Act s.8(7) erase-when-purpose-served and the 7-day image purge: what must actually be kept, by whom, and does it include the images?
4. Indian guests: which state or city police order governs the pilot hotel, and what record-keeping and retention period does it set? Does the Sarais Act 1867 impose anything beyond registration?
5. Foreign guests: does an electronic consent or on-screen signature satisfy "sign" in the Form III rule, and can Tattwix file Form III for the hotel (the keeper's login is FRRO-approved)?
6. Aadhaar: does UIDAI's statement that hotels may not keep Aadhaar copies bind a platform that stores an image at a guest's request? Is OVSE registration needed? Is masking enough? The Act offence section behind the PIB statement is not identified.
7. Document numbers "kept indefinitely in the stay record": what retention period can be defended?
8. Companions: can the primary guest consent for adult companions? Do the child exemptions in Rule 12 help a travel platform? How is parent verification done for a companion who is a minor?
9. Is a cookie consent banner advisable or required for GA4 under DPDP, given GA identifiers? Is GA4 data "personal data" in India?
10. Cross-border: any country restriction under s.16 or Rule 15 that touches Clerk, Sentry or Google hosting? Does Clerk's DPA need India-specific terms?
11. Significant Data Fiduciary risk: ID document volumes may attract notification (DPO, audit, DPIA): [Act] s.10.
12. SPDI Rules: do they apply to the ID data until 18 months pass, and do they apply to Tattwix as a "body corporate"? (Government ID numbers are not in rule 3's list.)
