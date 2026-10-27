# What changed: 2026 documents vs the 2021 baseline

Round 2 of this project used third-party mirrors of the **July 2021** Specification v1.0 and Business Rules (sections 1-8.5 only). Round 3 replaced them with the user-supplied **July 2026** editions. This page records what changed. Sources: **Spec Appendix G "Summary of revisions" (pp.59-60)** and **BR Appendix D (p.49)**; items marked *(sim)* describe what we changed in the simulation. See [SOURCES.md](SOURCES.md).

## From the Specification's revision history (Spec App G, pp.59-60)

| Released | Change (as listed in the document) | Effect on the simulation |
|---|---|---|
| 1 Jul 2021 | Document created. | Baseline of round 2 |
| 1 Jul 2022 | Added "Appointment Attendance Code". Removed "Event Type" (duplicate of "Appointment Event Type"). | *(sim)* Attendance (ATT / DNA / DNW / NCE / MCC) is now generated. Round 2 had said the 2021 Specification had **no** attendance element; that was correct for 2021 and is now closed |
| 1 Jul 2023 | Field names added to each element for data files. Added "Gender Code". Removed "Appointment Level Tier 2 Classification Code", "Record Change Type" and "System Loaded Date". Added Appendices C (data entry and edits schedule), D (reference codes), E (NMDS Tier 1), F (Clinic Tier 2). | *(sim)* Columns now use the snake_case **field names** (`referral_account_number` …). The record types REF / APP / RES / CAN and change types I / U of the 2021 text no longer exist (change type was removed) |
| 1 Jul 2024 | Feeder file versioning introduced. File format changed to "double pipe delimited". Category "Gender Diversity Service" added. New Tier 2 codes from IHACPA. | The file-naming pattern carries a version (V003). The sim's sample CSVs stay plain CSV (the text of the Spec itself also still says csv in one place) |
| 1 Jul 2025 | Grammar and links. Updated requirement for Medicare Card Number and Referral Entered By. **Removed values** from Non-Attendance Reason, Reason for Reschedule and Cancellation. | *(sim)* Non-attendance reasons reduced to APE, ATU, COH, COP, COQ, DEC, DNN, DNR, TNR; the 2021 lists with duplicate codes are gone (2021 duplicates question closed) |
| 1 Jul 2026 | Outpatient Services Policy added to §1 and §9. New referral closure code **Escalation of care**. "Ongoing patient management" renamed **Technical transfer** (code OPM kept). Codes aligned to Metadata Standards. New clinic and referral categories **End of Life Service** and **Older Adult Community Hub**. New element **Appointment - Contracting Establishment**. Appendix C updated for 2026-27. Appendix E duplicate Tier 1 codes removed. Appendix F: the bullet is blank in the document (p.60). | *(sim)* ESC closure code and Technical transfer label added; the contracting establishment element is documented but not generated |

## From the Business Rules' revision history (BR App D, p.49)

* Added **accompanied patients** (30 June 2026 entry).
* "Ongoing patient management" renamed **Technical transfer**.
* Definition of Specialised Mental Health updated.
* New referral / clinic categories **End of Life Service** and **Older Adult Community Hub**.
* Only the 2026 entries were recorded in our notes; earlier entries on that page were not extracted. Anything older than 2026 should be read from the PDF.

## Differences that mattered in the simulation (2021 baseline → 2026)

| Topic | 2021 baseline (round 2) | 2026 documents (now) |
|---|---|---|
| Attendance status | None; "attended" = an outcome code recorded (BR 2021 §5.1) | ATT / DNA / DNW / MCC / NCE / NSP / UNK, derived from outcome and processing status (Spec p.17, DD pp.5-6, BR §5.2) |
| Date format | DDMMYYYY | YYYY-MM-DD |
| Column names | `REFERRAL_ACCOUNT_NUMBER` …, upper case | `referral_account_number` …, snake_case (Spec App B). `tools/build_data.mjs` still accepts the 2021 names as aliases |
| Non-client events | Appointment type NCE only | Chart only and MCC are non-client events that never stop the wait (BR §10.2.7, §6.9). *(sim)* new event kind 3 |
| Delivery modes | 13 codes including VID | VID end-dated 30 Jun 2023 (DD). ELE (electronic) appears in the 2026 list; THH / THS / THC definitions (DD pp.14-15). *(sim)* VID only up to 2023-06-30 |
| Referral reasons | OPM "Ongoing patient management" | OPM = Technical transfer (from 1 Jul 2026), excluded from first-attended wait reporting (DD p.155) |
| Closure reasons | AUD DEC DIP PDT TFC TRE | + ESC (Escalation of care), + NSP |
| Clinic categories | Appendix C partly unreadable; five codes "provisional" | Spec Appendix D is complete. All codes are verified; the "provisional / unverified" flags were **removed** |
| Clinic classification | Not read | Tier 1 (App E) and Tier 2 (App F) codes are mandatory on every appointment record (Spec p.28). *(sim)* clinics carry both; the **pairing is our assumption** |
| Establishments | SLIP HEALTH-001 "Outpatient Reporting" flag as a proxy (117) | Establishment List May 2026 v0.1, **Reports to NADC = Y: 125** |
| Specialised mental health | Adult psychiatry category in the sim | Out of scope (BR §6.11, §10.1.1); removed |
| Collection name | NAPDC | Non-Admitted Data Collection (NADC) |
