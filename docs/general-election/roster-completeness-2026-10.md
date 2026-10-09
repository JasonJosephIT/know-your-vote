# Roster completeness worksheet, October 2026

**Status:** for the founder's review in the pull request from `claude/roster-completeness`. Nothing
here reaches a voter. The values ship in `supabase/migrations/0049_roster_completeness.sql`, which
the founder applies only after the pull request merges and a separate yes (spec D10). Spec:
`docs/superpowers/specs/2026-10-08-roster-completeness-design.md` §3.1, §3.3, §3.4.

The migration's data is generated from the tables below
(`node scripts/roster-worksheet.ts --write-migration`), and `scripts/verify-roster-worksheet.ts`
fails if the two differ. To change a value, change it here and regenerate.

## How to read the tables

- **incumbent** (D1, Recommended pending founder confirmation): Yes when the candidate serves today
  in the office, or on the body, the race elects to. For the U.S. House, the U.S. Senate, a county
  commission or a school board that means a sitting member of that body, whatever seat or district
  they hold. For Governor, Attorney General, Chief Financial Officer, Commissioner of Agriculture,
  Orange County Mayor and Orange County Clerk of the Courts it means holding the office.
- **holds_this_seat** (D1's TO FLIP): Yes only when the candidate holds this race's own seat
  number. Not stored under D1; `--write-migration --d1 seat` would store it instead, with no new
  read.
- A **No** is a checked No: `source_url` lists the body's current members, or names the office's
  current holder, without this candidate.
- **source_url** decides the row. **second_page** is a different official page naming each Yes as a
  current member or holder.
- **read_1 / read_2**: the two independent reads of the page, in UTC, at least an hour apart.
  `incumbency_verified_at` stores read_1's date.
- **evidence**: the page's own words, at most 15.
- **label**: the line voters would see beside every candidate in the race, if the display ships
  (spec §3.5, PR 2).
- Ballotpedia is a lead and a cross-check only. The county Supervisor of Elections candidate lists
  confirm ballot placement, never incumbency. The FEC decides nothing. No rule reads party.
- Races: `incumbent_id` is the one candidate with incumbent Yes; NULL when none; with two or more,
  the one holding this race's own seat, else NULL. `is_open_seat` is true exactly when
  `incumbent_id` is NULL. Neither is shown to voters (D4).
- Running mates: the Division of Elections' canDetail page. `raw_json` is the field as read, as a
  JSON string; `stored` is it with entities decoded and whitespace collapsed (D6). Later re-reads go
  in the `reread_*` columns as `<time> same` or `<time> CHANGED`.
- No-site re-checks (D11): a find in a listed race is written now; a find in a published race is
  held until after Nov 3; `withheld` marks a genuine site that is not stored.

## Method

- **Rounds.** Round 1: 2026-10-08 20:21Z to 21:20Z. Round 2: 2026-10-08 22:22Z to 22:32Z, every key at least an hour after its round 1 read. Every key compared with
  `node scripts/roster-reads.ts --compare r1 r2`; the read times below are filled from both rounds'
  `index.json` (`node scripts/roster-worksheet.ts --fill-times r1 r2`), except the browser-pane
  reads, typed by hand.
- **Browser.** Headless reads: Google Chrome 155.0.8059.39 (`--headless=new --dump-dom`, a
  throwaway profile, its own user agent unaltered). The House and Senate XML lists by plain HTTPS
  GET. The FEC was read, with the project key, in both rounds (17 calls a round).
- **Read in the browser pane instead of headless Chrome** (the visible Claude browser pane, its
  page text read with `get_page_text`, times noted by hand):
  - `https://www.myfloridalegal.com/` and `https://www.myfloridalegal.com/ag-bio` (Attorney
    General): both answer "403 Forbidden" to headless Chrome.
  - `https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map` and
    `https://www.hillsboroughschools.org/o/hcps/page/board-members` (Hillsborough school board):
    every page on the district's site ran past the 90 s limit in headless Chrome. The board's
    own landing page (`/page/school-board`) shows its members only as a photograph, so the
    district map page, whose table names the seven members by district, is the member list, and
    the board-members page (each district's panel opened to read the member's name) is the
    second page.
  - The four pane pages were read at 2026-10-08 21:51Z and again at 22:54Z, and read the same
    both times (the Attorney General named on both of his pages; the same seven Hillsborough
    board members by district). An earlier pane read made during round 1 left no recorded time,
    so it was repeated; the 21:51Z read is the round 1 read for these rows. The Hillsborough
    table and panels render after load, so their text was read from the rendered page once it
    had loaded, and each board-members panel was opened by clicking its district heading.
- **Member lists, body by body.**
  - U.S. House: the Clerk's `MemberData.xml`. Second pages: each member's house.gov site, as
    linked from `https://www.house.gov/representatives`.
  - U.S. Senate: senate.gov's `senators_cfm.xml`. Second page: the senator's site as the XML gives
    it.
  - Governor, CFO, Agriculture: the office's own home page, naming the holder; second pages are
    the office's "meet" page. Attorney General: as above, in the browser pane.
  - Broward County Commission: `broward.org/Commission/Pages/Commissioners.aspx` renders no names,
    so the nine district pages `https://www.broward.org/district1` to `district9`, each titled
    with its commissioner, together are the member list; each row cites its own seat's page.
    Second pages: the commissioner's "About" page.
  - Broward school board: `https://www.browardschools.com/school-board` (the member cards and the
    photo caption, nine members by seat). The district site has no page per member, so the
    second page is the Broward Supervisor of Elections' list of current elected officials
    (`https://browardvotes.gov/candidates/elected-officials`, "Office Holder" per office): a list
    of officeholders, not its 2026 candidate list. `browardvotes.gov` was already in
    `OFFICIAL_HOSTS`.
  - Miami-Dade County Commission: the commission home page on miamidade.gov (thirteen members by
    district); second pages: each district's page.
  - Miami-Dade school board: `https://www.dadeschools.net/SchoolBoard/members` (the page first
    listed, `/schoolboard/`, answered "404: Not Found"); second pages: the member's own
    `districtN.dadeschools.net` site, linked from that list.
  - Hillsborough County Commission: the board page on hcfl.gov (seven members by district);
    second pages: `hcfl.gov/commissioners/<name>`.
  - Orange County Commission and Mayor: the Board of County Commissioners page on
    orangecountyfl.net (the Mayor and Districts 1 to 6); second pages: the district
    commissioner's page. Districts 7 and 8 are new for 2026 and have no holder on the list.
  - Orange County school board: `https://www.ocps.net/school-board` (the Chair and Districts 1 to
    7). Gallo's second page is `https://www.ocps.net/district-1-angie-gallo`, recorded as her
    board page in `candidate-sites-2026-09-24.md`; the list links the same page on its CMS host
    (`ocps.smartsiteshost.com`).
  - Orange County Clerk of the Courts: `https://www.myorangeclerk.com/` (the Clerk Ad Interim,
    after "the departure of Clerk Tiffany Moore Russell").
- **No host was added to `OFFICIAL_HOSTS`.**
- **Governor rows.** Art. IV, section 5(b) of the Florida constitution (the two-term limit) and
  the DoE GOV ballot rows are context only; the source is the Executive Office of the Governor's
  page naming Ron DeSantis.
- **Page changes between rounds** that do not touch a member list (news items, banners) are noted
  here: the Orange County Board of County Commissioners page (`ora-cc-list`) carried a newsroom
  item, "Reception: “Color, Form, and Space” by Dorothy Gillespie", in round 1 and not in round 2,
  so the surname Gillespie (a FL-SEN candidate) matched only the first read; the Mayor and the six
  district commissioners read the same in both rounds. `drjeffdatto.com` showed different
  domain-auction listings in each round; both say the domain "has been recently registered with
  namecheap.com".
- **No-site re-checks.** Each domain recorded in `candidate-sites-2026-09-24.md` was read in both
  rounds where it serves a page; a web search on 2026-10-08 found no new lead for any of the
  nine. `damhforcongress.com` (Hosey) still has no A record (a DNS lookup at 21:53Z and at 22:54Z
  returned only its mail record), so there is no page to read; Bogen,
  McKinzie and Bendross-Mindingall have no campaign domain, so their evidence quotes the
  government page that is all there is. For a "none found" row the read times are the two
  passes that looked. `drjeffdatto.com` timed out over https; its http redirect lands on
  `https://www.drjeffdatto.com/`, which is what was read.
- **Evidence for the XML lists** quotes the district and the name as the list has them (for
  example `"FL25 Debbie Wasserman Schultz"`), or, for a No, this race's own seat.

## Summary

- **Incumbents under D1 (Recommended): 33 of 106.** House 11 (Haridopolos, Soto, Frost,
  Bilirakis, Castor, Lee, Wasserman Schultz, Moskowitz, Diaz-Balart, Salazar, Gimenez); Senate 1
  (Moody); statewide 3 (Uthmeier, Ingoglia, Simpson); Broward Commission 3 (Bogen, Fisher,
  McKinzie); Broward school board 3 (McCarthy Bulman, Cervera, Zeman); Miami-Dade Commission 2
  (Bastien, Lopez); Miami-Dade school board 2 (Bendross-Mindingall, Colucci); Hillsborough
  Commission 3 (Cohen, Myers, Wostal); Hillsborough school board 2 (Rendon, Perez); Orange
  Commission 2 (Crabb, Scott); Orange school board 1 (Gallo, the District 1 member running for
  Chair).
- **Under D1's TO FLIP (holds this race's own seat): 30 of 106.** The three who differ:
  Wasserman Schultz (holds District 25, runs in FL-20), Moskowitz (holds 23, runs in FL-25) and
  Gallo (holds District 1, runs for Chair).
