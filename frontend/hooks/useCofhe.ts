"use client";

import { useEffect } from "react";

import { useCofheContext } from "@/providers/CofheProvider";

let sdkPromise: Promise<typeof import("@cofhe/sdk")> | null = null;

function getCofheSdk() {
  sdkPromise ??= import("@cofhe/sdk");
  return sdkPromise;
}

export function useCofhe() {
  const { client, error, isReady } = useCofheContext();

  useEffect(() => {
    if (!client) return;
    void getCofheSdk();
  }, [client]);

  async function encryptAmount(amountInCents: number) {
    if (!client) throw new Error("CoFHE client is not connected.");
    const { Encryptable } = await getCofheSdk();
    const [encrypted] = await client
      .encryptInputs([Encryptable.uint32(BigInt(amountInCents))])
      .execute();
    return encrypted;
  }

  async function encryptCategory(categoryId: number) {
    if (!client) throw new Error("CoFHE client is not connected.");
    const { Encryptable } = await getCofheSdk();
    const [encrypted] = await client
      .encryptInputs([Encryptable.uint8(BigInt(categoryId))])
      .execute();
    return encrypted;
  }

  async function encryptRequestInputs(amountInCents: number, categoryId: number) {
    if (!client) throw new Error("CoFHE client is not connected.");
    const { Encryptable } = await getCofheSdk();
    const [encAmount, encCategory] = await client
      .encryptInputs([
        Encryptable.uint32(BigInt(amountInCents)),
        Encryptable.uint8(BigInt(categoryId)),
      ])
      .execute();

    return { encAmount, encCategory };
  }

  async function decryptStatus(ctHash: string) {
    if (!client) throw new Error("CoFHE client is not connected.");
    const { FheTypes } = await getCofheSdk();
    const permit = await client.permits.getOrCreateSelfPermit();
    return client.decryptForView(ctHash, FheTypes.Uint8).withPermit(permit).execute();
  }

  async function decryptForPublish(ctHash: string) {
    if (!client) throw new Error("CoFHE client is not connected.");
    const permit = await client.permits.getOrCreateSelfPermit();
    return client.decryptForTx(ctHash).withPermit(permit).execute();
  }

  return {
    client,
    error,
    isReady,
    encryptAmount,
    encryptCategory,
    encryptRequestInputs,
    decryptStatus,
    decryptForPublish,
  };
}
