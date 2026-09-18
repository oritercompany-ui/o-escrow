import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  console.log("Deploying O-Escrow...");

  const escrow = await ethers.deployContract("OEscrow");

  await escrow.waitForDeployment();

  console.log("O-Escrow deployed to:");
  console.log(await escrow.getAddress());
}

await main();