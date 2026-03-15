"use client";

import { ReactNode } from "react";

import { CofheProvider } from "@/providers/CofheProvider";
import { Web3Provider } from "@/providers/Web3Provider";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      <CofheProvider>{children}</CofheProvider>
    </Web3Provider>
  );
}
