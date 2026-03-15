import hre from "hardhat";
import { getDeployment } from "../tasks/utils";

const STATUS_NAMES: Record<number, string> = {
  0: "SUBMITTED",
  1: "AUTO_APPROVED",
  2: "NEEDS_REVIEW",
  3: "AUTO_DENIED",
  4: "ADMIN_APPROVED",
  5: "ADMIN_DENIED",
};

const VENDOR_STATUS_NAMES: Record<number, string> = {
  0: "UNCHECKED",
  1: "COMPLIANT",
  2: "SUSPENDED",
  3: "BANNED",
};

async function main() {
  const address = getDeployment(hre.network.name, "ShieldCardControlPlane");
  if (!address) {
    throw new Error("No ShieldCardControlPlane deployment found for network: " + hre.network.name);
  }

  const plane = await hre.ethers.getContractAt("ShieldCardControlPlane", address);

  const admin            = await (plane as any).admin();
  const submissionsPaused = await (plane as any).submissionsPaused();
  const count            = Number(await (plane as any).getRequestCount());
  const packCount        = Number(await (plane as any).packCount());
  const vendorCount      = Number(await (plane as any).vendorCount());
  const empCount         = Number(await (plane as any).getRegisteredEmployeeCount());
  const packIds          = await (plane as any).getPackIds();
  const deptIds          = await (plane as any).getDeptIds();

  console.log(`[verify] contract:           ${address}`);
  console.log(`[verify] admin:              ${admin}`);
  console.log(`[verify] submissionsPaused:  ${submissionsPaused}`);
  console.log(`[verify] total requests:     ${count}`);
  console.log(`[verify] pack count:         ${packCount}`);
  console.log(`[verify] dept count:         ${deptIds.length}`);
  console.log(`[verify] vendor count:       ${vendorCount}`);
  console.log(`[verify] employees:          ${empCount}`);
  console.log();

  // Policy packs
  console.log("=== Policy Packs ===");
  for (let i = 0; i < packIds.length; i++) {
    const p = Number(packIds[i]);
    try {
      const [name, active, limitsSet, epochStart] = await (plane as any).getPackInfo(p);
      const [total, approved, denied, pending, inReview] = await (plane as any).getPackSummary(p);
      const interval = Number(await (plane as any).packRecurringInterval(p));
      console.log(
        `Pack #${p} "${name}": active=${active} limitsSet=${limitsSet} interval=${interval}s | total=${total} approved=${approved} denied=${denied} pending=${pending} inReview=${inReview}`,
      );
    } catch (err) {
      console.log(`Pack #${p}: read failed — ${(err as Error).message}`);
    }
  }
  console.log();

  // Departments
  console.log("=== Departments ===");
  for (let i = 0; i < deptIds.length; i++) {
    const d = Number(deptIds[i]);
    try {
      const [name, active, budgetSet, epochStart] = await (plane as any).getDeptInfo(d);
      console.log(`Dept #${d} "${name}": active=${active} budgetSet=${budgetSet}`);
    } catch (err) {
      console.log(`Dept #${d}: read failed — ${(err as Error).message}`);
    }
  }
  console.log();

  // Vendors
  console.log("=== Vendors ===");
  for (let v = 1; v <= vendorCount + 5; v++) {
    try {
      const exists = await (plane as any).vendorExists(v);
      if (!exists) continue;
      const [name, status] = await (plane as any).getVendorInfo(v);
      console.log(`Vendor #${v} "${name}" — ${VENDOR_STATUS_NAMES[Number(status)] ?? "UNKNOWN"}`);
    } catch { /* skip */ }
  }
  console.log();

  // Requests
  console.log("=== Requests ===");
  let publishedCount = 0;
  let inReviewCount = 0;
  let unpublishedCount = 0;
  let evidencedCount = 0;
  for (let i = 0; i < count; i++) {
    const req = await (plane as any).getRequest(i);
    const statusLabel = STATUS_NAMES[Number(req.publicStatus)] ?? "UNKNOWN";
    const evSubmitted = await (plane as any).evidenceSubmitted(i);
    if (req.resultPublished) publishedCount++;
    if (req.inReview) inReviewCount++;
    if (!req.resultPublished && !req.inReview) unpublishedCount++;
    if (evSubmitted) evidencedCount++;
    console.log(
      `#${i}: [pack:${req.packId} dept:${req.deptId} vendor:${req.vendorId}] "${req.memo}"`,
    );
    console.log(
      `     employee=${req.employee.slice(0, 10)}... published=${req.resultPublished} inReview=${req.inReview} status=${req.publicStatus}(${statusLabel}) evidence=${evSubmitted} risk=0x${Number(req.riskBitmap).toString(16).padStart(4, "0")}`,
    );
  }

  console.log();
  console.log(
    `[verify] summary: published=${publishedCount} inReview=${inReviewCount} unpublished=${unpublishedCount} evidenced=${evidencedCount}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
