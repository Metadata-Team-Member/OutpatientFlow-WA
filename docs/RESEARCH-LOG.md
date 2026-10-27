# Research log (rounds 2 and 3)

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

## 27 Oct 2026, 21:55 AWST: more probes of the Establishments list

* Probed the search index for NADC flags by name. Results (paraphrases) agree with the SLIP-based list for Joondalup, Fiona Stanley, Royal Perth, Rockingham, St John of God Midland, Burringurrah, Bremer Bay and Rottnest (not NADC). Differences: Bethesda (602) NADC = Y, Peel code 145 vs SLIP 645, Hedland 131 vs 240. Details in [OFFICIAL-EXCERPTS.md](OFFICIAL-EXCERPTS.md) section 4; questions 6a and 6c in OPEN-QUESTIONS.md. No data change except a note on Peel.
* Fixed a misleading KPI: "Referrals, last 12 months" showed "+1117% on the 12 months before" in the first year, because data starts in July 2022. It now says "part year" or "no full prior year to compare" until two full years exist.

## 27 Oct 2026, 22:16 AWST: the official Establishment List, first 28 rows verbatim

* A natural-language search ("Bethesda Hospital Claremont non-admitted outpatient data collection WA Health reporting establishment 602") returned, as a highlight, the first rows of `Establishments-list.pdf` (the "Establishment List, Reporting" table with a Reports to NADC column). 28 rows, Abbotsford Private Hospital to Cambridge Day Surgery, 19 with NADC = Y. Stored in OFFICIAL-EXCERPTS.md section 4.
* Compared them with HEALTH-001: 14 of 19 match with identical codes and no flagged site is absent. Five NADC = Y sites are not flagged in HEALTH-001: Abrolhos 462, Bethesda 602, Beacon 4281, Bencubbin 4282, Brookton 4283 (SLIP holds Beacon, Bencubbin and Brookton under 6025, 6026, 6027). **Resolves the Bethesda question:** the official list says NADC = Y. The simulation now has 117 establishments (86 hospitals, 31 nursing posts; NMHS 5, WACHS 101).
* Ten more searches for other rows (Kalgoorlie, Katanning, Karratha, Kununurra, Royal Perth, Rockingham, Sir Charles Gairdner, Rottnest, Ravensthorpe) returned only generated summaries and no highlight. Those summaries disagree between runs (Rottnest), so none were used.
* Peel 145 vs 645: another search gave a summary that both codes exist in the list (145 AH SORL 4 MOS 10; 645 "also Peel Health Campus with different reporting flags"). Not a verbatim row, so the question stays open.
* Also fixed: the Mount Lawley note had been copied from the Peel note. METEOR NAPAAWL DC 2016-17 (648949) was read in full (OFFICIAL-EXCERPTS.md section 6).

## 27 Oct 2026, 22:30 to 22:45 AWST: more probes, nothing new verbatim

Round of varied searches (Referral Priority code list; Business Rules section 9 and 9.2.2; Establishment List rows for Esperance, Geraldton, Derby, Fremantle, Royal Perth, Fiona Stanley, Kalgoorlie; Data Dictionary 2024; Information Compendium) plus a re-fetch of the Patient Activity Data policy page and of the two Establishment-list URLs.

* **No verbatim "Highlights" came back** for any of these. WebFetch returned an empty page for `Establishments-list.pdf/1000` and for the Emergency Department establishment list. The policy page does not expose the document links to WebFetch.
* **ReadKong** serves only a truncated transcript of the Business Rules (it stops before section 9; the Contents list does show 9.1 Appointment classification and 9.2 Appointment attendance, 9.2.1 Attended, 9.2.2 Did not attend, 9.2.3 Interactions via information and communications technology). Pages 2 to 8 of the mirror return the same text or 404. So the wording of section 9 is still not read.
* **Search-engine summaries (unverified paraphrase, not used as fact).** They said: the Referral Priority code set is AWT, NUR, SEM, URG, UNK (this matches the 2021 Specification we hold); attendance codes are ATT, DNA, DNW, NCE, NSP (matches the Dental Specification extract); "Did Not Attend" is an attendance status and not a valid appointment outcome (matches the Validation Manual extract we hold); Esperance 218, Geraldton 220, Derby 215, Fremantle 102, Kalgoorlie 226, Royal Perth 101 and Fiona Stanley 106 report to the NADC (the numbers equal our SLIP codes, but no official row was shown, so these sites stay "SLIP-flagged, not confirmed"); the Business Rules 2024 were superseded on 1 July 2025 and a Data Dictionary was superseded on 1 July 2026 (not confirmed anywhere; added to Open Question 1 as a reason to ask which edition is current).
* Where a summary agrees with text we already hold verbatim, that adds nothing; where it does not, we did not use it.


