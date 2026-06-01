"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import {
  DeptInfo,
  PackInfo,
  PackSummary,
  RequestView,
  VendorInfo,
  shieldCardAbi,
  shieldCardAddress,
  targetChain,
} from "@/lib/contracts";

export type TransactionPhase =
  | "preparing"
  | "awaiting_wallet"
  | "submitted"
  | "confirming"
  | "confirmed"
  | "error";

export type TransactionStatus = {
  phase: TransactionPhase;
  hash?: `0x${string}`;
  error?: unknown;
};

type TransactionReporter = (status: TransactionStatus) => void;

// Named type for the on-chain getRequest() return value (matches ABI named outputs)
type RawRequest = {
  employee:        `0x${string}`;
  packId:          number;
  deptId:          number;
  vendorId:        number;
  encAmount:       `0x${string}`;
  encStatus:       `0x${string}`;
  memo:            string;
  timestamp:       bigint;
  resultPublished: boolean;
  publicStatus:    number;
  inReview:        boolean;
  receiptHash:     `0x${string}`;
  riskBitmap:      number;
};

function parseRawRequest(raw: RawRequest, evHash: `0x${string}`, evSubmitted: boolean): RequestView {
  return {
    employee:          raw.employee,
    packId:            Number(raw.packId),
    deptId:            Number(raw.deptId),
    vendorId:          Number(raw.vendorId),
    encAmount:         raw.encAmount,
    encStatus:         raw.encStatus,
    memo:              raw.memo,
    timestamp:         raw.timestamp,
    resultPublished:   raw.resultPublished,
    publicStatus:      Number(raw.publicStatus),
    inReview:          raw.inReview,
    receiptHash:       raw.receiptHash,
    riskBitmap:        Number(raw.riskBitmap),
    evidenceHash:      evHash,
    evidenceSubmitted: evSubmitted,
  };
}

function withBuffer(value: bigint, bufferBps: bigint) {
  return value + (value * bufferBps) / BigInt(10_000);
}

function maxBigInt(...values: Array<bigint | null | undefined>) {
  return values.reduce<bigint | undefined>(
    (current, value) => {
      if (value == null) return current;
      return current == null || value > current ? value : current;
    },
    undefined,
  );
}

