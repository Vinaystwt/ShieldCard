/**
 * publish-results.ts
 *
 * Decrypts each seeded request's encrypted status using the admin permit,
 * publishes the result on-chain, and verifies the published publicStatus
 * matches the expected outcome.
 *
 * Run: pnpm arb-sepolia:publish-results
 */

// Override global fetch with native https to avoid UND_ERR_SOCKET on Node v24
// (bundled undici drops TLS connections to CoFHE TN/VRF endpoints)
import * as https from "https";
import * as http from "http";

const nativeFetch: typeof fetch = (input, init) => {
  return new Promise((resolve, reject) => {
    const url = new URL(
      typeof input === "string" ? input : (input as Request).url,
    );
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method:
        init?.method ??
        (typeof input !== "string" && (input as Request).method) ??
        "GET",
      headers: {
        ...((init?.headers as Record<string, string>) ?? {}),
      },
      agent: new https.Agent({ keepAlive: false }),
    };

    const bodyStr =
      typeof init?.body === "string"
        ? init.body
        : init?.body instanceof Uint8Array
          ? Buffer.from(init.body).toString()
          : undefined;

    if (bodyStr && !(options.headers as Record<string, string>)["Content-Length"]) {
      (options.headers as Record<string, string>)["Content-Length"] =
        Buffer.byteLength(bodyStr).toString();
    }

    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve(
          new Response(body, {
            status: res.statusCode ?? 200,
            headers: res.headers as Record<string, string>,
          }),
        );
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
};

(globalThis as any).fetch = nativeFetch;

import hre from "hardhat";
import { createCofheClient, getDeployment } from "../tasks/utils";

const STATUS_APPROVED = 1;
const STATUS_DENIED = 2;
const STATUS_NAMES: Record<number, string> = {
  0: "PENDING",
  1: "APPROVED",
  2: "DENIED",
};

const EXPECTED_OUTCOMES: Record<number, number> = {
  0: STATUS_APPROVED, // Figma subscription / $300 / cat1 / limit $500
  1: STATUS_DENIED,   // Server upgrade / $700 / cat1 / limit $500 (over)
  2: STATUS_APPROVED, // AWS compute / $800 / cat1 / limit $1000
  3: STATUS_DENIED,   // Marketing spend / $200 / cat2 (wrong category)
};

async function main() {
  const address = getDeployment(hre.network.name, "ShieldCardPolicy");
  if (!address) {
    throw new Error(
      "No ShieldCardPolicy deployment found for network: " + hre.network.name,
    );
  }

  const [admin] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("ShieldCardPolicy", address);
  const adminClient = await createCofheClient(hre, admin);

  console.log(`[publish] contract: ${address}`);
  console.log(`[publish] admin: ${await admin.getAddress()}`);
  console.log();

  const count = Number(await contract.getRequestCount());
  console.log(`[publish] total requests: ${count}`);
  console.log();

  const permit = await adminClient.permits.getOrCreateSelfPermit();

  let allCorrect = true;

  for (let i = 0; i < count; i++) {
    const req = await contract.getRequest(i);
    const expected = EXPECTED_OUTCOMES[i];

    console.log(`[publish] Request #${i}: "${req.memo}" (employee: ${req.employee.slice(0, 10)}...)`);

    if (req.resultPublished) {
      const match = Number(req.publicStatus) === expected;
      console.log(
        `  already published: publicStatus=${req.publicStatus} (${STATUS_NAMES[Number(req.publicStatus)]}) — expected ${STATUS_NAMES[expected]} — ${match ? "✓ CORRECT" : "✗ MISMATCH"}`,
      );
      if (!match) allCorrect = false;
      continue;
    }

    // Decrypt via admin permit
    console.log(`  decrypting via Threshold Network...`);
    const encStatusHandle = await contract.getEncryptedStatus(i);
    const result = await adminClient
      .decryptForTx(encStatusHandle)
      .withPermit(permit)
      .execute();

    const decrypted = Number(result.decryptedValue);
    const correct = decrypted === expected;
    console.log(
      `  decrypted: ${decrypted} (${STATUS_NAMES[decrypted]}) — expected ${STATUS_NAMES[expected]} — ${correct ? "✓ CORRECT" : "✗ MISMATCH"}`,
    );
    if (!correct) allCorrect = false;

    // Publish on-chain
    console.log(`  publishing on-chain...`);
    const tx = await contract.publishDecryptedResult(
      i,
      decrypted,
      result.signature,
    );
    const receipt = await tx.wait();
    console.log(`  published: tx=${receipt?.hash?.slice(0, 20)}... block=${receipt?.blockNumber}`);

    // Verify stored publicStatus
    const after = await contract.getRequest(i);
    const verified =
      after.resultPublished === true && Number(after.publicStatus) === decrypted;
    console.log(
      `  on-chain state: resultPublished=${after.resultPublished} publicStatus=${after.publicStatus} — ${verified ? "✓ VERIFIED" : "✗ STATE ERROR"}`,
    );
    console.log();
  }

  console.log(`[publish] === SUMMARY ===`);
  console.log(
    allCorrect
      ? "[publish] ✓ All results match expected outcomes."
      : "[publish] ✗ One or more results did not match expected outcomes.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
