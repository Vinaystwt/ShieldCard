import hre from "hardhat";
import { getDeployment } from "../tasks/utils";

const STATUS_NAMES: Record<number, string> = { 0: "PENDING", 1: "APPROVED", 2: "DENIED" };

async function main() {
  const address = getDeployment(hre.network.name, "ShieldCardPolicy");
  if (!address) throw new Error("No deployment found for network: " + hre.network.name);

  const contract = await hre.ethers.getContractAt("ShieldCardPolicy", address);
  const count = await contract.getRequestCount();
  const packCount = await contract.packCount();

  console.log(`[verify] contract:       ${address}`);
  console.log(`[verify] total requests: ${count}`);
  console.log(`[verify] pack count:     ${packCount}`);
  console.log();

  // Policy packs
  console.log("=== Policy Packs ===");
  for (let p = 1; p <= Number(packCount) + 4; p++) {
    try {
      const exists = await contract.packExists(p);
      if (!exists) continue;
      const [name, active, limitSet] = await contract.getPackInfo(p);
      const [total, approved, denied, pending] = await contract.getPackSummary(p);
      console.log(`Pack #${p} "${name}": active=${active} limitSet=${limitSet} | total=${total} approved=${approved} denied=${denied} pending=${pending}`);
    } catch { /* skip */ }
  }
  console.log();

  // Requests
  console.log("=== Requests ===");
  for (let i = 0; i < Number(count); i++) {
    const req = await contract.getRequest(i);
    const statusLabel = STATUS_NAMES[Number(req.publicStatus)] ?? "UNKNOWN";
    console.log(`#${i}: [pack:${req.packId}] "${req.memo}"`);
    console.log(`     employee=${req.employee.slice(0, 10)}...  published=${req.resultPublished}  status=${req.publicStatus}(${statusLabel})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
