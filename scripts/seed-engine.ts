/**
 * seed-engine.ts
 * Seeds ShieldCardPolicyEngine on Arbitrum Sepolia with:
 *   - 4 policy packs with encrypted thresholds
 *   - 2 demo employees registered
 *   - 6 demo requests spanning all tiers (auto-approve, review, denied)
 */

import { Wallet } from "ethers";
import { Encryptable } from "@cofhe/sdk";
import hre from "hardhat";

// Node v20+ built-in fetch drops TLS connections to the Fhenix CoFHE VRF verifier.
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

import { createCofheClient } from "../tasks/utils";

const ENGINE_ADDRESS = "0xaa4CDf8ad483445eD77e2a3F772e96A2E10ACC5a";

const PACKS = [
  { id: 1, name: "Travel",    hardLimit: 200_000n, autoThreshold: 50_000n,  budgetLimit: 2_000_000n },
  { id: 2, name: "SaaS",      hardLimit: 150_000n, autoThreshold: 30_000n,  budgetLimit: 1_000_000n },
  { id: 3, name: "Vendor",    hardLimit: 300_000n, autoThreshold: 100_000n, budgetLimit: 3_000_000n },
  { id: 4, name: "Marketing", hardLimit: 100_000n, autoThreshold: 25_000n,  budgetLimit: 800_000n  },
];

async function main() {
  const [admin] = await hre.ethers.getSigners();

  const empAKey = process.env.EMPLOYEE_A_PRIVATE_KEY;
  const empBKey = process.env.EMPLOYEE_B_PRIVATE_KEY;
  if (!empAKey || !empBKey) throw new Error("Missing EMPLOYEE_A_PRIVATE_KEY or EMPLOYEE_B_PRIVATE_KEY");

  const employeeA = new Wallet(empAKey, hre.ethers.provider);
  const employeeB = new Wallet(empBKey, hre.ethers.provider);

  console.log(`Admin:      ${admin.address}`);
  console.log(`Employee A: ${employeeA.address}`);
  console.log(`Employee B: ${employeeB.address}`);
  console.log(`Contract:   ${ENGINE_ADDRESS}\n`);

  const engine = await hre.ethers.getContractAt("ShieldCardPolicyEngine", ENGINE_ADDRESS, admin);

  // ── Create packs ───────────────────────────────────────────────────────────
  console.log("[1] Creating policy packs...");
  for (const pack of PACKS) {
    const exists = await (engine as any).packExists(pack.id);
    if (!exists) {
      const tx = await (engine as any).createPack(pack.id, pack.name);
      await tx.wait();
      console.log(`  ✓ Created pack ${pack.id}: ${pack.name}`);
    } else {
      console.log(`  → Pack ${pack.id} already exists`);
    }
  }

  // ── Set thresholds ─────────────────────────────────────────────────────────
  console.log("\n[2] Setting encrypted thresholds...");
  const adminClient = await createCofheClient(hre, admin);

  for (const pack of PACKS) {
    const [, , limitsSet] = await (engine as any).getPackInfo(pack.id);
    if (!limitsSet) {
      const [encHard, encAuto, encBudget] = await adminClient
        .encryptInputs([
          Encryptable.uint32(pack.hardLimit),
          Encryptable.uint32(pack.autoThreshold),
          Encryptable.uint32(pack.budgetLimit),
        ])
        .execute();

      const tx = await (engine as any).setPolicyThresholds(pack.id, encHard, encAuto, encBudget);
      await tx.wait();
      console.log(`  ✓ Pack ${pack.id}: hard=${pack.hardLimit} auto=${pack.autoThreshold} budget=${pack.budgetLimit}`);
    } else {
      console.log(`  → Pack ${pack.id} thresholds already set`);
    }
  }

  // ── Register employees ─────────────────────────────────────────────────────
  console.log("\n[3] Registering employees...");
  for (const [label, emp] of [["A", employeeA], ["B", employeeB]] as const) {
    const already = await (engine as any).employeeRegistered((emp as Wallet).address);
    if (!already) {
      const tx = await (engine as any).registerEmployee((emp as Wallet).address);
      await tx.wait();
      console.log(`  ✓ Employee ${label}: ${(emp as Wallet).address}`);
    } else {
      console.log(`  → Employee ${label} already registered`);
    }
  }

  // ── Submit demo requests ───────────────────────────────────────────────────
  console.log("\n[4] Submitting demo requests...");

  const clientA = await createCofheClient(hre, employeeA);
  const clientB = await createCofheClient(hre, employeeB);

  const demoRequests = [
    // Travel: auto<50k, review 50k-200k, deny>200k
    { signer: employeeA, client: clientA, packId: 1, amount: 35_000n, memo: "SFO→NYC flights — Q3 offsite", tier: "AUTO_APPROVED" },
    { signer: employeeB, client: clientB, packId: 1, amount: 120_000n, memo: "International conference + hotel", tier: "NEEDS_REVIEW" },
    // SaaS: auto<30k, review 30k-150k, deny>150k
    { signer: employeeA, client: clientA, packId: 2, amount: 18_000n, memo: "Figma Pro annual renewal", tier: "AUTO_APPROVED" },
    { signer: employeeB, client: clientB, packId: 2, amount: 220_000n, memo: "Enterprise tooling stack license", tier: "AUTO_DENIED" },
    // Vendor: auto<100k, review 100k-300k, deny>300k
    { signer: employeeB, client: clientB, packId: 3, amount: 85_000n, memo: "Design agency retainer — July", tier: "AUTO_APPROVED" },
    // Marketing: auto<25k, review 25k-100k, deny>100k
    { signer: employeeA, client: clientA, packId: 4, amount: 22_000n, memo: "Sponsored LinkedIn campaign", tier: "AUTO_APPROVED" },
  ];

  const requestCount = Number(await (engine as any).getRequestCount());
  if (requestCount >= demoRequests.length) {
    console.log(`  → ${requestCount} requests already exist, skipping`);
  } else {
    for (const req of demoRequests) {
      const [encAmt] = await (req.client as any)
        .encryptInputs([Encryptable.uint32(req.amount)])
        .execute();
      const tx = await (engine.connect(req.signer) as any).submitRequest(req.packId, encAmt, req.memo);
      await tx.wait();
      const dollars = (Number(req.amount) / 100).toFixed(2);
      console.log(`  ✓ Pack ${req.packId} | $${dollars} | ${req.tier} | "${req.memo}"`);
    }
  }

  const total = Number(await (engine as any).getRequestCount());
  console.log(`\n✅ Seed complete. ${total} requests on-chain.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
