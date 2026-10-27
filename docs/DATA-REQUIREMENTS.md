# Data requirements log

> **Status: draft for discussion.** Everything the live demo shows is **SYNTHETIC EXAMPLE DATA**. No real WA Health data, and no real person, is in this repository.

This page is the working list of what we would need from the WA Health **Non-Admitted Data Collection (NADC)** to run OutpatientFlow WA on real data. It is written so that a data custodian can read it without having seen the demo.

**How sure are we of the field names?** Round 2 replaced the earlier METEOR-based guesses with the element names in the *Non-Admitted Patient Data Collection Data Specifications* **v1.0 (July 2021)** and the *Business Rules* v1.0 (read to section 8.5), both read through third-party mirrors. The **Data Dictionary** and **Validation Manual** were **not** obtained, and newer editions exist (a "Business Rules 2024" is cited by MP 0191/25). See [SOURCES.md](SOURCES.md) and [DATA-DICTIONARY-MAPPING.md](DATA-DICTIONARY-MAPPING.md) for element numbers. Items that remain unconfirmed are marked ❓ and collected in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).

## 1. Purpose and unit of analysis

The simulation follows **one referral** to an outpatient service from the day it is received until it is closed. Each referral is drawn as one small character, called a "patient" in the interface. A referral has a unique **Referral Account Number** (Specification element 33, Mandatory), and appointments carry the same number, so appointments link to their referral. *This resolves the round 1 question about a referral identifier.* The Business Rules require all activity to link to a valid referral unless the data custodian approves an exception.

The questions it helps people ask:

* Who is waiting for a first attended appointment, for how long, against the priority timeframe?
* Once in the network, how many appointments are attended, where, and by which delivery mode?
* Where do appointments end as did-not-attend or cancelled?
* Which establishments, regions and Health Service Providers carry the load?

## 2. Fields needed (real element names)

### 2.1 Referral level

| Element (number) | Used for | Priority |
|---|---|---|
| Establishment Code (1) | Which building. Four digits assigned by the Department of Health | M |
| Referral Account Number (33) | Identity; links appointments | M |
| Referral Category Code (35) | Door on the building (clinic category) | M |
| Referral Received Date (43) | Start of the wait ("commencement of the referral wait time until a first appointment is attended") | M |
| Referral Priority Code (40: AWT, NUR, SEM, UNK, URG) | Waiting lane and target line | M |
| Referral Reason Code (41) | OPM is excluded from new-appointment wait reporting (BR §8.3.1) | M |
| Referral Source Code (44) | Click-card; internal v external | S |
| Referral Status Code (45) and Closed Date (37), Reason for Closure Code (42) | End of the journey | M |
| Australian Postcode (residential address) | Region of residence, derived | M |
| Date of Birth (8) | Age group, derived then discarded | S |
| Patient identifier group (elements 2 to 5) | Person key for prior attendance; must be pseudonymised | N |

### 2.2 Appointment level

| Element (number) | Used for | Priority |
|---|---|---|
| Appointment Account Number (48) | De-duplication; link to referral | M |
| Appointment Date (53) | Time axis | M |
| Appointment Type Code (81: NEW, FOL, NCE, OTH, UNK) | First appointment v follow-up | M |
| Appointment Outcome Code (69) | **Allocated outcome = attended** (BR §5.1). Exit arrows | M |
| Appointment Attendance Code (later editions; extract only) | ATT / DNA / DNW marker. Not in the 2021 Specification | S |
| Appointment Non-Attendance Reason Code (68) | Reason for a DNA or DNW (mandatory when not attended) | S |
| Appointment Cancellation Code (49) and Date (50) | Cancelled events | S |
| Appointment Delivery Mode Code | In person v telehealth | S |
| Appointment Session Type Code (77) | Individual v group | N |
| Clinic Category Code (83) | Which door fires; must match referral category | M |
| Appointment Status Code (78) | Not used. ❓ meaning | N |

### 2.3 Reference data

* **Establishments:** [ESTABLISHMENTS.md](ESTABLISHMENTS.md) (117: 112 flagged in HEALTH-001 plus 5 shown with NADC = Y in a verbatim extract of the official list; only rows A to C of the official list could be read, so the full current list is still needed).
* **Regions:** 34 districts → 10 regions → 5 HSPs (SLIP HEALTH-002). A postcode to district concordance is needed. ❓
* **Priority timeframes:** BR §8.1 priority 1 within 30 days, priority 2 within 90, priority 3 within 365. The URG / SEM / NUR to 1 / 2 / 3 mapping is an assumption. ❓
* **Clinic categories:** Appendix C. Rows A to F were not visible; five sim codes are provisional.

## 3. How fields become pictures

