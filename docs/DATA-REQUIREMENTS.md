# Data requirements log

> **Status: draft for discussion.** Everything the live demo shows is **SYNTHETIC EXAMPLE DATA**. No real WA Health data, and no real person, is in this repository.

This page is the working list of what we would need from the WA Health **Non-Admitted Data Collection (NADC)** to run OutpatientFlow WA on real data. It is written so that a data custodian can read it without having seen the demo.

**How sure are we of the field names?** Since 28 Oct 2026 the names, requirement status and code sets come from the official *Non-Admitted Data Collection Data Specifications* **July 2026** (Appendix B pp.8-34), the *Business Rules* July 2026 and the *Data Dictionary* 2026, all supplied by the user ([SOURCES.md](SOURCES.md)). The 2021 mirror-based names are historical ([CHANGES-2026-vs-2021.md](CHANGES-2026-vs-2021.md)). Field-level mapping with pages: [DATA-DICTIONARY-MAPPING.md](DATA-DICTIONARY-MAPPING.md).

## 1. Purpose and unit of analysis

The simulation follows **one referral** to an outpatient service from the day it is received until it is closed. Each referral is drawn as one small marker, called a "patient" in the interface. A referral has a unique **Referral Account Number** (Specification element 33, Mandatory), and appointments carry the same number, so appointments link to their referral. *This resolves the round 1 question about a referral identifier.* The Business Rules require all activity to link to a valid referral unless the data custodian approves an exception.

The questions it helps people ask:

* Which people are waiting for a first attended appointment, for how long, against the priority timeframe?
* Once a person has a first attended appointment, how many appointments are attended, where, and by which delivery mode?
* Where are appointments not attended (DNA) or cancelled?
* Which establishments, regions and Health Service Providers have the most attended appointments?

## 2. Fields needed (2026 field names)

Priority: **M** = needed for the picture; **S** = useful; **N** = not needed. "Req." is the Specification's own status (Mandatory / Conditional / Optional). Pages are printed pages of Spec Appendix B.

### 2.1 Referral level

| Field (Spec page) | Req. | Used for | Priority |
|---|---|---|---|
| `establishment_code` (p.8) | M | Which building. N(4), assigned by the Department of Health. Only the 125 sites with Reports to NADC = Y | M |
| `referral_account_number` (p.13) | M | Identity; links appointments | M |
| `referral_category_code` (p.14; App D) | M | Door on the building (clinic category) | M |
| `referral_received_date` (p.14) | M | Start of the wait ("commencement of the referral wait time until a first appointment is attended") | M |
| `referral_priority_code` (p.14: AWT, NUR, SEM, UNK, URG) | M | Waiting lane and target line (30 / 90 / 365 days, BR §8.1) | M |
| `referral_reason_code` (p.14) | M | OPM = Technical transfer is excluded from first-attended wait reporting (BR §8.3.7, DD p.155) | M |
| `referral_source_code` (pp.14-15) | M | Click-card; internal v external | S |
| `referral_status_code` (p.14), `referral_closed_date` (p.15), `referral_reason_closure_code` (p.16) | M / C / C | End of the journey (closure includes the new ESC) | M |
| `referral_created_date` (p.16) | M | Carried; equals received date in the sim | S |
| `postcode` (p.11) | M | Region of residence, derived | M |
| `date_of_birth` (p.8) | M | Age group, derived then discarded | S |
| `client_identifier` (p.8) | M | Person key for prior attendance; must be pseudonymised | N |

### 2.2 Appointment level

