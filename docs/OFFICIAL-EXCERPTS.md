# Excerpts from official WA Health PDFs (reached through the search index)

> **HISTORICAL (28 Oct 2026).** This file holds search-index extracts gathered in round 2, before the official July 2026 documents were supplied by the user. It is **not** authoritative and nothing in the simulation depends on it. Where it disagrees with the 2026 Specification, Business Rules, Data Dictionary or Establishment List, those win (see [SOURCES.md](SOURCES.md) section 1 and [CHANGES-2026-vs-2021.md](CHANGES-2026-vs-2021.md)). Claims here that the 2021 Specification had no attendance element, that Appendix C rows were unreadable, or that only rows A to C of the Establishment List were readable are **superseded**. Its one still-useful item: the Validation Manual, which has not been supplied.


*Last updated 27 Oct 2026, about 21:55 AWST.*

**Why this file exists.** The official PDFs cannot be downloaded from this project's environment (HTTP 500 from the fetch tool, TLS reset from the box; see [SOURCES.md](SOURCES.md) section 6). A web search tool does index parts of some of them and returns short extracts. This file records what those extracts showed, so the custodian can see exactly what the demo relies on.

**How much to trust it.**

* **Quoted** text (in quotation marks) was returned by the search tool as an extract of the PDF itself. Treat it as a faithful but partial copy.
* **Paraphrased** items were machine-written summaries of an extract. The same query sometimes gave different rule numbers on a second run (for example the "referral closed with no reason" rule was reported as both OUT0013 and OUT0014). **Rule numbers from paraphrases are therefore not used anywhere in the demo.** Only the topic is used.
* Nothing here has been checked against a full copy of the document. No page numbers are available for these extracts, so none are given.
* The version or date of each PDF is **unknown** unless stated.

## 1. Non-Admitted Data Collection Validation Manual

URL: `https://www.health.wa.gov.au/-/media/Corp/Documents/Health-for/PAD/Non-Admitted-Data-Collection-Validation-Manual.pdf` (version and date unknown).

### Quoted

* "The Non-Admitted Data Collection (NADC) is a statewide patient-level collection of referral and activity records from all public hospital outpatient departments, and public patients from private service providers."
* "under the Health Services Act 2016, the WA health system mandates all Health Service Providers (HSPs) to submit complete, accurate and timely non admitted patient activity data to the NADC, in accordance with Patient Activity Data Policy."
* Uses listed for the data: Key Performance Indicators, Activity Based Funding, clinical indicators for the Office of Safety and Quality in Healthcare, health service monitoring, evaluation and planning, reporting to the Federal Government, research, Parliamentary requests.
* Validation process (section 2.1): "Raw outpatient data is received by the WA Department of Health from Health Support Services (HSS) nightly." It is "transformed to mapped values (e.g. Male mapped to 1) and is loaded into the NADC", passes through a "Data Quality Engine", and "Any data in validation (or error) is loaded into the NADC Data Quality Dashboard." "All data is available within the NADC, regardless of validation status." "Validations are performed on both appointment and referral data."
* Section 2.2: activity in error "must be investigated, updated in source system and resubmitted" and "actioned within nominated timeframes according to the indicated validation severity". "All validations have been determined to require correcting, with none being able to be 'confirmed correct,' (unless allocated a severity of review)."
* Section 2.3: data updated in webPAS "is received and loaded overnight automatically"; rectified errors still showing "should be escalated to the DQT after two business days".
* Contents list: severities are **1 Fatal, 2 Critical, 3 Warning, 4 Review**. Categories are System Manager Priorities, Activity, Data Specifications and Patient. Activity validations are numbered OUT0004 to OUT0036 and patient-demographic ones OUT0001, OUT0002 and OUT0037. Data-specification validations use GEN numbers (GEN0003, GEN0005 and so on).
* Rule text seen verbatim:
  * "Age at appointment or referral is over 120 years. This is not expected." Severity **Warning**. Elements: Date of Birth, Appointment Date, Referral Received Date, Referral Status Code, Appointment Status Code.
  * "Referral is awaiting triage and was received 5 or more days ago." Description: "As per the Specialist Outpatient Services Access Policy all referrals must be triaged under 5 working days." Severity **Critical**. Elements: Referral Received Date, Referral Priority Code, Referral Status Code. The fix is to set a Referral Priority (so "Awaiting Triage" is a priority value).
  * "An Appointment date is 18 or more months in the future. This is unexpected." Validation ID **OUT0027**. Severity **Review**. It suggests "booking timeframes remain within 6-8 months".
  * "Referral Created date is in the future. This is invalid." (Validation ID OUT0027 appears just before it in the extract, so the ID may belong to the previous rule.)
  * A duplicate-appointment rule lists "Same time, Same establishment, Same clinic ID" with Appointment Status "Future appointment" and Appointment Delivery Mode values "Client Present", "Group Client Present", "Telehealth", "Telephone", "Home Visit", "Multidisciplinary Case Conference".

