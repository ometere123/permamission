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
create_mission(...) payable         -> steward creates, funds, and receives a funding receipt
fund_mission(...) payable           -> anyone can add GEN and receive a funding receipt
submit_proposal(...)                -> builder submits plan + public evidence URL
review_proposal(...)                -> validators fetch evidence and decide mission fit
open_challenge(...)                 -> authorized party supplies new public evidence
review_challenge(...)               -> validators re-review with challenge evidence
release_payment(...)                -> anyone can execute the approved payout path
close_mission(...)                  -> steward closes future submissions
get_profile(...)                    -> read an address dashboard from contract state
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
| State as source of truth | Missions, contributions, profiles, proposals, verdicts, challenge evidence, and payout state live in the contract. |
| Value movement | `release_payment` emits the GEN transfer only after an approved decision; any caller can execute it, but the contract fixes the proposer as recipient. |

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
- `/dashboard` reads the connected wallet's contract profile: stewarded missions, submitted proposals, funded missions, payouts, and open challenge work.

Wallet support:

- injected EIP-1193 wallet when available
- generated browser wallet when no injected wallet is available
- import/export for generated keys
- persisted transaction rail with GenLayer stages
- hydration-safe wallet restore after first render

There is no database and no seeded demo data. If no contract is configured, the UI renders empty contract-read states.

Funder receipts are also contract state. Adding GEN does not grant voting rights or payout control, but it does create a public contribution record that appears in the funder's dashboard.

---

## Contract API

| Method | Type | Purpose |
| --- | --- | --- |
| `create_mission(mission_id, name, charter, constraints, treasury_goal)` | payable write | Create and fund a mission treasury. |
| `fund_mission(mission_id)` | payable write | Add GEN to a mission treasury and update contributor receipts. |
| `submit_proposal(proposal_id, mission_id, title, requested_amount, plan, evidence_url)` | write | Submit a public evidence-backed proposal. |
| `review_proposal(proposal_id)` | consensus write | Fetch evidence and decide mission fit. |
| `open_challenge(proposal_id, challenge_url, challenge_summary)` | write | Reopen a decision with new public evidence. |
| `review_challenge(proposal_id)` | consensus write | Fetch original plus challenge evidence and re-decide mission fit. |
| `release_payment(proposal_id)` | write | Permissionlessly releases GEN after approval to the recorded proposer. |
| `mark_paid(proposal_id)` | write | Compatibility alias for `release_payment`. |
| `close_mission(mission_id)` | write | Close future submissions for a mission. |
| `get_summary()` | view | Contract-level counters and balance. |
| `list_missions(offset, limit)` | view | Paged mission records. |
| `list_proposals(mission_id, offset, limit)` | view | Paged proposal records. |
| `list_contributions(account, offset, limit)` | view | Paged funding receipts, optionally filtered by contributor. |
| `get_profile(account)` | view | Address dashboard for stewarding, funding, proposing, payouts, and challenge work. |
| `get_mission(mission_id)` | view | Single mission record. |
| `get_proposal(proposal_id)` | view | Single proposal record. |

---

## Deployed on StudioNet

| Field | Value |
| --- | --- |
| Network | GenLayer StudioNet |
| Chain | `studionet` |
| RPC | `https://studio.genlayer.com/api` |
| Contract | `0x73770B6a055855192A510C8E70DB7c6488569809` |
| Deployment tx | `0x11ecaff505119848fdc023a3557c081c3f7f1cb1029063ae770f68c9d5c4b197` |
| Source | `contracts/PermaMission.py` |

### Measured StudioNet flow

The upgraded deployment was exercised end-to-end with public IANA evidence:

| Flow | Transaction |
| --- | --- |
| Create mission | `0x59928d50e4bfd7997663733621384c964c607d7b824a2e0e3e2ab22fe27c26a4` |
| Fund mission | `0x52355445529153e42b4c50a2c0f462a7a4bdd1d132d878fc375bc861a403c363` |
| Submit proposal | `0xc9e8956853a16642f11a50660c488de4409cff6b240c5f1c1f7e85a38724a1a9` |
| First consensus review | `0x3897cbb1fb2ec28c8e7893c869a2bcf1e0885e8d2beae292e572874d9b91a376` |
| Open challenge with new evidence | `0xf81b09aa2ceea147ca189864c4132886ee5ba73bc055c16820c27d1efca737c6` |
| Consensus review after challenge | `0x06148b924928f56e6f9091e481387381768eed5e284dc431c4f8eac61bcb38ba` |
| Release payment | `0xecf257f0a007cdb136799b1cfe9e3d964c256af6948cb51c1d3e00488db093b4` |
| Close mission | `0x6ba32a7769fd9f70304c3c1a01bfc9e5890515d4457bf4ec57e9a84307e804be` |

The first review approved the proposal. The challenge added a second IANA source, validators fetched both sources, the second review approved again, and payout was released after that second verdict.

---

## Verification

Current measured checks:

```bash
python -m pytest tests\direct -v
# 35 passed

genvm-lint check contracts\PermaMission.py --json
# ok: true, methods: 16

npm run lint
# passed

npm run build
# passed

NEXT_PUBLIC_PERMAMISSION_CONTRACT=0x73770B6a055855192A510C8E70DB7c6488569809 npm run verify:schema
# Schema verified

node scripts\exercise-studionet.mjs
# create -> fund -> submit -> review_proposal -> open_challenge -> review_challenge -> release -> close
```

Direct tests cover:

| Area | Cases |
| --- | --- |
| Mission funding | funded creation, zero-value rejection, duplicate rejection, top-ups, contribution receipts |
| Proposal submission | indexing, missing mission rejection, zero amount rejection, closed mission rejection |
| Consensus review | approve, reject, needs evidence, bad verdict clamp, bad score clamp |
| Challenge flow | reopen decision, second review, challenge blocks payout, approval-only steward challenge, proposer/steward appeals |
| Settlement | permissionless approved release, treasury shortfall, paid state, emitted transfer branch |
| Profiles | stewarded missions, submitted proposals, funding receipts, earned payouts |
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
    dashboard/             Connected-wallet profile dashboard
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
NEXT_PUBLIC_PERMAMISSION_CONTRACT=0x73770B6a055855192A510C8E70DB7c6488569809
```

Open http://localhost:3000.

---

## Honest Limits

- StudioNet balances are simulated. The project proves contract state transitions, consensus review shape, and emitted transfer branches in StudioNet, not production GEN settlement on a value-bearing mainnet.
- Evidence URLs should be stable public pages. Validators judge what they fetch during the review transaction.
- `NEEDS_EVIDENCE` is deliberately conservative. It blocks payout until better evidence is submitted or the proposal is reviewed again.
- The current payout split is simple: approved proposals are released in full to the proposer. More granular funding bands could be added later.
