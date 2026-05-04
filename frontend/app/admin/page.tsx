"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, RefreshCw, AlertTriangle, Pause, Play, ClipboardCheck } from "lucide-react";
import { useChainId } from "wagmi";

import { TopBar } from "@/components/shell/TopBar";
import { RequestStream } from "@/components/admin/RequestStream";
import { EmployeeManagement } from "@/components/admin/EmployeeManagement";
import { PolicyPackManager } from "@/components/admin/PolicyPackManager";
import { SwitchNetworkButton } from "@/components/ui/SwitchNetworkButton";
import { useCofhe } from "@/hooks/useCofhe";
import { useRoleRouting } from "@/hooks/useRoleRouting";
import { useShieldCard, TransactionStatus } from "@/hooks/useShieldCard";
import { targetChain } from "@/lib/contracts";
import { getErrorMessage } from "@/lib/format";

export default function AdminPage() {
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId]   = useState<string | null>(null);
  const [actionError, setActionError]   = useState("");

  const {
    isConfigured,
    registerEmployee,
    freezeEmployee,
    unfreezeEmployee,
    pauseSubmissions,
    unpauseSubmissions,
    setPolicyThresholds,
    setPackActive,
    resetBudgetEpoch,
    requestsQuery,
    packsQuery,
    globalStateQuery,
    publishResult,
    adminReviewRequest,
    summary,
  } = useShieldCard();

  const { decryptForPublish, encryptAmount, error: cofheError, isReady } = useCofhe();
  const { isAdmin } = useRoleRouting();
  const chainId = useChainId();
  const isWrongNetwork = chainId !== targetChain.id;

  const canManage       = isAdmin && isConfigured && !isWrongNetwork;
  const canCofheActions = canManage && isReady;

  const adminDisabledReason = !isConfigured
    ? "Configure NEXT_PUBLIC_SHIELDCARD_ADDRESS."
    : !isAdmin
    ? "Connect admin wallet."
    : isWrongNetwork
    ? "Switch wallet to Arbitrum Sepolia."
    : undefined;

  const cofheDisabledReason = adminDisabledReason
    ?? (!isReady
      ? cofheError ? getErrorMessage(cofheError) : "CoFHE client initializing..."
      : undefined);

  const isPaused = globalStateQuery.data?.isPaused ?? false;
  const employeeCount = globalStateQuery.data?.employeeCount;

  // ── Publish (decrypt + put on-chain) ──────────────────────────────────────
  async function handlePublish(
    requestId: bigint,
    statusHandle: string,
    onStatusChange: (s: TransactionStatus) => void,
  ) {
    setPublishingId(requestId.toString());
    setActionError("");
    try {
      const result = await decryptForPublish(statusHandle);
      await publishResult(requestId, Number(result.decryptedValue), result.signature as `0x${string}`, onStatusChange);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setPublishingId(null);
    }
  }

  // ── Admin resolve review request ───────────────────────────────────────────
  async function handleAdminReview(
    requestId: bigint,
    approved: boolean,
    onStatusChange: (s: TransactionStatus) => void,
  ) {
    setResolvingId(requestId.toString());
    setActionError("");
    try {
      await adminReviewRequest(requestId, approved, onStatusChange);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setResolvingId(null);
    }
  }

  // ── Policy thresholds ──────────────────────────────────────────────────────
  async function handleSetThresholds(
    packId: number,
    hardUsd: number,
    autoUsd: number,
    budgetUsd: number,
    onStatusChange: (s: TransactionStatus) => void,
  ) {
    const [encHard, encAuto, encBudget] = await Promise.all([
      encryptAmount(Math.round(hardUsd * 100)),
      encryptAmount(Math.round(autoUsd * 100)),
      encryptAmount(Math.round(budgetUsd * 100)),
    ]);
    await setPolicyThresholds(packId, encHard, encAuto, encBudget, onStatusChange);
  }

  // ── Pause/unpause ──────────────────────────────────────────────────────────
  async function handleTogglePause() {
    setActionError("");
    try {
      if (isPaused) await unpauseSubmissions();
      else await pauseSubmissions();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const reviewRequests = requestsQuery.data?.filter((r) => r.inReview) ?? [];
  const metrics = [
    { label: "Total requests",   value: summary.total,    color: "var(--color-text)",    accentBorder: "var(--copper-border-dim)", accentBg: "rgba(200,131,63,0.07)" },
    { label: "Pending review",   value: summary.inReview, color: summary.inReview > 0 ? "var(--color-pending)" : "var(--color-subtle)", accentBorder: summary.inReview > 0 ? "rgba(196,148,60,0.20)" : "var(--border-dim)", accentBg: "rgba(196,148,60,0.05)" },
    { label: "Published",        value: summary.published,color: "var(--color-approved)", accentBorder: "rgba(77,145,112,0.20)", accentBg: "rgba(77,145,112,0.05)" },
    { label: "Awaiting publish", value: summary.pending,  color: summary.pending > 0 ? "var(--color-pending)" : "var(--color-subtle)", accentBorder: summary.pending > 0 ? "rgba(196,148,60,0.16)" : "var(--border-dim)", accentBg: "rgba(196,148,60,0.04)" },
  ];

  return (
    <div className="min-h-screen bg-base">
      <TopBar />
      <main className="mx-auto max-w-[1280px] px-6 py-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(200,131,63,0.10)", border: "1px solid var(--copper-border-dim)" }}>
                  <Shield className="w-3.5 h-3.5 text-copper" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.09em] text-subtle">Policy operations console</span>
              </div>
              <h1 className="text-[30px] font-bold tracking-[-0.025em] leading-snug mb-2 text-text">
                Control hidden limits.<br />Publish only final outcomes.
              </h1>
              <p className="text-[14px] leading-relaxed max-w-[520px] text-muted">
                Three-tier policy engine: auto-approve, review queue, or deny — all evaluated inside FHE. Only final status enters the public audit trail.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canManage && (
                <button
                  onClick={handleTogglePause}
                  disabled={globalStateQuery.isLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-all duration-150 hover:brightness-110 active:scale-95"
                  style={{
                    border: isPaused ? "1px solid rgba(77,145,112,0.25)" : "1px solid rgba(196,148,60,0.25)",
                    background: isPaused ? "var(--approved-bg)" : "var(--pending-bg)",
                    color: isPaused ? "var(--color-approved)" : "var(--color-pending)",
                  }}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {isPaused ? "Unpause submissions" : "Pause submissions"}
                </button>
              )}
              <button
                onClick={() => { requestsQuery.refetch(); packsQuery.refetch(); globalStateQuery.refetch(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] transition-colors"
                style={{ border: "1px solid var(--border-dim)", background: "#0E0E11", color: "var(--color-muted)" }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${requestsQuery.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </motion.div>

        {/* Paused banner */}
        {isPaused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 rounded-lg px-4 py-3 text-[13px] flex items-center gap-2"
            style={{ background: "var(--pending-bg)", border: "1px solid rgba(196,148,60,0.25)", color: "var(--color-pending)" }}>
            <Pause className="h-4 w-4 shrink-0" />
            Employee submissions are currently paused. No new requests can be submitted.
          </motion.div>
        )}

        {/* Metrics strip */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }}
          className="grid grid-cols-4 gap-3 mb-8">
          {metrics.map((m, i) => (
            <motion.div key={m.label}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.05 }}
              className="rounded-lg px-5 py-4 relative overflow-hidden"
              style={{ background: "#0E0E11", border: `1px solid ${m.accentBorder}` }}>
              <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${m.accentBg} 0%, transparent 70%)`, transform: "translate(30%,-30%)" }} />
              <p className="text-[10px] font-medium uppercase tracking-[0.09em] mb-1.5" style={{ color: "var(--color-subtle)" }}>{m.label}</p>
              <p className="text-[28px] font-bold tracking-[-0.03em]" style={{ color: m.color }}>{m.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Status banners */}
        {!isConfigured && (
          <div className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{ background: "var(--pending-bg)", border: "1px solid rgba(196,148,60,0.20)", color: "var(--color-pending)" }}>
            Contract not configured. Set <code className="font-mono text-[12px]">NEXT_PUBLIC_SHIELDCARD_ADDRESS</code>.
          </div>
        )}
        {isConfigured && !isAdmin && (
          <div className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-mid)", color: "var(--color-muted)" }}>
            This wallet is not the admin. Connect admin wallet to access write actions.
          </div>
        )}
        {isConfigured && isAdmin && isWrongNetwork && (
          <div className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{ background: "var(--pending-bg)", border: "1px solid rgba(196,148,60,0.20)", color: "var(--color-pending)" }}>
            Wrong network. Switch to Arbitrum Sepolia.
            <div className="mt-3"><SwitchNetworkButton compact /></div>
          </div>
        )}
        {isConfigured && isAdmin && !isWrongNetwork && !isReady && (
          <div className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-dim)", color: "var(--color-muted)" }}>
            {cofheError ? getErrorMessage(cofheError) : "Initializing CoFHE client for encrypted admin actions..."}
          </div>
        )}
        {actionError && (
          <div className="mb-6 rounded-lg px-4 py-3 text-[13px] flex items-start gap-2"
            style={{ background: "var(--denied-bg)", border: "1px solid rgba(147,68,68,0.20)", color: "var(--color-denied)" }}>
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Employee management */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }} className="mb-6">
          <EmployeeManagement
            onRegister={registerEmployee}
            onFreeze={freezeEmployee}
            onUnfreeze={unfreezeEmployee}
            canManage={canManage}
            disabledReason={adminDisabledReason}
            employeeCount={employeeCount}
          />
        </motion.div>

        {/* Policy pack manager */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }} className="mb-6">
          <PolicyPackManager
            packs={packsQuery.data ?? []}
            onSetThresholds={handleSetThresholds}
            onSetActive={(packId, active, cb) => setPackActive(packId, active, cb)}
            onResetBudget={(packId, cb) => resetBudgetEpoch(packId, cb)}
            canManage={canCofheActions}
            disabledReason={cofheDisabledReason}
          />
        </motion.div>

        {/* Review queue — highlight if any */}
        {reviewRequests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.20 }}
            className="mb-6 rounded-xl p-6"
            style={{ background: "#0E0E11", border: "1px solid rgba(196,148,60,0.25)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md"
                style={{ background: "rgba(196,148,60,0.12)", border: "1px solid rgba(196,148,60,0.25)" }}>
                <ClipboardCheck className="h-3.5 w-3.5 text-pending" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-text">Review queue</h2>
                <p className="text-[12px] mt-0.5 text-subtle">{reviewRequests.length} request{reviewRequests.length !== 1 ? "s" : ""} awaiting admin decision</p>
              </div>
            </div>
            <RequestStream
              requests={reviewRequests}
              onPublish={handlePublish}
              onAdminReview={handleAdminReview}
              publishingId={publishingId}
              resolvingId={resolvingId}
              canPublish={canManage}
            />
          </motion.div>
        )}

        {/* Full request stream */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}
          className="rounded-xl p-6"
          style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-text">All requests</h2>
              {requestsQuery.data && (
                <p className="text-[12px] mt-0.5 text-subtle">
                  {requestsQuery.data.length} total on Arbitrum Sepolia
                </p>
              )}
            </div>
          </div>

          {requestsQuery.isLoading ? (
            <div className="flex items-center gap-2.5 py-14 justify-center">
              <span className="w-2 h-2 rounded-full bg-copper animate-pending" />
              <span className="text-[13px] text-muted">Loading requests from Arbitrum Sepolia...</span>
            </div>
          ) : requestsQuery.isError ? (
            <div className="rounded-lg px-4 py-3 text-[13px]"
              style={{ background: "var(--denied-bg)", border: "1px solid rgba(147,68,68,0.20)", color: "var(--color-denied)" }}>
              Failed to load requests. Check RPC connection.
            </div>
          ) : (
            <RequestStream
              requests={requestsQuery.data ?? []}
              onPublish={handlePublish}
              onAdminReview={handleAdminReview}
              publishingId={publishingId}
              resolvingId={resolvingId}
              canPublish={canCofheActions}
            />
          )}
        </motion.div>

      </main>
    </div>
  );
}