### Paraphrased (lower confidence)

* Severity meanings: **Fatal** fails the data specification (length, format, reporting requirement or permitted values); **Critical** conflicts with policy or needs review before national submission; **Warning** is unusual but possibly correct; **Review** is potentially incorrect and needs investigation.
* An appointment with Appointment Attendance Code **ATT** must have a valid Appointment Outcome Code (Fatal).
* An appointment reported as **Did Not Attend** with a blank Non-Attendance Reason is invalid (Critical).
* A non-attended appointment must not have an outcome of "Did not attend" (Critical). So "Did not attend" may also exist as an outcome value.
* Arrival and seen times: seen time required when arrival time is reported, except for DNA and DNW; arrival must not be after seen time.
* A referral reported as closed with no Reason for Closure (Warning).
* A cancellation date with no cancellation code (Warning).
* A rescheduled appointment with no reschedule reason (Critical).
* DVA-funded appointments need a DVA card colour and file number (Critical). Publicly funded appointments need a Medicare card number (Critical).
* An attended appointment linked to the wrong referral, where Clinic Category and Referral Category differ (Critical).
* An attended appointment with Claim Type unknown (Critical).

### What this changes in the demo

* The triage rule cites the Specialist Outpatient Services Access Policy (OD 0530/14), which MP 0191/25 supersedes from 26 Nov 2025. So this edition of the Manual **predates** that change, or has not yet been updated. The edition is unknown.
* The Manual's elements **Appointment Attendance Code** and **Appointment Attended Flag** are **not in the July 2021 Specification**. A later Specification must have added them (see section 3).

## 2. Data collections page (official HTML, read directly)

`https://www.health.wa.gov.au/Articles/A_E/data-linkage/How-to-apply-for-data/data-collections`

* Non-Admitted Data Collection: date range "2012 - previous month". Contact NADCdata@health.wa.gov.au.
* Resources listed: Non-Admitted Patient Activity Data Business Rules (PDF 818KB) and Non-Admitted Data Collection Data Dictionary (PDF 1.9MB). No Specification is listed on this page.

## 3. Attendance code (Appointment Attendance Code)

Sources: an extract of the Non-Admitted **Dental** Data Collection Data Specifications, and an extract of "MDG-10-001 Outpatient OOS Individual Definition v1.1" (`.../PAD/Outpatient-Attended-Appointment-Definition.pdf`). Both reached only as search extracts, and the summaries below are paraphrases.

* `appointment_attendance_code` is a **Mandatory** X(3) element with values **ATT** Attended, **DNA** Did Not Attend, **DNW** Did Not Wait, **NCE** Non-Client Event and **NSP** Unknown or Not Specified.
* MDG-10-001 describes an attended outpatient appointment as attendance code **ATT** or **MCC** (multidisciplinary case conference), for an outpatient client with session type IND, GRP or MCC. It excludes DNA, DNW, NCE, NSP and UNK, specialist mental health records and invalid dates.
* The Dental Specification table (quoted) shows Referral Account Number as element 24, Mandatory, `X[X(14)]`, and Referral Received Date as element 25, Mandatory, format `DDMMYYYY HH:MM:SS` ("This date marks the commencement of the referral wait time until a first appointment is attended"). Its numbering differs from the main Specification's.
* **This corrects round 2's first pass**, which said the NADC has no attendance code. That is true of the **July 2021** Specification only. The demo now generates `APPOINTMENT_ATTENDANCE_CODE` (ATT, DNA, DNW). See [DATA-DICTIONARY-MAPPING.md](DATA-DICTIONARY-MAPPING.md).

## 4. Establishment lists

