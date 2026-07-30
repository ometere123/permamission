<p align="center">
  <img src="./public/permamission-mark.svg" alt="PermaMission" width="160" />
</p>

# PermaMission

**Mission-bound treasury review on GenLayer.**

PermaMission lets a community fund a durable mission, accept public work proposals, and release GEN only after GenLayer validators fetch real evidence and agree that the work advances the mission charter.

This is a **Project** submission, not a standalone contract. The frontend and contract form one product loop: create a mission treasury, submit evidence-backed work, run validator consensus, challenge weak decisions with new evidence, and release funds only after an approved on-chain verdict.

---

## The Problem

Public-goods and ecosystem funding often fails at the exact point where the decision matters most: the treasury is real, but the judgement is qualitative.

Did this work actually advance the stated mission? Is the evidence public and durable? Is the proposal aligned with the constraints, or just adjacent to a popular narrative?

The usual alternatives reintroduce trust:

| Approach | What breaks |
| --- | --- |
| Multisig or committee | A private group becomes the judge. Contributors must trust its bias, availability, and incentives. |
| Snapshot vote | Voters often judge summaries, popularity, or reputation instead of fetched evidence. |
| Backend AI review | The operator controls what was fetched, what the model saw, and what answer gets stored. |
| Deterministic contract | It can hold funds, but it cannot understand whether public evidence satisfies a prose mission. |
| One-shot grant form | Disputed decisions have no clean evidence-based challenge path before payout. |

PermaMission exists for the gap between deterministic treasury control and subjective mission judgement.

---

## What PermaMission Does

```
create_mission(...) payable         -> steward creates and funds a mission treasury
fund_mission(...) payable           -> anyone can add GEN to the mission
submit_proposal(...)                -> builder submits plan + public evidence URL
review_proposal(...)                -> validators fetch evidence and decide mission fit
challenge_review(...)               -> proposer/steward supplies new public evidence
review_proposal(...) again          -> validators re-review with challenge evidence
release_payment(...)                -> steward releases GEN only after APPROVED
close_mission(...)                  -> steward closes future submissions
```

The reusable primitive is a **mission-bound treasury gate**: qualitative public-purpose funding controlled by contract-side evidence review and validator consensus.

It can support public-goods funds, ecosystem grant pools, research trusts, local civic funds, autonomous organizations, and long-running community treasuries that need recurring proposal review without centralizing judgement in a backend.

---

## Why This Needs GenLayer

Delete GenLayer and the core workflow collapses into either a normal grant dashboard with trusted reviewers or an AI app whose operator controls the answer.

PermaMission needs GenLayer because the deciding party cannot be the steward, proposer, funders, or a private server. Validators must independently fetch the same public evidence, interpret it against the frozen mission charter, and agree on a decision category before payout can happen.

| GenLayer capability | Used for |
| --- | --- |
| Payable writes | Mission creation and funding move GEN into the contract treasury. |
| Contract-side web access | `review_proposal` fetches evidence URLs with `gl.nondet.web.render`. |
| LLM judgement | The review interprets prose mission constraints against public evidence. |
| Equivalence principle | `prompt_comparative` compares semantic decision categories, not JSON formatting. |
| State as source of truth | Missions, proposals, verdicts, challenge evidence, and payout state live in the contract. |
| Value movement | `release_payment` emits the GEN transfer only after an approved decision. |

The model is asked what the evidence proves. The contract decides which state transition and payout branch are allowed.

---

## Consensus Design

Only proposal review enters non-deterministic consensus.

`review_proposal(proposal_id)`:

1. Loads the mission charter, constraints, proposal plan, requested amount, and evidence URL.
2. Fetches the evidence URL inside the contract with `gl.nondet.web.render(..., mode="text")`.
3. If the decision has been challenged, fetches the challenge evidence URL too.
4. Calls an LLM for a structured review.
5. Uses `gl.eq_principle.prompt_comparative` so validators agree on meaning and outcome, not byte-identical wording.
6. Clamps outputs to allowed categories before writing state.

Stored verdict categories:

| Verdict | Meaning |
| --- | --- |
| `APPROVE` | Evidence supports that the proposal advances the mission. |
| `REJECT` | Evidence conflicts with the charter, lacks relevance, or shows the plan should not be funded. |
| `NEEDS_EVIDENCE` | The answer is not knowable from the supplied plan and fetched evidence. |

Decision statuses:

```
OPEN -> APPROVED | REJECTED | NEEDS_EVIDENCE
APPROVED | REJECTED | NEEDS_EVIDENCE -> CHALLENGED
CHALLENGED -> APPROVED | REJECTED | NEEDS_EVIDENCE
APPROVED -> PAID
```

`CHALLENGED` is the key iteration: payout is blocked until validators review the original evidence plus new challenge evidence.

---

## App Experience

The frontend is a real contract interface, not a demo shell.

- `/` shows the live contract summary and recent contract-read missions/proposals.
- `/missions` browses mission treasuries from the deployed contract.
- `/missions/new` creates and funds a mission.
- `/missions/[id]` shows a mission and lets builders submit proposals.
- `/proposals` browses proposal decisions from the contract.
- `/proposals/[id]` shows evidence, rationale, challenge evidence, review actions, and payout actions.

Wallet support:

- injected EIP-1193 wallet when available
- generated browser wallet when no injected wallet is available
- import/export for generated keys
- persisted transaction rail with GenLayer stages
- hydration-safe wallet restore after first render

There is no database and no seeded demo data. If no contract is configured, the UI renders empty contract-read states.

---

## Contract API

