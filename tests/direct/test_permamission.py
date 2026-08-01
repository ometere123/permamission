GEN = 10**18
from conftest import warp_to


def create_mission(contract, direct_vm, steward, mission_id="mission-alpha", value=10 * GEN):
    direct_vm.sender = steward
    direct_vm.value = value
    contract.create_mission(
        mission_id,
        "Mission Alpha",
        "Preserve civic records and fund public interest archives with reusable source packs and plain-language summaries.",
        "No partisan campaigning. Evidence must be public, durable, and useful to people outside the original team.",
        100 * GEN,
    )
    direct_vm.value = 0
    return mission_id


def submit_proposal(contract, direct_vm, proposer, mission_id="mission-alpha", proposal_id="proposal-alpha", amount=3 * GEN):
    direct_vm.sender = proposer
    contract.submit_proposal(
        proposal_id,
        mission_id,
        "Archive water notices",
        amount,
        "Build a public archive of municipal water-quality notices, preserve source URLs, publish static snapshots, and write reusable summaries.",
        "https://example.com/evidence",
    )
    return proposal_id


def mock_review(direct_vm, verdict="APPROVE", score="HIGH", reason="The proposal advances the mission."):
    direct_vm.mock_web(r".*example\.com/evidence.*", {"status": 200, "body": "water notices archive public source snapshots"})
    direct_vm.mock_web(r".*example\.com/challenge.*", {"status": 200, "body": "new public evidence materially changes the review"})
    direct_vm.mock_llm(
        r".*reviewing a PermaMission proposal.*",
        f'{{"verdict":"{verdict}","score_band":"{score}","evidence_summary":"Evidence is public and relevant.","rationale":"{reason}"}}',
    )


def mock_delivery_review(direct_vm, verdict="VERIFY", reason="The completed work matches the approved plan."):
    direct_vm.mock_web(r".*example\.com/delivery.*", {"status": 200, "body": "completed archive durable public attributable proposer source pack"})
    direct_vm.mock_llm(
        r".*verifying completed PermaMission work.*",
        f'{{"verdict":"{verdict}","evidence_summary":"Delivery evidence is public, durable, and attributable.","rationale":"{reason}"}}',
    )


def approve_proposal(contract, direct_vm, pid):
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)


def submit_and_verify_delivery(contract, direct_vm, proposer, pid):
    warp_to(direct_vm, "2100-01-02T00:00:01Z")
    direct_vm.sender = proposer
    contract.submit_delivery(
        pid,
        "https://example.com/delivery",
        "Completed public source pack with durable URLs, proposer attribution, reusable summaries, and materials matching the approved plan.",
    )
    mock_delivery_review(direct_vm, "VERIFY")
    contract.verify_delivery(pid)


def test_create_mission_requires_funding(contract, direct_vm, direct_alice):
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with direct_vm.expect_revert("funded"):
        contract.create_mission("mission-alpha", "Mission Alpha", "x" * 90, "y" * 40, 100 * GEN)


def test_create_mission_records_value(contract, direct_vm, direct_alice):
    mid = create_mission(contract, direct_vm, direct_alice, value=12 * GEN)
    mission = contract.get_mission(mid)
    assert mission["treasury_available"] == str(12 * GEN)


def test_create_mission_indexes_it(contract, direct_vm, direct_alice):
    create_mission(contract, direct_vm, direct_alice)
    assert contract.get_summary()["mission_count"] == 1
    assert contract.list_missions(0, 10)[0]["id"] == "mission-alpha"


