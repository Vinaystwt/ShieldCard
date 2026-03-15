import hre from "hardhat";

import { saveDeployment } from "../tasks/utils";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log(`Deploying ShieldCardControlPlane with ${deployer.address} on ${hre.network.name}...`);
  console.log(`Deployer balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

  const Factory = await hre.ethers.getContractFactory("ShieldCardControlPlane");
  const plane = await Factory.connect(deployer).deploy();
  await plane.waitForDeployment();

  const address = await plane.getAddress();
  console.log(`ShieldCardControlPlane deployed to: ${address}`);

  saveDeployment(hre.network.name, "ShieldCardControlPlane", address);
  console.log(`Deployment saved to deployments/${hre.network.name}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
