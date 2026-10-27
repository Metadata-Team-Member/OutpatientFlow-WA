# Dictionary mapping (extract columns → Specification elements)

**Status.** This table maps the columns of the sample CSVs (`data/sample/*.sample.csv`) and the generator (`tools/generate_synthetic.mjs`) to the elements of the *Non-Admitted Patient Data Collection Data Specifications* **v1.0, July 2021** (MP 0164/21, Ref F-AA-74148, 115 elements). That document was read through a third-party mirror, not the official PDF ([SOURCES.md](SOURCES.md)). The **Data Dictionary** itself was **not obtained**, so definitions here come from the Specification's own "Comments" column.

* "Elem." is the element number in the Specification's Appendix B listing (the mirror's page numbers are unreliable, so we cite numbers).
* Requirement is as printed in the Specification: Mandatory, Conditional or Optional.
* Later editions may differ ([SOURCES.md](SOURCES.md) 3.4).

## Referral (record type REF)

| Extract column | Elem. | Specification element | Requirement | Code set used / note |
|---|---|---|---|---|
| `ESTABLISHMENT_CODE` | 1 | Establishment Code | Mandatory | Four digits assigned by the Department of Health. Sim uses the HEALTH-001 `estab_id`, padded (assumption). |
| `REFERRAL_ACCOUNT_NUMBER` | 33 | Referral Account Number | Mandatory | Unique referral identifier. Sim: `SYN` + 8 digits. |
| `REFERRAL_CATEGORY_CODE` | 35 | Referral Category Code | Mandatory | Appendix C. 11 of 16 sim codes verified; `CAR DER END ENT GAS` provisional. |
| `REFERRAL_CREATED_DATE` | 36 | Referral Created Date | Mandatory | DDMMYYYY. Sim: equal to received date. |
| `REFERRAL_RECEIVED_DATE` | 43 | Referral Received Date | Mandatory | Starts the wait until a first appointment is attended. |
| `REFERRAL_PRIORITY_CODE` | 40 | Referral Priority Code | Mandatory | AWT, NUR, SEM, UNK, URG. Sim uses URG / SEM / NUR. |
| `REFERRAL_REASON_CODE` | 41 | Referral Reason Code | Mandatory | ASS, CHR, EDU, OPM, OTH, RET, TRE, UNK. Sim uses ASS, TRE, OPM, OTH. |
| `REFERRAL_SOURCE_CODE` | 44 | Referral Source Code | Mandatory | 30 codes (GEP, SPR, OTH Other Hospital, CON Same Consultant ...). |
| `REFERRAL_STATUS_CODE` | 45 | Referral Status Code | Mandatory | CA, CL, IN, OP, RE, UN, WL. Sim uses OP and CL. |
| `REFERRAL_CLOSED_DATE` | 37 | Referral Closed Date | Conditional | Blank while open. |
| `REFERRAL_REASON_FOR_CLOSURE_CODE` | 42 | Referral Reason for Closure Code | Conditional | AUD, DEC, DIP, PDT, TFC, TRE. |
| `DERIVED_PERSON_KEY` | n/a | not a Specification element | n/a | Stands in for the patient identifier group (elements 2 to 5). Real extracts carry identifiers. |
| `DERIVED_AGE_YEARS` | 8 | Date of Birth (derived) | Mandatory | Sim stores age only. |
| `DERIVED_HEALTH_DISTRICT` | n/a | derived from Australian Postcode (residential address group) | n/a | Sim chooses a district directly. A postcode to district concordance is an open question. |
| `DERIVED_PRIOR_ATTENDED` | n/a | derived | n/a | Count of earlier attended events. Used for starting size of a character. |

## Appointment (record types APP, RES, CAN)

| Extract column | Elem. | Specification element | Requirement | Code set used / note |
|---|---|---|---|---|
| `APPOINTMENT_ACCOUNT_NUMBER` | 48 | Appointment Account Number | Mandatory | Sim: `SYNA` + 7 digits. |
| `CLINIC_CATEGORY_CODE` | 83 | Clinic Category Code | Mandatory | Must match the referral category (Business Rules). |
| `APPOINTMENT_DATE` | 53 | Appointment Date | Mandatory | DDMMYYYY. |
| `APPOINTMENT_TYPE_CODE` | 81 | Appointment Type Code | Mandatory | NEW, FOL, NCE, OTH, UNK. |
| `APPOINTMENT_DELIVERY_MODE_CODE` | (see Spec) | Appointment Delivery Mode Code | Mandatory | CLP, GCP, HOM, MCC, OTH, POS, SLF, TEL, THC, THH, THS, UNK, VID. Sim uses six. |
| `APPOINTMENT_SESSION_TYPE_CODE` | 77 | Appointment Session Type Code | Mandatory | GRP, IND, MCC (and NCE, UNK as listed). |
| `APPOINTMENT_OUTCOME_CODE` | 69 | Appointment Outcome Code | Mandatory | 15 codes incl. CAN Cancelled. **Allocated outcome = attended** (Business Rules §5.1). |
| `APPOINTMENT_NON_ATTENDANCE_REASON_CODE` | 68 | Appointment Non-Attendance Reason Code | Conditional | Mandatory when not attended. 13 codes (PDA Pt Did Not Attend, FGT Forgot, TRU Transport Unavailable ...). |
| `APPOINTMENT_CANCELLATION_CODE` | 49 | Appointment Cancellation Code | Conditional | About 38 listed codes with duplicates. |
| `APPOINTMENT_CANCELLATION_DATE` | 50 | Appointment Cancellation Date | Conditional | DDMMYYYY. |

## Elements in the Specification that the sim does **not** generate

Appointment Status Code (78: PR, PP, UN, FU, RS, CA), Appointment Time (80), Clinic Title (89), Appointment Reason for Reschedule Code (75) and Reschedule Count (76), Delivery Setting (Y/N, on or off campus), Care Type, Client Type (CC, ED, EX, IP, NS, OP, PH), Event Type (WACHS only), the patient demographic group (names, Medicare, address and so on), and the cancer and community / palliative element groups.

## Other conventions

* **Change types.** Real extracts carry change type I (insert) or U (update). Not generated.
* **File naming (v1.0).** `NAP_DATAPROVIDER_PASSYSTEM_YYYYMMDD_YYYYMMDD.csv`. The sim does not write real-format extracts.
* **Dates** are DDMMYYYY in the sample CSVs, as in the Specification. The internal JSON uses day offsets.
* The code lists in `config/dimensions.json` are from Appendix B/C of the Specification; the **weights, tiers and scope are invented**.
