import type { Abi } from "viem";
import { arbitrumSepolia } from "wagmi/chains";

export const shieldCardAddress =
  (process.env.NEXT_PUBLIC_SHIELDCARD_ADDRESS as `0x${string}` | undefined) ??
  undefined;

export const targetChain = arbitrumSepolia;

export const shieldCardAbi = [
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
    name: "registerEmployee",
    stateMutability: "nonpayable",
    inputs: [{ name: "employee", type: "address", internalType: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setEmployeeLimit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address", internalType: "address" },
      {
        name: "encLimit",
        type: "tuple",
        internalType: "struct InEuint32",
        components: [
          { name: "ctHash", type: "uint256", internalType: "uint256" },
          { name: "securityZone", type: "uint8", internalType: "uint8" },
          { name: "utype", type: "uint8", internalType: "uint8" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "submitRequest",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "encAmount",
        type: "tuple",
        internalType: "struct InEuint32",
        components: [
          { name: "ctHash", type: "uint256", internalType: "uint256" },
          { name: "securityZone", type: "uint8", internalType: "uint8" },
          { name: "utype", type: "uint8", internalType: "uint8" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
      {
        name: "encCategory",
        type: "tuple",
        internalType: "struct InEuint8",
        components: [
          { name: "ctHash", type: "uint256", internalType: "uint256" },
          { name: "securityZone", type: "uint8", internalType: "uint8" },
          { name: "utype", type: "uint8", internalType: "uint8" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
      { name: "memo", type: "string", internalType: "string" },
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
    name: "getEncryptedStatus",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bytes32", internalType: "euint8" }],
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
          { name: "encAmount", type: "bytes32", internalType: "euint32" },
          { name: "encCategory", type: "bytes32", internalType: "euint8" },
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
    name: "registeredEmployees",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "getEncryptedAmount",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "bytes32", internalType: "euint32" }],
  },
  {
    type: "event",
    name: "EmployeeRegistered",
    inputs: [
      { name: "employee", type: "address", indexed: true, internalType: "address" },
    ],
  },
  {
    type: "event",
    name: "LimitSet",
    inputs: [
      { name: "employee", type: "address", indexed: true, internalType: "address" },
    ],
  },
  {
    type: "event",
    name: "RequestSubmitted",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "employee", type: "address", indexed: true, internalType: "address" },
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
] as const satisfies Abi;

export type RequestView = {
  employee: `0x${string}`;
  encAmount: `0x${string}`;
  encCategory: `0x${string}`;
  encStatus: `0x${string}`;
  memo: string;
  timestamp: bigint;
  resultPublished: boolean;
  publicStatus: number;
};