| Method | Type | Purpose |
| --- | --- | --- |
| `create_mission(mission_id, name, charter, constraints, treasury_goal)` | payable write | Create and fund a mission treasury. |
| `fund_mission(mission_id)` | payable write | Add GEN to a mission treasury. |
| `submit_proposal(proposal_id, mission_id, title, requested_amount, plan, evidence_url)` | write | Submit a public evidence-backed proposal. |
| `review_proposal(proposal_id)` | consensus write | Fetch evidence and decide mission fit. |
| `challenge_review(proposal_id, challenge_url, challenge_summary)` | write | Reopen a decision with new public evidence. |
| `release_payment(proposal_id)` | write | Steward releases GEN after approval. |
| `mark_paid(proposal_id)` | write | Compatibility alias for `release_payment`. |
| `close_mission(mission_id)` | write | Close future submissions for a mission. |
| `get_summary()` | view | Contract-level counters and balance. |
| `list_missions(offset, limit)` | view | Paged mission records. |
| `list_proposals(mission_id, offset, limit)` | view | Paged proposal records. |
| `get_mission(mission_id)` | view | Single mission record. |
| `get_proposal(proposal_id)` | view | Single proposal record. |

---

## Deployed on StudioNet

| Field | Value |
| --- | --- |
| Network | GenLayer StudioNet |
| Chain | `studionet` |
| RPC | `https://studio.genlayer.com/api` |
| Contract | `0x0A20075d74fa2270851464D792ca080A78cA6A4c` |
| Deployment tx | `0xb53b5590a93ec20a03533c60480bd27dfc50d679ffeeae2ea65a0e347fa01d22` |
| Source | `contracts/PermaMission.py` |

### Measured StudioNet flow

The upgraded deployment was exercised end-to-end with public IANA evidence:

| Flow | Transaction |
| --- | --- |
| Create mission | `0x9b3ba964e83f0a09a12883dee5c9983550a4c92f024d05beb4d6f0307d2734ff` |
| Fund mission | `0x25fe45ade791d01efef39470f12cc34aaf6e6fdc391899ef6889806cceabdf98` |
| Submit proposal | `0x9f838ac80ff57d5ff3f8d7d7b33366b9e94c499e6b95b2a4b12d669fa22469ba` |
| First consensus review | `0x1109ffa847f0e51a2a5ed0015f77dae33ea06e31565336e5a8383c75c2228f54` |
| Challenge decision with new evidence | `0x96aa40e21bde69be4da09317a869cc68f9e597987f22dd8e8639e03f632296c5` |
| Second consensus review after challenge | `0x5dcdeafb5ddbb5f6191b951b708d0fe934007da81d7332b675b33ee757e8ccf8` |
| Release payment | `0xad9c36a7ca36b0f294de71cd2b26ebc658c9c15e3ce9cd6c1dbe4af1ad41bcef` |
| Close mission | `0x5c6fe404a25ada90c6066ff9b9b6a0ec3c37e9874adfdaa8502abbb840e4aa6d` |

The first review approved the proposal. The challenge added a second IANA source, validators fetched both sources, the second review approved again, and payout was released after that second verdict.

---

## Verification

Current measured checks:

```bash
python -m pytest tests\direct -v
# 30 passed

genvm-lint check contracts\PermaMission.py --json
# ok: true, methods: 13

npm run lint
# passed

npm run build
# passed

NEXT_PUBLIC_PERMAMISSION_CONTRACT=0x0A20075d74fa2270851464D792ca080A78cA6A4c npm run verify:schema
# Schema verified

node scripts\exercise-studionet.mjs
# create -> fund -> submit -> review -> challenge -> review -> release -> close
```

Direct tests cover:

| Area | Cases |
| --- | --- |
| Mission funding | funded creation, zero-value rejection, duplicate rejection, top-ups |
| Proposal submission | indexing, missing mission rejection, zero amount rejection, closed mission rejection |
| Consensus review | approve, reject, needs evidence, bad verdict clamp, bad score clamp |
| Challenge flow | reopen decision, second review, challenge blocks payout, proposer/steward authorization |
| Settlement | steward-only release, treasury shortfall, paid state, emitted transfer branch |
| Lifecycle | steward-only close, inactive mission behavior, paged reads |

---

## Repository Map

```
contracts/
  PermaMission.py          GenLayer intelligent contract

public/
  permamission-mark.svg    Project logo
  favicon.svg              Browser favicon

src/
  app/                     Next.js App Router pages
    missions/              Mission list, creation, detail
    proposals/             Proposal list and detail
  components/
    app-shell.tsx          Layout, logo, navigation
    wallet-panel.tsx       Injected/generated wallet UI
    wallet-provider.tsx    Hydration-safe wallet state
    write-actions.tsx      Mission, proposal, review, challenge, payout actions
  lib/
    genlayer/              Client, schema, read/write wrappers
    storage.ts             Browser wallet and transaction persistence

tests/
  direct/                  Direct-mode contract tests
```

---

## Development

```bash
npm install
npm run dev
```

Environment:

```bash
NEXT_PUBLIC_GENLAYER_CHAIN=studionet
NEXT_PUBLIC_GENLAYER_ENDPOINT=https://studio.genlayer.com/api
NEXT_PUBLIC_PERMAMISSION_CONTRACT=0x0A20075d74fa2270851464D792ca080A78cA6A4c
```

Open http://localhost:3000.

---

## Honest Limits

- StudioNet balances are simulated. The project proves contract state transitions, consensus review shape, and emitted transfer branches in StudioNet, not production GEN settlement on a value-bearing mainnet.
- Evidence URLs should be stable public pages. Validators judge what they fetch during the review transaction.
- `NEEDS_EVIDENCE` is deliberately conservative. It blocks payout until better evidence is submitted or the proposal is reviewed again.
- The current payout split is simple: approved proposals can be released in full by the steward. More granular funding bands could be added later.
