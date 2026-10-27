# OutpatientFlow WA

**An animated picture of how referrals move through Western Australia's public hospital outpatient services: how many people are waiting for a first appointment, how many are in care, and how many appointments were not attended.**

> ⚠️ **SYNTHETIC EXAMPLE DATA.** Every person, referral, appointment, wait time and count in this demo is invented by a seeded random generator. The *structure* (field names, code sets, priority timeframes) follows the WA Health Non-Admitted Data Collection (NADC) documents, and the *establishments and boundaries* are public reference data. Nothing here describes real activity at any hospital, clinic or person.

**Live demo:** https://metadata-team-member.github.io/OutpatientFlow-WA/

**Documents:** [Sources (four official 2026 documents)](docs/SOURCES.md) · [Establishments](docs/ESTABLISHMENTS.md) · [2026 vs 2021 changes](docs/CHANGES-2026-vs-2021.md) · [Business rules summary](docs/BUSINESS-RULES-SUMMARY.md) · [Open questions for the custodian](docs/OPEN-QUESTIONS.md) · [Data requirements](docs/DATA-REQUIREMENTS.md) · [Dictionary mapping](docs/DATA-DICTIONARY-MAPPING.md) · [Official excerpts](docs/OFFICIAL-EXCERPTS.md) · [Language guide](docs/LANGUAGE-GUIDE.md) · [Research log](docs/RESEARCH-LOG.md)

![Desktop view](docs/img/desktop.png)

## The idea

Every small marker is one **referral**. All markers have the same shape and size. They stand for referrals, not for people, and they say nothing about anyone's build, age, sex or health.

1. **Map.** Referrals start in the WA health region of residence (10 regions, real boundaries), with a Perth metro inset. Establishments sit at their real coordinates.
2. **Waiting for a first appointment.** Markers wait in a lane by referral priority (Urgent, Semi-urgent, Not urgent). A red dashed line marks the Business Rules timeframe (30, 90 and 365 days), and each lane shows the share of first attended appointments seen within it. A marker past its timeframe has a red outline and a concerned expression.
3. **Outpatient services.** Five Health Service Provider panels (and an establishment spotlight) show activity. When a person has an appointment the marker walks to a clinic door and the door glows. Each *attended* appointment (an appointment outcome was allocated) adds to the marker's rings.
4. **Did not attend (DNA) and cancelled.** An appointment that was not attended flashes amber; a cancellation is grey. Telephone and telehealth appear as a beam.
5. **Closure.** The referral closes with a closure reason from the Data Dictionary (treatment completed, discharge policy, transferred, and so on).

**Ring size = number of attended outpatient events (service use).** No ring means no attended events yet. More and wider rings mean a higher count. *Lower service use* and *higher service use* are plain counts of attended events. They are not a judgement about the care a person needed. See the [language guide](docs/LANGUAGE-GUIDE.md) for the terms used and avoided. The simulation opens **paused**; press **Play**.

## What changed in round 3 (official 2026 documents)

The project owner supplied four official WA Health documents: the **Business Rules (July 2026)**, **Data Specifications (July 2026)**, **Data Dictionary (2026)** and the **Establishment List (May 2026, v0.1)**. The simulation was realigned to them ([sources](docs/SOURCES.md)).

* **Reporting establishments = Reports to NADC = Y.** **125 establishments**: NMHS 9, SMHS 7, EMHS 7, CAHS 1, WACHS 101 ([list](docs/ESTABLISHMENTS.md)). Codes, names and types are official. **HSP, region and map positions are not in the List**; they come from SLIP and the CRS page and are marked as non-official. Eight of the NADC flags are inferred (see the Honest limits).
* **2026 data model.** snake_case field names and ISO dates; attendance code ATT / DNA / DNW / MCC / NCE; Clinic Category with NMDS Tier 1 and Tier 2 codes (22 categories); closure code ESC; OPM = Technical transfer; delivery modes THH / THS / THC / TEL (VID only up to 30 June 2023).
* **Business rules in the sim.** DNA, cancelled and chart-only / MCC events leave a referral waiting; chart-only and MCC events are shown as grey non-client events (BR §10.2.7); OPM referrals are not counted as waiting for a first appointment ([24 rules with sections](docs/BUSINESS-RULES-SUMMARY.md)).
* **Dropped:** adult psychiatry (out of scope, BR §6.11) and all "unverified code" placeholders.
* [What changed from 2021 to 2026](docs/CHANGES-2026-vs-2021.md) and [open questions](docs/OPEN-QUESTIONS.md).

