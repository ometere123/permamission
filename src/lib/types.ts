export type Mission = {
  id: string;
  steward: string;
  name: string;
  charter: string;
  constraints: string;
  treasury_goal: string;
  treasury_available: string;
  created_at: string;
  active: boolean;
  proposal_count: string;
  approved_count: string;
  paid_count: string;
};

export type Proposal = {
  id: string;
  mission_id: string;
  proposer: string;
  title: string;
  requested_amount: string;
  plan: string;
  evidence_url: string;
  status: "OPEN" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_EVIDENCE" | "CHALLENGED" | "PAID";
  created_at: string;
  reviewed_at: string;
  score_band: "UNREVIEWED" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  verdict: "UNREVIEWED" | "APPROVE" | "REJECT" | "NEEDS_EVIDENCE";
  rationale: string;
  evidence_summary: string;
  challenge_url: string;
  challenge_summary: string;
  challenged_at: string;
  paid_amount: string;
  released_to: string;
};

export type Summary = {
  steward: string;
  mission_count: number | string;
  proposal_count: number | string;
  contribution_count: number | string;
  balance: string;
};

export type Contribution = {
  id: string;
  mission_id: string;
  contributor: string;
  amount: string;
  first_funded_at: string;
  last_funded_at: string;
};

export type Profile = {
  account: string;
  stewarded_missions: Mission[];
  submitted_proposals: Proposal[];
  funded_missions: Contribution[];
  paid_proposals: Proposal[];
  open_challenges: Proposal[];
  funded_total: string;
  earned_total: string;
};

export type TxStage =
  | "UNINITIALIZED"
  | "PENDING"
  | "PROPOSING"
  | "COMMITTING"
  | "REVEALING"
  | "ACCEPTED"
  | "UNDETERMINED"
  | "FINALIZED"
  | "CANCELED"
  | "APPEAL_REVEALING"
  | "APPEAL_COMMITTING"
  | "READY_TO_FINALIZE"
  | "VALIDATORS_TIMEOUT"
  | "LEADER_TIMEOUT";

export type StoredTransaction = {
  hash: `0x${string}` & { length?: 66 };
  label: string;
  createdAt: string;
  status: TxStage;
  functionName: string;
};
