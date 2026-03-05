import { FoundryDeployer } from "@adraffy/blocksmith";
import { createInterface } from "node:readline/promises";

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
});

const deployer = await FoundryDeployer.load({
	provider: "mainnet",
	privateKey: await rl.question("Private Key (empty to simulate): "),
});

const deployable = await deployer.prepare({
	file: "URTestResolver",
	args: [
		"0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe", // URProxy
	],
});

if (deployer.privateKey) {
	await rl.question("Ready? (abort to stop) ");
	await deployable.deploy();
	const apiKey = await rl.question("Etherscan API Key: ");
	if (apiKey) {
		await deployable.verifyEtherscan({ apiKey });
	}
}

rl.close();
