"use client";

import { useCofheContext } from "@/providers/CofheProvider";

export function useCofhe() {
  const { client, error, isReady } = useCofheContext();

  async function encryptAmount(amountInCents: number) {
    if (!client) throw new Error("CoFHE client is not connected.");
    const { Encryptable } = await import("@cofhe/sdk");
    const [encrypted] = await client
      .encryptInputs([Encryptable.uint32(BigInt(amountInCents))])
      .execute();
    return encrypted;
  }

  async function encryptCategory(categoryId: number) {
    if (!client) throw new Error("CoFHE client is not connected.");
    const { Encryptable } = await import("@cofhe/sdk");
    const [encrypted] = await client
      .encryptInputs([Encryptable.uint8(BigInt(categoryId))])
      .execute();
    return encrypted;
  }

  async function decryptStatus(ctHash: string) {
    if (!client) throw new Error("CoFHE client is not connected.");
    const { FheTypes } = await import("@cofhe/sdk");
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
    decryptStatus,
    decryptForPublish,
  };
}
