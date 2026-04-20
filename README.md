# ShieldCard

ShieldCard is a confidential corporate spend-policy engine built for the Fhenix Buildathon. It uses Fhenix CoFHE to keep employee limits, request amounts, and policy evaluation private while still enforcing spend rules on-chain.

## Stack

- Solidity + Hardhat + `@cofhe/hardhat-plugin`
- Arbitrum Sepolia deployment
- Next.js 14 frontend in [`frontend/`](./frontend)
- `wagmi` + RainbowKit + `@cofhe/sdk`

## Live Contract

- Network: Arbitrum Sepolia
- Contract: `0x536b31435bFAE994169181AcA9BAadC784555b4B`
- Explorer: https://sepolia.arbiscan.io/address/0x536b31435bFAE994169181AcA9BAadC784555b4B

## Product Views

- `/` landing page
- `/app` wallet gateway
- `/admin` admin controls for employee registration, encrypted limits, and result publication
- `/employee` encrypted request submission and private result reveal
- `/observer` public audit view for ciphertext handles and published outcomes

## Local Development

1. Install dependencies:

```bash
pnpm install
cd frontend && pnpm install
```

2. Configure env files:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

3. Run contract checks:

```bash
pnpm compile
pnpm test
```

4. Run the frontend:

```bash
cd frontend
pnpm dev
```

## Contract Scripts

- `pnpm arb-sepolia:deploy`
- `pnpm arb-sepolia:seed-demo`
- `pnpm arb-sepolia:publish-results`
- `pnpm arb-sepolia:verify-seed`

## Required Environment Variables

Root `.env`:

- `PRIVATE_KEY`
- `EMPLOYEE_A_PRIVATE_KEY`
- `EMPLOYEE_B_PRIVATE_KEY`
- `ARB_SEPOLIA_RPC_URL`
- `ARBISCAN_API_KEY`

Frontend `frontend/.env.local`:

- `NEXT_PUBLIC_SHIELDCARD_ADDRESS`
- `NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for WalletConnect mobile wallets

## Notes

- The frontend build currently succeeds with non-fatal WalletConnect/RainbowKit warnings from upstream dependencies.
- If `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is unset, injected browser wallets still work, but WalletConnect mobile flows are incomplete.