* **WA Health Establishment List**, `https://www.health.wa.gov.au/-/media/Corp/Documents/Health-for/PAD/Establishments-list.pdf` (the search index shows it as the May 2026 edition). Not retrievable. A search extract says it gives, for each establishment, whether it reports to each collection (EDDC, HMDC, NADC, ESWLDC, MHDC, SANADC). That is a **paraphrase**. The same summaries named Albany (201), Armadale-Kelmscott (203), Augusta (204), Bentley (255), **Bethesda (602)**, Beverley (401) and Boddington (402) as NADC reporters, but they skipped hospitals that must also report (for example Boyup Brook, Bridgetown), so the example list is **incomplete and not reliable**.
* **Establishment List 2021/2022 (HMDS version)**, read in full for the letters A to C via a DocsLib copy. It says "The establishment codes listed are the codes that HMDS accepts to identify establishments for reporting purposes" and has an establishment type code (AH Acute Hospital, AR Acute/Rehabilitation, D2 Day Surgery 23/24 hr, DS Day Surgery other, NH Nursing Home, NP Nursing Post, PO Psychiatric Outpatient and others). This is the **Hospital Morbidity** list, not the NADC list, but codes are shared.
* **Further probes of the Establishments list (27 Oct 2026, about 21:55 AWST; paraphrases, two of them repeated across runs).** Search summaries said that in the May 2026 list: Joondalup Health Campus (642), Fiona Stanley (106) and Royal Perth (101) report to all six collections; Bethesda (602), St John of God Midland (6007), Peel (145) and Rockingham (277) have NADC = Y; Burringurrah (4171) and Bremer Bay (4074) report to the NADC only; and Graylands (935), Selby (158), Next Step East Perth (459) and Rottnest Island Nursing Post (367) do **not** report to the NADC. These agree with this project's SLIP-based list wherever both cover the site (Rottnest Nursing Post has a blank outpatient flag in SLIP; Graylands, Selby and Next Step are not in the SLIP hospital layer). Three differences are open: **Bethesda** (NADC = Y here, no flag in SLIP); **Peel Health Campus**, code **145** in the summaries (twice) but **645** in SLIP (two runs said 645 is an older code); **Hedland**: SLIP has Hedland Health Campus as 131, while the ED list names Port Hedland Hospital as 240 (a summary said 240 is the former hospital). The ED list and a summary also give Kununurra 257 and Carnarvon 210, both equal to SLIP. Warmun Health Centre (4243) has a blank outpatient flag in SLIP; its NADC status was not shown.
* **Code check:** every one of the 14 HMDS-list hospitals and nursing posts that also appear in this project's 112 has the same establishment code and name there (for example 201 Albany, 203 Armadale-Kelmscott, 206 Broome, 255 Bentley, 432 Boyup Brook, 4171 Burringurrah Nursing Post). That supports reading the SLIP `estab_id` as the WA Health establishment code. It does not prove that the NADC uses the same code, but the ED collection list also gives Royal Perth Hospital 0101, Sir Charles Gairdner 0105 and Fiona Stanley 0106, which equal the SLIP ids.
* **Gaps found:** the HMDS list has establishments that are not in the SLIP hospital layer (private day surgeries, renal and dialysis centres, for example 649 Broome Renal Health Centre, 654 Cannington Dialysis Clinic, 662 Bunbury Day Surgery), and SLIP has Bethesda Private Hospital (602) without the outpatient flag. Whether any of these report to the NADC is **unknown** (the Validation Manual says the NADC includes "public patients from private service providers").
* **Verbatim rows of the official Establishment List (27 Oct 2026, about 22:14 AWST).** A web search on "Bethesda Hospital Claremont non-admitted outpatient data collection WA Health reporting establishment 602" returned a highlight that reproduces the start of `Establishments-list.pdf` (page title "Establishment List, Reporting"; the note under it reads "Fields marked with a 'Y' indicate that the establishment reports patient activity data to the respective data collection."). The columns are Establishment number, Establishment name, Reports to EDDC, HMDC, **NADC**, ESWLDC, MHDC, SANADC. The rows run from Abbotsford Private Hospital to Cambridge Day Surgery and then stop (the highlight is cut there). **These 28 rows are the only verbatim rows of the list that could be read**; later searches for other letters returned only a generated summary, which was inconsistent between runs (for example it claimed Rottnest Island Nursing Post reports to the NADC in one run and another said it does not), so summaries were not used. The edition date is not shown in the extract; the search index labelled the file May 2026 (unverified).

