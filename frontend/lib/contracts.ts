import type { Abi } from "viem";
import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "wagmi/chains";
import { getInstanceAddress, getSettlementAddress as _getSettlementAddress, getMockUsdcAddress as _getMockUsdcAddress } from "./instance";

// Build-time constants (env vars baked in at build) — kept for SSR fallback
export const shieldCardAddress =
  (process.env.NEXT_PUBLIC_SHIELDCARD_ADDRESS as `0x${string}` | undefined) ??
  undefined;

export const settlementAddress =
  (process.env.NEXT_PUBLIC_SETTLEMENT_ADDRESS as `0x${string}` | undefined) ??
  undefined;

export const mockUsdcAddress =
  (process.env.NEXT_PUBLIC_MOCKUSDC_ADDRESS as `0x${string}` | undefined) ??
  undefined;

// Runtime getters — always return string (empty string = not configured)
export function getShieldCardAddress(): string {
  return getInstanceAddress();
}

export function getRuntimeSettlementAddress(): string {
  return _getSettlementAddress();
}

export function getRuntimeMockUsdcAddress(): string {
  return _getMockUsdcAddress();
}

export const targetChain = arbitrumSepolia;

// Standalone public client — lazy singleton, safe for static export.
// Call getStandalonePublicClient() inside hooks/queryFns only (never at module level).
let _standaloneClient: ReturnType<typeof createPublicClient> | null = null;

export function getStandalonePublicClient() {
  if (typeof window === "undefined") return null;
  if (!_standaloneClient) {
    _standaloneClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(
        process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL ??
        "https://sepolia-rollup.arbitrum.io/rpc",
        { timeout: 12_000 },
      ),
    });
  }
  return _standaloneClient;
}

const inEuint32Components = [
  { name: "ctHash", type: "uint256", internalType: "uint256" },
  { name: "securityZone", type: "uint8", internalType: "uint8" },
  { name: "utype", type: "uint8", internalType: "uint8" },
  { name: "signature", type: "bytes", internalType: "bytes" },
] as const;

