/**
 * integration-live.ts
 *
 * Live-network integration test against ShieldCardControlPlane on Arbitrum Sepolia.
 * Submits one fresh request, polls the threshold network, publishes the decrypted
 * outcome, and asserts that publicStatus is one of {1,2,3}.
 *
 * Guarded by RUN_LIVE_INTEGRATION=1 to prevent accidental execution.
 *
 * Usage:
 *   RUN_LIVE_INTEGRATION=1 pnpm hardhat run scripts/integration-live.ts --network arb-sepolia
 */

// Native-fetch polyfill (same as other live scripts — Node v20+ drops TLS to CoFHE prover)
import * as https from "https";
import * as http from "http";

const nativeFetch: typeof fetch = (input, init) => {
  return new Promise((resolve, reject) => {
    const url = new URL(typeof input === "string" ? input : (input as Request).url);
    const options: any = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: init?.method ?? "GET",
      headers: { ...(init?.headers as Record<string, string> ?? {}) },
      agent: new https.Agent({ keepAlive: false }),
    };
    const bodyStr = typeof init?.body === "string" ? init.body : undefined;
    if (bodyStr) options.headers["Content-Length"] = Buffer.byteLength(bodyStr).toString();

    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () =>
        resolve(new Response(Buffer.concat(chunks), {
          status: res.statusCode ?? 200,
          headers: res.headers as Record<string, string>,
        })),
      );
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
};
(globalThis as any).fetch = nativeFetch;

import { Wallet } from "ethers";
import { Encryptable } from "@cofhe/sdk";
import hre from "hardhat";
import { createCofheClient, getDeployment } from "../tasks/utils";

const STATUS_NAMES: Record<number, string> = {
  0: "SUBMITTED",
  1: "AUTO_APPROVED",
  2: "NEEDS_REVIEW",
  3: "AUTO_DENIED",
};

async function main() {
  if (process.env.RUN_LIVE_INTEGRATION !== "1") {
    console.log("[integration] guard RUN_LIVE_INTEGRATION!=1 — skipping.");
    return;
  }

  const empKey = process.env.EMPLOYEE_A_PRIVATE_KEY;
  if (!empKey) throw new Error("EMPLOYEE_A_PRIVATE_KEY required");

  const employee = new Wallet(empKey, hre.ethers.provider);
  const [admin] = await hre.ethers.getSigners();

  const address = getDeployment(hre.network.name, "ShieldCardControlPlane");
  if (!address) throw new Error("No ShieldCardControlPlane deployment for " + hre.network.name);

  console.log(`[integration] contract: ${address}`);
  console.log(`[integration] admin:    ${await admin.getAddress()}`);
  console.log(`[integration] employee: ${employee.address}`);

  const planeAdmin    = await hre.ethers.getContractAt("ShieldCardControlPlane", address, admin);
  const planeEmployee = await hre.ethers.getContractAt("ShieldCardControlPlane", address, employee);

  // Phase 1: submit fresh encrypted request
  const employeeClient = await createCofheClient(hre, employee);
  const amount = BigInt(12_345); // arbitrary small cents value, well within Travel pack auto-threshold
  const [encAmount] = await employeeClient.encryptInputs([Encryptable.uint32(amount)]).execute();

  console.log(`[integration] submitting encrypted amount=${amount} on pack 1 (Travel)...`);
  const submitTx = await (planeEmployee as any).submitRequest(1, 1, 1, encAmount, "live integration test");
  const submitReceipt = await submitTx.wait();
  const beforeCount = Number(await (planeAdmin as any).getRequestCount());
  const requestId = beforeCount - 1;
  console.log(`[integration] submitted: requestId=${requestId} tx=${submitReceipt?.hash}`);

  // Phase 2: poll + decrypt via threshold network
  const adminClient = await createCofheClient(hre, admin);
  const permit = await (adminClient as any).permits.getOrCreateSelfPermit();
  const encStatus: string = await (planeAdmin as any).getEncryptedStatus(requestId);
  console.log(`[integration] encStatus handle: ${encStatus.slice(0, 24)}...`);

  let decResult: { decryptedValue: bigint; signature: Uint8Array } | undefined;
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      decResult = await (adminClient as any).decryptForTx(encStatus).withPermit(permit).execute();
      console.log(`[integration] decrypt ok on attempt ${attempt}`);
      break;
    } catch (err) {
      console.log(`[integration] decrypt attempt ${attempt}/${maxAttempts} failed: ${(err as Error).message.slice(0, 120)}`);
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }

  if (!decResult) throw new Error("decryption failed");
  const plainStatus = Number(decResult.decryptedValue);
  console.log(`[integration] plainStatus=${plainStatus} (${STATUS_NAMES[plainStatus] ?? "?"})`);

  if (![1, 2, 3].includes(plainStatus)) {
    throw new Error(`expected plainStatus in {1,2,3}, got ${plainStatus}`);
  }

  // Phase 3: publish on-chain
  const pubTx = await (planeAdmin as any).publishDecryptedResult(requestId, plainStatus, decResult.signature);
  const pubReceipt = await pubTx.wait();
  console.log(`[integration] published tx=${pubReceipt?.hash}`);

  const req = await (planeAdmin as any).getRequest(requestId);
  if (!req.resultPublished) throw new Error("resultPublished is false after publish");
  console.log(`[integration] PASS: request ${requestId} published with status=${req.publicStatus}`);
  console.log(`[integration] receiptHash=${req.receiptHash}`);
}

main().catch((err) => {
  console.error("[integration] FAIL:", err);
  process.exitCode = 1;
});