def test_create_mission_rejects_duplicate(contract, direct_vm, direct_alice):
    create_mission(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = GEN
    with direct_vm.expect_revert("already exists"):
        contract.create_mission("mission-alpha", "Mission Alpha", "x" * 90, "y" * 40, 100 * GEN)


def test_create_mission_rejects_short_charter(contract, direct_vm, direct_alice):
    direct_vm.sender = direct_alice
    direct_vm.value = GEN
    with direct_vm.expect_revert("charter"):
        contract.create_mission("mission-alpha", "Mission Alpha", "too short", "y" * 40, 100 * GEN)


def test_fund_mission_increases_treasury(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice, value=GEN)
    direct_vm.sender = direct_bob
    direct_vm.value = 4 * GEN
    contract.fund_mission(mid)
    direct_vm.value = 0
    assert contract.get_mission(mid)["treasury_available"] == str(5 * GEN)


def test_funding_records_contribution_profile(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice, value=GEN)
    direct_vm.sender = direct_bob
    direct_vm.value = 4 * GEN
    contract.fund_mission(mid)
    direct_vm.value = 2 * GEN
    contract.fund_mission(mid)
    direct_vm.value = 0

    contributions = contract.list_contributions(direct_bob, 0, 10)
    profile = contract.get_profile(direct_bob)

    assert len(contributions) == 1
    assert contributions[0]["mission_id"] == mid
    assert contributions[0]["amount"] == str(6 * GEN)
    assert profile["funded_total"] == str(6 * GEN)
    assert profile["funded_missions"][0]["mission_id"] == mid


def test_fund_mission_requires_value(contract, direct_vm, direct_alice):
    mid = create_mission(contract, direct_vm, direct_alice)
    direct_vm.value = 0
    with direct_vm.expect_revert("above zero"):
        contract.fund_mission(mid)


def test_submit_proposal_records_it(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    proposal = contract.get_proposal(pid)
    assert proposal["status"] == "OPEN"
    assert proposal["requested_amount"] == str(3 * GEN)


def test_steward_cannot_submit_to_own_mission(contract, direct_vm, direct_alice):
    mid = create_mission(contract, direct_vm, direct_alice)
    with direct_vm.expect_revert("steward cannot submit"):
        submit_proposal(contract, direct_vm, direct_alice, mid)


def test_submit_proposal_indexes_by_mission(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    submit_proposal(contract, direct_vm, direct_bob, mid)
    assert len(contract.list_proposals(mid, 0, 10)) == 1
    assert contract.get_mission(mid)["proposal_count"] == "1"


def test_submit_rejects_missing_mission(contract, direct_vm, direct_bob):
    with direct_vm.expect_revert("Mission does not exist"):
        submit_proposal(contract, direct_vm, direct_bob, "missing")


def test_submit_rejects_zero_amount(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    with direct_vm.expect_revert("above zero"):
        submit_proposal(contract, direct_vm, direct_bob, mid, amount=0)


def test_review_approve_sets_status(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)
    proposal = contract.get_proposal(pid)
    assert proposal["status"] == "APPROVED_PENDING_DELIVERY"
    assert proposal["challenge_deadline"] != ""


def test_review_reject_sets_status(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "REJECT", "LOW", "It conflicts with constraints.")
    contract.review_proposal(pid)
    assert contract.get_proposal(pid)["status"] == "REJECTED"


def test_review_needs_evidence_is_abstention(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "NEEDS_EVIDENCE", "UNKNOWN", "Not enough evidence.")
    contract.review_proposal(pid)
    assert contract.get_proposal(pid)["status"] == "NEEDS_EVIDENCE"


def test_review_clamps_bad_verdict(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "PAY_ME", "HIGH")
    contract.review_proposal(pid)
    assert contract.get_proposal(pid)["status"] == "NEEDS_EVIDENCE"


def test_review_clamps_bad_score(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "APPROVE", "CERTAIN")
    contract.review_proposal(pid)
    assert contract.get_proposal(pid)["score_band"] == "UNKNOWN"


def test_review_requires_open_or_needs_evidence(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "REJECT", "LOW")
    contract.review_proposal(pid)
    with direct_vm.expect_revert("not reviewable"):
        contract.review_proposal(pid)


def test_open_challenge_reopens_decision(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "REJECT", "LOW")
    contract.review_proposal(pid)
    direct_vm.sender = direct_bob
    contract.open_challenge(
        pid,
        "https://example.com/challenge",
        "New public source evidence shows the archive has durable snapshots, clear attribution, and direct mission relevance.",
    )
    proposal = contract.get_proposal(pid)
    assert proposal["status"] == "CHALLENGED"
    assert proposal["challenge_url"] == "https://example.com/challenge"


def test_challenged_proposal_can_be_reviewed_again(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "REJECT", "LOW")
    contract.review_proposal(pid)
    direct_vm.sender = direct_bob
    contract.open_challenge(
        pid,
        "https://example.com/challenge",
        "New public source evidence shows the archive has durable snapshots, clear attribution, and direct mission relevance.",
    )
    contract.review_challenge(pid)
    proposal = contract.get_proposal(pid)
    assert proposal["status"] == "REJECTED"
    assert proposal["reviewed_at"] != ""


def test_challenge_blocks_release_until_rereview(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)
    direct_vm.sender = direct_alice
    contract.open_challenge(
        pid,
        "https://example.com/challenge",
        "New public source evidence shows the archive has durable snapshots, clear attribution, and direct mission relevance.",
    )
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("not verified"):
        contract.release_payment(pid)


def test_third_party_cannot_challenge_approved_proposal(contract, direct_vm, direct_alice, direct_bob, direct_charlie):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only mission steward"):
        contract.open_challenge(
            pid,
            "https://example.com/challenge",
            "New public source evidence shows the archive has durable snapshots, clear attribution, and direct mission relevance.",
        )


def test_proposer_cannot_challenge_approved_proposal(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only mission steward"):
        contract.open_challenge(
            pid,
            "https://example.com/challenge",
            "New public source evidence shows the archive has durable snapshots, clear attribution, and direct mission relevance.",
        )


def test_review_proposal_does_not_review_challenge(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)
    direct_vm.sender = direct_alice
    contract.open_challenge(
        pid,
        "https://example.com/challenge",
        "New public source evidence shows the archive has durable snapshots, clear attribution, and direct mission relevance.",
    )
    with direct_vm.expect_revert("not reviewable"):
        contract.review_proposal(pid)


def test_release_requires_approval(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("not verified"):
        contract.release_payment(pid)


def test_approved_plan_cannot_be_paid_before_delivery_verification(contract, direct_vm, direct_alice, direct_bob, direct_charlie):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    approve_proposal(contract, direct_vm, pid)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("not verified"):
        contract.release_payment(pid)


def test_delivery_cannot_be_submitted_before_challenge_window(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    approve_proposal(contract, direct_vm, pid)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Challenge window"):
        contract.submit_delivery(
            pid,
            "https://example.com/delivery",
            "Completed public source pack with durable URLs, proposer attribution, reusable summaries, and materials matching the approved plan.",
        )


def test_only_proposer_can_submit_delivery(contract, direct_vm, direct_alice, direct_bob, direct_charlie):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    approve_proposal(contract, direct_vm, pid)
    warp_to(direct_vm, "2100-01-02T00:00:01Z")
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only proposer"):
        contract.submit_delivery(
            pid,
            "https://example.com/delivery",
            "Completed public source pack with durable URLs, proposer attribution, reusable summaries, and materials matching the approved plan.",
        )


def test_verify_delivery_sets_verified(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    approve_proposal(contract, direct_vm, pid)
    submit_and_verify_delivery(contract, direct_vm, direct_bob, pid)
    proposal = contract.get_proposal(pid)
    assert proposal["status"] == "VERIFIED"
    assert proposal["delivery_verdict"] == "VERIFY"
    assert proposal["delivery_evidence_summary"] != ""


def test_delivery_review_can_reject_completed_work(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    approve_proposal(contract, direct_vm, pid)
    warp_to(direct_vm, "2100-01-02T00:00:01Z")
    direct_vm.sender = direct_bob
    contract.submit_delivery(
        pid,
        "https://example.com/delivery",
        "Completed public source pack with durable URLs, proposer attribution, reusable summaries, and materials matching the approved plan.",
    )
    mock_delivery_review(direct_vm, "REJECT", "The evidence is not attributable.")
    contract.verify_delivery(pid)
    assert contract.get_proposal(pid)["status"] == "REJECTED"


def test_anyone_can_release_verified_payout(contract, direct_vm, direct_alice, direct_bob, direct_charlie):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    approve_proposal(contract, direct_vm, pid)
    submit_and_verify_delivery(contract, direct_vm, direct_bob, pid)
    direct_vm.sender = direct_charlie
    contract.release_payment(pid)
    proposal = contract.get_proposal(pid)
    assert proposal["status"] == "PAID"
    assert proposal["released_to"] == str(direct_bob)


def test_release_payment_moves_to_paid(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice, value=10 * GEN)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid, amount=3 * GEN)
    approve_proposal(contract, direct_vm, pid)
    submit_and_verify_delivery(contract, direct_vm, direct_bob, pid)
    direct_vm.sender = direct_alice
    contract.release_payment(pid)
    proposal = contract.get_proposal(pid)
    assert proposal["status"] == "PAID"
    assert proposal["paid_amount"] == str(3 * GEN)
    assert contract.get_mission(mid)["treasury_available"] == str(7 * GEN)


def test_profile_tracks_stewarded_submitted_and_paid(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice, value=10 * GEN)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid, amount=3 * GEN)
    approve_proposal(contract, direct_vm, pid)
    submit_and_verify_delivery(contract, direct_vm, direct_bob, pid)
    direct_vm.sender = direct_alice
    contract.release_payment(pid)

    steward_profile = contract.get_profile(direct_alice)
    proposer_profile = contract.get_profile(direct_bob)

    assert steward_profile["stewarded_missions"][0]["id"] == mid
    assert proposer_profile["submitted_proposals"][0]["id"] == pid
    assert proposer_profile["paid_proposals"][0]["id"] == pid
    assert proposer_profile["earned_total"] == str(3 * GEN)


def test_release_fails_when_treasury_short(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice, value=GEN)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid, amount=3 * GEN)
    approve_proposal(contract, direct_vm, pid)
    submit_and_verify_delivery(contract, direct_vm, direct_bob, pid)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("treasury"):
        contract.release_payment(pid)


def test_mark_paid_alias_releases(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice, value=5 * GEN)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid, amount=2 * GEN)
    approve_proposal(contract, direct_vm, pid)
    submit_and_verify_delivery(contract, direct_vm, direct_bob, pid)
    direct_vm.sender = direct_alice
    contract.mark_paid(pid)
    assert contract.get_proposal(pid)["status"] == "PAID"


def test_close_mission_requires_steward(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only mission steward"):
        contract.close_mission(mid)


def test_close_mission_sets_inactive(contract, direct_vm, direct_alice):
    mid = create_mission(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    contract.close_mission(mid)
    assert contract.get_mission(mid)["active"] is False


def test_submit_rejects_closed_mission(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_alice
    contract.close_mission(mid)
    with direct_vm.expect_revert("inactive"):
        submit_proposal(contract, direct_vm, direct_bob, mid)


def test_list_pagination(contract, direct_vm, direct_alice, direct_bob):
    first = create_mission(contract, direct_vm, direct_alice, "mission-alpha")
    second = create_mission(contract, direct_vm, direct_alice, "mission-beta")
    assert contract.list_missions(0, 1)[0]["id"] == first
    assert contract.list_missions(1, 1)[0]["id"] == second
