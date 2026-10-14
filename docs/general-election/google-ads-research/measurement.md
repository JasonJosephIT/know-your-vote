# Conversion and measurement plan

Design deliverable only. No tags, conversion actions, account settings, consent text or production variables were changed. Read with [research memo](README.md).

## What the code proves, and what it does not

`src/lib/ads.ts` enables `AW-18487967912`; `src/components/features/SitePrompts.tsx` mounts `GoogleTag` only with saved consent `granted`. The initializer sends `config`, strips the legacy `zip` query parameter from page location/referrer, and has no explicit Consent Mode API calls or conversion `send_to` labels. No evidence was found here of Ads conversion actions in the account. A tag's code presence does not prove every navigation is measured, that a campaign requires it, or that conversion tracking works.

`src/lib/analytics.ts` already exposes Plausible events: `ballot_viewed`, `district_set` (only address/picker method), `brief_viewed`, `candidate_saved`, and `voting_info_requested`. `src/app/layout.tsx` loads Plausible only with `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`. Production activation was not inspected. The handoff's “~half decline” is an unverified estimate; do not use it to double conversion totals.

Pausing a campaign is not technically required merely because a website tag is removed: ads can deliver without it, but conversion bidding/attribution can be impaired. Evaluate the existing bidding strategy and goals before deciding to pause, change bidding or remove the tag. Founder decision 2 remains open.

## Events and what success means

These are proposed new Ads conversion actions; preserve existing Plausible names and add only the necessary aggregate events. Use the real account-generated conversion label for each action, never a guessed label.

| Proposed event | Exact trigger | Role / Google count | Privacy and accuracy |
|---|---|---|---|
| `ballot_lookup_completed` | First successful district resolution or valid manual district selection **and** results shown successfully | Primary only if treated as an engaged use of KYV; count One per ad interaction | Match user intent, not input submission/error. A page view or county picker alone is not completed lookup. Sends no address, ZIP, county, district, coordinates or candidate ID. |
| `reminder_signup_confirmed` | Backend has confirmed the email subscription through the implemented opt-in flow; if no double opt-in exists, successful server acknowledgement of the consented signup | Primary; One | Do not fire on clicking submit, validation failure, duplicate subscription or merely opening the form. Never send email or hashed email. Record as accepted signup rather than confirmed-email ownership if only server acknowledgement exists. |
| `calendar_download_clicked` | Click on a functioning verified `.ics` download, recorded once per visit/action in the consenting browser | Secondary; One | It is a download click, not proof the user imported or received a reminder. Backend aggregate 2xx download count can complement it without joining to click IDs/users. |
| `donation_outbound_clicked` | Click to Zeffy from KYV | Secondary; One | Not a donation received. No amount/value, donor identity, email or external form contents. Actual donation completion needs a separate verified integration and authorization. |
| Existing `brief_viewed` / `ballot_viewed` | Existing aggregate site events | Diagnostic, not primary on page load | Avoid inflating impact with duplicate route loads or counting every candidate click as another voter. |

Keep lookup and signup goals separate; report them separately even if both are used for bidding. Use no invented monetary value for education. Once goals work, choose a single principal optimization outcome per campaign. For an Ad Grants application, confirm the chosen engaged-content outcome is meaningful under Google's [conversion rules](https://support.google.com/nonprofits/answer/117827?hl=en); page visits alone do not satisfy the recommended design.

## Preserve the current privacy promise with Basic Consent Mode

Google distinguishes **Basic**, which blocks Google tags until consent, from **Advanced**, which can send cookieless signals after denial. Basic matches KYV's current “Decline means Google does not load” promise. Do not introduce Advanced Mode or denied-user pings merely to improve reporting. [Google Consent Mode overview](https://developers.google.com/tag-platform/security/concepts/consent-mode).

Recommended sequence for implementation:

