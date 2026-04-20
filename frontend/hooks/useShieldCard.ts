"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import { RequestView, shieldCardAbi, shieldCardAddress, targetChain } from "@/lib/contracts";

export function useShieldCard() {
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const isConfigured = Boolean(shieldCardAddress && publicClient);

  const roleQuery = useQuery({
    queryKey: ["shieldcard-role", address],
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
    queryKey: ["shieldcard-requests"],
    enabled: isConfigured,
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
    queryKey: ["shieldcard-employee-requests", address],
    enabled: Boolean(isConfigured && address),
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

  async function registerEmployee(employee: `0x${string}`) {
    const hash = await writeContractAsync({
      address: shieldCardAddress!,
      abi: shieldCardAbi,
      functionName: "registerEmployee",
      args: [employee],
      chainId: targetChain.id,
    });
    return publicClient!.waitForTransactionReceipt({ hash });
  }

  async function setEmployeeLimit(employee: `0x${string}`, encLimit: unknown) {
    const hash = await writeContractAsync({
      address: shieldCardAddress!,
      abi: shieldCardAbi,
      functionName: "setEmployeeLimit",
      args: [employee, encLimit as never],
      chainId: targetChain.id,
    });
    return publicClient!.waitForTransactionReceipt({ hash });
  }

  async function submitRequest(encAmount: unknown, encCategory: unknown, memo: string) {
    const hash = await writeContractAsync({
      address: shieldCardAddress!,
      abi: shieldCardAbi,
      functionName: "submitRequest",
      args: [encAmount as never, encCategory as never, memo],
      chainId: targetChain.id,
    });
    return publicClient!.waitForTransactionReceipt({ hash });
  }

  async function publishResult(requestId: bigint, plainStatus: number, signature: `0x${string}`) {
    const hash = await writeContractAsync({
      address: shieldCardAddress!,
      abi: shieldCardAbi,
      functionName: "publishDecryptedResult",
      args: [requestId, plainStatus, signature],
      chainId: targetChain.id,
    });
    return publicClient!.waitForTransactionReceipt({ hash });
  }

  return {
    address,
    isConfigured,
    roleQuery,
    requestsQuery,
    employeeRequestsQuery,
    summary,
    registerEmployee,
    setEmployeeLimit,
    submitRequest,
    publishResult,
  };
}