export function useShieldCard() {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const isConfigured = Boolean(shieldCardAddress && publicClient);

  // ── Role query ─────────────────────────────────────────────────────────────
  const roleQuery = useQuery({
    queryKey: ["shieldcard-role", shieldCardAddress, targetChain.id, address],
    enabled: Boolean(isConfigured && address),
    queryFn: async () => {
      const [admin, isEmployee, isFrozen, isPaused] = await Promise.all([
        publicClient!.readContract({
          address: shieldCardAddress!,
          abi: shieldCardAbi,
          functionName: "admin",
        }),
        publicClient!.readContract({
          address: shieldCardAddress!,
          abi: shieldCardAbi,
          functionName: "employeeRegistered",
          args: [address!],
        }),
        publicClient!.readContract({
          address: shieldCardAddress!,
          abi: shieldCardAbi,
          functionName: "employeeFrozen",
          args: [address!],
        }),
        publicClient!.readContract({
          address: shieldCardAddress!,
          abi: shieldCardAbi,
          functionName: "submissionsPaused",
        }),
      ]);

      return {
        isAdmin: admin.toLowerCase() === address!.toLowerCase(),
        isEmployee,
        isFrozen,
        isPaused,
      };
    },
  });

  // ── All requests ───────────────────────────────────────────────────────────
  const requestsQuery = useQuery({
    queryKey: ["shieldcard-requests", shieldCardAddress, targetChain.id],
    enabled: isConfigured,
    staleTime: 15_000,
    refetchInterval: isConfigured ? 15_000 : false,
    queryFn: async () => {
      const count = await publicClient!.readContract({
        address: shieldCardAddress!,
        abi: shieldCardAbi,
        functionName: "getRequestCount",
      });

      return Promise.all(
        Array.from({ length: Number(count) }).map(async (_, index) => {
          const [raw, evHash, evSubmitted] = await Promise.all([
            publicClient!.readContract({
              address: shieldCardAddress!,
              abi: shieldCardAbi,
              functionName: "getRequest",
              args: [BigInt(index)],
            }) as unknown as Promise<RawRequest>,
            publicClient!.readContract({
              address: shieldCardAddress!,
              abi: shieldCardAbi,
              functionName: "evidenceHash",
              args: [BigInt(index)],
            }) as Promise<`0x${string}`>,
            publicClient!.readContract({
              address: shieldCardAddress!,
              abi: shieldCardAbi,
              functionName: "evidenceSubmitted",
              args: [BigInt(index)],
            }) as Promise<boolean>,
          ]);

          const req = parseRawRequest(raw, evHash, evSubmitted);
          return { id: BigInt(index), ...req };
        }),
      );
    },
  });

  // ── Employee own requests ──────────────────────────────────────────────────
  const employeeRequestsQuery = useQuery({
    queryKey: ["shieldcard-employee-requests", shieldCardAddress, targetChain.id, address],
    enabled: Boolean(isConfigured && address),
    staleTime: 15_000,
    refetchInterval: isConfigured && address ? 15_000 : false,
    retry: 1,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    queryFn: async () => {
      if (!publicClient || !shieldCardAddress || !address) return [];
      const pc = publicClient;
      const contractAddr = shieldCardAddress;
      const emp = address;

      const ids = await pc.readContract({
        address: contractAddr,
        abi: shieldCardAbi,
        functionName: "getEmployeeRequestIds",
        args: [emp],
      });

      if (!ids || ids.length === 0) return [];

      const settled = await Promise.allSettled(
        ids.map(async (id) => {
          const [raw, evHash, evSubmitted] = await Promise.all([
            pc.readContract({
              address: contractAddr,
              abi: shieldCardAbi,
              functionName: "getRequest",
              args: [id],
            }) as unknown as Promise<RawRequest>,
            pc.readContract({
              address: contractAddr,
              abi: shieldCardAbi,
              functionName: "evidenceHash",
              args: [id],
            }) as Promise<`0x${string}`>,
            pc.readContract({
              address: contractAddr,
              abi: shieldCardAbi,
              functionName: "evidenceSubmitted",
              args: [id],
            }) as Promise<boolean>,
          ]);

          const req = parseRawRequest(raw, evHash, evSubmitted);
          return { id, ...req };
        }),
      );

      const fulfilled = settled
        .filter((r): r is PromiseFulfilledResult<{ id: bigint } & RequestView> => r.status === "fulfilled")
        .map((r) => r.value);

      if (fulfilled.length === 0 && ids.length > 0) {
        throw new Error("All request rows failed to load.");
      }

      return fulfilled;
    },
  });

  // ── Packs query — dynamic discovery via getPackIds() ──────────────────────
  const packsQuery = useQuery({
    queryKey: ["shieldcard-packs", shieldCardAddress, targetChain.id],
    enabled: isConfigured,
    staleTime: 60_000,
    refetchInterval: isConfigured ? 60_000 : false,
    queryFn: async () => {
      const packIds = await publicClient!.readContract({
        address: shieldCardAddress!,
        abi: shieldCardAbi,
        functionName: "getPackIds",
      }) as readonly number[];

      return Promise.all(
        packIds.map(async (packId) => {
          const [name, active, limitsSet, epochStart] = (await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "getPackInfo",
            args: [packId],
          })) as [string, boolean, boolean, bigint];

          const [total, approved, denied, pending, inReview] = (await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "getPackSummary",
            args: [packId],
          })) as [bigint, bigint, bigint, bigint, bigint];

          return {
            id: Number(packId),
            name,
            active,
            limitsSet,
            epochStart,
            total,
            approved,
            denied,
            pending,
            inReview,
          } satisfies PackInfo & PackSummary & { id: number };
        }),
      );
    },
  });

  // ── Departments query ──────────────────────────────────────────────────────
  const deptsQuery = useQuery({
    queryKey: ["shieldcard-depts", shieldCardAddress, targetChain.id],
    enabled: isConfigured,
    staleTime: 60_000,
    refetchInterval: isConfigured ? 60_000 : false,
    queryFn: async () => {
      const deptIds = await publicClient!.readContract({
        address: shieldCardAddress!,
        abi: shieldCardAbi,
        functionName: "getDeptIds",
      }) as readonly number[];

      return Promise.all(
        deptIds.map(async (deptId) => {
          const [name, active, budgetSet, epochStart] = (await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "getDeptInfo",
            args: [deptId],
          })) as [string, boolean, boolean, bigint];

          return {
            id: Number(deptId),
            name,
            active,
            budgetSet,
            epochStart,
          } satisfies DeptInfo;
        }),
      );
    },
  });

  // ── Vendors query ──────────────────────────────────────────────────────────
  const vendorsQuery = useQuery({
    queryKey: ["shieldcard-vendors", shieldCardAddress, targetChain.id],
    enabled: isConfigured,
    staleTime: 60_000,
    refetchInterval: isConfigured ? 60_000 : false,
    queryFn: async () => {
      const count = Number(await publicClient!.readContract({
        address: shieldCardAddress!,
        abi: shieldCardAbi,
        functionName: "vendorCount",
      }));

      if (count === 0) return [];

      // Vendors are indexed 1..count
      return Promise.all(
        Array.from({ length: count }, (_, i) => i + 1).map(async (vendorId) => {
          const exists = await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "vendorExists",
            args: [vendorId],
          });
          if (!exists) return null;

          const [name, status] = (await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "getVendorInfo",
            args: [vendorId],
          })) as [string, number];

          return {
            id: vendorId,
            name,
            status: Number(status),
          } satisfies VendorInfo;
        }),
      ).then((rows) => rows.filter((v): v is VendorInfo => v !== null));
    },
  });

  // ── Global state ───────────────────────────────────────────────────────────
  const globalStateQuery = useQuery({
    queryKey: ["shieldcard-global", shieldCardAddress, targetChain.id],
    enabled: isConfigured,
    staleTime: 30_000,
    refetchInterval: isConfigured ? 30_000 : false,
    queryFn: async () => {
      const [isPaused, employeeCount] = await Promise.all([
        publicClient!.readContract({
          address: shieldCardAddress!,
          abi: shieldCardAbi,
          functionName: "submissionsPaused",
        }),
        publicClient!.readContract({
          address: shieldCardAddress!,
          abi: shieldCardAbi,
          functionName: "getRegisteredEmployeeCount",
        }),
      ]);
      return { isPaused, employeeCount };
    },
  });

  // ── Derived summary ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const requests = requestsQuery.data ?? [];
    return {
      total:     requests.length,
      published: requests.filter((r) => r.resultPublished).length,
      pending:   requests.filter((r) => !r.resultPublished && !r.inReview).length,
      inReview:  requests.filter((r) => r.inReview).length,
    };
  }, [requestsQuery.data]);

  // ── Refresh all ────────────────────────────────────────────────────────────
  async function refreshQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["shieldcard-role",              shieldCardAddress, targetChain.id] }),
      queryClient.invalidateQueries({ queryKey: ["shieldcard-requests",          shieldCardAddress, targetChain.id] }),
      queryClient.invalidateQueries({ queryKey: ["shieldcard-employee-requests", shieldCardAddress, targetChain.id] }),
      queryClient.invalidateQueries({ queryKey: ["shieldcard-packs",             shieldCardAddress, targetChain.id] }),
      queryClient.invalidateQueries({ queryKey: ["shieldcard-depts",             shieldCardAddress, targetChain.id] }),
      queryClient.invalidateQueries({ queryKey: ["shieldcard-vendors",           shieldCardAddress, targetChain.id] }),
      queryClient.invalidateQueries({ queryKey: ["shieldcard-global",            shieldCardAddress, targetChain.id] }),
    ]);
  }

  // ── Write helper ───────────────────────────────────────────────────────────
  async function runWrite({
    functionName,
    args,
    onStatusChange,
  }: {
    functionName: string;
    args: readonly unknown[];
    onStatusChange?: TransactionReporter;
  }) {
    if (!shieldCardAddress || !publicClient) {
      throw new Error("ShieldCard contract is not configured.");
    }

    try {
      onStatusChange?.({ phase: "preparing" });

      const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
      const baseFeePerGas = latestBlock.baseFeePerGas;

      let feeOverrides:
        | { gasPrice: bigint }
        | { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };

      try {
        const estimated = await publicClient.estimateFeesPerGas({ chain: targetChain, type: "eip1559" });
        const priorityFee = estimated.maxPriorityFeePerGas ?? BigInt(0);
        const safeMax = maxBigInt(
          estimated.maxFeePerGas,
          baseFeePerGas != null ? withBuffer(baseFeePerGas * BigInt(2) + priorityFee, BigInt(1_500)) : undefined,
        );
        if (safeMax == null) throw new Error("Missing EIP-1559 fee estimate.");
        feeOverrides = { maxFeePerGas: safeMax, maxPriorityFeePerGas: priorityFee };
      } catch {
        const gasPrice = await publicClient.getGasPrice();
        feeOverrides = { gasPrice: withBuffer(gasPrice, BigInt(1_500)) };
      }

      const gasEstimate = await publicClient.estimateContractGas({
        address: shieldCardAddress,
        abi: shieldCardAbi,
        functionName: functionName as never,
        args: args as never,
        account: address,
      });

      onStatusChange?.({ phase: "awaiting_wallet" });

      const hash = await writeContractAsync({
        address: shieldCardAddress,
        abi: shieldCardAbi,
        functionName: functionName as never,
        args: args as never,
        account: address,
        chainId: targetChain.id,
        gas: withBuffer(gasEstimate, BigInt(2_000)),
        ...feeOverrides,
      });

      onStatusChange?.({ phase: "submitted", hash });
      onStatusChange?.({ phase: "confirming", hash });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 120_000,
      });

      await refreshQueries();
      onStatusChange?.({ phase: "confirmed", hash });
      return receipt;
    } catch (error) {
      onStatusChange?.({ phase: "error", error });
      throw error;
    }
  }

  // ── Public write API ───────────────────────────────────────────────────────

  const registerEmployee    = (emp: `0x${string}`, cb?: TransactionReporter) =>
    runWrite({ functionName: "registerEmployee", args: [emp], onStatusChange: cb });

  const freezeEmployee      = (emp: `0x${string}`, cb?: TransactionReporter) =>
    runWrite({ functionName: "freezeEmployee", args: [emp], onStatusChange: cb });

  const unfreezeEmployee    = (emp: `0x${string}`, cb?: TransactionReporter) =>
    runWrite({ functionName: "unfreezeEmployee", args: [emp], onStatusChange: cb });

  const assignEmployeeDept  = (emp: `0x${string}`, deptId: number, cb?: TransactionReporter) =>
    runWrite({ functionName: "assignEmployeeDept", args: [emp, deptId], onStatusChange: cb });

  const pauseSubmissions    = (cb?: TransactionReporter) =>
    runWrite({ functionName: "pauseSubmissions", args: [], onStatusChange: cb });

  const unpauseSubmissions  = (cb?: TransactionReporter) =>
    runWrite({ functionName: "unpauseSubmissions", args: [], onStatusChange: cb });

  const createPack          = (packId: number, name: string, cb?: TransactionReporter) =>
    runWrite({ functionName: "createPack", args: [packId, name], onStatusChange: cb });

  const setPolicyThresholds = (packId: number, encHard: unknown, encAuto: unknown, encBudget: unknown, cb?: TransactionReporter) =>
    runWrite({ functionName: "setPolicyThresholds", args: [packId, encHard, encAuto, encBudget], onStatusChange: cb });

  const setPackActive       = (packId: number, active: boolean, cb?: TransactionReporter) =>
    runWrite({ functionName: "setPackActive", args: [packId, active], onStatusChange: cb });

  const setPackRecurringInterval = (packId: number, intervalSeconds: bigint, cb?: TransactionReporter) =>
    runWrite({ functionName: "setPackRecurringInterval", args: [packId, intervalSeconds], onStatusChange: cb });

  const resetBudgetEpoch    = (packId: number, cb?: TransactionReporter) =>
    runWrite({ functionName: "resetBudgetEpoch", args: [packId], onStatusChange: cb });

  const createDept          = (deptId: number, name: string, cb?: TransactionReporter) =>
    runWrite({ functionName: "createDept", args: [deptId, name], onStatusChange: cb });

  const setDeptActive       = (deptId: number, active: boolean, cb?: TransactionReporter) =>
    runWrite({ functionName: "setDeptActive", args: [deptId, active], onStatusChange: cb });

  const setDeptBudget       = (deptId: number, encCap: unknown, cb?: TransactionReporter) =>
    runWrite({ functionName: "setDeptBudget", args: [deptId, encCap], onStatusChange: cb });

  const resetDeptEpoch      = (deptId: number, cb?: TransactionReporter) =>
    runWrite({ functionName: "resetDeptEpoch", args: [deptId], onStatusChange: cb });

  const registerVendor      = (vendorId: number, name: string, cb?: TransactionReporter) =>
    runWrite({ functionName: "registerVendor", args: [vendorId, name], onStatusChange: cb });

  const setVendorStatus     = (vendorId: number, status: number, cb?: TransactionReporter) =>
    runWrite({ functionName: "setVendorStatus", args: [vendorId, status], onStatusChange: cb });

  // Wave 4: extended submitRequest with deptId and vendorId
  const submitRequest       = (
    packId: number,
    deptId: number,
    vendorId: number,
    encAmount: unknown,
    memo: string,
    cb?: TransactionReporter,
  ) =>
    runWrite({ functionName: "submitRequest", args: [packId, deptId, vendorId, encAmount, memo], onStatusChange: cb });

  const submitEvidence      = (requestId: bigint, hash: `0x${string}`, cb?: TransactionReporter) =>
    runWrite({ functionName: "submitEvidence", args: [requestId, hash], onStatusChange: cb });

  const publishResult       = (requestId: bigint, plainStatus: number, sig: `0x${string}`, cb?: TransactionReporter) =>
    runWrite({ functionName: "publishDecryptedResult", args: [requestId, plainStatus, sig], onStatusChange: cb });

  const adminReviewRequest  = (requestId: bigint, approved: boolean, cb?: TransactionReporter) =>
    runWrite({ functionName: "adminReviewRequest", args: [requestId, approved], onStatusChange: cb });

  return {
    address,
    isConfigured,
    roleQuery,
    requestsQuery,
    employeeRequestsQuery,
    packsQuery,
    deptsQuery,
    vendorsQuery,
    globalStateQuery,
    summary,
    refreshQueries,
    submitRequest,
    submitEvidence,
    registerEmployee,
    freezeEmployee,
    unfreezeEmployee,
    assignEmployeeDept,
    pauseSubmissions,
    unpauseSubmissions,
    createPack,
    setPolicyThresholds,
    setPackActive,
    setPackRecurringInterval,
    resetBudgetEpoch,
    createDept,
    setDeptActive,
    setDeptBudget,
    resetDeptEpoch,
    registerVendor,
    setVendorStatus,
    publishResult,
    adminReviewRequest,
  };
}
