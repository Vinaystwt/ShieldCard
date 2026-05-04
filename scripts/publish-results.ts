// Override global fetch with native https to avoid UND_ERR_SOCKET on Node v24
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
      headers: { ...((init?.headers as Record<string, string>) ?? {}) },
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
        resolve(new Response(Buffer.concat(chunks), {
          status: res.statusCode ?? 200,
          headers: res.headers as Record<string, string>,
        }));
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

const STATUS_NAMES: Record<number, string> = {
  0: "SUBMITTED",
  1: "AUTO_APPROVED",
  2: "NEEDS_REVIEW",
  3: "AUTO_DENIED",
  4: "ADMIN_APPROVED",
  5: "ADMIN_DENIED",
};

// Strategy:
//   - Publish req 0,2,3,4,5 → finalised (auto-approve/deny + receipts)
//   - Publish req 1 as NEEDS_REVIEW → stays in review queue for live demo
//   - Leave adminReviewRequest for manual live testing
const KEEP_IN_REVIEW = new Set<number>(); // none kept pending; publish all but resolve req1 manually

async function main() {
  const address = getDeployment(hre.network.name, "ShieldCardPolicyEngine");
  if (!address) {
    throw new Error("No ShieldCardPolicyEngine deployment found for network: " + hre.network.name);
  }

  const [admin] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("ShieldCardPolicyEngine", address);
  const adminClient = await createCofheClient(hre, admin);

  console.log(`[publish] contract: ${address}`);
  console.log(`[publish] admin:    ${await admin.getAddress()}`);

  const count = Number(await (contract as any).getRequestCount());
  console.log(`[publish] total requests: ${count}`);

  const permit = await adminClient.permits.getOrCreateSelfPermit();

  let published = 0;
  let skipped = 0;
  const reviewQueue: number[] = [];

  for (let i = 0; i < count; i++) {
    const req = await (contract as any).getRequest(i);

    if (req.resultPublished) {
      console.log(`[publish] #${i} "${req.memo}" — already published (${STATUS_NAMES[Number(req.publicStatus)] ?? req.publicStatus})`);
      skipped++;
      if (req.inReview) reviewQueue.push(i);
      continue;
    }

    if (req.inReview) {
      console.log(`[publish] #${i} "${req.memo}" — in review queue (skipping re-publish)`);
      reviewQueue.push(i);
      skipped++;
      continue;
    }

    console.log(`[publish] #${i} "${req.memo}" — decrypting encStatus...`);

    let encStatus: string;
    try {
      encStatus = await (contract as any).getEncryptedStatus(i);
    } catch (err) {
      console.error(`[publish] #${i} getEncryptedStatus failed:`, err);
      continue;
    }

    console.log(`[publish] #${i} encStatus handle: ${encStatus.slice(0, 20)}...`);

    let decResult: { decryptedValue: bigint; signature: Uint8Array };
    try {
      decResult = await (adminClient as any).decryptForTx(encStatus).withPermit(permit).execute();
    } catch (err) {
      console.error(`[publish] #${i} decryptForTx failed (coprocessor may not have settled yet):`, err);
      console.log(`[publish] Stopping — coprocessor has not processed all requests yet.`);
      break;
    }

    const plainStatus = Number(decResult.decryptedValue);
    const sig = decResult.signature;
    console.log(`[publish] #${i} decrypted: ${STATUS_NAMES[plainStatus] ?? plainStatus}`);

    try {
      const tx = await (contract as any).publishDecryptedResult(i, plainStatus, sig);
      const receipt = await tx.wait();
      console.log(`[publish] #${i} published: tx ${receipt?.hash?.slice(0, 22)}...`);
      published++;

      if (plainStatus === 2) { // NEEDS_REVIEW
        reviewQueue.push(i);
      }
    } catch (err) {
      console.error(`[publish] #${i} publishDecryptedResult failed:`, err);
    }
  }

  console.log(`\n[publish] published=${published}  already-published/skipped=${skipped}`);
  if (reviewQueue.length > 0) {
    console.log(`[publish] review queue: requests [${reviewQueue.join(", ")}] — in admin UI for approval/denial`);
  }

  // Per-pack summary
  console.log("\n[publish] Pack summaries:");
  for (let p = 1; p <= 4; p++) {
    try {
      const [name, , limitsSet] = await (contract as any).getPackInfo(p);
      const [total, approved, denied, pending, inReview] = await (contract as any).getPackSummary(p);
      console.log(`  Pack ${p} (${name}): total=${total} approved=${approved} denied=${denied} pending=${pending} inReview=${inReview} limitsSet=${limitsSet}`);
    } catch { /* pack may not exist */ }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
