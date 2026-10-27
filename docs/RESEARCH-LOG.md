# Research log (round 2)

Times are Australia/Perth (AWST, UTC+8). Entries from before 21:00 on 27 Oct 2026 were not timestamped when they happened and are grouped.
The round-2 brief: use the public WA Health NADC documents and establishment information to align the simulation with the real collection, then iterate.

## 27 Oct 2026, before 21:00 AWST (not individually timestamped)

* Read the Patient Activity Data Policy page and the Data collections page. Recorded the official PDF URLs and the policy details (MP 0164/21, effective 1 July 2021).
* Tried to download the official Business Rules, Data Dictionary, Validation Manual, Establishments list and other PDFs. All failed (HTTP 500 from the fetch tool; TLS resets with `curl`). See SOURCES.md section 6.
* Found third-party mirrors of the **Data Specifications v1.0 (2021)** and the **Business Rules** (readkong). Read the Specification in full; read the Business Rules sections 1 to 8.5 (the rest is paywalled).
* Found the SLIP/Landgate HEALTH-001 dataset, which has an **"Outpatient Reporting"** attribute on the hospital and nursing post layers. Used it as the working establishment list.
* Downloaded HEALTH-002 health district polygons (34 districts) and grouped them into the 10 health regions.
* Verified the 34 district → region → HSP mapping against the downloaded attributes.

## 27 Oct 2026, 21:00 to 21:20 AWST

* Wrote `tools/fetch_reference.mjs`, `tools/build_geo.py` and `tools/build_establishments.mjs` so the reference data is reproducible. Simplified boundaries to about 128 KB (WA, 10 regions and 34 districts) and 17 KB (Perth metro inset).
* Built `data/reference/establishments.json`: 112 establishments flagged outpatient-reporting (85 hospitals, 27 nursing posts).
* Read the Central Referral Service page (last reviewed 8 Sep 2026). It gives hospital lists **by HSP** and shows that Joondalup is listed under NMHS, St John of God Midland Public under EMHS, and Peel under SMHS. This replaced my earlier "contracted health entity" group. Contracted operation is now a flag on the site rather than a separate group.
* Re-read Specification Appendix B for the elements that matter to the simulation. Findings:
  * There is **no attendance-status element**. Round 1's ATT / DNA / DNW codes came from METEOR and must go.
  * *Appointment Non-Attendance Reason Code* is Conditional: mandatory when the appointment was not attended, blank otherwise.
  * *Appointment Outcome Code* is Mandatory, and its list includes `CAN - Cancelled`. How a did-not-attend is coded in the outcome is therefore unclear (open question).
  * *Referral Received Date* (element 43) "marks the commencement of the referral wait time until a first appointment is attended".
  * *Referral Priority Code* has five values: AWT, NUR, SEM, UNK, URG.
  * The Specification has patient-with-cancer and community (palliative) element groups that the simulation does not use.
* Business Rules section 8.1: priority timeframes 30 / 90 / 365 days for urgent / semi-urgent / routine. The Specification calls the third priority "Not Urgent" (NUR); that NUR corresponds to the Business Rules' "routine" is an inference.
* Searched for alternative sources of the Dictionary, Business Rules and the Establishments list. Found none. Search-tool summaries about "DNA as a status", "five working days to triage" and a "1 July 2026 supersession" were not supported by any page that could be read and are **not used**.
* Searched for the referral category codes for Cardiology, Dermatology, Endocrinology, ENT and Gastroenterology. No readable source. They stay unverified.

## 27 Oct 2026, 21:35 to 21:55 AWST

