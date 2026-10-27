# Sources

Every factual claim in this repository about the real WA Non-Admitted Data Collection (NADC) is meant to trace back to a row below. If it does not, it is an assumption and is listed in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md). All **activity data in the simulation is synthetic**; no real patient data was used or seen.

Times are Australia/Perth (AWST, UTC+8). This file was rewritten on **28 Oct 2026** after the user supplied the four official documents below.

## 1. Primary sources (retrieved from the user, 28 Oct 2026)

The user supplied these four official WA Health PDFs to the project. They are **the** sources for the simulation's field names, code sets, business rules and reporting establishments. The PDFs are **not** committed to this repository (copyright is vested in the State of Western Australia; only short, cited quotations are used).

| Code | Document | Edition / version | Printed pages | Used for |
|---|---|---|---|---|
| **BR** | *Non-Admitted Data Collection Business Rules* (Patient Activity Data Business Rules) | **July 2026**; revision history in Appendix D (p.49) | Appendix A pp.40-43 (referral categories), Appendix D p.49 | Rules for what counts as an attended appointment, waiting time, delivery modes, scope. Section numbers are cited in [BUSINESS-RULES-SUMMARY.md](BUSINESS-RULES-SUMMARY.md) |
| **Spec** | *Non-Admitted Data Collection Data Specifications* | **July 2026**, version V003, effective 1 July 2026 (file-name version V003; Ref F-AA-74148, MP 0164/21) | Appendix B pp.8-34 (element listing), C p.35, D pp.36-49 (reference codes), E pp.50-53 (Tier 1), F pp.54-58 (Tier 2), G pp.59-60 (revisions) | Field names, mandatory / conditional / optional status, code sets, Tier 1 / Tier 2 codes, file naming and extract timing |
| **DD** | *Non-Admitted Data Collection Data Dictionary* | **2026** | Establishment p.95; Appointment - Attendance derivation pp.5-6; client type pp.10-11; delivery mode pp.14-15; outcome pp.24-25; referral priority p.154; referral reason p.155 | Definitions and derivation logic (for example how attendance derives from outcome and processing status) |
| **EL** | *WA Health Establishment List*, **May 2026, version 0.1** | May 2026 v0.1 | "Establishment List, Reporting" table; Appendix A (establishment types) and Appendix D (Multi-Purpose Services), pp.27-30 | The **Reports to NADC** column: the simulation's reporting establishments are exactly the rows with Y |

The user's description of the List: *"In the establishment list is a column called Reports to NADC, these are the establishments reporting to this data collection."*

### 1.1 How the PDFs were read, and the limits

* The four PDFs were opened with the project's file-read tool only; no other tool touched them. Working extracts used for the build are kept **outside** the repository.
* **Limit that affects the establishment list.** The read tool returns the text of the Establishment List but does **not preserve column positions**, so a "Y" cannot be attributed to the NADC column (as opposed to the other collection columns) from it alone. The column assignment therefore comes from a **column-aware text extract of the same WA Health publication returned through a web search index** (its edition is not stated). Its NADC = Y total was **cross-checked against the user-supplied May 2026 PDF**, and they agree at **125**. **8 rows are inferred** rather than read directly: 433, 434, 436, 437, 438, 249, 359 and 251. They are flagged ‡ in the app and in [ESTABLISHMENTS.md](ESTABLISHMENTS.md). The custodian should check them.
* Every claim below that cites these documents is by section or page of the PDF; where a page was not recorded the section number alone is given.

### 1.2 Inconsistencies found inside the 2026 documents

* The Specification's file-format section (§4.1, page not recorded) says csv, while Appendix G (1 July 2024) says "double pipe delimited". (Appendix G, p.59.)
* Delivery mode **VID** is in Spec Appendix D but not in the Appendix B listing; the Data Dictionary end-dates it **30 June 2023**.
* Cancellation / non-attendance code labels differ between Appendix B and Appendix D (for example **CUR** "Currently in hospital" vs "Current Inpatient any site"; **APE** "Currently in hospital" vs "Inpatient or Outpatient Appointment Elsewhere").
* The Appendix G entry for 1 July 2026 ends with a bullet "Appendix F - Clinic Tier 2 Codes and Description:" with no text after it (p.60).
* BR §10.3.2 and §11.3.2 word the same-day-service rule differently.
* The definition of THS differs between BR §9.5.2 and the DD.
* Spec Appendix B lists *Appointment Outcome Code* as Mandatory, but BR §9.3.2 says the outcome field is not used for a DNA and the DD derives attendance from outcome / processing status. How a DNA row is meant to carry an outcome is an open question; the simulation leaves it blank (DNW rows carry PLN).

