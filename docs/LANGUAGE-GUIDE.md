# Language guide

OutpatientFlow WA is built to be shown to the WA Health data custodian. Its wording is meant to be plain, respectful and consistent with WA Health and NADC terminology. This guide records the choices so they can be checked, changed or reused.

**All data is SYNTHETIC.** Nothing on screen describes a real person, clinic or service.

## 1. Principles

1. **Describe counts and events, not people.** A marker is a *referral*. It is not a person and it has no body, age, sex, health status or character.
2. **Person-first and non-judgemental.** "People waiting for a first appointment", "people who did not attend". Not "waiters", "no-shows" or "defaulters".
3. **Use the official words** from the *Non-Admitted Data Collection (NADC) Data Dictionary 2026*, the *Business Rules (July 2026)* and the *Data Specifications (July 2026)* wherever they exist (see [SOURCES.md](SOURCES.md)). Official codes such as ATT, DNA, DNW, NCE, OPM and ESC are kept as written.
4. **Australian English**, at a plain government reading level, with short sentences.
5. **Do not describe anyone's body.** Nothing in the interface, documents, code comments, data labels or alt text refers to a person's size, shape or weight, or implies that a person is thin, large, full or empty.
6. **No stigmatising language** about mental health, remoteness, age, disability or Aboriginal people. Aboriginal status is not shown or used in the prototype. When mentioned in documents it follows WA Health convention ("Aboriginal people", "Aboriginal status").

## 2. How each visual encoding is described

| What you see | How it is described in the interface | What it is *not* |
|---|---|---|
| A small marker | "One marker = one referral." All markers have the same gender-neutral shape and size, with a leaf sprout. | A person, or a measure of anyone's body or health |
| Rings on the ground around a marker | "**Ring size = number of attended outpatient events (service use).**" No ring = no attended events so far. More and wider rings = a higher count. A marker gains a ring when an appointment is attended. | A measure of need, quality or appropriateness of care |
| Marker colour | A colour set by the filter "Colour markers by" (stage, referral priority, region or clinic category). | A characteristic of the person |
| Red outline and concerned expression | "Past the target timeframe" for the referral priority (BR timeframes: 30, 90 and 365 days). | A judgement about the person or the service |
| Amber flash at a door | "Appointment not attended (DNA)". | A reason; reasons are recorded in the data and are not assumed |
| Grey flash | "Cancelled" (or a non-client event, shown separately and never ending the wait). | |
| Blue beam | Telephone or telehealth appointment (no walking). | |
| Panel 2 | "Waiting for a first appointment" (people with no first attended appointment yet). | |
| Panel 3 | "Outpatient services" (people with at least one attended appointment), by Health Service Provider. | |

**Definition note shown beside the legend:** *Lower service use* and *higher service use* are plain counts of attended outpatient events, including attended events in the prior 24 months. They say nothing about whether a person received too little or too much care.

### Why "lower / higher service use" and not "under-serviced / over-serviced"

Under-serviced and over-serviced are *evaluative*: they say care was less or more than it should have been. A count of attended events cannot show that. A person may have a high count because they need frequent care, or a low count because a single visit resolved the problem. The labels could also be read as a judgement about patients, clinicians or the health service. So the interface uses the neutral, count-based pair **lower service use** and **higher service use**. If the custodian prefers different labels, the strings are in `js/ui.js` (legend and card), `js/tour.js`, `index.html` (How to read this) and this guide.

## 3. Terminology used