Round 2 (July 2021 mirrors, SLIP-flag establishment list of 117) is recorded in [docs/RESEARCH-LOG.md](docs/RESEARCH-LOG.md).

## Language review (round 4)

All text, labels, tooltips, alt text and documents were reviewed against WA Health and Dictionary wording. Markers are one uniform shape; service use is shown by rings; wording is person-first and count-based. Details, terms avoided and reasons are in [docs/LANGUAGE-GUIDE.md](docs/LANGUAGE-GUIDE.md).

## What the demo includes

* KPI strip: referrals received (12 months), people waiting for a first appointment, first appointments within target, median wait, did not attend (DNA) rate, attended events per person.
* Charts: wait by priority against target, monthly flow, HSP comparison (in person, telehealth, DNA, cancelled), region comparison, clinic categories with the most attended appointments.
* About 11,000 referrals and 39,000 events across 102 active establishments (of the 125), July 2022 to June 2026. Playback runs July 2023 to June 2026.
* A six-step **guided tour** (header button, intro card, or `?tour=1`): the markers, people in care and people waiting (service use), waiting against targets, did not attend and cancelled, telehealth, and what is real versus synthetic. Every figure in the tour text is computed from the loaded data. Arrow keys move through it and Esc closes it.
* Print / Save as PDF button: a landscape print layout (scene on page 1, charts after). Keyboard skip link, visible focus rings, and muted text lifted to at least 4.5:1 contrast on the panels.
* Plain HTML, CSS and JavaScript on a canvas. No build step, no framework, no CDN, no tracking.

## Run it locally

```bash
git clone https://github.com/Metadata-Team-Member/OutpatientFlow-WA.git
cd OutpatientFlow-WA
python3 -m http.server 8080      # or: npm run serve
# open http://localhost:8080
```

The site loads `data/synthetic.json`. You do not need Node to view it.

## Regenerate the fake data

Needs Node 18 or newer. The generator is seeded, so the same seed always gives the same data.

```bash
node tools/generate_synthetic.mjs --patients 11000 --seed 20261027   # data/csv/*.csv (git-ignored) and data/sample/*.sample.csv
node tools/build_data.mjs                                            # data/synthetic.json
# or both: npm run data
```

Code sets are in `config/dimensions.json` (from the 2026 Specification). The **sampling weights, tiers and scope are invented**. Establishments come from `data/reference/establishments.json`.

## Rebuild the reference data

```bash
node tools/fetch_reference.mjs            # downloads SLIP HEALTH-001/002 into data/reference/raw (git-ignored)
/path/to/python tools/build_geo.py        # needs shapely 2.x; writes wa_regions.geojson, perth_metro.geojson
node tools/build_establishments.mjs       # writes data/reference/establishments.json
node tools/build_establishments_doc.mjs   # writes docs/ESTABLISHMENTS.md
```

## Plug in real data (with approval)

