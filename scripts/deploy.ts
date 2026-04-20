import hre from "hardhat";

import { saveDeployment } from "../tasks/utils";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log(`Deploying ShieldCardPolicy with ${deployer.address} on ${hre.network.name}...`);

  const ShieldCardPolicy = await hre.ethers.getContractFactory("ShieldCardPolicy");
  const shieldCard = await ShieldCardPolicy.connect(deployer).deploy();
  await shieldCard.waitForDeployment();

  const address = await shieldCard.getAddress();
  console.log(`ShieldCardPolicy deployed to: ${address}`);

  saveDeployment(hre.network.name, "ShieldCardPolicy", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