| Used | Source or reason |
|---|---|
| patient | Dictionary / Business Rules term for the client of an outpatient service. Used where the documents use it (for example "patient not present" for MCC). Elsewhere "person" or "people" is preferred. |
| referral; referral received date; Referral Account Number | Specification element names. |
| referral priority: Urgent (URG), Semi-urgent (SEM), Not urgent (NUR) | Official priority names and codes; targets of 30, 90 and 365 days per BR. |
| people waiting for a first appointment | Derived per BR §10.2: the wait ends only when the first appointment is attended. |
| first appointment attended / attended appointment (ATT, MCC) | MDG-10-001 attended outpatient appointment definition, as summarised in [OFFICIAL-EXCERPTS.md](OFFICIAL-EXCERPTS.md). |
| service event / attended outpatient events | Used for the count of attended events. |
| did not attend (DNA); did not wait (DNW) | Dictionary values of appointment attendance. "Did not attend (DNA)" is written out at first use. |
| cancelled | Dictionary appointment outcome. |
| non-client event / chart only; MCC | Business Rules §6.9 and §10.2.7; these never end the wait. |
| non-admitted | NADC scope term. |
| Reports to NADC | The column of the Establishment List that identifies the 125 establishments reporting to the collection. |
| Health Service Provider (HSP) | Official. |
| Technical transfer (OPM) | 2026 referral reason. |
| residential district; region of residence | Plain wording for the derived district and WA Health region fields. |
| people in care | Plain wording for people with at least one attended appointment (not an official term). |
| service use | Plain count-based name for attended outpatient events; not an official term. |

## 4. Terms avoided, and why

| Avoid | Use instead | Why |
|---|---|---|
| skinny, thin, slim, fat, broad, heavy, larger or bigger (about a marker or person), grows, shrinks, bloated, obese, chubby, starving, feeding, body weight | "lower service use", "higher service use", "rings", "more attended events" | Describes bodies, or implies that people are small or large for the care they receive. This is body-shaming. |
| characters, lemmings, blobs, crowd, herd | markers, referrals, people (where people are meant) | Reduces people to creatures or masses. |
| frequent flyer, heavy user, high-cost patient, burden, load | "higher service use", "most attended appointments" | Blames or labels patients. |
| non-compliant, defaulter, no-show, truant | "did not attend (DNA)" | Implies fault. The reason is recorded separately and is not assumed. |
| victim, sufferer, suffering from | "person with…" (only if the diagnosis is ever shown; it is not) | Person-first language. |
| elderly, the aged, vulnerable (as a label) | "older people", or the actual age group | Avoid labels; be specific. |
| waiting list (as a thing people are "on" in headings) | "people waiting for a first appointment" | Official wording derives the wait from the referral; keeps the person in the sentence. |
| wasted, failing, blamed | neutral description | The tool must not imply blame on patients or staff. |
| Indigenous (for WA) | Aboriginal people, Aboriginal status | WA Health convention. The field is not shown or used. |
| under-serviced / over-serviced | lower / higher service use | See section 2. |

### Words that still appear, and why

* **weights** in `config/dimensions.json` and `tools/generate_synthetic.mjs`: statistical sampling weights used by the data generator (for example, the share of referrals by priority). They are not about people's bodies.
* **font-weight, body** in CSS and the HTML `<body>` element: technical terms.
* **blob** in GitHub links (`.../blob/main/docs/...`): part of the GitHub URL path.
* **Academy Face and Body** (establishment 674) in [OFFICIAL-EXCERPTS.md](OFFICIAL-EXCERPTS.md): an establishment name in the official Establishment List, quoted as written.
* **Deceased**, **Patient Declined Treatment**, **Patient Left Not Seen**, **Crisis - Patient** and similar in `config/dimensions.json`: official Dictionary code labels, kept as written because the generator and any real extract must match them.

## 5. Where the wording lives

* Interface: `index.html` (intro, How to read this, Rules, Data we'd need), `js/ui.js` (KPIs, filters, legend, click-card, narration), `js/scene.js` (panel titles, pop-ups, spotlight), `js/charts.js` (chart legends), `js/tour.js` (tour steps).
* Accessibility text: the `aria-label` of the scene canvas and of each chart, the legend title text, and the tour text.
* Visual encoding: `js/sprites.js` (uniform marker; rings from `S.dims`).
* Documents: `README.md` and everything under `docs/`.

## 6. Checking the language

A repeatable check over the whole repository and over the live site:

```bash
rg -n -i -w "skinny|thin|slim|fat|heavy|larger|bigger|grow|grows|growth|shrink|starv\w*|bloated|obese|chubby|lemmings?|blobs?|wasted|burden|frequent flyers?|non-?compliant|defaulters?|victims?|suffer\w*|characters?|crowd" .
```

The remaining hits should be only those justified in section 4.
