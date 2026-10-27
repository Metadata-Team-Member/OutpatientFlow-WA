# Data requirements log

> **Status: draft for discussion.** Everything the live demo shows is **SYNTHETIC EXAMPLE DATA**. No real WA Health data, and no real person, is in this repository.

This page is the working list of what we would need from the WA Health **Non-Admitted Data Collection (NADC)**, or an equivalent extract, to run OutpatientFlow WA on real data. It is written so that a data custodian can read it without having seen the demo, and so that the demo can be tuned to the data that actually exists.

**How sure are we of the field names?** The WA Health data dictionary PDFs could not be fetched while this was written, so the element names and code lists below are drawn from the national metadata registry (AIHW METEOR, the Non-admitted patient national minimum data set family) and from public validation-manual excerpts. They show the *shape* of the NADC, not a verified copy of it. **Please confirm every element name and code list against the current WA Non-Admitted Data Collection Data Dictionary before relying on this page.** Items we are least sure of are marked ❓.

Contents

1. [Purpose and unit of analysis](#1-purpose-and-unit-of-analysis)
2. [Fields we need, with dictionary sources](#2-fields-we-need-with-dictionary-sources)
3. [How fields become pictures](#3-how-fields-become-pictures)
4. [Derived measures](#4-derived-measures)
5. [What is probably *not* in the collection](#5-what-is-probably-not-in-the-collection)
6. [Suggested extract format](#6-suggested-extract-format)
7. [Privacy, ethics and governance](#7-privacy-ethics-and-governance)
8. [Open questions](#8-open-questions)

---

## 1. Purpose and unit of analysis

The simulation follows **one referral to an outpatient clinic** from the day it is received until it is closed. Each referral is drawn as one small character. The questions it helps people ask:

- Who is still waiting, for how long, and how does that compare with the urgency category?
- Once someone is "in" the network, how many appointments do they attend, and where?
- Where do appointments end in did-not-attend (DNA), and does that cluster by region, clinic or delivery mode?
- Which clinics and sites are carrying the load?

**Unit of analysis.** A *referral* (to a clinic at a service provider) is the spine. A *person* may have several referrals. An *appointment* (non-admitted service event) hangs off a referral. The demo treats one referral as one character, and calls it a "patient" in the interface because that is the plain-language word.

> ❓ Confirm whether the NADC carries a **referral identifier** that links appointments to the same referral. If it does not, referral episodes would have to be *derived* (for example, same person + same clinic + gap rules), and that is a modelling decision to agree up front.

## 2. Fields we need, with dictionary sources

"Extract column" is the name used in this repository's CSV layout (section 6). "Concept / dictionary source" says where the real element should be found. Priority: **M** = must have, **S** = strongly wanted, **N** = nice to have.

### 2.1 Referral level (one row per referral)

| Extract column | Concept / dictionary source | Why | Pri |
|---|---|---|---|
| `REF_ID` | Referral identifier (NADC referral key ❓; METEOR "Referral" concepts) | Links appointments to one referral | M |
| `PER_PERSON_ID` | Pseudonymised person key (HMDS/NADC linkage key or a project-specific hash) | Several referrals per person; prior attendance | S |
| `REF_RECEIVED_DATE` | Referral received date (METEOR: *Non-admitted patient referral — referral received date* ❓) | Start of the wait | M |
| `REF_PRIORITY_CODE` | Referral priority / urgency category (WA outpatient referral categories ❓) | Lane in the waiting yard; target line | M |
| `REF_SOURCE_CODE` | Referral source (METEOR: *Referral source*; WA NADC code list ❓) | Where the referral came from (GP, other hospital, internal) | S |
| `CLINIC_CATEGORY_CODE` | Clinic / specialty (WA NADC clinic category ❓; METEOR "Non-admitted patient service event — clinic type" ❓) | Which door the character walks to | M |
| `ESTABLISHMENT_ID` | Establishment (hospital) identifier, from the WA establishment list | Which building | M |
| `REF_DISCHARGE_DATE` | Date the referral was closed or the patient was discharged from the clinic ❓ | End of the journey | M |
| `REF_CLOSURE_REASON_CODE` | Reason the referral was closed (discharged, removed, no longer required…) ❓ | Distinguishes "seen and discharged" from "removed" | S |
| `PER_ADDRESS_POSTCODE` | Patient postcode (or SA2) at referral | Region of residence; map | M |
| `PER_REGION_CODE` | WA Health region / Health Service Area derived from postcode | The eight map regions in the demo (derived, see 4) | S |
| `PER_AGE_YEARS` | Age at referral (derive from date of birth, then discard the date) | Age group; sprite choice | S |
| `PER_INDIGENOUS_STATUS_CODE` | Indigenous status (METEOR: *Indigenous status*, 1–4, 9) | Equity monitoring only, with governance (see 7) | N, see 7 |
| `PRIOR_ATTENDED_24M` | Count of attended non-admitted events in the 24 months before the referral | Starting size of the character | N |

### 2.2 Appointment level (one row per non-admitted service event)

| Extract column | Concept / dictionary source | Why | Pri |
|---|---|---|---|
| `APP_ID` | Service event identifier ❓ | De-duplication | M |
| `REF_ID` | Referral link ❓ (see section 1) | Join to referral | M |
| `APP_DATE` | Service event date (METEOR: *Non-admitted patient service event — service event date*) | Time axis; "inside / outside" | M |
| `APP_ATTENDANCE_CODE` | Attendance status (attended / did not attend / did not wait ❓) | DNA flashes; growth only on attended | M |
| `APP_NON_ATTENDANCE_REASON_CODE` | Reason for non-attendance ❓ | Colour of the DNA marker | N |
| `APP_DELIVERY_TYPE_CODE` | Service delivery mode (METEOR: *Non-admitted patient service event — service delivery mode*; client present, telephone, video…) | In-person vs telehealth marker | S |
| `APP_NEW_FOLLOWUP_CODE` | New or review/follow-up appointment ❓ | First attended appointment moves a patient "inside" | S |
| `APP_OUTCOME_CODE` | Outcome of the appointment (further review, discharge, refer to other specialty, admit…) ❓ | Door exits; arrows to other clinics | S |
| `CLINIC_CATEGORY_CODE` | As above, at the event level (clinic may differ from the referral's) | Which door fires | M |
| `ESTABLISHMENT_ID` | As above, at the event level | Which building | M |

### 2.3 Reference data

- WA establishment list (identifier, name, type, region). The demo uses six invented sites: **Metro Tertiary Hospital A**, **Metro Tertiary Hospital B**, **Metro Secondary Hospital C**, **Women & Children's Hospital D**, **Regional Hospital E (South)** and **Regional Hospital F (North)**. Replace these in `config/dimensions.json`.
- Clinic category list and which sites run which clinics (drives the doors on each building).
- Postcode → region lookup (we have used eight illustrative regions; replace with the WA Health regions you actually report against).
- Priority category definitions and **the target number of days** for each. The demo uses **30 / 90 / 365 days as indicative placeholders only**. ❓ Confirm the correct targets and whether they differ by specialty.

## 3. How fields become pictures

| What you see | Field(s) | Rule |
|---|---|---|
| A character | `REF_ID` | One per referral. Large crowds are *sampled* (1 in N, chosen by hash so it is stable) for the picture only. All KPIs and charts use every referral that passes the filters. |
| Character **width** and "grow" | `APP_ATTENDANCE_CODE` = attended, plus `PRIOR_ATTENDED_24M` | `g = 1 − exp(−attended / 6)`. New or never-attended people are slim. People with many attended appointments are broad. |
| **Slim = waiting, larger = in the network** | first attended event or an internal referral source | Status flips to "inside" at the first attended appointment (or on an internal referral). |
| Position in the **waiting yard** | `REF_RECEIVED_DATE`, `REF_PRIORITY_CODE` | Horizontal position = days waited ÷ the target for the urgency lane. A red dashed line marks the target. |
| Colour | `REF_PRIORITY_CODE` (default); or stage, clinic, region | Switch with *Colour characters by*. |
| **Doors** on a building | `CLINIC_CATEGORY_CODE` per `ESTABLISHMENT_ID` | One door per clinic per site. Doors glow when a service event happens. |
| Door flash and pop-up | `APP_ATTENDANCE_CODE`, `APP_DELIVERY_TYPE_CODE` | Green = attended; blue = telehealth; amber = DNA; grey = did not wait. |
| Map position | `PER_REGION_CODE` / postcode | Where a referral starts on the left. |
| Leaving the courtyard | `REF_DISCHARGE_DATE`, `REF_CLOSURE_REASON_CODE` | "Discharged" gate at the edge of the courtyard. |
| Time slider and clock | all dates | The scene is rebuilt from events, so you can jump anywhere. |

## 4. Derived measures

| Measure | Definition used in the demo | Notes |
|---|---|---|
| Waiting for care | Referrals received, not yet closed, with no attended event (internal referrals excepted) at the clock date | ❓ Agree whether "waiting" should count until the *first attended* event, the first *booked* event, or the first event of any kind. The NADC records events that happened, not bookings. |
| Wait so far (days) | Clock date − referral received date | Median shown on the KPI strip |
| Past target | Waiting longer than the urgency target | Indicative targets only |
| First-appointment wait (days) | Date of first attended event − received date | The standard "time to first attended appointment" |
| Did-not-attend rate | DNA events ÷ (attended + DNA events) in the last 12 months | Excludes "did not wait" unless you choose to include it |
| Attended events per patient | Mean attended events per referral, split *inside the network* v *waiting outside* | The "outside" group is mostly prior attendance |
| Region of residence | Postcode → region lookup | Needs a maintained lookup |
| Age group | Age in years at referral, banded | Avoid exact ages in small cells |
| Referrals received / attended events (12 months) | Counts in the last 365 days to the clock date | Compared with the first year of data |

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

Two flat CSV files, UTF-8, comma-separated, one header row, ISO dates (`YYYY-MM-DD`), blank for missing. Column names are ours; `tools/build_data.mjs` reads them. See `data/sample/` for 25 synthetic rows in exactly this shape.

**`referrals.csv`** (one row per referral)

```
REF_ID,PER_PERSON_ID,REF_SOURCE_CODE,REF_PRIORITY_CODE,REF_RECEIVED_DATE,REF_DISCHARGE_DATE,REF_CLOSURE_REASON_CODE,CLINIC_CATEGORY_CODE,ESTABLISHMENT_ID,PER_ADDRESS_POSTCODE,PER_REGION_CODE,PER_AGE_YEARS,PER_INDIGENOUS_STATUS_CODE,PRIOR_ATTENDED_24M
```

**`appointments.csv`** (one row per service event)

```
APP_ID,REF_ID,APP_DATE,APP_ATTENDANCE_CODE,APP_OUTCOME_CODE,APP_NON_ATTENDANCE_REASON_CODE,APP_DELIVERY_TYPE_CODE,APP_NEW_FOLLOWUP_CODE,CLINIC_CATEGORY_CODE,ESTABLISHMENT_ID
```

Recommended handling:

- **Pseudonymise before it leaves the custodian.** `PER_PERSON_ID` and `REF_ID` should be project-specific keys, not UR numbers or medical record numbers.
- **No names, addresses, dates of birth, Medicare numbers or free text.** Age in whole years is enough. Consider banding age to five-year groups.
- **Scope**: all referrals *received or active* between about 1 July 2022 and 30 June 2026, plus every service event on those referrals, so that the first year of the playback has a realistic queue already in place. The demo lets the clock start in 2023 for that reason.
- **Volume**: 5,000–20,000 referrals runs smoothly on a phone. More is fine for charts and KPIs; the picture samples the crowd. For a first look, a **single health service, a few clinics** is a sensible pilot.
- **Code lists** travel with the extract (or are agreed in advance) and are placed in `config/dimensions.json`.

## 7. Privacy, ethics and governance

- **No real data in this repository, ever.** `.gitignore` already excludes `data/real*.json`. If you host a real build anywhere, host it privately and behind access control, not on public GitHub Pages.
- **Approvals first.** Using a WA Health collection for a new purpose normally needs a data request to the data custodian and, depending on the use, a Human Research Ethics Committee decision or a documented quality-improvement exemption. ❓ Confirm the correct pathway with the Data Linkage / Purchasing and System Performance teams (or their current equivalents).
- **Aboriginal data.** Indigenous status is sensitive. Using it requires attention to Aboriginal data governance and, for research, review by the **WA Aboriginal Health Ethics Committee**. The synthetic data deliberately does **not** let Aboriginal status drive any outcome, and the click-card does not show it. If it is ever used, it should be for equity monitoring *alongside* Aboriginal partners, never to label individuals.
- **Small numbers.** A crowd of dots makes small groups visible. Suppress or merge small cells in any view that could identify a person (for example, a rare clinic at a remote site).
- **Characters are not people.** The faces and growth are metaphors. They must not be used to make decisions about an individual, and the click-card on real data should be switched off for anyone who is not authorised to see record-level data.
- **Humane language.** "Waiting" is not "failing". The tool should not imply blame on patients (DNA) or on staff.
- **Retention.** Delete extracts when the project ends, as agreed in the data-sharing agreement.

## 8. Open questions

1. Does the NADC carry a stable **referral identifier** linking all events to one referral? If not, how should referral episodes be derived?
2. What are the **current priority categories and target days**, and do they differ by specialty or by health service?
3. Is a **booked-but-not-yet-attended** appointment visible anywhere (so we can show "waiting for first appointment" more accurately than "no attended event yet")?
4. How are **telehealth** events coded now compared with 2022 (code list changes over time)?
5. How are **internal referrals** (clinic-to-clinic, ED, ward discharge) identified, and should they start "inside" the network?
6. Which **regions** should the map use (WA Health service areas, country health regions, or postcode groups)?
7. What is the **minimum cell size** rule for any public-facing view?
8. Who owns **approval and hosting** if this becomes more than a demo?
9. Should the picture include **non-attended** events and DNA reasons, and who decides how those are described?
10. Does the data custodian prefer to **run the extract script** themselves, or supply an agreed flat file?
