/**
 * seed-settlement.ts
 * Live demo seeding for the Wave 5 settlement loop.
 *   1. Mints MockUSDC to the settlement contract (funding).
 *   2. Adds the admin as an approver (single-approver demo flow).
 *   3. Creates settlements for the published AUTO_APPROVED requests on core.
 *   4. Approves and settles each settlement, executing real MockUSDC transfers
 *      to the requesting employee address.
 *
 * Idempotent: skips already-settled rows.
 */

import hre from "hardhat";
import { getDeployment } from "../tasks/utils";

const STATE_NAMES: Record<number, string> = {
  0: "NONE",
  1: "PENDING",
  2: "APPROVED",
  3: "SETTLED",
  4: "CANCELLED",
};

// Demo settlement amounts (in mUSDC base units, 6 decimals).
// Picked to be small + visually distinct.
const SETTLE_AMOUNTS_USDC = [
  25n, 60n, 12n, 0n, 18n, 40n, 9n, 5n, 11n, 0n, 14n, 50n, 7n,
];

async function main() {
  const [admin] = await hre.ethers.getSigners();
  const network = hre.network.name;

  const coreAddress = getDeployment(network, "ShieldCardControlPlane");
  const tokenAddress = getDeployment(network, "MockUSDC");
  const settleAddress = getDeployment(network, "ShieldCardSettlement");
  if (!coreAddress || !tokenAddress || !settleAddress) {
    throw new Error("Missing deployment for core/MockUSDC/ShieldCardSettlement");
  }

  console.log(`[seed-settle] admin:      ${admin.address}`);
  console.log(`[seed-settle] core:       ${coreAddress}`);
  console.log(`[seed-settle] MockUSDC:   ${tokenAddress}`);
  console.log(`[seed-settle] Settlement: ${settleAddress}`);

  const core = await hre.ethers.getContractAt("ShieldCardControlPlane", coreAddress);
  const token = await hre.ethers.getContractAt("MockUSDC", tokenAddress);
  const settle = await hre.ethers.getContractAt("ShieldCardSettlement", settleAddress);

  // 1. Fund settlement contract (idempotent: only mint if balance < 5000 USDC)
  const FUND_TARGET = 10_000n * 10n ** 6n;
  const bal = await token.balanceOf(settleAddress);
  if (bal < FUND_TARGET / 2n) {
    console.log(`\n[seed-settle] funding ${Number(FUND_TARGET) / 1e6} mUSDC to settlement contract...`);
    const tx = await token.mint(settleAddress, FUND_TARGET);
    await tx.wait();
    const newBal = await token.balanceOf(settleAddress);
    console.log(`[seed-settle] funded. balance = ${Number(newBal) / 1e6} mUSDC`);
  } else {
    console.log(`\n[seed-settle] balance already ${Number(bal) / 1e6} mUSDC — skipping fund`);
  }

  // 2. Add admin as approver + set quorums (1-of-1 normal, 1-of-1 highRisk)
  const isApprover = await settle.isApprover(admin.address);
  if (!isApprover) {
    console.log("\n[seed-settle] registering admin as approver...");
    const tx = await settle.addApprover(admin.address);
    await tx.wait();
    console.log("[seed-settle] admin added as approver");
  } else {
    console.log("\n[seed-settle] admin already approver — skipping");
  }
  const nq = Number(await settle.normalQuorum());
  const hq = Number(await settle.highRiskQuorum());
  if (nq !== 1 || hq !== 1) {
    console.log("[seed-settle] setting quorums to (1, 1)...");
    const tx = await settle.setQuorums(1, 1);
    await tx.wait();
  }

  // 3. Create + approve + settle for each AUTO_APPROVED request
  const count = Number(await core.getRequestCount());
  console.log(`\n[seed-settle] iterating ${count} core requests...`);

  let created = 0;
  let approved = 0;
  let settled = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const req = await (core as any).getRequest(i);
    const isApprovedReq = req.resultPublished && (Number(req.publicStatus) === 1 || Number(req.publicStatus) === 4);
    if (!isApprovedReq) {
      skipped++;
      continue;
    }

    const amtUSDC = SETTLE_AMOUNTS_USDC[i] ?? 10n;
    if (amtUSDC === 0n) {
      console.log(`  #${i}: amount=0 → skip (intentionally unsettled for demo)`);
      skipped++;
      continue;
    }
    const amount = amtUSDC * 10n ** 6n;

    // Create
    const exists = await settle.settlementExists(i);
    if (!exists) {
      const tx = await settle.createSettlement(i, req.employee, amount);
      await tx.wait();
      console.log(`  #${i}: createSettlement(recipient=${req.employee.slice(0, 10)}..., amount=${amtUSDC} mUSDC)`);
      created++;
    }

    const stateNow = Number(await settle.getSettlementState(i));
    if (stateNow === 1 /* PENDING */) {
      // Approve
      const already = await settle.hasApproved(i, admin.address);
      if (!already) {
        const tx = await settle.approve(i);
        await tx.wait();
        console.log(`  #${i}: approve()`);
        approved++;
      }
    }

    const stateAfter = Number(await settle.getSettlementState(i));
    if (stateAfter === 2 /* APPROVED */) {
      const tx = await settle.settle(i);
      const rcpt = await tx.wait();
      console.log(`  #${i}: settle() tx=${rcpt?.hash?.slice(0, 22)}...`);
      settled++;
    }
  }

  console.log(`\n[seed-settle] created=${created} approved=${approved} settled=${settled} skipped=${skipped}`);
  const head = await settle.chainHead();
  console.log(`[seed-settle] final chainHead = ${head}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
