-- Curated official-source links for the news feed (TASK-039): each covered
-- metro's Supervisor of Elections plus statewide FL Division of Elections
-- resources. Real government links, neutral wording, no external opinion.

INSERT INTO news_item (race_id, metro, item_type, title, summary, url) VALUES
(NULL, 'miami', 'official_link',
 'Official voter resources: Miami-Dade Supervisor of Elections',
 'Registration status, sample ballots, precinct lookup, early voting sites, and vote-by-mail for Miami-Dade County.',
 'https://www.miamidade.gov/global/elections/home.page'),
(NULL, 'fort_lauderdale', 'official_link',
 'Official voter resources: Broward Supervisor of Elections',
 'Registration status, sample ballots, precinct lookup, early voting sites, and vote-by-mail for Broward County.',
 'https://www.browardvotes.gov'),
(NULL, 'tampa', 'official_link',
 'Official voter resources: Hillsborough Supervisor of Elections',
 'Registration status, sample ballots, precinct lookup, early voting sites, and vote-by-mail for Hillsborough County.',
 'https://www.votehillsborough.gov'),
(NULL, 'orlando', 'official_link',
 'Official voter resources: Orange County Supervisor of Elections',
 'Registration status, sample ballots, precinct lookup, early voting sites, and vote-by-mail for Orange County.',
 'https://www.ocfelections.gov'),
(NULL, NULL, 'official_link',
 'Register to vote or update your registration (Florida)',
 'The state''s official online voter registration system. Florida is a closed-primary state — party registration determines your primary ballot.',
 'https://registertovoteflorida.gov'),
(NULL, NULL, 'official_link',
 'Florida Division of Elections',
 'Statewide election dates, candidate filings, and official election information from the Florida Department of State.',
 'https://dos.fl.gov/elections/');