| Establishment number | Establishment name | EDDC | HMDC | NADC | ESWLDC | MHDC | SANADC |
|---|---|---|---|---|---|---|---|
| 626 | Abbotsford Private Hospital |  | Y |  |  |  |  |
| 462 | Abrolhos Islands Health Centre |  |  | Y |  |  |  |
| 673 | Absolute Cosmetic |  | Y |  |  |  |  |
| 674 | Academy Face and Body |  | Y |  |  |  |  |
| 687 | Albany Community Hospice |  | Y |  |  |  | Y |
| 6019 | Albany Day Hospital |  | Y |  |  |  |  |
| 201 | Albany Health Campus | Y | Y | Y | Y |  | Y |
| 203 | Armadale-Kelmscott Memorial Hospital | Y | Y | Y | Y | Y | Y |
| 623 | Attadale Rehabilitation Hospital |  | Y |  |  |  |  |
| 204 | Augusta Hospital | Y | Y | Y |  |  |  |
| 4281 | Beacon Health Centre |  |  | Y |  |  |  |
| 4282 | Bencubbin Health Centre |  |  | Y |  |  |  |
| 255 | Bentley Health Service |  | Y | Y | Y | Y | Y |
| 602 | Bethesda Hospital |  | Y | Y |  |  | Y |
| 401 | Beverley Hospital | Y | Y | Y |  |  |  |
| 402 | Boddington Hospital | Y | Y | Y |  |  |  |
| 432 | Boyup Brook Soldiers Memorial Hospital | Y | Y | Y |  |  |  |
| 4074 | Bremer Bay Health Centre |  |  | Y |  |  |  |
| 444 | Bridgetown Hospital | Y | Y | Y |  |  |  |
| 4283 | Brookton Health Centre |  |  | Y |  |  |  |
| 206 | Broome Hospital | Y | Y | Y | Y | Y |  |
| 649 | Broome Renal Health Centre |  | Y |  |  |  |  |
| 403 | Bruce Rock Memorial Hospital | Y | Y | Y |  |  |  |
| 662 | Bunbury Day Hospital |  | Y |  |  |  |  |
| 208 | Bunbury Hospital | Y | Y | Y | Y | Y | Y |
| 4171 | Burringurrah Health Centre |  |  | Y |  |  |  |
| 209 | Busselton Hospital | Y | Y | Y | Y | Y | Y |
| 670 | Cambridge Day Surgery |  | Y |  |  |  |  |

  Reading of the table: 19 of the 28 rows have NADC = Y. Bethesda Hospital (602) has HMDC, NADC and SANADC. Several rows are not hospitals (day surgeries, a hospice, renal and dialysis centres, health centres). The same search also returned part of a second table in the same PDF with the columns Establishment number, Establishment name, Est type, SORL, MOS MPS (for example "204 Augusta Hospital AH 4 10 Y"; "4281 Beacon Health Centre OH 4 10"; "255 Bentley Health Service AH 4 10"). The meaning of SORL and MOS MPS is **not stated in the extract** and is not interpreted here.
* **What the check shows.** Of the 19 NADC = Y rows, 14 are the sites flagged "Outpatient Reporting" in HEALTH-001 with identical codes. Five are not flagged there and are now in the simulation: 462 Abrolhos Islands Health Centre, 602 Bethesda Hospital, 4281 Beacon Health Centre, 4282 Bencubbin Health Centre, 4283 Brookton Health Centre. For Beacon, Bencubbin and Brookton, HEALTH-001 holds the same names under codes 6025, 6026 and 6027 (Private nursing posts), not 4281 to 4283, so the match is by name and place. No HEALTH-001-flagged site in that range was missing from the official rows. See [ESTABLISHMENTS.md](ESTABLISHMENTS.md).

## 5. Business Rules (July 2021 mirror, plus a search extract)

* A search extract of the mirror quotes the Purpose and Background sections. Section 2 says "These Business Rules are revised annually, with reference to national policy and legislation". That fits the existence of a 2024 edition (named by MP 0191/25).

## 6. Earlier WA data set specification on METEOR (fallback, read in full, 27 Oct 2026, about 22:08 AWST)

* **Source:** "WA Health Non-Admitted Patient Activity and Wait List Data Collection (NAPAAWL DC) 2016-17", AIHW METEOR identifier 648949, registration status "WA Health, Standard 30/05/2017" (https://meteor.aihw.gov.au/content/648949). It supersedes the 2013-14 and 2014-15 editions. This is the **predecessor** of the collection and an AIHW-hosted copy, so it is a fallback source, not the current specification. Names and code lists may have changed.
* **Scope (quoted):** "all non-admitted outpatient services in Western Australia (WA). This includes: non-admitted outpatient services provided at public hospitals; publicly-funded non-admitted outpatient services that are provided at private hospitals; non-admitted outpatient services provided by health entities under contract with the Department of Health WA." This is evidence that, at least in 2016-17, **publicly funded outpatient activity at private hospitals and contracted entities was in scope**. It bears on the private-provider question (see [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md), Q6a).
* **Source systems named in 2016-17 (quoted):** TOPAS, HCARe / AOD and webPAS, with the Allied Health System providing data but not classed as a core system. Collection method: "Each site provides a data extract from their own information system", and activity is gathered "at the appointment level" to work out service events.
* **Data items that match the current structure:** Appointment account number, attendance (derived), outcome, priority, reason, cancellation reason, clinic category, new/follow-up, session type, service delivery mode, service delivery setting; Referral account number, clinic category for referral, priority, reason, received date, source, status, discharge date; Establishment organisation identifier (Western Australia) NNNN; Person age and area of usual residence at SA2. Appointment attendance is already **"(derived) code AAA"** here, which agrees with the three-letter ATT/DNA/DNW codes seen in the later extracts (section 3).
* **Use in this project:** background only. It supports the 3-letter code convention and shows the delivery-mode element existed in 2016-17. Nothing in the simulation takes a value from it.
