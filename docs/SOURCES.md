# Sources

Every factual claim in this repository about the real WA Non-Admitted Patient Activity collection is meant to trace back to a row below.
If it does not, treat it as an assumption and see [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).
All **activity data in the simulation is synthetic**. No real patient data was used or seen.

Retrieval date for everything below: **27 October 2026** (Australia/Perth, AWST), unless stated.

**Naming.** The 2021 Specification and Business Rules call the collection the *Non-Admitted Patient (Activity) Data Collection* (NAPDC). The policy page and the Data collections page call it the *Non-Admitted Data Collection*. This repository says "NADC", as the data custodian does. The custodian's contact on the Data collections page is `NADCdata@health.wa.gov.au`.

## 1. Document status at a glance

| Document | Status | How it was read |
|---|---|---|
| **Non-Admitted Patient Data Collection Data Specifications** v1.0 (1 July 2021, MP 0164/21) | **Read in full** (Appendix B complete; Appendix C only partly, see below) | Third-party mirror (readkong), **not** the official PDF |
| **Non-Admitted Patient Activity Data Business Rules** | **Partly read**: contents page and sections 1 to 8.5 (to page 18). Sections 9 onward and Appendix A are **not read** | Third-party mirror (readkong). The mirror is paywalled after section 8.5 |
| **Non-Admitted Data Collection Data Dictionary** (official PDF 1.9 MB) | **Not obtained** | Official URL known, not retrievable from this environment |
| **Non-Admitted Data Collection Validation Manual** | **Not obtained** | URL known from search results, not retrievable |
| **Patient Activity Data Policy MP 0164/21** (policy page) | **Read** (HTML page) | Official WA Health page |
| **Patient Activity Data Policy Information Compendium** | **Not obtained** | Linked from the policy page, not retrievable |
| **Non-Admitted Dental Data Collection Data Specifications** | Not obtained, out of scope for this demo | n/a |
| WA Health **Data collections** page (NADC entry) | **Read** (HTML page) | Official WA Health page |
| **Central Referral Service** pages and other outpatient pages | **Read** (HTML) | Official WA Health pages |
| **Establishments list** (official PDF) | **Not obtained** | Retrieval failed. Replaced by SLIP HEALTH-001 flag, see section 4 |
| Spatial reference data (SLIP HEALTH-001 / HEALTH-002) | **Obtained** by script | SLIP public REST service |

The official health.wa.gov.au PDFs could not be retrieved from the environment that built this demo (details in section 6).
Anything taken from a mirror should be re-checked against the official PDF by the custodian before it is relied on.

## 2. Official documents and where they live

| Document | Official URL (as published) |
|---|---|
| Patient Activity Data Policy (MP 0164/21) | https://www.health.wa.gov.au/About-us/Policy-frameworks/Information-Management/Mandatory-requirements/Collection/Patient-Activity-Data |
| Data collections (includes the NADC entry, date range "2012 – previous month") | https://www.health.wa.gov.au/Articles/A_E/data-linkage/How-to-apply-for-data/data-collections |
| Non-Admitted Patient Activity Data Business Rules (PDF, 818 KB) | https://www.health.wa.gov.au/~/media/Corp/Policy-Frameworks/Information-Management/Patient-Activity-Data-Policy/Supporting/Non-Admitted-Patient-Activity-Data-Business-Rules.pdf |
| Non-Admitted Data Collection Data Dictionary (PDF, 1.9 MB) | https://www.health.wa.gov.au/~/media/Corp/Policy-Frameworks/Information-Management/Patient-Activity-Data-Policy/Supporting/Non-Admitted-Data-Collection-Data-Dictionary.pdf |
| Non-Admitted Data Collection Validation Manual (PDF) | https://www.health.wa.gov.au/-/media/Corp/Documents/Health-for/PAD/Non-Admitted-Data-Collection-Validation-Manual.pdf |

The policy page lists, under "Non-Admitted activity", the Business Rules, the Data Specifications, the Data Dictionary and the Non-Admitted Dental Data Specifications as related documents.
It also lists the Patient Activity Data Policy Information Compendium as supporting (not mandatory).
The policy is effective **1 July 2021** and is a mandatory requirement under section 26(2)(k) of the *Health Services Act 2016* (policy page).

## 3. Documents read, and what each contributed

### 3.1 Data Specifications v1.0 (July 2021), read via mirror

