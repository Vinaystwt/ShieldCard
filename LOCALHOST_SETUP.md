# Localhost Setup

Run ShieldCard against the live Arbitrum Sepolia contracts on your machine.

## Prerequisites

- Node 20+
- pnpm 9+
- A wallet with Arbitrum Sepolia ETH (faucet: https://www.alchemy.com/faucets/arbitrum-sepolia)
- (Optional but recommended) An Arbiscan API key

## Live contract addresses (Arbitrum Sepolia, chainId 421614)

| Contract | Address |
|---|---|
| ShieldCardControlPlane | `0xC2fe512fE0A4D0Aa0C7452aC43e76aB9331f9dD2` |
| ShieldCardSettlement   | `0x8054d6819fa4B43195353579e9519Dd7bc16223A` |
| MockUSDC               | `0x5d05BE0586DF41eCF920013f81ae04C2e7a724b5` |

## Step 1 — env files

Root `.env` (copy from `.env.example`, fill values):

```
PRIVATE_KEY=<your admin key for write scripts>
EMPLOYEE_A_PRIVATE_KEY=
EMPLOYEE_B_PRIVATE_KEY=
EMPLOYEE_C_PRIVATE_KEY=
ARB_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBISCAN_API_KEY=
```

Frontend `frontend/.env.local` (copy from `frontend/.env.local.example`):

```
NEXT_PUBLIC_SHIELDCARD_ADDRESS=0xC2fe512fE0A4D0Aa0C7452aC43e76aB9331f9dD2
NEXT_PUBLIC_SETTLEMENT_ADDRESS=0x8054d6819fa4B43195353579e9519Dd7bc16223A
NEXT_PUBLIC_MOCKUSDC_ADDRESS=0x5d05BE0586DF41eCF920013f81ae04C2e7a724b5
NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is optional. Mobile WalletConnect requires it (free project at https://cloud.walletconnect.com).

## Step 2 — install

```bash
pnpm install
cd frontend && pnpm install && cd ..
```

## Step 3 — sanity check

```bash
pnpm healthcheck
```

Expected: `15 passed, 0 failed`. If anything red, fix env or addresses before running the app.

## Step 4 — run the frontend

```bash
cd frontend
pnpm dev
```

Open http://localhost:3000.

Connect MetaMask to Arbitrum Sepolia. Available routes:

| Route | Purpose |
|---|---|
| `/` | Landing |
| `/app` | Role gateway |
| `/admin` | Admin cockpit (admin wallet only) |
| `/employee` | Employee submit + reveal |
| `/observer` | Sealed view, no wallet needed |
| `/auditor` | Scoped decryption (auditor wallet only) |
| `/settlement` | Pending / Approved / Settled MockUSDC board |
| `/verify` | Wallet-free receipt recompute + green/red verdict |

## Step 5 — try the verify flow

The current live seed has **request id `0`** in `AUTO_APPROVED` state with an executed settlement (recipient = Employee A address). Use it as a known-good demo:

```
http://localhost:3000/verify
→ enter requestId: 0
→ click Verify
→ expect: green "Receipt verified" badge + settlement chain link "chain verified"
```

To see a RED verdict: paste the same request id, then in DevTools console issue a network tamper — or use a non-existent id like `9999`.

## Step 6 — admin / employee roles

If you have the admin private key:

- `/admin` shows pause/unpause, employee management, pack management, vendor panel, and the live admin review queue (currently has 3 requests at id `1`, `5`, `11`).

If you have an employee key (A, B, or C), connect that wallet:

- `/employee` shows your own request history with private reveal.

If you have the auditor key (Employee B at `0x1D7f7354eDA779D15Ebd258aE92F82D9E1b98028`), connect it:

- `/auditor` shows scoped decryption on requests `[0, 3, 5, 9, 11]` (granted via `grantAuditorAccess` in seed).

## Step 7 — useful scripts

```bash
pnpm test                                # mock CoFHE test suite (131 passing)
pnpm compile                             # compile contracts
pnpm arb-sepolia:verify-seed             # dump on-chain state
pnpm arb-sepolia:publish-results         # publish any new unpublished requests
pnpm arb-sepolia:seed-settle             # create+approve+settle approved requests
pnpm arb-sepolia:grant-auditor           # set auditor + grant scoped access
pnpm arb-sepolia:attest-budgets          # store FHE.lte(used, cap) ebool on-chain for all depts + packs
RUN_LIVE_INTEGRATION=1 pnpm arb-sepolia:integration-live   # end-to-end smoke test
```

## Demo request IDs for the verify page

- **Verify GREEN**: `0` (Travel pack, AUTO_APPROVED, settled with mUSDC transfer).
- **Verify RED (tamper demo)**: enter any nonexistent id (`9999`) or `1` (Submitted but in review — receipt not yet committed).

## Troubleshooting

- **"CoFHE prover is temporarily unreachable"**: retry; the Fhenix Threshold Network rate-limits.
- **Wrong network**: switch MetaMask to Arbitrum Sepolia (chainId 421614). The TopBar will prompt.
- **Healthcheck red on bytecode**: verify your RPC URL is reachable (`curl -X POST ... eth_chainId`).
