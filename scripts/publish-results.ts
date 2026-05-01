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

const STATUS_NAMES: Record<number, string> = { 0: "PENDING", 1: "APPROVED", 2: "DENIED" };

// Publish this many requests, keep the rest pending for live demo
const PUBLISH_LIMIT = parseInt(process.env.PUBLISH_LIMIT ?? "7", 10);

async function main() {
  const address = getDeployment(hre.network.name, "ShieldCardPolicy");
  if (!address) {
    throw new Error("No ShieldCardPolicy deployment found for network: " + hre.network.name);
  }

  const [admin] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("ShieldCardPolicy", address);
  const adminClient = await createCofheClient(hre, admin);

  console.log(`[publish] contract: ${address}`);
  console.log(`[publish] admin:    ${await admin.getAddress()}`);

  const count = Number(await contract.getRequestCount());
  console.log(`[publish] total requests: ${count}`);

  const permit = await adminClient.permits.getOrCreateSelfPermit();
  let published = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const req = await contract.getRequest(i);

    if (req.resultPublished) {
      console.log(`[publish] #${i} "${req.memo}" — already published (${STATUS_NAMES[Number(req.publicStatus)]})`);
      skipped++;
      continue;
    }

    if (published >= PUBLISH_LIMIT) {
      console.log(`[publish] #${i} "${req.memo}" — keeping pending (demo state)`);
      continue;
    }

    console.log(`[publish] #${i} "${req.memo}" — decrypting...`);
    const encStatus = await contract.getEncryptedStatus(i);
    const result = await adminClient.decryptForTx(encStatus).withPermit(permit).execute();
    const status = Number(result.decryptedValue);

    console.log(`[publish] #${i} decrypted: ${STATUS_NAMES[status]}`);
    const tx = await contract.publishDecryptedResult(i, status, result.signature);
    const receipt = await tx.wait();
    console.log(`[publish] #${i} published: tx ${receipt?.hash?.slice(0, 20)}...`);
    published++;
  }

  console.log(`\n[publish] published=${published}  already-published=${skipped}  pending=${count - published - skipped}`);

  // Per-pack summary
  for (let p = 1; p <= 4; p++) {
    try {
      const [total, approved, denied, pending] = await contract.getPackSummary(p);
      const [name] = await contract.getPackInfo(p);
      console.log(`[publish] ${name}: total=${total} approved=${approved} denied=${denied} pending=${pending}`);
    } catch { /* pack may not exist */ }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
