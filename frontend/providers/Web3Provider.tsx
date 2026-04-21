"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, injected } from "wagmi";
import { http } from "viem";

import { targetChain } from "@/lib/contracts";

const config = createConfig({
  chains: [targetChain],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [targetChain.id]: http(
      process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL ||
        targetChain.rpcUrls.default.http[0],
    ),
  },
  ssr: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
