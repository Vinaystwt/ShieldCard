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
  // ── View: admin / employee ──────────────────────────────────────────────────
  {
    type: "function",
    name: "admin",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "employeeRegistered",
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
      {
        name: "request",
        type: "tuple",
        internalType: "struct IShieldCardPolicy.PaymentRequestView",
        components: [
          { name: "employee", type: "address", internalType: "address" },
          { name: "packId", type: "uint8", internalType: "uint8" },
          { name: "encAmount", type: "bytes32", internalType: "euint32" },
          { name: "encStatus", type: "bytes32", internalType: "euint8" },
          { name: "memo", type: "string", internalType: "string" },
          { name: "timestamp", type: "uint256", internalType: "uint256" },
          { name: "resultPublished", type: "bool", internalType: "bool" },
          { name: "publicStatus", type: "uint8", internalType: "uint8" },
        ],
      },
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
      { name: "name", type: "string", internalType: "string" },
      { name: "active", type: "bool", internalType: "bool" },
      { name: "limitSet", type: "bool", internalType: "bool" },
    ],
  },
  {
    type: "function",
    name: "getPackSummary",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
    outputs: [
      { name: "total", type: "uint256", internalType: "uint256" },
      { name: "approved", type: "uint256", internalType: "uint256" },
      { name: "denied", type: "uint256", internalType: "uint256" },
      { name: "pending", type: "uint256", internalType: "uint256" },
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
  // ── Write: admin ───────────────────────────────────────────────────────────
  {
    type: "function",
    name: "registerEmployee",
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
    name: "setPackLimit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "uint8", internalType: "uint8" },
      {
        name: "encLimit",
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
    name: "publishDecryptedResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId", type: "uint256", internalType: "uint256" },
      { name: "plainStatus", type: "uint8", internalType: "uint8" },
      { name: "sig", type: "bytes", internalType: "bytes" },
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
    inputs: [
      { name: "employee", type: "address", indexed: true, internalType: "address" },
    ],
  },
  {
    type: "event",
    name: "PackCreated",
    inputs: [
      { name: "packId", type: "uint8", indexed: true, internalType: "uint8" },
      { name: "name", type: "string", indexed: false, internalType: "string" },
    ],
  },
  {
    type: "event",
    name: "PackLimitSet",
    inputs: [
      { name: "packId", type: "uint8", indexed: true, internalType: "uint8" },
    ],
  },
  {
    type: "event",
    name: "PackActiveChanged",
    inputs: [
      { name: "packId", type: "uint8", indexed: true, internalType: "uint8" },
      { name: "active", type: "bool", indexed: false, internalType: "bool" },
    ],
  },
  {
    type: "event",
    name: "RequestSubmitted",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "employee", type: "address", indexed: true, internalType: "address" },
      { name: "packId", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ResultPublished",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "status", type: "uint8", indexed: false, internalType: "uint8" },
    ],
  },
  // ── Errors ─────────────────────────────────────────────────────────────────
  {
    type: "error",
    name: "EmployeeAlreadyRegistered",
    inputs: [{ name: "employee", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "EmployeeNotRegistered",
    inputs: [{ name: "employee", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "InvalidEncryptedInput",
    inputs: [],
  },
  {
    type: "error",
    name: "ResultAlreadyPublished",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "error",
    name: "PackAlreadyExists",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
  },
  {
    type: "error",
    name: "PackNotFound",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
  },
  {
    type: "error",
    name: "PackInactive",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
  },
  {
    type: "error",
    name: "PackLimitNotSet",
    inputs: [{ name: "packId", type: "uint8", internalType: "uint8" }],
  },
] as const satisfies Abi;

export type RequestView = {
  employee: `0x${string}`;
  packId: number;
  encAmount: `0x${string}`;
  encStatus: `0x${string}`;
  memo: string;
  timestamp: bigint;
  resultPublished: boolean;
  publicStatus: number;
};

export type PackInfo = {
  id: number;
  name: string;
  active: boolean;
  limitSet: boolean;
};

export type PackSummary = {
  total: bigint;
  approved: bigint;
  denied: bigint;
  pending: bigint;
};

export const POLICY_PACKS = [
  { id: 1, name: "Travel",    limitCents: 200_000 },
  { id: 2, name: "SaaS",      limitCents: 50_000  },
  { id: 3, name: "Vendor",    limitCents: 300_000 },
  { id: 4, name: "Marketing", limitCents: 100_000 },
] as const;

export const PACK_NAME: Record<number, string> = Object.fromEntries(
  POLICY_PACKS.map((p) => [p.id, p.name]),
);
