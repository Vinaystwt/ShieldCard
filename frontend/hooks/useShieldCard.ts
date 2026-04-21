"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import { RequestView, shieldCardAbi, shieldCardAddress, targetChain } from "@/lib/contracts";

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

  const roleQuery = useQuery({
    queryKey: ["shieldcard-role", shieldCardAddress, targetChain.id, address],
    enabled: Boolean(isConfigured && address),
    queryFn: async () => {
      const [admin, isEmployee] = await Promise.all([
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
      ]);

      return {
        isAdmin: admin.toLowerCase() === address!.toLowerCase(),
        isEmployee,
      };
    },
  });

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
          const request = (await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "getRequest",
            args: [BigInt(index)],
          })) as RequestView;

          return { id: BigInt(index), ...request };
        }),
      );
    },
  });

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
          const request = (await publicClient!.readContract({
            address: shieldCardAddress!,
            abi: shieldCardAbi,
            functionName: "getRequest",
            args: [id],
          })) as RequestView;

          return { id, ...request };
        }),
      );
    },
  });

  const summary = useMemo(() => {
    const requests = requestsQuery.data ?? [];
    return {
      total: requests.length,
      published: requests.filter((request) => request.resultPublished).length,
      pending: requests.filter((request) => !request.resultPublished).length,
    };
  }, [requestsQuery.data]);

  async function refreshQueries() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["shieldcard-role", shieldCardAddress, targetChain.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ["shieldcard-requests", shieldCardAddress, targetChain.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ["shieldcard-employee-requests", shieldCardAddress, targetChain.id],
      }),
    ]);
  }

  async function runWrite({
    functionName,
    args,
    onStatusChange,
  }: {
    functionName:
      | "registerEmployee"
      | "setEmployeeLimit"
      | "submitRequest"
      | "publishDecryptedResult";
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
        | {
            gasPrice: bigint;
          }
        | {
            maxFeePerGas: bigint;
            maxPriorityFeePerGas: bigint;
          };

      try {
        const estimatedFees = await publicClient.estimateFeesPerGas({
          chain: targetChain,
          type: "eip1559",
        });

        const priorityFee = estimatedFees.maxPriorityFeePerGas ?? BigInt(0);
        const safeMaxFeePerGas = maxBigInt(
          estimatedFees.maxFeePerGas,
          baseFeePerGas != null
            ? withBuffer(baseFeePerGas * BigInt(2) + priorityFee, BigInt(1_500))
            : undefined,
        );

        if (safeMaxFeePerGas == null) {
          throw new Error("Missing EIP-1559 fee estimate.");
        }

        feeOverrides = {
          maxFeePerGas: safeMaxFeePerGas,
          maxPriorityFeePerGas: priorityFee,
        };
      } catch {
        const gasPrice = await publicClient.getGasPrice();
        feeOverrides = { gasPrice: withBuffer(gasPrice, BigInt(1_500)) };
      }

      const gasEstimate = await publicClient.estimateContractGas({
        address: shieldCardAddress,
        abi: shieldCardAbi,
        functionName,
        args: args as never,
        account: address,
      });

      onStatusChange?.({ phase: "awaiting_wallet" });

      const hash = await writeContractAsync({
        address: shieldCardAddress,
        abi: shieldCardAbi,
        functionName,
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

  async function registerEmployee(
    employee: `0x${string}`,
    onStatusChange?: TransactionReporter,
  ) {
    return runWrite({
      functionName: "registerEmployee",
      args: [employee],
      onStatusChange,
    });
  }

  async function setEmployeeLimit(
    employee: `0x${string}`,
    encLimit: unknown,
    onStatusChange?: TransactionReporter,
  ) {
    return runWrite({
      functionName: "setEmployeeLimit",
      args: [employee, encLimit],
      onStatusChange,
    });
  }

  async function submitRequest(
    encAmount: unknown,
    encCategory: unknown,
    memo: string,
    onStatusChange?: TransactionReporter,
  ) {
    return runWrite({
      functionName: "submitRequest",
      args: [encAmount, encCategory, memo],
      onStatusChange,
    });
  }

  async function publishResult(
    requestId: bigint,
    plainStatus: number,
    signature: `0x${string}`,
    onStatusChange?: TransactionReporter,
  ) {
    return runWrite({
      functionName: "publishDecryptedResult",
      args: [requestId, plainStatus, signature],
      onStatusChange,
    });
  }

  return {
    address,
    isConfigured,
    roleQuery,
    requestsQuery,
    employeeRequestsQuery,
    summary,
    refreshQueries,
    registerEmployee,
    setEmployeeLimit,
    submitRequest,
    publishResult,
  };
}