* Pushed `b5a799e` (spec-aligned data model, real regions and establishments, HSP view). Live site, `data/synthetic.json` and the three reference GeoJSON/JSON files all return HTTP 200 on GitHub Pages.
* Retried the official PDFs with varied approaches: Data Dictionary (`/-/media/` and `/~/media/` URL forms), Validation Manual, Non-Admitted Dental Specification. All HTTP 500 again. Nothing new gained.
* **Read the Outpatient Services Policy page directly (official HTML).** MP 0191/25, date of effect 26 Nov 2025, supersedes OD 0503/14 and OD 0530/14, and says it is to be read with "Non-Admitted Patient Activity Business Rules 2024". **Consequence:** a 2024 edition of the Business Rules exists; the 2021 mirror is out of date. Added a version warning (SOURCES.md 3.4).
* Re-read the Patient Activity Data Policy page: still lists the Business Rules, Specifications and Dictionary without versions, and the Information Compendium as supporting.
* Read the Data Quality Team page (last reviewed 13 Jul 2023): non-validation data quality processes apply to the Non-Admitted collections.
* More search-engine summaries (V002 from 1 July 2025; Validation Manual March 2025; a Data Quality Dashboard; CAR/DER/END labels). None confirmed by a readable page. Recorded as low confidence in SOURCES.md section 5; not used.

## 27 Oct 2026, 21:55 AWST: a route to the official PDFs, and a correction

* **New route.** Fetching still fails (tool HTTP 500; box TLS reset). But the web search tool indexes parts of the official PDFs and returns extracts. Targeted queries gave quoted text from the **Validation Manual**, an extract of the **Dental Specification**, **MDG-10-001** and the **Establishments list**. Recorded in [OFFICIAL-EXCERPTS.md](OFFICIAL-EXCERPTS.md), with quoted text kept apart from machine-written paraphrase. Rule numbers from paraphrases are not used: two runs of one query gave OUT0013 and OUT0014 for the same rule.
* **Correction to the entries above (21:10 and later).** I removed ATT / DNA / DNW because the 2021 Specification has no attendance code. The Validation Manual and the Dental Specification do have an Appointment Attendance Code (ATT, DNA, DNW, NCE, NSP), so the removal was wrong for the current collection. The generator now writes `APPOINTMENT_ATTENDANCE_CODE` (ATT, DNA, DNW), and `build_data.mjs` uses it. The regenerated dataset has 11,000 referrals and 35,888 appointments (29,331 ATT, 3,183 DNA, 230 DNW, 3,144 cancelled with a blank code).
* Moved the five-working-day triage rule, the Data Quality Dashboard and the validation severities from "low confidence" to "supported by quoted extract" in SOURCES.md. The V002 / July 2026 / March 2025 claims stay unsupported.
* **Establishment codes.** Compared the 2021/22 Hospital Morbidity list (DocsLib copy, letters A to C) with the SLIP ids: 14 of 14 sites that exist in both have the same code and name. Found that the HMDS list also holds sites missing from SLIP layer 7 (private day surgeries, renal and dialysis centres), and that Bethesda (602) is named as an NADC reporter in a search summary but has no outpatient flag in SLIP. Both are in OPEN-QUESTIONS.md (6a, 6b).

## 27 Oct 2026, 22:25 AWST: more probes of the Establishments list

* Probed the search index for NADC flags by name. Results (paraphrases) agree with the SLIP-based list for Joondalup, Fiona Stanley, Royal Perth, Rockingham, St John of God Midland, Burringurrah, Bremer Bay and Rottnest (not NADC). Differences: Bethesda (602) NADC = Y, Peel code 145 vs SLIP 645, Hedland 131 vs 240. Details in [OFFICIAL-EXCERPTS.md](OFFICIAL-EXCERPTS.md) section 4; questions 6a and 6c in OPEN-QUESTIONS.md. No data change except a note on Peel.
* Fixed a misleading KPI: "Referrals, last 12 months" showed "+1117% on the 12 months before" in the first year, because data starts in July 2022. It now says "part year" or "no full prior year to compare" until two full years exist.

## Planned for the rest of the session

* Rebuild the generator and data on the real establishments, the real code sets and the real column names.
* Rework the visuals (real map, Perth inset, HSP cells, establishment view, target indicators, explainers).
* Write the establishment, business-rules and open-questions documents.
* Final retry of the official PDFs, then a fact-check pass.
