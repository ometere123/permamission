# PermaMission

**Mission-bound treasury review on GenLayer.**

PermaMission lets a community fund a durable mission, accept public work proposals, and release GEN only after GenLayer validators fetch real evidence and agree that the work advances the mission charter.

This is a **Project** submission, not a standalone contract. The frontend and contract form one product loop: create a mission treasury, submit evidence-backed work, run validator consensus, challenge weak decisions with new evidence, and release funds only after an approved on-chain verdict.

[Live app](https://permamission.vercel.app/)

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

## Real-World Failure This Helps Prevent

The concrete failure mode is not hypothetical: large public-goods funding rounds have already struggled with subjective mission alignment.

In Optimism RetroPGF 3, Optimism later reported that the number of eligible applicants grew sharply, the results did not strongly reflect outsized impact, and the round struggled because impact was not defined in a way badgeholders could apply directly. The review also noted tension around rewards going to broad Ethereum public goods rather than work more directly tied to Optimism's own goals.

PermaMission addresses that class of failure by forcing each payout through a mission-specific evidence gate:

1. The mission charter and constraints are frozen in contract state.
2. The proposal must include a public evidence URL.
3. Validators fetch the evidence inside consensus.
4. The verdict must compare the fetched evidence against the mission, not against popularity or reputation.
5. If the decision is disputed, the challenge path adds new public evidence and blocks payout until a second consensus review.

It does not try to solve every grant problem, such as Sybil identity attacks. It specifically targets **mission drift, weak evidence, and subjective payout decisions** in recurring public-purpose treasuries.

---

## What PermaMission Does

```
create_mission(...) payable         -> steward creates and funds a mission treasury
fund_mission(...) payable           -> anyone can add GEN to the mission
submit_proposal(...)                -> builder submits plan + public evidence URL
review_proposal(...)                -> validators fetch evidence and decide mission fit
open_challenge(...)                 -> authorized party supplies new public evidence
review_challenge(...)               -> validators re-review with challenge evidence
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

Only proposal and challenge review enter non-deterministic consensus.

`review_proposal(proposal_id)`:

1. Loads the mission charter, constraints, proposal plan, requested amount, and evidence URL.
2. Fetches the evidence URL inside the contract with `gl.nondet.web.render(..., mode="text")`.
3. Calls an LLM for a structured review.
4. Uses `gl.eq_principle.prompt_comparative` so validators agree on meaning and outcome, not byte-identical wording.
5. Clamps outputs to allowed categories before writing state.

`review_challenge(proposal_id)`:

1. Requires the proposal to be in `CHALLENGED`.
2. Fetches the original evidence URL and the challenge evidence URL inside the contract.
3. Runs the same comparative consensus review with both evidence bodies and the challenge summary.
4. Updates the proposal decision before any payout can be released.

Stored verdict categories:

| Verdict | Meaning |
| --- | --- |
| `APPROVE` | Evidence supports that the proposal advances the mission. |
| `REJECT` | Evidence conflicts with the charter, lacks relevance, or shows the plan should not be funded. |
| `NEEDS_EVIDENCE` | The answer is not knowable from the supplied plan and fetched evidence. |

Decision statuses:

```
OPEN -> APPROVED | REJECTED | NEEDS_EVIDENCE
APPROVED -> CHALLENGED                       steward only
REJECTED | NEEDS_EVIDENCE -> CHALLENGED      proposer or steward
CHALLENGED -> APPROVED | REJECTED | NEEDS_EVIDENCE
APPROVED -> PAID
```

`CHALLENGED` is the key iteration: payout is blocked until validators review the original evidence plus new challenge evidence. A proposer can appeal a rejection or evidence gap. A steward can pause a suspicious approval before funds leave the treasury.

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
| `open_challenge(proposal_id, challenge_url, challenge_summary)` | write | Reopen a decision with new public evidence. |
| `review_challenge(proposal_id)` | consensus write | Fetch original plus challenge evidence and re-decide mission fit. |
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
| Contract | `0x68a028fc19Ca695203ad9c4930d742B32812A0E1` |
| Deployment tx | `0xf0f2e1c0e957d90acd9b14b8a50cce131147a485557f3a2388cdcdc5b08e70c4` |
| Source | `contracts/PermaMission.py` |

### Measured StudioNet flow

The upgraded deployment was exercised end-to-end with public IANA evidence:

| Flow | Transaction |
| --- | --- |
| Create mission | `0x5a88bc40615681fad5a32ecf6d8e8208066477bd53b9e949deabcae7f1e00103` |
| Fund mission | `0xd5aeecbe7c50f96d31dcae7e40750768500962fcbe0306671493ef9a68addc40` |
| Submit proposal | `0x39f5f6a6e4c55ed7135fbed9f65120f66efcea6b0ef87ac2e4b740a515154a82` |
| First consensus review | `0x5db266f7062ad0edcfd77fc06bfc58452052092b21aa7aceb00ff25c96ac493a` |
| Open challenge with new evidence | `0x9adc549064318ceff36ec574f574bf1b14d3675d15ea4e27dc33d97c9527ec6a` |
| Consensus review after challenge | `0xe35c30a421b4f69126ae3cc59e55994090f1feee934b7c47ab8c6af6a089c267` |
| Release payment | `0x31fe1026cb6b776ca16690c619354aa993088720981bcbf33045589820cce2ca` |
| Close mission | `0x44749ea7005c0e2fe1bddb4e7422ecf93e3c25cc68a2bfed46ea6101addfbc2c` |

The first review approved the proposal. The challenge added a second IANA source, validators fetched both sources, the second review approved again, and payout was released after that second verdict.

---

## Verification

Current measured checks:

```bash
python -m pytest tests\direct -v
# 32 passed

genvm-lint check contracts\PermaMission.py --json
# ok: true, methods: 14

npm run lint
# passed

npm run build
# passed

NEXT_PUBLIC_PERMAMISSION_CONTRACT=0x68a028fc19Ca695203ad9c4930d742B32812A0E1 npm run verify:schema
# Schema verified

node scripts\exercise-studionet.mjs
# create -> fund -> submit -> review_proposal -> open_challenge -> review_challenge -> release -> close
```

Direct tests cover:

| Area | Cases |
| --- | --- |
| Mission funding | funded creation, zero-value rejection, duplicate rejection, top-ups |
| Proposal submission | indexing, missing mission rejection, zero amount rejection, closed mission rejection |
| Consensus review | approve, reject, needs evidence, bad verdict clamp, bad score clamp |
| Challenge flow | reopen decision, second review, challenge blocks payout, approval-only steward challenge, proposer/steward appeals |
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
NEXT_PUBLIC_PERMAMISSION_CONTRACT=0x68a028fc19Ca695203ad9c4930d742B32812A0E1
```

Open http://localhost:3000.

---

## Honest Limits

- StudioNet balances are simulated. The project proves contract state transitions, consensus review shape, and emitted transfer branches in StudioNet, not production GEN settlement on a value-bearing mainnet.
- Evidence URLs should be stable public pages. Validators judge what they fetch during the review transaction.
- `NEEDS_EVIDENCE` is deliberately conservative. It blocks payout until better evidence is submitted or the proposal is reviewed again.
- The current payout split is simple: approved proposals can be released in full by the steward. More granular funding bands could be added later.
