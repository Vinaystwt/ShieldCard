"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import {
  PackInfo,
  PackSummary,
  POLICY_PACKS,
  RequestView,
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
    staleTime: 5_000,
    refetchInterval: isConfigured ? 15_000 : false,
    queryFn: async () => {
      const count = await publicClient!.readContract({
        address: shieldCardAddress!,
        abi: shieldCardAbi,
        functionName: "getRequestCount",
      });

      return Promise.all(
        Array.from({ length: Number(count) }).map(async (_, index) => {
          const raw = await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "getRequest",
            args: [BigInt(index)],
          }) as readonly unknown[];

          const req: RequestView = {
            employee:        raw[0] as `0x${string}`,
            packId:          raw[1] as number,
            encAmount:       raw[2] as `0x${string}`,
            encStatus:       raw[3] as `0x${string}`,
            memo:            raw[4] as string,
            timestamp:       raw[5] as bigint,
            resultPublished: raw[6] as boolean,
            publicStatus:    raw[7] as number,
            inReview:        raw[8] as boolean,
            receiptHash:     raw[9] as `0x${string}`,
          };

          return { id: BigInt(index), ...req };
        }),
      );
    },
  });

  // ── Employee own requests ──────────────────────────────────────────────────
  const employeeRequestsQuery = useQuery({
    queryKey: ["shieldcard-employee-requests", shieldCardAddress, targetChain.id, address],
    enabled: Boolean(isConfigured && address),
    staleTime: 5_000,
    refetchInterval: isConfigured && address ? 12_000 : false,
    queryFn: async () => {
      const ids = await publicClient!.readContract({
        address: shieldCardAddress!,
        abi: shieldCardAbi,
        functionName: "getEmployeeRequestIds",
        args: [address!],
      });

      return Promise.all(
        ids.map(async (id) => {
          const raw = await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "getRequest",
            args: [id],
          }) as readonly unknown[];

          const req: RequestView = {
            employee:        raw[0] as `0x${string}`,
            packId:          raw[1] as number,
            encAmount:       raw[2] as `0x${string}`,
            encStatus:       raw[3] as `0x${string}`,
            memo:            raw[4] as string,
            timestamp:       raw[5] as bigint,
            resultPublished: raw[6] as boolean,
            publicStatus:    raw[7] as number,
            inReview:        raw[8] as boolean,
            receiptHash:     raw[9] as `0x${string}`,
          };

          return { id, ...req };
        }),
      );
    },
  });

  // ── Packs query ────────────────────────────────────────────────────────────
  const packsQuery = useQuery({
    queryKey: ["shieldcard-packs", shieldCardAddress, targetChain.id],
    enabled: isConfigured,
    staleTime: 10_000,
    refetchInterval: isConfigured ? 30_000 : false,
    queryFn: async () => {
      return Promise.all(
        POLICY_PACKS.map(async (p) => {
          const [name, active, limitsSet, epochStart] = (await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "getPackInfo",
            args: [p.id],
          })) as [string, boolean, boolean, bigint];

          const [total, approved, denied, pending, inReview] = (await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "getPackSummary",
            args: [p.id],
          })) as [bigint, bigint, bigint, bigint, bigint];

          return {
            id: p.id,
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

  // ── Global state ───────────────────────────────────────────────────────────
  const globalStateQuery = useQuery({
    queryKey: ["shieldcard-global", shieldCardAddress, targetChain.id],
    enabled: isConfigured,
    staleTime: 15_000,
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
      total:    requests.length,
      published: requests.filter((r) => r.resultPublished).length,
      pending:  requests.filter((r) => !r.resultPublished && !r.inReview).length,
      inReview: requests.filter((r) => r.inReview).length,
    };
  }, [requestsQuery.data]);

  // ── Refresh all ────────────────────────────────────────────────────────────
  async function refreshQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["shieldcard-role",             shieldCardAddress, targetChain.id] }),
      queryClient.invalidateQueries({ queryKey: ["shieldcard-requests",         shieldCardAddress, targetChain.id] }),
      queryClient.invalidateQueries({ queryKey: ["shieldcard-employee-requests",shieldCardAddress, targetChain.id] }),
      queryClient.invalidateQueries({ queryKey: ["shieldcard-packs",            shieldCardAddress, targetChain.id] }),
      queryClient.invalidateQueries({ queryKey: ["shieldcard-global",           shieldCardAddress, targetChain.id] }),
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

  const resetBudgetEpoch    = (packId: number, cb?: TransactionReporter) =>
    runWrite({ functionName: "resetBudgetEpoch", args: [packId], onStatusChange: cb });

  const submitRequest       = (packId: number, encAmount: unknown, memo: string, cb?: TransactionReporter) =>
    runWrite({ functionName: "submitRequest", args: [packId, encAmount, memo], onStatusChange: cb });

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
    globalStateQuery,
    summary,
    refreshQueries,
    submitRequest,
    registerEmployee,
    freezeEmployee,
    unfreezeEmployee,
    pauseSubmissions,
    unpauseSubmissions,
    createPack,
    setPolicyThresholds,
    setPackActive,
    resetBudgetEpoch,
    publishResult,
    adminReviewRequest,
  };
}
