import type { Abi } from "viem";
import { arbitrumSepolia } from "wagmi/chains";

export const shieldCardAddress =
  (process.env.NEXT_PUBLIC_SHIELDCARD_ADDRESS as `0x${string}` | undefined) ??
  undefined;

export const targetChain = arbitrumSepolia;

const inEuint32Components = [
  { name: "ctHash", type: "uint256", internalType: "uint256" },
  { name: "securityZone", type: "uint8", internalType: "uint8" },
  { name: "utype", type: "uint8", internalType: "uint8" },
  { name: "signature", type: "bytes", internalType: "bytes" },
] as const;

export const shieldCardAbi = [
  // ── Status constants (read from contract; replicated here for reference) ───
  // STATUS_SUBMITTED=0 AUTO_APPROVED=1 NEEDS_REVIEW=2 AUTO_DENIED=3 ADMIN_APPROVED=4 ADMIN_DENIED=5

  // ── View: admin / global ────────────────────────────────────────────────────
  {
    type: "function",
    name: "admin",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "submissionsPaused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  // ── View: employee ─────────────────────────────────────────────────────────
  {
    type: "function",
    name: "employeeRegistered",
    stateMutability: "view",
    inputs: [{ name: "employee", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "employeeFrozen",
    stateMutability: "view",
    inputs: [{ name: "employee", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "registeredEmployees",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "getRegisteredEmployeeCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  // ── View: requests ─────────────────────────────────────────────────────────
  {
    type: "function",
    name: "getRequestCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "getEmployeeRequestIds",
    stateMutability: "view",
    inputs: [{ name: "employee", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
  },
  {
    type: "function",
    name: "getRequest",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "employee",        type: "address",  internalType: "address"  },
      { name: "packId",          type: "uint8",    internalType: "uint8"    },
      { name: "encAmount",       type: "bytes32",  internalType: "euint32"  },
      { name: "encStatus",       type: "bytes32",  internalType: "euint8"   },
      { name: "memo",            type: "string",   internalType: "string"   },
      { name: "timestamp",       type: "uint256",  internalType: "uint256"  },
      { name: "resultPublished", type: "bool",     internalType: "bool"     },
      { name: "publicStatus",    type: "uint8",    internalType: "uint8"    },
      { name: "inReview",        type: "bool",     internalType: "bool"     },
      { name: "receiptHash",     type: "bytes32",  internalType: "bytes32"  },
    ],
  },
  {
    type: "function",
    name: "getEncryptedStatus",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bytes32", internalType: "euint8" }],
  },
  {
    type: "function",
    name: "getEncryptedAmount",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bytes32", internalType: "euint32" }],
  },
  // ── View: policy packs ─────────────────────────────────────────────────────
  {
    type: "function",
    name: "packCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
  },
  {
    type: "function",
    name: "packExists",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "getPackInfo",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
    outputs: [
      { name: "name",       type: "string",  internalType: "string"  },
      { name: "active",     type: "bool",    internalType: "bool"    },
      { name: "limitsSet",  type: "bool",    internalType: "bool"    },
      { name: "epochStart", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getPackSummary",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
    outputs: [
      { name: "total",    type: "uint256", internalType: "uint256" },
      { name: "approved", type: "uint256", internalType: "uint256" },
      { name: "denied",   type: "uint256", internalType: "uint256" },
      { name: "pending",  type: "uint256", internalType: "uint256" },
      { name: "inReview", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    name: "packTotalRequests",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "packApprovedCount",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "packDeniedCount",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "packReviewPendingCount",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  // ── Write: admin ───────────────────────────────────────────────────────────
  {
    type: "function",
    name: "pauseSubmissions",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "unpauseSubmissions",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "registerEmployee",
    stateMutability: "nonpayable",
    inputs: [{ name: "employee", type: "address", internalType: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "freezeEmployee",
    stateMutability: "nonpayable",
    inputs: [{ name: "employee", type: "address", internalType: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "unfreezeEmployee",
    stateMutability: "nonpayable",
    inputs: [{ name: "employee", type: "address", internalType: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "createPack",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "uint8", internalType: "uint8" },
      { name: "name", type: "string", internalType: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setPolicyThresholds",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "uint8", internalType: "uint8" },
      {
        name: "encHardLimit",
        type: "tuple",
        internalType: "struct InEuint32",
        components: inEuint32Components,
      },
      {
        name: "encAutoThreshold",
        type: "tuple",
        internalType: "struct InEuint32",
        components: inEuint32Components,
      },
      {
        name: "encBudgetLimit",
        type: "tuple",
        internalType: "struct InEuint32",
        components: inEuint32Components,
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setPackActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "uint8", internalType: "uint8" },
      { name: "active", type: "bool", internalType: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "resetBudgetEpoch",
    stateMutability: "nonpayable",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
    outputs: [],
  },
  {
    type: "function",
    name: "publishDecryptedResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId", type: "uint256", internalType: "uint256" },
      { name: "plainStatus", type: "uint8", internalType: "uint8" },
      { name: "sig", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "adminReviewRequest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId", type: "uint256", internalType: "uint256" },
      { name: "approved", type: "bool", internalType: "bool" },
    ],
    outputs: [],
  },
  // ── Write: employee ────────────────────────────────────────────────────────
  {
    type: "function",
    name: "submitRequest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "uint8", internalType: "uint8" },
      {
        name: "encAmount",
        type: "tuple",
        internalType: "struct InEuint32",
        components: inEuint32Components,
      },
      { name: "memo", type: "string", internalType: "string" },
    ],
    outputs: [],
  },
  // ── Events ─────────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "EmployeeRegistered",
    inputs: [{ name: "employee", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "EmployeeFrozen",
    inputs: [{ name: "employee", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "EmployeeUnfrozen",
    inputs: [{ name: "employee", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "SubmissionsPausedEvent",
    inputs: [],
  },
  {
    type: "event",
    name: "SubmissionsUnpausedEvent",
    inputs: [],
  },
  {
    type: "event",
    name: "PackCreated",
    inputs: [
      { name: "packId", type: "uint8", indexed: true },
      { name: "name", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PackLimitsSet",
    inputs: [{ name: "packId", type: "uint8", indexed: true }],
  },
  {
    type: "event",
    name: "PackActiveChanged",
    inputs: [
      { name: "packId", type: "uint8", indexed: true },
      { name: "active", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BudgetEpochReset",
    inputs: [
      { name: "packId", type: "uint8", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RequestSubmitted",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "employee", type: "address", indexed: true },
      { name: "packId", type: "uint8", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ResultPublished",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "status", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RequestNeedsReview",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "employee", type: "address", indexed: true },
      { name: "packId", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AdminResolved",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "approved", type: "bool", indexed: false },
    ],
  },
  // ── Errors ─────────────────────────────────────────────────────────────────
  { type: "error", name: "EmployeeAlreadyRegistered", inputs: [{ name: "employee", type: "address" }] },
  { type: "error", name: "EmployeeNotRegistered",     inputs: [{ name: "employee", type: "address" }] },
  { type: "error", name: "EmployeeIsFrozen",          inputs: [{ name: "employee", type: "address" }] },
  { type: "error", name: "InvalidEncryptedInput",     inputs: [] },
  { type: "error", name: "ResultAlreadyPublished",    inputs: [{ name: "requestId", type: "uint256" }] },
  { type: "error", name: "PackAlreadyExists",         inputs: [{ name: "packId", type: "uint8" }] },
  { type: "error", name: "PackNotFound",              inputs: [{ name: "packId", type: "uint8" }] },
  { type: "error", name: "PackInactive",              inputs: [{ name: "packId", type: "uint8" }] },
  { type: "error", name: "PackLimitsNotSet",          inputs: [{ name: "packId", type: "uint8" }] },
  { type: "error", name: "SubmissionsPaused",         inputs: [] },
  { type: "error", name: "RequestNotInReview",        inputs: [{ name: "requestId", type: "uint256" }] },
  { type: "error", name: "RequestNotFound",           inputs: [{ name: "requestId", type: "uint256" }] },
] as const satisfies Abi;

// ── Types ────────────────────────────────────────────────────────────────────

export type RequestView = {
  employee:        `0x${string}`;
  packId:          number;
  encAmount:       `0x${string}`;
  encStatus:       `0x${string}`;
  memo:            string;
  timestamp:       bigint;
  resultPublished: boolean;
  publicStatus:    number;
  inReview:        boolean;
  receiptHash:     `0x${string}`;
};

export type PackInfo = {
  id:         number;
  name:       string;
  active:     boolean;
  limitsSet:  boolean;
  epochStart: bigint;
};

export type PackSummary = {
  total:    bigint;
  approved: bigint;
  denied:   bigint;
  pending:  bigint;
  inReview: bigint;
};

// Status constants — mirrors contract
export const STATUS = {
  SUBMITTED:      0,
  AUTO_APPROVED:  1,
  NEEDS_REVIEW:   2,
  AUTO_DENIED:    3,
  ADMIN_APPROVED: 4,
  ADMIN_DENIED:   5,
} as const;

export function statusLabel(status: number, inReview: boolean): string {
  if (inReview) return "In Review";
  switch (status) {
    case STATUS.AUTO_APPROVED:  return "Auto Approved";
    case STATUS.NEEDS_REVIEW:   return "Needs Review";
    case STATUS.AUTO_DENIED:    return "Auto Denied";
    case STATUS.ADMIN_APPROVED: return "Approved";
    case STATUS.ADMIN_DENIED:   return "Denied";
    default:                    return "Pending";
  }
}

export function statusColor(status: number, inReview: boolean) {
  if (inReview) return "pending";
  if (status === STATUS.AUTO_APPROVED || status === STATUS.ADMIN_APPROVED) return "approved";
  if (status === STATUS.AUTO_DENIED   || status === STATUS.ADMIN_DENIED)   return "denied";
  if (status === STATUS.NEEDS_REVIEW) return "pending";
  return "muted";
}

export const POLICY_PACKS = [
  { id: 1, name: "Travel",    hardLimitCents: 200_000, autoThresholdCents: 50_000,  budgetLimitCents: 2_000_000 },
  { id: 2, name: "SaaS",      hardLimitCents: 150_000, autoThresholdCents: 30_000,  budgetLimitCents: 1_000_000 },
  { id: 3, name: "Vendor",    hardLimitCents: 300_000, autoThresholdCents: 100_000, budgetLimitCents: 3_000_000 },
  { id: 4, name: "Marketing", hardLimitCents: 100_000, autoThresholdCents: 25_000,  budgetLimitCents: 800_000  },
] as const;

export const PACK_NAME: Record<number, string> = Object.fromEntries(
  POLICY_PACKS.map((p) => [p.id, p.name]),
);
