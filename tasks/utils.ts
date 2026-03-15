import fs from 'fs'
import path from 'path'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Signer } from 'ethers'
import { createCofheConfig, createCofheClient as createCofheClientBase } from '@cofhe/sdk/node'
import { getChainById } from '@cofhe/sdk/chains'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Directory to store deployed contract addresses
const DEPLOYMENTS_DIR = path.join(__dirname, '../deployments')

// Ensure the deployments directory exists
if (!fs.existsSync(DEPLOYMENTS_DIR)) {
	fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true })
}

// Helper to get deployment file path for a network
const getDeploymentPath = (network: string) => path.join(DEPLOYMENTS_DIR, `${network}.json`)

// Helper to save deployment info
export const saveDeployment = (network: string, contractName: string, address: string) => {
	const deploymentPath = getDeploymentPath(network)

	let deployments: Record<string, string> = {}
	if (fs.existsSync(deploymentPath)) {
		deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8')) as Record<string, string>
	}

	deployments[contractName] = address

	fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2))
	console.log(`Deployment saved to ${deploymentPath}`)
}

// Helper to get deployment info
export const getDeployment = (network: string, contractName: string): string | null => {
	const deploymentPath = getDeploymentPath(network)

	if (!fs.existsSync(deploymentPath)) {
		return null
	}

	const deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8')) as Record<string, string>
	return deployments[contractName] || null
}

// Helper to create a cofhe SDK client that works on both local hardhat and real networks
export const createCofheClient = async (hre: HardhatRuntimeEnvironment, signer: Signer) => {
	if (!signer.provider) {
		throw new Error('Signer must be connected to a provider')
	}

	const signerAddress = await signer.getAddress()
	const chainId = Number((await signer.provider.getNetwork()).chainId)
	const chain = getChainById(chainId)

	if (!chain) {
		throw new Error(`No CoFHE chain configuration found for chainId ${chainId}. Supported chains can be found in @cofhe/sdk/chains.`)
	}

	// On hardhat network, use the batteries-included client (handles mock ZK verifier)
	if (chain.environment === 'MOCK') {
		return hre.cofhe.createClientWithBatteries(signer)
	}

	// On real networks, use the SDK directly.
	// Use viem privateKeyToAccount instead of hardhatSignerAdapter so that
	// eth_signTypedData_v4 (needed for permits) is handled locally rather than
	// forwarded to the Hardhat HTTP provider which does not support it.
	const config = createCofheConfig({
		environment: 'node',
		supportedChains: [chain],
	})

	const client = createCofheClientBase(config)

	const privateKey = await (signer as any).provider?.send?.('eth_accounts', [])
		.catch(() => null)

	// Extract raw private key from ethers Wallet if available
	const rawPrivateKey: `0x${string}` | undefined =
		(signer as any).privateKey ?? undefined

	let publicClient: ReturnType<typeof createPublicClient>
	let walletClient: ReturnType<typeof createWalletClient>

	const rpcUrl = (hre.network.config as any).url as string

	if (rawPrivateKey) {
		const account = privateKeyToAccount(rawPrivateKey)
		publicClient = createPublicClient({ transport: http(rpcUrl) })
		walletClient = createWalletClient({ account, transport: http(rpcUrl) })
	} else {
		// Fallback to hardhat adapter (may fail for permit signing on HTTP providers)
		const adapted = await hre.cofhe.hardhatSignerAdapter(signer)
		publicClient = adapted.publicClient
		walletClient = adapted.walletClient
	}

	await client.connect(publicClient, walletClient)

	await client.permits.createSelf({
		issuer: signerAddress,
	})

	return client
}
