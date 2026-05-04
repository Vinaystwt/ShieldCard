"use client";

export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import { Eye, RefreshCw } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { RequestTable } from "@/components/observer/RequestTable";
import { PackSummary } from "@/components/observer/PackSummary";
import { PrivacyExplainer } from "@/components/observer/PrivacyExplainer";
import { useShieldCard } from "@/hooks/useShieldCard";

export default function ObserverPage() {
  const { isConfigured, requestsQuery, packsQuery } = useShieldCard();

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
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-mid)",
                  }}
                >
                  <Eye className="w-3.5 h-3.5" style={{ color: "var(--color-muted)" }} />
                </div>
                <span
                  className="text-[11px] font-medium uppercase tracking-[0.09em]"
                  style={{ color: "var(--color-subtle)" }}
                >
                  Observer lens
                </span>
              </div>
              <h1
                className="text-[30px] font-bold tracking-[-0.025em] leading-snug mb-2"
                style={{ color: "var(--color-text)" }}
              >
                What the chain sees
              </h1>
              <p
                className="text-[14px] leading-relaxed max-w-[500px]"
                style={{ color: "var(--color-muted)" }}
              >
                All on-chain requests — public metadata and encrypted handles only. Amounts and
                policy thresholds stay sealed regardless of who is watching.
              </p>
            </div>
            <button
              onClick={() => {
                requestsQuery.refetch();
                packsQuery.refetch();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] transition-colors"
              style={{
                border: "1px solid var(--border-dim)",
                background: "#0E0E11",
                color: "var(--color-muted)",
              }}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${requestsQuery.isFetching || packsQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Pack summary strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="mb-6"
        >
          <p
            className="text-[11px] font-medium uppercase tracking-[0.09em] mb-3"
            style={{ color: "var(--color-subtle)" }}
          >
            Policy pack compliance
          </p>
          <PackSummary
            packs={packsQuery.data ?? []}
            isLoading={packsQuery.isLoading}
            isError={packsQuery.isError}
          />
        </motion.div>

        {/* Privacy explainer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="mb-6"
        >
          <PrivacyExplainer />
        </motion.div>

        {/* Request table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-xl p-6"
          style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ color: "var(--color-text)" }}
              >
                On-chain requests
              </h2>
              {requestsQuery.data && (
                <p className="text-[12px] mt-0.5" style={{ color: "var(--color-subtle)" }}>
                  {requestsQuery.data.length} request
                  {requestsQuery.data.length !== 1 ? "s" : ""} on Arbitrum Sepolia
                </p>
              )}
            </div>
            {!isConfigured && (
              <span
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{
                  background: "var(--pending-bg)",
                  border: "1px solid rgba(196,148,60,0.2)",
                  color: "var(--color-pending)",
                }}
              >
                Contract not configured
              </span>
            )}
          </div>

          {requestsQuery.isLoading ? (
            <div className="flex items-center gap-2.5 py-14 justify-center">
              <span className="w-2 h-2 rounded-full bg-copper animate-pending" />
              <span className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                Loading public state from Arbitrum Sepolia...
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
            <RequestTable requests={requestsQuery.data ?? []} />
          )}
        </motion.div>
      </main>
    </div>
  );
}
