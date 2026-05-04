"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Upload, Loader2, CheckCircle, ThumbsUp, ThumbsDown, ReceiptText } from "lucide-react";

import { TransactionStatus } from "@/hooks/useShieldCard";
import { SealedValue } from "@/components/ui/SealedValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatTimestamp, truncateAddress } from "@/lib/format";
import { PACK_NAME } from "@/lib/contracts";
import type { RequestView } from "@/lib/contracts";

interface RequestStreamProps {
  requests: Array<{ id: bigint } & RequestView>;
  onPublish: (
    requestId: bigint,
    statusHandle: string,
    onStatusChange: (status: TransactionStatus) => void,
  ) => Promise<unknown>;
  onAdminReview: (
    requestId: bigint,
    approved: boolean,
    onStatusChange: (status: TransactionStatus) => void,
  ) => Promise<unknown>;
  publishingId: string | null;
  resolvingId: string | null;
  canPublish: boolean;
}

export function RequestStream({
  requests,
  onPublish,
  onAdminReview,
  publishingId,
  resolvingId,
  canPublish,
}: RequestStreamProps) {
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No requests yet"
        body="When employees submit requests they appear here with encrypted handles and lifecycle status."
      />
    );
  }

  async function handlePublish(req: { id: bigint } & RequestView) {
    try {
      await onPublish(req.id, req.encStatus, (status) => {
        const key = req.id.toString();
        if (status.phase === "awaiting_wallet") {
          setActionMsg((p) => ({ ...p, [key]: "Approve decrypt + publish tx in wallet." }));
        }
        if (status.phase === "submitted" || status.phase === "confirming") {
          setActionMsg((p) => ({ ...p, [key]: "Waiting for on-chain confirmation." }));
        }
      });
    } catch {
      // parent owns error state
    }
  }

  async function handleReview(req: { id: bigint } & RequestView, approved: boolean) {
    try {
      await onAdminReview(req.id, approved, (status) => {
        const key = req.id.toString();
        if (status.phase === "awaiting_wallet") {
          setActionMsg((p) => ({ ...p, [key]: `Approve ${approved ? "approval" : "denial"} tx in wallet.` }));
        }
        if (status.phase === "submitted" || status.phase === "confirming") {
          setActionMsg((p) => ({ ...p, [key]: "Waiting for confirmation." }));
        }
      });
    } catch {
      // parent owns error state
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            {["#", "Employee", "Pack", "Sealed Amount", "Memo", "Time", "Status", "Action"].map((col) => (
              <th
                key={col}
                className="pb-3 pr-4 text-left text-[11px] font-medium uppercase tracking-[0.07em] last:pr-0"
                style={{ color: "var(--color-subtle)" }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((req, i) => {
            const key = req.id.toString();
            const isPublishing = publishingId === key;
            const isResolving = resolvingId === key;
            const isBusy = isPublishing || isResolving;
            const hint = actionMsg[key];
            const packName = PACK_NAME[req.packId] ?? `Pack #${req.packId}`;

            return (
              <motion.tr
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                style={{ borderBottom: "1px solid var(--border-dim)" }}
              >
                <td className="py-3.5 pr-4">
                  <span className="font-mono" style={{ color: "var(--color-subtle)" }}>#{key}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="font-mono" style={{ color: "var(--color-muted)" }}>{truncateAddress(req.employee)}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ background: "rgba(110,144,178,0.08)", border: "1px solid var(--steel-border)", color: "var(--color-steel)" }}
                  >
                    {packName}
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <SealedValue handle={req.encAmount} />
                </td>
                <td className="py-3.5 pr-4">
                  <span className="block max-w-[130px] truncate" style={{ color: "var(--color-muted)" }}>{req.memo}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="whitespace-nowrap" style={{ color: "var(--color-subtle)" }}>{formatTimestamp(req.timestamp)}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <StatusBadge status={req.publicStatus} published={req.resultPublished} inReview={req.inReview} />
                </td>
                <td className="py-3.5">
                  <AnimatePresence mode="wait">
                    {req.resultPublished && !req.inReview ? (
                      <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {req.receiptHash && req.receiptHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? (
                          <span
                            className="flex items-center gap-1.5 text-[11px]"
                            style={{ color: "var(--color-approved)", opacity: 0.8 }}
                            title={`Receipt: ${req.receiptHash}`}
                          >
                            <ReceiptText className="h-3.5 w-3.5" />
                            Receipt
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-approved)", opacity: 0.7 }}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Published
                          </span>
                        )}
                      </motion.div>
                    ) : req.inReview ? (
                      // Admin review actions
                      <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {isResolving ? (
                          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-pending)" }}>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {hint ?? "Resolving..."}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleReview(req, true)}
                              disabled={isBusy || !canPublish}
                              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150 hover:brightness-110 active:scale-95 disabled:opacity-40"
                              style={{ background: "var(--approved-bg)", border: "1px solid rgba(77,145,112,0.25)", color: "var(--color-approved)" }}
                            >
                              <ThumbsUp className="h-3 w-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(req, false)}
                              disabled={isBusy || !canPublish}
                              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150 hover:brightness-110 active:scale-95 disabled:opacity-40"
                              style={{ background: "var(--denied-bg)", border: "1px solid rgba(147,68,68,0.25)", color: "var(--color-denied)" }}
                            >
                              <ThumbsDown className="h-3 w-3" />
                              Deny
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      // Pending publish
                      <motion.div key="publish" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {isPublishing ? (
                          <span className="flex flex-col gap-1 text-[11px]" style={{ color: "var(--color-copper)" }}>
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Publishing...
                            </span>
                            {hint && <span style={{ color: "var(--color-subtle)" }}>{hint}</span>}
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePublish(req)}
                            disabled={isBusy || !canPublish}
                            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all duration-150 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                            style={{
                              background: canPublish ? "rgba(200,131,63,0.08)" : "rgba(255,255,255,0.04)",
                              border: canPublish ? "1px solid var(--copper-border-dim)" : "1px solid var(--border-dim)",
                              color: canPublish ? "var(--color-copper)" : "var(--color-muted)",
                            }}
                          >
                            <Upload className="h-3 w-3" />
                            Publish
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
