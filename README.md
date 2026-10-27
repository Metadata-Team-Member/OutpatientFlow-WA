# OutpatientFlow WA

**An animated picture of how referrals move through Western Australia's public hospital outpatient clinics: who is waiting, who is being seen, and who does not turn up.**

> ⚠️ **SYNTHETIC EXAMPLE DATA.** Every number, hospital, person and postcode in this demo is invented by a seeded random generator. It is shaped like the WA Health Non-Admitted Data Collection (NADC) so we can design the tool before asking for real data. It says nothing about any real hospital, clinic or person. The six hospitals have made-up generic names.

**Live demo:** https://metadata-team-member.github.io/OutpatientFlow-WA/
**Data we would need:** [docs/DATA-REQUIREMENTS.md](docs/DATA-REQUIREMENTS.md) · [dictionary mapping](docs/DATA-DICTIONARY-MAPPING.md)

![Desktop view](docs/img/desktop.png)

## The idea

Every little character is one referral.

1. **Regions.** Referrals appear on a schematic map of WA, by region of residence.
2. **Waiting yard.** Waiting characters are **slim**. They line up in an urgency lane (urgent, semi-urgent, routine). The further right, the longer they have waited compared with the target line.
3. **Clinic doors.** Each hospital is a building with one door per clinic. When a person is seen, they walk through their door, the door glows, and they **grow broader** with every attended appointment.
4. **Did not attend.** A missed appointment flashes amber. They stay on the books and may try again.
5. **Discharge and closure.** People leave through the courtyard gate when the referral is closed.

So the picture reads as: slim = still outside, broad = well inside the network, and a wide gap between the two is a story worth looking into.

Use the controls to play, pause, change speed, scrub the time slider, filter by hospital, clinic, region, urgency or telehealth, change the colouring, and click any character to open its (fake) record. It opens paused; press **Play**. It works on phones too.

## What the demo includes

- KPI strip: referrals received, waiting now, median wait, attended events, did-not-attend rate, attended events per patient (inside v outside).
- Live charts: attended events per patient (inside v outside), wait so far by urgency, monthly referrals / waiting list / attended events, region comparison, and busiest clinics (click a bar to filter).
- ~10,000 referrals and ~34,000 appointments over four years of generated activity (July 2022 to June 2026). Playback runs July 2023 to June 2026.
- Everything is plain HTML, CSS and JavaScript on a canvas. No build step, no framework, no CDN, no tracking.

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
node tools/generate_synthetic.mjs --patients 10000 --seed 20261027   # writes data/csv/*.csv (git-ignored)
node tools/build_data.mjs                                            # writes data/synthetic.json
# or both: npm run data
```

Change `--patients` (5,000 to 20,000 works well) or `--seed` for a different crowd. Sites, clinics, regions and code lists live in `config/dimensions.json`.

## Plug in real data (with approval)

1. Get approval first. See [section 7 of the requirements log](docs/DATA-REQUIREMENTS.md#7-privacy-ethics-and-governance). **Do not commit real data and do not host it on public GitHub Pages.**
2. Produce `referrals.csv` and `appointments.csv` in the layout in [section 6](docs/DATA-REQUIREMENTS.md#6-suggested-extract-format). `data/sample/` has a 25-row example.
3. Update `config/dimensions.json` with the real establishment list, clinics, regions and code lists.
4. Build it:

   ```bash
   node tools/build_data.mjs --referrals my_refs.csv --appointments my_apps.csv --out data/real.json --real
   ```
5. Open `index.html?data=real.json` from a private server. The banner changes from "SYNTHETIC EXAMPLE DATA" to "Real extract (approved use only)".

## Project layout

```
index.html            page
css/style.css         styles
js/data.js            loads and indexes the data file, derived measures
js/sprites.js         the blob characters
js/scene.js           canvas scene: map, waiting yard, hospitals, event playback
js/charts.js          small charts
js/ui.js              filters, KPIs, controls, click-card
config/dimensions.json  code lists and invented sites
tools/                generator and CSV to JSON builder
data/synthetic.json   what the site loads
docs/                 data requirements and mapping
```

URL options: `?t=2025-03-01` start date, `?autoplay=1`, `?speed=4`, `?density=8` (show 1 in N characters), `?color=stage|spec|region|prio`, `?data=file.json`.

## Honest limits

- Synthetic data: no real patterns, and no conclusions about real services.
- The urgency targets (30, 90 and 365 days) are indicative placeholders.
- The WA Health data dictionary could not be fetched while this was built. Field names and code lists follow national (AIHW METEOR) concepts and need checking against the current NADC dictionary. See the requirements log.
- The characters are a metaphor. They are not people, and nobody should be judged by them.

## Licence

MIT. See [LICENSE](LICENSE).
