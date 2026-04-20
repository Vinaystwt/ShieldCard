"use client";

import { motion } from "framer-motion";
import { FileX } from "lucide-react";
import { SealedValue } from "@/components/ui/SealedValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatTimestamp, truncateAddress } from "@/lib/format";
import type { RequestView } from "@/lib/contracts";

interface RequestTableProps {
  requests: Array<{ id: bigint } & RequestView>;
}

export function RequestTable({ requests }: RequestTableProps) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={FileX}
        title="No requests on-chain yet"
        body="When employees submit requests, only encrypted handles and public metadata appear here. Actual amounts remain sealed."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            {["#", "Employee", "Encrypted Amount", "Encrypted Category", "Memo", "Time", "Status"].map(
              (col) => (
                <th
                  key={col}
                  className="text-left text-[11px] font-medium uppercase tracking-[0.07em] text-subtle pb-3 pr-4 last:pr-0"
                >
                  {col}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {requests.map((req, i) => (
            <motion.tr
              key={req.id.toString()}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="group"
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
                <SealedValue handle={req.encCategory} />
              </td>
              <td className="py-3.5 pr-4">
                <span className="text-muted max-w-[180px] block truncate">{req.memo}</span>
              </td>
              <td className="py-3.5 pr-4">
                <span className="text-subtle">{formatTimestamp(req.timestamp)}</span>
              </td>
              <td className="py-3.5">
                <StatusBadge status={req.publicStatus} published={req.resultPublished} />
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
