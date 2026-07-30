GEN = 10**18


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
    assert contract.get_proposal(pid)["status"] == "APPROVED"


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
    direct_vm.sender = direct_bob
    contract.open_challenge(
        pid,
        "https://example.com/challenge",
        "New public source evidence shows the archive has durable snapshots, clear attribution, and direct mission relevance.",
    )
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("not approved"):
        contract.release_payment(pid)


def test_only_proposer_or_steward_can_challenge(contract, direct_vm, direct_alice, direct_bob, direct_charlie):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("proposer or steward"):
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
    direct_vm.sender = direct_bob
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
    with direct_vm.expect_revert("not approved"):
        contract.release_payment(pid)


def test_only_steward_can_release(contract, direct_vm, direct_alice, direct_bob, direct_charlie):
    mid = create_mission(contract, direct_vm, direct_alice)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid)
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only mission steward"):
        contract.release_payment(pid)


def test_release_payment_moves_to_paid(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice, value=10 * GEN)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid, amount=3 * GEN)
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)
    direct_vm.sender = direct_alice
    contract.release_payment(pid)
    proposal = contract.get_proposal(pid)
    assert proposal["status"] == "PAID"
    assert proposal["paid_amount"] == str(3 * GEN)
    assert contract.get_mission(mid)["treasury_available"] == str(7 * GEN)


def test_release_fails_when_treasury_short(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice, value=GEN)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid, amount=3 * GEN)
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("treasury"):
        contract.release_payment(pid)


def test_mark_paid_alias_releases(contract, direct_vm, direct_alice, direct_bob):
    mid = create_mission(contract, direct_vm, direct_alice, value=5 * GEN)
    pid = submit_proposal(contract, direct_vm, direct_bob, mid, amount=2 * GEN)
    mock_review(direct_vm, "APPROVE", "HIGH")
    contract.review_proposal(pid)
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
