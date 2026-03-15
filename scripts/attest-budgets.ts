/**
 * attest-budgets.ts
 * Calls attestDeptWithinBudget + attestPackWithinBudget on ShieldCardControlPlane
 * for all configured depts and packs. Stores FHE.lte(used, cap) ebool handles
 * on-chain, granting access to admin + auditor (if set).
 *
 * Run AFTER seed-control-plane.ts and grant-auditor.ts so the auditor address
 * is already set (attest grants are scoped at call time).
 */

import hre from "hardhat";
import { getDeployment } from "../tasks/utils";

const DEPT_IDS = [1, 2, 3];
const PACK_IDS = [1, 2, 3, 4];

async function main() {
  const [admin] = await hre.ethers.getSigners();
  const network = hre.network.name;

  const coreAddress = getDeployment(network, "ShieldCardControlPlane");
  if (!coreAddress) throw new Error("No ShieldCardControlPlane deployment");

  console.log(`[attest-budgets] admin:   ${admin.address}`);
  console.log(`[attest-budgets] core:    ${coreAddress}`);
  console.log(`[attest-budgets] network: ${network}`);

  const core = await hre.ethers.getContractAt("ShieldCardControlPlane", coreAddress, admin);

  const auditor = await (core as any).auditor();
  console.log(`[attest-budgets] auditor: ${auditor === "0x0000000000000000000000000000000000000000" ? "(not set)" : auditor}`);

  // Attest departments
  console.log("\n[attest-budgets] Attesting department budgets...");
  for (const deptId of DEPT_IDS) {
    try {
      const exists = await (core as any).deptExists(deptId);
      if (!exists) {
        console.log(`  → Dept ${deptId}: does not exist, skipping`);
        continue;
      }
      const [, , budgetSet] = await (core as any).getDeptInfo(deptId);
      if (!budgetSet) {
        console.log(`  → Dept ${deptId}: budget not set, skipping`);
        continue;
      }
      const tx = await (core as any).attestDeptWithinBudget(deptId);
      const rcpt = await tx.wait();
      console.log(`  ✓ Dept ${deptId}: attested (tx=${rcpt?.hash?.slice(0, 22)}...)`);
    } catch (e: any) {
      console.error(`  ✗ Dept ${deptId}: ${e.message}`);
    }
  }

  // Attest packs
  console.log("\n[attest-budgets] Attesting pack budgets...");
  for (const packId of PACK_IDS) {
    try {
      const exists = await (core as any).packExists(packId);
      if (!exists) {
        console.log(`  → Pack ${packId}: does not exist, skipping`);
        continue;
      }
      const [, , limitsSet] = await (core as any).getPackInfo(packId);
      if (!limitsSet) {
        console.log(`  → Pack ${packId}: limits not set, skipping`);
        continue;
      }
      const tx = await (core as any).attestPackWithinBudget(packId);
      const rcpt = await tx.wait();
      console.log(`  ✓ Pack ${packId}: attested (tx=${rcpt?.hash?.slice(0, 22)}...)`);
    } catch (e: any) {
      console.error(`  ✗ Pack ${packId}: ${e.message}`);
    }
  }

  console.log("\n[attest-budgets] done. FHE.lte(used, cap) ebool handles stored on-chain.");
  console.log("[attest-budgets] Admin and auditor can now decryptForView on the within-budget ebools.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
