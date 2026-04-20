"use client";

import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border-dim)",
        }}
      >
        <Icon className="w-5 h-5 text-subtle" />
      </div>
      <h3 className="text-[15px] font-medium text-muted mb-1.5">{title}</h3>
      <p className="text-[13px] text-subtle max-w-[280px] leading-relaxed">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
