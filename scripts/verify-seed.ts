import hre from "hardhat";
import { getDeployment } from "../tasks/utils";

async function main() {
  const address = getDeployment(hre.network.name, "ShieldCardPolicy");
  if (!address) throw new Error("No deployment found for network: " + hre.network.name);

  const contract = await hre.ethers.getContractAt("ShieldCardPolicy", address);
  const count = await contract.getRequestCount();
  console.log(`[verify] contract: ${address}`);
  console.log(`[verify] total requests: ${count}`);
  console.log();

  for (let i = 0; i < Number(count); i++) {
    const req = await contract.getRequest(i);
    console.log(`Request #${i}:`);
    console.log(`  employee:        ${req.employee}`);
    console.log(`  memo:            "${req.memo}"`);
    console.log(`  timestamp:       ${new Date(Number(req.timestamp) * 1000).toISOString()}`);
    console.log(`  resultPublished: ${req.resultPublished}`);
    console.log(`  publicStatus:    ${req.publicStatus} (0=pending, 1=approved, 2=denied)`);
    console.log(`  encStatus:       ${req.encStatus}`);
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
