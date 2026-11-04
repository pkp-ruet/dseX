"""backend/services/audit_opinion.py — the reason behind a qualified opinion,
on text shaped like the real DSE PDFs (2026-11-05, audit RP8)."""
from backend.services.audit_opinion import basis_text, classify, reason_phrase

COVER = ('The auditor of the "X Limited" has given the "Qualified Opinion" & "Emphasis of Matters" in the '
         "Auditor's Report for the year ended on 30 June 2025. ")


def test_bank_deposits_not_written_down_are_serious():
    t = COVER + ("Basis for Qualified Opinion 1. The company has FDR of Taka 3,261,096,667 at First Security Islami "
                 "Bank PLC. These banks face a severe liquidity crisis. Considering lifetime expected credit losses, "
                 "no such allowance has been recognized. Emphasis of Matters We draw attention to gratuity.")
    v = classify(t)
    assert v["severity"] == "serious" and "credit_loss" in v["reasons"] and v["minor"] == []


def test_the_cover_line_and_emphasis_are_not_reasons():
    t = COVER + ("Basis for Qualified Opinion The Company has not fully complied with IFRS 16 in accounting for lease "
                 "arrangements. Emphasis of Matters The company has not introduced a Workers' Profit Participation "
                 "Fund. Interest income may be overstated.")
    assert basis_text(t).strip().startswith("The Company has not fully complied")
    v = classify(t)
    assert v["severity"] == "minor" and v["minor"] == ["lease"]


def test_no_heading_uses_the_last_qualified_opinion():
    t = ('The auditor of the "Y" has given the "Qualified Opinion" in the Auditor\'s Report. '
         '"Qualified Opinion During the year, the Company has recognized deferred tax income of Taka 22,370,265.')
    assert classify(t)["severity"] == "minor"


def test_going_concern_from_the_title():
    v = classify("", "BARKAPOWER: Material Uncertainty Related to Going Concern and Others")
    assert v["going_concern"] and v["severity"] == "serious"


def test_reason_phrase():
    assert reason_phrase(["credit_loss", "evidence"]) == "losses it has not written down and figures the auditor could not check"
    assert reason_phrase([]) is None