## 2. Other official sources read earlier (HTML pages, 27 Oct 2026)

| Page | URL | Used for |
|---|---|---|
| Patient Activity Data Policy (MP 0164/21) | https://www.health.wa.gov.au/About-us/Policy-frameworks/Information-Management/Mandatory-requirements/Collection/Patient-Activity-Data | Policy number; related documents |
| Data collections | https://www.health.wa.gov.au/Articles/A_E/data-linkage/How-to-apply-for-data/data-collections | NADC date range; custodian contact |
| The Central Referral Service (last reviewed 8 Sep 2026) | https://www.health.wa.gov.au/Articles/A_E/About-the-Central-Referral-Service | Which hospitals belong to which HSP (the **HSP grouping is not in the Establishment List**) |
| Outpatient Services Policy MP 0191/25 (effective 26 Nov 2025) | health.wa.gov.au policy page | Context only |
| EMHS site (St John of God Midland Public Hospital page, updated 26 Oct 2026) and WA Government media statement of 1 May 2026 (Mount Lawley Hospital) | emhs.health.wa.gov.au; wa.gov.au | HSP overrides for 6007 and 629 |
| WA Government media statement of 9 Sep 2026 | wa.gov.au | A Women, Babies and Children HSP is planned from July 2027 (one source; not modelled) |

## 3. Geography and reference data (not in the four documents)

* **Regions, districts, hospital coordinates, beds, HSP geographic service:** SLIP public service `SLIP_Public_Services/Health/MapServer`, datasets **HEALTH-001** (Hospitals, layer 7; Nursing Posts, layer 6), **HEALTH-002** (Health Districts, layer 2), HEALTH-003 (regions). © Government of Western Australia, Department of Health; the SLIP catalogue lists the licence as "not specified". https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Health/MapServer
* **Coordinates for sites SLIP does not have:** OpenStreetMap contributors (ODbL), via Nominatim, for the few sites marked `osm-*` in `data/reference/establishments.json`.
* **None of these is in the Establishment List.** The List has no HSP, region or coordinates, so the simulation's **HSP grouping, region and map positions are not official**. The join is documented per site in [ESTABLISHMENTS.md](ESTABLISHMENTS.md) (`hspBasis`, `locationStatus`).
* Geometry was simplified for the browser (`tools/build_geo.py`). Raw downloads are git-ignored; `node tools/fetch_reference.mjs` recreates them.

## 4. Historical and fallback sources (superseded)

These were used in round 2, **before** the official 2026 documents were available. Where they disagree with section 1, section 1 wins and the contradicted claim has been removed from the repository.

| Material | What it was | Status now |
|---|---|---|
| Data Specifications **v1.0, July 2021** via a third-party mirror (readkong) | 2021 baseline for field names and codes | **Superseded** by Spec July 2026. Differences are listed in [CHANGES-2026-vs-2021.md](CHANGES-2026-vs-2021.md) |
| Business Rules **v1.0, July 2021** via a third-party mirror, sections 1-8.5 only | 2021 baseline | **Superseded** by BR July 2026 |
| Search-index extracts of the Validation Manual, the Dental Specification, MDG-10-001 and the Establishment List | See [OFFICIAL-EXCERPTS.md](OFFICIAL-EXCERPTS.md) | **Historical.** Not used for any simulated rule. The Validation Manual is still not in hand (see OPEN-QUESTIONS) |
| SLIP HEALTH-001 "Outpatient Reporting" flag | Used in round 2 as a proxy for NADC reporting | **Superseded** by the List's Reports to NADC column. The flag is **not** the NADC set: against the earlier 117-site list, 11 sites are dropped and 19 added (Peel re-coded 0645 → 0145) |
| AIHW METEOR, 2016-17 data set specification 648949 | Background | Background only |
| Search-engine summaries (V002, "July 2026 version exists", CAR / DER / END category labels) | Unverified | The 2026 documents settle these: the current Specification is V003 (July 2026), and category codes are those in Spec Appendix D |

## 5. Software

No third-party libraries, fonts or CDNs are loaded by the live site. Build tools use Node.js and Python (shapely) on the author's machine only.
