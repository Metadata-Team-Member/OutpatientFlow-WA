# Open questions for the NADC data custodian

Each question says why it matters to the demo. Everything in the demo is synthetic; the questions are about how closely the structure matches the real collection. References are to [SOURCES.md](SOURCES.md). Rewritten 28 Oct 2026 after the four official 2026 documents were supplied.

## Closed by the 2026 documents

| Earlier question | Answer | Where |
|---|---|---|
| Which editions are current? | Spec July 2026 (V003), BR July 2026, DD 2026, Establishment List May 2026 v0.1 | SOURCES §1 |
| Which establishments report? What does SLIP "Outpatient Reporting" mean? | The List's **Reports to NADC** column. 125 sites. The SLIP flag was only a proxy (against the earlier 117-site list: 11 sites dropped, 19 added, Peel re-coded 0645 → 0145) | [ESTABLISHMENTS.md](ESTABLISHMENTS.md) |
| Is Peel 145 or 645? | **0145** in the List | ESTABLISHMENTS.md |
| Is the SLIP `estab_id` the NADC Establishment Code? | The List's code is the Establishment Code (N(4), DD p.95). We join the List to SLIP by code and name; how each site was joined or located is recorded in ESTABLISHMENTS.md. We have not seen a statement that SLIP ids are the same numbers | EL; DD p.95 |
| Collection name | "Non-Admitted Data Collection (NADC)" | Spec title |
| Attendance code set and where DNA sits | `appointment_attendance_code`: ATT, DNA, DNW, MCC, NCE, NSP, UNK, derived from outcome / processing status | Spec p.17; DD pp.5-6 |
| Priority mapping | URG = Priority 1 (30 d), SEM = 2 (90 d), NUR = 3 (365 d) | BR §8.1; DD p.154 |
| Referral category codes (Cardiology …) | Spec Appendix D (pp.36-49) | Spec |
| Duplicate codes in 2021 lists (OTH twice, CUR / INP, PCO / PTC …) | Values removed 1 Jul 2025; remaining label differences are noted in SOURCES §1.2 | Spec App G |
| Business Rules sections 9-12 | Supplied; summarised in BUSINESS-RULES-SUMMARY.md | BR |
| What changed since 2021? | [CHANGES-2026-vs-2021.md](CHANGES-2026-vs-2021.md) | Spec App G; BR App D |

## A. Establishments

1. **The 8 inferred NADC flags.** Rows 433, 434, 436, 437, 438, 249, 359 and 251 were inferred, not read directly (the read tool does not keep column positions, so the Y column was taken from a column-aware text extract of the same WA Health publication, edition not stated; its Y total, 125, agrees with the supplied May 2026 PDF). Please confirm these eight.
2. **Why do private hospitals report?** 602 Bethesda, 612, 629 and 6007 reach the NADC although BR excludes "services delivered by private hospitals to private patients". Is this publicly funded activity at contracted providers (client type OP; DD pp.10-11), and does the new `appointment_contracting_estab_number` element apply?
3. **HIT and RSH "not to be reported" (BR App A) but 652 Silver Chain Hospital at Home reports.** What is reported for it?
4. **Community and referral-code (RC) sites.** BR §10.1.1 excludes community health settings. Which of the 2 RC and 14 OH sites carry outpatient activity?
5. **Three sites cannot be placed on the map** (4275, 4506, 0652) and others are approximate (listed in ESTABLISHMENTS.md). Where are they?
6. **HSP and region for each site.** The List has none. We used SLIP and the CRS page, with 8 assumed. Is there an official site → HSP concordance? Is the planned Women, Babies and Children HSP (July 2027) relevant to the List?
7. **Edition.** Is v0.1 (May 2026) final? 3 reporting sites have no type in the List (why?).

## B. Rules and data

8. **DNA and outcome.** Spec App B lists *Appointment Outcome Code* as Mandatory, but BR §9.3.2 says it is not used for a DNA. What does a DNA row carry?
9. **Future bookings.** BR §10.2.6 says a booked appointment leaves the referral waiting. Are future appointments (status FU) present in extracts? The sim has no future-booking data.
10. **VID after 30 June 2023.** DD end-dates VID; we assume historical video appointments become THH. Correct?
11. **THH vs THS definitions** differ between BR §9.5.2 and the DD. Which governs?
12. **Same-day rule.** BR §10.3.2 and §11.3.2 word the national same-day rule differently, and the sim uses the local all-appointments rule. Which should KPIs use?
13. **Tier 1 / Tier 2 pairing.** We pair each clinic category with a Tier 1 and a Tier 2 code by judgement. Is there an official pairing?
14. **Telehealth site.** For THC / THH / THS, which establishment code is reported (BR §11.3.5 counts both ends)?
15. **Where does a Technical transfer link live?** Is the original referral account number carried on the new referral?
16. **Reschedule.** webPAS patient "cancel" = reschedule (BR §9.6). Is the reschedule count / reason (conditional elements) populated in practice, and would the sim's "cancelled" events then mostly be reschedules?
17. **Validation Manual.** Not in hand. Which validation rules (referral / clinic category mismatch, five-working-day triage) would change what a user sees? Historical search extracts are in OFFICIAL-EXCERPTS.md and are not authoritative.
18. **Spec format.** csv or double-pipe delimited (Spec §4.1 vs App G)?
19. **Blank App G bullet** (Appendix F, p.60): what was meant?

## C. Geography

20. **Region and district assignment.** We follow SLIP HEALTH-002 (34 districts, 10 regions). Is that what the custodian uses?
21. **Postcode → district concordance** for residence mapping.
22. **Licence** of SLIP HEALTH layers ("not specified"): may boundaries and coordinates be redistributed with attribution?

## D. Using the demo

23. Would the custodian support an official "Preview Synthetic Data" sample for the NADC (offered for EDDC, HMDC, MHDC, MNS, WACR)? Our 25-row samples in 2026 column style (`data/sample/`) could start it.
24. Which indicators are meaningful from NADC alone, and which need linkage?
25. **Approvals** (data request, HREC or QI exemption) before any real data is used.