- **No race has two incumbents**, so no `incumbent_id` is a literal from this worksheet; all 53
  are derived in SQL.
- **Open races (`incumbent_id` NULL), 20 of 53:** FL-GOV, FL-7, FL-11, FL-16, FL-22, FL-24;
  Broward Commission 6, Broward school board 4 and 7; Miami-Dade school board 1 (vacant);
  Hillsborough Commission 5, Hillsborough school board 2; Orange Commission 4, 7 and 8 (7 and 8
  are new seats), Orange Clerk, Orange Mayor, Orange school board 1, 2 and 3.
- **Running mates: 8 of 8** read from the Division of Elections, the same in both rounds.
- **No-site re-checks: nothing to write.** Eight of the nine still have no campaign site (none
  found); Colucci's genuine site still carries the injected casino spam, so it stays `withheld`.
  0049 writes no `official_site`; the sited count stays 97.
- **Questions for the founder: 1** (below).

## Questions for the founder

- **FL-SEN, `holds_this_seat` for Moody (D1's TO FLIP only).** The Senate list gives Moody's seat
  as Class III, and she is the only sitting senator on the ballot, so D1 and the race's
  `incumbent_id` do not depend on this. But no official page read here says the 2026 race is for
  the Class III seat: the Division of Elections names the office only "United States Senator";
  the special-election framing (Rubio's unexpired term, to January 2029) comes from news and
  Ballotpedia. The worksheet records Yes. If D1 is ever flipped to the seat rule, confirm it
  first, or change it to No (FL-SEN would then be open under the flip).

## Candidates

<!-- table:candidates -->
| candidate_id | legal_name | race_id | label | incumbent | holds_this_seat | source_url | read_1 | read_2 | second_page | evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| FL-DOE-90560 | Wilton Simpson | FL-AGR-general | Holds this office now | Yes | Yes | https://www.fdacs.gov/ | 2026-10-08T20:22Z | 2026-10-08T22:23Z | https://www.fdacs.gov/About-Us/Meet-Commissioner-Simpson | "Learn More About Commissioner Wilton Simpson What" |
| FL-DOE-92013 | Joey Mendoza Atkins | FL-AGR-general | Holds this office now | No | No | https://www.fdacs.gov/ | 2026-10-08T20:22Z | 2026-10-08T22:23Z | — | "Learn More About Commissioner Wilton Simpson What" |
| FL-DOE-89041 | James Uthmeier | FL-ATG-general | Holds this office now | Yes | Yes | https://www.myfloridalegal.com/ | 2026-10-08T21:51Z | 2026-10-08T22:54Z | https://www.myfloridalegal.com/ag-bio | "Attorney General James Uthmeier Announces Arrest of 21 Child Predators in Osceola County Sting" |
| FL-DOE-89231 | Jose Javier Rodriguez | FL-ATG-general | Holds this office now | No | No | https://www.myfloridalegal.com/ | 2026-10-08T21:51Z | 2026-10-08T22:54Z | — | "Attorney General James Uthmeier Announces Arrest of 21 Child Predators in Osceola County Sting" |
| FL-DOE-89394 | Blaise Ingoglia | FL-CFO-general | Holds this office now | Yes | Yes | https://www.myfloridacfo.com/ | 2026-10-08T20:22Z | 2026-10-08T22:22Z | https://www.myfloridacfo.com/about/meet-the-cfo | "Meet Your Chief Financial Officer Blaise Ingoglia" |
| FL-DOE-91310 | Annette Taddeo | FL-CFO-general | Holds this office now | No | No | https://www.myfloridacfo.com/ | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | "Meet Your Chief Financial Officer Blaise Ingoglia" |
| FL-DOE-89042 | Byron Donalds | FL-GOV-general | Holds this office now | No | No | https://www.flgov.com/eog/ | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | "of the Governor Ron DeSantis 46ᵀᴴ Governor of Florida" |
| FL-DOE-89243 | David Jolly | FL-GOV-general | Holds this office now | No | No | https://www.flgov.com/eog/ | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | "of the Governor Ron DeSantis 46ᵀᴴ Governor of Florida" |
| FL-DOE-84076 | Scott Eckhard Jewett | FL-GOV-general | Holds this office now | No | No | https://www.flgov.com/eog/ | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | "of the Governor Ron DeSantis 46ᵀᴴ Governor of Florida" |
| FL-DOE-90630 | Charles Burkett | FL-GOV-general | Holds this office now | No | No | https://www.flgov.com/eog/ | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | "of the Governor Ron DeSantis 46ᵀᴴ Governor of Florida" |
| FL-DOE-89571 | Frank J. Russo | FL-GOV-general | Holds this office now | No | No | https://www.flgov.com/eog/ | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | "of the Governor Ron DeSantis 46ᵀᴴ Governor of Florida" |
| FL-DOE-88529 | Moliere "Moe" Dimanche | FL-GOV-general | Holds this office now | No | No | https://www.flgov.com/eog/ | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | "of the Governor Ron DeSantis 46ᵀᴴ Governor of Florida" |
| FL-DOE-90433 | Dean Ocean Abrams | FL-GOV-general | Holds this office now | No | No | https://www.flgov.com/eog/ | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | "of the Governor Ron DeSantis 46ᵀᴴ Governor of Florida" |
| FL-DOE-89630 | Jeffrey Peter "Dr. Jeff" Datto | FL-GOV-general | Holds this office now | No | No | https://www.flgov.com/eog/ | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | "of the Governor Ron DeSantis 46ᵀᴴ Governor of Florida" |
| FL-DOE-89909 | Maxwell Alejandro Frost | FL-10-general | Member of the U.S. House now | Yes | Yes | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://frost.house.gov/ | "FL10 Maxwell Frost" |
| FL-DOE-91717 | Joe Strada | FL-11-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL11 Daniel Webster" |
| FL-DOE-91715 | James Pericola | FL-11-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL11 Daniel Webster" |
| FL-DOE-88517 | Ralph Groves | FL-11-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL11 Daniel Webster" |
| FL-DOE-88868 | Gus Michael Bilirakis | FL-12-general | Member of the U.S. House now | Yes | Yes | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://bilirakis.house.gov/ | "FL12 Gus M. Bilirakis" |
| FL-DOE-89453 | Kimberly Overman | FL-12-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL12 Gus M. Bilirakis" |
| FL-DOE-89778 | Branden Scrivener | FL-12-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL12 Gus M. Bilirakis" |
| FL-DOE-91313 | Mike Beltran | FL-14-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL14 Kathy Castor" |
| FL-DOE-88870 | Kathy Castor | FL-14-general | Member of the U.S. House now | Yes | Yes | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://castor.house.gov/ | "FL14 Kathy Castor" |
| FL-DOE-92395 | Brian Lambert | FL-14-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL14 Kathy Castor" |
| FL-DOE-89121 | Laurel Lee | FL-15-general | Member of the U.S. House now | Yes | Yes | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://laurellee.house.gov/ | "FL15 Laurel M. Lee" |
| FL-DOE-89116 | Robert People | FL-15-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL15 Laurel M. Lee" |
| FL-DOE-90251 | Sydney Gruters | FL-16-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL16 Vern Buchanan" |
| FL-DOE-90779 | Kelly Kirschner | FL-16-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL16 Vern Buchanan" |
| FL-DOE-89623 | Mark Davis | FL-16-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL16 Vern Buchanan" |
| FL-DOE-91278 | Brent Andersen | FL-20-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL20 Vacancy due to the resignation of Sheila Cherfilus-McCormick, April 21, 2026." |
| FL-DOE-91577 | Debbie Wasserman Schultz | FL-20-general | Member of the U.S. House now | Yes | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://wassermanschultz.house.gov/ | "FL25 Debbie Wasserman Schultz" |
| FL-DOE-90814 | Kedner Maxime | FL-20-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL20 Vacancy due to the resignation of Sheila Cherfilus-McCormick, April 21, 2026." |
| FL-DOE-92109 | Casey Askar | FL-22-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL22 Lois Frankel" |
| FL-DOE-89301 | Pia Dandiya | FL-22-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL22 Lois Frankel" |
| FL-DOE-90703 | Te Mayonna Brown | FL-24-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL24 Frederica S. Wilson" |
| FL-DOE-91544 | Oliver G. Gilbert III | FL-24-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL24 Frederica S. Wilson" |
| FL-DOE-89801 | Scott Singer | FL-25-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL25 Debbie Wasserman Schultz" |
| FL-DOE-88911 | Jared Moskowitz | FL-25-general | Member of the U.S. House now | Yes | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://moskowitz.house.gov/ | "FL23 Jared Moskowitz" |
| FL-DOE-92357 | Peter Jassenoff | FL-25-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL25 Debbie Wasserman Schultz" |
| FL-DOE-90330 | Mario Diaz-Balart | FL-26-general | Member of the U.S. House now | Yes | Yes | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://mariodiazbalart.house.gov/ | "FL26 Mario Diaz-Balart" |
| FL-DOE-89980 | Nicole Locklin | FL-26-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL26 Mario Diaz-Balart" |
| FL-DOE-92137 | Deborah Ann Meidinger Hosey | FL-26-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL26 Mario Diaz-Balart" |
| FL-DOE-90721 | Maria Elvira Salazar | FL-27-general | Member of the U.S. House now | Yes | Yes | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://salazar.house.gov/ | "FL27 Maria Elvira Salazar" |
| FL-DOE-89933 | Eliott Rodriguez | FL-27-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL27 Maria Elvira Salazar" |
| FL-DOE-91226 | Carlos A. Gimenez | FL-28-general | Member of the U.S. House now | Yes | Yes | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://gimenez.house.gov/ | "FL28 Carlos A. Gimenez" |
| FL-DOE-91699 | Phil "Felipe" Ehr | FL-28-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL28 Carlos A. Gimenez" |
| FL-DOE-90340 | Eddy Rojas | FL-28-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL28 Carlos A. Gimenez" |
| FL-DOE-90696 | Ryan Elijah | FL-7-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL07 Cory Mills" |
| FL-DOE-90631 | Bale Dalton | FL-7-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL07 Cory Mills" |
| FL-DOE-92377 | Christopher Dennison | FL-7-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL07 Cory Mills" |
| FL-DOE-89522 | Mike Haridopolos | FL-8-general | Member of the U.S. House now | Yes | Yes | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://haridopolos.house.gov/ | "FL08 Mike Haridopolos" |
| FL-DOE-90831 | Jennifer Jenkins | FL-8-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL08 Mike Haridopolos" |
| FL-DOE-91337 | Dan Green | FL-9-general | Member of the U.S. House now | No | No | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "FL09 Darren Soto" |
| FL-DOE-89339 | Darren Soto | FL-9-general | Member of the U.S. House now | Yes | Yes | https://clerk.house.gov/xml/lists/MemberData.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://soto.house.gov/ | "FL09 Darren Soto" |
| FL-DOE-89119 | Ashley Moody | FL-SEN-general | Member of the U.S. Senate now | Yes | Yes | https://www.senate.gov/general/contact_information/senators_cfm.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | https://www.moody.senate.gov/ | "Moody (R-FL)" |
| FL-DOE-90009 | Angie Nixon | FL-SEN-general | Member of the U.S. Senate now | No | No | https://www.senate.gov/general/contact_information/senators_cfm.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "Moody (R-FL)" |
| FL-DOE-89955 | Neil J. Gillespie | FL-SEN-general | Member of the U.S. Senate now | No | No | https://www.senate.gov/general/contact_information/senators_cfm.xml | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | "Moody (R-FL)" |
| FL-VF-BRO-1179 | Mark D. Bogen | FL-BRO-CC2-general | Member of the Broward County Commission now | Yes | Yes | https://www.broward.org/district2 | 2026-10-08T20:22Z | 2026-10-08T22:23Z | https://www.broward.org/district2/about | "District 2 - Mayor Mark D. Bogen" |
| FL-VF-BRO-1178 | Lamar Fisher | FL-BRO-CC4-general | Member of the Broward County Commission now | Yes | Yes | https://www.broward.org/district4 | 2026-10-08T20:22Z | 2026-10-08T22:23Z | https://www.broward.org/district4/about | "Commissioner Lamar P. Fisher About E-Mail" |
| FL-VF-BRO-1041 | Caryl Sandler Shuham | FL-BRO-CC6-general | Member of the Broward County Commission now | No | No | https://www.broward.org/district6 | 2026-10-08T20:23Z | 2026-10-08T22:23Z | — | "District 6 - Commissioner Beam Furr" |
| FL-VF-BRO-1182 | Robert McKinzie | FL-BRO-CC8-general | Member of the Broward County Commission now | Yes | Yes | https://www.broward.org/district8 | 2026-10-08T20:23Z | 2026-10-08T22:23Z | https://www.broward.org/district8/about | "District 8 - Vice Mayor Robert McKinzie" |
| FL-VF-BRO-1194 | Maura McCarthy Bulman | FL-BRO-SB1-general | Member of the Broward County School Board now | Yes | Yes | https://www.browardschools.com/school-board | 2026-10-08T20:23Z | 2026-10-08T22:24Z | https://browardvotes.gov/candidates/elected-officials | "Maura McCarthy Bulman (District 1)." |
| FL-VF-BRO-1191 | Nicole Morst | FL-BRO-SB4-general | Member of the Broward County School Board now | No | No | https://www.browardschools.com/school-board | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Lori Alhadeff (District 4)," |
| FL-VF-BRO-1184 | Adam Cervera | FL-BRO-SB6-general | Member of the Broward County School Board now | Yes | Yes | https://www.browardschools.com/school-board | 2026-10-08T20:23Z | 2026-10-08T22:24Z | https://browardvotes.gov/candidates/elected-officials | "Adam Cervera, Esq. (District 6)," |
| FL-VF-BRO-1172 | Roberto Fernandez III | FL-BRO-SB6-general | Member of the Broward County School Board now | No | No | https://www.browardschools.com/school-board | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Adam Cervera, Esq. (District 6)," |
| FL-VF-BRO-1254 | Cynthia Alceus Dominique | FL-BRO-SB7-general | Member of the Broward County School Board now | No | No | https://www.browardschools.com/school-board | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Nora Rupert (District 7)," |
| FL-VF-BRO-1195 | Allen Zeman | FL-BRO-SBAL8-general | Member of the Broward County School Board now | Yes | Yes | https://www.browardschools.com/school-board | 2026-10-08T20:23Z | 2026-10-08T22:24Z | https://browardvotes.gov/candidates/elected-officials | "Dr. Allen Zeman Countywide At-Large Seat 8" |
| FL-VF-DAD-2964 | Marleine Bastien | FL-DAD-CC2-general | Member of the Miami-Dade County Commission now | Yes | Yes | https://www.miamidade.gov/global/government/commission/home.page | 2026-10-08T20:23Z | 2026-10-08T22:24Z | https://www.miamidade.gov/global/government/commission/district02/home.page | "Marleine Bastien District 2" |
| FL-VF-DAD-2949 | Vicki L. Lopez | FL-DAD-CC5-general | Member of the Miami-Dade County Commission now | Yes | Yes | https://www.miamidade.gov/global/government/commission/home.page | 2026-10-08T20:23Z | 2026-10-08T22:24Z | https://www.miamidade.gov/global/government/commission/district05/home.page | "Vicki L. Lopez District 5" |
| FL-VF-DAD-2998 | Rob Piper | FL-DAD-CC5-general | Member of the Miami-Dade County Commission now | No | No | https://www.miamidade.gov/global/government/commission/home.page | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Vicki L. Lopez District 5" |
| FL-VF-DAD-3076 | Linda Cothiere | FL-DAD-SB1-general | Member of the Miami-Dade County School Board now | No | No | https://www.dadeschools.net/SchoolBoard/members | 2026-10-08T21:08Z | 2026-10-08T22:26Z | — | "Vacant District 1 Present Term: TBD" |
| FL-VF-DAD-3070 | Katrina Wilson | FL-DAD-SB1-general | Member of the Miami-Dade County School Board now | No | No | https://www.dadeschools.net/SchoolBoard/members | 2026-10-08T21:08Z | 2026-10-08T22:26Z | — | "Vacant District 1 Present Term: TBD" |
| FL-VF-DAD-2926 | Dorothy Bendross-Mindingall | FL-DAD-SB2-general | Member of the Miami-Dade County School Board now | Yes | Yes | https://www.dadeschools.net/SchoolBoard/members | 2026-10-08T21:08Z | 2026-10-08T22:26Z | https://district2.dadeschools.net/ | "Dr. Dorothy Bendross-Mindingall District 2" |
| FL-VF-DAD-2953 | Monica Colucci | FL-DAD-SB8-general | Member of the Miami-Dade County School Board now | Yes | Yes | https://www.dadeschools.net/SchoolBoard/members | 2026-10-08T21:08Z | 2026-10-08T22:26Z | https://district8.dadeschools.net/ | "Ms. Monica Colucci Vice Chair District 8" |
| FL-VF-HIL-2880 | Jackie Toledo | FL-HIL-CC1-general | Member of the Hillsborough County Commission now | No | No | https://hcfl.gov/government/board-of-county-commissioners | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Harry Cohen District 1" |
| FL-VF-HIL-2640 | Harry Cohen | FL-HIL-CC1-general | Member of the Hillsborough County Commission now | Yes | Yes | https://hcfl.gov/government/board-of-county-commissioners | 2026-10-08T20:23Z | 2026-10-08T22:24Z | https://hcfl.gov/commissioners/harry-cohen | "Harry Cohen District 1" |
| FL-VF-HIL-2646 | Luiz F. F. Garcia | FL-HIL-CC3-general | Member of the Hillsborough County Commission now | No | No | https://hcfl.gov/government/board-of-county-commissioners | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Gwen Myers District 3," |
| FL-VF-HIL-2621 | Gwen Myers | FL-HIL-CC3-general | Member of the Hillsborough County Commission now | Yes | Yes | https://hcfl.gov/government/board-of-county-commissioners | 2026-10-08T20:23Z | 2026-10-08T22:24Z | https://hcfl.gov/commissioners/gwen-myers | "Gwen Myers District 3," |
| FL-VF-HIL-2661 | Stacy Hahn | FL-HIL-CC5-general | Member of the Hillsborough County Commission now | No | No | https://hcfl.gov/government/board-of-county-commissioners | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Donna Cameron Cepeda District 5," |
| FL-VF-HIL-2636 | Neil Manimala | FL-HIL-CC5-general | Member of the Hillsborough County Commission now | No | No | https://hcfl.gov/government/board-of-county-commissioners | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Donna Cameron Cepeda District 5," |
| FL-VF-HIL-2620 | Joshua Wostal | FL-HIL-CC7-general | Member of the Hillsborough County Commission now | Yes | Yes | https://hcfl.gov/government/board-of-county-commissioners | 2026-10-08T20:23Z | 2026-10-08T22:24Z | https://hcfl.gov/commissioners/joshua-wostal | "Joshua Wostal District 7," |
| FL-VF-HIL-2660 | Aileen Rodriguez | FL-HIL-CC7-general | Member of the Hillsborough County Commission now | No | No | https://hcfl.gov/government/board-of-county-commissioners | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Joshua Wostal District 7," |
| FL-VF-HIL-2677 | Brittany Lyssy | FL-HIL-SB2-general | Member of the Hillsborough County School Board now | No | No | https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map | 2026-10-08T21:51Z | 2026-10-08T22:54Z | — | "2 Stacy Hahn" |
| FL-VF-HIL-2675 | Daniela Simic | FL-HIL-SB2-general | Member of the Hillsborough County School Board now | No | No | https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map | 2026-10-08T21:51Z | 2026-10-08T22:54Z | — | "2 Stacy Hahn" |
| FL-VF-HIL-2672 | Patricia "Patti" Rendon | FL-HIL-SB4-general | Member of the Hillsborough County School Board now | Yes | Yes | https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map | 2026-10-08T21:51Z | 2026-10-08T22:54Z | https://www.hillsboroughschools.org/o/hcps/page/board-members | "4 Patricia “Patti” Rendon" |
| FL-VF-HIL-2610 | Kenneth "Ken" Gay | FL-HIL-SB6-general | Member of the Hillsborough County School Board now | No | No | https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map | 2026-10-08T21:51Z | 2026-10-08T22:54Z | — | "6 Karen Perez" |
| FL-VF-HIL-2645 | Karen Perez | FL-HIL-SB6-general | Member of the Hillsborough County School Board now | Yes | Yes | https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map | 2026-10-08T21:51Z | 2026-10-08T22:54Z | https://www.hillsboroughschools.org/o/hcps/page/board-members | "6 Karen Perez" |
| FL-VF-ORA-1290 | Kamia Brown | FL-ORA-CC2-general | Member of the Orange County Commission now | No | No | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Mike Crabb Commissioner, District 2" |
| FL-VF-ORA-1384 | Mike Crabb | FL-ORA-CC2-general | Member of the Orange County Commission now | Yes | Yes | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | https://www.orangecountyfl.net/BoardofCommissioners/District2Commissioner.aspx | "Mike Crabb Commissioner, District 2" |
| FL-VF-ORA-1260 | Brian Jones | FL-ORA-CC4-general | Member of the Orange County Commission now | No | No | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Maribel Gomez Cordero Commissioner, District 4" |
| FL-VF-ORA-1279 | Johanna Lopez | FL-ORA-CC4-general | Member of the Orange County Commission now | No | No | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Maribel Gomez Cordero Commissioner, District 4" |
| FL-VF-ORA-1295 | Lawanna Gelzer | FL-ORA-CC6-general | Member of the Orange County Commission now | No | No | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Michael “Mike” Scott Commissioner, District 6" |
| FL-VF-ORA-1265 | Michael "Mike" Scott | FL-ORA-CC6-general | Member of the Orange County Commission now | Yes | Yes | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | https://www.orangecountyfl.net/BoardofCommissioners/District6Commissioner.aspx | "Michael “Mike” Scott Commissioner, District 6" |
| FL-VF-ORA-1283 | Patricia Rumph | FL-ORA-CC7-general | Member of the Orange County Commission now | No | No | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Michael “Mike” Scott Commissioner, District 6" |
| FL-VF-ORA-1271 | Vicki Vargo | FL-ORA-CC7-general | Member of the Orange County Commission now | No | No | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Michael “Mike” Scott Commissioner, District 6" |
| FL-VF-ORA-1275 | Jeannette Quinones Hernandez | FL-ORA-CC8-general | Member of the Orange County Commission now | No | No | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Michael “Mike” Scott Commissioner, District 6" |
| FL-VF-ORA-1272 | Victor M. Torres Jr. | FL-ORA-CC8-general | Member of the Orange County Commission now | No | No | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Michael “Mike” Scott Commissioner, District 6" |
| FL-VF-ORA-1401 | Roberta Walton Johnson | FL-ORA-CLERK-general | Holds this office now | No | No | https://www.myorangeclerk.com/ | 2026-10-08T20:39Z | 2026-10-08T22:26Z | — | "Joyce Boudoin has been appointed Clerk Ad Interim" |
| FL-VF-ORA-1364 | Terrell Thomas | FL-ORA-CLERK-general | Holds this office now | No | No | https://www.myorangeclerk.com/ | 2026-10-08T20:39Z | 2026-10-08T22:26Z | — | "Joyce Boudoin has been appointed Clerk Ad Interim" |
| FL-VF-ORA-1239 | Chris Messina | FL-ORA-MAYOR-general | Holds this office now | No | No | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Jerry L. Demings Orange County Mayor" |
| FL-VF-ORA-1236 | Tiffany Moore Russell | FL-ORA-MAYOR-general | Holds this office now | No | No | https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx | 2026-10-08T20:23Z | 2026-10-08T22:24Z | — | "Jerry L. Demings Orange County Mayor" |
| FL-VF-ORA-1270 | Melissa Lopez Marantes | FL-ORA-SB1-general | Member of the Orange County School Board now | No | No | https://www.ocps.net/school-board | 2026-10-08T20:39Z | 2026-10-08T22:26Z | — | "Angie Gallo District 1" |
| FL-VF-ORA-1318 | Gloria Reina O'Neal | FL-ORA-SB2-general | Member of the Orange County School Board now | No | No | https://www.ocps.net/school-board | 2026-10-08T20:39Z | 2026-10-08T22:26Z | — | "Maria Salamanca Vice-chair, District 2" |
| FL-VF-ORA-1314 | Diana Moore | FL-ORA-SB3-general | Member of the Orange County School Board now | No | No | https://www.ocps.net/school-board | 2026-10-08T20:39Z | 2026-10-08T22:26Z | — | "Alicia Farrant District 3" |
| FL-VF-ORA-1242 | Susanne Peña | FL-ORA-SB3-general | Member of the Orange County School Board now | No | No | https://www.ocps.net/school-board | 2026-10-08T20:39Z | 2026-10-08T22:26Z | — | "Alicia Farrant District 3" |
| FL-VF-ORA-1245 | Angie Gallo | FL-ORA-SBCHAIR-general | Member of the Orange County School Board now | Yes | No | https://www.ocps.net/school-board | 2026-10-08T20:39Z | 2026-10-08T22:26Z | https://www.ocps.net/district-1-angie-gallo | "Angie Gallo is the School Board Member for District 1" |

## Races

<!-- table:races -->
| race_id | incumbent_id | is_open_seat | own_seat_holder_today | note |
|---|---|---|---|---|
| FL-AGR-general | FL-DOE-90560 | false | Wilton Simpson |  |
| FL-ATG-general | FL-DOE-89041 | false | James Uthmeier |  |
| FL-CFO-general | FL-DOE-89394 | false | Blaise Ingoglia |  |
| FL-GOV-general | NULL | true | Ron DeSantis | Byron Donalds is the FL19 House member, not the Governor |
| FL-10-general | FL-DOE-89909 | false | Maxwell Frost |  |
| FL-11-general | NULL | true | Daniel Webster |  |
| FL-12-general | FL-DOE-88868 | false | Gus M. Bilirakis |  |
| FL-14-general | FL-DOE-88870 | false | Kathy Castor |  |
| FL-15-general | FL-DOE-89121 | false | Laurel M. Lee |  |
| FL-16-general | NULL | true | Vern Buchanan |  |
| FL-20-general | FL-DOE-91577 | false | vacant | Wasserman Schultz holds District 25 (2024 map) and runs here; District 20 is vacant |
| FL-22-general | NULL | true | Lois Frankel |  |
| FL-24-general | NULL | true | Frederica S. Wilson | Gilbert is a Miami-Dade County commissioner (District 1), not a House member |
| FL-25-general | FL-DOE-88911 | false | Debbie Wasserman Schultz | Moskowitz holds District 23 and runs here; District 25 is held by Wasserman Schultz (on the FL-20 ballot) |
| FL-26-general | FL-DOE-90330 | false | Mario Diaz-Balart |  |
| FL-27-general | FL-DOE-90721 | false | Maria Elvira Salazar |  |
| FL-28-general | FL-DOE-91226 | false | Carlos A. Gimenez |  |
| FL-7-general | NULL | true | Cory Mills |  |
| FL-8-general | FL-DOE-89522 | false | Mike Haridopolos |  |
| FL-9-general | FL-DOE-89339 | false | Darren Soto |  |
| FL-SEN-general | FL-DOE-89119 | false | Ashley Moody (Class III) | the Senate list gives Moody's seat as Class III; holds_this_seat assumes the 2026 race is for it (see Questions) |
| FL-BRO-CC2-general | FL-VF-BRO-1179 | false | Mark D. Bogen |  |
| FL-BRO-CC4-general | FL-VF-BRO-1178 | false | Lamar P. Fisher |  |
| FL-BRO-CC6-general | NULL | true | Beam Furr |  |
| FL-BRO-CC8-general | FL-VF-BRO-1182 | false | Robert McKinzie |  |
| FL-BRO-SB1-general | FL-VF-BRO-1194 | false | Maura McCarthy Bulman |  |
| FL-BRO-SB4-general | NULL | true | Lori Alhadeff |  |
| FL-BRO-SB6-general | FL-VF-BRO-1184 | false | Adam Cervera |  |
| FL-BRO-SB7-general | NULL | true | Nora Rupert |  |
| FL-BRO-SBAL8-general | FL-VF-BRO-1195 | false | Allen Zeman |  |
| FL-DAD-CC2-general | FL-VF-DAD-2964 | false | Marleine Bastien |  |
| FL-DAD-CC5-general | FL-VF-DAD-2949 | false | Vicki L. Lopez |  |
| FL-DAD-SB1-general | NULL | true | vacant | District 1 is vacant on the board's list |
| FL-DAD-SB2-general | FL-VF-DAD-2926 | false | Dorothy Bendross-Mindingall |  |
| FL-DAD-SB8-general | FL-VF-DAD-2953 | false | Monica Colucci |  |
| FL-HIL-CC1-general | FL-VF-HIL-2640 | false | Harry Cohen |  |
| FL-HIL-CC3-general | FL-VF-HIL-2621 | false | Gwen Myers |  |
| FL-HIL-CC5-general | NULL | true | Donna Cameron Cepeda | Stacy Hahn is the District 2 school board member, not a commissioner |
| FL-HIL-CC7-general | FL-VF-HIL-2620 | false | Joshua Wostal |  |
| FL-HIL-SB2-general | NULL | true | Stacy Hahn |  |
| FL-HIL-SB4-general | FL-VF-HIL-2672 | false | Patricia “Patti” Rendon |  |
| FL-HIL-SB6-general | FL-VF-HIL-2645 | false | Karen Perez |  |
| FL-ORA-CC2-general | FL-VF-ORA-1384 | false | Mike Crabb |  |
| FL-ORA-CC4-general | NULL | true | Maribel Gomez Cordero |  |
| FL-ORA-CC6-general | FL-VF-ORA-1265 | false | Michael “Mike” Scott |  |
| FL-ORA-CC7-general | NULL | true | new seat (no holder) |  |
| FL-ORA-CC8-general | NULL | true | new seat (no holder) |  |
| FL-ORA-CLERK-general | NULL | true | Joyce Boudoin (Clerk Ad Interim) | Clerk Tiffany Moore Russell departed; she is on the Mayor ballot and holds neither office |
| FL-ORA-MAYOR-general | NULL | true | Jerry L. Demings |  |
| FL-ORA-SB1-general | NULL | true | Angie Gallo |  |
| FL-ORA-SB2-general | NULL | true | Maria Salamanca |  |
| FL-ORA-SB3-general | NULL | true | Alicia Farrant |  |
| FL-ORA-SBCHAIR-general | FL-VF-ORA-1245 | false | Teresa Jacobs | Gallo is the District 1 member running for Chair; District 1 was won in August by Melissa Lopez Marantes |

## FEC cross-check

<!-- table:fec -->
| candidate_id | race_id | fec_candidate_id | incumbent_challenge | election_districts | read_1 | read_2 |
|---|---|---|---|---|---|---|
| FL-DOE-89909 | FL-10-general | H2FL10259 | I | 10, 10, 10 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-91717 | FL-11-general | H6FL11332 | O | 11 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-91715 | FL-11-general | H6FL11357 | O | 11 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-88517 | FL-11-general | H4FL11089 | O | 11, 11 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-88868 | FL-12-general | H6FL09070 | I | 09, 09, 09, 12, 12, 12, 12, 12, 12, 12, 12 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89453 | FL-12-general | H6FL15200 | C | 12 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89778 | FL-12-general | H6FL12231 | C | 12 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-91313 | FL-14-general | H6FL14237 | C | 14 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-88870 | FL-14-general | H6FL11126 | I | 11, 11, 11, 14, 14, 14, 14, 14, 14, 14, 14 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-92395 | FL-14-general | H6FL14245 | C | 14 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89121 | FL-15-general | H2FL15241 | I | 15, 15, 15 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89116 | FL-15-general | H6FL15168 | C | 15 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-90251 | FL-16-general | H6FL16141 | O | 16 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-90779 | FL-16-general | H6FL16158 | O | 16 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89623 | FL-16-general | H6FL06365 | O | 16 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-91278 | FL-20-general | H6FL20143 | C | 20 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-91577 | FL-20-general | H4FL20023 | I | 20, 20, 20, 20, 23, 23, 23, 23, 23, 25, 25, 20 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-90814 | FL-20-general | H6FL20119 | C | 20 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-92109 | FL-22-general | H6FL22248 | C | 22 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89301 | FL-22-general | H6FL21059 | C | 22 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-90703 | FL-24-general | H6FL14203 | C | 24 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-91544 | FL-24-general | H6FL24095 | O | 24 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89801 | FL-25-general | H6FL23188 | C | 25 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-88911 | FL-25-general | H2FL22171 | I | 23, 23, 25 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-92357 | FL-25-general | H6FL25068 | C | 25 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-90330 | FL-26-general | H2FL25018 | I | 25, 25, 25, 25, 21, 25, 25, 25, 25, 25, 26, 26, 26 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89980 | FL-26-general | H6FL26058 | C | 26 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-92137 | FL-26-general | H6FL26074 | C | 26 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-90721 | FL-27-general | H8FL27185 | I | 27, 27, 27, 27, 27 | 2026-10-08T21:00Z | 2026-10-08T22:32Z |
| FL-DOE-89933 | FL-27-general | H6FL27098 | C | 27 | 2026-10-08T21:00Z | 2026-10-08T22:32Z |
| FL-DOE-91226 | FL-28-general | H0FL26036 | I | 26, 28, 28, 28 | 2026-10-08T20:54Z | 2026-10-08T22:32Z |
| FL-DOE-91699 | FL-28-general | H4FL28042 | C | 28, 28 | 2026-10-08T20:54Z | 2026-10-08T22:32Z |
| FL-DOE-90340 | FL-28-general | H6FL28021 | C | 28 | 2026-10-08T20:54Z | 2026-10-08T22:32Z |
| FL-DOE-90696 | FL-7-general | H6FL07231 | C | 07 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-90631 | FL-7-general | H6FL07215 | C | 07 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-92377 | FL-7-general | H6FL07249 | C | 07 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89522 | FL-8-general | H4FL08168 | I | 08, 08 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-90831 | FL-8-general | H6FL06399 | C | 08 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-91337 | FL-9-general | H6FL09294 | C | 09 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89339 | FL-9-general | H6FL09179 | I | 09, 09, 09, 09, 09, 09 | 2026-10-08T20:39Z | 2026-10-08T22:32Z |
| FL-DOE-89119 | FL-SEN-general | S6FL00640 | I | 00 | 2026-10-08T20:54Z | 2026-10-08T22:32Z |
| FL-DOE-90009 | FL-SEN-general | S6FL00830 | C | 00 | 2026-10-08T20:54Z | 2026-10-08T22:32Z |
| FL-DOE-89955 | FL-SEN-general | S6FL00863 | C | 00 | 2026-10-08T20:54Z | 2026-10-08T22:32Z |

## Running mates

<!-- table:tickets -->
| candidate_id | governor | can_detail_url | raw_json | stored | read_1 | read_2 | reread_2026-10-17 | reread_2026-10-26 | reread_2026-11-02 |
|---|---|---|---|---|---|---|---|---|---|
| FL-DOE-89042 | Byron Donalds | https://dos.elections.myflorida.com/candidates/canDetail.asp?account=89042 | `" Bryan&nbsp;\n\t\t    Avila                     "` | Bryan Avila | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | — | — |
| FL-DOE-89243 | David Jolly | https://dos.elections.myflorida.com/candidates/canDetail.asp?account=89243 | `" Gwen&nbsp;\n\t\t    Graham                     "` | Gwen Graham | 2026-10-08T21:00Z | 2026-10-08T22:22Z | — | — | — |
| FL-DOE-84076 | Scott Eckhard Jewett | https://dos.elections.myflorida.com/candidates/canDetail.asp?account=84076 | `" Nicole&nbsp;\n\t\t    Skelly                     "` | Nicole Skelly | 2026-10-08T20:21Z | 2026-10-08T22:22Z | — | — | — |
| FL-DOE-90630 | Charles Burkett | https://dos.elections.myflorida.com/candidates/canDetail.asp?account=90630 | `" Ruben&nbsp;\n\t\t    A.&nbsp;\n\t\t    Coto                     "` | Ruben A. Coto | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | — | — |
| FL-DOE-89571 | Frank J. Russo | https://dos.elections.myflorida.com/candidates/canDetail.asp?account=89571 | `" Rachel&nbsp;\n\t\t    Rodriguez                     "` | Rachel Rodriguez | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | — | — |
| FL-DOE-88529 | Moliere "Moe" Dimanche | https://dos.elections.myflorida.com/candidates/canDetail.asp?account=88529 | `" Benjiman&nbsp;\n\t\t    Rojas                     "` | Benjiman Rojas | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | — | — |
| FL-DOE-90433 | Dean Ocean Abrams | https://dos.elections.myflorida.com/candidates/canDetail.asp?account=90433 | `" Joe&nbsp;\n\t\t    Van Vactor                     "` | Joe Van Vactor | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | — | — |
| FL-DOE-89630 | Jeffrey Peter "Dr. Jeff" Datto | https://dos.elections.myflorida.com/candidates/canDetail.asp?account=89630 | `" Juan&nbsp;\n\t\t    Santana                     "` | Juan Santana | 2026-10-08T20:22Z | 2026-10-08T22:22Z | — | — | — |

## No-site re-checks

<!-- table:sites -->
| candidate_id | race_id | race_status | result | read_1 | read_2 | action | evidence |
|---|---|---|---|---|---|---|---|
| FL-DOE-89630 | FL-GOV-general | published | none found | 2026-10-08T21:20Z | 2026-10-08T22:32Z | none | "drjeffdatto.com has been recently registered with namecheap.com" |
| FL-DOE-92357 | FL-25-general | published | none found | 2026-10-08T21:17Z | 2026-10-08T22:31Z | none | "Do Not Sell or Share My Personal Information" |
| FL-DOE-92137 | FL-26-general | published | none found | 2026-10-08T21:53Z | 2026-10-08T22:54Z | none | "damhforcongress.com has no A record: no website is served" |
| FL-VF-BRO-1179 | FL-BRO-CC2-general | listed | none found | 2026-10-08T21:10Z | 2026-10-08T22:29Z | none | "About - Mayor Mark D. Bogen" |
| FL-VF-BRO-1178 | FL-BRO-CC4-general | listed | none found | 2026-10-08T21:19Z | 2026-10-08T22:32Z | none | "This domain isn't connected to a site" |
| FL-VF-BRO-1182 | FL-BRO-CC8-general | listed | none found | 2026-10-08T21:10Z | 2026-10-08T22:29Z | none | "About - Vice Mayor Robert McKinzie" |
| FL-VF-DAD-2926 | FL-DAD-SB2-general | listed | none found | 2026-10-08T21:16Z | 2026-10-08T22:29Z | none | "Dr. Dorothy Bendross-Mindingall Miami-Dade School Board Member, District 2" |
| FL-VF-DAD-2953 | FL-DAD-SB8-general | listed | withheld | 2026-10-08T21:19Z | 2026-10-08T22:32Z | none | "Encontrar un casino online seguro exige calma, porque las reglas importan mas que las promesas" |
| FL-VF-ORA-1245 | FL-ORA-SBCHAIR-general | listed | none found | 2026-10-08T21:19Z | 2026-10-08T22:32Z | none | "Squarespace - Website Expired" |
