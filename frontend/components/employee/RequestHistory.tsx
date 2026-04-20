"use client";

import { motion } from "framer-motion";
import { Inbox } from "lucide-react";
import { RevealCard } from "./RevealCard";
import { SealedValue } from "@/components/ui/SealedValue";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatTimestamp } from "@/lib/format";
import type { RequestView } from "@/lib/contracts";

interface RequestHistoryProps {
  requests: Array<{ id: bigint } & RequestView>;
  onDecrypt: (requestId: bigint, encStatus: string) => Promise<number>;
}

export function RequestHistory({ requests, onDecrypt }: RequestHistoryProps) {
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
          {req.resultPublished ? (
            /* Published — show public status with reveal option */
            <div
              className="rounded-xl p-4"
              style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="text-[11px] font-mono text-subtle">#{req.id.toString()}</span>
                  <p className="text-[13px] text-muted mt-0.5">{req.memo}</p>
                  <p className="text-[11px] text-subtle mt-0.5">{formatTimestamp(req.timestamp)}</p>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  <SealedValue handle={req.encAmount} />
                  <SealedValue handle={req.encCategory} />
                </div>
              </div>
              <RevealCard
                requestId={req.id}
                encStatus={req.encStatus}
                memo={req.memo}
                onDecrypt={onDecrypt}
              />
            </div>
          ) : (
            /* Not yet published — sealed state */
            <div
              className="rounded-xl p-4"
              style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-mono text-subtle">#{req.id.toString()}</span>
                  <p className="text-[13px] text-muted mt-0.5">{req.memo}</p>
                  <p className="text-[11px] text-subtle mt-0.5">{formatTimestamp(req.timestamp)}</p>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  <SealedValue handle={req.encAmount} />
                  <SealedValue handle={req.encCategory} />
                  <span
                    className="inline-flex items-center gap-1 text-[11px] text-pending px-2 py-0.5 rounded-full"
                    style={{ background: "var(--pending-bg)" }}
                  >
                    <span className="w-1 h-1 rounded-full bg-pending animate-pending" />
                    Awaiting policy evaluation
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
