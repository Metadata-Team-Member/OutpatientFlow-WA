# Business rules summary (plain English)

**Read this first.**

* Source: *Non-Admitted Patient Activity Data Business Rules*, **version 1.0, July 2021** (approved 2 June 2021), read through a third-party mirror. The official PDF could not be retrieved ([SOURCES.md](SOURCES.md) section 6).
* The mirror was readable only up to **section 8.5 (page 18)**. Sections 9 to 12 and Appendix A are **not read**. Anything below about those sections is absent, not assumed.
* The official Outpatient Services Policy (MP 0191/25, effective 26 Nov 2025) refers to **"Non-Admitted Patient Activity Business Rules 2024"**. That edition was **not obtained**, so rules below may have changed.
* The collection is called NAPDC in the 2021 documents, "Non-Admitted Data Collection" on the policy page, and NADC by the custodian. This repository uses NADC.
* "BR" is the Business Rules, "Spec" is the Data Specifications v1.0 (July 2021). Page numbers are the Business Rules' own page numbers as printed on the mirror. For the Spec, element numbers are given, because the mirror's page numbers are unreliable.
* ✅ = rule is simulated. ◑ = simplified. ✖ = not simulated.

| # | Rule in plain English | Where | In the simulation |
|---|---|---|---|
| 1 | **Attended means an outcome has been allocated.** An appointment counts as attended when an Appointment Outcome Code has been recorded. The Spec has no separate attendance-status element. | BR §5.1 p.3 | ◑ Outcome present = attended. A did-not-attend is modelled as a *non-attendance reason* with a blank outcome. **How a DNA is recorded in real extracts is not confirmed** (open question). |
| 2 | **Every appointment must link to a valid referral**, unless the data custodian approves an exception. | BR (referral rules); Spec element 33/48 | ✅ Every appointment row carries a referral account number. |
| 3 | **Referral category and appointment (clinic) category must match.** | BR (referral rules) | ✅ Appointments take the referral's category. |
| 4 | **One open referral per category per condition.** | BR (referral rules) | ◑ Each synthetic person has a small number of referrals in different categories; the rule is not tested. |
| 5 | **Referrals without triage information are returned** to the referrer. | BR (referral rules) | ✖ Not simulated. |
| 6 | **Clinic registration uses five fixed codes** (clinic category and related set-up). | BR §7 p.8 | ✖ Not simulated. The five codes are not reproduced because the exact wording was not captured. |
| 7 | **Priority timeframes**: priority 1 within 30 days, priority 2 within 90 days, priority 3 within 365 days of the referral being received. | BR §8.1 p.14 | ✅ Queue lanes, target line and the "seen within target" indicator. **Assumption:** Urgent (URG), Semi-urgent (SEM), Not urgent (NUR) are read as priorities 1, 2, 3. AWT (awaiting triage) and UNK are not generated. |
| 8 | **Immediate-attention patients go directly to hospital** (not through the normal referral queue). | BR §8.2 p.15 | ✖ Not simulated. |
| 9 | **Wait time runs from the Referral Received Date to the first attended appointment.** The original received date is kept through changes. | Spec element 43 note; BR §8.3–8.4 | ✅ This is the wait measure. |
| 10 | **Ongoing patient management (OPM)** may only be used after a first attended appointment under the original referral, and OPM referrals are **excluded from new-appointment wait reporting**. It is not used for new referrals from an admission or emergency event, or after a formal discharge followed by a second referral. | BR §8.3 p.15, §8.3.1 p.16 | ◑ About 8% of referrals use reason OPM, start "inside" the network, and are excluded from the wait indicators. They are not linked to an earlier referral. |
| 11 | **Transfer of a referral**: the original received date is maintained; the original is closed with "Transfer and close"; the new referral is OPM and its first appointment is Follow-up if a first attended appointment already happened. Large-scale transfers are managed by Health Support Services and the Department of Health. | BR §8.4 p.16 | ◑ "Transfer and close" appears as a closure code. The second, linked referral is not generated. |
| 12 | **Closing a referral**: rules for the closure reasons, and **auditing of long-waiting open referrals** (the "Audit" closure code). | BR §8.5 p.17 | ◑ Closure codes TRE, DIP, PDT, TFC, DEC, AUD are used. No audit process; AUD is a random closure. |
| 13 | **Cancelling a referral**. | BR §8.5.1 p.18 | ✖ Not simulated. |
| 14 | **Appointment cancellation** records a cancellation code and date. | Spec elements 49, 50 | ✅ Cancelled appointments have outcome CAN, a reason and a date. Reasons are grouped by us as hospital-initiated or patient-initiated; **that grouping is not official**. |
| 15 | **Delivery mode and setting** (client present, group, telephone, video, telehealth at a WA Health site, and so on; on or off hospital campus). | Spec App. B | ◑ Six delivery modes; telephone and telehealth shown as a beam and counted as remote. Setting is not simulated. |
| 16 | **Extract timing and file naming**: record types REF, APP, RES, CAN; change types I and U; daily extract before 2am; monthly extract by 3pm on the third working day. | Spec v1.0 | ✖ The sample CSVs use Spec-style column names only. Timing and change types are not simulated. |
| 17 | **Validation rules** (edit checks) and the Validation Manual. | Validation Manual (not obtained) | ✖ Not simulated. Nothing is asserted about their content. |
| 18 | **Central Referral Service (CRS)**: referrals for listed metro and regional specialties go through the CRS; some referral types go straight to the hospital (antenatal and obstetric, mental health, allied health, immediate under 7 days, hospital-to-hospital, private specialist, and referrals naming a specialist; Wheatbelt and Kimberley in staged rollout). | Official CRS page, reviewed 8 Sep 2026 | ✖ Not modelled. |
| 19 | Sections 9 to 12 and Appendix A of the Business Rules. | BR | ✖ **Not read.** |

## Conventions the simulation uses beyond the rules (all invented)

* Volumes, mix of specialties, wait distributions, telehealth shares, DNA and cancellation rates and the "local site" weighting for regional residents are **invented** to look plausible. They are not WA statistics.
* Clinic categories `CAR, DER, END, ENT, GAS` are used as provisional labels, **unverified** against Appendix C (the mirror did not show that part of the table).