| Field (Spec page) | Req. | Used for | Priority |
|---|---|---|---|
| `appointment_account_number` (p.16) | M | De-duplication; link to referral | M |
| `appointment_date` (p.17) | M | Time axis | M |
| `appointment_attendance_code` (p.17: ATT, DNA, DNW, MCC, NCE, NSP, UNK) | M | Attended / did not attend / did not wait / non-client event. "Derived from the Appointment Outcome Code in webPAS" (DD pp.5-6) | M |
| `appointment_outcome_code` (pp.24-25) | M | Exit arrows; derives attendance (BR §5.2) | M |
| `appointment_type_code` (p.18: NEW, FOL, NCE, OTH, UNK) | M | First appointment v follow-up v chart only | M |
| `appointment_session_type_code` (p.19: IND, GRP, MCC, NCE) | M | Individual v group v case conference | S |
| `appointment_client_type_code` (p.20) | M | Only OP counts as outpatient (DD pp.10-11) | S |
| `appointment_delivery_mode_code` (p.21) | M | In person v telehealth v phone (BR §9.4, §9.5; DD pp.14-15) | M |
| `appointment_nonattend_reas_code` (p.24) | C | Reason for a DNA or DNW | S |
| `appointment_cancellation_code` (pp.19-20), `appointment_cancellation_date` (p.20) | C | Cancelled events | S |
| `appointment_status_code` (p.17: PR, PP, UN, FU, RS, CA) | M | CA = cancelled; FU would show future bookings if present in extracts | S |
| `clinic_category_code` (p.27; App D) | M | Which door fires; must match the referral category | M |
| `clinic_nmds_tier1_code` (p.28; App E), `clinic_tier2_code` (p.28; App F) | M | Clinic type shown on the door and clinic card | S |
| `appointment_contracting_estab_number` (p.19, new 2026) | C | Would show contracted-provider activity | N |

### 2.3 Reference data

* **Establishments:** [ESTABLISHMENTS.md](ESTABLISHMENTS.md): 125 with Reports to NADC = Y (Establishment List, May 2026 v0.1). Code, name and type are official; HSP, region and coordinates are **not** in the List (SLIP / CRS page).
* **Regions:** 34 districts → 10 regions → 5 HSP groupings (SLIP HEALTH-002; display only). A postcode-to-district concordance is needed (OPEN-QUESTIONS).
* **Priority timeframes:** BR §8.1 and DD p.154: URG 30 days, SEM 90, NUR 365.
* **Clinic categories and tiers:** Spec Appendices D, E, F. The category-to-Tier pairing in the sim is our assumption.

## 3. How fields become pictures

| What you see | Field(s) | Rule |
|---|---|---|
| A marker | Referral Account Number | One per referral. Large numbers of markers are sampled for the picture only. KPIs and charts use every referral that passes the filters. |
| Marker **rings** (service use) | attended appointments (outcome allocated) plus prior attended | `g = 1 − exp(−attended / 6)` sets the ring size. No ring at 0 events; up to three wider rings as the count rises. The marker shape never changes size. Lower and higher service use are counts only. |
| Waiting v in care | Referral Received Date, first attended appointment; OPM reason | Moves to outpatient services at the first attended appointment, or at once for OPM. |
| Waiting lane and target line | Priority code | The red dashed line is 30 / 90 / 365 days. |
| Doors on a building | Clinic Category Code per Establishment Code | One door per clinic per site. Unverified codes are drawn fainter. |
| Door flash | Outcome, non-attendance reason, delivery mode | Green attended; blue telehealth or phone; amber did not attend; grey cancelled. |
| Map position | district of residence | Region on the map; sites at their coordinates. |
| Time slider | all dates | The scene is rebuilt from events, so you can jump anywhere. |

## 4. Derived measures

| Measure | Definition used in the demo | Notes |
|---|---|---|
| Waiting, first appointment | Received, not closed, no attended appointment yet, excluding OPM. DNA, cancelled and chart-only / MCC events do not end the wait (BR §10.2.4 to §10.2.7) | The NADC records what happened; Status FU exists for future appointments, whether extracts carry them is an open question |
| Seen within target (12 months) | Share of first attended appointments in the last 12 months within 30 / 90 / 365 days of the received date | BR §8.1; OPM excluded per §8.3.1 |
| Median wait, first appointment | Median days from received date to first attended appointment | |
| Did not attend (DNA) rate | DNA and DNW events ÷ (attended + DNA + DNW) | Excludes cancelled and non-client events |
| Telehealth share | Delivery modes TEL, THH, THC, THS (and VID up to 30 Jun 2023) | Our grouping (BR §9.5 lists THH, THS, THC, TEL as the virtual modes) |
| Referrals, last 12 months | Count of received dates in the last 365 days | |

