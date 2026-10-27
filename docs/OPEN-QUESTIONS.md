# Open questions for the NADC data custodian

Each question says why it matters to this demo. Everything in the demo is synthetic; the questions are about how closely the structure matches the real collection. References are to [SOURCES.md](SOURCES.md).

## A. Documents and versions

1. **Which editions are current?** We read the July 2021 v1.0 Specification and Business Rules (via third-party mirrors). The Outpatient Services Policy MP 0191/25 (from 26 Nov 2025) cites "Business Rules 2024". Which Specification, Dictionary, Business Rules and Validation Manual versions apply today, and what changed from 2021? (Search-engine summaries mention a version 2.0 / "V002" from 1 July 2025 and a different file-name pattern. We could not confirm this and have not used it.)
2. **Can the official PDFs be shared** (Business Rules sections 9 to 12 and Appendix A, the Data Dictionary, the Validation Manual, the Information Compendium)? Our tools could not download them. Without them the demo cannot cite page numbers for those parts.
3. **Collection name.** The 2021 documents say NAPDC, the policy page says "Non-Admitted Data Collection", you say NADC. Which is preferred in public material?

## B. Which establishments report

4. **What does "Outpatient Reporting = Y" in the SLIP HEALTH-001 layer mean?** We used it to list 112 establishments (85 hospitals, 27 nursing posts). A verbatim extract of the official Establishments list (rows A to "Cambridge Day Surgery" only) shows 19 sites with NADC = Y; 14 of them are in the SLIP-flagged set and 5 are not (Abrolhos 462, Bethesda 602, Beacon 4281, Bencubbin 4282, Brookton 4283), which the sim now adds (117 in total). So the flag is a good but incomplete proxy. Please supply the current list so the rest of the alphabet can be checked, and say whether the flag means anything specific.
5. **Is the HEALTH-001 `estab_id` the same number as the NADC *Establishment Code*?** (We padded it to four digits.) A spot-check against the 2021/22 Hospital Morbidity establishment list found the same code and name for all 14 sites checked, so we think so, but have not seen the NADC list.
6. **Missing sites.** Do Graylands, Selby, Next Step, Child and Adolescent Health Service community sites, or the Byford Health Hub report to the NADC? What about non-webPAS providers?
6a. **Bethesda Hospital (602) and private providers.** The official list extract shows Bethesda with NADC = Y (with HMDC and SANADC), so it is now in the sim (private, shown under NMHS only because SLIP puts it in the North Metro geographic service). What arrangement puts a private hospital in the NADC (publicly funded outpatient services? the Validation Manual says the NADC includes "public patients from private service providers")? Which other private providers report? The 2016-17 predecessor specification on METEOR (648949) put publicly funded outpatient services at private hospitals and contracted entities in scope (OFFICIAL-EXCERPTS.md section 6). The extract also shows day surgeries, a hospice and renal/dialysis centres reporting to the HMDC only.
6b. **Per-collection flags.** A search extract says the Establishments list PDF flags each establishment against EDDC, HMDC, NADC, ESWLDC, MHDC and SANADC. If we can have that list (or the NADC column of it), we will replace the SLIP inference completely.
6c. **Code changes.** Is Peel Health Campus reported as **145** or **645**? Is Hedland Health Campus **131** or the former Port Hedland Hospital code **240**? Are Warmun Health Centre (4243) and similar sites with a blank SLIP flag reporting?
7. **Classification of sites that moved or are contracted.** We list Joondalup Health Campus under NMHS, St John of God Midland Public under EMHS, Peel under SMHS (since 13 Aug 2024) and St John of God Mt Lawley under EMHS (State-owned from 31 Aug 2026). Is that how they are reported? Does St John of God Bunbury report as WACHS?
8. **Future HSP structure.** One source says a Women, Babies and Children HSP is planned from July 2027. If so, which establishments move?
9. **Which establishment code is reported for telehealth** (delivery modes THH, THC, THS): the patient's site, the clinician's site or the hosting site?

## C. Geography

10. **Region and district assignment.** We follow the SLIP layers (34 districts in 10 regions). For example the "City" district sits in East Metro and "Lower West" (which contains Sir Charles Gairdner Hospital) sits in North Metro. Is that the assignment the custodian uses for reporting?
11. **Residence mapping.** The demo derives a patient's district from a synthetic value. Is there an official postcode-to-district concordance that should be used in real analysis?
12. **Data licence.** SLIP lists the HEALTH layers' licence as "Not specified". May the boundaries and hospital coordinates be redistributed in a public demo with attribution?

## D. Rules and codes

13. **Attendance code.** The 2021 Specification has no attendance-status element, but the Validation Manual, a current Dental Specification and MDG-10-001 (all seen only as search extracts) use an **Appointment Attendance Code** (ATT, DNA, DNW, NCE, NSP, and MCC for case conferences). Please confirm the current code set in the main Non-Admitted Specification, whether `DNA` can also appear as an outcome value (one Manual rule suggests it can), and how a **cancelled** appointment is coded (the demo leaves attendance blank and uses outcome CAN). The 2021 Appointment Status Code (element 78: PR, PP, UN, FU, RS, CA) looks like a processing status, not attendance; is that how it is used?
14. **Priority mapping.** Do URG / SEM / NUR map to Business Rules priorities 1 / 2 / 3 (30 / 90 / 365 days)? What is AWT (awaiting triage) for, and how are patients waiting for triage counted?
15. **Immediate and CRS referrals.** How do referrals handled directly by hospitals (for example "immediate, under 7 days") and CRS-allocated referrals appear in the NADC, and does the CRS rollout in the Wheatbelt and Kimberley change reporting?
16. **Referral categories.** We could not read Appendix C rows beginning A to F. Codes for Cardiology, Dermatology, Endocrinology, ENT and Gastroenterology are provisional (`CAR, DER, END, ENT, GAS`). What are the real codes?
17. **Duplicate or overlapping codes.** The 2021 Specification lists some codes twice or with the same meaning (for example OTH in the cancellation list twice, CUR and INP both "Current IP any site", PCO and PTC both "Patient convenience", RES and TRU both "Test results unavailable", TRA and TUN both "Transport unavailable", and TRU in both the cancellation and non-attendance lists). Are these intentional?
18. **Business Rules sections 9 to 12.** What do they require on attendance and delivery-mode classification, and which rules affect wait-time reporting for follow-ups?
19. **Which Validation Manual rules** would change the picture a user sees (for example referral and appointment category mismatch)? We simulate none.
20. **Outpatient Services Policy MP 0191/25.** Does it change any NADC reporting rule (for example priority timeframes or how referrals are triaged)?

## E. Using the demo

21. Would the custodian support publishing an official **"Preview Synthetic Data"** sample for the NADC, as is offered for the EDDC, HMDC, MHDC, MNS and WACR on the Data collections page? Our generator writes 25-row sample CSVs in the 2021 Specification column style that could serve as a starting point.
22. Which of the simulation's **indicators** (seen within target, median wait, telehealth share, DNA rate, cancelled rate) are meaningful from NADC data alone, and which need linkage to other collections?

6b. **Beacon, Bencubbin, Brookton codes.** The official list has them as 4281, 4282 and 4283 ("Health Centre"); HEALTH-001 has the same names under 6025, 6026, 6027 (Private nursing posts). Are these the same facilities, and which code does the NADC extract carry?
