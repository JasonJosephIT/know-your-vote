/* Every page the roster-completeness worksheet reads, by key
   (docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.3).

   scripts/roster-reads.ts reads this list once per round; the worksheet cites
   these URLs. Adding a page (a member's own page for a Yes, a body's
   per-seat page) is an edit here, so the second round reads exactly what the
   first read. The FEC reads are not listed here: roster-reads.ts builds them
   from HOUSE_DISTRICTS because they carry the key.

   via: "fetch"  plain HTTPS GET with our user agent (the XML lists).
        "chrome" headless Chromium (Google Chrome, --dump-dom), its own user
                 agent unaltered: Cloudflare challenges the DoE pages and
                 several county sites render their member lists in script.
   parse: which helper in roster-reads-lib.ts reads the body. */

import { canDetailUrl } from "./roster-reads-lib.ts";

export type Via = "fetch" | "chrome";
export type Parse = "house" | "senate" | "doe" | "text";

export interface Source {
  key: string;
  url: string;
  via: Via;
  parse: Parse;
  /** What the 2026-10-08 planning read saw, where it matters. */
  note?: string;
}

/** The 16 U.S. House races in scope (race ids FL-<n>-general). */
export const HOUSE_DISTRICTS = [7, 8, 9, 10, 11, 12, 14, 15, 16, 20, 22, 24, 25, 26, 27, 28] as const;

/** DoE account numbers of the eight Governor ballot candidates: the <n> of
    FL-DOE-<n>, in ballot order (0044). */
export const GOV_ACCOUNTS = ["89042", "89243", "84076", "90630", "89571", "88529", "90433", "89630"] as const;

const page = (key: string, url: string, note?: string): Source => ({
  key,
  url,
  via: "chrome",
  parse: "text",
  ...(note ? { note } : {}),
});

