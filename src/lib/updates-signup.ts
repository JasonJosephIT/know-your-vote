import { z } from "zod";
import { FL_COUNTIES } from "./fl-counties.ts";

/* What the stay-informed signup takes: an email address and the voter's
   county, one of Florida's 67, for county news and civic updates. Shared by
   the form and /api/updates so both refuse the same things.

   Relative imports only: scripts/verify-civics-quiz.ts loads this under
   plain node. */

export const EMAIL_MESSAGE = "Enter an email address, like name@example.com.";
export const COUNTY_MESSAGE = "Choose your county.";

const FIPS = new Set(FL_COUNTIES.map((c) => c.fips));

export const updatesSignup = z.object({
  email: z.string().trim().email(EMAIL_MESSAGE).max(254, EMAIL_MESSAGE),
  countyFips: z.string({ message: COUNTY_MESSAGE }).refine((f) => FIPS.has(f), COUNTY_MESSAGE),
});