1. Get approval first. See [section 7 of the requirements log](docs/DATA-REQUIREMENTS.md#7-privacy-ethics-and-governance). **Do not commit real data and do not host it on public GitHub Pages.**
2. Produce `referrals.csv` and `appointments.csv` with the columns in [the mapping](docs/DATA-DICTIONARY-MAPPING.md). `data/sample/` has 25-row examples. Header names are case-insensitive, a BOM is fine, and dates may be `DDMMYYYY` (optionally followed by a time), `DD/MM/YYYY` or `YYYY-MM-DD`.
   - Required columns (2026 names, matched case-insensitively): referrals `establishment_code, referral_account_number, referral_received_date, referral_priority_code, derived_health_district`; appointments `referral_account_number, appointment_date, appointment_delivery_mode_code`. The 2021 upper-case names still work.
   - `--real` has been exercised only against a **small fake extract** (`npm run test:real`), never against real data. Treat the first real run as a trial: read the "Notes" list it prints.
3. Update `config/dimensions.json` with the real code lists if they differ. Codes the file does not know (up to 16 delivery modes and 64 of each other list) are appended automatically and reported, and referrals from unknown establishments or districts are skipped and counted, never silently dropped.
4. Build it:

   ```bash
   node tools/build_data.mjs --referrals my_refs.csv --appointments my_apps.csv --out data/real.json --real
   # optional: --start 2021-07-01 --end 2026-06-30 --sim-start 2023-07-01  (window of at most 2,047 days)
   ```
   Without `--start`/`--end` the window runs from the earliest received date (at most about 5.5 years before the latest) to the latest received date; appointments after it (future bookings) are dropped and counted. Output names must not be `data/synthetic.json`. `data/real*.json` is git-ignored.
5. Open `index.html?data=real.json` from a private server. The banner changes from "SYNTHETIC EXAMPLE DATA" to "Real extract (approved use only)".

## Project layout

```
index.html              page
css/style.css           styles
js/data.js              loads and indexes the data file, derived measures
js/sprites.js           the markers and their rings (service use)
js/scene.js             canvas scene: map, queue lanes, HSP cells, establishment spotlight, playback
js/charts.js            small charts
js/tour.js              guided tour
js/ui.js                filters, KPIs, controls, dialogs, click-card
config/dimensions.json  code sets (from the Specification) and invented weights
tools/                  generators, reference-data builders
data/synthetic.json     what the site loads (synthetic)
data/reference/         establishments and boundaries (public reference data)
data/sample/            25-row sample CSVs in Specification column style
docs/                   sources, establishments, rules summary, open questions, requirements
```

URL options: `?t=2025-03-01` start date, `?autoplay=1`, `?speed=4`, `?density=8` (show 1 in N markers), `?color=stage|spec|region|prio`, `?data=file.json`, `?tour=1`.

## Honest limits

* Synthetic activity: no real patterns, and no conclusions about real services.
* **Establishment flags.** The Establishment List PDF could be read only as text without column positions, so the Reports to NADC flags were taken from a column-aware text extract of the same WA Health publication (via search; edition not stated) and cross-checked against the supplied May 2026 PDF's count of 125. **Eight rows are inferred** (433, 434, 436, 437, 438, 249, 359, 251) and are marked ‡. The custodian should confirm them.
* **HSP, region and coordinates are not official**; they are not in the Establishment List. Three sites cannot be placed on the map and a few positions are approximate (⚑ in the establishment table).
* Not in the documents, so assumed: the Tier 1 / Tier 2 pairing per clinic category; how a DNA row carries an outcome; VID becoming THH after 30 June 2023; whether future bookings are in extracts. See [open questions](docs/OPEN-QUESTIONS.md).
* Conflicts with the sim's concept are listed at the end of the [rules summary](docs/BUSINESS-RULES-SUMMARY.md): adult psychiatry and community care are excluded by the rules, and some private hospitals and a home-care service report anyway.
* The Validation Manual and the Information Compendium were not supplied; no validation rules are simulated.
* The markers are a visual device. They are not people, the rings are a count of attended events, and nobody should be judged by them. Do not use the picture to make decisions about an individual.

## Attribution and licence

* Code: MIT. See [LICENSE](LICENSE).
* Establishment and boundary data: © Government of Western Australia, Department of Health, via SLIP (Landgate) / data.wa.gov.au, datasets HEALTH-001 (Health Hospitals) and HEALTH-002 (Health Districts). The catalogue lists the licence as **"not specified"**; reuse is subject to confirmation ([open question 12](docs/OPEN-QUESTIONS.md)). Boundaries are simplified for display.
* "WA Health", "NADC" and related names belong to the Western Australian Department of Health. This is an independent prototype and is not endorsed by it.