1. With unknown/declined consent or `ADS_TAG_ENABLED=false`, make no Google tag requests or conversion calls. No pre-consent storage of ad IDs for later replay.
2. After Accept, initialize the local tag queue, enqueue denied defaults, then a consent update matching the disclosed choices, **before** Google `config`/events. Load the script only after Accept. If consent language authorizes Ads measurement, set its necessary `ad_storage`/`ad_user_data` states accordingly; keep `ad_personalization` denied. Keep `analytics_storage` denied unless a separately disclosed Google analytics use is approved. Do not make Accept silently authorize a broader purpose.
3. Send conversion only when both consent and the real success trigger occur. Do not replay actions that happened before Accept. Handle Next.js navigation without reinitialization/duplicate success events.
4. On consent withdrawal, deny the states and suppress future events; audit cookie cleanup and script lifetime. Unmounting a script component is not proof a previously loaded global tag has stopped running. Provide a reliable revocation path and verify it with network inspection.

The [Basic Consent Mode implementation guide](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic) documents ordering and `ad_user_data`/`ad_personalization`. This is an implementation specification, not an assertion that the current code already supports it. Banner disclosures must match the chosen purpose before deployment.

## Data minimization specification

- Use an allowlist of event names and constant purpose/method fields, not a generic property bag.
- Suppress tags on admin, authentication callback and unsubscribe/token routes. Strip sensitive query keys and fragments from **both** page URL and referrer using a reviewed allowlist, not just the existing `zip` deletion. Don't send email, address, search text, subscriber tokens, identifiers or coordinates via event properties, page titles, URLs or automatic form collection.
- Inspect the entire network payload, not only an overridden `page_location`; vendor scripts may read the document URL. If a sensitive legacy URL is present, sanitize it before any analytics script loads or skip analytics there. Do not remove official query parameters needed for the user's task without preserving that functionality locally.
- Keep enhanced conversions, user-ID joins, Customer Match and remarketing off. No server-side forwarding of denied visitors to restore attribution.
- Review Ads tag personalization options such as disabling advertising personalization signals; a consent state alone is not a complete account configuration.
- If enabling Plausible, audit its URL/referrer capture and exclusion of token/admin routes first. Its cookieless aggregate data still requires an accurate privacy disclosure and network-payload review. Do not send input values to it.

`VotingInfo` currently posts email and `zip` in the subscription request, and county calendar URLs contain county FIPS; these product/backend data are **not** Ads conversion properties. Read actual product behavior before changing the privacy page or asserting nothing is stored. The handoff's user-location claims should not be broadened without that review.

## Reporting and decisions

Track impressions, clicks, spend and CTR from the Ads account across delivery; on-site observed Ads conversions cover consenting users who can be attributed. Platform modeling, if present, is an estimate and must be distinguished from observed events. Consent, blockers and attribution windows limit comparability. A disabled tag does not erase account click/impression data.

Use Plausible, after its privacy review, for aggregate visits and successful product actions across both consent states; it does not provide a deterministic Ads attribution of every declined visitor. Compare aggregate counts without linking people or assuming the consented cohort represents everyone.

Daily report: campaign/theme, account cost/clicks/CTR, observed lookup and signup conversions, their cost per conversion, calendar/donation clicks separately, and broken landing pages/disapprovals. Document attribution model and window in the report. Budget changes should depend on meaningful outcomes and complete destinations, not just high CTR. Do not label an ad-click or calendar-click rate as turnout impact.

## Verification required before enabling conversion bidding

| Scenario | Evidence to capture |
|---|---|
| Fresh visitor, no choice; Decline; remembered Decline; switch off | Browser network shows no Google script/measurement requests; success actions do not enqueue Google conversions |
| Accept then valid lookup/selection | Correct consent order; one labeled conversion after successful rendered result; full payload contains no location/input identifiers |
| Lookup error, invalid picker, page reload, repeated button click, client route change | No false conversion or duplicate for the same successful action |
| Signup success/error/duplicate | Successful unique subscription only; no email in Google/Plausible payloads |
| Calendar 503/empty or unstamped dates | Do not advertise it as a verified complete calendar; click metric remains a click rather than claiming import |
| Revoke after Accept | Future measurement stops; loaded global script and cookies assessed, not merely component unmount |
| Legacy `?zip=`, unsubscribe token, arbitrary address/email query, referrer | Payload inspection proves redaction/exclusion across all enabled analytics scripts |
| Account validation | Tag Assistant and actual Ads conversion diagnostics agree with the labels, goal role/count and consent behavior |

No application tests were run for this documentation-only change. CSV character limits and deliverable consistency were checked separately; the runtime checks above are future implementation acceptance criteria.