export const shieldCardAbi = [
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
    name: "employeeDept",
    stateMutability: "view",
    inputs: [{ name: "employee", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
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
      { name: "deptId",          type: "uint8",    internalType: "uint8"    },
      { name: "vendorId",        type: "uint16",   internalType: "uint16"   },
      { name: "encAmount",       type: "bytes32",  internalType: "euint32"  },
      { name: "encStatus",       type: "bytes32",  internalType: "euint8"   },
      { name: "memo",            type: "string",   internalType: "string"   },
      { name: "timestamp",       type: "uint256",  internalType: "uint256"  },
      { name: "resultPublished", type: "bool",     internalType: "bool"     },
      { name: "publicStatus",    type: "uint8",    internalType: "uint8"    },
      { name: "inReview",        type: "bool",     internalType: "bool"     },
      { name: "receiptHash",     type: "bytes32",  internalType: "bytes32"  },
      { name: "riskBitmap",      type: "uint16",   internalType: "uint16"   },
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
  {
    type: "function",
    name: "evidenceHash",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
  },
  {
    type: "function",
    name: "evidenceSubmitted",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
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
    name: "getPackIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8[]", internalType: "uint8[]" }],
  },
  {
    type: "function",
    name: "getActivePackIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8[]", internalType: "uint8[]" }],
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
  {
    type: "function",
    name: "packRecurringInterval",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "lastSubmitTimestamp",
    stateMutability: "view",
    inputs: [
      { name: "employee", type: "address", internalType: "address" },
      { name: "packId", type: "uint8", internalType: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  // ── View: departments ──────────────────────────────────────────────────────
  {
    type: "function",
    name: "getDeptIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8[]", internalType: "uint8[]" }],
  },
  {
    type: "function",
    name: "getDeptInfo",
    stateMutability: "view",
    inputs: [{ name: "deptId", type: "uint8", internalType: "uint8" }],
    outputs: [
      { name: "name",       type: "string",  internalType: "string"  },
      { name: "active",     type: "bool",    internalType: "bool"    },
      { name: "budgetSet",  type: "bool",    internalType: "bool"    },
      { name: "epochStart", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getDeptEncUsedBudget",
    stateMutability: "view",
    inputs: [{ name: "deptId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "bytes32", internalType: "euint32" }],
  },
  {
    type: "function",
    name: "deptExists",
    stateMutability: "view",
    inputs: [{ name: "deptId", type: "uint8", internalType: "uint8" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  // ── View: vendors ──────────────────────────────────────────────────────────
  {
    type: "function",
    name: "vendorCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16", internalType: "uint16" }],
  },
  {
    type: "function",
    name: "vendorExists",
    stateMutability: "view",
    inputs: [{ name: "vendorId", type: "uint16", internalType: "uint16" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "getVendorInfo",
    stateMutability: "view",
    inputs: [{ name: "vendorId", type: "uint16", internalType: "uint16" }],
    outputs: [
      { name: "name",   type: "string", internalType: "string" },
      { name: "status", type: "uint8",  internalType: "uint8"  },
    ],
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
    name: "assignEmployeeDept",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address", internalType: "address" },
      { name: "deptId", type: "uint8", internalType: "uint8" },
    ],
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
      { name: "encHardLimit",     type: "tuple", internalType: "struct InEuint32", components: inEuint32Components },
      { name: "encAutoThreshold", type: "tuple", internalType: "struct InEuint32", components: inEuint32Components },
      { name: "encBudgetLimit",   type: "tuple", internalType: "struct InEuint32", components: inEuint32Components },
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
    name: "setPackRecurringInterval",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "uint8", internalType: "uint8" },
      { name: "intervalSeconds", type: "uint256", internalType: "uint256" },
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
    name: "createDept",
    stateMutability: "nonpayable",
    inputs: [
      { name: "deptId", type: "uint8", internalType: "uint8" },
      { name: "name", type: "string", internalType: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setDeptActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "deptId", type: "uint8", internalType: "uint8" },
      { name: "active", type: "bool", internalType: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setDeptBudget",
    stateMutability: "nonpayable",
    inputs: [
      { name: "deptId", type: "uint8", internalType: "uint8" },
      { name: "encBudgetCap", type: "tuple", internalType: "struct InEuint32", components: inEuint32Components },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "resetDeptEpoch",
    stateMutability: "nonpayable",
    inputs: [{ name: "deptId", type: "uint8", internalType: "uint8" }],
    outputs: [],
  },
  {
    type: "function",
    name: "registerVendor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vendorId", type: "uint16", internalType: "uint16" },
      { name: "name", type: "string", internalType: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setVendorStatus",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vendorId", type: "uint16", internalType: "uint16" },
      { name: "status", type: "uint8", internalType: "uint8" },
    ],
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
      { name: "packId",   type: "uint8",  internalType: "uint8"  },
      { name: "deptId",   type: "uint8",  internalType: "uint8"  },
      { name: "vendorId", type: "uint16", internalType: "uint16" },
      { name: "encAmount", type: "tuple", internalType: "struct InEuint32", components: inEuint32Components },
      { name: "memo",     type: "string", internalType: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "submitEvidence",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId", type: "uint256", internalType: "uint256" },
      { name: "hash", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
  },
  // ── Events ─────────────────────────────────────────────────────────────────
  { type: "event", name: "EmployeeRegistered",  inputs: [{ name: "employee", type: "address", indexed: true }] },
  { type: "event", name: "EmployeeFrozen",      inputs: [{ name: "employee", type: "address", indexed: true }] },
  { type: "event", name: "EmployeeUnfrozen",    inputs: [{ name: "employee", type: "address", indexed: true }] },
  { type: "event", name: "EmployeeDeptAssigned",inputs: [{ name: "employee", type: "address", indexed: true }, { name: "deptId", type: "uint8", indexed: false }] },
  { type: "event", name: "SubmissionsPausedEvent",   inputs: [] },
  { type: "event", name: "SubmissionsUnpausedEvent", inputs: [] },
  {
    type: "event",
    name: "PackCreated",
    inputs: [{ name: "packId", type: "uint8", indexed: true }, { name: "name", type: "string", indexed: false }],
  },
  { type: "event", name: "PackLimitsSet",    inputs: [{ name: "packId", type: "uint8", indexed: true }] },
  {
    type: "event",
    name: "PackActiveChanged",
    inputs: [{ name: "packId", type: "uint8", indexed: true }, { name: "active", type: "bool", indexed: false }],
  },
  {
    type: "event",
    name: "BudgetEpochReset",
    inputs: [{ name: "packId", type: "uint8", indexed: true }, { name: "timestamp", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "PackIntervalSet",
    inputs: [{ name: "packId", type: "uint8", indexed: true }, { name: "intervalSeconds", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "DeptCreated",
    inputs: [{ name: "deptId", type: "uint8", indexed: true }, { name: "name", type: "string", indexed: false }],
  },
  {
    type: "event",
    name: "DeptBudgetSet",
    inputs: [{ name: "deptId", type: "uint8", indexed: true }],
  },
  {
    type: "event",
    name: "DeptEpochReset",
    inputs: [{ name: "deptId", type: "uint8", indexed: true }, { name: "timestamp", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "VendorRegistered",
    inputs: [{ name: "vendorId", type: "uint16", indexed: true }, { name: "name", type: "string", indexed: false }],
  },
  {
    type: "event",
    name: "VendorStatusUpdated",
    inputs: [{ name: "vendorId", type: "uint16", indexed: true }, { name: "status", type: "uint8", indexed: false }],
  },
  {
    type: "event",
    name: "EvidenceSubmitted",
    inputs: [{ name: "requestId", type: "uint256", indexed: true }, { name: "hash", type: "bytes32", indexed: false }],
  },
  {
    type: "event",
    name: "RequestSubmitted",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "employee",  type: "address", indexed: true },
      { name: "packId",    type: "uint8",   indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ResultPublished",
    inputs: [{ name: "requestId", type: "uint256", indexed: true }, { name: "status", type: "uint8", indexed: false }],
  },
  {
    type: "event",
    name: "RequestNeedsReview",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "employee",  type: "address", indexed: true },
      { name: "packId",    type: "uint8",   indexed: false },
    ],
  },
  {
    type: "event",
    name: "AdminResolved",
    inputs: [{ name: "requestId", type: "uint256", indexed: true }, { name: "approved", type: "bool", indexed: false }],
  },
  // ── Errors ─────────────────────────────────────────────────────────────────
  { type: "error", name: "EmployeeAlreadyRegistered",  inputs: [{ name: "employee", type: "address" }] },
  { type: "error", name: "EmployeeNotRegistered",      inputs: [{ name: "employee", type: "address" }] },
  { type: "error", name: "EmployeeIsFrozen",           inputs: [{ name: "employee", type: "address" }] },
  { type: "error", name: "InvalidEncryptedInput",      inputs: [] },
  { type: "error", name: "ResultAlreadyPublished",     inputs: [{ name: "requestId", type: "uint256" }] },
  { type: "error", name: "PackAlreadyExists",          inputs: [{ name: "packId", type: "uint8" }] },
  { type: "error", name: "PackNotFound",               inputs: [{ name: "packId", type: "uint8" }] },
  { type: "error", name: "PackInactive",               inputs: [{ name: "packId", type: "uint8" }] },
  { type: "error", name: "PackLimitsNotSet",           inputs: [{ name: "packId", type: "uint8" }] },
  { type: "error", name: "SubmissionsPaused",          inputs: [] },
  { type: "error", name: "RequestNotInReview",         inputs: [{ name: "requestId", type: "uint256" }] },
  { type: "error", name: "RequestNotFound",            inputs: [{ name: "requestId", type: "uint256" }] },
  { type: "error", name: "NotRequestOwner",            inputs: [{ name: "requestId", type: "uint256" }] },
  { type: "error", name: "DeptAlreadyExists",          inputs: [{ name: "deptId", type: "uint8" }] },
  { type: "error", name: "DeptNotFound",               inputs: [{ name: "deptId", type: "uint8" }] },
  { type: "error", name: "DeptInactive",               inputs: [{ name: "deptId", type: "uint8" }] },
  { type: "error", name: "VendorAlreadyRegistered",    inputs: [{ name: "vendorId", type: "uint16" }] },
  { type: "error", name: "VendorNotFound",             inputs: [{ name: "vendorId", type: "uint16" }] },
  { type: "error", name: "VendorBanned",               inputs: [{ name: "vendorId", type: "uint16" }] },
  { type: "error", name: "EvidenceAlreadySubmitted",   inputs: [{ name: "requestId", type: "uint256" }] },
  { type: "error", name: "RecurringIntervalNotElapsed",inputs: [{ name: "nextAllowedTimestamp", type: "uint256" }] },
] as const satisfies Abi;

// ── Types ────────────────────────────────────────────────────────────────────

export type RequestView = {
  employee:          `0x${string}`;
  packId:            number;
  deptId:            number;
  vendorId:          number;
  encAmount:         `0x${string}`;
  encStatus:         `0x${string}`;
  memo:              string;
  timestamp:         bigint;
  resultPublished:   boolean;
  publicStatus:      number;
  inReview:          boolean;
  receiptHash:       `0x${string}`;
  riskBitmap:        number;
  evidenceHash:      `0x${string}`;
  evidenceSubmitted: boolean;
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

export type DeptInfo = {
  id:         number;
  name:       string;
  active:     boolean;
  budgetSet:  boolean;
  epochStart: bigint;
};

export type VendorInfo = {
  id:     number;
  name:   string;
  status: number; // VENDOR_* constants
};

// Status constants — mirrors ShieldCardControlPlane.sol
export const STATUS = {
  SUBMITTED:      0,
  AUTO_APPROVED:  1,
  NEEDS_REVIEW:   2,
  AUTO_DENIED:    3,
  ADMIN_APPROVED: 4,
  ADMIN_DENIED:   5,
} as const;

// Vendor status constants — mirrors ShieldCardControlPlane.sol
export const VENDOR_STATUS = {
  UNCHECKED: 0,
  COMPLIANT: 1,
  SUSPENDED: 2,
  BANNED:    3,
} as const;

// Risk bitmap flags — mirrors ShieldCardControlPlane.sol
export const RISK = {
  VENDOR_SUSPENDED: 0x0001,
  VENDOR_UNCHECKED: 0x0002,
  NO_DEPT:          0x0004,
  NO_VENDOR:        0x0008,
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

export function vendorStatusLabel(status: number): string {
  switch (status) {
    case VENDOR_STATUS.COMPLIANT: return "Compliant";
    case VENDOR_STATUS.SUSPENDED: return "Suspended";
    case VENDOR_STATUS.BANNED:    return "Banned";
    default:                      return "Unchecked";
  }
}

export function riskFlags(bitmap: number): string[] {
  const flags: string[] = [];
  if (bitmap & RISK.VENDOR_SUSPENDED) flags.push("Vendor Suspended");
  if (bitmap & RISK.VENDOR_UNCHECKED) flags.push("Vendor Unverified");
  if (bitmap & RISK.NO_DEPT)          flags.push("No Department");
  if (bitmap & RISK.NO_VENDOR)        flags.push("No Vendor");
  return flags;
}

// Fallback pack names — superseded by on-chain getPackIds() + getPackInfo()
export const POLICY_PACKS = [
  { id: 1, name: "Travel",    hardLimitCents: 200_000, autoThresholdCents: 50_000,  budgetLimitCents: 2_000_000 },
  { id: 2, name: "SaaS",      hardLimitCents: 150_000, autoThresholdCents: 30_000,  budgetLimitCents: 1_000_000 },
  { id: 3, name: "Vendor",    hardLimitCents: 300_000, autoThresholdCents: 100_000, budgetLimitCents: 3_000_000 },
  { id: 4, name: "Marketing", hardLimitCents: 100_000, autoThresholdCents: 25_000,  budgetLimitCents: 800_000  },
] as const;

export const PACK_NAME: Record<number, string> = Object.fromEntries(
  POLICY_PACKS.map((p) => [p.id, p.name]),
);

// =============================================================================
// Wave 5: ShieldCardSettlement + MockUSDC ABIs and types
// =============================================================================

export const SETTLEMENT_STATE = {
  NONE:      0,
  PENDING:   1,
  APPROVED:  2,
  SETTLED:   3,
  CANCELLED: 4,
} as const;

export function settlementStateLabel(state: number): string {
  switch (state) {
    case SETTLEMENT_STATE.PENDING:   return "Pending";
    case SETTLEMENT_STATE.APPROVED:  return "Approved";
    case SETTLEMENT_STATE.SETTLED:   return "Settled";
    case SETTLEMENT_STATE.CANCELLED: return "Cancelled";
    default:                          return "—";
  }
}

export type SettlementRecord = {
  recipient:       `0x${string}`;
  amount:          bigint;
  state:           number;
  approvalsCount:  number;
  highRisk:        boolean;
  createdAt:       bigint;
  settledAt:       bigint;
  settlementHash:  `0x${string}`;
  prevChainHead:   `0x${string}`;
  coreReceiptHash: `0x${string}`;
  cancelReason:    string;
};

export const settlementAbi = [
  { type: "function", name: "core",           stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token",          stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "chainHead",      stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "normalQuorum",   stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "highRiskQuorum", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "isApprover", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "getApprovers", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
  { type: "function", name: "settlementExists", stateMutability: "view", inputs: [{ name: "requestId", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "getSettlementState", stateMutability: "view", inputs: [{ name: "requestId", type: "uint256" }], outputs: [{ type: "uint8" }] },
  { type: "function", name: "hasApproved", stateMutability: "view", inputs: [{ name: "requestId", type: "uint256" }, { name: "approver", type: "address" }], outputs: [{ type: "bool" }] },
  {
    type: "function",
    name: "getSettlement",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "recipient",       type: "address" },
        { name: "amount",          type: "uint256" },
        { name: "state",           type: "uint8" },
        { name: "approvalsCount",  type: "uint8" },
        { name: "highRisk",        type: "bool" },
        { name: "createdAt",       type: "uint256" },
        { name: "settledAt",       type: "uint256" },
        { name: "settlementHash",  type: "bytes32" },
        { name: "prevChainHead",   type: "bytes32" },
        { name: "coreReceiptHash", type: "bytes32" },
        { name: "cancelReason",    type: "string" },
      ],
    }],
  },
  {
    type: "function",
    name: "verifyReceipt",
    stateMutability: "view",
    inputs: [
      { name: "prevChainHead",   type: "bytes32" },
      { name: "requestId",       type: "uint256" },
      { name: "recipient",       type: "address" },
      { name: "amount",          type: "uint256" },
      { name: "coreReceiptHash", type: "bytes32" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  // Mutating
  { type: "function", name: "createSettlement", stateMutability: "nonpayable", inputs: [{ name: "requestId", type: "uint256" }, { name: "recipient", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "requestId", type: "uint256" }], outputs: [] },
  { type: "function", name: "settle", stateMutability: "nonpayable", inputs: [{ name: "requestId", type: "uint256" }], outputs: [] },
  { type: "function", name: "cancel", stateMutability: "nonpayable", inputs: [{ name: "requestId", type: "uint256" }, { name: "reason", type: "string" }], outputs: [] },
  { type: "function", name: "fund", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "addApprover", stateMutability: "nonpayable", inputs: [{ name: "a", type: "address" }], outputs: [] },
  { type: "function", name: "setQuorums", stateMutability: "nonpayable", inputs: [{ name: "normal", type: "uint8" }, { name: "highRisk", type: "uint8" }], outputs: [] },
  // Events
  { type: "event", name: "SettlementCreated",       inputs: [{ name: "requestId", type: "uint256", indexed: true }, { name: "recipient", type: "address", indexed: true }, { name: "amount", type: "uint256" }, { name: "highRisk", type: "bool" }] },
  { type: "event", name: "SettlementApproved",      inputs: [{ name: "requestId", type: "uint256", indexed: true }, { name: "approver", type: "address", indexed: true }, { name: "totalApprovals", type: "uint8" }] },
  { type: "event", name: "SettlementQuorumReached", inputs: [{ name: "requestId", type: "uint256", indexed: true }, { name: "quorum", type: "uint8" }] },
  { type: "event", name: "Settled",                 inputs: [{ name: "requestId", type: "uint256", indexed: true }, { name: "recipient", type: "address", indexed: true }, { name: "amount", type: "uint256" }, { name: "chainHead", type: "bytes32" }, { name: "prevChainHead", type: "bytes32" }] },
  { type: "event", name: "Cancelled",               inputs: [{ name: "requestId", type: "uint256", indexed: true }, { name: "reason", type: "string" }] },
] as const satisfies Abi;

export const mockUsdcAbi = [
  { type: "function", name: "decimals",   stateMutability: "pure", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "name",       stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol",     stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "balanceOf",  stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "faucet",     stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "mint",       stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const satisfies Abi;

// =============================================================================
// Wave 5: Core additive surface — auditor + admin rotation ABI entries
// =============================================================================

export const auditorAbi = [
  { type: "function", name: "auditor",  stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "setAuditor", stateMutability: "nonpayable", inputs: [{ name: "newAuditor", type: "address" }], outputs: [] },
  { type: "function", name: "grantAuditorAccess", stateMutability: "nonpayable", inputs: [{ name: "requestIds", type: "uint256[]" }], outputs: [] },
  { type: "function", name: "setAdmin", stateMutability: "nonpayable", inputs: [{ name: "newAdmin", type: "address" }], outputs: [] },
  { type: "function", name: "grantAdminAccess", stateMutability: "nonpayable", inputs: [{ name: "requestIds", type: "uint256[]" }], outputs: [] },
  { type: "event", name: "DisclosureGranted", inputs: [{ name: "requestId", type: "uint256", indexed: true }, { name: "auditor", type: "address", indexed: true }] },
] as const satisfies Abi;

// Receipt verification helper (matches contract's _finaliseRequest keccak256 packing)
export function computeReceiptHash(params: {
  requestId:       bigint;
  employee:        `0x${string}`;
  packId:          number;
  finalStatus:     number;
  timestamp:       bigint;
  contractAddress: `0x${string}`;
  chainId:         number;
}): `0x${string}` {
  // Lazy-import keccak256 + encodePacked from viem inside caller to avoid SSR issues.
  // Reference packing:
  //   keccak256(abi.encodePacked(requestId, employee, packId, finalStatus, timestamp, contract, chainId))
  // requestId, timestamp = uint256; packId, finalStatus = uint8; chainId = uint256.
  throw new Error("Use viem keccak256/encodePacked inline — this helper is reference only.");
}