## 27 Oct 2026, about 22:35 AWST: second probe round and fixes

* Searched again for Business Rules 2024 wording, Data Dictionary code lists, Information Compendium and Establishments rows beyond "C". The official health.wa.gov.au PDFs still return HTTP 500 to WebFetch (including the 2025-26 OBM KPI Data Definition Manual). Search summaries only repeated what is already logged: URG/SEM/NUR priority codes with AWT/UNK, attendance codes ATT/MCC/DNA/DNW/NCE/NSP/UNK (from the 2021 Business Rules mirror), and Peel Health Campus under SMHS from 13 Aug 2024. These are paraphrases (not verbatim) and change no counts, flags or rules.
* Peel 145 vs 645, Hedland 131 vs 240 and Warmun 4243 stay open (OPEN-QUESTIONS 6c).
* Simulation fixes in the same session: tour step 5 now reports the telehealth share across all appointments (17% in the default run) instead of the share among the filtered group (34%); the lane caption "Seen within target" shortens itself when the lane is narrow.

## Planned for the rest of the session

* Rebuild the generator and data on the real establishments, the real code sets and the real column names.
* Rework the visuals (real map, Perth inset, HSP cells, establishment view, target indicators, explainers).
* Write the establishment, business-rules and open-questions documents.
* Final retry of the official PDFs, then a fact-check pass.

## Round 3: 28 Oct 2026, from about 05:44 AWST (new authoritative sources)

The user supplied four official WA Health PDFs: Business Rules (July 2026), Data Specifications (July 2026), Data Dictionary (2026) and the Establishment List (May 2026, v0.1), with the instruction that the List's **Reports to NADC** column defines the establishments reporting to the collection.

* Read all four with the file-read tool. Saved working extracts outside the repository (not committed; PDFs not committed).
* **Establishment List.** The Reporting table has 191 rows: 125 Reports to NADC = Y, 66 not. The read tool does not preserve column positions, so the NADC column was taken from a column-aware extract of the same publication found via search (edition unstated) and cross-checked against the supplied PDF's Y counts. 8 rows inferred (433, 434, 436, 437, 438, 249, 359, 251). See SOURCES §1.1.
* Rebuilt `data/reference/establishments.json` from the 125 official rows: official codes, names and types; HSP, region and coordinates from SLIP / CRS / OpenStreetMap. 20 added, 12 dropped against the 117-site round-2 list (Peel re-coded 0645 → 0145). HSP counts: NMHS 9, SMHS 7, EMHS 7, CAHS 1, WACHS 101. Three sites cannot be placed (4275, 4506, 0652).
* **Data model** realigned to Spec Appendix B (snake_case field names, ISO dates, attendance code, Tier 1 / Tier 2, 22 clinic categories from Appendix D). Added non-client events (chart only, MCC; BR §10.2.7) as a fourth event kind that never stops the wait. Added ESC closure code and the OPM = Technical transfer label. Dropped the adult psychiatry category (BR §6.11, §10.1.1).
* **Documents rewritten:** SOURCES, BUSINESS-RULES-SUMMARY (24 rules with section numbers), CHANGES-2026-vs-2021 (Spec App G pp.59-60; BR App D p.49), DATA-DICTIONARY-MAPPING, DATA-REQUIREMENTS, OPEN-QUESTIONS, ESTABLISHMENTS. OFFICIAL-EXCERPTS marked historical. Old "unconfirmed" markers removed where the documents confirm.
* Inconsistencies noted inside the 2026 documents are listed in SOURCES §1.2.
* Previously unresolved items that the documents settled: attendance code set, priority mapping, category codes, duplicate codes, collection name, and which editions are current.
