"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Upload, Loader2, CheckCircle } from "lucide-react";
import { SealedValue } from "@/components/ui/SealedValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatTimestamp, truncateAddress } from "@/lib/format";
import type { RequestView } from "@/lib/contracts";

interface RequestStreamProps {
  requests: Array<{ id: bigint } & RequestView>;
  onPublish: (requestId: bigint, statusHandle: string) => Promise<void>;
  publishingId: string | null;
}

export function RequestStream({ requests, onPublish, publishingId }: RequestStreamProps) {
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No requests yet"
        body="When employees submit requests, they appear here with their encrypted handles and status."
      />
    );
  }

  async function handlePublish(req: { id: bigint } & RequestView) {
    try {
      await onPublish(req.id, req.encStatus);
      setPublishedIds((prev) => new Set([...prev, req.id.toString()]));
    } catch {
      // error handled by parent
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            {["#", "Employee", "Sealed Amount", "Memo", "Time", "Status", "Action"].map((col) => (
              <th
                key={col}
                className="text-left text-[11px] font-medium uppercase tracking-[0.07em] text-subtle pb-3 pr-4 last:pr-0"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((req, i) => {
            const isPublishing = publishingId === req.id.toString();
            const wasJustPublished = publishedIds.has(req.id.toString());
            return (
              <motion.tr
                key={req.id.toString()}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                style={{ borderBottom: "1px solid var(--border-dim)" }}
              >
                <td className="py-3.5 pr-4">
                  <span className="font-mono text-subtle">#{req.id.toString()}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="font-mono text-muted">{truncateAddress(req.employee)}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <SealedValue handle={req.encAmount} />
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-muted max-w-[160px] block truncate">{req.memo}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-subtle whitespace-nowrap">{formatTimestamp(req.timestamp)}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <StatusBadge status={req.publicStatus} published={req.resultPublished} />
                </td>
                <td className="py-3.5">
                  {req.resultPublished ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-approved opacity-70">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Published
                    </span>
                  ) : (
                    <AnimatePresence mode="wait">
                      {isPublishing ? (
                        <motion.span
                          key="publishing"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5 text-[11px] text-copper"
                        >
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="animate-pending">Decrypting...</span>
                        </motion.span>
                      ) : (
                        <motion.button
                          key="publish-btn"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => handlePublish(req)}
                          disabled={!!publishingId}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-copper px-3 py-1.5 rounded-md transition-all duration-150 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                          style={{
                            background: "rgba(200,131,63,0.08)",
                            border: "1px solid var(--copper-border-dim)",
                          }}
                        >
                          <Upload className="w-3 h-3" />
                          Publish
                        </motion.button>
                      )}
                    </AnimatePresence>
                  )}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
