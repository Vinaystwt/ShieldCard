import hre from "hardhat";

import { saveDeployment } from "../tasks/utils";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log(`Deploying ShieldCardPolicyEngine with ${deployer.address} on ${hre.network.name}...`);
  console.log(`Deployer balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

  const Factory = await hre.ethers.getContractFactory("ShieldCardPolicyEngine");
  const engine = await Factory.connect(deployer).deploy();
  await engine.waitForDeployment();

  const address = await engine.getAddress();
  console.log(`ShieldCardPolicyEngine deployed to: ${address}`);

  saveDeployment(hre.network.name, "ShieldCardPolicyEngine", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
