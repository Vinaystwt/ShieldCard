/**
 * grant-auditor.ts
 * Sets the auditor address on ShieldCardControlPlane and grants scoped
 * decryption on a chosen subset of requests for the live demo.
 *
 * Uses EMPLOYEE_B's address as the demo auditor (they wouldn't normally have
 * decrypt access to other employees' requests).
 */

import { Wallet } from "ethers";
import hre from "hardhat";
import { getDeployment } from "../tasks/utils";

// Requests to expose to the auditor (mix of approved + denied + needs-review)
const REQUESTS_TO_GRANT = [0, 3, 5, 9, 11];

async function main() {
  const [admin] = await hre.ethers.getSigners();
  const network = hre.network.name;

  const coreAddress = getDeployment(network, "ShieldCardControlPlane");
  if (!coreAddress) throw new Error("No ShieldCardControlPlane deployment");

  const empBKey = process.env.EMPLOYEE_B_PRIVATE_KEY;
  if (!empBKey) throw new Error("EMPLOYEE_B_PRIVATE_KEY required");
  const auditor = new Wallet(empBKey, hre.ethers.provider);

  console.log(`[grant-auditor] admin:    ${admin.address}`);
  console.log(`[grant-auditor] core:     ${coreAddress}`);
  console.log(`[grant-auditor] auditor:  ${auditor.address}`);

  const core = await hre.ethers.getContractAt("ShieldCardControlPlane", coreAddress, admin);

  // 1. setAuditor
  const currentAuditor = await (core as any).auditor();
  if (currentAuditor.toLowerCase() !== auditor.address.toLowerCase()) {
    console.log(`[grant-auditor] setAuditor(${auditor.address.slice(0, 10)}...)`);
    const tx = await (core as any).setAuditor(auditor.address);
    await tx.wait();
  } else {
    console.log(`[grant-auditor] auditor already set`);
  }

  // 2. grantAuditorAccess for each requestId
  const count = Number(await (core as any).getRequestCount());
  const filtered = REQUESTS_TO_GRANT.filter((id) => id < count);
  console.log(`[grant-auditor] granting access on ${filtered.length} requests: [${filtered.join(", ")}]`);
  const tx = await (core as any).grantAuditorAccess(filtered);
  const rcpt = await tx.wait();
  console.log(`[grant-auditor] grant tx=${rcpt?.hash}`);

  console.log("\n[grant-auditor] done. Auditor can now decryptForView on encAmount + encStatus for the listed request IDs.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
