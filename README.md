<div align="center">

<img src="./brand-assets/shieldcard-wordmark.svg" alt="ShieldCard" width="480"/>

<br/><br/>

**Confidential corporate spend control — amounts, thresholds, and department budgets stay encrypted on-chain.**

<br/>

[![Live App](https://img.shields.io/badge/Live%20App-shieldcard--fhenix.netlify.app-C8833F?style=flat-square&logo=netlify&logoColor=white)](https://shieldcard-fhenix.netlify.app)
[![Contract](https://img.shields.io/badge/Contract-0x268F...9109-6E90B2?style=flat-square)](https://sepolia.arbiscan.io/address/0x268F3506639a570Fe388464D915188F484A89109)
[![Network](https://img.shields.io/badge/Network-Arbitrum%20Sepolia-2B4DA8?style=flat-square)](https://sepolia.arbiscan.io)
[![Tests](https://img.shields.io/badge/Tests-136%20passing-4E9B6A?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-MIT-white?style=flat-square)](./LICENSE)

</div>

---

## What ShieldCard Is

ShieldCard is a confidential corporate spend control plane. It enforces payment policy on encrypted data — spend amounts, policy thresholds, and department budgets are evaluated inside Fhenix CoFHE without the contract ever decrypting them. The governance structure and audit trail remain fully on-chain and publicly verifiable.

Employees submit encrypted spend requests. The FHE contract routes each request to auto-approved, needs-review, or auto-denied based on encrypted comparisons. Vendors are checked for compliance status. Department budgets accumulate homomorphically. Only the final outcome — after admin publishes — enters the public ledger.

---

## Why FHE

Public blockchains expose every value by default. That works for settlement auditability, but not for corporate finance.

When an employee submits a spend request:
- The amount they're requesting belongs inside the company's trust boundary
- The policy thresholds governing the decision are confidential operational data
- The department budget remaining should not be visible to competitors or counterparties
- The routing outcome is sensitive until officially published

Fhenix CoFHE allows the contract to compare encrypted integers without decrypting them. The FHE policy engine evaluates spending rules entirely on ciphertext — no plaintext ever appears in contract storage, calldata execution, or the public mempool.

---

## What ShieldCard Does

| Capability | Detail |
|---|---|
| **Encrypted request submission** | Employee encrypts spend amount in-browser via CoFHE SDK; only the ciphertext handle submits on-chain |
| **Policy packs** | Admin configures named packs (Travel, SaaS, Vendor, Marketing) with encrypted hard limits, auto-approval thresholds, and rolling budget caps |
| **Three-tier FHE routing** | Contract evaluates encrypted comparisons and routes to Auto-Approved, Needs Review, or Auto-Denied |
| **Department budgets** | Per-department encrypted budget caps accumulate homomorphically each submission |
| **Vendor compliance registry** | Vendors carry a compliance status (Compliant / Unchecked / Suspended / Banned) checked at submission time |
| **Risk bitmap** | 4-bit flag per request — vendor suspension, unverified vendor, missing department, missing vendor |
| **Recurring interval enforcement** | Per-employee per-pack submission gates enforce minimum time between requests |
| **Rolling budget accumulator** | Pack-level encrypted budget updates homomorphically; exhausted budget triggers Auto-Denied |
| **Admin review queue** | Needs-Review requests surface to admin for manual approve or deny |
| **Employee freeze / unfreeze** | Admin can freeze individual employee accounts |
| **Global pause / unpause** | Admin can halt all new submissions without affecting existing requests |
| **Pack activation / deactivation** | Individual policy packs can be toggled without affecting others |
| **Budget epoch reset** | Admin resets rolling budget accumulators to restart a spend period |
| **Private employee reveal** | Employee privately decrypts their own result via Fhenix permit — no admin involvement |
| **Public observer audit trail** | Published outcomes, pack metrics, vendor compliance, and receipt hashes are readable without a wallet |
| **Settlement receipt hash** | Deterministic `keccak256` receipt committed on-chain after every finalised request |

---

## Architecture

<img src="./brand-assets/readme-architecture.svg" alt="ShieldCard system architecture: Employee browser → CoFHE encryption → frontend → ShieldCardControlPlane → Fhenix Threshold Network → admin / employee / observer views" width="100%"/>

<img src="./brand-assets/readme-lifecycle.svg" alt="Request lifecycle: submit encrypted request → FHE 3-tier evaluation → auto approved / needs review / auto denied → admin review → publish outcome → settlement receipt" width="100%"/>

<img src="./brand-assets/readme-privacy.svg" alt="Privacy boundary: public state vs FHE-sealed values" width="100%"/>

---

## Core Contract

| Field | Value |
|---|---|
| **Contract** | `ShieldCardControlPlane` |
| **Address** | [`0x268F3506639a570Fe388464D915188F484A89109`](https://sepolia.arbiscan.io/address/0x268F3506639a570Fe388464D915188F484A89109) |
| **Network** | Arbitrum Sepolia (chainId 421614) |
| **Explorer** | https://sepolia.arbiscan.io/address/0x268F3506639a570Fe388464D915188F484A89109 |

### Policy Packs

| ID | Name | Hard Limit | Auto-Threshold | Budget Cap |
|---|---|---|---|---|
| 1 | Travel | $2,000 | $500 | $20,000 |
| 2 | SaaS | $1,500 | $300 | $10,000 |
| 3 | Vendor | $3,000 | $1,000 | $30,000 |
| 4 | Marketing | $1,000 | $250 | $8,000 |

All limits are encrypted on-chain. Values above are representative of the seed configuration.

### Departments

| ID | Name |
|---|---|
| 1 | Engineering |
| 2 | Sales |
| 3 | Operations |

### Vendors

| ID | Name | Status |
|---|---|---|
| 1 | Acme Travel Co | Compliant |
| 2 | Globex Solutions | Compliant |
| 3 | Initech Software | Unchecked |
| 4 | Umbrella Consulting | Suspended |
| 5 | Stark Industries | Banned |

### Settlement Receipt

Every finalised request receives a deterministic on-chain receipt:

```solidity
receiptHash = keccak256(abi.encodePacked(
    requestId,
    req.employee,
    req.packId,
    finalStatus,
    req.timestamp,
    address(this),
    block.chainid
));
```

---

## Confidential Control Plane

### Three-Tier FHE Routing

```
Tier 1 — Auto-Approved:   amount ≤ autoThreshold  AND  newBudget ≤ budgetLimit
Tier 2 — Needs Review:    amount ≤ hardLimit       AND  newBudget ≤ budgetLimit
                          (implicitly: amount > autoThreshold)
Tier 3 — Auto-Denied:     amount > hardLimit        OR  newBudget > budgetLimit
```

Implemented on-chain as a nested FHE select over ciphertext:

```solidity
euint8 result = FHE.select(autoOk, statusAuto,
                  FHE.select(reviewOk, statusReview, statusDenied));
```

### Risk Bitmap

Each request carries a `uint16` risk bitmap computed at submission time:

| Bit | Flag | Meaning |
|---|---|---|
| `0x0001` | `VENDOR_SUSPENDED` | Vendor has suspended compliance status |
| `0x0002` | `VENDOR_UNCHECKED` | Vendor has not been compliance-reviewed |
| `0x0004` | `NO_DEPT` | Request submitted without department context |
| `0x0008` | `NO_VENDOR` | Request submitted without vendor reference |

Non-zero risk bits do not block submission — they surface in the admin review surface and request stream.

### Request Status Lifecycle

| Code | Status | Meaning |
|---|---|---|
| `0` | Submitted | FHE result not yet published |
| `1` | Auto Approved | Amount within auto-threshold and budget — FHE confirmed |
| `2` | Needs Review | Within hard limit but above auto-threshold — queued for admin |
| `3` | Auto Denied | Amount exceeded hard limit or budget exhausted |
| `4` | Admin Approved | Admin resolved a Needs-Review request as approved |
| `5` | Admin Denied | Admin resolved a Needs-Review request as denied |

---

## Roles

**Admin** — deploys policy packs with encrypted thresholds, manages department budgets, registers vendor compliance status, registers and manages employee accounts, resolves the Needs-Review queue, and publishes finalised outcomes with settlement receipts.

**Employee** — submits encrypted spend requests against an active policy pack with optional department and vendor context, then privately decrypts their own outcome using a Fhenix permit. No other party sees the decrypted result through this flow.

**Observer** — reads public request metadata, ciphertext handles, pack metrics, vendor compliance status, and published outcomes without requiring a wallet. Amounts, thresholds, and department budgets remain sealed.

---

## Privacy Model

### Encrypted on-chain

- **Spend amount** — encrypted in-browser by the employee before submission; the contract receives an `InEuint32` ciphertext handle
- **Hard limit** — set by admin as `euint32`; controls the absolute ceiling per pack
- **Auto-approval threshold** — set by admin as `euint32`; controls the boundary between auto-approve and needs-review
- **Rolling budget cap** — set by admin as `euint32`; limits cumulative epoch spend per pack
- **Department budget cap** — set by admin as `euint32`; limits cumulative dept spend
- **Budget accumulators** — updated homomorphically on each submission; never decrypted during normal operation
- **FHE comparison operands** — intermediate `ebool` values; never stored or exposed

### Public on-chain

- Employee wallet address and pack selection
- Department ID and vendor ID attached at submission
- Risk bitmap flags (vendor status, dept assignment)
- Memo text (submitted plaintext)
- Submission timestamp
- Ciphertext handles (`bytes32`) — opaque identifiers; no value can be inferred
- Published outcome after admin calls `publishDecryptedResult`
- Settlement receipt hash after finalisation

### What FHE enables

Fhenix CoFHE allows `ShieldCardControlPlane` to perform arithmetic and comparison operations on encrypted integers without decrypting them. Budget accumulation, risk-aware routing, and three-tier policy evaluation all run on ciphertext. The Fhenix Threshold Network holds the decryption material; it decrypts only when presented with a valid permit or admin signature.

---

## Wave 4 Update

Wave 4 is the current production release, deployed on Arbitrum Sepolia at `0x268F3506639a570Fe388464D915188F484A89109`.

### ShieldCardControlPlane — new in Wave 4

**Department context**
- Department registry with named departments and encrypted budget caps
- Per-department FHE budget accumulator updated homomorphically on each submission
- Employee-to-department assignment (`assignEmployeeDept`)
- Department epoch reset for admins

**Vendor compliance registry**
- On-chain vendor registry with compliance status: Compliant / Unchecked / Suspended / Banned
- Status checked at submission — Banned vendors are hard-rejected; Suspended and Unchecked surface risk flags
- Admin controls for registering vendors and updating compliance status

**Risk bitmap routing**
- 4-bit `uint16` risk bitmap per request
- Flags set automatically at submission based on vendor compliance and dept/vendor presence
- Surfaced in admin cockpit as "High risk" metric and in request tables

**Recurring interval enforcement**
- Per-pack recurring interval gate: minimum time between submissions from the same employee
- Pack 4 (Marketing) enforces a 7-day minimum interval in the demo seed

**Extended request submission**
- `submitRequest(packId, deptId, vendorId, encAmount, memo)` — 5-argument function
- Department and vendor context attached at submission and reflected in risk bitmap

**Receipt evidence**
- `evidenceHash` — `bytes32` receipt evidence committed on-chain post-approval

### Frontend — Wave 4

- **Landing page**: Wave 4 feature strip showcasing dept budgets, vendor compliance, risk bitmap, recurring intervals, and receipt evidence
- **Hero**: updated stats (4 packs / 3-tier risk / FHE-sealed) and Wave 4 eyebrow
- **Admin cockpit**: vendor compliance panel, department strip, high-risk metric, review queue prioritised above full stream
- **Employee workspace**: department and vendor selectors wired to on-chain registries; risk-aware submission
- **Observer audit surface**: vendor registry panel, department strip, full risk bitmap column in request table
- **Privacy explainer**: updated to reflect Wave 4 visible vs. sealed data model
- **Architecture diagram**: updated to ShieldCardControlPlane with Wave 4 capabilities

### Test coverage

136 Hardhat tests passing across:
- Policy engine core (47 tests) — pack management, FHE routing, budget accumulation, review queue, publish
- Control plane (89 tests) — departments, vendors, risk bitmap, recurring intervals, receipt evidence

### Production

| Resource | Detail |
|---|---|
| Live app | https://shieldcard-fhenix.netlify.app |
| Contract | `0x268F3506639a570Fe388464D915188F484A89109` |
| Network | Arbitrum Sepolia |
| Explorer | https://sepolia.arbiscan.io/address/0x268F3506639a570Fe388464D915188F484A89109 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity 0.8.28, Hardhat |
| FHE primitives | `@fhenixprotocol/cofhe-contracts ^0.1.3` |
| FHE SDK | `@cofhe/sdk ^0.5.2`, `@cofhe/hardhat-plugin ^0.5.2` |
| Frontend | Next.js 14 (App Router, static export) |
| UI | React 18, Tailwind CSS 4, Framer Motion |
| Wallet | wagmi v2, viem v2 |
| Deployment | Netlify |
| Network | Arbitrum Sepolia |

---

## Repository Layout

```
contracts/           ShieldCardControlPlane.sol (Wave 4) and ShieldCardPolicyEngine.sol (Wave 3)
scripts/             Deploy, seed, publish-results, verify-seed scripts
test/                136 Hardhat tests — policy engine + control plane
deployments/         Deployed contract addresses per network (gitignored)
frontend/            Next.js app — landing, admin, employee, observer
brand-assets/        Logo, wordmark, and architecture diagrams
```

---

## Local Development

### 1. Install dependencies

```bash
pnpm install
cd frontend && pnpm install
```

### 2. Configure environment

Root `.env`:

```bash
cp .env.example .env
```

```
PRIVATE_KEY=
EMPLOYEE_A_PRIVATE_KEY=
EMPLOYEE_B_PRIVATE_KEY=
EMPLOYEE_C_PRIVATE_KEY=
ARB_SEPOLIA_RPC_URL=
ARBISCAN_API_KEY=
```

Frontend `frontend/.env.local`:

```
NEXT_PUBLIC_SHIELDCARD_ADDRESS=0x268F3506639a570Fe388464D915188F484A89109
NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

### 3. Compile and test

```bash
pnpm compile
pnpm test
```

### 4. Run the frontend

```bash
cd frontend
pnpm dev
```

---

## Scripts

### Root

| Script | Purpose |
|---|---|
| `pnpm compile` | Compile Solidity contracts |
| `pnpm test` | Run all 136 Hardhat tests with gas reporting |
| `pnpm arb-sepolia:deploy` | Deploy `ShieldCardControlPlane` to Arbitrum Sepolia |
| `pnpm arb-sepolia:seed-demo` | Register employees, depts, vendors, packs, and seed 12 demo requests |
| `pnpm arb-sepolia:publish-results` | Publish FHE-decrypted results for pending requests |
| `pnpm arb-sepolia:verify-seed` | Verify on-chain state matches expected seed data |

### Frontend

| Script | Purpose |
|---|---|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Build static export |
| `pnpm lint` | Run ESLint |

---

## Deployment

| Resource | Link |
|---|---|
| Live application | https://shieldcard-fhenix.netlify.app |
| GitHub repository | https://github.com/Vinaystwt/ShieldCard |
| Contract | [`0x268F3506639a570Fe388464D915188F484A89109`](https://sepolia.arbiscan.io/address/0x268F3506639a570Fe388464D915188F484A89109) |
| Network | Arbitrum Sepolia (chainId 421614) |

---

<div align="center">
<img src="./brand-assets/shieldcard-logo.svg" alt="ShieldCard" width="48"/>
<br/><br/>
<sub>Built for the Fhenix Buildathon · Wave 4 · Arbitrum Sepolia · MIT License</sub>
</div>
