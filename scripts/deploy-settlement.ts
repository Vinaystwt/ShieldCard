/**
 * deploy-settlement.ts
 * Deploys MockUSDC + ShieldCardSettlement to the active network, wires the
 * ShieldCardControlPlane address from deployments.
 */

import hre from "hardhat";
import { getDeployment, saveDeployment } from "../tasks/utils";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  const coreAddress = getDeployment(network, "ShieldCardControlPlane");
  if (!coreAddress) {
    throw new Error(`No ShieldCardControlPlane deployment found for ${network} — run arb-sepolia:deploy first`);
  }

  console.log(`[deploy-settle] network: ${network}`);
  console.log(`[deploy-settle] deployer: ${deployer.address}`);
  console.log(`[deploy-settle] core: ${coreAddress}`);

  // 1. MockUSDC
  let mockUSDCAddress = getDeployment(network, "MockUSDC");
  if (mockUSDCAddress) {
    console.log(`[deploy-settle] MockUSDC already deployed at ${mockUSDCAddress} — skipping`);
  } else {
    console.log("[deploy-settle] Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.connect(deployer).deploy();
    await token.waitForDeployment();
    mockUSDCAddress = await token.getAddress();
    saveDeployment(network, "MockUSDC", mockUSDCAddress);
    console.log(`[deploy-settle] MockUSDC -> ${mockUSDCAddress}`);
  }

  // 2. ShieldCardSettlement
  let settlementAddress = getDeployment(network, "ShieldCardSettlement");
  if (settlementAddress) {
    console.log(`[deploy-settle] ShieldCardSettlement already deployed at ${settlementAddress} — skipping`);
  } else {
    console.log("[deploy-settle] Deploying ShieldCardSettlement...");
    const Settle = await hre.ethers.getContractFactory("ShieldCardSettlement");
    const settle = await Settle.connect(deployer).deploy(coreAddress, mockUSDCAddress);
    await settle.waitForDeployment();
    settlementAddress = await settle.getAddress();
    saveDeployment(network, "ShieldCardSettlement", settlementAddress);
    console.log(`[deploy-settle] ShieldCardSettlement -> ${settlementAddress}`);
  }

  console.log("\n[deploy-settle] Final wiring:");
  console.log(`  core:       ${coreAddress}`);
  console.log(`  MockUSDC:   ${mockUSDCAddress}`);
  console.log(`  Settlement: ${settlementAddress}`);
  console.log("\nNext: pnpm arb-sepolia:seed-settle to fund + create + approve + settle demo.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
