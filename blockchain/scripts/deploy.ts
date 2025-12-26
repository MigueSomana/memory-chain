import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

console.log(`Deploying ThesisCertification to ${networkName}...`);

const contract = await ethers.deployContract("ThesisCertification");

await contract.waitForDeployment();

console.log("ThesisCertification deployed to:", await contract.getAddress());
