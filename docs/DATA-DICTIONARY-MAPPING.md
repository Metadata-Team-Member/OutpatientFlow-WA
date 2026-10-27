# Dictionary mapping (extract columns → dictionary concepts)

**Draft.** This table maps the columns used in this repository to the dictionary concepts we expect to find in the WA Health Non-Admitted Data Collection (NADC) Data Dictionary. The WA PDFs were not reachable when this was written, so concept names lean on AIHW METEOR. ❓ means "needs checking against the current WA dictionary". Replace the right-hand column with the exact element names and numbers once confirmed.

| Extract column | Used in the demo for | Expected concept | Confirm in WA dictionary |
|---|---|---|---|
| `REF_ID` | Character identity | Referral identifier | ❓ exists? |
| `PER_PERSON_ID` | Several referrals per person | Pseudonymised person key | ❓ project-specific |
| `REF_RECEIVED_DATE` | Start of wait; spawn time | Referral received date | ❓ |
| `REF_PRIORITY_CODE` | Waiting lane, colour, target line | Referral priority / urgency category | ❓ code list and target days |
| `REF_SOURCE_CODE` | Click-card; internal sources start "inside" | Referral source | ❓ code list |
| `CLINIC_CATEGORY_CODE` | Door on the building | Clinic / specialty category | ❓ code list |
| `ESTABLISHMENT_ID` | Which building | Establishment identifier | ❓ list |
| `REF_DISCHARGE_DATE` | Leaves the courtyard | Referral end / discharge date | ❓ |
| `REF_CLOSURE_REASON_CODE` | Exit style | Referral closure reason | ❓ code list |
| `PER_ADDRESS_POSTCODE` | Region lookup | Patient postcode | ❓ |
| `PER_REGION_CODE` | Map and filter | Derived region (not a source field) | derived |
| `PER_AGE_YEARS` | Age group on the click-card and filter | Derived from date of birth | derived |
| `PER_INDIGENOUS_STATUS_CODE` | Stored, not displayed on cards | Indigenous status | ❓ governance first |
| `PRIOR_ATTENDED_24M` | Starting size of a character | Derived count of earlier attended events | derived |
| `APP_ID` | De-duplication | Service event identifier | ❓ |
| `APP_DATE` | Event time | Service event date | ❓ |
| `APP_ATTENDANCE_CODE` | Attend / DNA / did not wait | Attendance status | ❓ code list |
| `APP_NON_ATTENDANCE_REASON_CODE` | DNA marker | Non-attendance reason | ❓ |
| `APP_DELIVERY_TYPE_CODE` | In-person v telehealth | Service delivery mode | ❓ code list |
| `APP_NEW_FOLLOWUP_CODE` | First attended appointment | New / follow-up | ❓ |
| `APP_OUTCOME_CODE` | Exit arrows | Service event outcome | ❓ code list |

The code lists the demo uses (in `config/dimensions.json`) are **illustrative**. Do not copy them into a real build without checking them against the dictionary.
