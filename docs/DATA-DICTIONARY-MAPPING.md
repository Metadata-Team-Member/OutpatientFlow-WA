# Mapping: sample CSV columns → 2026 Specification elements

**Status.** The columns of `data/sample/*.sample.csv` (and the generator `tools/generate_synthetic.mjs`) follow the **field names** of *Non-Admitted Data Collection Data Specifications July 2026*, Appendix B (pp.8-34); code sets are from Appendix D (pp.36-49). "Req." is the Requirement column as printed: **M** Mandatory, **C** Conditional, **O** Optional. "Page" is the printed page of Spec Appendix B. Definitions and derivations are in the *Data Dictionary 2026* (DD); rules are in [BUSINESS-RULES-SUMMARY.md](BUSINESS-RULES-SUMMARY.md). Dates are ISO `YYYY-MM-DD`, as in the Specification. The 2021 field names are accepted as aliases by `tools/build_data.mjs` only for old files.

The Spec's element numbering is printed only on part of the listing in the copy we read, so elements are cited by **field name and page**, not number.

## Referral (one row per referral)

| Sample column | Req. | Page | Code set / note |
|---|---|---|---|
| `establishment_code` | M | 8 | N(4), assigned by the Department of Health. Sim uses the 125 codes from the Establishment List with Reports to NADC = Y |
| `referral_account_number` | M | 13 | Unique referral id. Sim: `SYN` + digits |
| `referral_category_code` | M | 14 | Spec App D. Sim uses 22 categories (CAR, DER, END …; the clinic-category code is the same) |
| `referral_created_date` | M | 16 | Sim: equals received date |
| `referral_received_date` | M | 14 | "commencement of the referral wait time until a first appointment is attended" |
| `referral_priority_code` | M | 14 | AWT, NUR, SEM, UNK, URG. Sim uses URG / SEM / NUR |
| `referral_reason_code` | M | 14 | ASS, CHR, EDU, **OPM (Technical transfer)**, OTH, RET, TRE, UNK. Sim uses ASS, TRE, OPM |
| `referral_source_code` | M | 14-15 | 30 codes (GEP, SPR, OTH Other Hospital, CON Same Consultant …) |
| `referral_status_code` | M | 14 | CA, CL, IN, OP, RE, UN, WL. Sim uses OP and CL |
| `referral_closed_date` | C | 15 | Blank until closed |
| `referral_reason_closure_code` | C | 16 | AUD, DEC, DIP, **ESC**, PDT, NSP, TFC, TRE. Sim uses all but NSP |
| `derived_*` columns | n/a | n/a | Stand-ins (person key, age, district, prior attended). Real extracts carry the identifier group (Spec pp.8-13) |

## Appointment (one row per appointment event)

| Sample column | Req. | Page | Code set / note |
|---|---|---|---|
| `appointment_account_number` | M | 16 | Sim: `SYNA` + digits |
| `appointment_date` | M | 17 | |
| `appointment_attendance_code` | M | 17 | ATT, DNA, DNW, MCC, NCE, NSP, UNK. "Derived from the Appointment Outcome Code in webPAS". Sim leaves it **blank on cancelled rows** (status CA, outcome CAN); the Spec lists it as Mandatory (open question) |
| `appointment_status_code` | M | 17 | PR, PP, UN, FU, RS, CA. Sim writes PR (processed) or CA |
| `appointment_type_code` | M | 18 | NEW, FOL, **NCE** (non-client event or chart only), OTH, UNK |
| `appointment_session_type_code` | M | 19 | IND, GRP, **MCC**, NCE, UNK |
| `appointment_client_type_code` | M | 20 | CC, ED, EX, IP, NS, **OP**, PH. Sim writes OP |
| `appointment_care_type_code` | M | 20 | ACU, GER, MEN, NSP, OTH, PAL, PSY, REH, UNK. Sim writes ACU, except GER for Gerontology and REH for Rehabilitation |
| `appointment_delivery_mode_code` | M | 21 | CLP, ELE, GCP, HOM, MCC, OTH, POS, SLF, TEL, THC, THH, THS, UNK. **VID is not in App B** (it is in App D; end-dated 30 Jun 2023 in the DD) |
| `appointment_delivery_set_code` | M | 21 | Y on campus / N off campus |
| `appointment_outcome_code` | M | 24-25 | ADM … UNK (23 codes). "Used to derive the appointment attendance code". DNA rows are blank in the sim (see open question) |
| `appointment_nonattend_reas_code` | C | 24 | APE, ATU, COH, COP, COQ, DEC, DNN, DNR, TNR. Mandatory when not attended |
| `appointment_cancellation_code` | C | 19-20 | ATU, CCA, CLC, CLR, COH, COP, COQ, CUR, DEC, ERR, IND, NSP, PCO, TNR, UNK |
| `appointment_cancellation_date` | C | 20 | |
| `clinic_category_code` | M | 27 | Spec App D; must match the referral category (BR §7) |
| `clinic_nmds_tier1_code` | M | 28 | `NNN.NNN` from Spec App E. **Pairing with the category is assumed** |
| `clinic_tier2_code` | M | 28 | `NN.NN` from Spec App F (IHACPA). **Pairing assumed** |

## Mandatory elements the sim does **not** generate (so sample files are not valid NADC extracts)

`establishment_site_code` (O), the identifier and demographic group (client_identifier, names, date_of_birth, sex_code, gender_code, country_or_state_of_birth_code, interpreter_required_code, aboriginal_status_code, address, postcode, state, residency status; all M), `referral_entered_date` (M), `appointment_time` (M), `appointment_pay_class_code` (M), `clinic_identifier` (M), `clinic_multidisciplinary_code` (M), `clinic_title` (M). Conditional / optional elements not generated include `appointment_contracting_estab_number` (new in 2026), diagnoses, healthcare providers, program, reschedule reason and count, processing status, arrival and seen times, and the cancer, community and palliative groups.

## Other conventions

* **File naming** (Spec §4): `NAP_DATAPROVIDER_PASSYSTEM_V003_YYYYMMDD…`; the sim does not write real-format extracts.
* **Format:** Spec §4.1 says csv while Appendix G (1 July 2024) says "double pipe delimited" (an inconsistency inside the document).
* The **weights, tier scope and rates** in `config/dimensions.json` are invented and marked as such in the file.
