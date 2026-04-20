"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

type CofheClient = {
  connect: (publicClient: unknown, walletClient: unknown) => Promise<void>;
  permits: {
    getOrCreateSelfPermit: () => Promise<unknown>;
  };
  encryptInputs: (inputs: unknown[]) => {
    execute: () => Promise<unknown[]>;
  };
  decryptForView: (ctHash: string, fheType: unknown) => {
    withPermit: (permit: unknown) => {
      execute: () => Promise<bigint>;
    };
  };
  decryptForTx: (ctHash: string) => {
    withPermit: (permit: unknown) => {
      execute: () => Promise<{
        decryptedValue: bigint;
        signature: `0x${string}`;
      }>;
    };
  };
};

type CofheContextValue = {
  client: CofheClient | null;
  isReady: boolean;
  error: string | null;
};

const CofheContext = createContext<CofheContextValue>({
  client: null,
  isReady: false,
  error: null,
});

export function CofheProvider({ children }: { children: ReactNode }) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [client, setClient] = useState<CofheClient | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      if (!publicClient || !walletClient) {
        setClient(null);
        setIsReady(false);
        setError(null);
        return;
      }

      try {
        const [{ getChainById }, { createCofheClient, createCofheConfig }] = await Promise.all([
          import("@cofhe/sdk/chains"),
          import("@cofhe/sdk/web"),
        ]);

        const chain = getChainById(publicClient.chain.id);
        if (!chain) {
          throw new Error("Connected chain is not CoFHE-enabled.");
        }

        const config = createCofheConfig({
          environment: "web",
          supportedChains: [chain],
        });
        const nextClient = createCofheClient(config) as CofheClient;
        await nextClient.connect(publicClient, walletClient);

        if (!active) return;
        setClient(nextClient);
        setIsReady(true);
        setError(null);
      } catch (nextError) {
        if (!active) return;
        setClient(null);
        setIsReady(false);
        setError(nextError instanceof Error ? nextError.message : "Failed to initialize CoFHE.");
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, [publicClient, walletClient]);

  const value = useMemo(() => ({ client, isReady, error }), [client, error, isReady]);
  return <CofheContext.Provider value={value}>{children}</CofheContext.Provider>;
}

export function useCofheContext() {
  return useContext(CofheContext);
}
