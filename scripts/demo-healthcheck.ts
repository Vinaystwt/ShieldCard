/**
 * demo-healthcheck.ts
 * Pre-demo sanity sweep. Read-only. Exit code 0 = green, 1 = any red.
 */

import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";
import { getDeployment } from "../tasks/utils";

const RED   = "\x1b[31m✗\x1b[0m";
const GREEN = "\x1b[32m✓\x1b[0m";

async function check(label: string, fn: () => Promise<boolean | string>) {
  try {
    const result = await fn();
    const ok = typeof result === "boolean" ? result : Boolean(result);
    const extra = typeof result === "string" ? `  (${result})` : "";
    console.log(`  ${ok ? GREEN : RED}  ${label}${extra}`);
    return ok;
  } catch (err: any) {
    console.log(`  ${RED}  ${label}  (error: ${err?.message?.slice(0, 100) ?? err})`);
    return false;
  }
}

async function main() {
  const network = hre.network.name;
  let passed = 0;
  let failed = 0;

  const score = async (label: string, fn: () => Promise<boolean | string>) => {
    if (await check(label, fn)) passed++;
    else failed++;
  };

  console.log(`\n[healthcheck] network = ${network}\n`);

  const coreAddr   = getDeployment(network, "ShieldCardControlPlane");
  const settleAddr = getDeployment(network, "ShieldCardSettlement");
  const tokenAddr  = getDeployment(network, "MockUSDC");

  console.log("─── Deployments file ───────────────────────────────────────────");
  await score("ShieldCardControlPlane address present", async () => coreAddr ?? false);
  await score("ShieldCardSettlement address present",   async () => settleAddr ?? false);
  await score("MockUSDC address present",               async () => tokenAddr ?? false);

  if (!coreAddr || !settleAddr || !tokenAddr) {
    console.log(`\n[healthcheck] missing deployments — abort.\n`);
    process.exit(1);
  }

  console.log("\n─── On-chain checks ────────────────────────────────────────────");

  const provider = hre.ethers.provider;
  await score("RPC chainId == 421614", async () => {
    const n = await provider.getNetwork();
    return Number(n.chainId) === 421614 ? "421614" : `got ${n.chainId}`;
  });

  await score("ShieldCardControlPlane has bytecode", async () => {
    const code = await provider.getCode(coreAddr);
    return code !== "0x" ? `${code.length / 2} bytes` : false;
  });

  await score("ShieldCardSettlement has bytecode", async () => {
    const code = await provider.getCode(settleAddr);
    return code !== "0x" ? `${code.length / 2} bytes` : false;
  });

  await score("MockUSDC has bytecode", async () => {
    const code = await provider.getCode(tokenAddr);
    return code !== "0x" ? `${code.length / 2} bytes` : false;
  });

  const core = await hre.ethers.getContractAt("ShieldCardControlPlane", coreAddr);
  let requestCount = 0;
  await score("Core getRequestCount() > 0", async () => {
    requestCount = Number(await (core as any).getRequestCount());
    return requestCount > 0 ? `count=${requestCount}` : false;
  });

  await score("At least one request published", async () => {
    let publishedCount = 0;
    for (let i = 0; i < Math.min(requestCount, 20); i++) {
      const req = await (core as any).getRequest(i);
      if (req.resultPublished) publishedCount++;
    }
    return publishedCount > 0 ? `published=${publishedCount}` : false;
  });

  console.log("\n─── Frontend env ───────────────────────────────────────────────");
  const envPath = path.join(__dirname, "..", "frontend", ".env.local");
  await score("frontend/.env.local exists", async () => fs.existsSync(envPath) ? envPath : false);

  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, "utf-8");
    const required = [
      "NEXT_PUBLIC_SHIELDCARD_ADDRESS",
      "NEXT_PUBLIC_SETTLEMENT_ADDRESS",
      "NEXT_PUBLIC_MOCKUSDC_ADDRESS",
      "NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL",
    ];
    for (const key of required) {
      await score(`${key} non-empty`, async () => {
        const m = env.match(new RegExp(`^${key}=(.+)$`, "m"));
        return m && m[1].trim().length > 0 ? m[1].slice(0, 12) + "…" : false;
      });
    }
    await score("frontend env shieldcard addr matches deployment", async () => {
      const m = env.match(/^NEXT_PUBLIC_SHIELDCARD_ADDRESS=(.+)$/m);
      return m && m[1].trim().toLowerCase() === coreAddr.toLowerCase();
    });
  }

  console.log(`\n[healthcheck] ${passed} passed, ${failed} failed.\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("[healthcheck] fatal:", err);
  process.exitCode = 1;
});
