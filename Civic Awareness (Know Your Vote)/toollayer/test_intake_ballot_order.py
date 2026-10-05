"""Ballot order of race.candidate_ids as the DoE intake writes it (2026-10-05).

Until this date doe_file_intake wrote each race's candidate_ids sorted by
candidate-ID string, and the app listed candidates in that order: 17 of the
25 contested partisan races on the site were out of Florida's ballot order,
and 11 put the Democrat ahead of the Republican (migration 0044). These tests
pin what the intake writes now:

  * s. 101.151(3)(a), Fla. Stat.: REP first and DEM second for 2026, because
    those parties came first and second in the 2022 governor's race;
  * s. 101.151(3)(b): minor parties next, then NPA, each in qualifying order;
  * qualifying order is not in the DoE file, so a re-ingest keeps the order
    already stored for the race (0044 set FL-GOV's from the official sample
    ballot) and reads it back only for a race that needs it.

Run: python3 -m unittest test_intake_ballot_order  (from this folder)
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from cap_toollayer import intake  # noqa: E402

_HEADER = "\t".join([
    "AcctNum", "VoterID", "ElectionID", "OfficeCode", "OfficeDesc", "Juris1num",
    "Juris2num", "StatusCode", "StatusDesc", "PartyCode", "PartyDesc",
    "NameLast", "NameFirst", "NameMiddle"])


def _row(acct, office, desc, juris, party, last, first, status="QUA"):
    return "\t".join([acct, "0", "20261103-GEN", office, desc, juris, "",
                      status, status, party, party, last, first, ""])


def _gov(acct, party, last, first):
    return _row(acct, "GOV", "Governor", "", party, last, first)


# FL-GOV as the DoE file has it: IDs in no useful order. The official order
# (Orange County composite sample ballot, 2026-10-01) is Donalds REP, Jolly
# DEM, Jewett LPF, then Burkett, Russo, Dimanche, Abrams, Datto (NPA).
_GOV_FILE = "\n".join([
    _HEADER,
    _gov("84076", "LPF", "Jewett", "Scott"),
    _gov("88529", "NPA", "Dimanche", "Moliere"),
    _gov("89042", "REP", "Donalds", "Byron"),
    _gov("89243", "DEM", "Jolly", "David"),
    _gov("89571", "NPA", "Russo", "Frank"),
    _gov("89630", "NPA", "Datto", "Jeffrey"),
    _gov("90433", "NPA", "Abrams", "Dean"),
    _gov("90630", "NPA", "Burkett", "Charles"),
])
_GOV_OFFICIAL = [
    "FL-DOE-89042", "FL-DOE-89243", "FL-DOE-84076", "FL-DOE-90630",
    "FL-DOE-89571", "FL-DOE-88529", "FL-DOE-90433", "FL-DOE-89630",
]

# FL-9: the Democrat holds the lower DoE number, which put him first.
_FL9_FILE = "\n".join([
    _HEADER,
    _row("89339", "USR", "United States Representative", "009", "DEM",
         "Soto", "Darren"),
    _row("91337", "USR", "United States Representative", "009", "REP",
         "Green", "Dan"),
])


class _Store:
    """The four Store methods doe_file_intake calls without fill_incumbency.
    `stored` is race_id -> the candidate_ids already in the database."""

    def __init__(self, stored=None, fail_read=False):
        self.stored = dict(stored or {})
        self.fail_read = fail_read
        self.reads = []
        self.races = {}
        self.rolled_back = 0

    def read(self, query, params, buckets):
        self.reads.append((query, dict(params)))
        if self.fail_read:
            raise RuntimeError("server closed the connection unexpectedly")
        ids = self.stored.get(params.get("race_id"))
        return [{"race_id": params["race_id"], "candidate_ids": ids}] if ids else []

    def upsert_race(self, race):
        self.races[race["race_id"]] = list(race["candidate_ids"])

    def upsert_candidate(self, cand):
        pass

    def rollback(self):
        self.rolled_back += 1


def _intake(text, store):
    handlers = intake.build_intake_handlers(
        "record", store, doe_fetch=lambda office=None: text)
    return handlers["doe_file_intake"]({"office": "FED"})


class TestPartyRank(unittest.TestCase):
    def test_statutory_ranks(self):
        self.assertEqual(intake._party_rank("REP"), 0)
        self.assertEqual(intake._party_rank("DEM"), 1)
        for minor in ("LPF", "IND", "CPF", "GRE", "other"):
            self.assertEqual(intake._party_rank(minor), 2, minor)
        for none in ("NPA", "", None, "NOP"):
            self.assertEqual(intake._party_rank(none), 3, none)

    def test_party_decides_before_the_stored_order(self):
        party = {"a": "DEM", "b": "REP", "c": "NPA", "d": "LPF"}
        self.assertEqual(
            intake._ballot_order(["a", "b", "c", "d"], party,
                                 stored=["c", "a", "d", "b"]),
            ["b", "a", "d", "c"])


class TestIntakeWritesBallotOrder(unittest.TestCase):
    def test_republican_first_even_with_the_higher_id(self):
        store = _Store()
        res = _intake(_FL9_FILE, store)
        self.assertTrue(res["ok"], res)
        self.assertEqual(store.races["FL-9-general"],
                         ["FL-DOE-91337", "FL-DOE-89339"])
        # One candidate per rank: party alone decides, nothing is read back.
        self.assertEqual(store.reads, [])

    def test_reingest_keeps_the_stored_qualifying_order(self):
        """The bug a re-ingest would bring back: 0044 put FL-GOV's NPA
        candidates in the sample ballot's order, and an ID sort undoes it."""
        store = _Store(stored={"FL-GOV-general": _GOV_OFFICIAL})
        res = _intake(_GOV_FILE, store)
        self.assertTrue(res["ok"], res)
        self.assertEqual(store.races["FL-GOV-general"], _GOV_OFFICIAL)
        self.assertEqual(store.reads,
                         [("race", {"race_id": "FL-GOV-general"})])

    def test_a_stored_dem_first_array_still_comes_out_rep_first(self):
        stored = ["FL-DOE-89243", "FL-DOE-89042"] + _GOV_OFFICIAL[2:]
        store = _Store(stored={"FL-GOV-general": stored})
        _intake(_GOV_FILE, store)
        self.assertEqual(store.races["FL-GOV-general"], _GOV_OFFICIAL)

    def test_no_stored_race_falls_back_to_id_inside_a_rank(self):
        store = _Store()
        _intake(_GOV_FILE, store)
        self.assertEqual(store.races["FL-GOV-general"], [
            "FL-DOE-89042", "FL-DOE-89243", "FL-DOE-84076",
            "FL-DOE-88529", "FL-DOE-89571", "FL-DOE-89630",
            "FL-DOE-90433", "FL-DOE-90630"])

    def test_a_new_candidate_goes_after_the_stored_ones_in_its_rank(self):
        text = "\n".join([_GOV_FILE, _gov("80000", "NPA", "Newcomer", "Nat")])
        store = _Store(stored={"FL-GOV-general": _GOV_OFFICIAL})
        _intake(text, store)
        self.assertEqual(store.races["FL-GOV-general"],
                         _GOV_OFFICIAL + ["FL-DOE-80000"])

    def test_a_failed_read_writes_nothing(self):
        store = _Store(fail_read=True)
        res = _intake(_GOV_FILE, store)
        self.assertFalse(res["ok"])
        self.assertEqual(store.races, {})
        self.assertEqual(store.rolled_back, 1)


if __name__ == "__main__":
    unittest.main()