## 5. What is probably *not* in the collection

Treat each as "not available until someone confirms it is". The demo cannot show these from NADC alone, and it should not pretend to.

- **People who were never referred, or who were referred outside the public system** (private specialists, GP-only care).
- **The booking and scheduling record**: dates offered, cancelled by the hospital, rescheduled, or "booked in the future". The NADC is an activity collection, so it sees appointments that took place or were recorded as DNA, not the planned appointment book.
- **Position on a waiting list** and whether a person was *offered* an earlier appointment and declined.
- **Reason for referral / diagnosis / clinical urgency detail** beyond the priority category. Clinical content is deliberately out of scope for this tool.
- **What happens next in another system**: admitted care (HMDS), emergency (EDDC), private hospital stays, primary care (MBS/PBS) unless separately linked.
- **Referrals closed by "validation" processes** if they are not recorded in the collection.
- **Patient-reported outcomes and experience.**
- **Telephone and video activity** that sits in other systems or is not reported as a service event.
- **Exact travel distance and cost to the patient** (only postcode-level geography is proposed).
- **Non-WA-resident detail** beyond a state or "other" flag.

## 6. Suggested extract format

Two flat CSV files, UTF-8, one header row, **column names and date format as in the Specification** (snake_case, ISO `YYYY-MM-DD`), blank for missing. See `data/sample/` for 25 synthetic rows each, and [DATA-DICTIONARY-MAPPING.md](DATA-DICTIONARY-MAPPING.md) for the columns.

Recommended handling:

* **Pseudonymise before it leaves the custodian.** Person and referral keys should be project-specific, not UR numbers.
* **No names, addresses, dates of birth, Medicare numbers or free text.** Age in whole years, or banded.
* **Scope:** all referrals received or active between about 1 July 2022 and 30 June 2026, plus every appointment on those referrals, so the playback starts with a realistic queue. The simulation clock starts in July 2023.
* **Volume:** 5,000 to 20,000 referrals runs smoothly on a phone. A pilot with one HSP and a few clinics is sensible.

## 7. Privacy, ethics and governance

- **No real data in this repository, ever.** `.gitignore` already excludes `data/real*.json`. If you host a real build anywhere, host it privately and behind access control, not on public GitHub Pages.
- **Approvals first.** Using a WA Health collection for a new purpose normally needs a data request to the data custodian and, depending on the use, a Human Research Ethics Committee decision or a documented quality-improvement exemption. Confirm the correct pathway with the Data Linkage / Purchasing and System Performance teams (or their current equivalents).
- **Aboriginal data.** Aboriginal status (`aboriginal_status_code`) is sensitive. Using it requires attention to Aboriginal data governance and, for research, review by the **WA Aboriginal Health Ethics Committee**. The synthetic data deliberately does **not** let Aboriginal status drive any outcome, and the click-card does not show it. If it is ever used, it should be for equity monitoring *alongside* Aboriginal partners, never to label individuals.
- **Small numbers.** A display of many markers makes small groups visible. Suppress or merge small cells in any view that could identify a person (for example, a rare clinic at a remote site).
- **Markers are not people.** The faces and rings are visual devices (rings count attended events; they are not a measure of need). They must not be used to make decisions about an individual, and the click-card on real data should be switched off for anyone who is not authorised to see record-level data.
- **Person-centred language.** Waiting is not a failing. The tool should not imply blame on patients (DNA) or on staff. See the [language guide](LANGUAGE-GUIDE.md).
- **Retention.** Delete extracts when the project ends, as agreed in the data-sharing agreement.

## 8. Open questions

The list is in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md). The 2026 documents closed the earlier questions about the attendance code, priority mapping, category codes, and which establishments report (the Establishment List's Reports to NADC column). What remains open is mainly: the eight inferred NADC flags, why private hospitals and a few community sites report, how a DNA row carries an outcome, whether future bookings are in extracts, and the Tier 1 / Tier 2 pairing.