export const SOURCES: readonly Source[] = [
  /* Federal: the sources of record (§3.3). */
  { key: "house-clerk", url: "https://clerk.house.gov/xml/lists/MemberData.xml", via: "fetch", parse: "house" },
  { key: "senate-list", url: "https://www.senate.gov/general/contact_information/senators_cfm.xml", via: "fetch", parse: "senate" },
  page("house-directory", "https://www.house.gov/representatives", "where each member's own house.gov site is listed (second read for a Yes)"),

  /* Running mates (§3.6): the DoE per-candidate page. */
  ...GOV_ACCOUNTS.map((n): Source => ({ key: `doe-${n}`, url: canDetailUrl(n), via: "chrome", parse: "doe" })),

  /* Statewide: the office's own site, naming the current holder. */
  page("gov-eog", "https://www.flgov.com/eog/", "title 'Governor Ron DeSantis | Executive Office of the Governor' on 2026-10-08"),
  page("atg-home", "https://www.myfloridalegal.com/", "403 Forbidden to headless Chromium on 2026-10-08: read in the browser pane (plan Task 4)"),
  page("cfo-home", "https://www.myfloridacfo.com/", "'Meet Your Chief Financial Officer Blaise Ingoglia' on 2026-10-08"),
  page("agr-home", "https://www.fdacs.gov/", "'Commissioner Wilton Simpson' on 2026-10-08"),

  /* County commissions. */
  page("bro-cc-list", "https://www.broward.org/Commission/Pages/Commissioners.aspx", "no member names in the DOM on 2026-10-08; the nine district pages name each seat's commissioner"),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => page(`bro-cc-d${d}`, `https://www.broward.org/district${d}`)),
  page("dad-cc-list", "https://www.miamidade.gov/global/government/commission/home.page", "lists 'Marleine Bastien District 2', 'Vicki L. Lopez District 5' on 2026-10-08"),
  page("hil-cc-list", "https://hcfl.gov/government/board-of-county-commissioners", "lists all seven commissioners by district on 2026-10-08"),
  page("ora-cc-list", "https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx", "lists the Mayor and six district commissioners on 2026-10-08; also the Mayor's source"),

  /* School boards. */
  page("bro-sb-list", "https://www.browardschools.com/school-board", "members appear only in a photo caption on 2026-10-08; find the board-members page"),
  page("dad-sb-list", "https://www.dadeschools.net/schoolboard/", "no member names in the DOM on 2026-10-08; find the members page"),
  page("hil-sb-list", "https://www.hillsboroughschools.org/page/school-board", "headless read did not finish on 2026-10-08"),
  page("ora-sb-list", "https://www.ocps.net/school-board", "lists 'Teresa Jacobs Chair', 'Angie Gallo District 1' on 2026-10-08"),

  /* Orange County Clerk of the Courts. */
  page("ora-clerk", "https://www.myorangeclerk.com/", "reports 'the departure of Clerk Tiffany Moore Russell' on 2026-10-08"),

  /* Added during round 1 (plan Task 4). Member lists the first pages did
     not give, and the second official page for each candidate round 1 found
     serving. Every URL appears as a link in a page already read, except
     ocps.net/district-1-angie-gallo, recorded as her board page in
     docs/general-election/candidate-sites-2026-09-24.md (the OCPS list links
     the same page on its CMS host, ocps.smartsiteshost.com). */
  page("dad-sb-members", "https://www.dadeschools.net/SchoolBoard/members", "linked from dad-sb-list, which answered 404 Not Found"),
  page("hil-sb-members", "https://www.hillsboroughschools.org/o/hcps/page/board-members", "linked 'School Board Members' from hil-sb-list"),
  page("hil-sb-map", "https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map", "linked 'Map of Districts' from hil-sb-members; a table of the seven members by district"),
  page("bro-soe-officials", "https://browardvotes.gov/candidates/elected-officials", "the Broward Supervisor of Elections' list of CURRENT elected officials (not its candidate list), linked from its home page; second page for the Broward school board members, whose district site has no per-member page"),
  page("dad-sb-d2", "https://district2.dadeschools.net/", "the District 2 member's site, linked from dad-sb-members"),
  page("dad-sb-d8", "https://district8.dadeschools.net/", "the District 8 member's site, linked from dad-sb-members"),
  page("bro-cc-d2-about", "https://www.broward.org/district2/about"),
  page("bro-cc-d4-about", "https://www.broward.org/district4/about"),
  page("bro-cc-d8-about", "https://www.broward.org/district8/about"),
  page("dad-cc-d2", "https://www.miamidade.gov/global/government/commission/district02/home.page"),
  page("dad-cc-d5", "https://www.miamidade.gov/global/government/commission/district05/home.page"),
  page("hil-cc-cohen", "https://hcfl.gov/commissioners/harry-cohen"),
  page("hil-cc-myers", "https://hcfl.gov/commissioners/gwen-myers"),
  page("hil-cc-wostal", "https://hcfl.gov/commissioners/joshua-wostal"),
  page("ora-cc-d2", "https://www.orangecountyfl.net/BoardofCommissioners/District2Commissioner.aspx"),
  page("ora-cc-d6", "https://www.orangecountyfl.net/BoardofCommissioners/District6Commissioner.aspx"),
  page("ora-sb-gallo", "https://www.ocps.net/district-1-angie-gallo"),
  page("atg-bio", "https://www.myfloridalegal.com/ag-bio", "linked 'Meet the Attorney General' from atg-home; read in the browser pane, as atg-home"),
  page("cfo-meet", "https://www.myfloridacfo.com/about/meet-the-cfo"),
  page("agr-meet", "https://www.fdacs.gov/About-Us/Meet-Commissioner-Simpson"),
  page("sen-moody", "https://www.moody.senate.gov/"),
  ...["haridopolos", "soto", "frost", "bilirakis", "castor", "laurellee", "wassermanschultz", "moskowitz", "mariodiazbalart", "salazar", "gimenez"].map(
    (m) => page(`house-${m}`, `https://${m}.house.gov/`),
  ),

  /* No-site re-checks (spec §3.7, plan Task 4 Step 5): each domain recorded
     for the candidate in docs/general-election/candidate-sites-2026-09-24.md.
     A web search on 2026-10-08 found no new lead for any of the nine.
     damhforcongress.com (Hosey) has no A record, so there is no page to read;
     Bogen, McKinzie and Bendross-Mindingall have no campaign domain at all. */
  page("site-FL-DOE-92357", "https://jassenoff.com/"),
  page("site-FL-DOE-89630", "https://www.drjeffdatto.com/", "the apex timed out on 2026-10-08; its http redirect lands here"),
  page("site-FL-VF-BRO-1178-a", "https://fisherfordistrict4.com/"),
  page("site-FL-VF-BRO-1178-b", "https://lamarfisher.com/"),
  page("site-FL-VF-DAD-2953", "https://monicacolucci.com/", "genuine site, compromised with injected casino spam on 2026-09-25"),
  page("site-FL-VF-ORA-1245", "https://voteangiegallo.com/"),
];
