"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { http } from "viem";

import { targetChain } from "@/lib/contracts";

const config = getDefaultConfig({
  appName: "ShieldCard",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "shieldcard-demo",
  chains: [targetChain],
  ssr: false,
  transports: {
    [targetChain.id]: http(
      process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL ||
        targetChain.rpcUrls.default.http[0],
    ),
  },
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={darkTheme({
            accentColor: "#38d996",
            accentColorForeground: "#08110d",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