* Mirror: https://www.readkong.com/page/non-admitted-patient-data-collection-data-specifications-3842279
* Version control (Appendix D): v1.0, released 1 July 2021, approved by the Assistant Director General, Purchasing and System Performance. Produced by Information and Performance Governance, Department of Health. Ref F-AA-74148, MP 0164/21.
* **Confidence: high** for content (the mirror reproduces the PDF text). **Caveat:** it is the 2021 version. A later version may exist, see [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).
* Used for:
  * File naming `NAP_DATAPROVIDER_PASSYSTEM_YYYYMMDD_YYYYMMDD.csv`, secure FTP transfer, daily extracts before 2 am, monthly extracts by 3 pm on the third working day.
  * Record types REF, APP, RES, CAN and change types I and U.
  * The 115 data elements of Appendix B: names, formats, Mandatory / Conditional / Optional status, and every code list quoted in [DATA-DICTIONARY-MAPPING.md](DATA-DICTIONARY-MAPPING.md).
  * Appendix C referral and clinic category codes (the mirror shows only the codes from `GEN` to `YCS`; the rows before `GEN` are missing, so codes such as Cardiology, Dermatology, Endocrinology, ENT and Gastroenterology could **not** be verified).
* Page numbers: the mirror keeps the printed page numbers. Appendix C starts on p. 30 (contents page). This repository cites **element names and numbers** rather than page numbers for the Specification, because the mirror's page breaks are approximate.

### 3.2 Business Rules, read via mirror (sections 1 to 8.5 only)

* Mirror: https://www.readkong.com/page/non-admitted-patient-activity-data-business-rules-5282487
* **Confidence: high** for the sections read. **Not read:** section 9 onward (appointment classification, attendance, delivery modes, cancelled appointments, activity recording and reporting) and Appendix A (p. 35). The mirror stops at section 8.5.
* Page numbers below are the printed page numbers (footer), taken from the contents page:

| Topic | Section | Page |
|---|---|---|
| Attended appointment is completed by allocating an outcome code | 5.1 | 3 |
| Clinic registration (five fixed codes) | 7 | 8 |
| Registering referrals; priority timeframes 30 / 90 / 365 days | 8.1 | 14 |
| Source of referrals; "immediate attention" goes to the hospital directly | 8.2 | 15 |
| Referral reason | 8.3 | 15 |
| OPM referrals excluded from new-appointment wait reporting | 8.3.1 | 16 |
| Referral received date is never changed, even on transfer | 8.4 | 16 |
| Referral closure | 8.5 | 17 |
| Not read (contents page only): 9.1 p. 19, 9.2 p. 20, 9.3 p. 21, 9.4 pp. 22 to 25, 9.5 p. 25, 10 p. 26, 12.6 p. 30, Appendix A p. 35 | 9 onward | n/a |

See [BUSINESS-RULES-SUMMARY.md](BUSINESS-RULES-SUMMARY.md) for the plain-English summary. Third-party text is **not** copied into this repository: it is paraphrased with short quotations.

### 3.3 Official HTML pages (read directly)

| Page | URL | Used for |
|---|---|---|
| Patient Activity Data Policy | (section 2) | Policy number, effective date, related document list |
| Data collections | (section 2) | NADC date range; official PDF URLs; custodian contact; precedent of "Preview Synthetic Data" for other collections (the page lists 20-row samples for EDDC, HMDC, MHDC, MNS and WACR, and **none for the NADC**) |
| The Central Referral Service (CRS), last reviewed 8 Sep 2026 | https://www.health.wa.gov.au/Articles/A_E/About-the-Central-Referral-Service | Which referrals the CRS handles; metropolitan and regional specialty lists; which referrals go directly to hospitals; hospital lists by Health Service Provider (HSP) |
| Guide for referring to WA public outpatient services | https://www.health.wa.gov.au/Articles/A_E/Central-Referral-Service-guide-for-referrers | Category 1 (0 to 30 days), Category 2 (31 to 90 days), Category 3 (91 to 365 days) guide timeframes; immediate referrals (review within 7 days) |
| Outpatient Direct (HealthyWA) | https://www.healthywa.wa.gov.au/Articles/N_R/Outpatient-Direct | Patient-facing description; supports rescheduling and cancelling existing appointments |
| EMHS site: St John of God Midland Public Hospital page (updated 26 Oct 2026) | https://www.emhs.health.wa.gov.au | 307 beds; public hospital run by St John of God; EMHS lists "Mount Lawley Hospital" |
| WA Government media statement, "Cook Labor Government acquires Mount Lawley Hospital" (published 1 May 2026) | https://www.wa.gov.au/government/media-statements/Cook%20Labor%20Government/Cook-Labor-Government-acquires-Mount-Lawley-Hospital--20260430 | $80M purchase from St John of God; State ownership from 31 Aug 2026; EMHS to commission |