| What you see | Field(s) | Rule |
|---|---|---|
| A character | Referral Account Number | One per referral. Large crowds are sampled for the picture only. KPIs and charts use every referral that passes the filters. |
| Character **size** | attended appointments (outcome allocated) plus prior attended | `g = 1 − exp(−attended / 6)`. Slim while waiting or with little care; larger with more attended events. |
| Waiting v in the network | Referral Received Date, first attended appointment; OPM reason | Becomes "inside" at the first attended appointment, or at once for OPM. |
| Waiting lane and target line | Priority code | The red dashed line is 30 / 90 / 365 days. |
| Doors on a building | Clinic Category Code per Establishment Code | One door per clinic per site. Unverified codes are drawn fainter. |
| Door flash | Outcome, non-attendance reason, delivery mode | Green attended; blue telehealth or phone; amber did not attend; grey cancelled. |
| Map position | district of residence | Region on the map; sites at their coordinates. |
| Time slider | all dates | The scene is rebuilt from events, so you can jump anywhere. |

## 4. Derived measures

| Measure | Definition used in the demo | Notes |
|---|---|---|
| Waiting, first appointment | Received, not closed, no attended appointment yet, excluding OPM | ❓ The NADC records what happened, not necessarily future bookings (Status code FU exists for future appointments) |
| Seen within target (12 months) | Share of first attended appointments in the last 12 months within 30 / 90 / 365 days of the received date | BR §8.1; OPM excluded per §8.3.1 |
| Median wait, first appointment | Median days from received date to first attended appointment | |
| Did-not-attend rate | Events with a non-attendance reason ÷ (attended + did not attend) | Excludes cancelled |
| Telehealth share | Delivery modes TEL, VID, THH, THC, THS | Our grouping |
| Referrals, last 12 months | Count of received dates in the last 365 days | |

## 5. What is probably *not* in the collection

Treat each as "not available until someone confirms it is". The demo cannot show these from NADC alone, and it should not pretend to.

- **People who were never referred, or who were referred outside the public system** (private specialists, GP-only care).
- **The booking and scheduling record**: dates offered, cancelled by the hospital, rescheduled, or "booked in the future". The NADC is an activity collection, so it sees appointments that took place or were recorded as DNA, not the planned appointment book. ❓
- **Waiting list position** and whether a person was *offered* an earlier appointment and declined.
- **Reason for referral / diagnosis / clinical urgency detail** beyond the priority category. Clinical content is deliberately out of scope for this tool.
- **What happens next in another system**: admitted care (HMDS), emergency (EDDC), private hospital stays, primary care (MBS/PBS) unless separately linked.
- **Referrals closed by "validation" processes** if they are not recorded in the collection. ❓
- **Patient-reported outcomes and experience.**
- **Telephone and video activity** that sits in other systems or is not reported as a service event. ❓
- **Exact travel distance and cost to the patient** (only postcode-level geography is proposed).
- **Non-WA-resident detail** beyond a state or "other" flag.

## 6. Suggested extract format

Two flat CSV files, UTF-8, one header row, **column names and date format as in the Specification** (DDMMYYYY), blank for missing. See `data/sample/` for 25 synthetic rows each, and [DATA-DICTIONARY-MAPPING.md](DATA-DICTIONARY-MAPPING.md) for the columns.

Recommended handling:

* **Pseudonymise before it leaves the custodian.** Person and referral keys should be project-specific, not UR numbers.
* **No names, addresses, dates of birth, Medicare numbers or free text.** Age in whole years, or banded.
* **Scope:** all referrals received or active between about 1 July 2022 and 30 June 2026, plus every appointment on those referrals, so the playback starts with a realistic queue. The clock starts in July 2023.
* **Volume:** 5,000 to 20,000 referrals runs smoothly on a phone. A pilot with one HSP and a few clinics is sensible.

## 7. Privacy, ethics and governance

- **No real data in this repository, ever.** `.gitignore` already excludes `data/real*.json`. If you host a real build anywhere, host it privately and behind access control, not on public GitHub Pages.
- **Approvals first.** Using a WA Health collection for a new purpose normally needs a data request to the data custodian and, depending on the use, a Human Research Ethics Committee decision or a documented quality-improvement exemption. ❓ Confirm the correct pathway with the Data Linkage / Purchasing and System Performance teams (or their current equivalents).
- **Aboriginal data.** Indigenous status is sensitive. Using it requires attention to Aboriginal data governance and, for research, review by the **WA Aboriginal Health Ethics Committee**. The synthetic data deliberately does **not** let Aboriginal status drive any outcome, and the click-card does not show it. If it is ever used, it should be for equity monitoring *alongside* Aboriginal partners, never to label individuals.
- **Small numbers.** A crowd of dots makes small groups visible. Suppress or merge small cells in any view that could identify a person (for example, a rare clinic at a remote site).
- **Characters are not people.** The faces and growth are metaphors. They must not be used to make decisions about an individual, and the click-card on real data should be switched off for anyone who is not authorised to see record-level data.
- **Humane language.** "Waiting" is not "failing". The tool should not imply blame on patients (DNA) or on staff.
- **Retention.** Delete extracts when the project ends, as agreed in the data-sharing agreement.

## 8. Open questions

The list is in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md). Resolved by the Specification since round 1: a referral identifier exists (element 33); the wait starts at Referral Received Date (element 43); priority timeframes are 30 / 90 / 365 days (BR §8.1); there is no attendance-status element (attended = outcome allocated).
