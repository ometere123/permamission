# PermaMission Decision Record

PermaMission is a mission-bound treasury primitive. A steward creates a durable public mission, anyone can fund it, builders submit actions that claim to advance the mission, and GenLayer validators review public evidence before funds are released.

## Candidate Sweep

1. **PermaMission Trusts**: mission funds that outlive one operator and pay proposals only when evidence shows alignment.
2. **Civic Signal Market**: prediction markets for public policy commitments.
3. **Rainline Cover**: parametric insurance for weather-triggered small business losses.
4. **WebWitness**: notary for online state and deleted-page evidence.
5. **SourceGarden**: rewarded source-backed public knowledge database.
6. **Rulebench**: policy arbitration for communities and marketplaces.
7. **TrapForge**: security honeypot challenge payouts.
8. **ProofLens**: image-backed physical work verification.
9. **TrustTerm Credit**: under-collateralized lending from verified reputation.

## Capability Coverage

- Native GEN: PermaMission, Rainline, TrapForge, TrustTerm.
- Web access: PermaMission, WebWitness, SourceGarden, Civic Signal Market.
- LLM judgement: PermaMission, Rulebench, ProofLens, TrapForge.
- Images: ProofLens.
- Cross-contract future path: PermaMission can deploy or call specialized mission subcontracts.
- Semantic memory future path: SourceGarden and PermaMission can add vector search for past decisions.

## Chosen Project

PermaMission wins because it is not a one-shot demo. It gives DAOs, open-source ecosystems, local communities, and long-running public goods teams a repeatable way to maintain a funded mission without trusting one private committee.

## Gates

- **Counterfactual**: without GenLayer, a server operator or multisig committee decides whether proposals advance the mission. Distrusting contributors and funders must trust that party.
- **Two distrusting parties**: funders want mission fidelity; proposers want fair payout; stewards want continuity without being accused of bias.
- **Irreducibly semantic**: “does this proposal advance the mission under this charter, given this evidence?” is judgement, not parsing.
- **Evidence fetched contract-side**: `review_proposal` fetches the submitted evidence URL inside consensus and treats it as evidence.
- **Use twice**: missions receive many proposals over time. The app is a working treasury desk, not a single proof.
- **Decision depth**: accepted, rejected, or under-evidenced proposals can be challenged with new public evidence, then re-reviewed by consensus before payout.
- **Path beyond submission**: public goods grants, ecosystem bounties, autonomous trusts, and research/community funds can run on it.
- **Latency**: creation, funding, and submission are deterministic; slow consensus review is permissionless and separate.

## Self Audit

The original candidate set spans five distinct GenLayer capabilities. PermaMission primarily uses native value, web access, LLM judgement, transaction lifecycle visibility, and contract source-of-truth storage. The most similar pair is Rulebench and PermaMission because both evaluate text against rules; PermaMission differs by centering recurring mission treasuries and payouts. If web access did not exist, I would choose Rulebench for submitted evidence bundles or ProofLens for image evidence.

## Non-Determinism Budget

`review_proposal` uses one primary web render, an optional challenge-evidence web render, and one LLM prompt inside one consensus round. The contract stores categorical output only: APPROVE, REJECT, NEEDS_EVIDENCE and HIGH, MEDIUM, LOW, UNKNOWN. Abstention is represented by NEEDS_EVIDENCE.