Other facts used and where they come from (all HTML pages read on 27 Oct 2026; see [RESEARCH-LOG.md](RESEARCH-LOG.md)):

* Peel Health Campus returned to public hands under SMHS on 13 August 2024, and the CRS page lists it under SMHS.
* A new "Women, Babies and Children" HSP is planned from July 2027, combining CAHS, KEMH and the Women and Babies Hospital (WA Government media statement of 9 Sep 2026). **Medium confidence**: read once, not cross-checked against a second source.

### 3.4 Version warning: newer editions than the ones this demo read (found 27 Oct 2026, about 21:45 AWST)

The only copies of the Specification and Business Rules that could be read are **third-party mirrors of the July 2021 v1.0 editions** (the mirrored Business Rules cover page says "July 2021", "Current version: 1.0", "Original approval date 2 June 2021").
Two official WA Health pages that were read directly point to later material:

* The **Outpatient Services Policy, MP 0191/25** (official page, date of effect **26 November 2025**; supersedes OD 0503/14 *Central Referral Allocation, Outpatient Services* and OD 0530/14 *Specialist Outpatient Services Access Policy*). Its "to be read in conjunction with" list names **"Non-Admitted Patient Activity Business Rules 2024"**. So a 2024 edition of the Business Rules exists and was **not obtained**. The simulation's rules (section 8 priorities and so on) come from the 2021 edition and may differ from the 2024 edition. This is confirmed by the official page and replaces the earlier "not asserted" note about the 26 Nov 2025 policy.
* The Patient Activity Data Policy page (MP 0164/21, still dated 1 July 2021) lists the Business Rules, the Data Specifications and the Data Dictionary without version numbers.

Search-engine summaries (machine-written, **not confirmed by any page that could be read**) also said that a Specification / Dictionary version 2.0 ("V002") applies from 1 July 2025 with a changed file name pattern, and that the Validation Manual is dated March 2025. These are listed in section 5 and are **not** used.
The custodian should therefore treat the field names and code sets in this demo as the 2021 baseline, and tell us which later changes matter (see OPEN-QUESTIONS.md).

## 4. Establishment list and geography

### 4.1 Which establishments report to the NADC

The official Establishments list PDF could not be retrieved. The repository therefore uses the Department of Health's own spatial layer instead, with its **"Outpatient Reporting"** attribute:

* **Source:** SLIP public service `SLIP_Public_Services/Health/MapServer`, layers 7 (Hospitals) and 6 (Nursing Posts), dataset **HEALTH-001**, field `outpatient` (alias "Outpatient Reporting").
  https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Health/MapServer
* **Rule applied:** an establishment is included if `outpatient = 'Y'`. This gives **112 establishments** (85 hospitals and 27 nursing posts), listed in [ESTABLISHMENTS.md](ESTABLISHMENTS.md).
* **Caveat (important):** HEALTH-001 does not say that "Outpatient Reporting" means "reports to the NADC". The match is an inference. This is the first question in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md). The establishment list is therefore labelled "flagged as outpatient-reporting in HEALTH-001" everywhere it appears.
* **Codes:** the four-digit establishment code matches the Specification's *Establishment Code* ("a unique four-digit number assigned by the Department of Health", Appendix B element 1).
* **Reporting group (HSP):** the HSP for each site comes from the CRS page's hospital lists (last reviewed 8 Sep 2026) and, for a handful of exceptions, the pages named in the `hspNote` of each record in `data/reference/establishments.json` (Peel, Joondalup, Midland, Mount Lawley, PCH, SJOG Bunbury).
* **Not found in HEALTH-001 and therefore not included** (questions for the custodian): Graylands Hospital, Selby, Next Step, CAHS community sites, Byford Health Hub (listed on the EMHS website), Murray District Hospital (present in SLIP but not flagged), and the Dwellingup and Rottnest nursing posts (present but not flagged).

