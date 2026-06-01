"use client";

import React from "react";
import { cn } from "@/lib/format";

function SkeletonBase({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("animate-pulse rounded", className)}
      style={{ background: "rgba(255,255,255,0.06)", ...style }}
    />
  );
}

export function TextSkeleton({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg px-5 py-4"
          style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}
        >
          <SkeletonBase className="h-3 w-20 mb-3" />
          <SkeletonBase className="h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="rounded-xl p-6"
      style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 py-3"
          style={{ borderBottom: i < rows - 1 ? "1px solid var(--border-dim)" : undefined }}
        >
          <SkeletonBase className="h-8 w-8 rounded-md shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <SkeletonBase className="h-3.5 w-1/3" />
            <SkeletonBase className="h-3 w-1/2" />
          </div>
          <SkeletonBase className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border-dim)" }}
    >
      {/* Header */}
      <div
        className="grid px-4 py-3 gap-3"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          borderBottom: "1px solid var(--border-dim)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBase key={i} className="h-3 w-20" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid px-4 py-3.5 gap-3 items-center"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            borderBottom: i < rows - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined,
            background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
          }}
        >
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBase
              key={j}
              className="h-4"
              style={{ width: `${60 + ((i * cols + j) * 17) % 40}%` } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10">
      <div className="mb-10">
        <SkeletonBase className="h-4 w-40 mb-3" />
        <SkeletonBase className="h-8 w-80 mb-2" />
        <SkeletonBase className="h-4 w-96" />
      </div>
      <StatSkeleton count={4} />
      <div className="mt-6">
        <TableSkeleton rows={6} cols={5} />
      </div>
    </div>
  );
}
