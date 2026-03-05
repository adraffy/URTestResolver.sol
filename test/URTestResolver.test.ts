import { afterAll, describe, expect, test } from "bun:test";
import { Foundry, type FoundryContract } from "@adraffy/blocksmith";
import { dnsEncode, Interface, ZeroHash } from "ethers";

const ABI = new Interface([
	`function addr(bytes32) view returns (address)`,
	`function text(bytes32, string) view returns (string)`,
]);

describe("URTestResolver", async () => {
	const F = await Foundry.launch({ infoLog: true });
	afterAll(F.shutdown);
	const name = "ur.gtest.eth";
	const ENSRegistry = await F.deploy({
		import: "@ens/registry/ENSRegistry.sol",
	});
	const BatchGatewayProvider = await F.deploy({
		import: "@ens/ccipRead/GatewayProvider.sol",
		args: [F.wallets.admin, []],
	});
	const ReverseClaimer = await F.deploy(`contract FakeClaimer {
        function claim(address) external pure returns (bytes32) {}
    }`);
	await F.overrideENS({
		name: "addr.reverse",
		registry: ENSRegistry,
		owner: ReverseClaimer,
		resolver: null,
	});
	const RightUR = await F.deploy({
		import: "@ens/universalResolver/UniversalResolver.sol",
		args: [F.wallets.admin, ENSRegistry, BatchGatewayProvider],
	});
	const WrongUR = await F.deploy({
		import: "@ens/universalResolver/UniversalResolver.sol",
		args: [F.wallets.admin, ENSRegistry, BatchGatewayProvider],
	});
	const URProxy = await F.deploy(`contract FakeProxy {
        address public implementation = ${RightUR.target};
    }`);
	const URTestResolver = await F.deploy({
		file: "URTestResolver",
		args: [URProxy],
	});
	await F.overrideENS({
		name,
		registry: ENSRegistry,
		owner: null,
		resolver: URTestResolver,
	});

	async function resolveAddr(ur: FoundryContract) {
		const [answer] = await ur.resolve(
			dnsEncode(name, 255),
			ABI.encodeFunctionData("addr", [ZeroHash]),
		);
		const [value] = ABI.decodeFunctionResult("addr", answer);
		return value as string;
	}

	async function resolveDesc(ur: FoundryContract) {
		const [answer] = await ur.resolve(
			dnsEncode(name, 255),
			ABI.encodeFunctionData("text", [ZeroHash, "description"]),
		);
		const [value] = ABI.decodeFunctionResult("text", answer);
		return value as string;
	}

	test("wrong", async () => {
		expect(resolveAddr(WrongUR)).resolves.toMatch(/^0x1{40}$/);
		expect(resolveDesc(WrongUR)).resolves.toStartWith("❌️");
	});

	test("right", async () => {
		expect(resolveAddr(RightUR)).resolves.toMatch(/^0x2{40}$/);
		expect(resolveDesc(RightUR)).resolves.toStartWith("✅️");
	});
});