### 4.2 Coordinates, districts and regions

* Coordinates are the point geometry of the same SLIP layers (converted to WGS 84).
* Region and district boundaries: **HEALTH-002 Health Districts** (layer 2, 34 districts), grouped into 10 health regions as in the same dataset (HEALTH-003 gives the region polygons).
* Geometry was simplified for the browser (`tools/build_geo.py`, topology-preserving simplification, 3-decimal coordinates). The files are `data/reference/wa_regions.geojson` and `data/reference/perth_metro.geojson`.
* **Licence caveat:** the SLIP catalogue entry for these datasets shows the licence as "not specified". They are © Government of Western Australia, Department of Health. They are used here for a non-commercial prototype with attribution: **"© Government of Western Australia, Department of Health, via SLIP / data.wa.gov.au"**. The custodian should confirm that this use is acceptable. If it is not, the boundaries can be swapped for ABS ASGS (CC BY) boundaries.
* The raw SLIP downloads are **not** committed (`data/reference/raw/` is git-ignored). `node tools/fetch_reference.mjs` re-creates them.

## 5. Facts that are low confidence and are NOT asserted by the simulation

Web search tools returned machine-written summaries on the topics below. They contradicted each other or the official pages, so none of it is used:

* The meaning of specific "OUT" validation rules.
* A claimed five-working-day triage rule in the Validation Manual.
* A claim that a did-not-attend is recorded as an attendance status.
* A claim that a July 2026 version of the Specification and Dictionary exists, and a claim that version 2.0 (V002, file pattern `NADD_..._V002_...`) applies from 1 July 2025.
* A claim that the Validation Manual is v1.0 dated March 2025 and that errors appear in an "NADC Data Quality Dashboard" with severity-based resubmission timeframes. (The Data Quality Team page, last reviewed 13 Jul 2023, says only that non-validation data quality processes apply to the Non-Admitted collections; query address RoyalSt.DataQuality@health.wa.gov.au.)
* A claim that the Referral Category codes are `CAR` Cardiology, `DER` Dermatology and `END` Endocrinology (it came from a search summary, not a readable page).
* Referral category codes for Cardiology, Dermatology, Endocrinology, ENT and Gastroenterology (`CAR`, `DER`, `END`, `ENT`, `GAS`). They are used in the simulation only as **provisional, unverified** labels and are flagged `verified: false` in `config/dimensions.json`.

## 6. Retrieval attempts that failed (so the custodian knows what was and was not seen)

| Attempt | Result |
|---|---|
| Data Dictionary PDF (official URL) via a web fetch tool | HTTP 500 |
| Business Rules, Validation Manual, Establishments list, HMDS Part B PDFs, Outpatient attended appointment definition, Information Compendium, Outpatient Services Policy (official PDF URLs) via a web fetch tool | HTTP 500 |
| `www.health.wa.gov.au` and `ww2.health.wa.gov.au` via `curl` with a browser user agent | TLS connection reset ("unexpected eof"). The environment's network filter blocks the host |
| `wget` | Failed (exit status 4) |
| Headless Chrome | Rendered no content |
| Internet Archive (Wayback) copies | 404 or blocked |
| Search for other mirrors of the Business Rules and the Dictionary | Only the two readkong pages were found. The Dictionary has no mirror |
| Business Rules mirror, section 9 onward | Paywalled on the mirror |

A retry was made later in the session (27 Oct 2026, about 21:40 AWST): the Data Dictionary, the Validation Manual and the Non-Admitted Dental Specification PDFs again returned HTTP 500. See [RESEARCH-LOG.md](RESEARCH-LOG.md).
Pages on `health.wa.gov.au` that are plain HTML were readable through the fetch tool. The PDFs were not.

## 7. Fallback sources used for background only

AIHW METEOR (https://meteor.aihw.gov.au) was used in round 1 to guess concept names. It is a national metadata registry, not the WA specification. **Round 2 removes METEOR-derived items wherever the WA Specification contradicts them** (for example, there is no attendance-status element in the WA Specification, see [DATA-DICTIONARY-MAPPING.md](DATA-DICTIONARY-MAPPING.md)).

## 8. Software

No third-party libraries or fonts are loaded by the live site. Build tools use Node.js and Python (shapely) on the author's machine only.
