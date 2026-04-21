"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, RefreshCw } from "lucide-react";
import { useChainId } from "wagmi";
import { TopBar } from "@/components/shell/TopBar";
import { RequestStream } from "@/components/admin/RequestStream";
import { EmployeeManagement } from "@/components/admin/EmployeeManagement";
import { SwitchNetworkButton } from "@/components/ui/SwitchNetworkButton";
import { useCofhe } from "@/hooks/useCofhe";
import { useRoleRouting } from "@/hooks/useRoleRouting";
import { useShieldCard } from "@/hooks/useShieldCard";
import { targetChain } from "@/lib/contracts";
import { getErrorMessage } from "@/lib/format";

export default function AdminPage() {
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState("");
  const {
    isConfigured,
    registerEmployee,
    requestsQuery,
    setEmployeeLimit,
    publishResult,
    summary,
  } = useShieldCard();
  const { decryptForPublish, encryptAmount, error, isReady } = useCofhe();
  const { isAdmin } = useRoleRouting();
  const chainId = useChainId();
  const isWrongNetwork = chainId !== targetChain.id;
  const canRegister = isAdmin && isConfigured && !isWrongNetwork;
  const canUseCofheActions = canRegister && isReady;
  const adminDisabledReason = !isConfigured
    ? "Configure NEXT_PUBLIC_SHIELDCARD_ADDRESS to enable admin actions."
    : !isAdmin
      ? "Connect the deployed admin wallet to manage employees."
      : isWrongNetwork
        ? "Switch the wallet to Arbitrum Sepolia before using admin actions."
        : undefined;
  const cofheDisabledReason = adminDisabledReason
    ? adminDisabledReason
    : !isReady
      ? error
        ? getErrorMessage(error)
        : "CoFHE admin client is still initializing."
      : undefined;

  async function handlePublish(
    requestId: bigint,
    statusHandle: string,
    onStatusChange: Parameters<typeof publishResult>[3],
  ) {
    setPublishingId(requestId.toString());
    setPublishError("");
    try {
      const result = await decryptForPublish(statusHandle);
      await publishResult(
        requestId,
        Number(result.decryptedValue),
        result.signature as `0x${string}`,
        onStatusChange,
      );
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setPublishingId(null);
    }
  }

  async function handleRegister(
    employee: `0x${string}`,
    onStatusChange: Parameters<typeof registerEmployee>[1],
  ) {
    await registerEmployee(employee, onStatusChange);
  }

  async function handleSetLimit(
    employee: `0x${string}`,
    amountUsd: number,
    onStatusChange: Parameters<typeof setEmployeeLimit>[2],
  ) {
    const encLimit = await encryptAmount(Math.round(amountUsd * 100));
    await setEmployeeLimit(employee, encLimit, onStatusChange);
  }

  const metrics = [
    {
      label: "Total requests",
      value: summary.total,
      valueColor: "var(--color-text)",
      accentColor: "var(--color-copper)",
      accentBg: "rgba(200,131,63,0.07)",
      accentBorder: "var(--copper-border-dim)",
    },
    {
      label: "Published to audit",
      value: summary.published,
      valueColor: "var(--color-approved)",
      accentColor: "var(--color-approved)",
      accentBg: "rgba(77,145,112,0.07)",
      accentBorder: "rgba(77,145,112,0.16)",
    },
    {
      label: "Awaiting publish",
      value: summary.pending,
      valueColor: summary.pending > 0 ? "var(--color-pending)" : "var(--color-subtle)",
      accentColor: summary.pending > 0 ? "var(--color-pending)" : "var(--color-subtle)",
      accentBg: summary.pending > 0 ? "rgba(196,148,60,0.07)" : "transparent",
      accentBorder: summary.pending > 0 ? "rgba(196,148,60,0.16)" : "var(--border-dim)",
    },
  ];

  return (
    <div className="min-h-screen bg-base">
      <TopBar />
      <main className="mx-auto max-w-[1280px] px-6 py-10">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(200,131,63,0.10)", border: "1px solid var(--copper-border-dim)" }}
                >
                  <Shield className="w-3.5 h-3.5" style={{ color: "var(--color-copper)" }} />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.09em]" style={{ color: "var(--color-subtle)" }}>
                  Admin cockpit
                </span>
              </div>
              <h1
                className="text-[30px] font-bold tracking-[-0.025em] leading-snug mb-2"
                style={{ color: "var(--color-text)" }}
              >
                Control hidden limits.<br />Publish only final outcomes.
              </h1>
              <p className="text-[14px] leading-relaxed max-w-[500px]" style={{ color: "var(--color-muted)" }}>
                Encrypted limits stay sealed after submission. Only the approved or denied result
                enters the public audit trail — never the threshold itself.
              </p>
            </div>
            <button
              onClick={() => requestsQuery.refetch()}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] transition-colors"
              style={{
                border: "1px solid var(--border-dim)",
                background: "#0E0E11",
                color: "var(--color-muted)",
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${requestsQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Metrics strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.10 + i * 0.06 }}
              className="rounded-lg px-6 py-5 relative overflow-hidden"
              style={{
                background: "#0E0E11",
                border: `1px solid ${m.accentBorder}`,
              }}
            >
              {/* Subtle corner glow */}
              <div
                className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${m.accentBg} 0%, transparent 70%)`,
                  transform: "translate(30%, -30%)",
                }}
              />
              <p
                className="text-[10px] font-medium uppercase tracking-[0.09em] mb-2"
                style={{ color: "var(--color-subtle)" }}
              >
                {m.label}
              </p>
              <p
                className="text-[32px] font-bold tracking-[-0.03em]"
                style={{ color: m.valueColor }}
              >
                {m.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Status banners */}
        {!isConfigured && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{
              background: "var(--pending-bg)",
              border: "1px solid rgba(196,148,60,0.20)",
              color: "var(--color-pending)",
            }}
          >
            Contract not configured. Set <code className="font-mono text-[12px]">NEXT_PUBLIC_SHIELDCARD_ADDRESS</code>.
          </motion.div>
        )}

        {isConfigured && !isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-mid)",
              color: "var(--color-muted)",
            }}
          >
            This wallet is not the admin for this contract. Connect the admin wallet to access write actions.
          </motion.div>
        )}

        {isConfigured && isAdmin && isWrongNetwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{
              background: "var(--pending-bg)",
              border: "1px solid rgba(196,148,60,0.20)",
              color: "var(--color-pending)",
            }}
          >
            Wrong network connected. Switch the admin wallet to Arbitrum Sepolia before registering employees, setting limits, or publishing results.
            <div className="mt-3">
              <SwitchNetworkButton compact />
            </div>
          </motion.div>
        )}

        {isConfigured && isAdmin && !isWrongNetwork && !isReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-dim)",
              color: "var(--color-muted)",
            }}
          >
            {error ? getErrorMessage(error) : "Initializing CoFHE client for encrypted admin actions..."}
          </motion.div>
        )}

        {/* Employee management */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="mb-6"
        >
          <EmployeeManagement
            onRegister={handleRegister}
            onSetLimit={handleSetLimit}
            canRegister={canRegister}
            canSetLimit={canUseCofheActions}
            registerDisabledReason={adminDisabledReason}
            limitDisabledReason={cofheDisabledReason}
          />
        </motion.div>

        {/* Request stream */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="rounded-xl p-6"
          style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ color: "var(--color-text)" }}
              >
                Request audit trail
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--color-subtle)" }}>
                All on-chain requests — encrypted handles, memos, and publication status
              </p>
            </div>
          </div>

          {requestsQuery.isLoading ? (
            <div className="flex items-center gap-2.5 py-14 justify-center">
              <span className="w-2 h-2 rounded-full bg-copper animate-pending" />
              <span className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                Loading requests from Arbitrum Sepolia...
              </span>
            </div>
          ) : requestsQuery.isError ? (
            <div
              className="rounded-lg px-4 py-3 text-[13px]"
              style={{
                background: "var(--denied-bg)",
                border: "1px solid rgba(147,68,68,0.20)",
                color: "var(--color-denied)",
              }}
            >
              Failed to load requests. Check your RPC connection.
            </div>
          ) : (
            <>
              {publishError && (
                <div
                  className="mb-4 rounded-lg px-4 py-3 text-[13px]"
                  style={{
                    background: "var(--denied-bg)",
                    border: "1px solid rgba(147,68,68,0.20)",
                    color: "var(--color-denied)",
                  }}
                >
                  {publishError}
                </div>
              )}
              <RequestStream
                requests={requestsQuery.data ?? []}
                onPublish={handlePublish}
                publishingId={publishingId}
                canPublish={canUseCofheActions}
              />
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
