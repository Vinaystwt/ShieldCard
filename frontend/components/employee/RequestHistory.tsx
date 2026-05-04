"use client";

import { motion } from "framer-motion";
import { Inbox, Clock, CheckCircle2, XCircle, ClipboardCheck, AlertCircle } from "lucide-react";
import { RevealCard } from "./RevealCard";
import { SealedValue } from "@/components/ui/SealedValue";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatTimestamp } from "@/lib/format";
import { PACK_NAME } from "@/lib/contracts";
import {
  STATUS_AUTO_APPROVED, STATUS_NEEDS_REVIEW, STATUS_AUTO_DENIED,
  STATUS_ADMIN_APPROVED, STATUS_ADMIN_DENIED,
} from "@/lib/constants";
import type { RequestView } from "@/lib/contracts";

interface RequestHistoryProps {
  requests: Array<{ id: bigint } & RequestView>;
  onDecrypt: (requestId: bigint, encStatus: string) => Promise<number>;
  canReveal: boolean;
}

function LifecycleDot({
  status,
  isPublished,
  inReview,
}: {
  status: number;
  isPublished: boolean;
  inReview: boolean;
}) {
  if (!isPublished && !inReview) {
    return (
      <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-pending)" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-pending animate-pending" />
        Sealed
      </span>
    );
  }
  if (inReview && !isPublished) {
    return (
      <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-pending)" }}>
        <ClipboardCheck className="w-3.5 h-3.5" />
        Under review
      </span>
    );
  }
  switch (status) {
    case STATUS_AUTO_APPROVED:
    case STATUS_ADMIN_APPROVED:
      return (
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-approved)" }}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approved
        </span>
      );
    case STATUS_AUTO_DENIED:
    case STATUS_ADMIN_DENIED:
      return (
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-denied)" }}>
          <XCircle className="w-3.5 h-3.5" />
          Denied
        </span>
      );
    case STATUS_NEEDS_REVIEW:
      return (
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-pending)" }}>
          <AlertCircle className="w-3.5 h-3.5" />
          Needs review
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-subtle)" }}>
          <Clock className="w-3.5 h-3.5" />
          Pending
        </span>
      );
  }
}

function cardBorder(req: RequestView) {
  if (req.inReview && !req.resultPublished) return "1px solid rgba(196,148,60,0.25)";
  if (!req.resultPublished) return "1px solid var(--border-dim)";
  switch (req.publicStatus) {
    case STATUS_AUTO_APPROVED:
    case STATUS_ADMIN_APPROVED: return "1px solid rgba(77,145,112,0.20)";
    case STATUS_AUTO_DENIED:
    case STATUS_ADMIN_DENIED:   return "1px solid rgba(147,68,68,0.20)";
    default: return "1px solid var(--border-mid)";
  }
}

export function RequestHistory({ requests, onDecrypt, canReveal }: RequestHistoryProps) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No requests yet"
        body="Your encrypted requests appear here after submission. Only you can decrypt the results."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {[...requests].reverse().map((req, i) => (
        <motion.div
          key={req.id.toString()}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
        >
          <div
            className="rounded-xl p-4"
            style={{ background: "#0E0E11", border: cardBorder(req) }}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[11px] font-mono text-subtle">#{req.id.toString()}</span>
                <p className="text-[13px] text-muted mt-0.5">{req.memo}</p>
                <p className="text-[11px] text-subtle mt-0.5">{formatTimestamp(req.timestamp)}</p>
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                <SealedValue handle={req.encAmount} />
                <span
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(110,144,178,0.08)",
                    border: "1px solid var(--steel-border)",
                    color: "var(--color-steel)",
                  }}
                >
                  {PACK_NAME[req.packId] ?? `Pack #${req.packId}`}
                </span>
                <LifecycleDot
                  status={req.publicStatus}
                  isPublished={req.resultPublished}
                  inReview={req.inReview}
                />
              </div>
            </div>

            {/* Reveal card */}
            <RevealCard
              requestId={req.id}
              encStatus={req.encStatus}
              receiptHash={req.receiptHash}
              memo={req.memo}
              onDecrypt={onDecrypt}
              canReveal={canReveal}
              isPublished={req.resultPublished}
              publicStatus={req.publicStatus}
              inReview={req.inReview}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
