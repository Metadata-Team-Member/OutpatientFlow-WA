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

## Planned for the rest of the session

* Rebuild the generator and data on the real establishments, the real code sets and the real column names.
* Rework the visuals (real map, Perth inset, HSP cells, establishment view, target indicators, explainers).
* Write the establishment, business-rules and open-questions documents.
* Final retry of the official PDFs, then a fact-check pass.
